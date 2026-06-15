import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environments';
import { ApiResponse } from '../models/auth.models';
import {
  AllowanceConfig,
  AllowanceFormData,
  Appraisal,
  AppraisalCompleteData,
  AppraisalScheduleData,
  Attendance,
  AttendanceBulkRecord,
  AttendanceFormData,
  AttendanceVerification,
  CompanyProfile,
  DisciplinaryFormData,
  DisciplinaryRecord,
  Employee,
  EmployeeFormData,
  EmployeeLeaveBalances,
  EmployeeListItem,
  LeaveBalance,
  HrDashboard,
  LeaveCalendarEntry,
  LeaveRequest,
  LeaveRequestFormData,
  LeaveType,
  LeaveTypeFormData,
  MonthlyAttendanceSummary,
  Payroll,
  PayrollGenerateData,
  PayrollItem,
  PayrollItemUpdateData,
  Payslip,
  PublicHoliday,
  PublicHolidayFormData,
  WorkingHoursConfig,
} from '../models/hr.model';
import { ListParams, PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/hr`;

  getDashboard(): Observable<HrDashboard> {
    return this.http
      .get<ApiResponse<HrDashboard>>(`${this.baseUrl}/dashboard/`)
      .pipe(unwrapApi());
  }

  getEmployees(params: ListParams = {}): Observable<PaginatedData<EmployeeListItem>> {
    return this.http
      .get<ApiResponse<PaginatedData<EmployeeListItem>>>(`${this.baseUrl}/employees/`, {
        params: buildHttpParams({ page_size: 20, ...params }),
      })
      .pipe(unwrapApi());
  }

  getEmployee(id: number): Observable<Employee> {
    return this.http
      .get<ApiResponse<Employee>>(`${this.baseUrl}/employees/${id}/`)
      .pipe(unwrapApi());
  }

  createEmployee(data: EmployeeFormData): Observable<Employee> {
    return this.http
      .post<ApiResponse<Employee>>(`${this.baseUrl}/employees/`, data)
      .pipe(unwrapApi());
  }

  updateEmployee(id: number, data: Partial<EmployeeFormData>): Observable<Employee> {
    return this.http
      .patch<ApiResponse<Employee>>(`${this.baseUrl}/employees/${id}/`, data)
      .pipe(unwrapApi());
  }

  deactivateEmployee(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/employees/${id}/deactivate/`, {})
      .pipe(unwrapApi());
  }

  activateEmployee(id: number): Observable<null> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/employees/${id}/activate/`, {})
      .pipe(unwrapApi());
  }

  getEmployeePayslips(id: number): Observable<Payslip[]> {
    return this.http
      .get<ApiResponse<Payslip[]>>(`${this.baseUrl}/employees/${id}/payslips/`)
      .pipe(unwrapApi());
  }

  getLeaveTypes(params: ListParams = {}): Observable<PaginatedData<LeaveType>> {
    return this.http
      .get<ApiResponse<PaginatedData<LeaveType>>>(`${this.baseUrl}/leave-types/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createLeaveType(data: LeaveTypeFormData): Observable<LeaveType> {
    return this.http
      .post<ApiResponse<LeaveType>>(`${this.baseUrl}/leave-types/`, data)
      .pipe(unwrapApi());
  }

  updateLeaveType(id: number, data: Partial<LeaveTypeFormData>): Observable<LeaveType> {
    return this.http
      .patch<ApiResponse<LeaveType>>(`${this.baseUrl}/leave-types/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteLeaveType(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/leave-types/${id}/`)
      .pipe(unwrapApi());
  }

  getAllowances(params: ListParams = {}): Observable<PaginatedData<AllowanceConfig>> {
    return this.http
      .get<ApiResponse<PaginatedData<AllowanceConfig>>>(`${this.baseUrl}/allowances/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createAllowance(data: AllowanceFormData): Observable<AllowanceConfig> {
    return this.http
      .post<ApiResponse<AllowanceConfig>>(`${this.baseUrl}/allowances/`, data)
      .pipe(unwrapApi());
  }

  updateAllowance(id: number, data: Partial<AllowanceFormData>): Observable<AllowanceConfig> {
    return this.http
      .patch<ApiResponse<AllowanceConfig>>(`${this.baseUrl}/allowances/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteAllowance(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/allowances/${id}/`)
      .pipe(unwrapApi());
  }

  getAppraisals(params: ListParams = {}): Observable<PaginatedData<Appraisal>> {
    return this.http
      .get<ApiResponse<PaginatedData<Appraisal>>>(`${this.baseUrl}/appraisals/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  scheduleAppraisal(data: AppraisalScheduleData): Observable<Appraisal> {
    return this.http
      .post<ApiResponse<Appraisal>>(`${this.baseUrl}/appraisals/`, data)
      .pipe(unwrapApi());
  }

  completeAppraisal(id: number, data: AppraisalCompleteData): Observable<Appraisal> {
    return this.http
      .post<ApiResponse<Appraisal>>(`${this.baseUrl}/appraisals/${id}/complete/`, data)
      .pipe(unwrapApi());
  }

  getDisciplinaryRecords(params: ListParams = {}): Observable<PaginatedData<DisciplinaryRecord>> {
    return this.http
      .get<ApiResponse<PaginatedData<DisciplinaryRecord>>>(`${this.baseUrl}/disciplinary/`, {
        params: buildHttpParams(params),
      })
      .pipe(unwrapApi());
  }

  createDisciplinaryRecord(data: DisciplinaryFormData): Observable<DisciplinaryRecord> {
    return this.http
      .post<ApiResponse<DisciplinaryRecord>>(`${this.baseUrl}/disciplinary/`, data)
      .pipe(unwrapApi());
  }

  getCompanyProfile(): Observable<CompanyProfile> {
    return this.http
      .get<ApiResponse<CompanyProfile>>(`${this.baseUrl}/admin/company-profile/`)
      .pipe(unwrapApi());
  }

  updateCompanyProfile(data: Partial<CompanyProfile>): Observable<CompanyProfile> {
    return this.http
      .patch<ApiResponse<CompanyProfile>>(`${this.baseUrl}/admin/company-profile/`, data)
      .pipe(unwrapApi());
  }

  getWorkingHours(): Observable<WorkingHoursConfig> {
    return this.http
      .get<ApiResponse<WorkingHoursConfig>>(`${this.baseUrl}/admin/working-hours/`)
      .pipe(unwrapApi());
  }

  updateWorkingHours(data: Partial<WorkingHoursConfig>): Observable<WorkingHoursConfig> {
    return this.http
      .patch<ApiResponse<WorkingHoursConfig>>(`${this.baseUrl}/admin/working-hours/`, data)
      .pipe(unwrapApi());
  }

  getPublicHolidays(year: number): Observable<PublicHoliday[]> {
    return this.http
      .get<ApiResponse<PublicHoliday[]>>(`${this.baseUrl}/admin/public-holidays/`, {
        params: buildHttpParams({ year }),
      })
      .pipe(unwrapApi());
  }

  createPublicHoliday(data: PublicHolidayFormData): Observable<PublicHoliday> {
    return this.http
      .post<ApiResponse<PublicHoliday>>(`${this.baseUrl}/admin/public-holidays/`, data)
      .pipe(unwrapApi());
  }

  getAttendance(params: ListParams = {}): Observable<PaginatedData<Attendance>> {
    return this.http
      .get<ApiResponse<PaginatedData<Attendance>>>(`${this.baseUrl}/attendance/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  getAttendanceRecord(id: number): Observable<Attendance> {
    return this.http
      .get<ApiResponse<Attendance>>(`${this.baseUrl}/attendance/${id}/`)
      .pipe(unwrapApi());
  }

  createAttendance(data: AttendanceFormData): Observable<Attendance> {
    return this.http
      .post<ApiResponse<Attendance>>(`${this.baseUrl}/attendance/`, data)
      .pipe(unwrapApi());
  }

  updateAttendance(id: number, data: Partial<AttendanceFormData>): Observable<Attendance> {
    return this.http
      .patch<ApiResponse<Attendance>>(`${this.baseUrl}/attendance/${id}/`, data)
      .pipe(unwrapApi());
  }

  deleteAttendance(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/attendance/${id}/`)
      .pipe(unwrapApi());
  }

  bulkMarkAttendance(records: AttendanceBulkRecord[]): Observable<Attendance[]> {
    return this.http
      .post<ApiResponse<Attendance[]>>(`${this.baseUrl}/attendance/bulk-mark/`, { records })
      .pipe(unwrapApi());
  }

  getMonthlyAttendanceSummary(month: number, year: number): Observable<MonthlyAttendanceSummary[]> {
    return this.http
      .get<ApiResponse<MonthlyAttendanceSummary[]>>(`${this.baseUrl}/attendance/monthly-summary/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getLeaveRequest(id: number): Observable<LeaveRequest> {
    return this.http
      .get<ApiResponse<LeaveRequest>>(`${this.baseUrl}/leave-requests/${id}/`)
      .pipe(unwrapApi());
  }

  getLeaveRequests(params: ListParams = {}): Observable<PaginatedData<LeaveRequest>> {
    return this.http
      .get<ApiResponse<PaginatedData<LeaveRequest>>>(`${this.baseUrl}/leave-requests/`, {
        params: buildHttpParams({ page_size: 50, ordering: '-created_at', ...params }),
      })
      .pipe(unwrapApi());
  }

  createLeaveRequest(data: LeaveRequestFormData): Observable<LeaveRequest> {
    return this.http
      .post<ApiResponse<LeaveRequest>>(`${this.baseUrl}/leave-requests/`, data)
      .pipe(unwrapApi());
  }

  approveLeaveRequest(id: number): Observable<LeaveRequest> {
    return this.http
      .post<ApiResponse<LeaveRequest>>(`${this.baseUrl}/leave-requests/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  rejectLeaveRequest(id: number, reason: string): Observable<LeaveRequest> {
    return this.http
      .post<ApiResponse<LeaveRequest>>(`${this.baseUrl}/leave-requests/${id}/reject/`, { reason })
      .pipe(unwrapApi());
  }

  getLeaveBalances(employeeId?: number): Observable<EmployeeLeaveBalances[] | LeaveBalance[]> {
    const params = employeeId ? buildHttpParams({ employee: employeeId }) : buildHttpParams({});
    return this.http
      .get<ApiResponse<EmployeeLeaveBalances[] | LeaveBalance[]>>(`${this.baseUrl}/leave-requests/balances/`, {
        params,
      })
      .pipe(unwrapApi());
  }

  getLeaveCalendar(month: number, year: number): Observable<LeaveCalendarEntry[]> {
    return this.http
      .get<ApiResponse<LeaveCalendarEntry[]>>(`${this.baseUrl}/leave-requests/calendar/`, {
        params: buildHttpParams({ month, year }),
      })
      .pipe(unwrapApi());
  }

  getPayrolls(params: ListParams = {}): Observable<PaginatedData<Payroll>> {
    return this.http
      .get<ApiResponse<PaginatedData<Payroll>>>(`${this.baseUrl}/payrolls/`, {
        params: buildHttpParams({ page_size: 20, ordering: '-period_year,-period_month', ...params }),
      })
      .pipe(unwrapApi());
  }

  getPayroll(id: number): Observable<Payroll> {
    return this.http
      .get<ApiResponse<Payroll>>(`${this.baseUrl}/payrolls/${id}/`)
      .pipe(unwrapApi());
  }

  generatePayroll(data: PayrollGenerateData): Observable<Payroll> {
    return this.http
      .post<ApiResponse<Payroll>>(`${this.baseUrl}/payrolls/generate/`, data)
      .pipe(unwrapApi());
  }

  submitPayroll(id: number): Observable<Payroll> {
    return this.http
      .post<ApiResponse<Payroll>>(`${this.baseUrl}/payrolls/${id}/submit/`, {})
      .pipe(unwrapApi());
  }

  approvePayroll(id: number): Observable<Payroll> {
    return this.http
      .post<ApiResponse<Payroll>>(`${this.baseUrl}/payrolls/${id}/approve/`, {})
      .pipe(unwrapApi());
  }

  markPayrollPaid(id: number): Observable<Payroll> {
    return this.http
      .post<ApiResponse<Payroll>>(`${this.baseUrl}/payrolls/${id}/mark-paid/`, {})
      .pipe(unwrapApi());
  }

  updatePayrollItem(payrollId: number, data: PayrollItemUpdateData): Observable<PayrollItem> {
    return this.http
      .post<ApiResponse<PayrollItem>>(`${this.baseUrl}/payrolls/${payrollId}/update-item/`, data)
      .pipe(unwrapApi());
  }

  getAttendanceCheck(month: number, year: number, department?: number | null): Observable<AttendanceVerification> {
    return this.http
      .get<ApiResponse<AttendanceVerification>>(`${this.baseUrl}/payrolls/attendance-check/`, {
        params: buildHttpParams({
          month,
          year,
          ...(department ? { department } : {}),
        }),
      })
      .pipe(unwrapApi());
  }

  getPayslips(params: ListParams = {}): Observable<PaginatedData<Payslip>> {
    return this.http
      .get<ApiResponse<PaginatedData<Payslip>>>(`${this.baseUrl}/payslips/`, {
        params: buildHttpParams({ page_size: 50, ordering: '-payroll__period_year,-payroll__period_month', ...params }),
      })
      .pipe(unwrapApi());
  }

  getPayslip(id: number): Observable<Payslip> {
    return this.http
      .get<ApiResponse<Payslip>>(`${this.baseUrl}/payslips/${id}/`)
      .pipe(unwrapApi());
  }

  getAppraisal(id: number): Observable<Appraisal> {
    return this.http
      .get<ApiResponse<Appraisal>>(`${this.baseUrl}/appraisals/${id}/`)
      .pipe(unwrapApi());
  }

  updateAppraisal(id: number, data: Partial<AppraisalScheduleData>): Observable<Appraisal> {
    return this.http
      .patch<ApiResponse<Appraisal>>(`${this.baseUrl}/appraisals/${id}/`, data)
      .pipe(unwrapApi());
  }

  getDisciplinaryRecord(id: number): Observable<DisciplinaryRecord> {
    return this.http
      .get<ApiResponse<DisciplinaryRecord>>(`${this.baseUrl}/disciplinary/${id}/`)
      .pipe(unwrapApi());
  }

  updateDisciplinaryRecord(
    id: number,
    data: Partial<DisciplinaryFormData>,
  ): Observable<DisciplinaryRecord> {
    return this.http
      .patch<ApiResponse<DisciplinaryRecord>>(`${this.baseUrl}/disciplinary/${id}/`, data)
      .pipe(unwrapApi());
  }
}
