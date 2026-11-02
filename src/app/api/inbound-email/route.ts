import {
  DEFAULT_DAILY_CAP,
  forwardReceivedEmail,
  parseRecipients,
  verifyWebhook,
} from "@/lib/inbound-email";

// Resend webhook for `email.received` on builderspace.dev: copies hello@ mail
// to the presidents. Needs RESEND_INBOUND_API_KEY (full access, to read
// received mail), RESEND_INBOUND_WEBHOOK_SECRET and HELLO_FORWARD_TO; without
// them it answers 503 and Resend keeps retrying. A non-2xx answer makes Resend
// retry, so only real failures return one.
export async function POST(req: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET ?? "";
  const apiKey = process.env.RESEND_INBOUND_API_KEY ?? "";
  const to = parseRecipients(process.env.HELLO_FORWARD_TO);
  const dailyCap =
    Number(process.env.HELLO_FORWARD_DAILY_CAP) || DEFAULT_DAILY_CAP;
  if (!secret || !apiKey || to.length === 0) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signed = verifyWebhook(secret, body, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  });
  if (!signed)
    return Response.json({ error: "bad signature" }, { status: 401 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const emailId = event.data?.email_id;
  if (event.type !== "email.received" || !emailId) {
    return Response.json({ ignored: event.type ?? "unknown" });
  }

  try {
    const result = await forwardReceivedEmail(emailId, {
      apiKey,
      to,
      dailyCap,
    });
    console.log("hello@ forward", emailId, result);
    return Response.json(result);
  } catch (error) {
    console.error("hello@ forward failed", emailId, error);
    return Response.json({ error: "forward failed" }, { status: 502 });
  }
}
