export const TRIP_WORKFLOW_STEPS = [
  'Assigned',
  'Started',
  'In Transit',
  'Arrived',
  'Delivered',
  'Returning',
  'Return Confirmed',
] as const;

export const TRIP_STATUS_INDEX: Record<string, number> = {
  ASSIGNED: 0,
  STARTED: 1,
  IN_TRANSIT: 2,
  ARRIVED: 3,
  DELIVERED: 4,
  RETURNING: 5,
  RETURN_CONFIRMED: 6,
};

export const VEHICLE_CONDITIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'MINOR_ISSUE', label: 'Minor Issue' },
  { value: 'MAINTENANCE_REQUIRED', label: 'Maintenance Required' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
] as const;

export const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ON_DELIVERY: 'On Delivery',
  RETURNING: 'Returning',
  OFF_DUTY: 'Off Duty',
};
