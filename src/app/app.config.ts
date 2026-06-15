import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import {
  TRANSLATE_HTTP_LOADER_CONFIG,
  TranslateHttpLoader,
} from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { preferencesInitializer } from './core/i18n/preferences.initializer';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: {
        resources: [{ prefix: '/assets/i18n/', suffix: '.json' }],
        // Bypass auth interceptors — otherwise bootstrap hits AuthService ↔ PreferencesService cycle.
        useHttpBackend: true,
      },
    },
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateLoader(TranslateHttpLoader),
    }),
    preferencesInitializer,
  ],
};
