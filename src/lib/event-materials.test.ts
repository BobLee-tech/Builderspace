import { describe, expect, it } from "vitest";
import {
  allEventMaterials,
  fillUser,
  PLACEHOLDER,
  type EventMaterials,
} from "./event-materials";

/** Every template on a page, so each check covers them all. */
function hrefs(m: EventMaterials) {
  return [
    ...m.kit.map((k) => k.href),
    ...m.steps.flatMap((s) =>
      (s.actions ?? []).flatMap((a) => (a.kind === "link" ? [a.href] : [])),
    ),
    ...m.stuck.flatMap((s) => (s.link ? [s.link.href] : [])),
  ];
}

describe("event materials", () => {
  for (const [slug, m] of allEventMaterials()) {
    it(`${slug}: every link is https or on the site once a username is in`, () => {
      for (const href of hrefs(m)) {
        const url = fillUser(href, "alex-chen", "en");
        expect(url, href).not.toContain("{u}");
        if (url.startsWith("/")) continue;
        expect(new URL(url).protocol, href).toBe("https:");
      }
    });

    it(`${slug}: each path is listed once`, () => {
      const ids = m.paths.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const s of m.steps)
        for (const a of s.actions ?? [])
          if (a.kind === "go") expect(ids).toContain(a.to);
    });

    it(`${slug}: prompts mark what to replace in both languages`, () => {
      for (const c of m.changes) {
        expect(PLACEHOLDER.test(c.prompt.zh), c.title.zh).toBe(
          PLACEHOLDER.test(c.prompt.en),
        );
      }
      expect(PLACEHOLDER.test(m.deployPrompt.zh)).toBe(true);
      expect(PLACEHOLDER.test(m.deployPrompt.en)).toBe(true);
    });

    it(`${slug}: prompts that name the repo use the username`, () => {
      for (const text of [m.handoff, m.deployPrompt]) {
        expect(text.zh).toContain("{u}");
        expect(text.en).toContain("{u}");
      }
    });
  }

  it("puts a stand-in where the username goes until one is typed", () => {
    expect(fillUser("https://{u}.github.io", "", "zh")).toBe(
      "https://用户名.github.io",
    );
    expect(fillUser("{u}/{u}.github.io", "mia", "en")).toBe(
      "mia/mia.github.io",
    );
  });
});
