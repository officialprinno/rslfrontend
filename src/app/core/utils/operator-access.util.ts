import { ROLES } from '../constants/roles.constants';

const ELEVATED_PRODUCTION_ROLES = new Set<string>([
  ROLES.PRODUCTION_SUPERVISOR,
  ROLES.PRODUCTION_MANAGER,
  ROLES.GENERAL_MANAGER,
  ROLES.SUPER_ADMIN,
  ROLES.STOREKEEPER,
  ROLES.STORE_MANAGER,
  ROLES.INTERNAL_AUDITOR,
]);

/** Machine operator without supervisor/manager/store access — production floor only. */
export function isMachineOperatorOnly(roleNames: string[]): boolean {
  if (!roleNames.includes(ROLES.MACHINE_OPERATOR)) {
    return false;
  }
  if (roleNames.some((name) => name.startsWith('HOD '))) {
    return false;
  }
  return !roleNames.some((name) => ELEVATED_PRODUCTION_ROLES.has(name));
}
