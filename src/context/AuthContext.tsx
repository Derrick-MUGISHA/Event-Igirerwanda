"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";
import { setToken, clearSession, type Role } from "@/store/authSlice";
import { registerAuthBridge } from "@/lib/authBridge";
import { clearAdmin, clearScanner } from "@/lib/authStorage";
import {
  useAdminLogin,
  useScannerLogin,
  useParticipantLink,
  useParticipantVerify,
  useParticipantMe,
  useLogout,
} from "@/hooks/authHooks";

/* default landing pages when a role is signed out */
const LOGIN_ROUTE: Record<Role, string> = {
  participant: "/",
  admin: "/admin",
  scanner: "/scan",
};

type AuthContextValue = {
  /* false on the server and the first client render, true after mount. The
     admin/scanner sessions are preloaded from localStorage (client-only), so
     auth-gated UI must wait for this to avoid an SSR/client hydration mismatch. */
  hydrated: boolean;
  /* true once the one-shot participant refresh on load has settled, so guards
     don't redirect during the initial token bootstrap */
  bootstrapped: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const [hydrated, setHydrated] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  /* Register the request-layer bridge during render (before children mount) so
     the very first api() call can resolve a token and recover from a 401. */
  useMemo(() => {
    registerAuthBridge({
      getToken: (role) => store.getState().auth.sessions[role].token,
      onUnauthorized: (role) => {
        if (role === "admin") clearAdmin();
        if (role === "scanner") clearScanner();
        dispatch(clearSession({ role }));
      },
      refresh: async () => {
        try {
          const res = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (!res.ok) {
            dispatch(setToken({ role: "participant", token: null }));
            return null;
          }
          const data = (await res.json()) as { accessToken: string };
          dispatch(setToken({ role: "participant", token: data.accessToken }));
          return data.accessToken;
        } catch {
          return null;
        }
      },
    });
  }, [store, dispatch]);

  /* One-shot participant bootstrap: try to mint an access token from the
     httpOnly refresh cookie. Admin/scanner are already preloaded from storage. */
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    /* first client render is now behind us — auth-gated UI can reveal */
    setHydrated(true);
    fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { accessToken: string };
          dispatch(setToken({ role: "participant", token: data.accessToken }));
        }
      })
      .catch(() => {})
      .finally(() => setBootstrapped(true));
  }, [dispatch]);

  const value = useMemo(() => ({ hydrated, bootstrapped }), [hydrated, bootstrapped]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth hooks must be used within <AuthProvider>");
  return ctx;
}

/* ---- role-scoped facades: components use these, never Redux/Query directly -- */

export function useAdminAuth() {
  const session = useAppSelector((s) => s.auth.sessions.admin);
  const login = useAdminLogin();
  const logout = useLogout("admin");
  return {
    user: session.user,
    token: session.token,
    isAuthenticated: !!session.token,
    login,
    logout,
  };
}

export function useScannerAuth() {
  const session = useAppSelector((s) => s.auth.sessions.scanner);
  const login = useScannerLogin();
  const logout = useLogout("scanner");
  return {
    user: session.user,
    token: session.token,
    isAuthenticated: !!session.token,
    login,
    logout,
  };
}

export function useParticipantAuth() {
  const { bootstrapped } = useAuthContext();
  const session = useAppSelector((s) => s.auth.sessions.participant);
  const requestLink = useParticipantLink();
  const verify = useParticipantVerify();
  const logout = useLogout("participant");
  /* keep the identity fresh once we hold a token */
  const me = useParticipantMe(!!session.token);
  return {
    user: session.user,
    token: session.token,
    isAuthenticated: !!session.token,
    isLoading: !bootstrapped || (!!session.token && me.isLoading),
    requestLink,
    verify,
    logout,
    me,
  };
}

/* generic accessor keyed off whichever role is active */
export function useAuth() {
  const activeRole = useAppSelector((s) => s.auth.activeRole);
  const sessions = useAppSelector((s) => s.auth.sessions);
  const { hydrated, bootstrapped } = useAuthContext();
  const session = activeRole ? sessions[activeRole] : null;
  return {
    activeRole,
    user: session?.user ?? null,
    isAuthenticated: !!session?.token,
    hydrated,
    bootstrapped,
  };
}

/* true once the client has hydrated — gate any UI that branches on the
   localStorage-backed admin/scanner session to avoid a hydration mismatch */
export function useAuthHydrated(): boolean {
  return useAuthContext().hydrated;
}

/* Redirect to the role's login when unauthenticated. Waits for hydration (and,
   for the participant, the refresh bootstrap) so it neither mismatches on
   hydration nor bounces mid-refresh. `ready` gates auth-dependent rendering. */
export function useRequireAuth(role: Role, redirectTo?: string) {
  const router = useRouter();
  const { hydrated, bootstrapped } = useAuthContext();
  const session = useAppSelector((s) => s.auth.sessions[role]);
  const ready = hydrated && (role === "participant" ? bootstrapped : true);

  useEffect(() => {
    if (ready && !session.token) {
      router.replace(redirectTo ?? LOGIN_ROUTE[role]);
    }
  }, [ready, session.token, role, redirectTo, router]);

  return { session, ready, isAuthenticated: !!session.token };
}
