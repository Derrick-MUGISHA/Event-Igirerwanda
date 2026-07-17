/* Defence-in-depth against CSRF on cookie-authenticated POSTs. The refresh
   cookie is SameSite=Lax, which already blocks cross-site form/navigation POSTs
   in modern browsers; this adds an Origin allow-list as a backstop for older
   browsers and odd proxy setups.

   A request passes when it carries no Origin (same-origin fetches may omit it),
   or its Origin matches either the request's own Host (true same-origin) or the
   configured public app URL. It only rejects a present, mismatched Origin. */
export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  const host = req.headers.get("host");
  if (host) allowed.add(host);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).host);
    } catch {
      /* misconfigured env — fall back to host-only comparison */
    }
  }
  return allowed.has(originHost);
}
