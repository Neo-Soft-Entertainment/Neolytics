import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

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
  if (!protectedMethods.has(request.method)) {
    return NextResponse.next();
  }

  const requestOrigin = getRequestOrigin(request);

  if (!requestOrigin) {
    return NextResponse.next();
  }

  if (requestOrigin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
