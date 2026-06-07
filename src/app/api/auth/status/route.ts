import { ok, serverError } from "@/lib/api-response";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return ok({ available: true });
  } catch {
    return serverError("Authentication servers are temporarily unavailable. Try again later.");
  }
}
