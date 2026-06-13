import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https:",
  "frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

const noStoreHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, max-age=0"
  },
  {
    key: "Pragma",
    value: "no-cache"
  },
  {
    key: "Expires",
    value: "0"
  }
];

const sensitiveSources = [
  "/api/auth/:path*",
  "/api/company/:path*",
  "/api/commerce/:path*",
  "/api/community/:path*",
  "/api/exports/projects/:path*",
  "/api/finance/:path*",
  "/api/invitations/:path*",
  "/api/organizations/:path*",
  "/api/privacy/:path*",
  "/api/projects/:path*",
  "/api/signup",
  "/api/users/:path*",
  "/api/workspaces/:path*",
  "/company/:path*",
  "/commerce/:path*",
  "/community/:path*",
  "/dashboard",
  "/finance/:path*",
  "/invite/:path*",
  "/login",
  "/privacy/:path*",
  "/projects/:path*",
  "/settings/:path*",
  "/setup",
  "/signup/:path*"
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      },
      ...sensitiveSources.map((source) => ({
        source,
        headers: noStoreHeaders
      }))
    ];
  }
};

export default nextConfig;
