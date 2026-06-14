import { createClient } from "@supabase/supabase-js";

import { env } from "@/env";

const DEFAULT_BUCKET = "community-media";
const maxCommunityImageBytes = 8 * 1024 * 1024;
const allowedCommunityImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export type CommunityMediaItem = {
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  signedUrl?: string;
};

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("O armazenamento de mídia da comunidade não está configurado. Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error("A chave do armazenamento de mídia da comunidade é inválida. Use a chave de API service_role do Supabase.");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

async function ensureBucket() {
  const supabase = getStorageClient();
  const bucket = env.COMMUNITY_MEDIA_BUCKET || DEFAULT_BUCKET;
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!error && data) {
    return { supabase, bucket };
  }

  const createResult = await supabase.storage.createBucket(bucket, {
    public: false,
    allowedMimeTypes: Array.from(allowedCommunityImageTypes),
    fileSizeLimit: "8MB"
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(createResult.error.message);
  }

  return { supabase, bucket };
}

function validateCommunityImage(file: File) {
  if (file.size <= 0) {
    throw new Error("O arquivo de imagem está vazio.");
  }

  if (file.size > maxCommunityImageBytes) {
    throw new Error("Cada imagem deve ter 8 MB ou menos.");
  }

  if (!allowedCommunityImageTypes.has(file.type)) {
    throw new Error("Apenas imagens JPG, PNG, WebP e GIF são permitidas.");
  }
}

export async function uploadCommunityImages(params: {
  organizationId: string;
  postId: string;
  files: File[];
}) {
  if (params.files.length > 4) {
    throw new Error("Posts da comunidade aceitam até 4 imagens.");
  }

  const { supabase, bucket } = await ensureBucket();
  const uploaded: CommunityMediaItem[] = [];

  for (const file of params.files) {
    validateCommunityImage(file);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${params.organizationId}/${params.postId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      upsert: false,
      contentType: file.type
    });

    if (error) {
      throw new Error(error.message);
    }

    uploaded.push({
      storagePath: path,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    });
  }

  return uploaded;
}

export async function createCommunityImageSignedUrls(media: CommunityMediaItem[]) {
  if (media.length === 0) {
    return [];
  }

  const { supabase, bucket } = await ensureBucket();

  return Promise.all(media.map(async (item) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(item.storagePath, 60 * 30);

    return {
      ...item,
      signedUrl: error ? undefined : data?.signedUrl
    };
  }));
}

export async function deleteCommunityImages(media: CommunityMediaItem[]) {
  if (media.length === 0) {
    return;
  }

  const { supabase, bucket } = await ensureBucket();
  const paths = media.map((item) => item.storagePath).filter(Boolean);

  if (paths.length === 0) {
    return;
  }

  await supabase.storage.from(bucket).remove(paths);
}
