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

export function canManageInvoice(auth: AuthService): boolean {
  return canCreateQuotation(auth);
}

export function canRecordPayment(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_SALES) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('sales', 'approve')
  );
}

export function canApproveCreditNote(auth: AuthService): boolean {
  return canConvertToSO(auth);
}
