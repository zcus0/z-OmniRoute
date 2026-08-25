/**
 * API client — all dashboard data flows through here with Bearer auth.
 * Backend base URL: VITE_API_BASE (empty = same origin / dev proxy).
 */

const BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "omniroute_jwt";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    clearToken();
    throw new ApiError(401, "Session expired — sign in again.");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message || body?.error || msg;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, String(msg));
  }
  return res.json() as Promise<T>;
}
