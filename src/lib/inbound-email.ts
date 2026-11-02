import { createHmac, timingSafeEqual } from "node:crypto";

// hello@builderspace.dev lands in Resend Inboxes, which only Bob can open. Resend
// calls /api/inbound-email for every received email (webhook `email.received`)
// and we send a copy from hello@ to the club's presidents, with Reply-To set to
// the original sender so a reply goes straight back to them. See docs/email.md.

const RESEND_API = "https://api.resend.com";
const FORWARD_FROM_ADDRESS = "hello@builderspace.dev";
/** Set on every copy, so a mailbox that forwards back to hello@ doesn't loop. */
export const FORWARDED_HEADER = "X-BuilderSpace-Forwarded";
/** Resend and standard-webhooks reject anything older than five minutes. */
const SIGNATURE_TOLERANCE_S = 5 * 60;
/**
 * Every account key shares the free plan's 100 emails a day with the sign-in
 * codes, and each copy costs one per recipient, so a burst of spam stops being
 * forwarded here (it still waits in the Resend inbox).
 */
export const DEFAULT_DAILY_CAP = 15;

/**
 * Checks a Resend (Svix / standard-webhooks) signature: HMAC-SHA256 over
 * `id.timestamp.body`, keyed with the base64 part of the `whsec_` secret.
 */
export function verifyWebhook(
  secret: string,
  body: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;
  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt)) return false;
  if (Math.abs(now / 1000 - sentAt) > SIGNATURE_TOLERANCE_S) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Comma- or whitespace-separated list from an env var, deduplicated. */
export function parseRecipients(value: string | undefined): string[] {
  const list = (value ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  return [...new Set(list)];
}

/** `Name <a@b.c>` → { name, address }; a bare address has no name. */
export function parseAddress(value: string): { name: string; address: string } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1].trim(), address: match[2].trim() };
  return { name: "", address: value.trim() };
}

export type ReceivedEmail = {
  id: string;
  from: string;
  to: string[];
  cc: string[] | null;
  reply_to: string[] | null;
  received_for?: string[] | null;
  subject: string | null;
  html: string | null;
  text: string | null;
  headers: Record<string, string> | null;
  created_at: string;
};

export type ReceivedAttachment = {
  filename?: string | null;
  content_type: string;
  content_id?: string | null;
  content_disposition?: string | null;
  download_url: string;
};

/** Why an email is not forwarded, or null to forward it. */
export function skipReason(email: ReceivedEmail): string | null {
  const headers = Object.keys(email.headers ?? {}).map((h) => h.toLowerCase());
  if (headers.includes(FORWARDED_HEADER.toLowerCase()))
    return "already forwarded";
  // Our own notify@/hello@ mail (ops notices, a copy that bounced back).
  if (/@builderspace\.dev$/i.test(parseAddress(email.from).address)) {
    return "sent from builderspace.dev";
  }
  return null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The body of POST /emails that sends the copy. */
export function buildForward(
  email: ReceivedEmail,
  attachments: ReceivedAttachment[],
  to: string[],
) {
  const sender = parseAddress(email.from);
  const senderName = (sender.name || sender.address).replace(/["<>]/g, "");
  const sentTo = (
    email.received_for?.length ? email.received_for : email.to
  ).join(", ");
  const subject = email.subject?.trim() || "(无主题)";
  const note = [
    `${email.from} 发给 ${sentTo}`,
    "直接回复会发给对方，从你自己的邮箱发出",
  ];

  const htmlNote =
    `<div style="font:13px/1.5 -apple-system,sans-serif;color:#555;` +
    `border-bottom:1px solid #ddd;padding:0 0 10px;margin:0 0 16px">` +
    note.map((line) => escapeHtml(line)).join("<br>") +
    `</div>`;
  const textBody = email.text ?? "";
  const html = email.html
    ? htmlNote + email.html
    : htmlNote +
      `<pre style="white-space:pre-wrap;font:inherit">${escapeHtml(textBody)}</pre>`;
  const text = `${note.join("\n")}\n\n${textBody}`;

  return {
    from: `${senderName} via BuilderSpace <${FORWARD_FROM_ADDRESS}>`,
    to,
    reply_to: email.reply_to?.length ? email.reply_to : [email.from],
    subject: `[hello@] ${subject}`,
    html,
    text,
    headers: { [FORWARDED_HEADER]: email.id },
    attachments: attachments.length
      ? attachments.map((a) => ({
          path: a.download_url,
          filename: a.filename ?? undefined,
          content_type: a.content_type,
          // Inline images stay inline: the html asks for `cid:` references.
          content_id:
            a.content_disposition === "inline" && a.content_id
              ? a.content_id.replace(/^<|>$/g, "")
              : undefined,
        }))
      : undefined,
  };
}

async function resend<T>(
  apiKey: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Resend ${path}: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** How many emails arrived in the 24 hours before `before` (at most 100). */
async function receivedInLastDay(apiKey: string, before: string) {
  const list = await resend<{ data: { created_at: string }[] }>(
    apiKey,
    "/emails/receiving?limit=100",
  );
  const end = Date.parse(before);
  const start = end - 24 * 60 * 60 * 1000;
  return list.data.filter((e) => {
    const t = Date.parse(e.created_at);
    return t >= start && t < end;
  }).length;
}

export type ForwardResult = { forwarded: string } | { skipped: string };

/** Fetches a received email and sends the copy. Throws so Resend retries. */
export async function forwardReceivedEmail(
  emailId: string,
  opts: { apiKey: string; to: string[]; dailyCap: number },
): Promise<ForwardResult> {
  const { apiKey, to, dailyCap } = opts;
  const id = encodeURIComponent(emailId);
  const email = await resend<ReceivedEmail>(
    apiKey,
    `/emails/receiving/${id}?html_format=cid`,
  );
  const reason = skipReason(email);
  if (reason) return { skipped: reason };
  if ((await receivedInLastDay(apiKey, email.created_at)) >= dailyCap) {
    return { skipped: `over ${dailyCap} a day` };
  }

  const attachments = await resend<{ data: ReceivedAttachment[] }>(
    apiKey,
    `/emails/receiving/${id}/attachments`,
  );
  const sent = await resend<{ id: string }>(apiKey, "/emails", {
    method: "POST",
    // Resend retries a webhook it thinks failed; one copy per email anyway.
    headers: { "idempotency-key": `hello-forward/${email.id}` },
    body: JSON.stringify(buildForward(email, attachments.data, to)),
  });
  return { forwarded: sent.id };
}
