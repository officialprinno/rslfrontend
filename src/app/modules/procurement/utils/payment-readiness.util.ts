import {
  GoodsReceivedNote,
  PaymentMode,
  PaymentRelease,
  PaymentReleaseStage,
  PurchaseOrder,
  SupplierInvoice,
  ThreeWayMatchRecord,
} from '../../../core/models/procurement.model';

export interface PaymentReadinessItem {
  key: string;
  label: string;
  met: boolean;
  hint?: string;
}

function hasConfirmedGrn(grns: GoodsReceivedNote[]): boolean {
  return grns.some((g) => g.status === 'CONFIRMED');
}

function hasPassingMatch(matches: ThreeWayMatchRecord[]): boolean {
  return matches.some(
    (m) => m.result === 'PASSED' || m.result === 'PASSED_WITH_VARIANCE',
  );
}

function hasCodQuickMatch(matches: ThreeWayMatchRecord[], po: PurchaseOrder): boolean {
  return (
    po.cod_quick_match_passed === true ||
    matches.some((m) => m.match_type === 'COD_QUICK' && m.result === 'PASSED')
  );
}

function hasPayableInvoice(
  invoices: SupplierInvoice[],
  opts: { proforma?: boolean; standard?: boolean },
): boolean {
  return invoices.some((inv) => {
    if (inv.status === 'PAID' || !inv.three_way_matched) return false;
    if (opts.proforma && inv.is_proforma) return true;
    if (opts.standard && !inv.is_proforma) return true;
    return false;
  });
}

function invoiceMatchesPaymentKind(
  inv: SupplierInvoice,
  opts: { proforma?: boolean; standard?: boolean },
): boolean {
  if (!inv.three_way_matched) return false;
  if (opts.proforma && inv.is_proforma) return true;
  if (opts.standard && !inv.is_proforma) return true;
  return false;
}

/** Checklist: matched invoice was selected for payment or payment already completed. */
function hasMatchedInvoiceForPayment(
  invoices: SupplierInvoice[],
  releases: PaymentRelease[],
  opts: { proforma?: boolean; standard?: boolean },
): boolean {
  const paidViaRelease = releases.some((r) => {
    if (r.status !== 'PAID' && r.status !== 'RELEASED') return false;
    if (!r.supplier_invoice) return false;
    const inv = invoices.find((i) => i.id === r.supplier_invoice);
    return !!inv && invoiceMatchesPaymentKind(inv, opts);
  });
  if (paidViaRelease) return true;

  return invoices.some(
    (inv) => invoiceMatchesPaymentKind(inv, opts) && inv.status === 'PAID',
  ) || hasPayableInvoice(invoices, opts);
}

function stageReleased(releases: PaymentRelease[], stage: PaymentReleaseStage): boolean {
  const r = releases.find((x) => x.stage === stage);
  return !!r && (r.status === 'PAID' || r.status === 'RELEASED');
}

/** Build checklist of prerequisites before submitting a payment request. */
export function buildPaymentReadiness(
  po: PurchaseOrder,
  grns: GoodsReceivedNote[],
  invoices: SupplierInvoice[],
  matches: ThreeWayMatchRecord[],
  releases: PaymentRelease[],
  stage: PaymentReleaseStage,
): PaymentReadinessItem[] {
  const mode = po.payment_mode;
  const items: PaymentReadinessItem[] = [];

  if (mode === 'PREPAID' && stage === 'FULL') {
    items.push({
      key: 'proforma_invoice',
      label: 'Matched proforma supplier invoice (no GRN)',
      met: hasMatchedInvoiceForPayment(invoices, releases, { proforma: true }),
      hint: 'Procurement → Supplier Invoices → record proforma invoice linked to this PO.',
    });
    return items;
  }

  if (mode === 'PARTIAL' && stage === 'ADVANCE') {
    items.push({
      key: 'proforma_invoice',
      label: 'Matched proforma invoice for advance amount',
      met: hasMatchedInvoiceForPayment(invoices, releases, { proforma: true }),
      hint: 'Record a proforma invoice for the advance — no GRN required yet.',
    });
    return items;
  }

  items.push({
    key: 'confirmed_grn',
    label: 'Confirmed goods receipt (GRN)',
    met: hasConfirmedGrn(grns),
    hint: 'Create and confirm a GRN when goods are received.',
  });

  if (mode === 'COD' && stage === 'FULL') {
    items.push({
      key: 'cod_quick_match',
      label: 'COD quick match (GRN vs PO quantities)',
      met: hasCodQuickMatch(matches, po),
      hint: 'On this PO page → Three-Way Match → COD Quick → Run Match.',
    });
  }

  if (
    mode === 'POSTPAID' ||
    (mode === 'PARTIAL' && stage === 'FINAL') ||
    mode === 'COD'
  ) {
    items.push({
      key: 'three_way_match',
      label: 'Three-way match passed (PO + GRN + invoice)',
      met: hasPassingMatch(matches),
      hint: 'Record supplier invoice linked to GRN, or run full match on this PO.',
    });
  }

  items.push({
    key: 'matched_invoice',
    label: 'Matched supplier invoice selected for payment',
    met: hasMatchedInvoiceForPayment(invoices, releases, { standard: true }),
    hint: 'Supplier invoice must be linked to a GRN and pass matching.',
  });

  if (mode === 'PARTIAL' && stage === 'FINAL') {
    items.unshift({
      key: 'advance_paid',
      label: 'Advance payment completed',
      met: stageReleased(releases, 'ADVANCE'),
      hint: 'Submit and complete the ADVANCE payment request first.',
    });
  }

  return items;
}

export function paymentReadinessComplete(items: PaymentReadinessItem[]): boolean {
  return items.length > 0 && items.every((i) => i.met);
}

export function grnHintForPaymentMode(mode: PaymentMode): string {
  const hints: Record<PaymentMode, string> = {
    POSTPAID:
      'Postpaid: confirm this GRN when goods arrive, then record a supplier invoice and run 3-way match before payment.',
    PREPAID:
      'Prepaid: goods may arrive after payment. Confirm GRN when delivered — payment uses a proforma invoice first.',
    PARTIAL:
      'Partial: confirm GRN on each delivery. Advance uses proforma invoice; final payment needs GRN + 3-way match.',
    COD:
      'COD: confirm GRN on delivery, then run COD Quick Match (GRN vs PO) on the PO page before requesting payment.',
  };
  return hints[mode] ?? '';
}

/** Explain what must be done before closing a PO for each payment mode. */
export function closureHintForPaymentMode(mode: PaymentMode): string {
  const hints: Record<PaymentMode, string> = {
    POSTPAID:
      'Close when goods are fully received, 3-way match passed, and full payment is completed.',
    PREPAID:
      'Close after prepayment is executed, goods are received (final GRN), and post-delivery reconciliation is done.',
    PARTIAL:
      'Close when both ADVANCE and FINAL payments are completed, final delivery is confirmed, and 3-way match passed.',
    COD:
      'Close when goods are received on delivery, COD quick match passed, and payment is completed.',
  };
  return hints[mode] ?? '';
}
