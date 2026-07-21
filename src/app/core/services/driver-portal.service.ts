import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  ConfirmDeliveryData,
  ConfirmReturnData,
  DriverDashboard,
  DriverProfile,
  DriverTrip,
  StartDeliveryData,
  VehicleConditionData,
} from '../models/driver-portal.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';
import { DriverInternalRoute } from '../models/internal-route.model';

@Injectable({ providedIn: 'root' })
export class DriverPortalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/logistics/driver-portal`;

  getProfile(): Observable<DriverProfile> {
    return this.http.get<ApiResponse<DriverProfile>>(`${this.baseUrl}/profile/`).pipe(unwrapApi());
  }

  getDashboard(): Observable<DriverDashboard> {
    return this.http.get<ApiResponse<DriverDashboard>>(`${this.baseUrl}/dashboard/`).pipe(unwrapApi());
  }

  getDeliveries(params: { status?: string; search?: string } = {}): Observable<DriverTrip[]> {
    return this.http
      .get<ApiResponse<DriverTrip[]>>(`${this.baseUrl}/deliveries/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  getTrip(id: number): Observable<DriverTrip> {
    return this.http.get<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/`).pipe(unwrapApi());
  }

  startTrip(id: number, data: StartDeliveryData): Observable<DriverTrip> {
    return this.http
      .post<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/start/`, data)
      .pipe(unwrapApi());
  }

  confirmArrival(id: number, notes = ''): Observable<DriverTrip> {
    return this.http
      .post<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/arrive/`, { notes })
      .pipe(unwrapApi());
  }

  confirmDelivery(
    id: number,
    data: ConfirmDeliveryData,
    proofDocument: File,
  ): Observable<DriverTrip> {
    const form = new FormData();
    form.append('receiver_name', data.receiver_name);
    form.append('receiver_position', data.receiver_position ?? '');
    form.append('receiver_phone', data.receiver_phone ?? '');
    form.append('receiver_company', data.receiver_company ?? '');
    form.append('quantity_delivered', String(data.quantity_delivered));
    form.append('delivery_notes', data.delivery_notes ?? '');
    form.append('signature_data', data.signature_data ?? '');
    form.append('proof_document', proofDocument, proofDocument.name);
    return this.http
      .post<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/confirm-delivery/`, form)
      .pipe(unwrapApi());
  }

  startReturn(id: number, vehicleCondition = 'GOOD'): Observable<DriverTrip> {
    return this.http
      .post<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/start-return/`, {
        vehicle_condition: vehicleCondition,
      })
      .pipe(unwrapApi());
  }

  confirmReturn(id: number, data: ConfirmReturnData): Observable<DriverTrip> {
    return this.http
      .post<ApiResponse<DriverTrip>>(`${this.baseUrl}/trips/${id}/confirm-return/`, data)
      .pipe(unwrapApi());
  }

  reportVehicleCondition(data: VehicleConditionData): Observable<{ id: number; condition: string }> {
    return this.http
      .post<ApiResponse<{ id: number; condition: string }>>(
        `${this.baseUrl}/vehicle-condition/`,
        data,
      )
      .pipe(unwrapApi());
  }

  getHistory(): Observable<DriverTrip[]> {
    return this.http.get<ApiResponse<DriverTrip[]>>(`${this.baseUrl}/history/`).pipe(unwrapApi());
  }

  getReports(): Observable<{ performance: DriverProfile['performance']; vehicle: unknown }> {
    return this.http
      .get<ApiResponse<{ performance: DriverProfile['performance']; vehicle: unknown }>>(
        `${this.baseUrl}/reports/`,
      )
      .pipe(unwrapApi());
  }

  saveDraft(key: string, data: unknown): Observable<{ saved: boolean; key: string }> {
    return this.http
      .post<ApiResponse<{ saved: boolean; key: string }>>(`${this.baseUrl}/draft/`, {
        key,
        data,
      })
      .pipe(unwrapApi());
  }

  loadDraft(key: string): Observable<{ key: string; data: unknown }> {
    return this.http
      .get<ApiResponse<{ key: string; data: unknown }>>(`${this.baseUrl}/draft/${key}/`)
      .pipe(unwrapApi());
  }

  getInternalRoutes(): Observable<DriverInternalRoute[]> {
    return this.http
      .get<ApiResponse<DriverInternalRoute[]>>(`${environment.apiUrl}/logistics/my-internal-routes/`)
      .pipe(unwrapApi());
  }

  startInternalRoute(id: number): Observable<DriverInternalRoute> {
    return this.http
      .post<ApiResponse<DriverInternalRoute>>(
        `${environment.apiUrl}/logistics/internal-routes/${id}/start/`,
        {},
      )
      .pipe(unwrapApi());
  }

  completeInternalRoute(id: number): Observable<DriverInternalRoute> {
    return this.http
      .post<ApiResponse<DriverInternalRoute>>(
        `${environment.apiUrl}/logistics/internal-routes/${id}/complete/`,
        {},
      )
      .pipe(unwrapApi());
  }
}
