/* Build an absolute app URL from NEXT_PUBLIC_APP_URL without doubling slashes —
   the env value may or may not carry a trailing slash. */
export function appUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}
