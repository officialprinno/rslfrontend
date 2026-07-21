import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Currency } from '../../../../core/models/inventory.model';
import { CurrencyService } from '../../../../core/services/currency.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { FinanceNavComponent } from '../../components/finance-nav/finance-nav.component';

@Component({
  selector: 'app-exchange-rates',
  imports: [FormsModule, PageHeaderComponent, FinanceNavComponent],
  templateUrl: './exchange-rates.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExchangeRatesComponent implements OnInit {
  private readonly currenciesApi = inject(CurrencyService);
  private readonly notification = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly currencies = signal<Currency[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly rates = signal<Record<number, number>>({});
  readonly updateRequired = signal(false);

  ngOnInit(): void {
    this.updateRequired.set(this.route.snapshot.queryParamMap.get('required') === '1');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.currenciesApi
      .getCurrencies()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (currencies) => {
          this.currencies.set(currencies);
          this.rates.set(
            Object.fromEntries(
              currencies.map((currency) => [
                currency.id,
                Number(currency.exchange_rate),
              ]),
            ),
          );
          const expired = currencies.some(
            (currency) =>
              !currency.is_default &&
              currency.code !== 'TZS' &&
              currency.rate_is_current !== true,
          );
          if (expired) {
            this.updateRequired.set(true);
          } else if (this.updateRequired()) {
            this.updateRequired.set(false);
            void this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {},
              replaceUrl: true,
            });
          }
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  editableCurrencies(): Currency[] {
    return this.currencies().filter(
      (currency) => !currency.is_default && currency.code !== 'TZS',
    );
  }

  updateRate(currencyId: number, value: number): void {
    this.rates.update((rates) => ({ ...rates, [currencyId]: Number(value) }));
  }

  publish(): void {
    const rates = this.editableCurrencies().map((currency) => ({
      currency_id: currency.id,
      exchange_rate: Number(this.rates()[currency.id]),
    }));
    const invalid = rates.find(
      (row) => !Number.isFinite(row.exchange_rate) || row.exchange_rate <= 0,
    );
    if (invalid) {
      this.notification.error('Every foreign currency must have a rate greater than zero.');
      return;
    }

    this.saving.set(true);
    this.currenciesApi
      .publishRates(rates)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.notification.success(
            'Exchange rates published for 24 hours. All users were notified.',
          );
          this.updateRequired.set(false);
          void this.router.navigate(['/finance/dashboard']);
        },
        error: (error) => this.notification.error(getApiErrorMessage(error)),
      });
  }

  statusLabel(currency: Currency): string {
    if (currency.is_default || currency.code === 'TZS') return 'Base currency';
    return currency.rate_is_current ? 'Current' : 'Expired / update required';
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Not published';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
