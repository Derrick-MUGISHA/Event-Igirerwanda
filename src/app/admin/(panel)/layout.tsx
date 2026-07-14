"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { clearToken, getToken } from "@/lib/client";
import NotificationBell from "@/components/admin/NotificationBell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  superOnly?: boolean;
};

const LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/admin/attendees", label: "Attendees", short: "People", icon: Users },
  { href: "/admin/guests", label: "Guests", short: "Guests", icon: UserPlus },
  { href: "/admin/scan", label: "Scan tickets", short: "Scan", icon: ScanLine },
  { href: "/admin/events", label: "Events", short: "Events", icon: CalendarDays, superOnly: true },
  { href: "/admin/admins", label: "Mini admins", short: "Admins", icon: ShieldCheck, superOnly: true },
  { href: "/admin/organizations", label: "Organizations", short: "Orgs", icon: Building2, superOnly: true },
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

  const links = LINKS.filter((l) => !l.superOnly || role === "SUPER_ADMIN");
  const signOut = () => {
    clearToken("admin");
    localStorage.removeItem("iems_admin_role");
    router.replace("/admin");
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* top bar: brand always; the nav joins it on md+ */}
      <header className="sticky top-0 z-40 border-b border-line bg-panel/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <Image src="/iro-logo.svg" alt="" width={36} height={36} priority className="h-9 w-9" />
            <span className="display text-lg text-cream">IEMS Admin</span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {links.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-orange/15 font-semibold text-orange"
                      : "text-cream-dim hover:bg-panel-2 hover:text-cream"
                  )}
                >
                  <l.icon className="size-4" />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              onClick={signOut}
              className="gap-2 text-cream-dim hover:text-terracotta"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* room for the bottom tab bar on phones */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-5 pb-28 md:p-8 md:pb-8">{children}</main>

      {/* bottom tab bar, phones only */}
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <ul className="flex overflow-x-auto">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href} className="min-w-16 flex-1">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 px-2 pb-2.5 pt-2 text-[10px] font-semibold transition-colors",
                    active ? "text-orange" : "text-cream-dim hover:text-cream"
                  )}
                >
                  <span className={cn("rounded-xl px-3 py-1", active && "bg-orange/15")}>
                    <l.icon className="size-5" />
                  </span>
                  {l.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
