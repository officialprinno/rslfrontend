import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  HSEReport,
  IncidentReport,
  SafetyTraining,
  WorkPermit,
} from '../../../../core/models/safety.model';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { SafetyService } from '../../../../core/services/safety.service';
import { getApiErrorMessage } from '../../../../core/utils/api.util';
import { exportToExcel } from '../../../../core/utils/export.util';
import { formatDate } from '../../../../core/utils/format.util';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { TableSkeletonComponent } from '../../../../shared/components/table-skeleton/table-skeleton.component';
import { SafetyNavComponent } from '../../components/safety-nav/safety-nav.component';
import {
  incidentTypeLabel,
  LTIFR_FORMULA,
  permitTypeLabel,
  trainingTypeLabel,
} from '../../constants/safety.constants';
import { canViewReports } from '../../utils/safety-permissions.util';

type ReportId =
  | 'incidents'
  | 'inspections'
  | 'monthly-hse'
  | 'permits'
  | 'training'
  | 'ltifr';

interface ReportCard {
  id: ReportId;
  title: string;
  description: string;
  periodType: 'range' | 'month' | 'none';
}

interface InspectionReportData {
  by_area: { area: string; pass_count: number }[];
  total: number;
}

@Component({
  selector: 'app-safety-reports',
  imports: [
    FormsModule,
    PageHeaderComponent,
    SafetyNavComponent,
    TableSkeletonComponent,
    ErrorStateComponent,
  ],
  templateUrl: './safety-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyReportsComponent implements OnInit {
  private readonly safety = inject(SafetyService);
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly activeReport = signal<ReportId | null>(null);
  readonly canView = () => canViewReports(this.auth);

  readonly incidentReport = signal<IncidentReport | null>(null);
  readonly inspectionReport = signal<InspectionReportData | null>(null);
  readonly hseReport = signal<HSEReport | null>(null);
  readonly permitReport = signal<WorkPermit[]>([]);
  readonly trainingReport = signal<SafetyTraining[]>([]);

  readonly ltifrFormula = LTIFR_FORMULA;
  readonly formatDate = formatDate;
  readonly incidentTypeLabel = incidentTypeLabel;
  readonly permitTypeLabel = permitTypeLabel;
  readonly trainingTypeLabel = trainingTypeLabel;

  dateFrom = this.firstDayOfMonth(new Date());
  dateTo = this.todayIso();
  reportMonth = new Date().getMonth() + 1;
  reportYear = new Date().getFullYear();

  readonly reportCards: ReportCard[] = [
    {
      id: 'incidents',
      title: 'Incident Summary',
      description: 'Incidents by type, severity, department and LTIFR',
      periodType: 'range',
    },
    {
      id: 'inspections',
      title: 'Inspection Compliance',
      description: 'Completed inspections grouped by area',
      periodType: 'none',
    },
    {
      id: 'monthly-hse',
      title: 'Monthly HSE Dashboard',
      description: 'Safety score, open incidents, and active permits',
      periodType: 'month',
    },
    {
      id: 'permits',
      title: 'Work Permit Register',
      description: 'All permits issued in the selected period',
      periodType: 'range',
    },
    {
      id: 'training',
      title: 'Training Compliance',
      description: 'Scheduled and completed training sessions',
      periodType: 'range',
    },
    {
      id: 'ltifr',
      title: 'LTIFR Benchmark',
      description: 'Lost Time Injury Frequency Rate with formula reference',
      periodType: 'range',
    },
  ];

  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  ngOnInit(): void {
    if (!this.canView()) {
      this.notification.error('You do not have permission to view safety reports');
    }
  }

  generateReport(id: ReportId): void {
    if (!this.canView()) return;

    this.activeReport.set(id);
    this.loading.set(true);
    this.error.set(false);
    this.clearReportData(id);

    const onError = (e: unknown) => {
      this.error.set(true);
      this.notification.error(getApiErrorMessage(e));
    };
    const stopLoading = () => this.loading.set(false);

    switch (id) {
      case 'incidents':
      case 'ltifr':
        this.safety
          .getIncidentReport(this.dateFrom, this.dateTo)
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.incidentReport.set(data),
            error: onError,
          });
        break;
      case 'inspections':
        this.safety
          .getInspectionReport()
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.inspectionReport.set(data as InspectionReportData),
            error: onError,
          });
        break;
      case 'monthly-hse':
        this.safety
          .getMonthlyHSEReport(this.reportMonth, this.reportYear)
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.hseReport.set(data),
            error: onError,
          });
        break;
      case 'permits':
        this.safety
          .getWorkPermits({
            date_from: this.dateFrom,
            date_to: this.dateTo,
            page_size: 500,
          })
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.permitReport.set(data.results),
            error: onError,
          });
        break;
      case 'training':
        this.safety
          .getTrainings({
            date_from: this.dateFrom,
            date_to: this.dateTo,
            page_size: 500,
          })
          .pipe(finalize(stopLoading))
          .subscribe({
            next: (data) => this.trainingReport.set(data.results),
            error: onError,
          });
        break;
    }
  }

  exportReport(id: ReportId): void {
    switch (id) {
      case 'incidents': {
        const report = this.incidentReport();
        if (!report) return;
        exportToExcel('incident-summary', [
          { key: 'incident_type', label: 'Type' },
          { key: 'count', label: 'Count' },
        ], report.by_type.map((r) => ({
          incident_type: incidentTypeLabel(r.incident_type),
          count: r.count,
        })));
        break;
      }
      case 'inspections': {
        const report = this.inspectionReport();
        if (!report) return;
        exportToExcel('inspection-compliance', [
          { key: 'area', label: 'Area' },
          { key: 'pass_count', label: 'Completed' },
        ], report.by_area);
        break;
      }
      case 'monthly-hse': {
        const report = this.hseReport();
        if (!report) return;
        exportToExcel('monthly-hse', [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ], [
          { metric: 'Safety Score', value: report.safety_score },
          { metric: 'Days Without Incident', value: report.days_without_incident },
          { metric: 'Open Incidents', value: report.open_incidents },
          { metric: 'Pending Inspections', value: report.pending_inspections },
          { metric: 'Active Permits', value: report.active_permits },
        ]);
        break;
      }
      case 'permits':
        exportToExcel('work-permits', [
          { key: 'permit_number', label: 'Permit No.' },
          { key: 'permit_type', label: 'Type' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
        ], this.permitReport().map((p) => ({
          permit_number: p.permit_number,
          permit_type: permitTypeLabel(p.permit_type),
          location: p.location,
          status: p.status,
        })));
        break;
      case 'training':
        exportToExcel('training-compliance', [
          { key: 'training_name', label: 'Training' },
          { key: 'training_type', label: 'Type' },
          { key: 'completion_rate', label: 'Completion %' },
          { key: 'status', label: 'Status' },
        ], this.trainingReport().map((t) => ({
          training_name: t.training_name,
          training_type: trainingTypeLabel(t.training_type),
          completion_rate: t.completion_rate,
          status: t.status,
        })));
        break;
      case 'ltifr': {
        const report = this.incidentReport();
        if (!report) return;
        exportToExcel('ltifr-report', [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ], [
          { metric: 'Period From', value: report.period_from },
          { metric: 'Period To', value: report.period_to },
          { metric: 'Total Incidents', value: report.total },
          { metric: 'LTIFR', value: report.ltifr },
          { metric: 'Formula', value: LTIFR_FORMULA },
        ]);
        break;
      }
    }
  }

  private clearReportData(id: ReportId): void {
    if (id === 'incidents' || id === 'ltifr') this.incidentReport.set(null);
    if (id === 'inspections') this.inspectionReport.set(null);
    if (id === 'monthly-hse') this.hseReport.set(null);
    if (id === 'permits') this.permitReport.set([]);
    if (id === 'training') this.trainingReport.set([]);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private firstDayOfMonth(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
}
