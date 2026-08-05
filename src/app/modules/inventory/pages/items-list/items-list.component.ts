import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Category, Item, ItemType } from '../../../../core/models/inventory.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatCurrency, formatNumber } from '../../../../core/utils/format.util';
import { handleListLoadError, resetListLoadState } from '../../../../core/utils/workspace-empty-state.util';
import { downloadBlob } from '../../../../core/utils/download.util';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { EnterpriseDataTableComponent } from '../../../../shared/components/enterprise-data-table/enterprise-data-table.component';
import { ListFilterBarComponent } from '../../../../shared/components/list-filter-bar/list-filter-bar.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { TableActionsComponent, TableAction } from '../../../../shared/components/table-actions/table-actions.component';
import { TableCellTextComponent } from '../../../../shared/components/table-cell-text/table-cell-text.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';
import { ItemFormModalComponent } from '../../components/item-form-modal/item-form-modal.component';
import { ItemTypeBadgeComponent } from '../../components/item-type-badge/item-type-badge.component';
import { ItemViewModalComponent } from '../../components/item-view-modal/item-view-modal.component';
import { ITEM_TYPES } from '../../constants/inventory.constants';
import { importMasterInventory, masterCatalogSummary } from '../../utils/master-inventory.util';
import { canAddItem, canDeleteItem, canEditItem } from '../../utils/inventory-permissions.util';
import { canProcessInventoryWorkflows } from '../../../finance/utils/finance-permissions.util';
import { getApiErrorMessage } from '../../../../core/utils/api.util';

const FINANCE_WORKFLOW_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'In Finance queue',
  COSTING_IN_PROGRESS: 'Costing in progress',
  PRICING_IN_PROGRESS: 'Pricing in progress',
  PENDING_FINANCE_APPROVAL: 'Pending approval',
  READY_FOR_SALE: 'Ready for sale',
};

