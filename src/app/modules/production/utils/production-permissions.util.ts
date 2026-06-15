import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';
import { isMachineOperatorOnly as isOperatorOnly } from '../../../core/utils/operator-access.util';

export function isMachineOperator(auth: AuthService): boolean {
  return auth.hasRole(ROLES.MACHINE_OPERATOR);
}

export function isMachineOperatorOnlyUser(auth: AuthService): boolean {
  const user = auth.getCurrentUser();
  if (!user) {
    return false;
  }
  const roleNames: string[] = [];
  for (const d of user.departments ?? []) {
    const name = d.role_name || d.role;
    if (name) {
      roleNames.push(name);
    }
  }
  if (user.role_name && !roleNames.includes(user.role_name)) {
    roleNames.push(user.role_name);
  }
  return isOperatorOnly(roleNames);
}
export function isProductionSupervisor(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.PRODUCTION_MANAGER) ||
    auth.hasRole(ROLES.PRODUCTION_SUPERVISOR) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasRole(ROLES.SUPER_ADMIN)
  );
}

export function isStorekeeper(auth: AuthService): boolean {
  return auth.hasRole(ROLES.STOREKEEPER) || auth.hasRole(ROLES.STORE_MANAGER);
}

export function canDeleteAnything(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageProducts(auth: AuthService): boolean {
  if (isMachineOperator(auth)) {
    return false;
  }
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.PRODUCTION_MANAGER) ||
    auth.hasPermission('production', 'create')
  );
}

export function canManageBOM(auth: AuthService): boolean {
  return canManageProducts(auth);
}

export function canActivateBOM(auth: AuthService): boolean {
  return canManageBOM(auth);
}

export function canCreateWorkOrder(auth: AuthService): boolean {
  return canManageProducts(auth);
}

export function canApproveWO(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.PRODUCTION_MANAGER) ||
    auth.hasRole(ROLES.PRODUCTION_SUPERVISOR) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('production', 'approve')
  );
}

export function canAssignOperator(auth: AuthService): boolean {
  return canApproveWO(auth);
}

export function canOperateWorkOrder(auth: AuthService): boolean {
  return (
    isMachineOperator(auth) ||
    isProductionSupervisor(auth) ||
    auth.hasPermission('production', 'update')
  );
}

export function canStartProduction(auth: AuthService): boolean {
  if (isMachineOperator(auth)) {
    return auth.hasPermission('production', 'update');
  }
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.PRODUCTION_MANAGER) ||
    auth.hasPermission('production', 'create')
  );
}

export function canRecordOutput(auth: AuthService): boolean {
  return canStartProduction(auth) && !isMachineOperator(auth);
}

export function canApproveProductionCompletion(auth: AuthService): boolean {
  return canApproveWO(auth);
}

export function canReceiveFinishedGoods(auth: AuthService): boolean {
  return (
    isStorekeeper(auth) &&
    (auth.hasPermission('inventory', 'create') || auth.hasPermission('inventory', 'update'))
  );
}

export function canQCCheck(auth: AuthService): boolean {
  return canApproveWO(auth);
}

export function canManageMachines(auth: AuthService): boolean {
  return canManageProducts(auth);
}

export function canReportBreakdown(auth: AuthService): boolean {
  return canOperateWorkOrder(auth);
}

export function showOperatorDashboard(auth: AuthService): boolean {
  return isMachineOperator(auth) || isProductionSupervisor(auth);
}

export function showManagerProductionNav(auth: AuthService): boolean {
  return !isMachineOperatorOnlyUser(auth) || isProductionSupervisor(auth);
}

export function showProductionReports(auth: AuthService): boolean {
  return showManagerProductionNav(auth);
}
