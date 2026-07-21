export type InternalRouteType = 'WAREHOUSE_TRANSFER' | 'PO_PICKUP' | 'CUSTOM';

export type InternalRouteStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface InternalRoutePoLink {
  id: number;
  purchase_order: number;
  po_number: string;
  notes: string;
  created_at: string;
}

export interface InternalRoute {
  id: number;
  route_number: string;
  company: number;
  company_code: string;
  company_name: string;
  company_badge_color: string;
  route_type: InternalRouteType;
  origin: number | null;
  origin_name: string | null;
  origin_label: string;
  destination: number | null;
  destination_name: string | null;
  destination_label: string;
  driver: number;
  driver_name: string;
  vehicle: number;
  vehicle_registration: string;
  status: InternalRouteStatus;
  scheduled_date: string;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  notes: string;
  created_by: number;
  created_by_name: string;
  po_count: number;
  po_references: string[];
  purchase_order_links: InternalRoutePoLink[];
  created_at: string;
  updated_at: string;
}

export interface InternalRouteBlockingRoute {
  id: number;
  route_number: string;
  company_code: string;
  company_name: string;
}

export interface DriverInternalRoute extends InternalRoute {
  can_start: boolean;
  can_complete: boolean;
  blocking_route: InternalRouteBlockingRoute | null;
}

export interface InternalRouteWarning {
  type: 'driver' | 'vehicle';
  route_id: number;
  route_number: string;
  status: InternalRouteStatus;
  company: string;
  company_name: string;
  message: string;
}

export interface InternalRouteMutationResult<T = InternalRoute> {
  data: T;
  message: string;
  warning?: string | null;
  warnings?: InternalRouteWarning[];
}

export interface InternalRouteCreateData {
  company: number;
  route_type: InternalRouteType;
  origin?: number | null;
  origin_label?: string;
  destination?: number | null;
  destination_label?: string;
  driver: number;
  vehicle: number;
  scheduled_date: string;
  scheduled_time?: string | null;
  notes?: string;
  po_ids?: number[];
}

export interface InternalRouteUpdateData {
  driver?: number;
  vehicle?: number;
  scheduled_date?: string;
  scheduled_time?: string | null;
  notes?: string;
  origin_label?: string;
  destination?: number | null;
  destination_label?: string;
}

export interface GrnDestinationHint {
  po_id: number;
  po_number: string | null;
  grn_number: string | null;
  warehouse_id: number | null;
  warehouse_name: string | null;
  found: boolean;
}
