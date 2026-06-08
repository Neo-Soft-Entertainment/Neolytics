import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const apiMethods = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]);

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

  if (process.env.NODE_ENV === "production" && forwardedProto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const allowedOrigins = getAllowedOrigins(request);

    if (origin && !allowedOrigins.has(origin)) {
      return NextResponse.json({ message: "Origin is not allowed." }, { status: 403 });
    }

    if (!apiMethods.has(request.method)) {
      return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
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
      return response;
    }
  }

  if (protectedMethods.has(request.method)) {
    const requestOrigin = getRequestOrigin(request);

    if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
      return NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 });
    }

    if (requestOrigin) {
      const response = NextResponse.next();
      response.headers.set("Access-Control-Allow-Origin", requestOrigin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|icon.jpg|apple-icon.jpg).*)"]
};
