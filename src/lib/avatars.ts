/* Friendly built-in avatars for attendees who'd rather not upload a photo.
   Each is a self-contained SVG on a brand gradient, so nothing is fetched. */

const PALETTES: [string, string][] = [
  ["#f59300", "#cf7a00"],
  ["#7cc35a", "#1e5c38"],
  ["#e2603a", "#a83b1c"],
  ["#d4b458", "#a3872f"],
  ["#a9d4a0", "#5b9e6e"],
  ["#5aa9f5", "#2b5fb3"],
];

/* small differences per face so the set feels varied */
const FACES = [
  { eye: 16, mouth: "M84 150 Q120 184 156 150" }, // smile
  { eye: 14, mouth: "M84 156 Q120 140 156 156" }, // sly
  { eye: 18, mouth: "M88 152 h64" }, // straight
  { eye: 15, mouth: "M84 148 Q120 190 156 148" }, // grin
  { eye: 17, mouth: "M100 150 a20 16 0 0 0 40 0" }, // open
  { eye: 13, mouth: "M84 150 Q120 172 156 150" }, // soft
];

export const AVATAR_COUNT = PALETTES.length;

export function avatarSvg(i: number): string {
  const [a, b] = PALETTES[i % PALETTES.length];
  const f = FACES[i % FACES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
    </linearGradient></defs>
    <rect width="240" height="240" fill="url(#g${i})"/>
    <circle cx="90" cy="104" r="${f.eye}" fill="#0b2818"/>
    <circle cx="150" cy="104" r="${f.eye}" fill="#0b2818"/>
    <path d="${f.mouth}" stroke="#0b2818" stroke-width="12" fill="none" stroke-linecap="round"/>
  </svg>`;
}

export function avatarDataUrl(i: number): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(i))}`;
}

/* rasterise a chosen avatar to a PNG File so it can be uploaded through the
   same photo endpoint and stored as the attendee's profile picture */
export async function avatarToFile(i: number): Promise<File> {
  const img = new Image();
  img.src = avatarDataUrl(i);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("avatar render failed"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, 480, 480);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) throw new Error("avatar export failed");
  return new File([blob], `avatar-${i}.png`, { type: "image/png" });
}
