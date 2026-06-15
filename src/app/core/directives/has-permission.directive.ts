import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

import { PermissionAction } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

export interface HasPermissionConfig {
  module: string;
  action?: PermissionAction;
}

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  readonly hasPermission = input.required<string | HasPermissionConfig>({ alias: 'hasPermission' });
  readonly hasPermissionAction = input<PermissionAction>('read', { alias: 'hasPermissionAction' });

  constructor() {
    effect(() => {
      const config = this.hasPermission();
      const action =
        typeof config === 'string'
          ? this.hasPermissionAction()
          : (config.action ?? 'read');
      const module = typeof config === 'string' ? config : config.module;

      const allowed = module ? this.auth.hasPermission(module, action) : true;

      this.viewContainer.clear();
      if (allowed) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
