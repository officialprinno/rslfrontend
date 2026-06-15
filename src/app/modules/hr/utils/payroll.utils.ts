import { AppraisalRating } from '../../../core/models/hr.model';

/** Tanzania TRA PAYE bands (monthly TZS). */
export function calculatePAYE(grossMonthly: number): number {
  if (grossMonthly <= 270_000) {
    return 0;
  }
  if (grossMonthly <= 520_000) {
    return Math.round((grossMonthly - 270_000) * 0.08);
  }
  if (grossMonthly <= 760_000) {
    return Math.round(20_000 + (grossMonthly - 520_000) * 0.2);
  }
  if (grossMonthly <= 1_000_000) {
    return Math.round(68_000 + (grossMonthly - 760_000) * 0.25);
  }
  return Math.round(128_000 + (grossMonthly - 1_000_000) * 0.3);
}

/** NSSF — 10% employee, 10% employer on basic salary. */
export function calculateNSSF(basicSalary: number): { employee: number; employer: number } {
  const amount = Math.round(basicSalary * 0.1);
  return { employee: amount, employer: amount };
}

/** NHIF Tanzania tiered rates based on gross salary. */
export function calculateNHIF(grossSalary: number): number {
  if (grossSalary <= 100_000) return 3_000;
  if (grossSalary <= 200_000) return 5_000;
  if (grossSalary <= 400_000) return 8_000;
  if (grossSalary <= 600_000) return 10_000;
  if (grossSalary <= 800_000) return 15_000;
  if (grossSalary <= 1_000_000) return 18_000;
  if (grossSalary <= 1_500_000) return 25_000;
  if (grossSalary <= 2_000_000) return 30_000;
  if (grossSalary <= 2_500_000) return 35_000;
  return 40_000;
}

export function appraisalRating(score: number | null | undefined): AppraisalRating | null {
  if (score == null) return null;
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 60) return 'SATISFACTORY';
  return 'NEEDS_IMPROVEMENT';
}

export function calculateNetPay(
  gross: number,
  basic: number,
  payeApplicable = true,
  otherDeductions = 0,
): {
  nssfEmployee: number;
  nssfEmployer: number;
  paye: number;
  nhif: number;
  totalDeductions: number;
  net: number;
} {
  const nssf = calculateNSSF(basic);
  const paye = payeApplicable ? calculatePAYE(gross) : 0;
  const nhif = calculateNHIF(gross);
  const totalDeductions = nssf.employee + paye + nhif + otherDeductions;
  return {
    nssfEmployee: nssf.employee,
    nssfEmployer: nssf.employer,
    paye,
    nhif,
    totalDeductions,
    net: gross - totalDeductions,
  };
}
