import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyContextService } from '../../../core/services/company-context.service';

export function activeCompanyCode(companyCtx: CompanyContextService): string | null {
  return companyCtx.activeCompany()?.code ?? null;
}

export function isSteinCompany(companyCtx: CompanyContextService): boolean {
  return activeCompanyCode(companyCtx) === 'STEIN';
}

export function isSupplyCompany(companyCtx: CompanyContextService): boolean {
  return activeCompanyCode(companyCtx) === 'SUPPLY';
}

export function isStorekeeper(auth: AuthService): boolean {
  return auth.hasRole(ROLES.STOREKEEPER);
}

export function isInventoryOfficer(auth: AuthService): boolean {
  return auth.hasRole(ROLES.INVENTORY_OFFICER);
}

/** Sales order stock verification — Inventory Officer or store operations with inventory create. */
export function canVerifySalesStock(auth: AuthService): boolean {
  return (
    isInventoryOfficer(auth) ||
    isStorekeeper(auth) ||
    isStoreManager(auth) ||
    auth.hasPermission('inventory', 'create')
  );
}

/** Storekeeper UI must not appear when Supply company is active. */
export function isStorekeeperVisible(auth: AuthService, companyCtx: CompanyContextService): boolean {
  if (isSupplyCompany(companyCtx)) {
    return false;
  }
  return isStorekeeper(auth);
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
    isInventoryOfficer(auth) ||
    isStoreManager(auth) ||
    isAssistantProcurement(auth) ||
    isHodProcurement(auth)
  );
}

/** Company-aware warehouse floor operations role. */
/** Floor receiver — Storekeeper (Stein) or Inventory Officer (Supply). */
export function isWarehouseReceivingRole(
  auth: AuthService,
  companyCtx?: CompanyContextService,
): boolean {
  const code = companyCtx ? activeCompanyCode(companyCtx) : null;
  if (code === 'SUPPLY') {
    return isInventoryOfficer(auth);
  }
  if (code === 'STEIN' || !code) {
    return isStorekeeper(auth);
  }
  return isStorekeeper(auth) || isInventoryOfficer(auth);
}

/**
 * Storekeeper / Inventory Officer should use Inventory (not Procurement) for GRN and PO receipt.
 * HOD, Assistant, Store Manager, and GM still see Procurement.
 */
export function shouldHideProcurementModule(
  auth: AuthService,
  companyCtx?: CompanyContextService,
): boolean {
  if (!isWarehouseReceivingRole(auth, companyCtx)) {
    return false;
  }
  return !(
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    isHodProcurement(auth) ||
    isAssistantProcurement(auth) ||
    isStoreManager(auth)
  );
}

export function canViewInventoryPurchaseOrders(
  auth: AuthService,
  companyCtx?: CompanyContextService,
): boolean {
  return isWarehouseReceivingRole(auth, companyCtx);
}

export function isWarehouseOperationsRole(
  auth: AuthService,
  companyCtx: CompanyContextService,
): boolean {
  const code = activeCompanyCode(companyCtx);
  if (code === 'SUPPLY') {
    return (
      isInventoryOfficer(auth) ||
      isStoreManager(auth) ||
      isAssistantProcurement(auth) ||
      isHodProcurement(auth)
    );
  }
  if (code === 'STEIN') {
    return (
      isStorekeeper(auth) ||
      isStoreManager(auth) ||
      isAssistantProcurement(auth) ||
      isHodProcurement(auth)
    );
  }
  return isStoreOperationsRole(auth);
}

export function warehouseManagerLabel(companyCtx: CompanyContextService): string {
  return isSupplyCompany(companyCtx) ? 'Inventory Officer' : 'Storekeeper';
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
    isInventoryOfficer(auth) ||
    isStorekeeper(auth) ||
    auth.hasPermission('inventory', 'approve')
  );
}

export function canCreateDamageReport(auth: AuthService): boolean {
  return canOperateStore(auth);
}

export function canResolveDamageReport(auth: AuthService): boolean {
  return canApproveAdjustment(auth);
}

export function canGmApproveDamageReport(auth: AuthService): boolean {
  return auth.hasRole(ROLES.GENERAL_MANAGER) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canStartStockTakeSession(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'create');
}

export function canUploadStockTakeSession(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'create');
}

export function canSubmitStockTakeSession(auth: AuthService): boolean {
  return auth.hasPermission('inventory', 'create');
}

export function canGmApproveStockTakeSession(auth: AuthService): boolean {
  return auth.hasRole(ROLES.GENERAL_MANAGER) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canManageStockTakeSettings(auth: AuthService): boolean {
  return auth.hasRole(ROLES.GENERAL_MANAGER) || auth.hasRole(ROLES.SUPER_ADMIN);
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
  if (isStorekeeper(auth) && !isInventoryOfficer(auth)) {
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

export function canIssueInternalStock(
  auth: AuthService,
  companyCtx?: CompanyContextService,
): boolean {
  if (companyCtx && isSupplyCompany(companyCtx)) {
    return (
      isInventoryOfficer(auth) ||
      isStoreManager(auth) ||
      canApproveAdjustment(auth)
    );
  }
  return (
    isStorekeeper(auth) ||
    isStoreManager(auth) ||
    canApproveAdjustment(auth)
  );
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

/** Stein manufacturing — finished goods receipt (not available in Supply). */
export function canReceiveProductionReceipt(
  auth: AuthService,
  companyCtx?: CompanyContextService,
): boolean {
  if (companyCtx && isSupplyCompany(companyCtx)) {
    return false;
  }
  return (
    (isStorekeeper(auth) || isStoreManager(auth)) &&
    (auth.hasPermission('inventory', 'create') || auth.hasPermission('inventory', 'update'))
  );
}

export function showInventoryTab(
  auth: AuthService,
  tab: 'valuation' | 'categories' | 'reports' | 'manufacturing' | 'bom' | 'production' | 'production_receipts',
  companyCtx?: CompanyContextService,
): boolean {
  if (companyCtx && isSupplyCompany(companyCtx)) {
    if (['manufacturing', 'bom', 'production', 'production_receipts'].includes(tab)) {
      return false;
    }
  }
  if (isHodProcurement(auth) || isAssistantProcurement(auth) || auth.hasRole(ROLES.SUPER_ADMIN)) {
    return true;
  }
  if (isInventoryOfficer(auth)) {
    return !['valuation', 'categories', 'bom', 'production', 'manufacturing'].includes(tab);
  }
  if (isStorekeeper(auth)) {
    return !['valuation', 'categories', 'bom', 'production', 'manufacturing'].includes(tab);
  }
  return true;
}
