import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const apiMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]);
const sensitivePathPrefixes = [
  "/api/auth",
  "/api/company",
  "/api/commerce",
  "/api/community",
  "/api/exports/projects",
  "/api/finance",
  "/api/invitations",
  "/api/organizations",
  "/api/privacy",
  "/api/projects",
  "/api/users",
  "/api/workspaces",
  "/company",
  "/commerce",
  "/community",
  "/dashboard",
  "/finance",
  "/privacy",
  "/projects",
  "/settings"
];

function isSensitivePath(pathname: string) {
  return sensitivePathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applyTransportSecurityHeaders(response: NextResponse, pathname: string) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  if (isSensitivePath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

function getAllowedOrigins(request: NextRequest) {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? [];
  const appUrl = process.env.APP_URL || process.env.AUTH_URL;
  const origins = new Set(configured);

  if (appUrl) {
    origins.add(new URL(appUrl).origin);
  }

  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add(request.nextUrl.origin);
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

function getRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const pathname = request.nextUrl.pathname;

  if (pathname === "/favicon.ico") {
    const url = request.nextUrl.clone();
    url.pathname = "/neolytics-icon.png";
    return applyTransportSecurityHeaders(NextResponse.rewrite(url), pathname);
  }

  if (process.env.NODE_ENV === "production" && forwardedProto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    return applyTransportSecurityHeaders(NextResponse.redirect(url, 308), pathname);
  }

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const allowedOrigins = getAllowedOrigins(request);

    if (origin && !allowedOrigins.has(origin)) {
      return applyTransportSecurityHeaders(NextResponse.json({ message: "Origin is not allowed." }, { status: 403 }), pathname);
    }

    if (!apiMethods.has(request.method)) {
      return applyTransportSecurityHeaders(NextResponse.json({ message: "Method not allowed." }, { status: 405 }), pathname);
    }

    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });

      if (origin && allowedOrigins.has(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }

      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      response.headers.set("Access-Control-Max-Age", "600");
      return applyTransportSecurityHeaders(response, pathname);
    }
  }

  if (protectedMethods.has(request.method)) {
    const requestOrigin = getRequestOrigin(request);

    if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
      return applyTransportSecurityHeaders(NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 }), pathname);
    }

    if (requestOrigin) {
      const response = NextResponse.next();
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return applyTransportSecurityHeaders(response, pathname);
    }
  }

  return applyTransportSecurityHeaders(NextResponse.next(), pathname);
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|icon.jpg|apple-icon.jpg).*)"]
};
