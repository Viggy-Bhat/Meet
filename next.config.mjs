const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https://utfs.io https://*.utfs.io https://uploadthing.com https://*.uploadthing.com https://www.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' https://uploadthing.com https://*.uploadthing.com https://utfs.io https://api.uploadthing.com https://openrouter.ai https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com`,
  `frame-src 'self' https://accounts.google.com https://apis.google.com https://meet.google.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `media-src 'self' https://utfs.io https://*.utfs.io`,
  `worker-src 'self' blob:`,
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
