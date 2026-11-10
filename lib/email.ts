import { BRAND, flags, siteUrl } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";

type Mail = { to: string; subject: string; html: string; kind: string };

/**
 * Sends through Resend when RESEND_API_KEY is set. Every email is also kept in
 * the outbox table, which doubles as the dev mailbox at /dev/mail.
 * EMAIL_TEST_REDIRECT sends every email to one address outside production.
 */
export async function sendEmail(mail: Mail) {
  const db = await getDb();
  const provider = flags.email() ? "resend" : "dev";
  await db.insert(schema.outbox).values({ ...mail, provider });
  if (provider === "dev") return;
  const to = process.env.EMAIL_TEST_REDIRECT || mail.to;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || `${BRAND.name} <${BRAND.supportEmail}>`,
      to,
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok) console.error("email failed", res.status, await res.text());
}

export const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );

export function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0b0b12;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#f5f5fa">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#14141f;border:1px solid #2a2a3d;border-radius:16px" cellpadding="0" cellspacing="0"><tr><td style="padding:28px">
<div style="font-weight:700;font-size:18px;margin-bottom:20px">👻 ${BRAND.name}</div>
<h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${esc(title)}</h1>
${body}
<p style="color:#a0a0b8;font-size:12px;margin-top:28px">${BRAND.name} · New UK roles, the hour they go live. <a style="color:#a0a0b8" href="${siteUrl()}/app/account">Email settings</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

export const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#6cf7b0;color:#0b0b12;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none;display:inline-block">${esc(label)}</a></p>`;

export const p = (text: string) =>
  `<p style="color:#d6d6e4;font-size:15px;line-height:1.55;margin:0 0 12px">${esc(text)}</p>`;
