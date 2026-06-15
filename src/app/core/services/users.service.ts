import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environments';
import { ApiResponse, Permission, Role, User, UserWritePayload } from '../models/auth.models';
import { UserOption } from '../models/inventory.model';
import { PaginatedData } from '../models/paginated.model';
import { buildHttpParams, unwrapApi } from '../utils/api.util';

export const PERMISSION_MODULES = [
  'inventory',
  'procurement',
  'sales',
  'logistics',
  'driver_portal',
  'production',
  'finance',
  'hr',
  'safety',
  'messaging',
  'email',
  'users',
  'settings',
] as const;

export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'query',
] as const;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiUrl}/auth/users`;
  private readonly rolesUrl = `${environment.apiUrl}/auth/roles`;
  private readonly permissionsUrl = `${environment.apiUrl}/auth/permissions`;

  listUsers(params: Record<string, string | number | boolean> = {}): Observable<PaginatedData<User>> {
    return this.http
      .get<ApiResponse<PaginatedData<User>>>(`${this.usersUrl}/`, {
        params: buildHttpParams({ page_size: 25, ...params }),
      })
      .pipe(unwrapApi());
  }

  /** Lightweight user picker used across modules. */
  getUsers(search = ''): Observable<UserOption[]> {
    return this.listUsers({ is_active: true, page_size: 100, search }).pipe(
      map((data) =>
        data.results.map((u) => ({ id: u.id, full_name: u.full_name, email: u.email })),
      ),
    );
  }

  getUser(id: number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.usersUrl}/${id}/`).pipe(unwrapApi());
  }

  createUser(payload: UserWritePayload): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.usersUrl}/`, payload).pipe(unwrapApi());
  }

  updateUser(id: number, payload: UserWritePayload): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${this.usersUrl}/${id}/`, payload).pipe(unwrapApi());
  }

  resetPassword(id: number, password: string): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.usersUrl}/${id}/reset-password/`, { password })
      .pipe(map(() => undefined));
  }

  getRoles(departmentId?: number): Observable<Role[]> {
    const params = buildHttpParams({
      is_active: true,
      page_size: 100,
      ...(departmentId ? { department: departmentId } : {}),
    });
    return this.http
      .get<ApiResponse<PaginatedData<Role>>>(`${this.rolesUrl}/`, { params })
      .pipe(
        unwrapApi(),
        map((data) => data.results),
      );
  }

  listRoles(params: Record<string, string | number | boolean> = {}): Observable<PaginatedData<Role>> {
    return this.http
      .get<ApiResponse<PaginatedData<Role>>>(`${this.rolesUrl}/`, {
        params: buildHttpParams({ page_size: 50, ...params }),
      })
      .pipe(unwrapApi());
  }

  getRole(id: number): Observable<Role> {
    return this.http.get<ApiResponse<Role>>(`${this.rolesUrl}/${id}/`).pipe(unwrapApi());
  }

  createRole(payload: { name: string; department?: number | null; is_active?: boolean }): Observable<Role> {
    return this.http.post<ApiResponse<Role>>(`${this.rolesUrl}/`, payload).pipe(unwrapApi());
  }

  updateRole(
    id: number,
    payload: Partial<{ name: string; department: number | null; is_active: boolean }>,
  ): Observable<Role> {
    return this.http.patch<ApiResponse<Role>>(`${this.rolesUrl}/${id}/`, payload).pipe(unwrapApi());
  }

  listPermissions(params: Record<string, string | number | boolean> = {}): Observable<PaginatedData<Permission>> {
    return this.http
      .get<ApiResponse<PaginatedData<Permission>>>(`${this.permissionsUrl}/`, {
        params: buildHttpParams({ page_size: 100, ...params }),
      })
      .pipe(unwrapApi());
  }

  createPermission(payload: { role: number; module: string; action: string; is_active?: boolean }): Observable<Permission> {
    return this.http.post<ApiResponse<Permission>>(`${this.permissionsUrl}/`, payload).pipe(unwrapApi());
  }

  updatePermission(id: number, payload: Partial<{ is_active: boolean }>): Observable<Permission> {
    return this.http.patch<ApiResponse<Permission>>(`${this.permissionsUrl}/${id}/`, payload).pipe(unwrapApi());
  }

  deactivatePermission(id: number): Observable<void> {
    return this.http.delete<ApiResponse<unknown>>(`${this.permissionsUrl}/${id}/`).pipe(map(() => undefined));
  }

  buildPermissionMatrix(permissions: Permission[]): Record<string, Record<string, boolean>> {
    const matrix: Record<string, Record<string, boolean>> = {};
    for (const mod of PERMISSION_MODULES) {
      matrix[mod] = {};
      for (const action of PERMISSION_ACTIONS) {
        matrix[mod][action] = permissions.some((p) => p.module === mod && p.action === action);
      }
    }
    if (this.userIsHod(permissions)) {
      matrix['inventory'] ??= {};
      matrix['inventory']['read'] = true;
      matrix['inventory']['query'] = true;
    }
    return matrix;
  }

  private userIsHod(permissions: Permission[]): boolean {
    return permissions.some((p) =>
      ['procurement', 'sales', 'logistics'].includes(p.module) && p.action === 'approve',
    );
  }
}
