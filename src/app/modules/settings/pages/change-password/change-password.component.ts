import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
    selector: 'app-change-password',
    imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent],
    template: `
    <div class="page-container">
      <app-page-header
        title="Change Password"
        subtitle="Secure your account by replacing the temporary password"
      >
        <a routerLink="/settings" class="btn-secondary">Back</a>
      </app-page-header>

      <div class="max-w-2xl card p-5 space-y-5">
        @if (isOverdue()) {
          <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Your 3-day password-change deadline has passed. Change your password now to continue.
          </div>
        } @else if (daysLeft() != null && needsChange()) {
          <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You are using a temporary password. Please change it within {{ daysLeft() }} day(s).
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" novalidate>
          <div>
            <label class="input-label" for="old_password">Current Password</label>
            <input
              id="old_password"
              type="password"
              formControlName="old_password"
              class="input-field w-full"
              autocomplete="current-password"
            />
          </div>

          <div>
            <label class="input-label" for="new_password">New Password</label>
            <input
              id="new_password"
              type="password"
              formControlName="new_password"
              class="input-field w-full"
              autocomplete="new-password"
            />
            @if (form.controls.new_password.touched && form.controls.new_password.errors?.['minlength']) {
              <p class="input-error">New password must have at least 8 characters.</p>
            }
          </div>

          <div>
            <label class="input-label" for="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              type="password"
              formControlName="confirm_password"
              class="input-field w-full"
              autocomplete="new-password"
            />
            @if (form.touched && form.errors?.['passwordMismatch']) {
              <p class="input-error">New password and confirmation do not match.</p>
            }
          </div>

          <div class="pt-2">
            <button type="submit" class="btn-primary" [disabled]="saving()">
              @if (saving()) {
                Saving...
              } @else {
                Change Password
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
    private readonly fb = inject(FormBuilder);
    private readonly auth = inject(AuthService);
    private readonly notification = inject(NotificationService);

    readonly saving = signal(false);

    readonly form = this.fb.nonNullable.group(
        {
            old_password: ['', [Validators.required]],
            new_password: ['', [Validators.required, Validators.minLength(8)]],
            confirm_password: ['', [Validators.required]],
        },
        {
            validators: (group) => {
                const next = group.get('new_password')?.value;
                const confirm = group.get('confirm_password')?.value;
                return next === confirm ? null : { passwordMismatch: true };
            },
        },
    );

    readonly isOverdue = computed(() => this.auth.isPasswordChangeOverdue());
    readonly needsChange = computed(() => this.auth.isPasswordChangeRequired());
    readonly daysLeft = computed(() => this.auth.getPasswordChangeDaysLeft());

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { old_password, new_password } = this.form.getRawValue();
        this.saving.set(true);

        this.auth
            .changePassword(old_password, new_password)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    this.notification.success('Password changed successfully. Please log in again.');
                    this.auth.logout();
                },
                error: (error) => {
                    this.notification.error(getApiErrorMessage(error, 'Failed to change password.'));
                },
            });
    }
}
