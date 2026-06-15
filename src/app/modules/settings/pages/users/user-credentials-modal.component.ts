import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { UserCredential } from '../../../../core/models/auth.models';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-user-credentials-modal',
  imports: [ModalComponent, StatusBadgeComponent],
  templateUrl: './user-credentials-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCredentialsModalComponent {
  readonly open = input(false);
  readonly loading = input(false);
  readonly rows = input<UserCredential[]>([]);
  readonly generatedAt = input('');

  readonly close = output<void>();
  readonly print = output<void>();
  readonly download = output<void>();

  onPrint(): void {
    this.print.emit();
  }

  onDownload(): void {
    this.download.emit();
  }
}
