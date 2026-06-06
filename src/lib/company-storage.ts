import { createClient } from "@supabase/supabase-js";

import { env } from "@/env";

const DEFAULT_BUCKET = "company-documents";

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage is not configured.");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

function getBucketName() {
  return env.COMPANY_DOCUMENTS_BUCKET || DEFAULT_BUCKET;
}

async function ensureBucket() {
  const supabase = getStorageClient();
  const bucket = getBucketName();
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!error && data) {
    return { supabase, bucket };
  }

  const createResult = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: "20MB"
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(createResult.error.message);
  }

  return { supabase, bucket };
}

export async function uploadCompanyDocumentFile(params: {
  organizationId: string;
  file: File;
  folder: string;
}) {
  const { supabase, bucket } = await ensureBucket();
  const timestamp = Date.now();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${params.organizationId}/${params.folder}/${timestamp}-${safeName}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    upsert: false,
    contentType: params.file.type || "application/octet-stream"
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storagePath: path,
    originalName: params.file.name,
    mimeType: params.file.type || "application/octet-stream",
    sizeBytes: params.file.size
  };
}

export async function createCompanyDocumentSignedUrl(storagePath: string) {
  const { supabase, bucket } = await ensureBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 30);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Unable to create signed URL.");
  }

  return data.signedUrl;
}
