/* eslint-disable @next/next/no-img-element */
/* Overlapping circular avatars — the holder, whoever invited them, and the
   Igire Rwanda mark, layered like a little "who's on this pass" cluster. */

export type StackItem = {
  src: string | null;
  alt: string;
  /** shown when there's no image (first letter of a name, say) */
  fallback?: string;
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
      {items.map((it, i) => (
        <span
          key={i}
          title={it.alt}
          style={{
            width: size,
            height: size,
            marginLeft: i === 0 ? 0 : -overlap,
            zIndex: items.length - i,
          }}
          className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-orange ${
            it.contain ? "bg-white" : "bg-panel-2"
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
          ) : (
            <span className="text-base font-bold text-cream-dim">
              {it.fallback ?? "?"}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
