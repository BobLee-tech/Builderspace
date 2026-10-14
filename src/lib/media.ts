// Project cover / demo video rules, shared by the upload widgets (browser), the
// submit action (server) and supabase/migrations/20261015000000_project_media.sql.
// Keep the limits and file names in step with the buckets and policies there.

export const COVER_BUCKET = "project-covers";
export const VIDEO_BUCKET = "project-videos";

const MB = 1024 * 1024;

export const COVER_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export const COVER_MAX_BYTES = 5 * MB;

export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;
export const VIDEO_MAX_BYTES = 50 * MB;
export const VIDEO_MAX_SECONDS = 180;

export type MediaKind = "cover" | "video";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const MEDIA_PATH = {
  cover: new RegExp(`^${UUID}/cover\\.(jpg|png|webp)$`),
  video: new RegExp(`^${UUID}/video\\.(mp4|webm|mov)$`),
  poster: new RegExp(`^${UUID}/poster-[0-7]\\.jpg$`),
} as const;

/**
 * Object path for one upload. Every picked file gets a fresh folder, because
 * uploads can't overwrite: replacing a cover means a new path.
 */
export function mediaPath(folder: string, kind: MediaKind, type: string) {
  const ext =
    kind === "cover"
      ? COVER_TYPES[type as keyof typeof COVER_TYPES]
      : VIDEO_TYPES[type as keyof typeof VIDEO_TYPES];
  if (!ext) throw new Error(`Unsupported ${kind} type: ${type}`);
  return `${folder}/${kind}.${ext}`;
}

/** The video frame picked as its poster, next to the video's folder name. */
export const POSTER_FRAMES = 8;
export function posterPath(folder: string, frame: number) {
  return `${folder}/poster-${frame}.jpg`;
}

/** Bilingual "zh|en" problem with a picked file, or null when it is fine. */
export function checkCover(file: { type: string; size: number }) {
  if (!(file.type in COVER_TYPES))
    return "封面只支持 JPG、PNG、WebP|Covers must be JPG, PNG or WebP";
  if (file.size > COVER_MAX_BYTES)
    return `封面 ${formatBytes(file.size)}，超过 5 MB|The cover is ${formatBytes(file.size)}, over 5 MB`;
  return null;
}

export function checkVideo(
  file: { type: string; size: number },
  seconds?: number,
) {
  if (!(file.type in VIDEO_TYPES))
    return "视频只支持 MP4、WebM、MOV|Videos must be MP4, WebM or MOV";
  if (file.size > VIDEO_MAX_BYTES)
    return `视频 ${formatBytes(file.size)}，超过 50 MB，压缩或剪短一点再传|The video is ${formatBytes(file.size)}, over 50 MB — compress or trim it`;
  if (seconds !== undefined && seconds > VIDEO_MAX_SECONDS)
    return `视频 ${formatDuration(seconds)}，请剪到 3 分钟以内|The video is ${formatDuration(seconds)}, keep it under 3 minutes`;
  return null;
}

export function formatBytes(bytes: number) {
  return bytes < MB
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / MB).toFixed(1)} MB`;
}

/** 67.4 → "1:07" */
export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
