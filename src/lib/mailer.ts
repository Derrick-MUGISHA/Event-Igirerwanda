import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = () => `Igire Rwanda Events <${process.env.GMAIL_USER}>`;

/* Reads like a note a person wrote: white background, plain prose, one
   button, a real sign-off — the branding stays out of the way */
function shell(body: string): string {
  return `
  <div style="background:#ffffff;padding:28px 16px;font-family:-apple-system,'Segoe UI',Arial,sans-serif;color:#242424;font-size:15px;line-height:1.65">
    <div style="max-width:560px;margin:0 auto">
      ${body}
      <p style="margin:30px 0 4px">Warm regards,</p>
      <p style="margin:0;font-weight:bold;color:#0b2818">The Igire Rwanda Events team</p>
      <hr style="margin:26px 0 14px;border:none;border-top:1px solid #e8e8e6"/>
      <p style="font-size:12px;color:#8b9089;margin:0">
        Igire Rwanda Organization · Kigali, Rwanda<br/>
        You received this because of your event registration if you didn't expect it, you can safely ignore it.
      </p>
    </div>
  </div>`;
}

const button = (url: string, text: string) =>
  `<p style="margin:26px 0">
     <a href="${url}" style="background:#0b2818;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:8px;display:inline-block">${text}</a>
   </p>
   `

export async function sendMagicLinkEmail(to: string, name: string, url: string, eventName: string) {
  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `Verify your email ${eventName}`,
    html: shell(`
      <p>Hi ${name.split(" ")[0]},</p>
      <p>Thanks for confirming your spot at <b>${eventName}</b>. To continue, just verify that this is your email address the link below works once and expires in 30 minutes.</p>
      ${button(url, "Verify my email")}
    `),
  });
}

export async function sendPlusOneInviteEmail(
  to: string,
  participantName: string,
  url: string,
  eventName: string
) {
  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `${participantName} invited you to ${eventName}`,
    html: shell(`
      <p>Hello,</p>
      <p><b>${participantName}</b> would love to bring you along to <b>${eventName}</b>. It only takes a minute to register as their guest tell us a little about yourself and your pass will be on its way.</p>
      ${button(url, "Join as their guest")}
    `),
  });
}

export async function sendTicketEmail(opts: {
  to: string;
  name: string;
  role?: string;
  photoUrl?: string | null;
  type: string;
  eventName: string;
  eventDate?: Date | null;
  venue?: string;
  ticketCode: string;
  ticketUrl: string;
  /** the moment the pass stops working — when the event wraps up */
  validUntil?: Date | null;
  qrPng: Buffer;
  /** printable ticket document, attached as ticket.pdf */
  pdf?: Buffer;
}) {
  const dateLabel = opts.eventDate
    ? opts.eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const typeLabel = opts.type === "PLUS_ONE" ? "GUEST · PLUS-ONE" : opts.type;
  const photoCell = opts.photoUrl
    ? `<img src="${opts.photoUrl}" alt="Your photo" width="84" height="84"
         style="width:84px;height:84px;border-radius:12px;object-fit:cover;border:2px solid #f59300;display:block"/>`
    : "";

  /* the email mirrors the business-card ID shown on the dashboard */
  await transporter.sendMail({
    from: FROM(),
    to: opts.to,
    subject: `Your event pass — ${opts.eventName}`,
    html: shell(`
      <p>Hi ${opts.name.split(" ")[0]},</p>
      <p>Great news — you're all set for <b>${opts.eventName}</b>! Your personal event pass is below; just show the QR code at the entrance and you're in.</p>

      <div style="margin:24px 0;border:1px solid #e8e8e6;border-radius:14px;overflow:hidden;background:#123522">
        <div style="background:#f59300;color:#0b2818;padding:10px 18px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">
          Igire Rwanda Organization
          <span style="float:right;background:rgba(18,21,13,0.2);border-radius:999px;padding:2px 10px">${typeLabel}</span>
        </div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;padding:18px">
          <tr>
            ${photoCell ? `<td style="padding:18px 0 18px 18px;width:96px;vertical-align:top">${photoCell}</td>` : ""}
            <td style="padding:18px;vertical-align:top">
              <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;text-transform:uppercase">${opts.name}</p>
              ${opts.role ? `<p style="margin:2px 0 0;font-size:13px;font-weight:bold;color:#a9d4a0">${opts.role}</p>` : ""}
              <p style="margin:10px 0 0;font-size:13px;color:#bfd4c5">${opts.eventName}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#bfd4c5">${dateLabel}${dateLabel && opts.venue ? " · " : ""}${opts.venue ?? ""}</p>
            </td>
          </tr>
        </table>
        <div style="text-align:center;padding:0 18px 18px">
          <img src="cid:ticket-qr" alt="Ticket QR code" width="220" height="220" style="background:#fff;border-radius:12px;padding:10px"/>
          <p style="margin:10px 0 0;font-size:12px;letter-spacing:2px;color:#bfd4c5">PASS ${opts.ticketCode}</p>
        </div>
        <div style="background:#1b4630;padding:10px 18px;text-align:center;font-size:11px;color:#bfd4c5">
          This pass is personal and its QR code can only be scanned once.${
            opts.validUntil
              ? `<br/>Valid until ${opts.validUntil.toLocaleString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })} — it expires when the event ends.`
              : ""
          }
        </div>
      </div>

      ${button(opts.ticketUrl, "View my pass online")}
      ${opts.pdf ? `<p style="font-size:13px;color:#555">We also attached a printable copy of your ticket as a PDF — handy if your phone battery has other plans.</p>` : ""}
    `),
    attachments: [
      { filename: "ticket-qr.png", content: opts.qrPng, cid: "ticket-qr" },
      ...(opts.pdf
        ? [{ filename: "ticket.pdf", content: opts.pdf, contentType: "application/pdf" }]
        : []),
    ],
  });
}
