import { AuthService } from '../../../core/services/auth.service';
import { ROLES } from '../../../core/constants/roles.constants';

const BROADCAST_ROLES = [
  ROLES.GENERAL_MANAGER,
  ROLES.HR_OFFICER,
  ROLES.SUPER_ADMIN,
  ROLES.HOD_FINANCE,
  ROLES.HOD_PROCUREMENT,
  ROLES.HOD_SALES,
  ROLES.HOD_LOGISTICS,
  ROLES.PRODUCTION_MANAGER,
];

export function canSendBroadcast(auth: AuthService): boolean {
  if (auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER)) return true;
  return BROADCAST_ROLES.some((r) => auth.hasRole(r)) || auth.getCurrentUser()?.role_name?.startsWith('HOD ') === true;
}
