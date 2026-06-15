import { PermissionAction } from '../models/auth.models';

/** Self-service modules available to every employee. */
export const SELF_SERVICE_MODULES = new Set(['messaging', 'email', 'settings']);

/** Business modules that map to app route prefixes. */
export const BUSINESS_MODULES = [
  'inventory',
  'procurement',
  'sales',
  'logistics',
  'driver_portal',
  'production',
  'finance',
  'hr',
  'safety',
  'users',
] as const;

export type BusinessModule = (typeof BUSINESS_MODULES)[number];

/** Default landing route when a user has access to only one business module. */
export const MODULE_HOME_ROUTES: Record<string, string> = {
  inventory: '/inventory/dashboard',
  procurement: '/procurement/dashboard',
  sales: '/sales/dashboard',
  logistics: '/logistics/dashboard',
  driver_portal: '/driver-portal/dashboard',
  production: '/production/dashboard',
  finance: '/finance/dashboard',
  hr: '/hr/dashboard',
  safety: '/safety/dashboard',
  users: '/settings/users',
};

/** Top-level app routes and the module permission required to enter. */
export const APP_ROUTE_ACCESS: Record<
  string,
  { module: string; action: PermissionAction } | 'dashboard'
> = {
  dashboard: 'dashboard',
  inventory: { module: 'inventory', action: 'read' },
  procurement: { module: 'procurement', action: 'read' },
  sales: { module: 'sales', action: 'read' },
  logistics: { module: 'logistics', action: 'read' },
  'driver-portal': { module: 'driver_portal', action: 'read' },
  production: { module: 'production', action: 'read' },
  finance: { module: 'finance', action: 'read' },
  hr: { module: 'hr', action: 'read' },
  safety: { module: 'safety', action: 'read' },
  messaging: { module: 'messaging', action: 'read' },
  email: { module: 'email', action: 'read' },
  settings: { module: 'settings', action: 'read' },
};
