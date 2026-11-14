/**
 * Pemeriksaan mutu gambar label di perangkat (F-02), tanpa jaringan.
 * Fungsi di berkas ini murni: menerima data piksel dan mengembalikan angka atau laporan.
 */

/** Sisi terpanjang gambar yang dikirim ke pembaca label. Cukup untuk teks kecil, tetap ringan dikirim. */
export const MAX_UPLOAD_SIDE = 1600;

/** Sisi terpanjang salinan kecil untuk analisis mutu. */
export const ANALYSIS_SIDE = 512;

/** Ambang mutu (perkiraan awal, perlu diuji dengan foto kemasan nyata). */
export const QUALITY_THRESHOLDS = {
  /** Rata-rata kecerahan 0-255 di bawah ini dianggap terlalu gelap. */
  gelap: 60,
  /** Rata-rata kecerahan di atas ini dianggap terlalu terang atau silau. */
  terang: 225,
  /** Variansi Laplacian di bawah ini dianggap buram (dihitung pada salinan 512 px). */
  buram: 60,
  /** Sisi terpendek gambar asli di bawah ini dianggap terlalu kecil untuk dibaca. */
  sisiMinimum: 480,
} as const;

export type ImageIssueCode = 'gelap' | 'terang' | 'buram' | 'kecil';

export interface ImageIssue {
  kode: ImageIssueCode;
  pesan: string;
}

export interface ImageQualityReport {
  /** true bila tidak ada masalah yang terdeteksi. */
  baik: boolean;
  masalah: ImageIssue[];
  kecerahan: number;
  ketajaman: number;
}

/** Ukuran baru dengan sisi terpanjang paling banyak `maxSide`, rasio dipertahankan. Tidak pernah memperbesar. */
export function computeTargetSize(
  width: number,
  height: number,
  maxSide: number = MAX_UPLOAD_SIDE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxSide) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Mengubah data RGBA (seperti dari canvas) menjadi kecerahan per piksel (luma Rec. 601). */
export function toGrayscale(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    gray[i] =
      0.299 * (rgba[offset] ?? 0) + 0.587 * (rgba[offset + 1] ?? 0) + 0.114 * (rgba[offset + 2] ?? 0);
  }
  return gray;
}

/** Rata-rata kecerahan 0-255. */
export function meanBrightness(gray: ArrayLike<number>): number {
  if (gray.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i] ?? 0;
  return sum / gray.length;
}

/**
 * Variansi Laplacian (kernel 4-tetangga): ukuran ketajaman yang umum dipakai.
 * Gambar buram punya tepi lembut sehingga nilainya kecil.
 */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        (gray[i - 1] ?? 0) +
        (gray[i + 1] ?? 0) +
        (gray[i - width] ?? 0) +
        (gray[i + width] ?? 0) -
        4 * (gray[i] ?? 0);
      sum += value;
      sumSq += value * value;
      count++;
    }
  }
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/** Menilai mutu gambar dari ukuran asli serta kecerahan dan ketajaman salinan kecilnya. */
export function assessImageQuality(input: {
  width: number;
  height: number;
  kecerahan: number;
  ketajaman: number;
}): ImageQualityReport {
  const masalah: ImageIssue[] = [];
  if (Math.min(input.width, input.height) < QUALITY_THRESHOLDS.sisiMinimum) {
    masalah.push({
      kode: 'kecil',
      pesan: 'Gambar terlalu kecil, tulisan kecil mungkin tidak terbaca. Foto lebih dekat atau unggah berkas yang lebih besar.',
    });
  }
  if (input.kecerahan < QUALITY_THRESHOLDS.gelap) {
    masalah.push({
      kode: 'gelap',
      pesan: 'Gambar terlalu gelap. Foto di tempat yang lebih terang.',
    });
  } else if (input.kecerahan > QUALITY_THRESHOLDS.terang) {
    masalah.push({
      kode: 'terang',
      pesan: 'Gambar terlalu terang atau silau. Hindari pantulan lampu pada plastik kemasan.',
    });
  }
  if (input.ketajaman < QUALITY_THRESHOLDS.buram) {
    masalah.push({
      kode: 'buram',
      pesan: 'Gambar tampak buram. Pegang HP dengan tenang dan ketuk layar supaya fokus.',
    });
  }
  return {
    baik: masalah.length === 0,
    masalah,
    kecerahan: Math.round(input.kecerahan),
    ketajaman: Math.round(input.ketajaman),
  };
}

/** Analisis lengkap dari data RGBA salinan kecil beserta ukuran gambar asli. */
export function analyzeImagePixels(
  rgba: ArrayLike<number>,
  sampleWidth: number,
  sampleHeight: number,
  original: { width: number; height: number },
): ImageQualityReport {
  const gray = toGrayscale(rgba, sampleWidth, sampleHeight);
  return assessImageQuality({
    width: original.width,
    height: original.height,
    kecerahan: meanBrightness(gray),
    ketajaman: laplacianVariance(gray, sampleWidth, sampleHeight),
  });
}
