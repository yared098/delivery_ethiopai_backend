import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Compresses and resizes an image buffer to guarantee it is strictly <= maxBytes (default 2MB).
 * Auto-orients EXIF, converts to progressive JPEG, and iteratively reduces quality/dimensions
 * if necessary to stay within the limit.
 */
export async function compressImage(
  inputBuffer: Buffer,
  maxBytes: number = MAX_IMAGE_BYTES,
): Promise<Buffer> {
  const metadata = await sharp(inputBuffer).metadata();

  let width = metadata.width || 1920;
  let height = metadata.height || 1920;

  // Max dimension 1920px on the longest side
  const maxDim = 1920;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  let quality = 85;
  let buffer = await sharp(inputBuffer)
    .rotate() // auto-orient based on EXIF
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toBuffer();

  // If still above maxBytes, iteratively lower quality and scale down
  while (buffer.length > maxBytes && quality > 20) {
    quality -= 15;
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);

    buffer = await sharp(inputBuffer)
      .rotate()
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer();
  }

  return buffer;
}
