// Browser-side uploads straight to Supabase Storage over tus (resumable), so a
// 50 MB video never passes through a Server Action. Storage RLS in
// supabase/migrations/20261015000000_project_media.sql allows new objects only.

export type UploadHandle = {
  done: Promise<void>;
  cancel: () => void;
};

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when uploads really go anywhere; otherwise they are simulated. */
export const uploadsLive = Boolean(URL_ && KEY);

export function uploadFile({
  bucket,
  path,
  file,
  onProgress,
}: {
  bucket: string;
  path: string;
  file: Blob;
  onProgress: (fraction: number) => void;
}): UploadHandle {
  if (!uploadsLive) return simulate(file.size, onProgress);

  let cancelled = false;
  let abort = () => {};
  const done = import("tus-js-client").then(
    ({ Upload }) =>
      new Promise<void>((resolve, reject) => {
        if (cancelled)
          return reject(new DOMException("cancelled", "AbortError"));
        const upload = new Upload(file, {
          endpoint: `${URL_}/storage/v1/upload/resumable`,
          headers: {
            authorization: `Bearer ${KEY}`,
            apikey: KEY!,
            "x-upsert": "false",
          },
          metadata: {
            bucketName: bucket,
            objectName: path,
            contentType: file.type || "application/octet-stream",
            cacheControl: "31536000",
          },
          // Supabase only accepts 6 MB chunks. Retries cover flaky Wi-Fi; the
          // folder is new per page load, so nothing is resumed across reloads.
          chunkSize: 6 * 1024 * 1024,
          uploadDataDuringCreation: true,
          storeFingerprintForResuming: false,
          retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
          onProgress: (sent, total) => onProgress(total ? sent / total : 0),
          onSuccess: () => resolve(),
          onError: reject,
        });
        abort = () => void upload.abort(true);
        upload.start();
      }),
  );
  return {
    done,
    cancel: () => {
      cancelled = true;
      abort();
    },
  };
}

/** Local development without Supabase: fake progress so the form still works. */
function simulate(bytes: number, onProgress: (f: number) => void) {
  let timer = 0;
  let cancel = () => {};
  const done = new Promise<void>((resolve, reject) => {
    const ms = Math.min(4000, Math.max(900, bytes / 2500));
    const start = Date.now();
    timer = window.setInterval(() => {
      const f = Math.min(1, (Date.now() - start) / ms);
      onProgress(f);
      if (f === 1) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
    cancel = () => {
      clearInterval(timer);
      reject(new DOMException("cancelled", "AbortError"));
    };
  });
  return { done, cancel: () => cancel() };
}
