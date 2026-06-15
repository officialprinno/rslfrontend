import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Router } from '@angular/router';

import { finalize } from 'rxjs/operators';



import { TranslatePipe } from '@ngx-translate/core';

import { ApiResponse } from '../../../../core/models/auth.models';

import { AuthService } from '../../../../core/services/auth.service';



const REMEMBER_EMAIL_KEY = 'rsl_remember_email';



@Component({

  selector: 'app-login',

  imports: [ReactiveFormsModule, TranslatePipe],

  templateUrl: './login.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class LoginComponent implements OnInit {

  private readonly fb = inject(FormBuilder);

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);



  readonly loading = signal(false);

  readonly errorMessage = signal<string | null>(null);

  readonly showPassword = signal(false);

  readonly rememberMe = signal(false);



  readonly form = this.fb.nonNullable.group({

    email: ['', [Validators.required, Validators.email]],

    password: ['', [Validators.required, Validators.minLength(6)]],

  });



  ngOnInit(): void {

    if (this.auth.isAuthenticated()) {

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

        next: () => {

          this.persistEmail(email);

          const destination = this.auth.getDefaultHomeRoute();

          void this.router.navigate([destination]);

        },

        error: (err: { error?: ApiResponse<unknown>; message?: string }) => {

          const apiMessage = err.error?.message;

          const fieldErrors = err.error?.errors;

          if (typeof fieldErrors === 'object' && fieldErrors && !Array.isArray(fieldErrors)) {

            const nonField = fieldErrors['non_field_errors'];

            if (nonField?.length) {

              this.errorMessage.set(nonField[0]);

              return;

            }

          }

          this.errorMessage.set(apiMessage ?? err.message ?? 'Invalid email or password. Please try again.');

        },

      });

  }

}

