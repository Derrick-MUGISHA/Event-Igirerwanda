import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* The three sign-in domains. Each maps to a backend token kind:
   participant→attendee, admin→admin, scanner→scanner. */
export type Role = "participant" | "admin" | "scanner";

/* backend token-kind names, used by the request layer */
export const TOKEN_KIND: Record<Role, "attendee" | "admin" | "scanner"> = {
  participant: "attendee",
  admin: "admin",
  scanner: "scanner",
};

/* a normalized identity snapshot — only the fields the UI needs per role */
export interface RoleUser {
  id?: string;
  name?: string;
  email?: string;
  /* admin role (single ADMIN role) */
  role?: string;
  /* participant: PENDING | VERIFIED | COMPLETE */
  status?: string;
}

export type SessionStatus = "idle" | "authed" | "anon";

export interface RoleSession {
  token: string | null;
  user: RoleUser | null;
  status: SessionStatus;
}

export interface AuthState {
  activeRole: Role | null;
  sessions: Record<Role, RoleSession>;
}

const emptySession = (): RoleSession => ({ token: null, user: null, status: "idle" });

const initialState: AuthState = {
  activeRole: null,
  sessions: {
    participant: emptySession(),
    admin: emptySession(),
    scanner: emptySession(),
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /* establish (or replace) a role's session and make it the active one */
    setSession(
      state,
      action: PayloadAction<{ role: Role; token: string | null; user: RoleUser | null }>
    ) {
      const { role, token, user } = action.payload;
      state.sessions[role] = { token, user, status: "authed" };
      state.activeRole = role;
    },
    /* merge fields into a role's identity (e.g. after fetching /me) */
    patchUser(state, action: PayloadAction<{ role: Role; user: RoleUser }>) {
      const { role, user } = action.payload;
      const s = state.sessions[role];
      s.user = { ...(s.user ?? {}), ...user };
      if (s.status === "idle") s.status = "authed";
    },
    /* rotate just the access token (e.g. participant refresh) without touching
       the identity or the active role. Keeps status in step with the token. */
    setToken(state, action: PayloadAction<{ role: Role; token: string | null }>) {
      const s = state.sessions[action.payload.role];
      s.token = action.payload.token;
      s.status = action.payload.token ? "authed" : "anon";
    },
    /* mark a role signed-out */
    clearSession(state, action: PayloadAction<{ role: Role }>) {
      state.sessions[action.payload.role] = { token: null, user: null, status: "anon" };
      if (state.activeRole === action.payload.role) state.activeRole = null;
    },
    setActiveRole(state, action: PayloadAction<Role | null>) {
      state.activeRole = action.payload;
    },
  },
});

export const { setSession, patchUser, setToken, clearSession, setActiveRole } = authSlice.actions;
export default authSlice.reducer;
