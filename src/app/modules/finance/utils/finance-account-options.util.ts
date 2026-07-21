import { Account } from '../../../core/models/finance.model';
import {
  SelectCategoryGroup,
  SelectOption,
  SelectSubcategoryGroup,
} from '../../../shared/components/searchable-select/searchable-select.component';
import { ACCOUNT_CATEGORIES } from '../constants/finance.constants';

/** Separator between account name and code in dropdown labels. */
export const ACCOUNT_NAME_CODE_SEPARATOR = ' — ';

const SUBCATEGORY_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK: 'Bank',
  CURRENT_ASSETS: 'Current Assets',
  INVENTORY: 'Inventory',
  FIXED_ASSETS: 'Fixed Assets',
  TAX: 'Tax',
  CURRENT: 'Current Liabilities',
  LONG_TERM: 'Long Term Liabilities',
  EQUITY: 'Equity',
  SALES: 'Sales',
  OTHER_INCOME: 'Other Income',
  COS: 'Cost of Sales',
  PERSONNEL: 'Personnel',
  ADMINISTRATION: 'Administration',
  TRANSPORT: 'Transport',
  PROFESSIONAL: 'Professional',
  FINANCE: 'Finance',
  CONTROL: 'Control',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

export function formatAccountCategoryLabel(category?: string | null): string {
  if (!category) return '';
  const match = ACCOUNT_CATEGORIES.find(
    (c) => c.value === category || c.label.toLowerCase() === category.toLowerCase(),
  );
  if (match) return match.label;
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAccountSubcategoryLabel(subcategory?: string | null): string {
  if (!subcategory) return '';
  return (
    SUBCATEGORY_LABELS[subcategory] ??
    subcategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function resolveCategory(account: Account): string {
  return (
    account.category_display ||
    formatAccountCategoryLabel(account.category) ||
    ACCOUNT_TYPE_LABELS[account.account_type] ||
    account.account_type
  );
}

function resolveSubcategory(account: Account): string {
  return formatAccountSubcategoryLabel(account.subcategory);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[\s_]+/g, '');
}

function shouldShowSubcategory(category: string, subcategory: string): boolean {
  if (!subcategory) return false;
  if (normalizeKey(category) === normalizeKey(subcategory)) return false;
  if (subcategory.toLowerCase() === 'general') return false;
  if (subcategory.toLowerCase() === 'header') return false;
  return true;
}

/** Postable GL accounts only — excludes section headers and control/system rows. */
export function isSelectableChartAccount(account: Account): boolean {
  if (!account.is_active) return false;
  if (account.allow_manual_entry === false) return false;
  const sub = (account.subcategory ?? '').toUpperCase();
  if (sub === 'HEADER') return false;
  return true;
}

function accountOptionLabel(account: Account): string {
  return `${account.account_name}${ACCOUNT_NAME_CODE_SEPARATOR}${account.account_code}`;
}

function toSelectOption(account: Account): SelectOption {
  return {
    value: account.id,
    label: accountOptionLabel(account),
    name: account.account_name,
    code: account.account_code,
  };
}

function categorySortIndex(category: string): number {
  const idx = ACCOUNT_CATEGORIES.findIndex(
    (c) => c.label.toLowerCase() === category.toLowerCase() || c.value === category,
  );
  return idx >= 0 ? idx : ACCOUNT_CATEGORIES.length;
}

/** Flat list (legacy) — name — code only. */
export function formatChartAccountOption(account: Account): SelectOption {
  return toSelectOption(account);
}

export function buildChartOfAccountSelectOptions(accounts: Account[]): SelectOption[] {
  return accounts
    .filter(isSelectableChartAccount)
    .sort((a, b) => a.account_code.localeCompare(b.account_code, undefined, { numeric: true }))
    .map(formatChartAccountOption);
}

/**
 * Nested chart-of-accounts groups: category shown once, optional subcategory, then accounts.
 */
export function buildChartOfAccountSelectGroups(accounts: Account[]): SelectCategoryGroup[] {
  const categoryMap = new Map<string, Map<string, SelectOption[]>>();

  for (const account of accounts.filter(isSelectableChartAccount)) {
    const category = resolveCategory(account);
    const subcategory = resolveSubcategory(account);
    const subKey = shouldShowSubcategory(category, subcategory) ? subcategory : '__root__';

    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map());
    }

    const subMap = categoryMap.get(category)!;
    if (!subMap.has(subKey)) {
      subMap.set(subKey, []);
    }

    subMap.get(subKey)!.push(toSelectOption(account));
  }

  return Array.from(categoryMap.entries())
    .map(([category, subMap]) => {
      const subcategories: SelectSubcategoryGroup[] = Array.from(subMap.entries())
        .map(([subKey, options]) => ({
          id: `${category}::${subKey}`,
          label: subKey === '__root__' ? null : subKey,
          options: options.sort((a, b) =>
            String(a.code).localeCompare(String(b.code), undefined, { numeric: true }),
          ),
        }))
        .sort((a, b) => {
          if (!a.label) return -1;
          if (!b.label) return 1;
          return a.label.localeCompare(b.label);
        });

      return {
        id: category,
        label: category,
        subcategories,
      };
    })
    .sort((a, b) => categorySortIndex(a.label) - categorySortIndex(b.label));
}

/** @deprecated Use buildChartOfAccountSelectGroups */
export const buildPayableAccountSelectOptions = buildChartOfAccountSelectOptions;
