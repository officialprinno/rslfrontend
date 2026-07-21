import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

function financeRoleNames(auth: AuthService): string[] {
  const user = auth.getCurrentUser();
  if (!user) return [];
  const names = new Set<string>();
  if (user.role_name) names.add(user.role_name);
  for (const department of user.departments ?? []) {
    if (department.role_name) names.add(department.role_name);
    if (department.role) names.add(department.role);
  }
  return [...names];
}

function financeDepartmentNames(auth: AuthService): string[] {
  const user = auth.getCurrentUser();
  if (!user) return [];
  const names = new Set<string>();
  if (user.department_name) names.add(user.department_name);
  for (const department of user.departments ?? []) {
    if (department.department_name) names.add(department.department_name);
  }
  return [...names];
}

function isFinanceMember(auth: AuthService): boolean {
  const departmentNames = financeDepartmentNames(auth);
  const roleNames = financeRoleNames(auth);
  return (
    departmentNames.includes('Finance') ||
    roleNames.some((role) =>
      ['Finance', 'Finance Officer', 'Finance Manager', ROLES.HOD_FINANCE].includes(role),
    )
  );
}

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
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canReconcile(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canFinanceHodApprove(auth: AuthService): boolean {
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

export function canProcessInventoryWorkflows(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    isFinanceMember(auth) ||
    auth.hasPermission('finance', 'update') ||
    auth.hasPermission('finance', 'create')
  );
}

export function canApproveInventoryWorkflows(auth: AuthService): boolean {
  if (isReadOnlyAuditor(auth)) return false;
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    financeRoleNames(auth).includes('Finance Manager') ||
    auth.hasPermission('finance', 'approve')
  );
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
