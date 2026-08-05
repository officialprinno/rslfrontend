import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { Router } from '@angular/router';

import { finalize } from 'rxjs/operators';

import { ApiResponse, UserCompanyAssignment } from '../../../../core/models/auth.models';

import { AuthService } from '../../../../core/services/auth.service';
import { CompanyContextService } from '../../../../core/services/company-context.service';
import { WorkspaceResetService } from '../../../../core/services/workspace-reset.service';
import { CompanySelectorComponent } from '../../../../shared/components/company-selector/company-selector.component';



const REMEMBER_EMAIL_KEY = 'rsl_remember_email';
const CHANGE_PASSWORD_ROUTE = '/settings/change-password';



@Component({

  selector: 'app-login',

  imports: [ReactiveFormsModule, TranslatePipe, CompanySelectorComponent],

  templateUrl: './login.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class LoginComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly auth = inject(AuthService);
  private readonly companyContext = inject(CompanyContextService);
  private readonly workspaceReset = inject(WorkspaceResetService);
  private readonly router = inject(Router);



  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly showPassword = signal(false);

  readonly rememberMe = signal(false);
  readonly showCompanySelector = signal(false);
  readonly pendingCompanies = signal<UserCompanyAssignment[]>([]);



  readonly form = this.fb.nonNullable.group({

    email: ['', [Validators.required, Validators.email]],

    password: ['', [Validators.required, Validators.minLength(6)]],

  });



  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const user = this.auth.getCurrentUser();
      const companies = user?.companies ?? [];
      if (
        companies.length > 1 &&
        (this.companyContext.selectionRequired() || !this.companyContext.activeCompany())
      ) {
        this.pendingCompanies.set(companies);
        this.showCompanySelector.set(true);
        return;
      }
      void this.router.navigate([this.auth.getDefaultHomeRoute()]);
      return;
    }



    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);

    if (savedEmail) {

      this.form.patchValue({ email: savedEmail });

      this.rememberMe.set(true);

    }

  }



  togglePassword(): void {

    this.showPassword.update((v) => !v);

  }



  toggleRememberMe(): void {

    this.rememberMe.update((v) => !v);

  }



  private persistEmail(email: string): void {

    if (this.rememberMe()) {

      localStorage.setItem(REMEMBER_EMAIL_KEY, email);

    } else {

      localStorage.removeItem(REMEMBER_EMAIL_KEY);

    }

  }



  onSubmit(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;

    }



    this.loading.set(true);

    this.errorMessage.set(null);



    const { email, password } = this.form.getRawValue();



    this.auth

      .login(email, password)

      .pipe(finalize(() => this.loading.set(false)))

      .subscribe({

        next: (user) => {

          this.persistEmail(email);

          if ((user.companies?.length ?? 0) > 1) {
            this.pendingCompanies.set(user.companies ?? []);
            this.showCompanySelector.set(true);
            return;
          }

          void this.router.navigate([this.postLoginRoute()]);

        },

        error: (err: { error?: ApiResponse<unknown>; message?: string }) => {

          const apiMessage = err.error?.message;
          const thrownMessage = err instanceof Error ? err.message : err.message;

          const fieldErrors = err.error?.errors;

          if (typeof fieldErrors === 'object' && fieldErrors && !Array.isArray(fieldErrors)) {
            const nonField = fieldErrors['non_field_errors'];
            if (nonField?.length) {
              this.errorMessage.set(nonField[0]);
              return;
            }
            const firstKey = Object.keys(fieldErrors)[0];
            const firstMsg = firstKey ? (fieldErrors as Record<string, string[]>)[firstKey] : undefined;
            if (firstMsg?.length) {
              this.errorMessage.set(firstMsg[0]);
              return;
            }
          }

          this.errorMessage.set(
            apiMessage ??
            thrownMessage ??
            'Invalid email or password. Please try again.',
          );

        },

      });

  }

  onCompanySelected(): void {
    this.workspaceReset.resetForCompanySwitch();
    this.companyContext.confirmWorkspaceSelection();
    void this.router.navigate([this.postLoginRoute()]);
  }

  private postLoginRoute(): string {
    if (this.auth.isPasswordChangeOverdue()) {
      return CHANGE_PASSWORD_ROUTE;
    }
    return this.auth.getDefaultHomeRoute();
  }
}

