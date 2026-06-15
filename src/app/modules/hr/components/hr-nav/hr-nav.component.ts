import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-hr-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
      @for (tab of tabs; track tab.route) {
        <a
          [routerLink]="tab.route"
          routerLinkActive="!bg-white !text-[#1B3A6B] !shadow-sm"
          class="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 whitespace-nowrap transition-all hover:text-gray-900"
        >
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrNavComponent {
  readonly tabs = [
    { label: 'Dashboard', route: '/hr/dashboard' },
    { label: 'Employees', route: '/hr/employees' },
    { label: 'Attendance', route: '/hr/attendance' },
    { label: 'Leave', route: '/hr/leave' },
    { label: 'Payroll', route: '/hr/payroll' },
    { label: 'Payslips', route: '/hr/payslips' },
    { label: 'Leave Types', route: '/hr/leave-types' },
    { label: 'Allowances', route: '/hr/allowances' },
    { label: 'Appraisals', route: '/hr/appraisals' },
    { label: 'Disciplinary', route: '/hr/disciplinary' },
    { label: 'Administration', route: '/hr/admin' },
  ];
}
