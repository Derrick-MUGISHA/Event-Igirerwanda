import type { Role } from "@/store/authSlice";

/* A tiny framework-agnostic seam between the request layer (client.ts) and the
   React/Redux auth layer (AuthProvider). AuthProvider registers the concrete
   implementation once on mount; client.ts calls through these functions so it
   never has to import React or the store (which would create a cycle). */

export interface AuthBridge {
  /** current access/bearer token for a role, or null */
  getToken(role: Role): string | null;
  /** called when a role's request is rejected as unauthenticated */
  onUnauthorized(role: Role): void;
  /** attempt a participant token refresh; resolves to the new token or null */
  refresh(): Promise<string | null>;
}

let impl: AuthBridge | null = null;

export function registerAuthBridge(bridge: AuthBridge): void {
  impl = bridge;
}

export function bridgeGetToken(role: Role): string | null {
  return impl?.getToken(role) ?? null;
}

export function bridgeOnUnauthorized(role: Role): void {
  impl?.onUnauthorized(role);
}

export function bridgeRefresh(): Promise<string | null> {
  return impl ? impl.refresh() : Promise.resolve(null);
}
