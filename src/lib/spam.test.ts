import { describe, expect, it } from "vitest";
import { looksAutomated } from "./spam";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

const now = 1_800_000_000_000;

describe("looksAutomated", () => {
  it("passes a person who took a while", () => {
    expect(
      looksAutomated(
        form({ website: "", startedAt: String(now - 30_000) }),
        now,
      ),
    ).toBe(false);
  });

  it("flags a filled honeypot", () => {
    expect(
      looksAutomated(
        form({ website: "http://spam", startedAt: String(now - 30_000) }),
        now,
      ),
    ).toBe(true);
  });

  it("flags instant submissions", () => {
    expect(
      looksAutomated(form({ website: "", startedAt: String(now - 500) }), now),
    ).toBe(true);
  });

  it("flags a missing or forged timestamp", () => {
    expect(looksAutomated(form({ website: "" }), now)).toBe(true);
    expect(looksAutomated(form({ startedAt: "abc" }), now)).toBe(true);
  });
});
