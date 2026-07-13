"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CATEGORY_COLORS, EVENTS } from "@/lib/events";

gsap.registerPlugin(ScrollTrigger);

const MONTHS = [
  { year: 2026, month: 6, label: "July 2026" },
  { year: 2026, month: 7, label: "August 2026" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

type Cell = { key: string; day: number; inMonth: boolean };

function buildCells(year: number, month: number): Cell[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      key: iso(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    };
  });
}

type View = "calendar" | "upcoming";

export default function MonthCalendar() {
  const [view, setView] = useState<View>("calendar");
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const { year, month, label } = MONTHS[index];
  const cells = buildCells(year, month);
  const now = new Date();
  const todayKey = iso(now.getFullYear(), now.getMonth(), now.getDate());

  /* days of this month that have events, for the mobile schedule view */
  const monthPrefix = iso(year, month, 1).slice(0, 8);
  const eventDays = Array.from(
    new Set(
      EVENTS.filter((e) => e.date.startsWith(monthPrefix)).map((e) => e.date)
    )
  ).sort();

  const upcoming = EVENTS.filter((e) => e.date >= todayKey).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const goMonth = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
  };

  /* Swipe left/right anywhere on the panel to flip calendar <-> upcoming */
  const onSwipe = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) {
      setView((v) => (v === "calendar" ? "upcoming" : "calendar"));
    }
  };

  return (
    <section id="calendar" ref={sectionRef} className="bg-bg py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="reveal mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="display text-3xl text-cream sm:text-4xl">
            {view === "calendar" ? label : "Upcoming events"}
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* view switch */}
            <div
              role="group"
              aria-label="Switch between calendar and upcoming events"
              className="flex rounded-lg border border-line bg-panel p-1"
            >
              {(
                [
                  ["calendar", "Calendar"],
                  ["upcoming", "Upcoming"],
                ] as [View, string][]
              ).map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  aria-pressed={view === value}
                  className={`relative rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    view === value ? "text-bg" : "text-cream hover:text-orange"
                  }`}
                >
                  {view === value && (
                    <motion.span
                      layoutId="view-pill"
                      className="absolute inset-0 rounded-md bg-orange"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{text}</span>
                </button>
              ))}
            </div>

            {view === "calendar" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goMonth(0)}
                  className="rounded-lg border border-line bg-panel px-4 py-2 text-sm font-medium text-cream transition-colors hover:border-orange hover:text-orange"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => goMonth(index - 1)}
                  disabled={index === 0}
                  aria-label="Previous month"
                  className="rounded-lg border border-line bg-panel px-3.5 py-2 text-cream transition-colors enabled:hover:border-orange enabled:hover:text-orange disabled:opacity-40"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => goMonth(index + 1)}
                  disabled={index === MONTHS.length - 1}
                  aria-label="Next month"
                  className="rounded-lg border border-line bg-panel px-3.5 py-2 text-cream transition-colors enabled:hover:border-orange enabled:hover:text-orange disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="reveal overflow-hidden rounded-xl border border-line">
          <AnimatePresence mode="wait" initial={false}>
            {view === "calendar" ? (
              <motion.div
                key="calendar"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={onSwipe}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="cursor-grab active:cursor-grabbing"
              >
                {/* mobile: schedule view, like Google Calendar */}
                <div className="bg-panel sm:hidden">
                  {eventDays.length === 0 && (
                    <p className="px-5 py-10 text-center text-sm text-cream-dim">
                      No events this month yet.
                    </p>
                  )}
                  <ul>
                    {eventDays.map((dayKey) => {
                      const d = new Date(`${dayKey}T00:00:00`);
                      const isToday = dayKey === todayKey;
                      const dayEvents = EVENTS.filter(
                        (e) => e.date === dayKey
                      );
                      return (
                        <li
                          key={dayKey}
                          className="flex gap-3 border-b border-line p-3 last:border-b-0"
                        >
                          <div className="flex w-11 shrink-0 flex-col items-center pt-1">
                            <span className="label text-[10px] font-semibold text-cream-dim">
                              {d
                                .toLocaleDateString("en-US", {
                                  weekday: "short",
                                })
                                .toUpperCase()}
                            </span>
                            <span
                              className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full text-base font-bold ${
                                isToday
                                  ? "bg-orange text-bg"
                                  : "bg-panel-2 text-cream"
                              }`}
                            >
                              {d.getDate()}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            {dayEvents.map((event) => (
                              <a
                                key={event.id}
                                href="#calendar"
                                className="block rounded-lg px-3.5 py-2.5 text-bg"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[event.category],
                                }}
                              >
                                <span className="block text-sm font-bold leading-snug">
                                  {event.title}
                                </span>
                                <span className="block text-xs font-medium opacity-80">
                                  {event.time} at {event.space} ·{" "}
                                  {event.soldOut ? "Sold out" : event.price}
                                </span>
                              </a>
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* desktop: full month grid */}
                <div className="hidden sm:block">
                <div className="grid grid-cols-7 bg-panel-2">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="label border-b border-line px-2 py-3 text-center text-xs font-semibold text-cream sm:text-sm"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: 40 * direction }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 * direction }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="grid grid-cols-7"
                  >
                    {cells.map((cell) => {
                      const dayEvents = EVENTS.filter(
                        (e) => e.date === cell.key
                      );
                      const isToday = cell.key === todayKey;
                      return (
                        <div
                          key={cell.key}
                          className={`min-h-20 border-b border-r border-line p-1.5 nth-[7n]:border-r-0 sm:min-h-28 sm:p-2 ${
                            cell.inMonth ? "bg-panel" : "bg-bg"
                          }`}
                        >
                          <div className="mb-1 flex justify-end">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm ${
                                isToday
                                  ? "bg-orange font-bold text-bg"
                                  : cell.inMonth
                                    ? "text-cream"
                                    : "text-cream-dim/50"
                              }`}
                            >
                              {cell.day}
                            </span>
                          </div>
                          {dayEvents.map((event) => (
                            <motion.a
                              key={event.id}
                              href="#calendar"
                              whileHover={{ scale: 1.04 }}
                              title={`${event.title} — ${event.time}, ${
                                event.space
                              }. ${event.soldOut ? "Sold out" : event.price}`}
                              className="mb-1 block overflow-hidden rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight wrap-break-word text-bg sm:text-xs"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[event.category],
                              }}
                            >
                              <span className="hidden sm:inline">
                                {event.time} ·{" "}
                              </span>
                              {event.title}
                              {event.soldOut && (
                                <span className="ml-1 opacity-70">
                                  (Sold out)
                                </span>
                              )}
                            </motion.a>
                          ))}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.ul
                key="upcoming"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={onSwipe}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="cursor-grab bg-panel active:cursor-grabbing"
              >
                {upcoming.map((event) => {
                  const d = new Date(`${event.date}T00:00:00`);
                  const day = d.getDate();
                  const monthName = d.toLocaleDateString("en-US", {
                    month: "short",
                  });
                  const weekday = d.toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  return (
                    <li
                      key={event.id}
                      className="border-b border-line last:border-b-0"
                      style={{
                        boxShadow: `inset 4px 0 0 ${
                          CATEGORY_COLORS[event.category]
                        }`,
                      }}
                    >
                      <a
                        href="#calendar"
                        className="grid grid-cols-[64px_1fr] items-center gap-4 px-4 py-4 transition-colors hover:bg-panel-2 sm:grid-cols-[80px_1fr_auto] sm:px-6"
                      >
                        <span className="text-center">
                          <span className="display block text-2xl leading-none text-orange sm:text-3xl">
                            {day}
                          </span>
                          <span className="label block text-[10px] font-semibold text-cream-dim">
                            {monthName} · {weekday}
                          </span>
                        </span>
                        <span>
                          <span className="mb-0.5 flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[event.category],
                              }}
                            />
                            <span className="label text-[11px] font-semibold text-cream-dim">
                              {event.category}
                            </span>
                          </span>
                          <span className="block font-semibold text-cream">
                            {event.title}
                          </span>
                          <span className="text-sm text-cream-dim">
                            {event.time} · {event.space}
                          </span>
                        </span>
                        <span className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-end">
                          {event.soldOut ? (
                            <span className="rounded-full bg-panel-2 px-4 py-1.5 text-xs font-semibold text-cream-dim">
                              Sold out
                            </span>
                          ) : (
                            <span className="rounded-full bg-orange px-4 py-1.5 text-xs font-semibold text-bg">
                              {event.price}
                            </span>
                          )}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <div className="reveal mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-cream-dim">
            Swipe the board or use the toggle to flip between the calendar
            and the upcoming events list.
          </p>
          {/* add an event from outside the board, Google Calendar style */}
          {/* <a
            href="mailto:info@igirerwanda.org?subject=Add my event to the Igire Rwanda calendar"
            className="flex shrink-0 items-center gap-2 rounded-full bg-orange py-3 pl-4 pr-5 text-sm font-semibold text-bg shadow-[0_10px_24px_-8px_rgba(224,138,0,0.6)] transition-colors hover:bg-orange-deep"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add your event
          </a> */}
        </div>
      </div>
    </section>
  );
}
