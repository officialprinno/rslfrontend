import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { ListParams, PaginatedData } from '../models/paginated.model';
import {
  AccessLog,
  AccessZone,
  InterLocationMovement,
  SecurityDashboard,
  SecurityIncident,
  SecurityLocation,
  SecurityOfficer,
  SecurityShift,
  VehicleLog,
  Visitor,
  VisitorFormData,
} from '../models/security.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/safety/security`;

  getLocations(): Observable<SecurityLocation[]> {
    return this.http
      .get<ApiResponse<PaginatedData<SecurityLocation> | SecurityLocation[]>>(`${this.base}/locations/`)
      .pipe(
        unwrapApi(),
        map((d) => (Array.isArray(d) ? d : d.results)),
      );
  }

  getSecurityDashboard(locationId?: number): Observable<SecurityDashboard> {
    const params = locationId ? buildHttpParams({ location: locationId }) : undefined;
    return this.http
      .get<ApiResponse<SecurityDashboard>>(`${this.base}/dashboard/`, { params })
      .pipe(unwrapApi());
  }

  getVisitors(params: ListParams = {}): Observable<PaginatedData<Visitor>> {
    return this.http
      .get<ApiResponse<PaginatedData<Visitor>>>(`${this.base}/visitors/`, {
        params: buildHttpParams({ page_size: 15, on_site: 'true', ...params }),
      })
      .pipe(unwrapApi());
  }

  registerVisitor(data: VisitorFormData): Observable<Visitor> {
    return this.http
      .post<ApiResponse<Visitor>>(`${this.base}/visitors/`, data)
      .pipe(unwrapApi());
  }

  signInVisitor(id: number): Observable<Visitor> {
    return this.http
      .post<ApiResponse<Visitor>>(`${this.base}/visitors/${id}/sign-in/`, {})
      .pipe(unwrapApi());
  }

  signOutVisitor(id: number, items?: unknown[]): Observable<Visitor> {
    return this.http
      .post<ApiResponse<Visitor>>(`${this.base}/visitors/${id}/sign-out/`, {
        items_brought: items,
      })
      .pipe(unwrapApi());
  }

  denyVisitor(id: number, reason: string): Observable<Visitor> {
    return this.http
      .post<ApiResponse<Visitor>>(`${this.base}/visitors/${id}/deny/`, { reason })
      .pipe(unwrapApi());
  }

  getVehicleLogs(params: ListParams = {}): Observable<PaginatedData<VehicleLog>> {
    return this.http
      .get<ApiResponse<PaginatedData<VehicleLog>>>(`${this.base}/vehicles/`, {
        params: buildHttpParams({ page_size: 15, on_premises: 'true', ...params }),
      })
      .pipe(unwrapApi());
  }

  logVehicleEntry(data: Partial<VehicleLog>): Observable<VehicleLog> {
    return this.http
      .post<ApiResponse<VehicleLog>>(`${this.base}/vehicles/`, data)
      .pipe(unwrapApi());
  }

  logVehicleExit(id: number): Observable<VehicleLog> {
    return this.http
      .post<ApiResponse<VehicleLog>>(`${this.base}/vehicles/${id}/log-exit/`, {})
      .pipe(unwrapApi());
  }

  getMovements(params: ListParams = {}): Observable<PaginatedData<InterLocationMovement>> {
    return this.http
      .get<ApiResponse<PaginatedData<InterLocationMovement>>>(`${this.base}/movements/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  logMovement(data: Record<string, unknown>): Observable<InterLocationMovement> {
    return this.http
      .post<ApiResponse<InterLocationMovement>>(`${this.base}/movements/`, data)
      .pipe(unwrapApi());
  }

  markArrived(id: number): Observable<InterLocationMovement> {
    return this.http
      .post<ApiResponse<InterLocationMovement>>(`${this.base}/movements/${id}/mark-arrived/`, {})
      .pipe(unwrapApi());
  }

  getInTransit(): Observable<InterLocationMovement[]> {
    return this.http
      .get<ApiResponse<InterLocationMovement[]>>(`${this.base}/movements/in-transit/`)
      .pipe(unwrapApi());
  }

  getPersonnel(params: ListParams = {}): Observable<PaginatedData<SecurityOfficer>> {
    return this.http
      .get<ApiResponse<PaginatedData<SecurityOfficer>>>(`${this.base}/personnel/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  addOfficer(data: Partial<SecurityOfficer>): Observable<SecurityOfficer> {
    return this.http
      .post<ApiResponse<SecurityOfficer>>(`${this.base}/personnel/`, data)
      .pipe(unwrapApi());
  }

  getShifts(params: ListParams = {}): Observable<PaginatedData<SecurityShift>> {
    return this.http
      .get<ApiResponse<PaginatedData<SecurityShift>>>(`${this.base}/shifts/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createShift(data: Partial<SecurityShift>): Observable<SecurityShift> {
    return this.http
      .post<ApiResponse<SecurityShift>>(`${this.base}/shifts/`, data)
      .pipe(unwrapApi());
  }

  getZones(locationId?: number): Observable<AccessZone[]> {
    const params = locationId ? buildHttpParams({ location: locationId }) : undefined;
    return this.http
      .get<ApiResponse<PaginatedData<AccessZone> | AccessZone[]>>(`${this.base}/zones/`, { params })
      .pipe(
        unwrapApi(),
        map((d) => (Array.isArray(d) ? d : d.results)),
      );
  }

  getAccessLog(params: ListParams = {}): Observable<PaginatedData<AccessLog>> {
    return this.http
      .get<ApiResponse<PaginatedData<AccessLog>>>(`${this.base}/access-logs/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getAccessViolations(): Observable<AccessLog[]> {
    return this.http
      .get<ApiResponse<AccessLog[]>>(`${this.base}/access-logs/violations/`)
      .pipe(unwrapApi());
  }

  getIncidents(params: ListParams = {}): Observable<PaginatedData<SecurityIncident>> {
    return this.http
      .get<ApiResponse<PaginatedData<SecurityIncident>>>(`${this.base}/incidents/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  reportIncident(data: Partial<SecurityIncident>): Observable<SecurityIncident> {
    return this.http
      .post<ApiResponse<SecurityIncident>>(`${this.base}/incidents/`, data)
      .pipe(unwrapApi());
  }

  investigateIncident(id: number, notes: string): Observable<SecurityIncident> {
    return this.http
      .post<ApiResponse<SecurityIncident>>(`${this.base}/incidents/${id}/investigate/`, {
        investigation_notes: notes,
      })
      .pipe(unwrapApi());
  }

  closeIncident(id: number, notes: string): Observable<SecurityIncident> {
    return this.http
      .post<ApiResponse<SecurityIncident>>(`${this.base}/incidents/${id}/close/`, {
        investigation_notes: notes,
      })
      .pipe(unwrapApi());
  }
}
