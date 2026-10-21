import { describe, expect, it } from "vitest";
import {
  feedbackSchema,
  INTENTS,
  intentSchema,
  isCheckedHost,
  liveConfig,
  LIVE_STEPS,
  parseSiteLink,
  pollSchema,
  RATING_EMOJI,
  shortUrl,
  titleFromHtml,
} from "./event-live";

describe("parseSiteLink", () => {
  it("tidies a GitHub Pages address and spots the user", () => {
    expect(parseSiteLink(" BobLi.github.io/ ")).toEqual({
      url: "https://bobli.github.io",
      host: "bobli.github.io",
      kind: "pages",
      githubUser: "bobli",
    });
    expect(parseSiteLink("http://ada.github.io/site/#top")?.url).toBe(
      "https://ada.github.io/site/",
    );
  });

  it("keeps other hosts as they are", () => {
    expect(parseSiteLink("https://example.com/me?x=1")).toMatchObject({
      url: "https://example.com/me?x=1",
      kind: "other",
      githubUser: null,
    });
    expect(parseSiteLink("http://example.com")?.url).toBe("http://example.com");
  });

  it("rejects things that aren't public web addresses", () => {
    for (const bad of [
      "",
      "hello",
      "localhost:3000",
      "http://127.0.0.1",
      "https://10.0.0.1/x",
      "javascript:alert(1)",
      "ftp://files.example.com",
      "https://user:pw@example.com",
      "https://example.com:8443",
      "https://printer.local",
    ]) {
      expect(parseSiteLink(bad), bad).toBeNull();
    }
  });
});

describe("isCheckedHost", () => {
  it("only fetches known deploy hosts", () => {
    expect(isCheckedHost("bobli.github.io")).toBe(true);
    expect(isCheckedHost("ada.vercel.app")).toBe(true);
    expect(isCheckedHost("claude.ai")).toBe(true);
    expect(isCheckedHost("github.io")).toBe(false);
    expect(isCheckedHost(".github.io")).toBe(false);
    expect(isCheckedHost("evilgithub.io")).toBe(false);
    expect(isCheckedHost("example.com")).toBe(false);
  });
});

describe("answers", () => {
  it("keeps the love and hate lines, dropping empty ones", () => {
    expect(
      pollSchema.parse({ choice: "claude", like: " 写代码稳 ", pain: "  " }),
    ).toEqual({ choice: "claude", like: "写代码稳", pain: undefined });
    expect(pollSchema.safeParse({ choice: "Claude!" }).success).toBe(false);
    expect(
      pollSchema.safeParse({ choice: "grok", like: "很".repeat(31) }).success,
    ).toBe(false);
  });

  it("matches the slide's AIs, each with a picture", () => {
    const options = liveConfig("put-yourself-online").poll!.options;
    expect(options.map((o) => o.key)).toEqual([
      "deepseek",
      "claude",
      "chatgpt",
      "gemini",
      "kimi",
      "grok",
      "doubao",
      "other",
    ]);
    expect(options.filter((o) => o.image)).toHaveLength(7);
  });

  it("needs a score and both choices in feedback", () => {
    const ok = {
      rating: 4,
      friends: "1-2",
      good: "",
      bad: " 网络慢 ",
    };
    expect(feedbackSchema.parse(ok)).toEqual({
      rating: 4,
      friends: "1-2",
      good: undefined,
      bad: "网络慢",
    });
    expect(feedbackSchema.safeParse({ ...ok, rating: 0 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...ok, friends: "2" }).success).toBe(
      false,
    );
  });

  it("needs at least one intent and a way to reach you", () => {
    const ok = {
      wants: ["core", "join", "core"],
      idea: "  ",
      contact: " annie_xu ",
    };
    expect(intentSchema.parse(ok)).toEqual({
      wants: ["join", "core"],
      idea: undefined,
      contact: "annie_xu",
    });
    expect(intentSchema.safeParse({ ...ok, wants: [] }).success).toBe(false);
    expect(intentSchema.safeParse({ ...ok, wants: ["vip"] }).success).toBe(
      false,
    );
    expect(intentSchema.safeParse({ ...ok, contact: " " }).success).toBe(false);
    expect(INTENTS).toEqual(["join", "build", "core", "guest"]);
  });
});

it("has a face for every score", () => {
  expect(RATING_EMOJI).toHaveLength(5);
  expect(RATING_EMOJI).toEqual(["😇", "😭", "😌", "😎", "🥳"]);
});

describe("liveConfig", () => {
  it("only uses steps the database accepts", () => {
    for (const slug of ["put-yourself-online", "some-other-event"]) {
      for (const step of liveConfig(slug).steps) {
        expect(LIVE_STEPS).toContain(step);
      }
    }
    expect(liveConfig("some-other-event").poll).toBeNull();
  });
});

it("reads a page title", () => {
  expect(titleFromHtml("<head><title> Bo &amp; Co\n site </title>")).toBe(
    "Bo & Co site",
  );
  expect(titleFromHtml("<p>no title</p>")).toBeUndefined();
});

it("shortens a URL for cards", () => {
  expect(shortUrl("https://bobli.github.io/")).toBe("bobli.github.io");
});
