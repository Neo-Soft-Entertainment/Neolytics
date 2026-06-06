import { z } from "zod";

import { createWorkbookDownloadResponse, createGoogleSheetsPublishResponse } from "@/lib/export-route";
import { unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { buildGameSearchWorkbook } from "@/lib/export-service";
import { parseSearchParams } from "@/lib/request";

const schema = z.object({
  query: z.string().optional(),
  genre: z.string().optional(),
  tag: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  minReviewScore: z.coerce.number().nonnegative().optional(),
  fromReleaseDate: z.string().optional(),
  toReleaseDate: z.string().optional(),
  pageSize: z.coerce.number().int().positive().max(500).optional()
});

function getInput(request: Request) {
  const url = new URL(request.url);
  const parsed = parseSearchParams(url, schema);

  return {
    ...parsed,
    fromReleaseDate: parsed.fromReleaseDate ? new Date(parsed.fromReleaseDate) : undefined,
    toReleaseDate: parsed.toReleaseDate ? new Date(parsed.toReleaseDate) : undefined
  };
}

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createWorkbookDownloadResponse(request, () => buildGameSearchWorkbook(getInput(request)));
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createGoogleSheetsPublishResponse(
    () => buildGameSearchWorkbook(getInput(request)),
    context.session.user.email
  );
}
