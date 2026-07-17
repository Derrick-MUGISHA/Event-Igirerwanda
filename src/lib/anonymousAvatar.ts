/* Google-Docs-style anonymous avatars: a deterministic animal + colour derived
   from a seed, so a guest or plus-one who hasn't added a photo still gets a
   stable, friendly identity instead of a blank circle. The same seed (their
   name or id) always yields the same animal, so they're recognisable. */

const ANIMALS = [
  "🦊", "🦁", "🐼", "🐨", "🦉", "🐧", "🦆", "🐢", "🦄", "🐝",
  "🦋", "🐙", "🦕", "🦈", "🐬", "🦩", "🦔", "🐸", "🐳", "🦌",
  "🦦", "🦫", "🐰", "🐺", "🐮", "🐷", "🐵", "🦓", "🐯", "🐻",
];

const COLORS = [
  "#3b7a57", "#2f6f8f", "#8a5a2b", "#7a4fa3", "#9c3b5b", "#2f8f7a",
  "#8f7a2f", "#4f5fa3", "#a5503b", "#3f8f4f", "#6f3f8f", "#8f6f3f",
];

export type AnonymousIdentity = { emoji: string; bg: string };

export function anonymousAvatar(seed: string): AnonymousIdentity {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  h = h >>> 0;
  return {
    emoji: ANIMALS[h % ANIMALS.length],
    bg: COLORS[Math.floor(h / ANIMALS.length) % COLORS.length],
  };
}
