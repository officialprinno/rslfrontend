import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface PromptDialogOptions {
  title: string;
  message: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  initialValue?: string;
  validation?: (value: string) => string | null;
}

export interface PromptDialogState extends PromptDialogOptions {
  visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class PromptDialogService {
  private readonly stateSignal = signal<PromptDialogState>({
    visible: false,
    title: '',
    message: '',
    label: '',
  });
  private resultSubject: Subject<string | null> | null = null;

  readonly state = this.stateSignal.asReadonly();

  open(options: PromptDialogOptions): Observable<string | null> {
    this.resultSubject?.complete();
    this.resultSubject = new Subject<string | null>();
    this.stateSignal.set({
      visible: true,
      title: options.title,
      message: options.message,
      label: options.label,
      placeholder: options.placeholder ?? '',
      required: options.required ?? false,
      multiline: options.multiline ?? false,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      initialValue: options.initialValue ?? '',
      validation: options.validation,
    });
    return this.resultSubject.asObservable();
  }

  submit(value: string): void {
    if (!this.resultSubject) return;
    this.stateSignal.update((state) => ({ ...state, visible: false }));
    this.resultSubject.next(value);
    this.resultSubject.complete();
    this.resultSubject = null;
  }

  cancel(): void {
    if (!this.resultSubject) return;
    this.stateSignal.update((state) => ({ ...state, visible: false }));
    this.resultSubject.next(null);
    this.resultSubject.complete();
    this.resultSubject = null;
  }
}
