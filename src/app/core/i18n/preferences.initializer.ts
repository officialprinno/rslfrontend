import { APP_INITIALIZER, inject } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { PreferencesService } from '../services/preferences.service';

export function initializePreferences(): () => Promise<void> {
  const preferences = inject(PreferencesService);
  return () =>
    firstValueFrom(
      preferences.bootstrap().pipe(
        map(() => undefined),
        catchError((err) => {
          console.error('Failed to load language preferences; continuing with defaults.', err);
          return of(undefined);
        }),
      ),
    );
}

export const preferencesInitializer = {
  provide: APP_INITIALIZER,
  useFactory: initializePreferences,
  multi: true,
};
