import { ROLES } from '../../../core/constants/roles.constants';
import { AuthService } from '../../../core/services/auth.service';

export function canReportIncident(auth: AuthService): boolean {
  return auth.isAuthenticated();
}

export function canInvestigateIncident(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasPermission('safety', 'approve')
  );
}

export function canCloseIncident(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canScheduleInspection(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasPermission('safety', 'create')
  );
}

export function canIssuePPE(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.STOREKEEPER)
  );
}

export function canRequestPPE(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasPermission('safety', 'create')
  );
}

export function canReviewPPEStore(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.STOREKEEPER);
}

export function canManagePPEProcurement(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.HOD_PROCUREMENT) ||
    auth.hasPermission('procurement', 'read')
  );
}

export function canApprovePermit(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER)
  );
}

export function canViewReports(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasRole(ROLES.GENERAL_MANAGER) ||
    auth.hasRole(ROLES.HR_OFFICER) ||
    auth.hasRole(ROLES.INTERNAL_AUDITOR)
  );
}

export function canScheduleTraining(auth: AuthService): boolean {
  return (
    auth.hasRole(ROLES.SUPER_ADMIN) ||
    auth.hasRole(ROLES.SAFETY_OFFICER) ||
    auth.hasRole(ROLES.HR_OFFICER)
  );
}
