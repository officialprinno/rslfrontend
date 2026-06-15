import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { InventoryNavComponent } from '../../components/inventory-nav/inventory-nav.component';

@Component({
  selector: 'app-production-hub',
  imports: [RouterLink, PageHeaderComponent, InventoryNavComponent],
  template: `
    <div class="page-container">
      <app-inventory-nav />
      <app-page-header [title]="title" [subtitle]="subtitle" />
      <div class="card p-8 text-center max-w-lg mx-auto">
        <p class="text-gray-600 mb-6">{{ description }}</p>
        <a [routerLink]="targetRoute" class="btn-primary">{{ buttonLabel }}</a>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductionHubComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly hub = this.route.snapshot.data['hub'] as string;

  readonly title = this.hub === 'bom' ? 'Bill of Materials' : 'Production Orders';
  readonly subtitle = 'Manufacturing inventory — Rock Solutions Wire Mesh';
  readonly targetRoute = this.hub === 'bom' ? '/production/bom' : '/production/work-orders';
  readonly buttonLabel = this.hub === 'bom' ? 'Open BOM Module' : 'Open Production Orders';
  readonly description =
    this.hub === 'bom'
      ? 'Manage BOM versions, material costs, and production planning for wire mesh products in the Production module.'
      : 'Create and track production orders, consume raw materials, and update finished goods inventory.';
}
