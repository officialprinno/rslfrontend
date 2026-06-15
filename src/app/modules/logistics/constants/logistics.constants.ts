import { VehicleType, VehicleStatus, LicenseClass, MaintenanceType } from '../../../core/models/logistics.model';

export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'TRUCK', label: 'Truck' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'VAN', label: 'Van' },
  { value: 'TANKER', label: 'Tanker' },
  { value: 'OTHER', label: 'Other' },
];

export const VEHICLE_STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_TRIP', label: 'On Trip' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
];

export const VEHICLE_MAKES = ['Toyota', 'Isuzu', 'Mercedes', 'Hino', 'Scania', 'Mitsubishi', 'Nissan', 'Ford'];

export const LICENSE_CLASSES: { value: LicenseClass; label: string }[] = [
  { value: 'B', label: 'Class B' },
  { value: 'C', label: 'Class C' },
  { value: 'CE', label: 'Class CE' },
  { value: 'D', label: 'Class D' },
];

export const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'INSPECTION', label: 'Inspection' },
];

export const WORKFLOW_STEPS = {
  delivery: ['SCHEDULED', 'IN_TRANSIT', 'DELIVERED'],
};

export const COMPANY_DETAILS = {
  name: 'ROCK SOLUTIONS LIMITED',
  address: 'Plot 252 Block L, Misungwi, Mwanza',
};

export const VEHICLE_STATUS_BORDER: Record<VehicleStatus, string> = {
  AVAILABLE: 'border-l-emerald-500',
  ON_TRIP: 'border-l-blue-500',
  IN_USE: 'border-l-blue-500',
  RETURNING: 'border-l-yellow-500',
  MAINTENANCE: 'border-l-amber-500',
  BREAKDOWN: 'border-l-red-500',
  OUT_OF_SERVICE: 'border-l-red-500',
};
