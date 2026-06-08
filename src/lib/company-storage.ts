import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

import { env } from "@/env";

const DEFAULT_BUCKET = "company-documents";
const maxCompanyDocumentBytes = 20 * 1024 * 1024;
const allowedCompanyDocumentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const allowedCompanyDocumentExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp"
]);

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase Storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error("Supabase Storage service role key is invalid. Use the Supabase service_role API key, not the database password or project ref.");
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

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.trim().toLowerCase() ?? "";
}

function validateCompanyDocumentFile(file: File) {
  const extension = getFileExtension(file.name);

  if (file.size <= 0) {
    throw new Error("Document file is empty.");
  }

  if (file.size > maxCompanyDocumentBytes) {
    throw new Error("Document file must be 20 MB or smaller.");
  }

  if (!allowedCompanyDocumentExtensions.has(extension)) {
    throw new Error("Document file extension is not allowed.");
  }

  if (!allowedCompanyDocumentMimeTypes.has(file.type)) {
    throw new Error("Document file type is not allowed.");
  }
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
  validateCompanyDocumentFile(params.file);

  const { supabase, bucket } = await ensureBucket();
  const timestamp = Date.now();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${params.organizationId}/${params.folder}/${timestamp}-${safeName}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
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
    sizeBytes: params.file.size,
    checksum
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
