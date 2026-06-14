import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { env } from "@/env";

const DEFAULT_BUCKET = "project-art-assets";
const maxArtAssetBytes = 12 * 1024 * 1024;
const allowedArtAssetTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

export type ProjectArtAssetUpload = {
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  visualMetrics: ProjectArtAssetVisualMetrics | null;
};

export type ProjectArtAssetVisualMetrics = {
  brightness: number;
  contrast: number;
  saturation: number;
  colorfulness: number;
  edgeDensity: number;
  dominantColor: string;
  readabilityScore: number;
  legibilityRisk: "low" | "medium" | "high";
  analysisSource: "sharp";
};

function getStorageClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Project art storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY.split(".").length !== 3) {
    throw new Error("Project art storage key is invalid. Use the Supabase service_role API key.");
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });
}

async function ensureBucket() {
  const supabase = getStorageClient();
  const bucket = env.PROJECT_ART_ASSETS_BUCKET || DEFAULT_BUCKET;
  const { data, error } = await supabase.storage.getBucket(bucket);

  if (!error && data) {
    return { supabase, bucket };
  }

  const createResult = await supabase.storage.createBucket(bucket, {
    public: false,
    allowedMimeTypes: Array.from(allowedArtAssetTypes),
    fileSizeLimit: "12MB"
  });

  if (createResult.error && !createResult.error.message.toLowerCase().includes("already")) {
    throw new Error(createResult.error.message);
  }

  return { supabase, bucket };
}

function getPngDimensions(buffer: Buffer) {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function getGifDimensions(buffer: Buffer) {
  if (buffer.length < 10 || !buffer.toString("ascii", 0, 3).startsWith("GIF")) {
    return null;
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8)
  };
}

function getWebpDimensions(buffer: Buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const type = buffer.toString("ascii", 12, 16);

  if (type === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }

  if (type === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  if (type === "VP8X" && buffer.length >= 30) {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1
    };
  }

  return null;
}

function getJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getImageDimensions(buffer: Buffer) {
  return getPngDimensions(buffer)
    ?? getJpegDimensions(buffer)
    ?? getWebpDimensions(buffer)
    ?? getGifDimensions(buffer)
    ?? { width: null, height: null };
}

function validateArtAsset(file: File) {
  if (file.size <= 0) {
    throw new Error("Art asset file is empty.");
  }

  if (file.size > maxArtAssetBytes) {
    throw new Error("Art asset must be 12 MB or smaller.");
  }

  if (!allowedArtAssetTypes.has(file.type)) {
    throw new Error("Only JPG, PNG, WebP, and GIF images are allowed.");
  }
}

function getRgbSaturation(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  if (max === 0) {
    return 0;
  }

  return (max - min) / max;
}

function toHexColor(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}

async function analyzeImageVisualMetrics(buffer: Buffer) {
  try {
    const image = sharp(buffer, {
      animated: false,
      limitInputPixels: 28_000_000
    }).rotate();
    const metadata = await image.metadata();
    const { data, info } = await image
      .clone()
      .resize({
        width: 96,
        height: 96,
        fit: "inside",
        withoutEnlargement: true
      })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const pixelCount = Math.max(1, info.width * info.height);
    let totalBrightness = 0;
    let totalBrightnessSquared = 0;
    let totalSaturation = 0;
    let totalRed = 0;
    let totalGreen = 0;
    let totalBlue = 0;
    let edgeCount = 0;
    const luminanceValues: number[] = [];

    for (let index = 0; index < data.length; index += channels) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? red;
      const blue = data[index + 2] ?? green;
      const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);

      totalBrightness += luminance;
      totalBrightnessSquared += luminance * luminance;
      totalSaturation += getRgbSaturation(red, green, blue);
      totalRed += red;
      totalGreen += green;
      totalBlue += blue;
      luminanceValues.push(luminance);
    }

    for (let y = 0; y < info.height; y += 1) {
      for (let x = 1; x < info.width; x += 1) {
        const current = luminanceValues[(y * info.width) + x] ?? 0;
        const previous = luminanceValues[(y * info.width) + x - 1] ?? current;

        if (Math.abs(current - previous) > 32) {
          edgeCount += 1;
        }
      }
    }

    const brightness = totalBrightness / pixelCount;
    const variance = (totalBrightnessSquared / pixelCount) - (brightness * brightness);
    const contrast = Math.sqrt(Math.max(0, variance));
    const saturation = (totalSaturation / pixelCount) * 100;
    const edgeDensity = (edgeCount / Math.max(1, info.height * Math.max(1, info.width - 1))) * 100;
    const readabilityScore = Math.max(0, Math.min(100, Math.round(
      contrast * 1.25
      + Math.min(24, saturation * 0.18)
      - Math.max(0, edgeDensity - 28) * 0.7
      - (brightness < 34 || brightness > 222 ? 16 : 0)
    )));
    const legibilityRisk = readabilityScore < 45 ? "high" : readabilityScore < 68 ? "medium" : "low";

    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      visualMetrics: {
        brightness: Math.round(brightness),
        contrast: Math.round(contrast),
        saturation: Math.round(saturation),
        colorfulness: Math.round(Math.min(100, saturation + (contrast * 0.35))),
        edgeDensity: Math.round(edgeDensity),
        dominantColor: toHexColor(totalRed / pixelCount, totalGreen / pixelCount, totalBlue / pixelCount),
        readabilityScore,
        legibilityRisk,
        analysisSource: "sharp"
      } satisfies ProjectArtAssetVisualMetrics
    };
  } catch {
    const dimensions = getImageDimensions(buffer);

    return {
      width: dimensions.width,
      height: dimensions.height,
      visualMetrics: null
    };
  }
}

export async function uploadProjectArtAssetFile(params: {
  organizationId: string;
  projectId: string;
  file: File;
}) {
  validateArtAsset(params.file);

  const { supabase, bucket } = await ensureBucket();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${params.organizationId}/${params.projectId}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());
  const analysis = await analyzeImageVisualMetrics(buffer);
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    upsert: false,
    contentType: params.file.type
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storagePath: path,
    originalName: params.file.name,
    mimeType: params.file.type,
    sizeBytes: params.file.size,
    width: analysis.width,
    height: analysis.height,
    visualMetrics: analysis.visualMetrics
  } satisfies ProjectArtAssetUpload;
}

export async function createProjectArtAssetSignedUrl(storagePath: string) {
  const { supabase, bucket } = await ensureBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 60 * 30);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Não foi possível criar a URL assinada.");
  }

  return data.signedUrl;
}

export async function deleteProjectArtAssetFile(storagePath: string) {
  const { supabase, bucket } = await ensureBucket();
  await supabase.storage.from(bucket).remove([storagePath]);
}
