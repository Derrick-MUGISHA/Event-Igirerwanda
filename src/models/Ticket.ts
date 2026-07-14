import { Schema, model, models, type Model, type Types } from "mongoose";

export const TICKET_STATUSES = ["VALID", "USED", "REVOKED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/* Copied off the attendee the moment their ticket is accepted at the gate.
   The attendee record is deleted right after (so the person is free to
   register for other events), and this snapshot keeps attendance history,
   stats and the ticket page working. */
export interface TicketHolder {
  fullName: string;
  email: string;
  phone?: string | null;
  type: string;
  cohort?: string | null;
  photoUrl?: string | null;
  addedBy?: Types.ObjectId | null;
}

export interface TicketDoc {
  _id: Types.ObjectId;
  code: string;
  event: Types.ObjectId;
  attendee: Types.ObjectId;
  holder?: TicketHolder | null;
  status: TicketStatus;
  issuedAt: Date;
  scannedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<TicketDoc>(
  {
    code: { type: String, required: true, unique: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    attendee: { type: Schema.Types.ObjectId, ref: "Attendee", required: true, unique: true },
    holder: {
      type: new Schema<TicketHolder>(
        {
          fullName: { type: String, required: true },
          email: { type: String, default: "" },
          phone: { type: String, default: null },
          type: { type: String, default: "GUEST" },
          cohort: { type: String, default: null },
          photoUrl: { type: String, default: null },
          addedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
        },
        { _id: false }
      ),
      default: null,
    },
    status: { type: String, enum: TICKET_STATUSES, default: "VALID" },
    issuedAt: { type: Date, default: () => new Date() },
    scannedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Ticket: Model<TicketDoc> =
  (models.Ticket as Model<TicketDoc>) ?? model<TicketDoc>("Ticket", TicketSchema);
