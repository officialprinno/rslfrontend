import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardApprovalItem } from '../../models/dashboard.types';

@Component({
  selector: 'app-approval-queue',
  imports: [NgTemplateOutlet, RouterLink],
  template: `
    @if (items().length) {
      <ul class="dash-approval-queue" role="list">
        @for (item of items(); track item.id) {
          <li>
            @if (item.route) {
              <a
                class="dash-approval-queue__item"
                [routerLink]="item.route"
                [queryParams]="item.queryParams"
                [class.dash-approval-queue__item--high]="item.priority === 'high'"
              >
                <ng-container *ngTemplateOutlet="approvalBody; context: { $implicit: item }" />
              </a>
            } @else {
              <div
                class="dash-approval-queue__item"
                [class.dash-approval-queue__item--high]="item.priority === 'high'"
              >
                <ng-container *ngTemplateOutlet="approvalBody; context: { $implicit: item }" />
              </div>
            }
          </li>
        }
      </ul>
    } @else {
      <p class="dash-approval-queue__empty">{{ emptyMessage() }}</p>
    }

    <ng-template #approvalBody let-item>
      <div class="min-w-0 flex-1">
        <p class="dash-approval-queue__title">{{ item.title }}</p>
        @if (item.subtitle) {
          <p class="dash-approval-queue__subtitle">{{ item.subtitle }}</p>
        }
      </div>
      @if (item.amount) {
        <span class="dash-approval-queue__amount">{{ item.amount }}</span>
      }
      @if (item.route) {
        <span class="dash-approval-queue__cta" aria-hidden="true">Review →</span>
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalQueueComponent {
  readonly items = input<DashboardApprovalItem[]>([]);
  readonly emptyMessage = input('No pending approvals.');
}
