import { Injectable, inject } from '@angular/core';

export type AppTheme = 'dark' | 'light';

const THEME_KEY = 'rsl_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = document.documentElement;

  /** Apply theme to the document root immediately. */
  apply(theme: AppTheme): void {
    this.root.setAttribute('data-theme', theme);
    this.root.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }

  readStored(): AppTheme {
    const stored = localStorage.getItem(THEME_KEY) as AppTheme | null;
    return stored === 'dark' ? 'dark' : 'light';
  }

  isDark(): boolean {
    return this.root.getAttribute('data-theme') !== 'light';
  }
}
