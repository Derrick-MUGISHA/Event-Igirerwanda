/* localStorage persistence for the long-lived roles (admin, scanner). The
   participant token is deliberately NOT stored here — it lives in Redux memory
   and is re-minted from the httpOnly refresh cookie on load. */

import { STORAGE_KEYS } from "./client";
import type { AuthState, RoleSession, RoleUser } from "@/store/authSlice";

type Stored = { token: string; user: RoleUser } | null;

const authedSession = (s: Stored): RoleSession =>
  s ? { token: s.token, user: s.user, status: "authed" } : { token: null, user: null, status: "idle" };

/* Build the store's preloaded auth state from localStorage. Runs on the client
   only; the participant session stays empty (restored via the refresh cookie). */
export function preloadedAuthState(): { auth: AuthState } {
  return {
    auth: {
      activeRole: null,
      sessions: {
        participant: { token: null, user: null, status: "idle" },
        admin: authedSession(loadAdmin()),
        scanner: authedSession(loadScanner()),
      },
    },
  };
}

export function persistAdmin(token: string, user: RoleUser): void {
  const k = STORAGE_KEYS.admin;
  localStorage.setItem(k.token, token);
  if (user.role) localStorage.setItem(k.role, user.role);
  if (user.name) localStorage.setItem(k.name, user.name);
}

export function loadAdmin(): Stored {
  const k = STORAGE_KEYS.admin;
  const token = localStorage.getItem(k.token);
  if (!token) return null;
  return {
    token,
    user: {
      role: localStorage.getItem(k.role) ?? undefined,
      name: localStorage.getItem(k.name) ?? undefined,
    },
  };
}

export function clearAdmin(): void {
  const k = STORAGE_KEYS.admin;
  localStorage.removeItem(k.token);
  localStorage.removeItem(k.role);
  localStorage.removeItem(k.name);
}

export function persistScanner(token: string, user: RoleUser): void {
  const k = STORAGE_KEYS.scanner;
  localStorage.setItem(k.token, token);
  if (user.name) localStorage.setItem(k.name, user.name);
}

export function loadScanner(): Stored {
  const k = STORAGE_KEYS.scanner;
  const token = localStorage.getItem(k.token);
  if (!token) return null;
  return { token, user: { name: localStorage.getItem(k.name) ?? undefined } };
}

export function clearScanner(): void {
  const k = STORAGE_KEYS.scanner;
  localStorage.removeItem(k.token);
  localStorage.removeItem(k.name);
}
