import { readFile } from "fs/promises";
import { join } from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { signQrToken, type QrIdentity } from "./auth";

/* The pass QR, styled to sit straight on the dark ticket — no white card.
   Modules are rendered light on a transparent background, and the Igire mark
   is composited into the middle. Error correction "H" keeps ~30% redundancy
   so the centred logo never stops it decoding. */
const SIZE = 640;
const LOGO_FRAC = 0.24; // logo chip covers ~24% of the QR's width

/* light modules (cream) on a transparent field, so the ticket colour shows
   through instead of a white box */
const QR_OPTS = {
  width: SIZE,
  margin: 2,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#f7f3ea", light: "#00000000" },
};

/* Rasterise the brand SVG onto a small rounded white plate once and reuse it —
   the opaque chip keeps the mark legible where it covers the light modules. */
let logoChipPromise: Promise<Buffer> | null = null;
function logoChip(): Promise<Buffer> {
  if (!logoChipPromise) {
    logoChipPromise = (async () => {
      const svg = await readFile(join(process.cwd(), "public", "iro-logo.svg"));
      const dim = Math.round(SIZE * LOGO_FRAC);
      const pad = Math.round(dim * 0.14);
      const inner = dim - pad * 2;
      const mark = await sharp(svg, { density: 300 })
        .resize(inner, inner, { fit: "contain", background: "#00000000" })
        .png()
        .toBuffer();
      const radius = Math.round(dim * 0.22);
      const plate = Buffer.from(
        `<svg width="${dim}" height="${dim}"><rect width="${dim}" height="${dim}" rx="${radius}" ry="${radius}" fill="#ffffff"/></svg>`
      );
      return sharp(plate)
        .composite([{ input: mark, gravity: "centre" }])
        .png()
        .toBuffer();
    })();
  }
  return logoChipPromise;
}

/* QR PNG with the logo baked into the centre, transparent background */
async function buildQr(ticketCode: string, who: QrIdentity): Promise<Buffer> {
  const [qr, chip] = await Promise.all([
    QRCode.toBuffer(await signQrToken(ticketCode, who), QR_OPTS),
    logoChip(),
  ]);
  return sharp(qr)
    .composite([{ input: chip, gravity: "centre" }])
    .png()
    .toBuffer();
}

export async function ticketQrPngBuffer(ticketCode: string, who: QrIdentity = {}): Promise<Buffer> {
  return buildQr(ticketCode, who);
}

export async function ticketQrDataUrl(ticketCode: string, who: QrIdentity = {}): Promise<string> {
  const png = await buildQr(ticketCode, who);
  return `data:image/png;base64,${png.toString("base64")}`;
}
