import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { DocumentPreviewComponent } from './shared/components/document-preview/document-preview.component';
import { PromptDialogComponent } from './shared/components/prompt-dialog/prompt-dialog.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    ToastComponent,
    ConfirmDialogComponent,
    PromptDialogComponent,
    DocumentPreviewComponent,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
