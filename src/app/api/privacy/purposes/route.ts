import { ok } from "@/lib/api-response";
import { listProcessingPurposes } from "@/lib/privacy/processing-purposes";

export async function GET() {
  return ok({
    purposes: listProcessingPurposes()
  });
}
