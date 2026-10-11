// Public origin for metadata and the calendar feed. On Vercel the production
// domain is provided automatically; NEXT_PUBLIC_SITE_URL overrides it (e.g. a
// custom domain).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
