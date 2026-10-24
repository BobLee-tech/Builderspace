import { describe, expect, it } from "vitest";
import { displayLength, PITCH_MAX } from "./text-length";

describe("displayLength", () => {
  it("counts a Chinese character as 1 and a Latin one as half", () => {
    expect(displayLength("出门前就知道图书馆哪层还有空位")).toBe(15);
    expect(displayLength("abcd")).toBe(2);
    expect(displayLength("abc")).toBe(2);
    expect(displayLength("")).toBe(0);
  });
  it("counts full-width punctuation as a full character", () => {
    expect(displayLength("选课前，先看看。")).toBe(8);
    expect(displayLength("a,b.")).toBe(2);
  });
  it("mixes both", () => {
    // 给 1, two spaces ½ each, Windows 3½, 每块屏幕单独设壁纸 9: 14½ → 15.
    expect(displayLength("给 Windows 每块屏幕单独设壁纸")).toBe(15);
  });
  it("fits about 72 English letters in a pitch", () => {
    expect(displayLength("a".repeat(72))).toBe(PITCH_MAX);
    expect(displayLength("a".repeat(73))).toBeGreaterThan(PITCH_MAX);
  });
});
