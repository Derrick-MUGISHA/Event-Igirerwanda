/* eslint-disable @next/next/no-img-element */
/* Overlapping circular avatars — the holder, whoever invited them, and the
   Igire Rwanda mark, layered like a little "who's on this pass" cluster. */

import { anonymousAvatar } from "@/lib/anonymousAvatar";

export type StackItem = {
  src: string | null;
  alt: string;
  /** shown when there's no image (first letter of a name, say) */
  fallback?: string;
  /** when set and there's no photo, show a Google-Docs-style anonymous animal
      avatar seeded from this string (guests / plus-ones without a photo) */
  seed?: string;
  /** logo tiles read better on white */
  contain?: boolean;
};

export default function AvatarStack({
  items,
  size = 52,
}: {
  items: StackItem[];
  size?: number;
}) {
  const overlap = Math.round(size / 3);
  return (
    <div className="flex items-center">
      {items.map((it, i) => {
        const anon = !it.src && it.seed ? anonymousAvatar(it.seed) : null;
        return (
          <span
            key={i}
            title={it.alt}
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: items.length - i,
              ...(anon ? { backgroundColor: anon.bg } : {}),
            }}
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-orange ${
              anon ? "" : it.contain ? "bg-white" : "bg-panel-2"
            }`}
          >
            {it.src ? (
              <img
                src={it.src}
                alt={it.alt}
                loading="eager"
                decoding="async"
                className={`h-full w-full ${it.contain ? "object-contain p-1" : "object-cover"}`}
              />
            ) : anon ? (
              <span style={{ fontSize: size * 0.5 }} aria-hidden="true">
                {anon.emoji}
              </span>
            ) : (
              <span className="text-base font-bold text-cream-dim">{it.fallback ?? "?"}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
