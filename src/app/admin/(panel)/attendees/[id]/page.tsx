"use client";

/* eslint-disable @next/next/no-img-element */
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mail, Pencil, Phone, Trash2, UserRound, X } from "lucide-react";
import {
  useParticipant,
  useSetRegistrationStatus,
  useDeleteParticipant,
} from "@/hooks/admin/participants";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TicketPanel } from "@/components/admin/TicketPanel";
import { ScanHistory } from "@/components/admin/ScanHistory";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TableSkeleton, EmptyState } from "@/components/admin/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParticipantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isPending, error } = useParticipant(id);
  const setReg = useSetRegistrationStatus();
  const del = useDeleteParticipant();

  if (isPending) return <TableSkeleton rows={5} cols={2} />;
  if (error || !data)
    return (
      <EmptyState
        title="Participant not found"
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/attendees">Back to participants</Link>
          </Button>
        }
      />
    );

  const p = data.participant;

  return (
    <div>
      <PageHeader
        title={p.name}
        crumbs={[{ label: "Participants", href: "/admin/attendees" }, { label: p.name }]}
        actions={
          <>
            {p.registrationStatus !== "APPROVED" && (
              <Button
                variant="outline"
                onClick={() => setReg.mutate({ id, registrationStatus: "APPROVED" })}
              >
                <Check className="size-4" />
                Approve
              </Button>
            )}
            {p.registrationStatus !== "REJECTED" && (
              <Button
                variant="outline"
                onClick={() => setReg.mutate({ id, registrationStatus: "REJECTED" })}
              >
                <X className="size-4" />
                Reject
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href={`/admin/attendees/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="icon" className="text-red-600" aria-label="Delete">
                  <Trash2 className="size-4" />
                </Button>
              }
              title="Delete this participant?"
              description="Removes the participant, their plus-one and tickets."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await del.mutateAsync(id);
                router.push("/admin/attendees");
              }}
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-5 flex items-center gap-4">
                {p.profilePicture ? (
                  <img
                    src={p.profilePicture}
                    alt=""
                    className="size-16 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <UserRound className="size-7" />
                  </span>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={p.registrationStatus} />
                  <StatusBadge value={p.status} />
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <Row icon={Mail} label="Email" value={p.email} />
                <Row icon={Phone} label="Phone" value={p.phone ?? "—"} />
                <Row label="Stack" value={p.stack ?? "—"} />
                <Row label="Gender" value={p.gender ?? "—"} />
                <Row label="Event" value={p.event?.name ?? "—"} />
                <Row label="Registered" value={new Date(p.registeredAt).toLocaleDateString()} />
              </dl>
            </CardContent>
          </Card>

          {data.plusOne && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Plus one</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <Row label="Name" value={data.plusOne.name} />
                  <Row label="Email" value={data.plusOne.email} />
                  <Row label="Type" value={data.plusOne.guestType} />
                  <Row label="Attendance" value={data.plusOne.attendanceStatus} />
                </dl>
              </CardContent>
            </Card>
          )}

          <ScanHistory history={data.attendance.history} />
        </div>

        <TicketPanel ticket={data.ticket} />
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-medium capitalize text-foreground">{value}</dd>
      </div>
    </div>
  );
}
