import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const safetyGuard = {
  canActivate: [roleGuard],
  data: { module: 'safety', action: 'read' },
};

export const SAFETY_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/dashboard/safety-dashboard.component').then(
        (m) => m.SafetyDashboardComponent,
      ),
  },
  {
    path: 'incidents',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/incidents/incidents-list.component').then(
        (m) => m.IncidentsListComponent,
      ),
  },
  {
    path: 'incidents/new',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/incidents/incident-form.component').then(
        (m) => m.IncidentFormComponent,
      ),
  },
  {
    path: 'incidents/:id/edit',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/incidents/incident-form.component').then(
        (m) => m.IncidentFormComponent,
      ),
  },
  {
    path: 'incidents/:id/view',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/incidents/incident-view.component').then(
        (m) => m.IncidentViewComponent,
      ),
  },
  {
    path: 'inspections',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/inspections/inspections-list.component').then(
        (m) => m.InspectionsListComponent,
      ),
  },
  {
    path: 'inspections/:id/conduct',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/inspections/inspection-conduct.component').then(
        (m) => m.InspectionConductComponent,
      ),
  },
  {
    path: 'ppe',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/ppe/ppe-management.component').then((m) => m.PpeManagementComponent),
  },
  {
    path: 'permits',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/permits/permits-list.component').then((m) => m.PermitsListComponent),
  },
  {
    path: 'permits/new',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/permits/permit-form.component').then((m) => m.PermitFormComponent),
  },
  {
    path: 'permits/:id/edit',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/permits/permit-form.component').then((m) => m.PermitFormComponent),
  },
  {
    path: 'permits/:id/view',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/permits/permit-view.component').then((m) => m.PermitViewComponent),
  },
  {
    path: 'training',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/training/training-list.component').then((m) => m.TrainingListComponent),
  },
  {
    path: 'training/:id/attendance',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/training/training-attendance.component').then(
        (m) => m.TrainingAttendanceComponent,
      ),
  },
  {
    path: 'reports',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/reports/safety-reports.component').then((m) => m.SafetyReportsComponent),
  },
  {
    path: 'security',
    redirectTo: 'security/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'security/dashboard',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/dashboard/security-dashboard.component').then(
        (m) => m.SecurityDashboardComponent,
      ),
  },
  {
    path: 'security/visitors',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/visitors/visitors-list.component').then(
        (m) => m.VisitorsListComponent,
      ),
  },
  {
    path: 'security/visitors/new',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/visitors/visitor-form.component').then(
        (m) => m.VisitorFormComponent,
      ),
  },
  {
    path: 'security/vehicles',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/vehicles/vehicles-list.component').then(
        (m) => m.VehiclesListComponent,
      ),
  },
  {
    path: 'security/inter-location',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/inter-location/movements-list.component').then(
        (m) => m.MovementsListComponent,
      ),
  },
  {
    path: 'security/personnel',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/personnel/personnel-list.component').then(
        (m) => m.PersonnelListComponent,
      ),
  },
  {
    path: 'security/shifts',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/shifts/shifts-list.component').then((m) => m.ShiftsListComponent),
  },
  {
    path: 'security/access',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/access/access-control.component').then(
        (m) => m.AccessControlComponent,
      ),
  },
  {
    path: 'security/incidents',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/incidents/security-incidents-list.component').then(
        (m) => m.SecurityIncidentsListComponent,
      ),
  },
  {
    path: 'security/incidents/new',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/incidents/security-incident-form.component').then(
        (m) => m.SecurityIncidentFormComponent,
      ),
  },
  {
    path: 'security/reports',
    ...safetyGuard,
    loadComponent: () =>
      import('./pages/security/reports/security-reports.component').then(
        (m) => m.SecurityReportsComponent,
      ),
  },
];
