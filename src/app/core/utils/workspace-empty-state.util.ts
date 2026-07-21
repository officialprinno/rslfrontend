import { HttpErrorResponse } from '@angular/common/http';
import { WritableSignal } from '@angular/core';

import { UserCompanyAssignment } from '../models/auth.models';
import { ActiveCompanyState } from '../services/company-context.service';

/** True when a retrieve-by-id failed because the record is missing or outside the active workspace. */
export function isRecordNotInWorkspaceError(err: unknown): boolean {
  if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
    return false;
  }
  const body = err.error as { message?: string; detail?: string } | null;
  if (!body || typeof body !== 'object') {
    return true;
  }
  const message = String(body.message ?? body.detail ?? '').toLowerCase();
  if (!message) {
    return true;
  }
  return message.includes('not found');
}

export function workspaceRecordLabel(moduleName: string): string {
  const trimmed = moduleName.trim();
  if (!trimmed) return 'records';
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function buildWorkspaceEmptyTitle(moduleName: string, companyName: string): string {
  return `No ${moduleName} found for ${companyName}`;
}

export function buildWorkspaceEmptyMessage(
  moduleName: string,
  activeCompanyName: string,
  siblingCompanyNames: string[],
): string {
  const recordLabel = workspaceRecordLabel(moduleName);
  const others = siblingCompanyNames.filter(Boolean);
  if (!others.length) {
    return `There are no ${recordLabel} in ${activeCompanyName} yet. Create new records to get started.`;
  }
  const otherList =
    others.length === 1
      ? others[1 - 1]
      : `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`;
  return `Records from ${otherList} are not available in ${activeCompanyName}. Switch companies to view existing records, or create new ones here.`;
}

export function siblingCompanyNames(
  companies: UserCompanyAssignment[],
  active: ActiveCompanyState | null,
): string[] {
  if (!active || active.id === 'consolidated') {
    return companies.map((c) => c.company_name);
  }
  return companies.filter((c) => c.company_id !== active.id).map((c) => c.company_name);
}

export function resetListLoadState(
  error: WritableSignal<boolean>,
  workspaceEmpty: WritableSignal<boolean>,
): void {
  error.set(false);
  workspaceEmpty.set(false);
}

/** Route list/record load failures to workspace empty vs genuine error UI. */
export function handleListLoadError(
  err: unknown,
  error: WritableSignal<boolean>,
  workspaceEmpty: WritableSignal<boolean>,
): void {
  if (isRecordNotInWorkspaceError(err)) {
    workspaceEmpty.set(true);
    error.set(false);
    return;
  }
  workspaceEmpty.set(false);
  error.set(true);
}

/** @deprecated Use handleListLoadError */
export function handleScopedRecordLoadError(
  err: unknown,
  error: WritableSignal<boolean>,
  notInWorkspace: WritableSignal<boolean>,
): void {
  handleListLoadError(err, error, notInWorkspace);
}

/** @deprecated Use workspaceRecordLabel */
export function buildWorkspaceEmptyTitleLegacy(recordLabel: string, companyName: string): string {
  const moduleName = recordLabel
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return buildWorkspaceEmptyTitle(moduleName, companyName);
}

/** @deprecated Use buildWorkspaceEmptyMessage with moduleName */
export function buildWorkspaceEmptyMessageLegacy(
  recordLabel: string,
  activeCompanyName: string,
  siblings: string[],
): string {
  const moduleName = recordLabel
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return buildWorkspaceEmptyMessage(moduleName, activeCompanyName, siblings);
}
