/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { StatusBadge } from "./ui";

/* Event pass styled like a real ticket: main body + a perforated
   tear-off stub carrying the QR code. Mirrored by the ticket email
   and the PDF attachment. */
export default function IdCard({
  name,
  role,
  type,
  photoUrl,
  eventName,
  eventDate,
  venue,
  qrDataUrl,
  code,
  status,
}: {
  name: string;
  /** subtitle under the name — position, cohort, or relationship */
  role?: string;
  type: "PARTICIPANT" | "PLUS_ONE" | "GUEST";
  photoUrl?: string | null;
  eventName: string;
  eventDate?: string | Date | null;
  venue?: string;
  qrDataUrl: string;
  code: string;
  status: string;
}) {
  const d = eventDate ? new Date(eventDate) : null;
  const dateLabel = d
    ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "";
  const timeLabel = d
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  const typeLabel = type === "PLUS_ONE" ? "GUEST" : type;

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] sm:flex-row">
      {/* main body */}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 bg-orange px-5 py-2.5">
          <span className="flex items-center gap-2.5">
            <Image
              src="/iro-logo.svg"
              alt=""
              width={26}
              height={26}
              className="h-7 w-7 rounded-full bg-bg/20 p-0.5"
            />
            <span className="label text-[11px] font-bold text-bg">
              Igire Rwanda Organization · Event Pass
            </span>
          </span>
          <span className="label rounded-full bg-bg/20 px-3 py-0.5 text-[10px] font-bold text-bg">
            {typeLabel}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <p className="display text-xl uppercase leading-tight text-orange sm:text-2xl">
            {eventName}
          </p>

          <div className="mt-4 flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Photo of ${name}`}
                className="h-20 w-20 shrink-0 rounded-xl border-2 border-orange object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-line text-2xl text-cream-dim">
                ?
              </div>
            )}
            <div className="min-w-0">
              <p className="label text-[10px] font-semibold text-cream-dim">Admits</p>
              <p className="display truncate text-2xl uppercase leading-tight text-cream">
                {name}
              </p>
              {role && (
                <p className="mt-0.5 truncate text-sm font-semibold text-sage">{role}</p>
              )}
            </div>
          </div>

          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {dateLabel && (
              <div>
                <dt className="label text-[10px] font-semibold text-cream-dim">Date</dt>
                <dd className="font-semibold text-cream">{dateLabel}</dd>
              </div>
            )}
            {timeLabel && (
              <div>
                <dt className="label text-[10px] font-semibold text-cream-dim">Time</dt>
                <dd className="font-semibold text-cream">{timeLabel}</dd>
              </div>
            )}
            {venue && (
              <div>
                <dt className="label text-[10px] font-semibold text-cream-dim">Venue</dt>
                <dd className="font-semibold text-cream">{venue}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* perforation between body and stub */}
      <div className="relative mx-5 border-t-2 border-dashed border-line sm:mx-0 sm:my-5 sm:border-l-2 sm:border-t-0">
        <span className="absolute -left-3 -top-2.5 h-5 w-5 rounded-full bg-bg sm:-left-2.5 sm:-top-8" aria-hidden="true" />
        <span className="absolute -right-3 -top-2.5 h-5 w-5 rounded-full bg-bg sm:-bottom-8 sm:-left-2.5 sm:right-auto sm:top-auto" aria-hidden="true" />
      </div>

      {/* tear-off stub with the QR */}
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 p-5 sm:w-56 sm:p-6">
        <p className="label text-[10px] font-bold tracking-[0.3em] text-orange">Admit One</p>
        <img
          src={qrDataUrl}
          alt="Ticket QR code"
          className="h-36 w-36 rounded-lg bg-white p-1.5"
        />
        <p className="label max-w-44 truncate text-[9px] tracking-widest text-cream-dim">
          {code}
        </p>
        <StatusBadge value={status} />
      </div>
    </div>
  );
}
