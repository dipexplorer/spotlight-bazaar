import { createServerClient } from "@/lib/supabase/server";

export const STOREFRONT_MEDIA_BUCKET = "storefront-media";

/**
 * Uploads a compressed data:image/* string into Supabase Storage (`storefront-media`)
 * and returns its public CDN URL. Existing http(s) or relative URLs pass through untouched.
 */
export async function uploadStorefrontImage(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  slug: string,
  rawImg: string,
  index: number
): Promise<string> {
  if (!rawImg || !rawImg.startsWith("data:image/")) {
    return rawImg;
  }

  const match = rawImg.match(/^data:(image\/(?:webp|jpeg|jpg|png));base64,(.+)$/i);
  if (!match) {
    return rawImg;
  }

  const mimeType =
    match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const ext =
    mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  const buffer = Buffer.from(match[2], "base64");
  const filePath = `${slug}/${Date.now()}-${index + 1}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STOREFRONT_MEDIA_BUCKET)
    .upload(filePath, buffer, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    console.warn("[storage] Upload fallback:", uploadError.message);
    return rawImg;
  }

  const { data: urlData } = supabase.storage
    .from(STOREFRONT_MEDIA_BUCKET)
    .getPublicUrl(filePath);
  return urlData?.publicUrl || rawImg;
}

