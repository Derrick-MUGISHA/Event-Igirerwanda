"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Hourglass,
  ShieldX,
  XCircle,
} from "lucide-react";
import { api, type TokenKind } from "@/lib/client";
import { subscribeLive } from "@/lib/liveStream";
import type { ScanEvent } from "@/lib/scanBus";
import { Panel, Note, Spinner } from "./ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ScanResponse = ScanEvent & { cohort?: string | null };

/* feed entries carry the gate snapshot only for scans made on this device */
type FeedItem = ScanEvent & { snapshot?: string };

const RESULT_STYLE: Record<
  ScanEvent["result"],
  { label: string; icon: typeof CheckCircle2; className: string; iconClass: string; dot: string }
> = {
  ACCEPTED: {
    label: "Welcome in",
    icon: CheckCircle2,
    className: "border-green",
    iconClass: "text-green",
    dot: "bg-green",
  },
  ALREADY_USED: {
    label: "Already used",
    icon: XCircle,
    className: "border-terracotta",
    iconClass: "text-terracotta",
    dot: "bg-terracotta",
  },
  REVOKED: {
    label: "Revoked pass",
    icon: ShieldX,
    className: "border-terracotta",
    iconClass: "text-terracotta",
    dot: "bg-terracotta",
  },
  INVALID: {
    label: "Invalid ticket",
    icon: XCircle,
    className: "border-terracotta",
    iconClass: "text-terracotta",
    dot: "bg-terracotta",
  },
  EXPIRED: {
    label: "Ticket expired",
    icon: Hourglass,
    className: "border-tan",
    iconClass: "text-tan",
    dot: "bg-tan",
  },
};

const FEED_KEY = ["gate-feed"];
const FEED_LIMIT = 30;

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const dateTimeOf = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/* the one-line verdict explanation: when it was used, when it expires */
function verdictDetail(e: FeedItem): string {
  switch (e.result) {
    case "ACCEPTED":
      return `Checked in at ${timeOf(e.usedAt ?? e.at)}${
        e.expiresAt ? ` · pass valid until ${dateTimeOf(e.expiresAt)}` : ""
      }`;
    case "ALREADY_USED":
      return e.usedAt
        ? `This pass was already used at ${dateTimeOf(e.usedAt)} — entry denied.`
        : "This pass has already been used — entry denied.";
    case "EXPIRED":
      return e.expiresAt
        ? `The event ended ${dateTimeOf(e.expiresAt)} — this pass is no longer valid.`
        : "This event has ended — the pass is no longer valid.";
    case "REVOKED":
      return "This pass was revoked by an admin.";
    case "INVALID":
      return "This code is not one of our signed tickets.";
  }
}

/* Gate scanner: the camera stays on between scans, a frame is captured as
   evidence for each verdict, results land instantly in the shared feed
   cache, and scans from other gates stream in live. */
