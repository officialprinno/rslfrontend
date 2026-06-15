import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDanger?: boolean;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly stateSignal = signal<ConfirmDialogState>({
    visible: false,
    title: '',
    message: '',
  });
  private resultSubject: Subject<boolean> | null = null;

  readonly state = this.stateSignal.asReadonly();

  open(options: ConfirmDialogOptions): Observable<boolean> {
    this.resultSubject?.complete();
    this.resultSubject = new Subject<boolean>();
    this.stateSignal.set({
      visible: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      confirmDanger: options.confirmDanger ?? false,
    });
    return this.resultSubject.asObservable();
  }

  confirm(): void {
    this.stateSignal.update((s) => ({ ...s, visible: false }));
    this.resultSubject?.next(true);
    this.resultSubject?.complete();
    this.resultSubject = null;
  }

  cancel(): void {
    this.stateSignal.update((s) => ({ ...s, visible: false }));
    this.resultSubject?.next(false);
    this.resultSubject?.complete();
    this.resultSubject = null;
  }
}
