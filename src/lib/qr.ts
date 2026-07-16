import QRCode from "qrcode";
import { signQrToken, type QrIdentity } from "./auth";

/* High-contrast QR at the top error-correction level ("H") so a centred
   logo can sit over the middle ~25% and cameras still decode it first try.
   The holder's identity travels inside the signed payload. */
const QR_OPTS = { width: 640, margin: 2, errorCorrectionLevel: "H" as const };

export async function ticketQrPngBuffer(ticketCode: string, who: QrIdentity = {}): Promise<Buffer> {
  return QRCode.toBuffer(await signQrToken(ticketCode, who), QR_OPTS);
}

export async function ticketQrDataUrl(ticketCode: string, who: QrIdentity = {}): Promise<string> {
  return QRCode.toDataURL(await signQrToken(ticketCode, who), QR_OPTS);
}
