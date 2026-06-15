import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

const hrGuard = {
  canActivate: [roleGuard],
  data: { module: 'hr', action: 'read' },
};

export const HR_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/dashboard/hr-dashboard.component').then(
        (m) => m.HrDashboardComponent,
      ),
  },
  {
    path: 'employees',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/employees/employees-list.component').then(
        (m) => m.EmployeesListComponent,
      ),
  },
  {
    path: 'employees/new',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/employees/employee-form.component').then(
        (m) => m.EmployeeFormComponent,
      ),
  },
  {
    path: 'employees/:id/edit',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/employees/employee-form.component').then(
        (m) => m.EmployeeFormComponent,
      ),
  },
  {
    path: 'employees/:id/view',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/employees/employee-view.component').then(
        (m) => m.EmployeeViewComponent,
      ),
  },
  {
    path: 'attendance',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/attendance/attendance.component').then(
        (m) => m.AttendanceComponent,
      ),
  },
  {
    path: 'leave',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/leave/leave.component').then((m) => m.LeaveComponent),
  },
  {
    path: 'payroll',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/payroll/payroll-list.component').then(
        (m) => m.PayrollListComponent,
      ),
  },
  {
    path: 'payroll/new',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/payroll/payroll-process.component').then(
        (m) => m.PayrollProcessComponent,
      ),
  },
  {
    path: 'payroll/:id',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/payroll/payroll-process.component').then(
        (m) => m.PayrollProcessComponent,
      ),
  },
  {
    path: 'payslips',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/payslips/payslips.component').then(
        (m) => m.PayslipsComponent,
      ),
  },
  {
    path: 'leave-types',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/leave-types/leave-types.component').then(
        (m) => m.LeaveTypesComponent,
      ),
  },
  {
    path: 'allowances',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/allowances/allowances.component').then(
        (m) => m.AllowancesComponent,
      ),
  },
  {
    path: 'appraisals',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/appraisals/appraisals.component').then(
        (m) => m.AppraisalsComponent,
      ),
  },
  {
    path: 'disciplinary',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/disciplinary/disciplinary.component').then(
        (m) => m.DisciplinaryComponent,
      ),
  },
  {
    path: 'admin',
    ...hrGuard,
    loadComponent: () =>
      import('./pages/admin/admin.component').then((m) => m.AdminComponent),
  },
];
