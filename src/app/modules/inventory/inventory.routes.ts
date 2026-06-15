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
    path: 'grn',
    ...inventoryGuard,
    loadComponent: () =>
      import('./pages/grn/grn-hub.component').then((m) => m.GrnHubComponent),
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
