import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import { PurchaseRequisition, SupplierInvoice } from '../../../core/models/procurement.model';

export function canDeleteAnything(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageSuppliers(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT) ||
    auth.hasPermission('procurement', 'create')
  );
}

/** PR initiation — requires explicit create permission (not read-only). */
export function canCreatePR(auth: AuthService): boolean {
  if (auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER)) {
    return true;
  }
  return auth.hasPermission('procurement', 'create');
}

export function canSubmitPR(auth: AuthService): boolean {
  return canCreatePR(auth);
}

export function canEditPR(auth: AuthService, pr?: PurchaseRequisition | null): boolean {
  if (!pr) {
    return canCreatePR(auth);
  }
  if (pr.status !== 'DRAFT') {
    return false;
  }
  if (pr.can_edit) {
    return true;
  }
  return canCreatePR(auth);
}

export function canCancelPR(auth: AuthService, pr?: PurchaseRequisition | null): boolean {
  if (!pr || pr.status !== 'PENDING') {
    return false;
  }
  return canCreatePR(auth);
}

export function canRevisePR(auth: AuthService, pr?: PurchaseRequisition | null): boolean {
  if (!pr || pr.status !== 'REJECTED') {
    return false;
  }
  return canCreatePR(auth);
}

/** HOD Procurement normal approval — not GM override. */
export function canApprovePR(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    (auth.hasRole(ROLES.HOD_PROCUREMENT) && auth.hasPermission('procurement', 'approve'))
  );
}

/** GM override when HOD has not yet approved. */
export function canGmOverridePR(auth: AuthService, pr?: PurchaseRequisition | null): boolean {
  if (!auth.hasRole(ROLES.SUPER_ADMIN) && !auth.hasRole(ROLES.GENERAL_MANAGER)) {
    return false;
  }
  if (!pr) {
    return true;
  }
  return pr.status === 'PENDING' && !pr.hod_approved_by && !pr.gm_override;
}

export function canRejectPR(auth: AuthService): boolean {
  return canApprovePR(auth) || auth.hasRole(ROLES.GENERAL_MANAGER) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageRFQ(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT) ||
    auth.hasPermission('procurement', 'create')
  );
}

export function canAddRFQResponse(auth: AuthService): boolean {
  if (auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER)) {
    return true;
  }
  if (
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT)
  ) {
    return auth.hasPermission('procurement', 'create');
  }
  return false;
}

export function canSelectRFQWinner(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

/** Award / assign RFQ items — procurement only (not GM). */
export function canAwardRFQItems(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_PROCUREMENT);
}

/** Send approved PO email to supplier — procurement only (not GM). */
export function canSendPO(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT)
  );
}

export function canGmOverrideRFQ(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

/** GM may recommend which supplier should supply each RFQ item. */
export function canRecommendRFQItems(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

export function canManagePO(auth: AuthService): boolean {
  return canManageRFQ(auth);
}

export function canApprovePO(auth: AuthService): boolean {
  return canApprovePR(auth) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

export function canManageGRN(auth: AuthService, company?: CompanyContextService): boolean {
  if (auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_PROCUREMENT)) {
    return true;
  }
  const code = company?.activeCompany()?.code;
  if (code === 'SUPPLY') {
    return auth.hasRole(ROLES.INVENTORY_OFFICER) && auth.hasPermission('procurement', 'create');
  }
  if (code === 'STEIN' || !code) {
    return (
      auth.hasRole(ROLES.STOREKEEPER) &&
      (auth.hasPermission('inventory', 'create') || auth.hasPermission('procurement', 'create'))
    );
  }
  return auth.hasPermission('procurement', 'create');
}

export function canGmFinancialReview(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

export function canPayInvoice(auth: AuthService, invoice?: SupplierInvoice | null): boolean {
  if (!canExecutePaymentRelease(auth)) {
    return false;
  }
  if (invoice?.can_pay === true) {
    return true;
  }
  if (invoice && invoice.balance <= 0) {
    return false;
  }
  return true;
}

export function canThreeWayMatch(auth: AuthService): boolean {
  return canReleasePayment(auth) || canManageGRN(auth);
}

export function canCreatePaymentRelease(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canReleasePayment(auth: AuthService): boolean {
  return canExecutePaymentRelease(auth);
}

/** HOD Finance only — verify PO vs invoice and forward to GM. */
export function canFinanceVerifyPayment(auth: AuthService): boolean {
  return canExecutePaymentRelease(auth);
}

/** HOD Finance only — record disbursement after GM approval. */
export function canExecutePaymentRelease(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

/** GM only — approve or reject payment (no payment execution). */
export function canGmApprovePaymentRelease(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

export function canClosePO(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function receivingOwnerLabel(companyCode: string | null | undefined): string {
  return companyCode === 'SUPPLY' ? ROLES.INVENTORY_OFFICER : ROLES.STOREKEEPER;
}
