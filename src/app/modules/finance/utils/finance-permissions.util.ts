import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function isReadOnlyAuditor(auth: AuthService): boolean {
  return auth.hasRole(ROLES.INTERNAL_AUDITOR);
}

export function canViewFinance(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasRole(ROLES.INTERNAL_AUDITOR) ||
    auth.hasPermission('finance', 'read')
  );
}

export function canManageAccounts(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canPostJournal(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canMakePayment(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canReconcile(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canManageBudgets(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canManageTax(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canViewReports(auth: AuthService): boolean {
  return canViewFinance(auth);
}

export function canApprovePayroll(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('finance', 'approve')
  );
}

export function canCreateJournal(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return canPostJournal(auth);
}
