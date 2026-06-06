import { z } from "zod";

import { badRequest, ok, serverError } from "@/lib/api-response";
import { getReviewHistory } from "@/lib/game-service";

const schema = z.coerce.number().int().positive();

export async function GET(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { appId } = await params;
    return ok(await getReviewHistory(schema.parse(appId)));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return badRequest("Invalid app id.");
    }

    return serverError();
  }
}
