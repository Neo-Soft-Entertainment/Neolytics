import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const activeOrganizationCookieName = "activeOrganizationId";

export async function getActiveOrganizationId() {
  const cookieStore = await cookies();
  return cookieStore.get(activeOrganizationCookieName)?.value;
}

export function setActiveOrganizationCookie(response: NextResponse, organizationId: string) {
  response.cookies.set(activeOrganizationCookieName, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}
