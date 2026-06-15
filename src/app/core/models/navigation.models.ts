import { PermissionAction } from './auth.models';

export type NavSection = 'main' | 'modules' | 'system';

export interface NavChildItem {
  labelKey: string;
  route: string;
  module: string;
  action?: PermissionAction;
  badgeKey?: 'messages' | 'email';
}

export interface NavItem {
  labelKey: string;
  route: string;
  icon: NavIcon;
  module: string | null;
  action?: PermissionAction;
  badgeKey?: 'messages' | 'email';
  section: NavSection;
  children?: NavChildItem[];
}

export type NavIcon =
  | 'dashboard'
  | 'inventory'
  | 'procurement'
  | 'sales'
  | 'logistics'
  | 'driver'
  | 'production'
  | 'finance'
  | 'hr'
  | 'safety'
  | 'messages'
  | 'email'
  | 'settings';

export type { AppLanguage, AppTheme, CurrencyCode } from './preferences.models';
