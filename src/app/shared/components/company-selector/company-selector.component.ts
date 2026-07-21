import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';

import { CompanyScope, CompanyContextService } from '../../../core/services/company-context.service';
import { UserCompanyAssignment } from '../../../core/models/auth.models';

@Component({
  selector: 'app-company-selector',
  templateUrl: './company-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanySelectorComponent {
  readonly companies = input.required<UserCompanyAssignment[]>();
  readonly rememberSelection = signal(true);
  readonly selected = output<CompanyScope>();

  readonly companyContext = inject(CompanyContextService);

  choose(companyId: CompanyScope): void {
    this.companyContext.setRememberSelection(this.rememberSelection());
    this.companyContext.setCompany(companyId, this.rememberSelection());
    this.companyContext.confirmWorkspaceSelection();
    this.selected.emit(companyId);
  }

  toggleRemember(): void {
    this.rememberSelection.update((v) => !v);
  }
}
