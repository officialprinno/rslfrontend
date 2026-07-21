import { DashboardKpiIcon, DashboardTone } from '../models/dashboard.types';

const KPI_ICON_PATHS: Record<Exclude<DashboardKpiIcon, 'custom'>, string> = {
  revenue:
    'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  expense:
    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  pending: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  overdue:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  inventory:
    'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  people:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  delivery:
    'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16',
  alert:
    'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  chart:
    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  document:
    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
};

export function kpiIconPath(icon?: DashboardKpiIcon): string | null {
  if (!icon || icon === 'custom') return null;
  return KPI_ICON_PATHS[icon];
}

export function toneClasses(tone: DashboardTone = 'neutral'): {
  bg: string;
  text: string;
  border: string;
  accent: string;
} {
  const map: Record<DashboardTone, { bg: string; text: string; border: string; accent: string }> = {
    neutral: {
      bg: 'bg-[var(--dash-tone-neutral-bg)]',
      text: 'text-[var(--dash-tone-neutral-text)]',
      border: 'border-[var(--dash-tone-neutral-border)]',
      accent: 'var(--color-primary-500)',
    },
    success: {
      bg: 'bg-[var(--dash-tone-success-bg)]',
      text: 'text-[var(--dash-tone-success-text)]',
      border: 'border-[var(--dash-tone-success-border)]',
      accent: 'var(--color-success)',
    },
    warning: {
      bg: 'bg-[var(--dash-tone-warning-bg)]',
      text: 'text-[var(--dash-tone-warning-text)]',
      border: 'border-[var(--dash-tone-warning-border)]',
      accent: 'var(--color-warning)',
    },
    danger: {
      bg: 'bg-[var(--dash-tone-danger-bg)]',
      text: 'text-[var(--dash-tone-danger-text)]',
      border: 'border-[var(--dash-tone-danger-border)]',
      accent: 'var(--color-danger)',
    },
    info: {
      bg: 'bg-[var(--dash-tone-info-bg)]',
      text: 'text-[var(--dash-tone-info-text)]',
      border: 'border-[var(--dash-tone-info-border)]',
      accent: 'var(--color-info)',
    },
    accent: {
      bg: 'bg-[var(--dash-tone-accent-bg)]',
      text: 'text-[var(--dash-tone-accent-text)]',
      border: 'border-[var(--dash-tone-accent-border)]',
      accent: 'var(--color-accent-400)',
    },
  };
  return map[tone];
}
