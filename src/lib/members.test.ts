import { describe, expect, it } from "vitest";
import { parseMemberProfile, parseSurvey } from "./member-forms";
import {
  afterEmailChange,
  isUnsw,
  memberCode,
  mentionsUnsw,
  ordinal,
  schoolDomain,
  sealLabel,
  zidFromEmail,
} from "./members";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

describe("ordinal", () => {
  it.each([
    [1, "st"],
    [2, "nd"],
    [3, "rd"],
    [4, "th"],
    [11, "th"],
    [12, "th"],
    [13, "th"],
    [21, "st"],
    [71, "st"],
    [72, "nd"],
    [111, "th"],
    [123, "rd"],
  ])("%i → %s", (n, suffix) => {
    expect(ordinal(n)).toBe(suffix);
  });
});

describe("school email", () => {
  it("recognises school domains the same way the database does", () => {
    expect(schoolDomain("z5555555@ad.unsw.edu.au")).toBe("ad.unsw.edu.au");
    expect(schoolDomain("A@Student.UNSW.edu.au")).toBe("student.unsw.edu.au");
    expect(schoolDomain("kim@mit.edu")).toBe("mit.edu");
    expect(schoolDomain("lee@ox.ac.uk")).toBe("ox.ac.uk");
    expect(schoolDomain("bo@gmail.com")).toBeNull();
    expect(schoolDomain("bo@edu.example.com")).toBeNull();
  });

  it("labels the seal UNSW only for UNSW", () => {
    expect(isUnsw("ad.unsw.edu.au")).toBe(true);
    expect(sealLabel("ad.unsw.edu.au")).toBe("UNSW");
    expect(sealLabel("sydney.edu.au")).toBe("STUDENT");
  });

  it("reads a zID only from a z1234567 UNSW address", () => {
    expect(zidFromEmail("z5555555@ad.unsw.edu.au")).toBe("z5555555");
    expect(zidFromEmail(" Z5555555@AD.UNSW.EDU.AU ")).toBe("z5555555");
    expect(zidFromEmail("z5555555@unsw.edu.au")).toBe("z5555555");
    expect(zidFromEmail("li.bo@student.unsw.edu.au")).toBeNull();
    expect(zidFromEmail("z555555@ad.unsw.edu.au")).toBeNull();
    expect(zidFromEmail("z5555555@gmail.com")).toBeNull();
    expect(zidFromEmail("z5555555@notunsw.edu.au")).toBeNull();
  });

  it("spots UNSW in a free-text school", () => {
    expect(mentionsUnsw("unsw es")).toBe(true);
    expect(mentionsUnsw("UNSW·Bachelor of Engineering")).toBe(true);
    expect(mentionsUnsw("新南威尔士大学")).toBe(true);
    expect(mentionsUnsw("USYD · Master of IT")).toBe(false);
  });

  it("pads card numbers to four digits", () => {
    expect(memberCode(7)).toBe("BS-0007");
    expect(memberCode(71)).toBe("BS-0071");
    expect(memberCode(12345)).toBe("BS-12345");
  });
});

const GMAIL = "bo@gmail.com";

describe("parseMemberProfile", () => {
  const base: [string, string][] = [
    ["nickname", " Bo "],
    ["schoolDegree", "UNSW · Master of IT"],
    ["major", "IT"],
    ["skills", "web"],
    ["skills", "uiux"],
    ["spark", "lumi"],
    ["building", ""],
  ];

  it("accepts a minimal profile and trims text", () => {
    const result = parseMemberProfile(form(base), GMAIL);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      nickname: "Bo",
      skills: ["web", "uiux"],
      spark: "lumi",
      building: null,
      lookingFor: [],
      channel: null,
    });
  });

  it("caps skills at four and looking-for at three", () => {
    const skills = ["web", "backend", "mobile", "ai", "hw"].map(
      (s) => ["skills", s] as [string, string],
    );
    const looking = ["design", "dev", "product", "team"].map(
      (s) => ["lookingFor", s] as [string, string],
    );
    const result = parseMemberProfile(
      form([...base.filter(([k]) => k !== "skills"), ...skills, ...looking]),
      GMAIL,
    );
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toContain("skills");
    expect(paths).toContain("lookingFor");
  });

  it("rejects old skill names, unknown mascots and a missing nickname", () => {
    const result = parseMemberProfile(
      form([
        ["nickname", "  "],
        ["skills", "frontend"],
        ["spark", "pikachu"],
      ]),
      GMAIL,
    );
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(
      expect.arrayContaining(["nickname", "skills", "spark"]),
    );
  });
});

