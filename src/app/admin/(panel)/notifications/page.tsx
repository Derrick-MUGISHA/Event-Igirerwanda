"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, XCircle } from "lucide-react";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/admin/dashboard";
import { adminKeys } from "@/hooks/admin/keys";
import { subscribeLive } from "@/lib/liveStream";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/admin/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminNotification } from "@/types/admin";

const ICON = {
  success: <CheckCircle2 className="size-4 text-green-600" />,
  warning: <AlertTriangle className="size-4 text-amber-600" />,
  error: <XCircle className="size-4 text-red-500" />,
  info: <Info className="size-4 text-sky-600" />,
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isPending, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  /* live push: prepend new notifications straight into the cache */
  useEffect(() => {
    return subscribeLive("admin", {
      onNotification: (n) => {
        qc.setQueryData<{ notifications: AdminNotification[]; unread: number }>(
          adminKeys.notifications,
          (old) => {
            if (!old || old.notifications.some((x) => x.id === n.id)) return old;
            return {
              notifications: [{ ...n, read: false }, ...old.notifications].slice(0, 50),
              unread: old.unread + 1,
            };
          }
        );
      },
    });
  }, [qc]);

  const items = data?.notifications ?? [];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description="Gate check-ins, guest activity and system alerts."
        actions={
          <Button
            variant="outline"
            onClick={() => markRead.mutate(undefined)}
            disabled={markRead.isPending || (data?.unread ?? 0) === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        }
      />

      {isPending ? (
        <TableSkeleton rows={6} cols={1} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notifications"
          message="Activity from the gate and your team shows up here."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "flex flex-row items-start gap-3 p-4 shadow-none transition-colors",
                !n.read && "border-primary/30 bg-primary/5"
              )}
            >
              <span className="mt-0.5">{ICON[n.severity]}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => markRead.mutate([n.id])}
                >
                  Mark read
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
