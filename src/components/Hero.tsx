"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import HeroCanvas from "./HeroCanvas";
import { CATEGORIES, CATEGORY_COLORS, nextEvent, todayIso } from "@/lib/events";
import { useEvents } from "@/lib/useEvents";
import { useEventFlow } from "@/components/EventFlow";

/* Placeholder card with the same bones as the up-next card, shown while
   the real upcoming event is being fetched */
function UpNextSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the next event"
      className="hero-item mt-4 w-full max-w-md animate-pulse rounded-2xl border border-line bg-panel p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="h-3 w-20 rounded bg-panel-2" />
        <span className="h-3 w-24 rounded bg-panel-2" />
      </div>
      <div className="mt-4 h-8 w-3/4 rounded bg-panel-2" />
      <div className="mt-3 space-y-2">
        <div className="h-3.5 w-full rounded bg-panel-2" />
        <div className="h-3.5 w-2/3 rounded bg-panel-2" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i}>
            <div className="h-2.5 w-10 rounded bg-panel-2" />
            <div className="mt-1.5 h-4 w-24 rounded bg-panel-2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading the next event…</span>
    </div>
  );
}

/* Hand-drawn calendar illustration — the highlighted square is today */
function CalendarDoodle({ day, monthLabel }: { day: number; monthLabel: string }) {
  const squares = [
    { x: 120, y: 190, r: -3 },
    { x: 215, y: 188, r: 2 },
    { x: 310, y: 192, r: -2, filled: true },
    { x: 120, y: 290, r: 2 },
    { x: 215, y: 292, r: -3 },
    { x: 310, y: 288, r: 3 },
  ];
  return (
    <svg
      viewBox="0 0 480 440"
      aria-hidden="true"
      className="calendar-doodle h-auto w-full max-w-md"
    >
      {/* drop shadow board */}
      <rect
        x="78"
        y="118"
        width="350"
        height="290"
        rx="20"
        fill="#0c0f08"
        transform="rotate(-2 253 263)"
      />
      {/* outer board */}
      <rect
        x="62"
        y="100"
        width="350"
        height="290"
        rx="20"
        fill="#1e5c38"
        transform="rotate(-2 237 245)"
      />
      {/* header bar */}
      <rect
        x="80"
        y="116"
        width="314"
        height="46"
        rx="10"
        fill="#0b2818"
        transform="rotate(-2 237 139)"
      />
      <text
        x="237"
        y="149"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="27"
        style={{ fontFamily: "var(--font-marker)" }}
        transform="rotate(-2 237 139)"
      >
        {monthLabel}
      </text>
      {/* inner face */}
      <rect
        x="80"
        y="172"
        width="314"
        height="200"
        rx="12"
        fill="#2e7a4d"
        transform="rotate(-2 237 272)"
      />
      {/* spiral rings */}
      {[140, 240, 340].map((cx) => (
        <g key={cx} transform={`rotate(-2 ${cx} 90)`}>
          <path
            d={`M ${cx} 118 C ${cx - 22} 118 ${cx - 22} 62 ${cx} 62 C ${
              cx + 22
            } 62 ${cx + 22} 96 ${cx} 96`}
            fill="none"
            stroke="#f59300"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <circle cx={cx} cy="118" r="10" fill="#cf7a00" />
        </g>
      ))}
      {/* day squares — the filled one carries today's date */}
      {squares.map((s) => (
        <g
          key={`${s.x}-${s.y}`}
          transform={`rotate(${s.r} ${s.x + 32} ${s.y + 32})`}
        >
          <rect
            x={s.x}
            y={s.y}
            width="64"
            height="64"
            rx="12"
            fill={s.filled ? "#f59300" : "none"}
            stroke={s.filled ? "none" : "#f59300"}
            strokeWidth="7"
          />
          {s.filled && (
            <text
              x={s.x + 32}
              y={s.y + 45}
              textAnchor="middle"
              fill="#0b2818"
              fontSize="36"
              style={{ fontFamily: "var(--font-marker)" }}
            >
              {day}
            </text>
          )}
        </g>
      ))}
      {/* motion dashes, hand-drawn style */}
      <path
        d="M436 130 q10 30 -2 60"
        fill="none"
        stroke="#7cc35a"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M44 300 q-8 26 4 50"
        fill="none"
        stroke="#7cc35a"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-item", {
        opacity: 0,
        y: 26,
        duration: 0.8,
        stagger: 0.12,
      }).from(
        ".calendar-doodle",
        {
          opacity: 0,
          scale: 0.8,
          rotation: -6,
          duration: 1,
          ease: "back.out(1.6)",
        },
        "-=0.6"
      );
      gsap.to(".calendar-doodle", {
        y: -12,
        rotation: 1.5,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const { data: events, isPending } = useEvents();
  const { openEvent } = useEventFlow();

  const now = new Date();
  const monthLabel = now
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();
  /* the featured card shows today's event, or whatever comes up next */
  const upNext = nextEvent(events ?? []);
  const isToday = upNext?.date === todayIso();
  const eventDay = upNext
    ? new Date(`${upNext.date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-bg">
      <HeroCanvas />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg via-bg/70 to-bg/30" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.2fr_1fr] lg:pb-24 lg:pt-24">
        <div>
          <p className="hero-item label mb-4 text-sm font-semibold text-sage">
            Empowering Women Through Digital Skills
          </p>
          <h1 className="display hero-item text-5xl uppercase text-cream sm:text-7xl lg:text-8xl">
            Events
            <br />
            Calendar
          </h1>
          <ul className="hero-item mt-9 flex max-w-lg flex-wrap gap-x-7 gap-y-3">
            {CATEGORIES.map((cat) => (
              <li key={cat} className="flex items-center gap-2.5">
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                />
                <span className="label text-sm font-semibold text-cream">
                  {cat}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* on mobile this sits at the bottom of the hero */}
        <div className="flex flex-col items-center justify-center">
          <CalendarDoodle day={now.getDate()} monthLabel={monthLabel} />
          {isPending ? (
            <UpNextSkeleton />
          ) : upNext ? (
            <button
              type="button"
              onClick={() => openEvent(upNext)}
              className="hero-item mt-4 block w-full max-w-md cursor-pointer rounded-2xl border border-line bg-panel p-5 text-left transition-colors hover:border-orange sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="label text-xs font-semibold text-orange">
                  {isToday ? "Happening today" : "Up next"}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[upNext.category],
                    }}
                  />
                  <span className="label text-xs font-semibold text-cream-dim">
                    {upNext.category}
                  </span>
                </span>
              </div>

              <h2 className="display mt-3 text-2xl uppercase text-cream sm:text-3xl">
                {upNext.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-dim">
                {upNext.description}
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="label text-[10px] font-semibold text-sage">
                    Day
                  </dt>
                  <dd className="mt-0.5 font-semibold text-cream">
                    {eventDay}
                  </dd>
                </div>
                <div>
                  <dt className="label text-[10px] font-semibold text-sage">
                    Time
                  </dt>
                  <dd className="mt-0.5 font-semibold text-cream">
                    {upNext.time}
                    {upNext.endTime && ` – ${upNext.endTime}`}
                  </dd>
                </div>
                <div>
                  <dt className="label text-[10px] font-semibold text-sage">
                    Where
                  </dt>
                  <dd className="mt-0.5 font-semibold text-cream">
                    {upNext.space}
                  </dd>
                </div>
                <div>
                  <dt className="label text-[10px] font-semibold text-sage">
                    Entry
                  </dt>
                  <dd className="mt-0.5 font-semibold text-cream">
                    {upNext.soldOut ? "Fully booked" : upNext.price}
                  </dd>
                </div>
              </dl>
            </button>
          ) : (
            <a
              href="#calendar"
              className="hero-item mt-3 flex items-center gap-2.5 rounded-full border border-line bg-panel px-5 py-2.5 transition-colors hover:border-orange"
            >
              <span className="text-sm text-cream-dim">
                Nothing coming up yet see the full calendar
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
