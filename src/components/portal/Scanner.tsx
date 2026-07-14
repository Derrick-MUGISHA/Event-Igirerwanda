"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken, type TokenKind } from "@/lib/client";
import type { ScanEvent } from "@/lib/scanBus";
import { Panel, Button, Note, Spinner } from "./ui";

type ScanResponse = ScanEvent & { scannedAt?: string | null; cohort?: string | null };

const RESULT_STYLE: Record<ScanEvent["result"], { label: string; className: string; dot: string }> = {
  ACCEPTED: { label: "Welcome in", className: "border-green text-green", dot: "bg-green" },
  ALREADY_USED: { label: "Already used", className: "border-terracotta text-terracotta", dot: "bg-terracotta" },
  REVOKED: { label: "Revoked", className: "border-terracotta text-terracotta", dot: "bg-terracotta" },
  INVALID: { label: "Invalid ticket", className: "border-terracotta text-terracotta", dot: "bg-terracotta" },
};

const FEED_KEY = ["gate-feed"];
const FEED_LIMIT = 30;

/* Gate scanner: the camera stays on between scans, results land instantly
   in the shared feed cache, and scans from other gates stream in live. */
export default function Scanner({ token }: { token: TokenKind }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const lastRef = useRef<{ payload: string; at: number }>({ payload: "", at: 0 });
  const queryClient = useQueryClient();

  /* the feed lives in the query cache so it survives tab switches */
  const { data: feed = [] } = useQuery<ScanEvent[]>({
    queryKey: FEED_KEY,
    queryFn: () => [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const latest = feed[0];

  const pushToFeed = (event: ScanEvent) => {
    queryClient.setQueryData<ScanEvent[]>(FEED_KEY, (old = []) => {
      if (old.some((e) => e.at === event.at)) return old; /* SSE echo of our own scan */
      return [event, ...old].slice(0, FEED_LIMIT);
    });
  };

  const scan = useMutation({
    mutationFn: (qr: string) => api<ScanResponse>("/api/scan", { token, body: { qr } }),
    onSuccess: (res) => {
      pushToFeed(res);
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
    const raw = getToken(token);
    if (!raw) return;
    const source = new EventSource(`/api/admin/scans/stream?token=${encodeURIComponent(raw)}`);
    source.onmessage = (msg) => {
      try {
        pushToFeed(JSON.parse(msg.data) as ScanEvent);
      } catch {
        /* malformed frame */
      }
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("qr-reader");

    const onDecode = (decoded: string) => {
      /* same code held up to the camera fires many frames — take one */
      const now = Date.now();
      if (decoded === lastRef.current.payload && now - lastRef.current.at < 4000) return;
      if (scanRef.current.isPending) return;
      lastRef.current = { payload: decoded, at: now };
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
      if (scanner.isScanning) scanner.stop().catch(() => {});
    };
  }, [scanning]);

  return (
    <div className="max-w-md space-y-4">
      {scanning ? (
        <Panel>
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
          <Button variant="ghost" className="mt-3 w-full" onClick={() => setScanning(false)}>
            Stop camera
          </Button>
        </Panel>
      ) : (
        <Button
          className="w-full"
          onClick={() => {
            setError("");
            setScanning(true);
          }}
        >
          Start scanning
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
            <Panel className={`border-2 ${RESULT_STYLE[latest.result].className}`}>
              <p className="display text-2xl">
                {latest.result === "ACCEPTED" ? "✓" : "✗"} {RESULT_STYLE[latest.result].label}
              </p>
              {latest.attendee && (
                <div className="mt-3 flex items-center gap-3">
                  {latest.attendee.photoUrl && (
                    <img
                      src={latest.attendee.photoUrl}
                      alt=""
                      className="h-14 w-14 rounded-full border border-line object-cover"
                    />
                  )}
                  <div className="text-sm text-cream">
                    <p className="font-semibold">{latest.attendee.fullName}</p>
                    <p className="text-cream-dim">
                      {latest.attendee.type === "PLUS_ONE" ? "GUEST" : latest.attendee.type}
                      {latest.eventName ? ` · ${latest.eventName}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </Panel>
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
                <span className={`h-2 w-2 shrink-0 rounded-full ${RESULT_STYLE[e.result].dot}`} />
                <span className="min-w-0 flex-1 truncate text-cream">
                  {e.attendee?.fullName ?? "Unknown ticket"}
                </span>
                <span className="shrink-0 text-xs text-cream-dim">
                  {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {error && <Note tone="error">{error}</Note>}
    </div>
  );
}
