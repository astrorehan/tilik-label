import { describe, expect, it } from 'vitest';
import {
  QUALITY_THRESHOLDS,
  analyzeImagePixels,
  assessImageQuality,
  computeTargetSize,
  laplacianVariance,
  meanBrightness,
  toGrayscale,
} from '../image/quality';

function solidRgba(width: number, height: number, value: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data.set([value, value, value, 255], i * 4);
  }
  return data;
}

function checkerRgba(width: number, height: number, cell: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0 ? 40 : 220;
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return data;
}

describe('computeTargetSize', () => {
  it('mengecilkan sisi terpanjang ke 1600 dengan rasio tetap', () => {
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('tidak memperbesar gambar kecil', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('batas tepat 1600 tidak diubah', () => {
    expect(computeTargetSize(1600, 900)).toEqual({ width: 1600, height: 900 });
  });

  it('ukuran tidak sah menghasilkan nol', () => {
    expect(computeTargetSize(0, 100)).toEqual({ width: 0, height: 0 });
  });

  it('gambar sangat panjang tetap minimal 1 piksel', () => {
    expect(computeTargetSize(100000, 10, 512)).toEqual({ width: 512, height: 1 });
  });
});

describe('kecerahan dan ketajaman', () => {
  it('toGrayscale dan meanBrightness pada warna rata', () => {
    const gray = toGrayscale(solidRgba(4, 4, 100), 4, 4);
    expect(meanBrightness(gray)).toBeCloseTo(100, 3);
  });

  it('gambar rata punya ketajaman nol, pola kotak tajam punya ketajaman tinggi', () => {
    const flat = toGrayscale(solidRgba(32, 32, 128), 32, 32);
    const sharp = toGrayscale(checkerRgba(32, 32, 2), 32, 32);
    expect(laplacianVariance(flat, 32, 32)).toBe(0);
    expect(laplacianVariance(sharp, 32, 32)).toBeGreaterThan(QUALITY_THRESHOLDS.buram * 10);
  });

  it('gambar terlalu kecil untuk kernel menghasilkan nol', () => {
    expect(laplacianVariance([1, 2, 3, 4], 2, 2)).toBe(0);
    expect(meanBrightness([])).toBe(0);
  });
});

describe('assessImageQuality', () => {
  const good = { width: 1200, height: 900, kecerahan: 140, ketajaman: 500 };

  it('gambar baik tidak punya masalah', () => {
    expect(assessImageQuality(good)).toEqual({
      baik: true,
      masalah: [],
      kecerahan: 140,
      ketajaman: 500,
    });
  });

  it.each([
    [{ kecerahan: 30 }, 'gelap'],
    [{ kecerahan: 240 }, 'terang'],
    [{ ketajaman: 10 }, 'buram'],
    [{ width: 400 }, 'kecil'],
  ])('mendeteksi %o sebagai %s', (override, kode) => {
    const report = assessImageQuality({ ...good, ...override });
    expect(report.baik).toBe(false);
    expect(report.masalah.map((m) => m.kode)).toEqual([kode]);
    expect(report.masalah[0]?.pesan.length).toBeGreaterThan(10);
  });

  it('beberapa masalah sekaligus dilaporkan semua', () => {
    const report = assessImageQuality({ width: 300, height: 300, kecerahan: 20, ketajaman: 1 });
    expect(report.masalah.map((m) => m.kode)).toEqual(['kecil', 'gelap', 'buram']);
  });

  it('nilai tepat di ambang belum dianggap masalah', () => {
    const report = assessImageQuality({
      width: QUALITY_THRESHOLDS.sisiMinimum,
      height: 2000,
      kecerahan: QUALITY_THRESHOLDS.gelap,
      ketajaman: QUALITY_THRESHOLDS.buram,
    });
    expect(report.baik).toBe(true);
  });
});

describe('analyzeImagePixels', () => {
  it('gambar hitam rata: gelap dan buram', () => {
    const report = analyzeImagePixels(solidRgba(64, 64, 5), 64, 64, { width: 1200, height: 900 });
    expect(report.masalah.map((m) => m.kode)).toEqual(['gelap', 'buram']);
  });

  it('pola tajam dengan kecerahan sedang: baik', () => {
    const report = analyzeImagePixels(checkerRgba(64, 64, 3), 64, 64, { width: 1200, height: 900 });
    expect(report.baik).toBe(true);
  });
});
