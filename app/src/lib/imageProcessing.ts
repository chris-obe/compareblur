export const GALLERY_UPLOAD_MAX_BYTES = 1024 * 1024;
export const GALLERY_UPLOAD_MAX_LONG_EDGE = 2048;

export type ImageProcessingStage = 'idle' | 'decoding' | 'resizing' | 'compressing' | 'ready' | 'uploading';

export interface ImageProcessingProgress {
  stage: ImageProcessingStage;
  label: string;
  percent: number;
}

export interface ProcessedImage {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  processedBytes: number;
  contentType: string;
}

type ProgressCallback = (progress: ImageProcessingProgress) => void;

const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];

export async function processGalleryUploadImage(
  file: File,
  onProgress?: ProgressCallback,
): Promise<ProcessedImage> {
  progress(onProgress, 'decoding', 'Reading image', 12);
  const bitmap = await createBitmap(file);

  try {
    progress(onProgress, 'resizing', 'Resizing image', 30);
    let maxLongEdge = GALLERY_UPLOAD_MAX_LONG_EDGE;

    while (maxLongEdge >= 900) {
      const { canvas, width, height } = drawToCanvas(bitmap, maxLongEdge);
      progress(onProgress, 'compressing', `Compressing ${width}×${height}`, 52);

      const encoded = await encodeUnderLimit(canvas, onProgress);
      if (encoded.blob.size <= GALLERY_UPLOAD_MAX_BYTES) {
        const extension = encoded.blob.type === 'image/webp' ? 'webp' : 'jpg';
        const processedFile = new File([encoded.blob], replaceExtension(file.name, extension), {
          type: encoded.blob.type,
          lastModified: Date.now(),
        });
        progress(onProgress, 'ready', 'Ready to upload', 100);
        return {
          file: processedFile,
          width,
          height,
          originalBytes: file.size,
          processedBytes: processedFile.size,
          contentType: processedFile.type,
        };
      }

      if (maxLongEdge <= 900) break;
      maxLongEdge = Math.floor(maxLongEdge * 0.85);
    }
  } finally {
    bitmap.close?.();
  }

  throw new Error('Could not compress image under 1 MB.');
}

function progress(
  onProgress: ProgressCallback | undefined,
  stage: ImageProcessingStage,
  label: string,
  percent: number,
) {
  onProgress?.({ stage, label, percent });
}

async function createBitmap(file: File): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) return createImageBitmap(file, { imageOrientation: 'from-image' });

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
    return createImageBitmap(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(bitmap: ImageBitmap, maxLongEdge: number) {
  const scale = Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Browser image canvas is unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

async function encodeUnderLimit(canvas: HTMLCanvasElement, onProgress?: ProgressCallback) {
  const preferred = await encodeWithType(canvas, 'image/webp', QUALITY_STEPS[0]);
  const supportsWebp = preferred.type === 'image/webp';
  const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
  let best = preferred;

  for (let i = 0; i < QUALITY_STEPS.length; i += 1) {
    progress(onProgress, 'compressing', `Compressing image (${Math.round(QUALITY_STEPS[i] * 100)}%)`, 55 + i * 5);
    const blob = i === 0 && supportsWebp ? preferred : await encodeWithType(canvas, mimeType, QUALITY_STEPS[i]);
    best = blob.size < best.size ? blob : best;
    if (blob.size <= GALLERY_UPLOAD_MAX_BYTES) return { blob };
  }

  return { blob: best };
}

function encodeWithType(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not encode image'));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

function replaceExtension(name: string, extension: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'gallery-upload';
  return `${base}.${extension}`;
}
