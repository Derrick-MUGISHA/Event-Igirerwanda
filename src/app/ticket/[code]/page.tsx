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
  /* after check-in the attendee record is deleted; the ticket keeps a
     holder snapshot so the pass page still shows who it belonged to */
  const holder = attendee
    ? { fullName: attendee.fullName, type: attendee.type, photoUrl: attendee.photoUrl ?? null }
    : ticket.holder
      ? {
          fullName: ticket.holder.fullName,
          type: ticket.holder.type,
          photoUrl: ticket.holder.photoUrl ?? null,
        }
      : null;
  const [qr, role] = await Promise.all([
    ticketQrDataUrl(ticket.code, {
      name: holder?.fullName,
      type: holder?.type,
      eventName: event?.name,
    }),
    attendee ? attendeeRoleLine(attendee) : Promise.resolve(undefined),
  ]);

  return (
    <PortalShell eyebrow="Event pass" title={holder?.fullName ?? "Ticket"} wide>
      <IdCard
        name={holder?.fullName ?? "Attendee"}
        role={role}
        type={(holder?.type as "PARTICIPANT" | "PLUS_ONE" | "GUEST" | undefined) ?? "GUEST"}
        photoUrl={holder?.photoUrl ?? null}
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
