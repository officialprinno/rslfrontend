import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Label } from '../../../core/models/email.model';
import { EmailService } from '../../../core/services/email.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

const COLORS = ['blue', 'green', 'yellow', 'red', 'purple', 'orange', 'teal', 'gray'];

@Component({
  selector: 'app-email-labels-settings',
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header title="Email Labels" subtitle="Organize emails with colored labels" />

    <div class="card max-w-2xl">
      <div class="flex gap-2 mb-4">
        <input class="input-field flex-1" placeholder="New label name" [(ngModel)]="newName" />
        <select class="input-field !w-auto" [(ngModel)]="newColor">
          @for (c of colors; track c) {
            <option [value]="c">{{ c }}</option>
          }
        </select>
        <button type="button" class="btn-primary" (click)="add()" [disabled]="!newName.trim()">Add</button>
      </div>

      <table class="data-table w-full">
        <thead>
          <tr>
            <th>Color</th>
            <th>Name</th>
            <th>Emails</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (lbl of labels(); track lbl.id) {
            <tr>
              <td><span class="w-3 h-3 rounded-full inline-block" [attr.data-color]="lbl.color"></span></td>
              <td>{{ lbl.name }}</td>
              <td>{{ lbl.emails_count }}</td>
              <td>
                <button type="button" class="text-xs text-red-600" (click)="remove(lbl)">Delete</button>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <a routerLink="/email" class="btn-secondary mt-4 inline-flex">Back to Email</a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLabelsSettingsComponent implements OnInit {
  private readonly email = inject(EmailService);

  readonly labels = signal<Label[]>([]);
  readonly colors = COLORS;
  newName = '';
  newColor = 'blue';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.email.getLabels().subscribe((list) => this.labels.set(list));
  }

  add(): void {
    this.email.createLabel({ name: this.newName.trim(), color: this.newColor }).subscribe(() => {
      this.newName = '';
      this.load();
    });
  }

  remove(lbl: Label): void {
    if (!confirm(`Delete label "${lbl.name}"?`)) return;
    this.email.deleteLabel(lbl.id).subscribe(() => this.load());
  }
}
