import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function isStorekeeper(auth: AuthService): boolean {
  return auth.hasRole(ROLES.STOREKEEPER);
}

export function isStoreManager(auth: AuthService): boolean {
  return auth.hasRole(ROLES.STORE_MANAGER);
}

export function isAssistantProcurement(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.ASSISTANT_PROCUREMENT) || auth.hasRole(ROLES.COORDINATOR)
  );
}

export function isHodProcurement(auth: AuthService): boolean {
  return auth.hasRole(ROLES.HOD_PROCUREMENT) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function isStoreOperationsRole(auth: AuthService): boolean {
  return (
    isStorekeeper(auth) ||
    isStoreManager(auth) ||
    isAssistantProcurement(auth) ||
    isHodProcurement(auth)
  );
}

export function canAddItem(auth: AuthService): boolean {
  return (
    isHodProcurement(auth) ||
    isAssistantProcurement(auth) ||
    auth.hasPermission('inventory', 'create')
  );
}

export function canEditItem(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'update');
}

export function canDeleteItem(auth: AuthService): boolean {
  return isHodProcurement(auth) && auth.hasPermission('inventory', 'delete');
}

export function canManageCategories(auth: AuthService): boolean {
  return isHodProcurement(auth) || auth.hasPermission('inventory', 'create');
}

export function canAddAdjustment(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'create');
}

export function canApproveAdjustment(auth: AuthService): boolean {
  return (
    isHodProcurement(auth) ||
    isAssistantProcurement(auth) ||
    isStoreManager(auth) ||
    auth.hasPermission('inventory', 'approve')
  );
}

export function canApproveTransfer(auth: AuthService): boolean {
  return canApproveAdjustment(auth);
}

export function canDeleteWarehouse(auth: AuthService): boolean {
  return isHodProcurement(auth);
}

export function canViewValuation(auth: AuthService): boolean {
  if (isHodProcurement(auth) || auth.hasRole(ROLES.GENERAL_MANAGER)) {
    return true;
  }
  if (isStorekeeper(auth)) {
    return false;
  }
  return auth.hasPermission('finance', 'read') || canGovernInventory(auth);
}

export function canApproveValuation(auth: AuthService): boolean {
  return isHodProcurement(auth);
}

export function canDeleteMovement(auth: AuthService): boolean {
  return false;
}

export function canReserveStock(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'update');
}

export function canExportInventory(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'read');
}

export function canCreateDeptRequest(auth: AuthService): boolean {
  return auth.isAuthenticated();
}

export function canApproveDeptRequest(auth: AuthService): boolean {
  return canApproveAdjustment(auth);
}

export function canIssueInternalStock(auth: AuthService): boolean {
  return isStorekeeper(auth) || isStoreManager(auth) || canApproveAdjustment(auth);
}

export function canViewConsumptionCosts(auth: AuthService): boolean {
  return (
    auth.hasPermission('finance', 'read') ||
    isHodProcurement(auth) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canGovernInventory(auth: AuthService): boolean {
  return canApproveAdjustment(auth) || isHodProcurement(auth);
}

export function canOperateStore(auth: AuthService): boolean {
  return (
    isStoreOperationsRole(auth) ||
    auth.hasPermission('inventory', 'create')
  );
}

export function canReceiveProductionReceipt(auth: AuthService): boolean {
  return (
    (isStorekeeper(auth) || isStoreManager(auth)) &&
    (auth.hasPermission('inventory', 'create') || auth.hasPermission('inventory', 'update'))
  );
}

/** Storekeeper operational tabs — hide policy/valuation for pure storekeepers. */
export function showInventoryTab(
  auth: AuthService,
  tab: 'valuation' | 'categories' | 'reports' | 'manufacturing' | 'bom' | 'production',
): boolean {
  if (isHodProcurement(auth) || isAssistantProcurement(auth) || auth.hasRole(ROLES.SUPER_ADMIN)) {
    return true;
  }
  if (isStorekeeper(auth)) {
    return !['valuation', 'categories', 'bom', 'production', 'manufacturing'].includes(tab);
  }
  return true;
}
