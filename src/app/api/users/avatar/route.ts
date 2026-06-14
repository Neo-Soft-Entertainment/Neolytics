import { createClient } from "@supabase/supabase-js";

import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { createAuditEvent } from "@/lib/audit-service";
import { getApiContext } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { env } from "@/env";
import { getErrorMessage } from "@/lib/error-message";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const DEFAULT_BUCKET = "user-avatars";

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Avatar storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error("Avatar storage key is invalid. Use the Supabase service_role API key, not the database password or project ref.");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

async function ensureAvatarBucket() {
  const supabase = getStorageClient();
  const bucket = env.USER_AVATARS_BUCKET || DEFAULT_BUCKET;
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!error && data) {
    return { supabase, bucket };
  }

  const createResult = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/*"],
    fileSizeLimit: "5MB"
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(createResult.error.message);
  }

  return { supabase, bucket };
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return badRequest("Avatar file is required.");
    }

    if (!avatar.type.startsWith("image/")) {
      return badRequest("Avatar must be an image.");
    }

    if (avatar.size > MAX_AVATAR_SIZE) {
      return badRequest("Avatar must be smaller than 5 MB.");
    }

    const { supabase, bucket } = await ensureAvatarBucket();
    const safeName = avatar.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${context.userId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await avatar.arrayBuffer());
    const uploadResult = await supabase.storage.from(bucket).upload(path, buffer, {
      upsert: false,
      contentType: avatar.type
    });

    if (uploadResult.error) {
      throw new Error(uploadResult.error.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const user = await db.user.update({
      where: {
        id: context.userId
      },
      data: {
        image: data.publicUrl
      },
      select: {
        image: true
      }
    });

    await createAuditEvent(db, {
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: "user",
      entityId: context.userId,
      action: "user.avatar_updated",
      metadata: {
        image: user.image
      }
    });

    return ok({
      image: user.image
    });
  } catch (error) {
    return serverError(getErrorMessage(error, "Não foi possível enviar o avatar."));
  }
}
