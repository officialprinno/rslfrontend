import { Injectable } from '@angular/core';

import { AuthTokens, Permission, User } from '../models/auth.models';

const ACCESS_TOKEN_KEY = 'rsl_access_token';
const REFRESH_TOKEN_KEY = 'rsl_refresh_token';
const USER_KEY = 'rsl_user';
const PERMISSIONS_KEY = 'rsl_permissions';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  saveToken(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  saveUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  }

  savePermissions(permissions: Permission[]): void {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  }

  getPermissions(): Permission[] {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as Permission[];
    } catch {
      return [];
    }
  }

  removePermissions(): void {
    localStorage.removeItem(PERMISSIONS_KEY);
  }

  clearAll(): void {
    this.removeToken();
    this.removeUser();
    this.removePermissions();
  }
}
