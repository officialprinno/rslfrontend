import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { BOM, Product } from '../../../../core/models/production.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProductionService } from '../../../../core/services/production.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { formatCurrency, formatDate, formatNumber } from '../../../../core/utils/format.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { ProductionNavComponent } from '../../components/production-nav/production-nav.component';
import { canActivateBOM, canDeleteAnything, canManageBOM } from '../../utils/production-permissions.util';

@Component({
  selector: 'app-bom-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    ProductionNavComponent,
    PaginationComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './bom-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomListComponent implements OnInit {
  private readonly production = inject(ProductionService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);

  readonly boms = signal<BOM[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly productFilter = signal<number | ''>('');
  readonly viewBom = signal<BOM | null>(null);
  readonly viewLoading = signal(false);
  readonly actionLoading = signal<number | null>(null);

  readonly formatCurrency = formatCurrency;
  readonly formatDate = formatDate;
  readonly formatNumber = formatNumber;
  readonly canAdd = () => canManageBOM(this.auth);
  readonly canActivate = () => canActivateBOM(this.auth);
  readonly canDelete = () => canDeleteAnything(this.auth);

  readonly statuses = ['DRAFT', 'ACTIVE', 'INACTIVE'];

  private readonly router = inject(Router);

  ngOnInit(): void {
    const productParam = this.route.snapshot.queryParamMap.get('product');
    if (productParam) this.productFilter.set(+productParam);
    this.production.getProducts({ page_size: 100, is_active: true }).subscribe((d) => this.products.set(d.results));
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    const params: Record<string, string | number> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: '-created_at',
    };
    if (this.search()) params['search'] = this.search();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.productFilter()) params['product'] = this.productFilter() as number;

    this.production
      .getBOMs(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (d) => {
          this.boms.set(d.results);
          this.total.set(d.count);
        },
        error: () => this.error.set(true),
      });
  }

  openView(bom: BOM): void {
    this.viewBom.set(bom);
    this.viewLoading.set(true);
    this.production
      .getBOM(bom.id)
      .pipe(finalize(() => this.viewLoading.set(false)))
      .subscribe({
        next: (full) => this.viewBom.set(full),
        error: (e) => {
          this.notification.error(getApiErrorMessage(e, 'Failed to load BOM details'));
          this.viewBom.set(null);
        },
      });
  }

  onActivate(bom: BOM): void {
    this.confirm
      .open({
        title: 'Activate BOM',
        message: `Activate BOM v${bom.version} for "${bom.product_name}"? This will deactivate any other active BOM for this product.`,
        confirmLabel: 'Activate',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.actionLoading.set(bom.id);
        this.production
          .activateBOM(bom.id)
          .pipe(finalize(() => this.actionLoading.set(null)))
          .subscribe({
            next: () => {
              this.notification.success('BOM activated');
              this.load();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e, 'Activation failed')),
          });
      });
  }

  onDuplicate(bom: BOM): void {
    this.actionLoading.set(bom.id);
    this.production
      .duplicateBOM(bom.id)
      .pipe(finalize(() => this.actionLoading.set(null)))
      .subscribe({
        next: (newBom) => {
          this.notification.success('BOM duplicated');
          void this.router.navigate(['/production/bom', newBom.id, 'edit']);
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Duplicate failed')),
      });
  }

  goToNewBom(): void {
    void this.router.navigate(['/production/bom/new']);
  }

  onDelete(bom: BOM): void {
    if (bom.status === 'ACTIVE') {
      this.notification.error('Cannot delete an active BOM.');
      return;
    }
    this.confirm
      .open({
        title: 'Delete BOM',
        message: `Delete BOM v${bom.version} for "${bom.product_name}"?`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.production.deleteBOM(bom.id).subscribe({
          next: () => {
            this.notification.success('BOM deleted');
            this.load();
          },
          error: (e) => this.notification.error(getApiErrorMessage(e, 'Delete failed')),
        });
      });
  }
}
