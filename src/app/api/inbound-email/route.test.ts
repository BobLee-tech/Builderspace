import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const key = Buffer.from("route-test-signing-key");
const secret = `whsec_${key.toString("base64")}`;

function request(event: unknown, signWith = key) {
  const body = JSON.stringify(event);
  const id = "msg_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", signWith)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("http://localhost/api/inbound-email", {
    method: "POST",
    body,
    headers: {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${sig}`,
    },
  });
}

const received = { type: "email.received", data: { email_id: "em_1" } };

describe("POST /api/inbound-email", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_INBOUND_WEBHOOK_SECRET", secret);
    vi.stubEnv("RESEND_INBOUND_API_KEY", "re_test");
    vi.stubEnv("HELLO_FORWARD_TO", "a@x.com, b@y.org");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("answers 503 until it is configured", async () => {
    vi.stubEnv("HELLO_FORWARD_TO", "");
    expect((await POST(request(received))).status).toBe(503);
  });

  it("rejects a bad signature without calling Resend", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const res = await POST(request(received, Buffer.from("wrong")));
    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores other events", async () => {
    const res = await POST(request({ type: "email.sent", data: {} }));
    expect(await res.json()).toEqual({ ignored: "email.sent" });
  });

  it("forwards to every president", async () => {
    let sent: { to?: string[] } = {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const path = url.replace("https://api.resend.com", "");
        if (path === "/emails") {
          sent = JSON.parse(String(init?.body));
          return Response.json({ id: "sent_1" });
        }
        if (path === "/emails/receiving?limit=100") {
          return Response.json({ data: [] });
        }
        if (path.endsWith("/attachments")) return Response.json({ data: [] });
        return Response.json({
          id: "em_1",
          from: "jane@uni.edu",
          to: ["hello@builderspace.dev"],
          cc: null,
          reply_to: null,
          subject: "Hi",
          html: null,
          text: "Hi",
          headers: {},
          created_at: new Date().toISOString(),
        });
      }),
    );
    const res = await POST(request(received));
    expect(await res.json()).toEqual({ forwarded: "sent_1" });
    expect(sent.to).toEqual(["a@x.com", "b@y.org"]);
  });

  it("answers 502 when Resend fails, so it retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 500 })),
    );
    expect((await POST(request(received))).status).toBe(502);
  });
});
