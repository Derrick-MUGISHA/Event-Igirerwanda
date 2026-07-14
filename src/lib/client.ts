/* Browser-side helpers: token storage + JSON fetch with auth */

export type TokenKind = "attendee" | "admin" | "org";

const KEYS: Record<TokenKind, string> = {
  attendee: "iems_attendee_token",
  admin: "iems_admin_token",
  org: "iems_org_token",
};

export function getToken(kind: TokenKind): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS[kind]);
}

export function setToken(kind: TokenKind, token: string) {
  localStorage.setItem(KEYS[kind], token);
}

export function clearToken(kind: TokenKind) {
  localStorage.removeItem(KEYS[kind]);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; token?: TokenKind; form?: FormData } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) {
    const t = getToken(opts.token);
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(path, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? "Something went wrong", res.status);
  return data as T;
}
