import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function canDeleteAnything(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageCustomers(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_SALES) ||
    auth.hasPermission('sales', 'create')
  );
}

export function canCreateQuotation(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_SALES) ||
    auth.hasRole(ROLES.SALES_OFFICER) ||
    auth.hasPermission('sales', 'create')
  );
}

export function canConvertToSO(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_SALES) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('sales', 'approve')
  );
}

export function canApproveSO(auth: AuthService): boolean {
  return canConvertToSO(auth);
}

export function canGenerateSalesInvoice(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('finance', 'create') ||
    auth.hasPermission('finance', 'approve')
  );
}

/** Finance alone generates quantity-based fulfillment invoices. */
export function canGenerateFulfillmentInvoice(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.ASSISTANT_FINANCE) ||
    auth.hasRole(ROLES.FINANCE_OFFICER) ||
    canGenerateSalesInvoice(auth)
  );
}

export function canViewOutstandingOrders(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasPermission('sales', 'read') ||
    auth.hasPermission('inventory', 'read') ||
    auth.hasPermission('finance', 'read')
  );
}

/** Finance-only — sales staff must not create or generate customer invoices. */
export function canManageInvoice(auth: AuthService): boolean {
  return canGenerateSalesInvoice(auth);
}

export function canRecordPayment(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.FINANCE) ||
    auth.hasPermission('finance', 'create') ||
    auth.hasPermission('finance', 'approve')
  );
}

/** Finance records customer payment proof from email/portal before confirmation. */
export function canRecordManualPaymentProof(auth: AuthService): boolean {
  return canRecordPayment(auth);
}

/** Finance confirms customer payment received on a sales order. */
export function canVerifySalesPayment(auth: AuthService): boolean {
  return canRecordPayment(auth);
}

export function canApproveCreditNote(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasPermission('sales', 'approve');
}

export function canCreateCreditNote(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_SALES) ||
    auth.hasRole(ROLES.SALES_OFFICER) ||
    auth.hasPermission('sales', 'create')
  );
}

export function canFinanceApplyCreditNote(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.FINANCE) ||
    auth.hasPermission('finance', 'approve')
  );
}
