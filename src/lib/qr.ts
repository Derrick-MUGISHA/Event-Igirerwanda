import { join } from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { signQrToken, type QrIdentity } from "./auth";

/* High error correction leaves room for the organization logo stamped in
   the middle of every ticket QR */
const QR_OPTS = { errorCorrectionLevel: "H" as const, width: 480, margin: 2 };

let logoPng: Buffer | null = null;

async function logoBadge(): Promise<Buffer[]> {
  logoPng ??= await sharp(join(process.cwd(), "public", "iro-logo.svg"), { density: 300 })
    .resize(84, 84, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  const backing = Buffer.from(
    `<svg width="104" height="104"><rect width="104" height="104" rx="22" fill="#ffffff" stroke="#0b2818" stroke-width="3"/></svg>`
  );
  return [backing, logoPng];
}

async function brandedQrPng(payload: string): Promise<Buffer> {
  const qr = await QRCode.toBuffer(payload, QR_OPTS);
  const [backing, logo] = await logoBadge();
  return sharp(qr)
    .composite([
      { input: backing, gravity: "center" },
      { input: logo, gravity: "center" },
    ])
    .png()
    .toBuffer();
}

export async function ticketQrPngBuffer(ticketCode: string, who: QrIdentity = {}): Promise<Buffer> {
  return brandedQrPng(await signQrToken(ticketCode, who));
}

export async function ticketQrDataUrl(ticketCode: string, who: QrIdentity = {}): Promise<string> {
  const png = await ticketQrPngBuffer(ticketCode, who);
  return `data:image/png;base64,${png.toString("base64")}`;
}
