import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import { ListParams, PaginatedData } from '../models/paginated.model';
import {
  ChecklistItem,
  HSEReport,
  IncidentFormData,
  IncidentReport,
  InspectionScheduleData,
  PPEIssueData,
  PPEIssuance,
  PPEItem,
  PPERequest,
  PPERequestFormData,
  PPEWorkflowStep,
  PPERoleRequirement,
  SafetyDashboard,
  SafetyIncident,
  SafetyInspection,
  SafetyTraining,
  TrainingAttendee,
  TrainingScheduleData,
  WorkPermit,
  WorkPermitFormData,
} from '../models/safety.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class SafetyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/safety`;

  getDashboard(): Observable<SafetyDashboard> {
    return this.http
      .get<ApiResponse<SafetyDashboard>>(`${this.baseUrl}/dashboard/`)
      .pipe(unwrapApi());
  }

  getSafetyScore(): Observable<{ safety_score: number }> {
    return this.http
      .get<ApiResponse<{ safety_score: number }>>(`${this.baseUrl}/dashboard/score/`)
      .pipe(unwrapApi());
  }

  getIncidents(params: ListParams = {}): Observable<PaginatedData<SafetyIncident>> {
    return this.http
      .get<ApiResponse<PaginatedData<SafetyIncident>>>(`${this.baseUrl}/incidents/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getIncident(id: number): Observable<SafetyIncident> {
    return this.http
      .get<ApiResponse<SafetyIncident>>(`${this.baseUrl}/incidents/${id}/`)
      .pipe(unwrapApi());
  }

  createIncident(data: IncidentFormData): Observable<SafetyIncident> {
    return this.http
      .post<ApiResponse<SafetyIncident>>(`${this.baseUrl}/incidents/`, data)
      .pipe(unwrapApi());
  }

  updateIncident(id: number, data: Partial<IncidentFormData>): Observable<SafetyIncident> {
    return this.http
      .patch<ApiResponse<SafetyIncident>>(`${this.baseUrl}/incidents/${id}/`, data)
      .pipe(unwrapApi());
  }

  submitIncident(id: number): Observable<SafetyIncident> {
    return this.http
      .post<ApiResponse<SafetyIncident>>(`${this.baseUrl}/incidents/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  startInvestigation(id: number): Observable<SafetyIncident> {
    return this.http
      .post<ApiResponse<SafetyIncident>>(
        `${this.baseUrl}/incidents/${id}/start-investigation/`,
        {},
      )
      .pipe(unwrapApi());
  }

  addCorrectiveAction(
    id: number,
    data: Partial<{ action: string; assigned_to: number; due_date: string; priority: string }>,
  ): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/incidents/${id}/corrective-actions/`, data)
      .pipe(unwrapApi());
  }

  updateCorrectiveAction(
    incidentId: number,
    actionId: number,
    data: Partial<{ status: string }>,
  ): Observable<unknown> {
    return this.http
      .patch<ApiResponse<unknown>>(
        `${this.baseUrl}/incidents/${incidentId}/corrective-actions/${actionId}/`,
        data,
      )
      .pipe(unwrapApi());
  }

  closeIncident(
    id: number,
    data: { lessons_learned: string; prevention_measures?: string },
  ): Observable<SafetyIncident> {
    return this.http
      .post<ApiResponse<SafetyIncident>>(`${this.baseUrl}/incidents/${id}/close/`, data)
      .pipe(unwrapApi());
  }

  getInspections(params: ListParams = {}): Observable<PaginatedData<SafetyInspection>> {
    return this.http
      .get<ApiResponse<PaginatedData<SafetyInspection>>>(`${this.baseUrl}/inspections/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getInspection(id: number): Observable<SafetyInspection> {
    return this.http
      .get<ApiResponse<SafetyInspection>>(`${this.baseUrl}/inspections/${id}/`)
      .pipe(unwrapApi());
  }

  scheduleInspection(data: InspectionScheduleData): Observable<SafetyInspection> {
    return this.http
      .post<ApiResponse<SafetyInspection>>(`${this.baseUrl}/inspections/`, data)
      .pipe(unwrapApi());
  }

  startInspection(id: number): Observable<SafetyInspection> {
    return this.http
      .post<ApiResponse<SafetyInspection>>(`${this.baseUrl}/inspections/${id}/start/`, {})
      .pipe(unwrapApi());
  }

  updateChecklistItem(
    inspectionId: number,
    itemId: number,
    data: Partial<ChecklistItem>,
  ): Observable<ChecklistItem> {
    return this.http
      .patch<ApiResponse<ChecklistItem>>(
        `${this.baseUrl}/inspections/${inspectionId}/checklist-items/${itemId}/`,
        data,
      )
      .pipe(unwrapApi());
  }

  completeInspection(id: number, notes?: string): Observable<SafetyInspection> {
    return this.http
      .post<ApiResponse<SafetyInspection>>(`${this.baseUrl}/inspections/${id}/complete/`, {
        notes,
      })
      .pipe(unwrapApi());
  }

  getPPEItems(): Observable<PPEItem[]> {
    return this.http
      .get<ApiResponse<PaginatedData<PPEItem>>>(`${this.baseUrl}/ppe-items/`, {
        params: buildHttpParams({ page_size: 100 }),
      })
      .pipe(unwrapApi(), map((d) => d.results));
  }

  getPPERequests(params: ListParams = {}): Observable<PaginatedData<PPERequest>> {
    return this.http
      .get<ApiResponse<PaginatedData<PPERequest>>>(`${this.baseUrl}/ppe-requests/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getPPERequest(id: number): Observable<PPERequest> {
    return this.http
      .get<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/${id}/`)
      .pipe(unwrapApi());
  }

  getPPEWorkflowSteps(): Observable<PPEWorkflowStep[]> {
    return this.http
      .get<ApiResponse<{ steps: PPEWorkflowStep[] }>>(`${this.baseUrl}/ppe-requests/workflow/`)
      .pipe(unwrapApi(), map((d) => d.steps));
  }

  createPPERequest(data: PPERequestFormData): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/`, data)
      .pipe(unwrapApi());
  }

  submitPPERequest(id: number): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  storeReviewPPERequest(
    id: number,
    data: { stock_available: boolean; notes?: string },
  ): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/${id}/store-review/`, data)
      .pipe(unwrapApi());
  }

  markPPEStockReceived(
    id: number,
    data?: { quantity_received?: number; notes?: string },
  ): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(
        `${this.baseUrl}/ppe-requests/${id}/mark-stock-received/`,
        data ?? {},
      )
      .pipe(unwrapApi());
  }

  confirmPPEReady(id: number): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/${id}/confirm-ready/`, {})
      .pipe(unwrapApi());
  }

  issuePPERequest(
    id: number,
    data?: { condition_issued?: string; notes?: string },
  ): Observable<{ request: PPERequest; issuance: PPEIssuance }> {
    return this.http
      .post<ApiResponse<{ request: PPERequest; issuance: PPEIssuance }>>(
        `${this.baseUrl}/ppe-requests/${id}/issue/`,
        data ?? {},
      )
      .pipe(unwrapApi());
  }

  cancelPPERequest(id: number, reason?: string): Observable<PPERequest> {
    return this.http
      .post<ApiResponse<PPERequest>>(`${this.baseUrl}/ppe-requests/${id}/cancel/`, {
        reason,
      })
      .pipe(unwrapApi());
  }

  getPPEIssuances(params: ListParams = {}): Observable<PaginatedData<PPEIssuance>> {
    return this.http
      .get<ApiResponse<PaginatedData<PPEIssuance>>>(`${this.baseUrl}/ppe-issuances/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getPPERequirements(): Observable<PPERoleRequirement[]> {
    return this.http
      .get<ApiResponse<PaginatedData<PPERoleRequirement>>>(
        `${this.baseUrl}/ppe-requirements/`,
        { params: buildHttpParams({ page_size: 100 }) },
      )
      .pipe(unwrapApi(), map((d) => d.results));
  }

  issuePPE(data: PPEIssueData): Observable<PPEIssuance> {
    return this.http
      .post<ApiResponse<PPEIssuance>>(`${this.baseUrl}/ppe-issuances/`, data)
      .pipe(unwrapApi());
  }

  returnPPE(
    id: number,
    data: { condition_returned: string; actual_return?: string; notes?: string },
  ): Observable<PPEIssuance> {
    return this.http
      .post<ApiResponse<PPEIssuance>>(`${this.baseUrl}/ppe-issuances/${id}/return_ppe/`, data)
      .pipe(unwrapApi());
  }

  getWorkPermits(params: ListParams = {}): Observable<PaginatedData<WorkPermit>> {
    return this.http
      .get<ApiResponse<PaginatedData<WorkPermit>>>(`${this.baseUrl}/permits/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getWorkPermit(id: number): Observable<WorkPermit> {
    return this.http
      .get<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/`)
      .pipe(unwrapApi());
  }

  createWorkPermit(data: WorkPermitFormData): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/`, data)
      .pipe(unwrapApi());
  }

  updateWorkPermit(id: number, data: Partial<WorkPermitFormData>): Observable<WorkPermit> {
    return this.http
      .patch<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/`, data)
      .pipe(unwrapApi());
  }

  submitPermit(id: number): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  approvePermit(id: number): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectPermit(id: number, reason: string): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/reject/`, { reason })
      .pipe(unwrapApi());
  }

  extendPermit(id: number, valid_until: string): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/extend/`, { valid_until })
      .pipe(unwrapApi());
  }

  cancelPermit(id: number): Observable<WorkPermit> {
    return this.http
      .post<ApiResponse<WorkPermit>>(`${this.baseUrl}/permits/${id}/cancel/`, {})
      .pipe(unwrapApi());
  }

  getTrainings(params: ListParams = {}): Observable<PaginatedData<SafetyTraining>> {
    return this.http
      .get<ApiResponse<PaginatedData<SafetyTraining>>>(`${this.baseUrl}/training/`, {
        params: buildHttpParams({ page_size: 15, ...params }),
      })
      .pipe(unwrapApi());
  }

  getTraining(id: number): Observable<SafetyTraining> {
    return this.http
      .get<ApiResponse<SafetyTraining>>(`${this.baseUrl}/training/${id}/`)
      .pipe(unwrapApi());
  }

  scheduleTraining(data: TrainingScheduleData): Observable<SafetyTraining> {
    return this.http
      .post<ApiResponse<SafetyTraining>>(`${this.baseUrl}/training/`, data)
      .pipe(unwrapApi());
  }

  markAttendance(
    id: number,
    attendees: Partial<TrainingAttendee>[],
  ): Observable<TrainingAttendee[]> {
    return this.http
      .post<ApiResponse<TrainingAttendee[]>>(
        `${this.baseUrl}/training/${id}/mark-attendance/`,
        { attendees },
      )
      .pipe(unwrapApi());
  }

  issueCertificate(
    id: number,
    employeeId: number,
    certificate_expiry?: string,
  ): Observable<TrainingAttendee> {
    return this.http
      .post<ApiResponse<TrainingAttendee>>(
        `${this.baseUrl}/training/${id}/issue-certificate/`,
        { employee_id: employeeId, certificate_expiry },
      )
      .pipe(unwrapApi());
  }

  getIncidentReport(dateFrom: string, dateTo: string): Observable<IncidentReport> {
    return this.http
      .get<ApiResponse<IncidentReport>>(`${this.baseUrl}/reports/incidents/`, {
        params: buildHttpParams({ date_from: dateFrom, date_to: dateTo }),
      })
      .pipe(unwrapApi());
  }

  getInspectionReport(): Observable<unknown> {
    return this.http
      .get<ApiResponse<unknown>>(`${this.baseUrl}/reports/inspections/`)
      .pipe(unwrapApi());
  }

  getMonthlyHSEReport(month: number, year: number): Observable<HSEReport> {
    return this.http
      .get<ApiResponse<HSEReport>>(`${this.baseUrl}/reports/monthly-hse/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }
}
