import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const activeWorkspaceCookieName = "activeWorkspaceId";

export async function getActiveWorkspaceId() {
  const cookieStore = await cookies();
  return cookieStore.get(activeWorkspaceCookieName)?.value;
}

export function setActiveWorkspaceCookie(response: NextResponse, workspaceId: string) {
  response.cookies.set(activeWorkspaceCookieName, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
}