export default function Scanner({ token }: { token: TokenKind }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const lastRef = useRef<{ payload: string; at: number }>({ payload: "", at: 0 });
  const snapshotRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  /* the feed lives in the query cache so it survives tab switches */
  const { data: feed = [] } = useQuery<FeedItem[]>({
    queryKey: FEED_KEY,
    queryFn: () => [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const latest = feed[0];

  const pushToFeed = (event: FeedItem) => {
    queryClient.setQueryData<FeedItem[]>(FEED_KEY, (old = []) => {
      if (old.some((e) => e.at === event.at)) return old; /* SSE echo of our own scan */
      return [event, ...old].slice(0, FEED_LIMIT);
    });
  };

  const scan = useMutation({
    mutationFn: (qr: string) => api<ScanResponse>("/api/scan", { token, body: { qr } }),
    onSuccess: (res) => {
      pushToFeed({ ...res, snapshot: snapshotRef.current ?? undefined });
      snapshotRef.current = null;
      navigator.vibrate?.(res.result === "ACCEPTED" ? 90 : [70, 60, 70]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Scan failed"),
  });
  const scanRef = useRef(scan);
  useEffect(() => {
    scanRef.current = scan;
  }, [scan]);

  /* live feed from every gate */
  useEffect(() => {
    return subscribeLive(token, { onScan: pushToFeed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("qr-reader");

    /* freeze the moment of the scan: one JPEG frame off the live video */
    const captureFrame = (): string | null => {
      const video = document.querySelector<HTMLVideoElement>("#qr-reader video");
      if (!video || !video.videoWidth) return null;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        return canvas.toDataURL("image/jpeg", 0.7);
      } catch {
        return null;
      }
    };

    const onDecode = (decoded: string) => {
      /* same code held up to the camera fires many frames — take one */
      const now = Date.now();
      if (decoded === lastRef.current.payload && now - lastRef.current.at < 4000) return;
      if (scanRef.current.isPending) return;
      lastRef.current = { payload: decoded, at: now };
      snapshotRef.current = captureFrame();
      scanRef.current.mutate(decoded);
    };
    const config = { fps: 12, qrbox: { width: 260, height: 260 } };

    (async () => {
      try {
        /* phones: back camera. laptops have no "environment" camera, so
           fall back to whatever camera exists */
        await scanner.start({ facingMode: "environment" }, config, onDecode, () => {});
      } catch {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!cameras.length) throw new Error("No camera found on this device");
          const back = cameras.find((c) => /back|rear|environment/i.test(c.label));
          await scanner.start((back ?? cameras[0]).id, config, onDecode, () => {});
        } catch (err) {
          setError(
            err instanceof Error
              ? `${err.message} — the camera needs HTTPS (or localhost) and permission.`
              : "Could not start the camera"
          );
          setScanning(false);
        }
      }
    })();

    return () => {
      /* let the library tear its own video element down — yanking the
         container out of the DOM mid-stream triggers onabort errors */
      if (scanner.isScanning) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      } else {
        try {
          scanner.clear();
        } catch {
          /* nothing to clear */
        }
      }
    };
  }, [scanning]);

  return (
    <div className="max-w-md space-y-4">
      {/* the camera container stays mounted; CSS hides it when idle */}
      <Panel className={scanning ? "" : "hidden"}>
        <div id="qr-reader" className="overflow-hidden rounded-lg" />
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-cream-dim">
          {scan.isPending ? (
            <>
              <Spinner className="h-3.5 w-3.5 text-orange" /> Checking ticket…
            </>
          ) : (
            "Hold a pass in front of the camera — scanning is continuous."
          )}
        </p>
        <Button variant="outline" className="mt-3 w-full gap-2" onClick={() => setScanning(false)}>
          <CameraOff className="size-4" /> Stop camera
        </Button>
      </Panel>
      {!scanning && (
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => {
            setError("");
            setScanning(true);
          }}
        >
          <Camera className="size-4" /> Start scanning
        </Button>
      )}

      {/* latest verdict, big and unmissable */}
      <AnimatePresence mode="popLayout">
        {latest && (
          <motion.div
            key={latest.at}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <VerdictCard item={latest} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* live gate feed, newest first */}
      {feed.length > 1 && (
        <Panel>
          <h3 className="label mb-3 flex items-center gap-2 text-xs font-bold text-orange">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full animate-ping rounded-full bg-green opacity-60" />
              <span className="h-2 w-2 rounded-full bg-green" />
            </span>
            Live gate activity
          </h3>
          <ul className="space-y-2">
            {feed.slice(1, 8).map((e) => (
              <li key={e.at} className="flex items-center gap-2.5 text-sm">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", RESULT_STYLE[e.result].dot)} />
                <span className="min-w-0 flex-1 truncate text-cream">
                  {e.attendee?.fullName ?? "Unknown ticket"}
                </span>
                <Badge
                  variant="outline"
                  className={cn("border-0 text-[10px] font-bold", {
                    "bg-green/15 text-green": e.result === "ACCEPTED",
                    "bg-terracotta/15 text-terracotta":
                      e.result === "ALREADY_USED" || e.result === "REVOKED" || e.result === "INVALID",
                    "bg-tan/15 text-tan": e.result === "EXPIRED",
                  })}
                >
                  {RESULT_STYLE[e.result].label}
                </Badge>
                <span className="shrink-0 text-xs text-cream-dim">{timeOf(e.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {error && <Note tone="error">{error}</Note>}
    </div>
  );
}

function VerdictCard({ item }: { item: FeedItem }) {
  const style = RESULT_STYLE[item.result];
  const Icon = style.icon;
  return (
    <Panel className={cn("border-2", style.className)}>
      <div className="flex items-center gap-3">
        <Icon className={cn("size-9 shrink-0", style.iconClass)} />
        <p className={cn("display text-2xl", style.iconClass)}>{style.label}</p>
      </div>

      {item.attendee && (
        <div className="mt-4 flex items-center gap-3">
          {item.attendee.photoUrl && (
            <img
              src={item.attendee.photoUrl}
              alt=""
              className="h-14 w-14 rounded-full border border-line object-cover"
            />
          )}
          <div className="text-sm text-cream">
            <p className="font-semibold">{item.attendee.fullName}</p>
            <p className="text-cream-dim">
              {item.attendee.type === "PLUS_ONE" ? "GUEST" : item.attendee.type}
              {item.eventName ? ` · ${item.eventName}` : ""}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 text-sm text-cream-dim">
        <Clock className="mt-0.5 size-4 shrink-0" />
        {verdictDetail(item)}
      </p>

      {/* the frame captured the instant this ticket was scanned */}
      {item.snapshot && (
        <div className="mt-4">
          <p className="label mb-1.5 text-[10px] font-semibold text-cream-dim">Gate snapshot</p>
          <img
            src={item.snapshot}
            alt="Frame captured at scan time"
            className="max-h-40 w-full rounded-lg border border-line object-cover"
          />
        </div>
      )}
    </Panel>
  );
}
