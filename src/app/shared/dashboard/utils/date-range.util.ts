import { DashboardDatePreset, DateRangeValue } from '../models/dashboard.types';

export const DEFAULT_DATE_PRESETS: DashboardDatePreset[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'this_year', label: 'This year' },
];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function resolveDatePreset(presetId: string): DateRangeValue {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = toIsoDate(today);

  if (presetId === 'today') {
    return { startDate: end, endDate: end, preset: presetId };
  }

  if (presetId === 'this_week') {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { startDate: toIsoDate(start), endDate: end, preset: presetId };
  }

  if (presetId === 'this_month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toIsoDate(start), endDate: end, preset: presetId };
  }

  if (presetId === 'last_30') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { startDate: toIsoDate(start), endDate: end, preset: presetId };
  }

  if (presetId === 'this_quarter') {
    const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
    const start = new Date(today.getFullYear(), quarterMonth, 1);
    return { startDate: toIsoDate(start), endDate: end, preset: presetId };
  }

  const start = new Date(today.getFullYear(), 0, 1);
  return { startDate: toIsoDate(start), endDate: end, preset: presetId };
}

export function formatDateRangeLabel(value: DateRangeValue): string {
  if (value.preset) {
    const preset = DEFAULT_DATE_PRESETS.find((p) => p.id === value.preset);
    if (preset) return preset.label;
  }
  return `${value.startDate} — ${value.endDate}`;
}
