import { describe, expect, it } from "vitest";
import {
  checkCover,
  checkVideo,
  formatBytes,
  formatDuration,
  MEDIA_PATH,
  mediaPath,
  posterPath,
} from "./media";

const folder = "0b6c1f0e-8a4e-4d43-9a39-2f1f6f0f7c11";
const MB = 1024 * 1024;

describe("mediaPath", () => {
  it("names files the way the storage policies expect", () => {
    expect(mediaPath(folder, "cover", "image/png")).toBe(`${folder}/cover.png`);
    expect(mediaPath(folder, "video", "video/quicktime")).toBe(
      `${folder}/video.mov`,
    );
    expect(
      MEDIA_PATH.cover.test(mediaPath(folder, "cover", "image/webp")),
    ).toBe(true);
    expect(MEDIA_PATH.video.test(mediaPath(folder, "video", "video/mp4"))).toBe(
      true,
    );
    expect(MEDIA_PATH.poster.test(posterPath(folder, 7))).toBe(true);
    expect(MEDIA_PATH.poster.test(posterPath(folder, 8))).toBe(false);
  });

  it("refuses types the buckets don't accept", () => {
    expect(() => mediaPath(folder, "cover", "image/gif")).toThrow();
    expect(() => mediaPath(folder, "video", "video/x-msvideo")).toThrow();
  });
});

describe("checkCover / checkVideo", () => {
  it("accepts files inside the limits", () => {
    expect(checkCover({ type: "image/jpeg", size: 4 * MB })).toBeNull();
    expect(checkVideo({ type: "video/mp4", size: 49 * MB }, 179)).toBeNull();
  });

  it("explains what is wrong", () => {
    expect(checkCover({ type: "image/gif", size: 1 })).toMatch(/JPG/);
    expect(checkCover({ type: "image/png", size: 6 * MB })).toMatch(/6\.0 MB/);
    expect(checkVideo({ type: "video/mp4", size: 51 * MB })).toMatch(/50 MB/);
    expect(checkVideo({ type: "video/mp4", size: MB }, 200)).toMatch(/3:20/);
  });
});

describe("formatting", () => {
  it("formats sizes and durations", () => {
    expect(formatBytes(512)).toBe("1 KB");
    expect(formatBytes(3.25 * MB)).toBe("3.3 MB");
    expect(formatDuration(7.4)).toBe("0:07");
    expect(formatDuration(125)).toBe("2:05");
  });
});
