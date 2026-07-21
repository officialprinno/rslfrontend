import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ROLES } from '../constants/roles.constants';
import { AuthService } from '../services/auth.service';
import { CurrencyService } from '../services/currency.service';

/** True when the user may publish Finance exchange rates. */
function canPublishExchangeRates(auth: AuthService): boolean {
  return (
    auth.isSuperAdmin() ||
    auth.hasRole(ROLES.HOD_FINANCE) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasPermission('finance', 'update')
  );
}

function isForeignCurrencyExpired(currency: {
  is_default?: boolean;
  code?: string;
  rate_is_current?: boolean;
}): boolean {
  if (currency.is_default || currency.code === 'TZS') {
    return false;
  }
  return currency.rate_is_current !== true;
}

/**
 * Finance users who can publish rates must update expired FX rates (24h window)
 * before using other Finance screens. Exchange Rates page itself is always allowed.
 */
export const exchangeRateGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const currenciesApi = inject(CurrencyService);

  if (state.url.includes('/finance/exchange-rates')) {
    return true;
  }

  if (!canPublishExchangeRates(auth)) {
    return true;
  }

  return currenciesApi.getCurrencies().pipe(
    map((currencies) => {
      const expired = currencies.filter(isForeignCurrencyExpired);
      if (!expired.length) {
        return true;
      }
      return router.createUrlTree(['/finance/exchange-rates'], {
        queryParams: { required: '1' },
      });
    }),
    catchError(() => of(true)),
  );
};
