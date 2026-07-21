import { Injectable, inject } from '@angular/core';

import { DepartmentContextService } from './department-context.service';
import { NotificationCountsService } from './notification-counts.service';

/** Clears cached UI state when the active company workspace changes. */
@Injectable({ providedIn: 'root' })
export class WorkspaceResetService {
  private readonly counts = inject(NotificationCountsService);
  private readonly deptContext = inject(DepartmentContextService);

  resetForCompanySwitch(): void {
    this.counts.reset();
    this.deptContext.setDepartment('all');
  }
}
