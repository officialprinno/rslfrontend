import { ROLES } from '../../../core/constants/roles.constants';
import { StaffPaymentRequest } from '../../../core/models/staff-payment.model';
import { AuthService } from '../../../core/services/auth.service';

const HOD_PREFIX = 'HOD ';

export function isAnyHod(auth: AuthService): boolean {
  return auth.getUserRoleNames().some((name) => name.startsWith(HOD_PREFIX));
}

export function isGmUser(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.GENERAL_MANAGER);
}

export function isFinanceHod(auth: AuthService): boolean {
  return auth.hasRole(ROLES.SUPER_ADMIN) || auth.hasRole(ROLES.HOD_FINANCE);
}

export function canCreateStaffPayment(auth: AuthService): boolean {
  return auth.isAuthenticated();
}

export function canHodApproveStaffPayment(
  auth: AuthService,
  req: StaffPaymentRequest,
): boolean {
  if (req.overall_status !== 'PENDING_HOD_APPROVAL') return false;
  return isAnyHod(auth) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function canGmApproveStaffPayment(auth: AuthService, req: StaffPaymentRequest): boolean {
  if (req.overall_status !== 'PENDING_GM_APPROVAL') return false;
  return isGmUser(auth);
}

export function canFinanceApproveStaffPayment(
  auth: AuthService,
  req: StaffPaymentRequest,
): boolean {
  if (req.overall_status !== 'PENDING_FINANCE_APPROVAL') return false;
  return isFinanceHod(auth);
}

export function canMarkStaffPaymentPaid(auth: AuthService, req: StaffPaymentRequest): boolean {
  if (req.overall_status !== 'APPROVED') return false;
  return isFinanceHod(auth);
}

export function canSubmitLiquidation(auth: AuthService, req: StaffPaymentRequest): boolean {
  if (req.request_type !== 'ADVANCE') return false;
  if (!['LIQUIDATION_PENDING', 'LIQUIDATION_SUBMITTED'].includes(req.overall_status)) {
    return false;
  }
  const userId = auth.currentUser()?.id;
  return !!userId && req.requested_by === userId;
}

export function canApproveLiquidation(auth: AuthService, req: StaffPaymentRequest): boolean {
  if (req.overall_status !== 'LIQUIDATION_SUBMITTED') return false;
  return isFinanceHod(auth);
}

export function canManagePaymentCategories(auth: AuthService): boolean {
  return isFinanceHod(auth);
}

export function showStaffPaymentHodQueue(auth: AuthService): boolean {
  return isAnyHod(auth) || auth.hasRole(ROLES.SUPER_ADMIN);
}

export function showStaffPaymentGmQueue(auth: AuthService): boolean {
  return isGmUser(auth);
}

export function showStaffPaymentFinanceQueues(auth: AuthService): boolean {
  return isFinanceHod(auth);
}

export function showStaffPaymentAllRecords(auth: AuthService): boolean {
  return isFinanceHod(auth);
}
