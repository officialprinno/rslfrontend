interface JwtPayload {
  exp?: number;
  user_id?: number;
}

/** Decode JWT payload without external dependencies. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string | null, bufferSeconds = 30): boolean {
  if (!token) {
    return true;
  }
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  const expiresAtMs = payload.exp * 1000;
  return Date.now() >= expiresAtMs - bufferSeconds * 1000;
}
