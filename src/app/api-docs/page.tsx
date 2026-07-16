"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import { useRequireAuth } from "@/context/AuthContext";

/* Standalone Swagger UI, the conventional /api-docs page. The spec behind it
   (/api/docs) is super-admin only, so the page fetches it with the stored
   admin token and sends anyone without a session to the admin login. */
const SWAGGER_VERSION = "5.17.14";
const CSS_URL = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
const JS_URL = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: Record<string, unknown>) => unknown;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Swagger UI"));
    document.head.appendChild(s);
  });
}

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

export default function ApiDocsPage() {
  const { isAuthenticated } = useRequireAuth("admin", "/admin");
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /* the guard above redirects unauthenticated visitors; wait for it */
    if (!isAuthenticated) return;

    (async () => {
      try {
        const spec = await api<Record<string, unknown>>("/api/docs", { role: "admin" });
        loadCss(CSS_URL);
        await loadScript(JS_URL);
        if (cancelled || !mountRef.current || !window.SwaggerUIBundle) return;
        window.SwaggerUIBundle({
          spec,
          domNode: mountRef.current,
          deepLinking: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 0,
          tryItOutEnabled: true,
          persistAuthorization: true,
        });
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 401) {
          setError("The API documentation is available to super admins only.");
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load the API documentation");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-white">
      {error && (
        <div className="mx-auto max-w-2xl p-8">
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}
      {!error && !ready && (
        <div className="p-8 text-sm text-neutral-500">Loading Swagger UI…</div>
      )}
      <div ref={mountRef} />
    </div>
  );
}
