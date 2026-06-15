import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function canDeleteAnything(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageSuppliers(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasPermission('procurement', 'create')
  );
}

export function canCreatePR(auth: AuthService): boolean {
  return auth.hasPermission('procurement', 'create') || auth.hasPermission('procurement', 'read');
}

export function canApprovePR(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('procurement', 'approve')
  );
}

export function canManageRFQ(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasPermission('procurement', 'create')
  );
}

export function canManagePO(auth: AuthService): boolean {
  return canManageRFQ(auth);
}

export function canApprovePO(auth: AuthService): boolean {
  return canApprovePR(auth);
}

export function canManageGRN(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.STOREKEEPER) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasPermission('procurement', 'create')
  );
}

export function canPayInvoice(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('finance', 'approve')
  );
}
