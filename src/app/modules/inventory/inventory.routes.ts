import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth-guard';
import { roleGuard } from '../../core/guards/role.guard';

const inventoryGuard = {
  canActivate: [roleGuard],
  data: { module: 'inventory', action: 'read' },
};

export const INVENTORY_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/dashboard/inventory-dashboard.component').then(
        (m) => m.InventoryDashboardComponent,
      ),
  },
  {
    path: 'items',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/items-list/items-list.component').then((m) => m.ItemsListComponent),
  },
  {
    path: 'categories',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/categories/categories.component').then((m) => m.CategoriesComponent),
  },
  {
    path: 'warehouses',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/warehouses/warehouses.component').then((m) => m.WarehousesComponent),
  },
  {
    path: 'stock',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/stock-overview/stock-overview.component').then(
        (m) => m.StockOverviewComponent,
      ),
  },
  {
    path: 'reservations',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/reservations/reservations.component').then(
        (m) => m.ReservationsComponent,
      ),
  },
  {
    path: 'sales-outstanding',
    ...inventoryGuard,
    loadComponent: () =>
      import('../sales/pages/orders/outstanding-orders.component').then(
        (m) => m.OutstandingOrdersComponent,
      ),
    data: { module: 'inventory', action: 'read', navShell: 'inventory' },
  },
  {
    path: 'sales-stock-queue',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'create' },
    loadComponent: () =>
      import('./pages/sales-stock-queue/inventory-sales-stock-queue.component').then(
        (m) => m.InventorySalesStockQueueComponent,
      ),
  },
  {
    path: 'sales-handover-queue',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'create' },
    loadComponent: () =>
      import('./pages/sales-handover-queue/inventory-sales-handover-queue.component').then(
        (m) => m.InventorySalesHandoverQueueComponent,
      ),
  },
  {
    path: 'sales-pickup-queue',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'create' },
    loadComponent: () =>
      import('./pages/sales-pickup-queue/inventory-sales-pickup-queue.component').then(
        (m) => m.InventorySalesPickupQueueComponent,
      ),
  },
  {
    path: 'grn',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/grn/grn-hub.component').then((m) => m.GrnHubComponent),
  },
  {
    path: 'grn/new',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'create' },
    loadComponent: () =>
      import('../procurement/pages/grn/grn-form.component').then((m) => m.GrnFormComponent),
  },
  {
    path: 'grn/:id/edit',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'create' },
    loadComponent: () =>
      import('../procurement/pages/grn/grn-form.component').then((m) => m.GrnFormComponent),
  },
  {
    path: 'grn/:id/view',
    ...inventoryGuard,
    data: { inventoryContext: true },
    loadComponent: () =>
      import('../procurement/pages/grn/grn-view.component').then((m) => m.GrnViewComponent),
  },
  {
    path: 'purchase-orders',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/purchase-orders/inventory-purchase-orders.component').then(
        (m) => m.InventoryPurchaseOrdersComponent,
      ),
  },
  {
    path: 'purchase-orders/:id',
    canActivate: [roleGuard],
    data: { module: 'inventory', action: 'read', inventoryContext: true },
    loadComponent: () =>
      import('../procurement/pages/purchase-orders/po-view.component').then(
        (m) => m.PoViewComponent,
      ),
  },
  {
    path: 'production-receipts',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/production-receipts/production-receipts.component').then(
        (m) => m.ProductionReceiptsComponent,
      ),
  },
  {
    path: 'gin',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/gin/gin-list.component').then((m) => m.GinListComponent),
  },
  {
    path: 'transfers',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/transfers/transfers-list.component').then((m) => m.TransfersListComponent),
  },
  {
    path: 'movements',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/movements/movements.component').then((m) => m.MovementsComponent),
  },
  {
    path: 'adjustments',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/adjustments/adjustments.component').then((m) => m.AdjustmentsComponent),
  },
  {
    path: 'damage-reports',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/damage-reports/damage-reports.component').then(
        (m) => m.DamageReportsComponent,
      ),
  },
  {
    path: 'order-tracking',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/order-tracking/order-tracking.component').then(
        (m) => m.OrderTrackingComponent,
      ),
  },
  {
    path: 'my-requests',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/my-requests/my-requests.component').then((m) => m.MyRequestsComponent),
  },
  {
    path: 'department-approvals',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/department-approvals/department-approvals.component').then(
        (m) => m.DepartmentApprovalsComponent,
      ),
  },
  {
    path: 'internal-issue',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/internal-issue/internal-issue.component').then(
        (m) => m.InternalIssueComponent,
      ),
  },
  {
    path: 'department-requests',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/department-requests/dept-requests.component').then(
        (m) => m.DeptRequestsComponent,
      ),
  },
  {
    path: 'purchase-requisitions',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/purchase-requisitions/purchase-requisitions.component').then(
        (m) => m.PurchaseRequisitionsComponent,
      ),
  },
  {
    path: 'reorder',
    redirectTo: 'purchase-requisitions',
    pathMatch: 'full',
  },
  {
    path: 'alerts',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/alerts/alerts.component').then((m) => m.AlertsComponent),
  },
  {
    path: 'batches',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/batches/batches.component').then((m) => m.BatchesComponent),
  },
  {
    path: 'serial-numbers',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/serial-numbers/serial-numbers.component').then(
        (m) => m.SerialNumbersComponent,
      ),
  },
  {
    path: 'manufacturing',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/manufacturing/manufacturing.component').then(
        (m) => m.ManufacturingComponent,
      ),
  },
  {
    path: 'bom',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/production-hub/production-hub.component').then(
        (m) => m.ProductionHubComponent,
      ),
    data: { ...inventoryGuard.data, hub: 'bom' },
  },
  {
    path: 'production-orders',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/production-hub/production-hub.component').then(
        (m) => m.ProductionHubComponent,
      ),
    data: { ...inventoryGuard.data, hub: 'work-orders' },
  },
  {
    path: 'stock-take',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/stock-take-sessions/stock-take-sessions.component').then(
        (m) => m.StockTakeSessionsComponent,
      ),
  },
  {
    path: 'stock-take/:id',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/stock-take-sessions/stock-take-session-detail.component').then(
        (m) => m.StockTakeSessionDetailComponent,
      ),
  },
  {
    path: 'stock-take-legacy',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/stock-take/stock-take.component').then((m) => m.StockTakeComponent),
  },
  {
    path: 'valuation',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/valuation/valuation.component').then((m) => m.ValuationComponent),
  },
  {
    path: 'reports',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/reports/reports.component').then((m) => m.ReportsComponent),
  },
];
