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

    let resolvedValue0: any;
  if (parsed.fromReleaseDate) {
    resolvedValue0 = new Date(parsed.fromReleaseDate);
  } else {
    resolvedValue0 = undefined;
  }
  let resolvedValue1: any;
  if (parsed.toReleaseDate) {
    resolvedValue1 = new Date(parsed.toReleaseDate);
  } else {
    resolvedValue1 = undefined;
  }
return {
    ...parsed,
    fromReleaseDate: resolvedValue0,
    toReleaseDate: resolvedValue1
  };
}

export async function GET(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createWorkbookDownloadResponse(request, context.organizationId, () => buildGameSearchWorkbook(getInput(request)));
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  return createGoogleSheetsPublishResponse(
    context.organizationId,
    () => buildGameSearchWorkbook(getInput(request)),
    context.session.user.email
  );
}
