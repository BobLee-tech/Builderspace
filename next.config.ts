import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

// Team photos on /people come from the public team-photos bucket; next/image
// may fetch from that bucket and nowhere else on Supabase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/team-photos/**`)]
      : [],
  },
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The core-team form used to live at /volunteer; keep shared links working.
  async redirects() {
    return [
      { source: "/volunteer", destination: "/core-team", permanent: true },
    ];
  },
  // The workshop prompt page is a static file in public/prompt/.
  async rewrites() {
    return [{ source: "/prompt", destination: "/prompt/index.html" }];
  },
};

export default nextConfig;
