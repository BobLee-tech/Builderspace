import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FORWARDED_HEADER,
  buildForward,
  forwardReceivedEmail,
  parseAddress,
  parseRecipients,
  skipReason,
  verifyWebhook,
  type ReceivedEmail,
} from "./inbound-email";

const key = Buffer.from("test-signing-key-32-bytes-long!!");
const secret = `whsec_${key.toString("base64")}`;
const now = 1_800_000_000_000;
const ts = String(now / 1000);

function sign(body: string, id = "msg_1", timestamp = ts) {
  const sig = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return { id, timestamp, signature: `v1,${sig}` };
}

describe("verifyWebhook", () => {
  const body = '{"type":"email.received"}';

  it("accepts a correct signature", () => {
    expect(verifyWebhook(secret, body, sign(body), now)).toBe(true);
  });

  it("accepts one good signature among several", () => {
    const good = sign(body);
    const headers = { ...good, signature: `v1,AAAA ${good.signature}` };
    expect(verifyWebhook(secret, body, headers, now)).toBe(true);
  });

  it("rejects a changed body", () => {
    expect(verifyWebhook(secret, body + " ", sign(body), now)).toBe(false);
  });

  it("rejects another secret", () => {
    const other = `whsec_${Buffer.from("another-key").toString("base64")}`;
    expect(verifyWebhook(other, body, sign(body), now)).toBe(false);
  });

  it("rejects an old timestamp", () => {
    const old = String(now / 1000 - 600);
    expect(verifyWebhook(secret, body, sign(body, "msg_1", old), now)).toBe(
      false,
    );
  });

  it("rejects missing headers", () => {
    const headers = { id: null, timestamp: ts, signature: "v1,x" };
    expect(verifyWebhook(secret, body, headers, now)).toBe(false);
  });
});

describe("parseRecipients", () => {
  it("splits, lowercases and dedupes", () => {
    expect(parseRecipients(" A@x.com, b@y.org\na@x.com  nope ")).toEqual([
      "a@x.com",
      "b@y.org",
    ]);
  });

  it("is empty without a value", () => {
    expect(parseRecipients(undefined)).toEqual([]);
  });
});

describe("parseAddress", () => {
  it("reads a named address", () => {
    expect(parseAddress('"Jane Doe" <jane@uni.edu>')).toEqual({
      name: "Jane Doe",
      address: "jane@uni.edu",
    });
  });

  it("reads a bare address", () => {
    expect(parseAddress("jane@uni.edu")).toEqual({
      name: "",
      address: "jane@uni.edu",
    });
  });
});

const email: ReceivedEmail = {
  id: "em_1",
  from: "Jane <jane@uni.edu>",
  to: ["hello@builderspace.dev"],
  cc: null,
  reply_to: null,
  received_for: ["hello@builderspace.dev"],
  subject: "Sponsorship",
  html: '<p>Hi <img src="cid:logo"></p>',
  text: "Hi",
  headers: { "Message-ID": "<1@uni.edu>" },
  created_at: "2026-11-02T01:00:00.000Z",
};

describe("skipReason", () => {
  it("forwards outside mail", () => {
    expect(skipReason(email)).toBeNull();
  });

  it("skips a copy that came back", () => {
    const back = { ...email, headers: { "x-builderspace-forwarded": "em_0" } };
    expect(skipReason(back)).toBe("already forwarded");
  });

  it("skips our own domain", () => {
    expect(skipReason({ ...email, from: "notify@builderspace.dev" })).toBe(
      "sent from builderspace.dev",
    );
  });
});

