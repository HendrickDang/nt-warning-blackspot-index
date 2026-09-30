import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** Longest edge kept when shrinking a photo before upload. */
const MAX_EDGE = 1280;
/** JPEG quality after resizing (0–1). Keeps payloads to roughly 150–250 KB. */
const QUALITY = 0.6;

export type EncodedPhoto = {
  /** `data:image/jpeg;base64,...` ready to POST. */
  dataUri: string;
  /** Approximate decoded size in bytes, for logging/diagnostics. */
  bytes: number;
};

/**
 * Shrink a captured photo and return it as a base64 data URI.
 *
 * Photos straight from the camera can be several megabytes; resizing first keeps
 * the upload small enough to send over a weak rural connection. Returns null if
 * the image cannot be processed, so a report is never blocked by its photo.
 */
export async function encodePhotoForUpload(uri: string): Promise<EncodedPhoto | null> {
  try {
    const result = await manipulateAsync(uri, [{ resize: { width: MAX_EDGE } }], {
      compress: QUALITY,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (!result.base64) return null;

    const base64 = result.base64;
    return {
      dataUri: `data:image/jpeg;base64,${base64}`,
      // Base64 is ~4/3 of the binary size; this is only used for reporting.
      bytes: Math.round((base64.length * 3) / 4),
    };
  } catch {
    return null;
  }
}
