export const COMPANY_DETAILS = {
  name: 'Rock Solutions Limited',
  tin: '127-950-695',
  vat: '40022138R',
  address: 'Plot 252 Block L, Misungwi, Mwanza',
  phone: '',
  email: '',
  website: '',
};

export const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
] as const;

export const PAYMENT_FREQUENCIES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
] as const;

export const EMPLOYEE_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DRAFT', label: 'Draft' },
] as const;

export const EMPLOYMENT_TYPES = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CASUAL', label: 'Casual' },
] as const;

export function employmentTypeLabel(type: string): string {
  return EMPLOYMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
  PERMANENT: 'blue',
  CONTRACT: 'orange',
  CASUAL: 'gray',
};

export const LEAVE_TYPE_COLORS: Record<string, string> = {
  ANNUAL: 'blue',
  SICK: 'orange',
  MATERNITY: 'pink',
  PATERNITY: 'cyan',
  COMPASSIONATE: 'purple',
};

export const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
  PRESENT: 'green',
  ABSENT: 'red',
  LATE: 'orange',
  HALF_DAY: 'yellow',
  LEAVE: 'blue',
};

export const ATTENDANCE_CALENDAR_CLASSES: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ABSENT: 'bg-red-100 text-red-800 border-red-200',
  LATE: 'bg-amber-100 text-amber-800 border-amber-200',
  HALF_DAY: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LEAVE: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const PIE_COLORS = ['#1B3A6B', '#2E6DB4', '#4A90D9', '#7EB3E8', '#A8D0F0'];

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  LOW: 'border-l-blue-400',
  MEDIUM: 'border-l-amber-500',
  HIGH: 'border-l-red-500',
};

export const PAYROLL_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  REVIEWED: 'blue',
  APPROVED: 'green',
  PAID: 'emerald',
};

export const APPRAISAL_RATING_COLORS: Record<string, string> = {
  EXCELLENT: 'green',
  GOOD: 'blue',
  SATISFACTORY: 'yellow',
  NEEDS_IMPROVEMENT: 'red',
};

export const DISCIPLINARY_TYPES = [
  { value: 'VERBAL_WARNING', label: 'Verbal Warning' },
  { value: 'WRITTEN_WARNING', label: 'Written Warning' },
  { value: 'FINAL_WARNING', label: 'Final Warning' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'TERMINATION', label: 'Termination' },
] as const;

export const DISCIPLINARY_TYPE_COLORS: Record<string, string> = {
  VERBAL_WARNING: 'yellow',
  WRITTEN_WARNING: 'orange',
  FINAL_WARNING: 'red',
  SUSPENSION: 'dark-red',
  TERMINATION: 'black',
};

export const APPRAISAL_PERIODS = [
  { value: 'QUARTER', label: 'Quarter' },
  { value: 'ANNUAL', label: 'Annual' },
] as const;

export const WORKING_DAYS = [
  { value: 'MON', label: 'Monday' },
  { value: 'TUE', label: 'Tuesday' },
  { value: 'WED', label: 'Wednesday' },
  { value: 'THU', label: 'Thursday' },
  { value: 'FRI', label: 'Friday' },
  { value: 'SAT', label: 'Saturday' },
  { value: 'SUN', label: 'Sunday' },
] as const;

export function disciplinaryTypeLabel(type: string): string {
  return DISCIPLINARY_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function appraisalPeriodLabel(period: string): string {
  return APPRAISAL_PERIODS.find((p) => p.value === period)?.label ?? period;
}

export function appraisalRatingLabel(rating: string): string {
  return rating.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PAYE_BANDS = [
  { min: 0, max: 270_000, rate: 0, base: 0, label: '0 — 270,000' },
  { min: 270_001, max: 520_000, rate: 0.08, base: 0, label: '270,001 — 520,000' },
  { min: 520_001, max: 760_000, rate: 0.2, base: 20_000, label: '520,001 — 760,000' },
  { min: 760_001, max: 1_000_000, rate: 0.25, base: 68_000, label: '760,001 — 1,000,000' },
  { min: 1_000_001, max: null, rate: 0.3, base: 128_000, label: 'Above 1,000,000' },
] as const;

export const NSSF_RATE = 10;
export const NHIF_TIERS = [
  { maxGross: 100_000, amount: 3_000 },
  { maxGross: 200_000, amount: 5_000 },
  { maxGross: 400_000, amount: 8_000 },
  { maxGross: 600_000, amount: 10_000 },
  { maxGross: 800_000, amount: 15_000 },
  { maxGross: 1_000_000, amount: 18_000 },
  { maxGross: 1_500_000, amount: 25_000 },
  { maxGross: 2_000_000, amount: 30_000 },
  { maxGross: 2_500_000, amount: 35_000 },
  { maxGross: Infinity, amount: 40_000 },
] as const;

export function maskSalary(
  amount?: string | number | null,
  revealed = false,
): string {
  if (revealed) {
    const value = Number(amount ?? 0);
    return new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return '••••••';
}

export function formatHrAmount(amount: string | number | null | undefined, code = 'TZS'): string {
  const value = Number(amount ?? 0);
  return `${code} ${new Intl.NumberFormat('en-TZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function maskBankAccount(account: string): string {
  if (!account || account.length <= 4) return account || '—';
  return `****${account.slice(-4)}`;
}
