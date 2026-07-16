"use client";

import { bridgeGetToken } from "./authBridge";
import type { Role } from "@/store/authSlice";
import type { NotificationEvent, ScanEvent } from "./scanBus";

/* One EventSource per tab, shared by every live widget (notification bell,
   dashboard feed, gate scanner). Subscribers register handlers; the
   connection opens with the first subscriber and closes with the last. */

export type LiveHandlers = {
  onScan?: (event: ScanEvent) => void;
  onNotification?: (event: NotificationEvent) => void;
};

type Channel = {
  source: EventSource;
  handlers: Set<LiveHandlers>;
};

const channels = new Map<string, Channel>();

export function subscribeLive(role: Role, handlers: LiveHandlers): () => void {
  const raw = bridgeGetToken(role);
  if (!raw) return () => {};

  let channel = channels.get(raw);
  if (!channel) {
    const source = new EventSource(`/api/admin/scans/stream?token=${encodeURIComponent(raw)}`);
    const created: Channel = { source, handlers: new Set() };
    source.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as ScanEvent;
        for (const h of created.handlers) h.onScan?.(event);
      } catch {
        /* malformed frame */
      }
    };
    source.addEventListener("notification", (msg) => {
      try {
        const event = JSON.parse((msg as MessageEvent).data) as NotificationEvent;
        for (const h of created.handlers) h.onNotification?.(event);
      } catch {
        /* malformed frame */
      }
    });
    channels.set(raw, created);
    channel = created;
  }

  channel.handlers.add(handlers);
  return () => {
    channel.handlers.delete(handlers);
    if (channel.handlers.size === 0) {
      channel.source.close();
      channels.delete(raw);
    }
  };
}

/* Public counterpart for the landing page: one connection shared by Nav,
   Hero and the calendar; fires whenever event content changes. */
const publicListeners = new Set<() => void>();
let publicSource: EventSource | null = null;

export function subscribeEventsFeed(onChange: () => void): () => void {
  publicListeners.add(onChange);
  if (!publicSource) {
    publicSource = new EventSource("/api/events/stream");
    publicSource.onmessage = () => {
      for (const listener of publicListeners) listener();
    };
  }
  return () => {
    publicListeners.delete(onChange);
    if (publicListeners.size === 0) {
      publicSource?.close();
      publicSource = null;
    }
  };
}
