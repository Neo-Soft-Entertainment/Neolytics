import { z } from "zod";

export function parseSearchParams<T extends z.ZodTypeAny>(url: URL, schema: T) {
  return schema.parse(Object.fromEntries(url.searchParams.entries()));
}

export async function parseJsonBody<T extends z.ZodTypeAny>(request: Request, schema: T) {
  const body = await request.json();
  return schema.parse(body);
}
