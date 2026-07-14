"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/client";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/attendees", label: "Attendees" },
  { href: "/admin/guests", label: "Guests" },
  { href: "/admin/scan", label: "Scan tickets" },
  { href: "/admin/events", label: "Events", superOnly: true },
  { href: "/admin/admins", label: "Mini admins", superOnly: true },
  { href: "/admin/organizations", label: "Organizations", superOnly: true },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken("admin")) {
      router.replace("/admin");
      return;
    }
    setRole(localStorage.getItem("iems_admin_role"));
  }, [router]);

  if (!role) return null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-1 border-b border-line bg-panel p-4 md:w-60 md:border-b-0 md:border-r">
        <Link href="/" className="mb-4 flex items-center gap-2.5 px-2">
          <Image src="/iro-logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <span className="display text-lg text-cream">IEMS Admin</span>
        </Link>
        <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
          {LINKS.filter((l) => !l.superOnly || role === "SUPER_ADMIN").map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname.startsWith(l.href)
                  ? "bg-panel-2 font-semibold text-orange"
                  : "text-cream-dim hover:text-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => {
            clearToken("admin");
            localStorage.removeItem("iems_admin_role");
            router.replace("/admin");
          }}
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-cream-dim transition-colors hover:text-terracotta"
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
