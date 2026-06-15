import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const guard = {
  canActivate: [roleGuard],
  data: { module: 'driver_portal', action: 'read' },
};

export const DRIVER_PORTAL_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...guard,
    loadComponent: () =>
      import('./pages/dashboard/driver-dashboard.component').then((m) => m.DriverDashboardComponent),
  },
  {
    path: 'trips',
    ...guard,
    loadComponent: () =>
      import('./pages/trips/driver-trips-list.component').then((m) => m.DriverTripsListComponent),
  },
  {
    path: 'trips/:id',
    ...guard,
    loadComponent: () =>
      import('./pages/trips/driver-trip-detail.component').then((m) => m.DriverTripDetailComponent),
  },
  {
    path: 'history',
    ...guard,
    loadComponent: () =>
      import('./pages/history/driver-history.component').then((m) => m.DriverHistoryComponent),
  },
  {
    path: 'profile',
    ...guard,
    loadComponent: () =>
      import('./pages/profile/driver-profile.component').then((m) => m.DriverProfileComponent),
  },
  {
    path: 'vehicle',
    ...guard,
    loadComponent: () =>
      import('./pages/vehicle/driver-vehicle.component').then((m) => m.DriverVehicleComponent),
  },
];
