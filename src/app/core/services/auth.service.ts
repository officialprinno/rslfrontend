import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environments';
import {
  BUSINESS_MODULES,
  MODULE_HOME_ROUTES,
  SELF_SERVICE_MODULES,
} from '../config/route-access.config';
import { ROLES } from '../constants/roles.constants';
import {
  ApiResponse,
  AuthTokens,
  LoginCredentials,
  LoginResponseData,
  Permission,
  PermissionAction,
  User,
  UserDepartmentAssignment,
} from '../models/auth.models';
import { isTokenExpired } from '../utils/jwt.util';
import { isMachineOperatorOnly } from '../utils/operator-access.util';
import { StorageService } from './storage.service';
import { PreferencesService } from './preferences.service';

const SUPER_ADMIN = 'Super Admin';
const GENERAL_MANAGER = 'General Manager';
const INTERNAL_AUDITOR = 'Internal Auditor';
const HOD_PREFIX = 'HOD ';

/** Every employee can use messaging, personal email, and profile settings */
const EMPLOYEE_SELF_SERVICE_MODULES = SELF_SERVICE_MODULES;
const EMPLOYEE_SELF_SERVICE_ACTIONS: PermissionAction[] = [
  'create',
  'read',
  'update',
  'delete',
  'query',
];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly preferences = inject(PreferencesService);
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly userSignal = signal<User | null>(this.storage.getUser());
  private readonly permissionsSignal = signal<Permission[]>(this.storage.getPermissions());

  constructor() {
    const user = this.userSignal();
    if (user) {
      // Defer so AuthService can be constructed during i18n bootstrap without re-entering PreferencesService.
      queueMicrotask(() => this.preferences.applyFromProfile(user.language, user.theme));
    }
  }

  readonly currentUser = this.userSignal.asReadonly();
  readonly permissions = this.permissionsSignal.asReadonly();

  readonly isMultiDepartmentUser = computed(() => this.isMultiDepartment());

  readonly isAuthenticated = computed(() => {
    const token = this.storage.getToken();
    return !!token && !isTokenExpired(token);
  });

  login(email: string, password: string): Observable<User> {
    const body: LoginCredentials = { email, password };
    return this.http.post<ApiResponse<LoginResponseData>>(`${this.baseUrl}/login/`, body).pipe(
      switchMap((response) => {
        if (!response.success || !response.data) {
          return throwError(() => new Error(response.message || 'Login failed'));
        }
        this.persistSession(response.data.tokens, response.data.user);
        return this.loadUserPermissions(response.data.user).pipe(map(() => response.data.user));
      }),
    );
  }

  logout(): void {
    const refresh = this.storage.getRefreshToken();
    if (refresh) {
      this.http
        .post(`${this.baseUrl}/logout/`, { refresh })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  refreshToken(): Observable<AuthTokens> {
    const refresh = this.storage.getRefreshToken();
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }
    return this.http
      .post<ApiResponse<AuthTokens>>(`${this.baseUrl}/refresh/`, { refresh })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Token refresh failed');
          }
          const currentRefresh = this.storage.getRefreshToken() ?? refresh;
          const tokens: AuthTokens = {
            access: response.data.access,
            refresh: response.data.refresh ?? currentRefresh,
          };
          this.storage.saveToken(tokens);
          return tokens;
        }),
      );
  }

  getCurrentUser(): User | null {
    return this.userSignal();
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/me/`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.userSignal.set(response.data);
          this.storage.saveUser(response.data);
        }
      }),
      switchMap((response) => {
        if (!response.success || !response.data) {
          return throwError(() => new Error(response.message || 'Failed to load user'));
        }
        return this.loadUserPermissions(response.data).pipe(map(() => response.data));
      }),
    );
  }

  hasRole(role: string): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    const roleNames = this.getUserRoleNames(user);
    return roleNames.includes(role);
  }

  isSuperAdmin(): boolean {
    return this.hasRole(SUPER_ADMIN);
  }

  hasModuleAccess(module: string): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    if (module === 'inventory' && isMachineOperatorOnly(this.getUserRoleNames(user))) {
      return false;
    }
    const roleNames = this.getUserRoleNames(user);
    if (roleNames.includes(SUPER_ADMIN) || roleNames.includes(GENERAL_MANAGER)) {
      return true;
    }
    const modules = user.modules ?? [];
    return modules.includes(module) || modules.includes('all');
  }

  /** Business modules the user can access (excludes messaging, email, settings). */
  getAccessibleBusinessModules(): string[] {
    return BUSINESS_MODULES.filter((mod) => this.hasModuleAccess(mod));
  }

  /** Main ops dashboard — GM, Super Admin, or users with 2+ business modules. */
  canAccessMainDashboard(): boolean {
    if (this.hasRole(SUPER_ADMIN) || this.hasRole(GENERAL_MANAGER)) {
      return true;
    }
    return this.getAccessibleBusinessModules().length >= 2;
  }

  /** First page to open after login or when hitting `/`. */
  getDefaultHomeRoute(): string {
    if (this.hasRole(ROLES.MACHINE_OPERATOR) && this.hasModuleAccess('production')) {
      return '/production/operator';
    }

    if (this.hasRole(GENERAL_MANAGER)) {
      return '/dashboard';
    }

    const business = this.getAccessibleBusinessModules();

    if (this.canAccessMainDashboard()) {
      return '/dashboard';
    }

    if (business.length === 1) {
      return MODULE_HOME_ROUTES[business[0]] ?? '/settings';
    }

    if (business.length === 0) {
      if (this.hasModuleAccess('messaging')) {
        return '/messaging';
      }
      return '/settings';
    }

    return MODULE_HOME_ROUTES[business[0]] ?? '/dashboard';
  }

  hasPermission(module: string, action: PermissionAction): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    if (
      SELF_SERVICE_MODULES.has(module) &&
      EMPLOYEE_SELF_SERVICE_ACTIONS.includes(action)
    ) {
      return true;
    }

    const roleNames = this.getUserRoleNames(user);
    if (roleNames.includes(SUPER_ADMIN)) {
      return true;
    }
    if (roleNames.includes(GENERAL_MANAGER)) {
      return true;
    }
    if (roleNames.includes(INTERNAL_AUDITOR) && ['read', 'query'].includes(action)) {
      return true;
    }

    if (module === 'inventory' && isMachineOperatorOnly(roleNames)) {
      return false;
    }

    const hasMerged = this.permissionsSignal().some(
      (p) => (p.is_active !== false) && p.module === module && p.action === action,
    );
    if (hasMerged) {
      return true;
    }

    if (module === 'inventory' && ['read', 'query'].includes(action) && this.userIsHod(user)) {
      return true;
    }

    return false;
  }

  getUserDepartments(): UserDepartmentAssignment[] {
    return this.userSignal()?.departments ?? [];
  }

  isMultiDepartment(): boolean {
    const user = this.userSignal();
    if (!user) {
      return false;
    }
    return Boolean(user.is_multi_department) || (user.departments?.length ?? 0) > 1;
  }

  primaryDepartmentLabel(): string {
    const user = this.userSignal();
    if (!user) {
      return '';
    }
    return user.primary_department ?? user.department_name ?? '';
  }

  isAccessTokenExpired(): boolean {
    return isTokenExpired(this.storage.getToken());
  }

  getAccessToken(): string | null {
    return this.storage.getToken();
  }

  private getUserRoleNames(user: User): string[] {
    const fromDepts = (user.departments ?? []).map((d) => d.role_name || d.role);
    if (user.role_name && !fromDepts.includes(user.role_name)) {
      fromDepts.push(user.role_name);
    }
    return fromDepts;
  }

  private userIsHod(user: User): boolean {
    return this.getUserRoleNames(user).some((name) => name.startsWith(HOD_PREFIX));
  }

  private persistSession(tokens: AuthTokens, user: User): void {
    this.storage.saveToken(tokens);
    this.storage.saveUser(user);
    this.userSignal.set(user);
    this.preferences.applyFromProfile(user.language, user.theme);
  }

  private clearSession(): void {
    this.storage.clearAll();
    this.userSignal.set(null);
    this.permissionsSignal.set([]);
  }

  private loadUserPermissions(user: User): Observable<Permission[]> {
    const fromUser = (user.permissions ?? []).map((p) => ({
      ...p,
      is_active: p.is_active ?? true,
    }));

    if (fromUser.length) {
      this.permissionsSignal.set(fromUser);
      this.storage.savePermissions(fromUser);
      return of(fromUser);
    }

    return this.http
      .get<ApiResponse<Permission[]>>(`${this.baseUrl}/users/me/permissions/`)
      .pipe(
        map((response) => response.data?.filter((p) => p.is_active !== false) ?? []),
        tap((permissions) => {
          this.permissionsSignal.set(permissions);
          this.storage.savePermissions(permissions);
        }),
        catchError(() => {
          this.permissionsSignal.set([]);
          this.storage.savePermissions([]);
          return of([]);
        }),
      );
  }
}
