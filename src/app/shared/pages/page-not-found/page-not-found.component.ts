import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  imports: [RouterLink],
  template: `
    <div class="app-shell min-h-screen flex items-center justify-center p-6">
      <div class="login-card text-center max-w-lg">
        <p class="text-7xl font-bold bg-gradient-to-br from-[#1B3A6B] to-[#2E86AB] bg-clip-text text-transparent mb-2">404</p>
        <h1 class="page-title mb-2">Page Not Found</h1>
        <p class="text-sm text-gray-500 mb-8">The page you are looking for does not exist or has been moved.</p>
        <a routerLink="/dashboard" class="btn-primary">Back to Dashboard</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageNotFoundComponent {}
