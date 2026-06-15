import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const logisticsGuard = {
  canActivate: [roleGuard],
  data: { module: 'logistics', action: 'read' },
};

export const LOGISTICS_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/dashboard/logistics-dashboard.component').then(
        (m) => m.LogisticsDashboardComponent,
      ),
  },
  {
    path: 'vehicles',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/vehicles/vehicles.component').then((m) => m.VehiclesComponent),
  },
  {
    path: 'vehicles/:id',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/vehicles/vehicle-detail.component').then((m) => m.VehicleDetailComponent),
  },
  {
    path: 'drivers',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/drivers/drivers.component').then((m) => m.DriversComponent),
  },
  {
    path: 'deliveries',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/deliveries/deliveries-list.component').then((m) => m.DeliveriesListComponent),
  },
  {
    path: 'deliveries/new',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/deliveries/delivery-form.component').then((m) => m.DeliveryFormComponent),
  },
  {
    path: 'deliveries/:id/edit',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/deliveries/delivery-form.component').then((m) => m.DeliveryFormComponent),
  },
  {
    path: 'deliveries/:id/view',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/deliveries/delivery-view.component').then((m) => m.DeliveryViewComponent),
  },
  {
    path: 'sales-queue',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/sales-queue/logistics-sales-queue.component').then(
        (m) => m.LogisticsSalesQueueComponent,
      ),
  },
  {
    path: 'delivery-notes',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/delivery-notes/delivery-notes-list.component').then(
        (m) => m.DeliveryNotesListComponent,
      ),
  },
  {
    path: 'maintenance',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/maintenance/maintenance-list.component').then((m) => m.MaintenanceListComponent),
  },
  {
    path: 'fuel',
    ...logisticsGuard,
    loadComponent: () =>
      import('./pages/fuel/fuel-list.component').then((m) => m.FuelListComponent),
  },
];
