import { NextResponse } from "next/server";

import { notFound, serverError, unauthorized } from "@/lib/api-response";
import { getApiContext } from "@/lib/auth-helpers";
import { exportDemoManager } from "@/lib/demo-manager-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  void request;
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const { projectId } = await params;
    const data = await exportDemoManager(context.workspace.id, projectId);

    if (!data) {
      return notFound("Project not found.");
    }

    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="demo-manager-${projectId}.json"`
      }
    });
  } catch {
    return serverError("Unable to export Demo Manager data.");
  }
}