@Component({
  selector: 'app-items-list',
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    InventoryNavComponent,
    PaginationComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    StatusBadgeComponent,
    ItemTypeBadgeComponent,
    ItemFormModalComponent,
    ItemViewModalComponent,
    EnterpriseDataTableComponent,
    ListFilterBarComponent,
    TableActionsComponent,
    TableCellTextComponent,
  ],
  templateUrl: './items-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemsListComponent implements OnInit {
  private readonly inventory = inject(InventoryService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly router = inject(Router);

  readonly items = signal<Item[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly workspaceEmpty = signal(false);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly ordering = signal('name');

  readonly search = signal('');
  readonly categoryFilter = signal<number | ''>('');
  readonly typeFilter = signal<ItemType | ''>('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');

  readonly showForm = signal(false);
  readonly showView = signal(false);
  readonly editingItem = signal<Item | null>(null);
  readonly viewingItem = signal<Item | null>(null);

  readonly itemTypes = ITEM_TYPES;
  readonly formatCurrency = formatCurrency;
  readonly formatNumber = formatNumber;

  readonly seeding = signal(false);
  readonly importing = signal(false);

  readonly canAdd = () => canAddItem(this.auth);
  readonly canEdit = () => canEditItem(this.auth);
  readonly canDelete = () => canDeleteItem(this.auth);
  readonly canSeedMaster = () => this.auth.currentUser()?.is_staff === true;
  readonly canOpenFinancePricing = () => canProcessInventoryWorkflows(this.auth);
  readonly masterCatalogSummary = masterCatalogSummary;

  ngOnInit(): void {
    this.loadCategories();
    this.loadItems();
  }

  loadCategories(): void {
    this.inventory.getCategories().subscribe({
      next: (data) => this.categories.set(data),
    });
  }

  loadItems(): void {
    this.loading.set(true);
    resetListLoadState(this.error, this.workspaceEmpty);

    const params: Record<string, string | number | boolean> = {
      page: this.page(),
      page_size: this.pageSize(),
      ordering: this.ordering(),
    };
    if (this.search()) params['search'] = this.search();
    if (this.categoryFilter()) params['category'] = this.categoryFilter() as number;
    if (this.typeFilter()) params['item_type'] = this.typeFilter() as string;
    if (this.statusFilter() === 'active') params['is_active'] = true;
    if (this.statusFilter() === 'inactive') params['is_active'] = false;

    this.inventory
      .getItems(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.items.set(items.results);
          this.total.set(items.count);
        },
        error: (e) => handleListLoadError(e, this.error, this.workspaceEmpty),
      });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadItems();
  }

  onSort(field: string): void {
    const current = this.ordering();
    this.ordering.set(current === field ? `-${field}` : field);
    this.loadItems();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadItems();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.loadItems();
  }

  openAdd(): void {
    this.editingItem.set(null);
    this.showForm.set(true);
  }

  openEdit(item: Item): void {
    this.editingItem.set(item);
    this.showView.set(false);
    this.showForm.set(true);
  }

  openView(item: Item): void {
    this.viewingItem.set(item);
    this.showView.set(true);
  }

  onRowClick(item: Item): void {
    this.openView(item);
  }

  onDelete(item: Item): void {
    this.confirm
      .open({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        confirmDanger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.inventory.deleteItem(item.id).subscribe({
          next: () => {
            this.notification.success('Item deleted successfully');
            this.loadItems();
          },
          error: (err: Error) => this.notification.error(err.message ?? 'Failed to delete item'),
        });
      });
  }

  rowActions(item: Item): TableAction[] {
    const actions: TableAction[] = [{ id: 'view', label: 'View', icon: 'view' }];
    if (this.canOpenFinancePricing() && item.pending_finance_workflow_id) {
      actions.push({ id: 'finance', label: 'Set Selling Price', icon: 'edit' });
    }
    if (this.canEdit()) actions.push({ id: 'edit', label: 'Edit', icon: 'edit' });
    if (this.canDelete()) actions.push({ id: 'delete', label: 'Delete', icon: 'delete', danger: true });
    return actions;
  }

  onRowAction(actionId: string, item: Item): void {
    if (actionId === 'view') this.openView(item);
    if (actionId === 'finance' && item.pending_finance_workflow_id) {
      void this.router.navigate(['/finance/inventory-workflows', item.pending_finance_workflow_id]);
    }
    if (actionId === 'edit') this.openEdit(item);
    if (actionId === 'delete') this.onDelete(item);
  }

  exportExcel(): void {
    exportToExcel('inventory-items', [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'category_name', label: 'Category' },
      { key: 'item_type', label: 'Type' },
      { key: 'unit_of_measure', label: 'Unit' },
      { key: 'unit_cost', label: 'Unit Cost', format: (r) => formatCurrency(r.unit_cost, r.currency_code) },
      { key: 'selling_price', label: 'Selling Price', format: (r) => formatCurrency(r.selling_price, r.currency_code) },
      { key: 'current_stock', label: 'Stock Qty', format: (r) => formatNumber(this.stockQty(r)) },
    ], this.items());
  }

  downloadImportTemplate(): void {
    this.inventory.downloadItemImportTemplate().subscribe({
      next: (blob) => downloadBlob(blob, 'inventory_items_import_template.xlsx'),
      error: (e) => this.notification.error(getApiErrorMessage(e, 'Failed to download template')),
    });
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.csv') && !filename.endsWith('.xlsx')) {
      this.notification.error('Please upload a CSV or XLSX file.');
      input.value = '';
      return;
    }

    this.importing.set(true);
    this.inventory
      .importItemsSheet(file)
      .pipe(finalize(() => this.importing.set(false)))
      .subscribe({
        next: (res) => {
          const summary = `Imported ${res.data.created_count} created, ${res.data.updated_count} updated.`;
          this.notification.success(res.warning ? `${summary} ${res.warning}` : summary);
          if (res.data.failed_count > 0) {
            this.notification.error(`${res.data.failed_count} row(s) failed. Review and re-upload.`);
          }
          this.loadCategories();
          this.loadItems();
        },
        error: (e) => this.notification.error(getApiErrorMessage(e, 'Item import failed')),
      });

    input.value = '';
  }

  stockQty(item: Item): number {
    return Number(item.quantity_available ?? item.current_stock ?? 0);
  }

  isLowStock(item: Item): boolean {
    return this.stockQty(item) <= item.reorder_level;
  }

  isTradedAwaitingFinance(item: Item): boolean {
    return item.item_type === 'TRADED' && !!item.finance_pricing_pending;
  }

  financeWorkflowStatusLabel(status: string | null | undefined): string {
    if (!status) return 'In Finance queue';
    return FINANCE_WORKFLOW_STATUS_LABELS[status] ?? status;
  }

  onItemSaved(): void {
    this.showForm.set(false);
    this.loadItems();
  }

  loadMasterCatalog(update = false): void {
    this.confirm
      .open({
        title: update ? 'Update Master Catalogue' : 'Load Master Catalogue',
        message: `${masterCatalogSummary()}. ${update ? 'Update existing' : 'Create missing'} categories and items?`,
        confirmLabel: update ? 'Update' : 'Load Catalogue',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.seeding.set(true);
        importMasterInventory(this.inventory, { update, seed: true })
          .pipe(finalize(() => this.seeding.set(false)))
          .subscribe({
            next: ({ seeded }) => {
              const s = seeded!;
              this.notification.success(
                `Master catalogue loaded: ${s.items_created} items created, ${s.items_updated} updated`,
              );
              this.loadCategories();
              this.loadItems();
            },
            error: (e) => this.notification.error(getApiErrorMessage(e)),
          });
      });
  }
}
