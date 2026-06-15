export const LOCATION_COLORS = {
  main: '#1B3A6B',
  stein: '#F0A500',
  road: '#8B5CF6',
} as const;

export const VISITOR_PURPOSES = [
  { value: 'MEETING', label: 'Meeting', badge: 'badge-blue' },
  { value: 'DELIVERY', label: 'Delivery', badge: 'badge-green' },
  { value: 'CONTRACTOR', label: 'Contractor', badge: 'badge-orange' },
  { value: 'INSPECTION', label: 'Inspection', badge: 'badge-purple' },
  { value: 'OTHER', label: 'Other', badge: 'badge-gray' },
];

export const VISITOR_STATUSES: Record<string, string> = {
  PENDING: 'badge-yellow',
  SIGNED_IN: 'badge-green',
  SIGNED_OUT: 'badge-gray',
  OVERSTAYING: 'badge-red',
  DENIED: 'badge-red',
};

export const VEHICLE_TYPES: Record<string, string> = {
  COMPANY: 'badge-blue',
  EMPLOYEE: 'badge-green',
  VISITOR: 'badge-orange',
  SUPPLIER: 'badge-purple',
  CONTRACTOR: 'badge-brown',
  UNKNOWN: 'badge-red',
};

export const MOVEMENT_STATUSES: Record<string, string> = {
  IN_TRANSIT: 'badge-blue',
  ARRIVED: 'badge-green',
  OVERDUE: 'badge-red',
};

export const SECURITY_RANKS: Record<string, string> = {
  CHIEF: 'badge-red',
  SUPERVISOR: 'badge-orange',
  OFFICER: 'badge-blue',
  GUARD: 'badge-gray',
};

export const SEC_INCIDENT_TYPES = [
  'THEFT', 'TRESPASSING', 'VANDALISM', 'ASSAULT', 'UNAUTHORIZED_ACCESS',
  'SUSPICIOUS_ACTIVITY', 'PROPERTY_DAMAGE', 'FRAUD', 'ROAD_INCIDENT', 'OTHER',
];

export const SEC_INCIDENT_TYPE_COLORS: Record<string, string> = {
  THEFT: 'badge-red',
  TRESPASSING: 'badge-orange',
  VANDALISM: 'badge-purple',
  ASSAULT: 'badge-red',
  UNAUTHORIZED_ACCESS: 'badge-red',
  SUSPICIOUS_ACTIVITY: 'badge-yellow',
  PROPERTY_DAMAGE: 'badge-orange',
  FRAUD: 'badge-orange',
  ROAD_INCIDENT: 'badge-blue',
  OTHER: 'badge-gray',
};

export const ACCESS_LEVELS: Record<string, string> = {
  PUBLIC: 'badge-green',
  STAFF_ONLY: 'badge-blue',
  AUTHORIZED_ONLY: 'badge-orange',
  RESTRICTED: 'badge-red',
};

export function locationBadge(name: string): { icon: string; color: string; class: string } {
  if (name.includes('Stein')) {
    return { icon: '🏭', color: LOCATION_COLORS.stein, class: 'loc-stein' };
  }
  return { icon: '🏢', color: LOCATION_COLORS.main, class: 'loc-main' };
}
