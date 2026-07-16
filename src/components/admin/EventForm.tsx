"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventFormSchema, type EventFormInput, type EventFormValues } from "@/schemas/admin";
import { EVENT_CATEGORIES, EVENT_TYPES, EVENT_STATUSES } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EventFormProps = {
  mode: "create" | "edit";
  defaultValues?: Partial<EventFormInput>;
  submitting?: boolean;
  onSubmit: (values: EventFormValues) => void;
  onCancel?: () => void;
};

const BASE: EventFormInput = {
  name: "",
  slug: "",
  category: "Mentorship",
  type: "WORKSHOP",
  startTime: "",
  endTime: "",
  gallery: [],
  organiser: "Igire Rwanda Organization",
  maxAttendees: 0,
  details: "",
  rules: [],
  price: "Free",
  location: "",
  isPublished: false,
  status: "DRAFT",
};

export function EventForm({ mode, defaultValues, submitting, onSubmit, onCancel }: EventFormProps) {
  const form = useForm<EventFormInput, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: { ...BASE, ...defaultValues },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <section className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Event name</FormLabel>
                <FormControl>
                  <Input placeholder="Women in Tech Night" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {mode === "create" && (
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="women-in-tech-night" {...field} />
                  </FormControl>
                  <FormDescription>Lowercase, hyphenated. Can&apos;t change later.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {mode === "edit" && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </section>

        <section className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Starts</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ends (optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Main Hall, Kigali" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="organiser"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organiser</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxAttendees"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={String(field.value ?? "")}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>0 = uncapped.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input placeholder="Free" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Details</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="What the session is about…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rules &amp; regulations</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="One rule per line"
                  value={(field.value ?? []).join("\n")}
                  onChange={(e) =>
                    field.onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))
                  }
                />
              </FormControl>
              <FormDescription>One rule per line.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gallery"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gallery images</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="https://…/poster.jpg&#10;https://…/photo.jpg"
                  value={(field.value ?? []).join("\n")}
                  onChange={(e) =>
                    field.onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean))
                  }
                />
              </FormControl>
              <FormDescription>
                One image URL per line. {mode === "edit" ? "" : "After creating, you can also upload images from the event page."}
              </FormDescription>
              <FormMessage />
              {(field.value ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(field.value ?? []).map((url: string) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt=""
                      className="size-14 rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <FormLabel>Published</FormLabel>
                <FormDescription>Show this event on the public calendar.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "create" ? "Create event" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
