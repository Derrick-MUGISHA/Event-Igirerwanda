import { Schema, model, models, type Model, type Types } from "mongoose";

export const EVENT_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/* IRO's real program areas — drives the public calendar colour coding */
export const EVENT_CATEGORIES = [
  "SheCanCODE",
  "Entrepreneurship",
  "Web Fundamentals",
  "Advanced Backend",
  "Advanced Frontend",
  "Mentorship",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface EventDoc {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  date: Date;
  /** when it wraps up — optional; the public site hides the end time if unset */
  endDate?: Date | null;
  venue: string;
  category: EventCategory;
  price: string;
  description: string;
  /** private events don't appear on the public calendar — participants
      are pre-registered and reach them through the ticket portal */
  isPublic: boolean;
  rules: string[];
  maxParticipants: number;
  maxMiniAdmins: number;
  status: EventStatus;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<EventDoc>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    date: { type: Date, required: true },
    endDate: { type: Date, default: null },
    venue: { type: String, default: "" },
    category: { type: String, enum: EVENT_CATEGORIES, default: "Mentorship" },
    price: { type: String, default: "Free" },
    description: { type: String, default: "" },
    isPublic: { type: Boolean, default: true },
    rules: { type: [String], default: [] },
    maxParticipants: { type: Number, default: 200 },
    maxMiniAdmins: { type: Number, default: 10 },
    status: { type: String, enum: EVENT_STATUSES, default: "OPEN" },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

export const Event: Model<EventDoc> =
  (models.Event as Model<EventDoc>) ?? model<EventDoc>("Event", EventSchema);
