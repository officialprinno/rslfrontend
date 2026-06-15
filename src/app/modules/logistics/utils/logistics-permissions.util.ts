import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function canDeleteAnything(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageVehicles(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_LOGISTICS) ||
    auth.hasPermission('logistics', 'create')
  );
}

export function canManageDrivers(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_LOGISTICS) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasPermission('logistics', 'create')
  );
}

export function canManageDeliveries(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_LOGISTICS) ||
    auth.hasRole(ROLES.LOGISTICS_OFFICER) ||
    auth.hasPermission('logistics', 'create')
  );
}

export function canStartTrip(auth: AuthService): boolean {
  return canManageDeliveries(auth);
}

export function canMarkDelivered(auth: AuthService): boolean {
  return canManageDeliveries(auth);
}

export function canScheduleMaintenance(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_LOGISTICS) ||
    auth.hasPermission('logistics', 'create')
  );
}

export function canRecordFuel(auth: AuthService): boolean {
  return canManageDeliveries(auth);
}
