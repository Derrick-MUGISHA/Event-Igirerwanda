"use client";

import Scanner from "@/components/portal/Scanner";

export default function AdminScanPage() {
  return (
    <div className="space-y-5">
      <h1 className="display text-3xl text-cream">Scan tickets</h1>
      <p className="max-w-md text-sm text-cream-dim">
        Point the camera at an attendee&apos;s QR code. Each ticket admits once — a second scan is
        flagged automatically.
      </p>
      <Scanner role="admin" />
    </div>
  );
}
