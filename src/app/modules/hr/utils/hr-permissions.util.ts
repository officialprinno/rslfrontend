import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function canViewHr(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('hr', 'read')
  );
}

export function canViewSalary(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canManageEmployees(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HR_OFFICER);
}

export function canDeactivateEmployee(auth: AuthService): boolean {
  return canManageEmployees(auth);
}

export function canActivateEmployee(auth: AuthService): boolean {
  return canManageEmployees(auth);
}

export function canMarkAttendance(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasPermission('hr', 'create')
  );
}

export function canApproveLeave(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('hr', 'approve')
  );
}

export function canApplyLeave(auth: AuthService): boolean {
  return canViewHr(auth) || auth.isAuthenticated();
}

export function canProcessPayroll(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasPermission('hr', 'create') ||
    auth.hasPermission('hr', 'update')
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

export function canMarkPayrollPaid(auth: AuthService): boolean {
  return canApprovePayroll(auth);
}

export function canViewAllPayslips(auth: AuthService): boolean {
  return canViewSalary(auth);
}

export function canViewOwnPayslip(auth: AuthService): boolean {
  return auth.isAuthenticated();
}

export function canManageLeaveTypes(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HR_OFFICER);
}

export function canManageAllowances(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HR_OFFICER);
}

export function canManageAppraisals(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canViewDisciplinary(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canManageDisciplinary(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HR_OFFICER);
}

export function canManageAdminSettings(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

/** Alias used by configuration pages (leave types, allowances, etc.). */
export function canManageHr(auth: AuthService): boolean {
  return canManageEmployees(auth);
}
