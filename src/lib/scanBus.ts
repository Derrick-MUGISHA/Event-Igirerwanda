import { EventEmitter } from "events";

/* In-process pub/sub for gate activity: every /api/scan hit is published
   here and streamed live to admin dashboards over SSE. Kept on globalThis
   so dev-server module reloads don't drop subscribers. */

export type ScanEvent = {
  at: string;
  result: "ACCEPTED" | "ALREADY_USED" | "INVALID" | "REVOKED";
  attendee?: { fullName: string; type: string; photoUrl: string | null } | null;
  eventName?: string | null;
};

const globalBus = globalThis as unknown as { __iemsScanBus?: EventEmitter };
const bus = (globalBus.__iemsScanBus ??= new EventEmitter().setMaxListeners(100));

export function publishScan(event: ScanEvent) {
  bus.emit("scan", event);
}

export function subscribeScans(listener: (event: ScanEvent) => void): () => void {
  bus.on("scan", listener);
  return () => bus.off("scan", listener);
}