describe("parseMemberProfile zID", () => {
  const base: [string, string][] = [
    ["nickname", "Bo"],
    ["spark", "lumi"],
  ];
  const zidOf = (email: string, extra: [string, string][]) => {
    const result = parseMemberProfile(form([...base, ...extra]), email);
    return result.success
      ? { zid: result.data.zid }
      : { error: result.error.issues.map((i) => i.path[0]) };
  };

  it("takes the zID from a z1234567 UNSW email and ignores the box", () => {
    expect(zidOf("z5555555@ad.unsw.edu.au", [])).toEqual({ zid: "z5555555" });
    expect(zidOf("z5555555@ad.unsw.edu.au", [["zid", "z1111111"]])).toEqual({
      zid: "z5555555",
    });
  });

  it("needs a typed zID for any other UNSW address", () => {
    const email = "li.bo@student.unsw.edu.au";
    expect(zidOf(email, [])).toEqual({ error: ["zid"] });
    expect(zidOf(email, [["zid", "z12345"]])).toEqual({ error: ["zid"] });
    expect(zidOf(email, [["zid", " Z1234567 "]])).toEqual({ zid: "z1234567" });
  });

  it("needs one from other emails only when they tick UNSW student", () => {
    expect(zidOf(GMAIL, [])).toEqual({ zid: null });
    expect(zidOf(GMAIL, [["zid", "z1234567"]])).toEqual({ zid: null });
    expect(zidOf(GMAIL, [["unswStudent", "on"]])).toEqual({ error: ["zid"] });
    expect(
      zidOf(GMAIL, [
        ["unswStudent", "on"],
        ["zid", "1234567"],
      ]),
    ).toEqual({ zid: "z1234567" });
    expect(zidOf("kim@sydney.edu.au", [])).toEqual({ zid: null });
  });
});

describe("parseSurvey", () => {
  it("accepts an empty survey: every question is optional", () => {
    const result = parseSurvey(form([]));
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      stalledProject: null,
      referralSource: null,
      eventInterest: null,
      affiliationSupport: false,
      fullName: null,
      zid: null,
    });
  });

  it("drops a name and zID typed without opting in", () => {
    const result = parseSurvey(
      form([
        ["fullName", "Li Bo"],
        ["zid", "z1234567"],
      ]),
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ fullName: null, zid: null });
  });

  it("needs a name, a valid zID and consent from supporters", () => {
    const missing = parseSurvey(form([["affiliationSupport", "on"]]));
    expect(missing.success).toBe(false);
    const ok = parseSurvey(
      form([
        ["affiliationSupport", "on"],
        ["fullName", "Li Bo"],
        ["zid", "1234567"],
        ["affiliationConsent", "on"],
      ]),
    );
    expect(ok.success).toBe(true);
    expect(ok.data).toMatchObject({
      zid: "z1234567",
      affiliationConsent: true,
    });
  });

  it("uses the zID left when joining instead of asking again", () => {
    const result = parseSurvey(
      form([
        ["affiliationSupport", "on"],
        ["fullName", "Li Bo"],
        ["zid", "z9999999"],
        ["affiliationConsent", "on"],
      ]),
      "z1234567",
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ zid: "z1234567" });
  });
});

describe("afterEmailChange", () => {
  const none = { schoolDomain: null, verified: false };
  const unsw = { schoolDomain: "ad.unsw.edu.au", verified: true };

  it("a school address brings the seal", () => {
    expect(afterEmailChange(none, "amy@student.unsw.edu.au")).toEqual({
      schoolDomain: "student.unsw.edu.au",
      verified: true,
    });
  });

  it("another school moves it", () => {
    expect(afterEmailChange(unsw, "amy@uni.sydney.edu.au")).toEqual({
      schoolDomain: "uni.sydney.edu.au",
      verified: true,
    });
  });

  it("any other address keeps what the member had", () => {
    expect(afterEmailChange(unsw, "amy@gmail.com")).toEqual(unsw);
    expect(afterEmailChange(none, "amy@gmail.com")).toEqual(none);
  });
});