describe("buildForward", () => {
  const to = ["a@x.com", "b@y.org"];

  it("sends from hello@ with Reply-To the sender", () => {
    const out = buildForward(email, [], to);
    expect(out.from).toBe("Jane via BuilderSpace <hello@builderspace.dev>");
    expect(out.reply_to).toEqual(["Jane <jane@uni.edu>"]);
    expect(out.to).toEqual(to);
    expect(out.subject).toBe("[hello@] Sponsorship");
    expect(out.headers).toEqual({ [FORWARDED_HEADER]: "em_1" });
    expect(out.html).toContain(
      "Jane &lt;jane@uni.edu&gt; 发给 hello@builderspace.dev",
    );
    expect(out.html).toContain('<img src="cid:logo">');
    expect(out.attachments).toBeUndefined();
  });

  it("keeps the sender's own Reply-To", () => {
    const out = buildForward({ ...email, reply_to: ["desk@uni.edu"] }, [], to);
    expect(out.reply_to).toEqual(["desk@uni.edu"]);
  });

  it("wraps plain text and escapes it", () => {
    const out = buildForward(
      { ...email, html: null, text: "<b>1 & 2</b>" },
      [],
      to,
    );
    expect(out.html).toContain("&lt;b&gt;1 &amp; 2&lt;/b&gt;");
    expect(out.text).toContain("<b>1 & 2</b>");
  });

  it("names a missing subject", () => {
    expect(buildForward({ ...email, subject: "  " }, [], to).subject).toBe(
      "[hello@] (无主题)",
    );
  });

  it("passes attachments by URL, inline ones with their cid", () => {
    const out = buildForward(
      email,
      [
        {
          filename: "deck.pdf",
          content_type: "application/pdf",
          content_disposition: "attachment",
          content_id: null,
          download_url: "https://dl/1",
        },
        {
          filename: "logo.png",
          content_type: "image/png",
          content_disposition: "inline",
          content_id: "<logo>",
          download_url: "https://dl/2",
        },
      ],
      to,
    );
    expect(out.attachments).toEqual([
      {
        path: "https://dl/1",
        filename: "deck.pdf",
        content_type: "application/pdf",
        content_id: undefined,
      },
      {
        path: "https://dl/2",
        filename: "logo.png",
        content_type: "image/png",
        content_id: "logo",
      },
    ]);
  });
});

describe("forwardReceivedEmail", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubResend(received: { created_at: string }[]) {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        const path = url.replace("https://api.resend.com", "");
        const body =
          path === "/emails/receiving/em_1?html_format=cid"
            ? email
            : path === "/emails/receiving?limit=100"
              ? { data: received }
              : path === "/emails/receiving/em_1/attachments"
                ? { data: [] }
                : path === "/emails"
                  ? { id: "sent_1" }
                  : null;
        return new Response(JSON.stringify(body), {
          status: body ? 200 : 404,
        });
      }),
    );
    return calls;
  }

  const opts = { apiKey: "re_test", to: ["a@x.com"], dailyCap: 2 };

  it("sends one copy with an idempotency key", async () => {
    const calls = stubResend([{ created_at: email.created_at }]);
    expect(await forwardReceivedEmail("em_1", opts)).toEqual({
      forwarded: "sent_1",
    });
    const send = calls.find((c) => c.url.endsWith("/emails"));
    expect(send?.init?.method).toBe("POST");
    expect(
      (send?.init?.headers as Record<string, string>)["idempotency-key"],
    ).toBe("hello-forward/em_1");
  });

  it("stops at the daily cap", async () => {
    const calls = stubResend([
      { created_at: "2026-11-01T20:00:00.000Z" },
      { created_at: "2026-11-01T05:00:00.000Z" },
      { created_at: "2026-10-30T05:00:00.000Z" },
    ]);
    expect(await forwardReceivedEmail("em_1", opts)).toEqual({
      skipped: "over 2 a day",
    });
    expect(calls.some((c) => c.url.endsWith("/emails"))).toBe(false);
  });

  it("throws when Resend fails, so the webhook is retried", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("down", { status: 500 })),
    );
    await expect(forwardReceivedEmail("em_1", opts)).rejects.toThrow("500");
  });
});
