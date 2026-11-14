import {
  ANALYSIS_SIDE,
  MAX_UPLOAD_SIDE,
  analyzeImagePixels,
  computeTargetSize,
  type ImageQualityReport,
} from './quality';

/** Gambar label yang sudah dikecilkan di perangkat dan siap dikirim ke pembaca label. */
export interface PreparedImage {
  /** Data URL JPEG hasil pengecilan. */
  dataUrl: string;
  width: number;
  height: number;
  /** Ukuran perkiraan dalam byte. */
  bytes: number;
  originalWidth: number;
  originalHeight: number;
  mutu: ImageQualityReport;
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Batas ukuran berkas asli yang diterima (sebelum dikecilkan). */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export class ImagePrepareError extends Error {}

type Drawable = CanvasImageSource & { width: number; height: number };

async function decode(file: Blob): Promise<{ source: Drawable; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, close: () => bitmap.close() };
    } catch {
      // Lanjut ke cara lama di bawah.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode();
    return {
      source: Object.assign(image, { width: image.naturalWidth, height: image.naturalHeight }),
      close: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImagePrepareError(
      'Gambar tidak bisa dibuka. Pakai foto berformat JPG, PNG, atau WebP.',
    );
  }
}

function drawToCanvas(source: Drawable, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImagePrepareError('Peramban ini tidak bisa mengolah gambar.');
  }
  // Latar putih supaya PNG/WebP transparan tidak jadi hitam saat dijadikan JPEG.
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function prepareFromSource(source: Drawable): PreparedImage {
  const originalWidth = source.width;
  const originalHeight = source.height;
  if (!originalWidth || !originalHeight) {
    throw new ImagePrepareError('Gambar kosong atau rusak. Coba foto atau berkas lain.');
  }

  const target = computeTargetSize(originalWidth, originalHeight, MAX_UPLOAD_SIDE);
  const canvas = drawToCanvas(source, target.width, target.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

  // Salinan analisis digambar dari kanvas hasil, bukan dari sumber penuh.
  const sample = computeTargetSize(target.width, target.height, ANALYSIS_SIDE);
  const sampleCanvas = drawToCanvas(canvas, sample.width, sample.height);
  canvas.width = 0;
  canvas.height = 0;
  const pixels = sampleCanvas
    .getContext('2d')
    ?.getImageData(0, 0, sample.width, sample.height).data;
  sampleCanvas.width = 0;
  sampleCanvas.height = 0;
  const mutu = analyzeImagePixels(pixels ?? [], sample.width, sample.height, {
    width: originalWidth,
    height: originalHeight,
  });

  const base64Length = dataUrl.length - dataUrl.indexOf(',') - 1;
  return {
    dataUrl,
    width: target.width,
    height: target.height,
    bytes: Math.round((base64Length * 3) / 4),
    originalWidth,
    originalHeight,
    mutu,
  };
}

/** Membuka berkas gambar, mengecilkannya, dan memeriksa mutunya. Semua di perangkat. */
export async function prepareImageFile(file: Blob): Promise<PreparedImage> {
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new ImagePrepareError(
      'Format berkas belum didukung. Pakai foto berformat JPG, PNG, atau WebP.',
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ImagePrepareError('Berkas terlalu besar (lebih dari 20 MB). Pakai foto yang lebih kecil.');
  }
  const { source, close } = await decode(file);
  try {
    return prepareFromSource(source);
  } finally {
    close();
  }
}

/** Mengambil satu bingkai dari video kamera lalu menyiapkannya seperti berkas unggahan. */
export function prepareVideoFrame(video: HTMLVideoElement): PreparedImage {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new ImagePrepareError('Kamera belum siap. Tunggu sebentar lalu coba lagi.');
  }
  const frame = drawToCanvas(video, width, height);
  try {
    return prepareFromSource(frame);
  } finally {
    frame.width = 0;
    frame.height = 0;
  }
}
