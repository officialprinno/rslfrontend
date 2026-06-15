import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

const SECURITY_FULL = [
  ROLES.SUPER_ADMIN,
  'Chief Security Officer',
  'Security Supervisor',
  ROLES.SAFETY_OFFICER,
];

const SECURITY_OPS = [
  ...SECURITY_FULL,
  'Security Guard',
];

export function canManageSecurity(auth: AuthService): boolean {
  if (auth.hasRole(ROLES.SUPER_ADMIN)) return true;
  return SECURITY_FULL.some((r) => auth.hasRole(r)) || auth.hasPermission('safety', 'create');
}

export function canOperateSecurity(auth: AuthService): boolean {
  if (canManageSecurity(auth)) return true;
  return SECURITY_OPS.some((r) => auth.hasRole(r)) || auth.hasPermission('safety', 'update');
}

export function canCloseSecurityIncident(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole('Chief Security Officer') ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canViewSecurityReports(auth: AuthService): boolean {
  return (
    canManageSecurity(auth) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.INTERNAL_AUDITOR)
  );
}

export function isReadOnlySecurity(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SAFETY_OFFICER) &&
    !canOperateSecurity(auth) &&
    !auth.hasRole(ROLES.SUPER_ADMIN)
  );
}
