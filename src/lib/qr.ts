import QRCode from "qrcode";
import { signQrToken, type QrIdentity } from "./auth";

/* Plain, high-contrast QR — no overlay, so cameras decode it first try.
   The holder's identity travels inside the signed payload instead. */
const QR_OPTS = { width: 480, margin: 2 };

export async function ticketQrPngBuffer(ticketCode: string, who: QrIdentity = {}): Promise<Buffer> {
  return QRCode.toBuffer(await signQrToken(ticketCode, who), QR_OPTS);
}

export async function ticketQrDataUrl(ticketCode: string, who: QrIdentity = {}): Promise<string> {
  return QRCode.toDataURL(await signQrToken(ticketCode, who), QR_OPTS);
}
