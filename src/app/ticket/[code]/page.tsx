import { dbConnect } from "@/lib/db";
import { Attendee, Event, Ticket } from "@/models";
import { ticketQrDataUrl } from "@/lib/qr";
import { attendeeRoleLine } from "@/lib/tickets";
import { PortalShell, Panel } from "@/components/portal/ui";
import IdCard from "@/components/portal/IdCard";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  await dbConnect();
  const ticket = await Ticket.findOne({ code });
  if (!ticket) {
    return (
      <PortalShell eyebrow="Ticket" title="Not found">
        <Panel>
          <p className="text-sm text-cream-dim">This ticket does not exist.</p>
        </Panel>
      </PortalShell>
    );
  }

  const [attendee, event] = await Promise.all([
    Attendee.findById(ticket.attendee),
    Event.findById(ticket.event),
  ]);
  const [qr, role] = await Promise.all([
    ticketQrDataUrl(ticket.code, {
      name: attendee?.fullName,
      type: attendee?.type,
      eventName: event?.name,
    }),
    attendee ? attendeeRoleLine(attendee) : Promise.resolve(undefined),
  ]);

  return (
    <PortalShell eyebrow="Event pass" title={attendee?.fullName ?? "Ticket"} wide>
      <IdCard
        name={attendee?.fullName ?? "Attendee"}
        role={role}
        type={attendee?.type ?? "GUEST"}
        photoUrl={attendee?.photoUrl ?? null}
        eventName={event?.name ?? "Event"}
        eventDate={event?.date}
        venue={event?.venue}
        qrDataUrl={qr}
        code={ticket.code}
        status={ticket.status}
      />
    </PortalShell>
  );
}
