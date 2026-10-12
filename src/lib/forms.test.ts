import { describe, expect, it } from "vitest";
import {
  channelFromSearch,
  parseJoinForm,
  parseProjectForm,
  parseProjectUpdateForm,
  projectSlug,
} from "./forms";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

const validJoin: [string, string][] = [
  ["nickname", " Yuki "],
  ["schoolDegree", "UNSW · Master of IT"],
  ["major", "Information Technology"],
  ["skills", "frontend"],
  ["skills", "design"],
  ["idea", ""],
  ["stalledProject", "yes"],
  ["blockers", "teammates"],
  ["weeklyHours", "2to5"],
  ["referralSource", "xiaohongshu"],
];

describe("parseJoinForm", () => {
  it("accepts a complete submission and trims text", () => {
    const result = parseJoinForm(form(validJoin));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      nickname: "Yuki",
      skills: ["frontend", "design"],
      idea: null,
      stalledProject: "yes",
      blockers: ["teammates"],
      channel: null,
      showcaseConsent: false,
    });
  });

  it("rejects unknown skills and missing choices", () => {
    const result = parseJoinForm(
      form([
        ...validJoin.filter(([k]) => k !== "weeklyHours"),
        ["skills", "hacking"],
      ]),
    );
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("weeklyHours");
    expect(paths).toContain("skills");
  });

  it("requires the stalled-project answer and rejects unknown blockers", () => {
    const result = parseJoinForm(
      form([
        ...validJoin.filter(([k]) => k !== "stalledProject"),
        ["blockers", "money"],
      ]),
    );
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("stalledProject");
    expect(paths).toContain("blockers");
  });

  it("keeps a clean channel tag and drops a malformed one", () => {
    const ok = parseJoinForm(form([...validJoin, ["channel", "XHS-w1"]]));
    expect(ok.data?.channel).toBe("xhs-w1");
    const bad = parseJoinForm(form([...validJoin, ["channel", "<script>"]]));
    expect(bad.success).toBe(true);
    expect(bad.data?.channel).toBeNull();
  });

  it("never collects fields outside the schema", () => {
    const result = parseJoinForm(form([...validJoin, ["zid", "z1234567"]]));
    expect(result.data).not.toHaveProperty("zid");
  });
});

describe("parseProjectForm", () => {
  const base: [string, string][] = [
    ["name", "合租雷达"],
    ["problem", "找室友靠刷帖"],
    ["targetUser", "悉尼留学生"],
    ["ownerName", "YK"],
    ["contact", "wechat: yk"],
    ["repoUrl", ""],
    ["demoUrl", ""],
  ];

  it("treats empty links as null", () => {
    const result = parseProjectForm(form(base));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ repoUrl: null, demoUrl: null });
  });

  it("rejects non-http links", () => {
    const result = parseProjectForm(
      form([
        ...base.filter(([k]) => k !== "repoUrl"),
        ["repoUrl", "javascript:alert(1)"],
      ]),
    );
    expect(result.success).toBe(false);
  });
});

describe("channelFromSearch", () => {
  it("prefers ref over utm_source", () => {
    expect(channelFromSearch("?ref=poster-qr&utm_source=x")).toBe("poster-qr");
    expect(channelFromSearch("?utm_source=xiaohongshu")).toBe("xiaohongshu");
    expect(channelFromSearch("")).toBeNull();
  });
});

describe("parseProjectUpdateForm", () => {
  const base: [string, string][] = [
    ["slug", "coursemate"],
    ["kind", "demo"],
    ["body", " 课程评价流程跑通，10 位同学试用 "],
    ["url", ""],
    ["submittedBy", "Bob"],
  ];

  it("accepts an update and trims the body", () => {
    const result = parseProjectUpdateForm(form(base));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      body: "课程评价流程跑通，10 位同学试用",
      url: null,
    });
  });

  it("rejects an unknown kind and a missing name", () => {
    const result = parseProjectUpdateForm(
      form([
        ["slug", "coursemate"],
        ["kind", "tweet"],
        ["body", "x"],
        ["url", ""],
        ["submittedBy", ""],
      ]),
    );
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["kind", "submittedBy"]));
  });
});

describe("projectSlug", () => {
  it("keeps ascii words and appends the suffix", () => {
    expect(projectSlug("Menu Lens!", "a1b2c3")).toBe("menu-lens-a1b2c3");
  });

  it("falls back when the name has no ascii", () => {
    expect(projectSlug("合租雷达", "a1b2c3")).toBe("project-a1b2c3");
  });
});
