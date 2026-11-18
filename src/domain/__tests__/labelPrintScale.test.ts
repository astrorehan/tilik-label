import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ATKINSON_HYPERLEGIBLE_NEXT_METRICS,
  BODY_FONT_SIZE_MM,
  DEFAULT_STICKER_DIMENSIONS_MM,
  HEADING_WARNING_FONT_SIZE_MM,
  MIN_STICKER_WIDTH_MM,
  STICKER_PRESETS_MM,
  buildCorrectedLabel,
  countWrappedLines,
  evaluateLabelPrintFit,
  isTwoMillimeterRow,
  measureLowercaseOHeightMm,
} from '@/domain';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

describe('labelPrintScale · Pasal 9 Peraturan BPOM 31/2018', () => {
  it('memastikan metrik font sesuai dengan berkas woff2 Atkinson Hyperlegible Next yang dipakai aplikasi', () => {
    const woff2Path = join(process.cwd(), 'src/app/fonts/atkinson-hyperlegible-next.woff2');
    const buf = readFileSync(woff2Path);
    expect(buf.subarray(0, 4).toString('ascii')).toBe('wOF2');
    expect(ATKINSON_HYPERLEGIBLE_NEXT_METRICS.unitsPerEm).toBe(1000);
    expect(ATKINSON_HYPERLEGIBLE_NEXT_METRICS.xHeightUnits).toBe(496);
    expect(ATKINSON_HYPERLEGIBLE_NEXT_METRICS.lowercaseOHeightUnits).toBe(516);
  });

  it('menjamin ukuran huruf kecil "o" minimal 1,0 mm untuk teks umum (Pasal 9 ayat 2)', () => {
    const oHeightMm = measureLowercaseOHeightMm(BODY_FONT_SIZE_MM);
    expect(oHeightMm).toBeGreaterThanOrEqual(1.0);
    // Juga di atas tinggi glyph "o" penuh (dengan overshoot)
    const fullOGlyphMm =
      BODY_FONT_SIZE_MM * ATKINSON_HYPERLEGIBLE_NEXT_METRICS.lowercaseOHeightRatio;
    expect(fullOGlyphMm).toBeGreaterThanOrEqual(1.0);
  });

  it('menjamin ukuran huruf kecil "o" minimal 2,0 mm untuk nama produk dan peringatan alergen (Pasal 9 ayat 3 & 4)', () => {
    const oHeightMm = measureLowercaseOHeightMm(HEADING_WARNING_FONT_SIZE_MM);
    expect(oHeightMm).toBeGreaterThanOrEqual(2.0);
    expect(isTwoMillimeterRow('namaProduk')).toBe(true);
    expect(isTwoMillimeterRow('pernyataanAlergen')).toBe(true);
    expect(isTwoMillimeterRow('daftarBahan')).toBe(false);
    expect(isTwoMillimeterRow('beratBersih')).toBe(false);
  });

  it('menghitung pembungkusan baris (word wrap) dan paragraf multibaris secara deterministik', () => {
    expect(countWrappedLines('Berat bersih: 250 g', 30)).toBe(1);
    expect(countWrappedLines('Baris satu\nBaris dua', 30)).toBe(2);
    expect(
      countWrappedLines(
        'Komposisi: tepung terigu, kacang tanah, gula halus, minyak nabati, telur, garam.',
        28,
      ),
    ).toBeGreaterThanOrEqual(3);
    // Kata sangat panjang tanpa spasi dipotong oleh overflow-wrap: anywhere
    expect(countWrappedLines('ID0000000000000000000000000000', 10)).toBe(3);
  });

  it('menyatakan muat untuk stiker ukuran cukup besar pada contoh produk pertama', () => {
    const sample = SAMPLE_LABEL_CASES[0]!;
    const corrected = buildCorrectedLabel(sample.label, sample.answers);
    const fit = evaluateLabelPrintFit(corrected.baris, { lebarMm: 100, tinggiMm: 80 });

    expect(fit.muat).toBe(true);
    expect(fit.tinggiDibutuhkanMm).toBeLessThanOrEqual(80);
    expect(fit.alasanTidakMuat).toBeUndefined();

    const namaRow = fit.rincianBaris.find((r) => r.kunci === 'namaProduk');
    const alergenRow = fit.rincianBaris.find((r) => r.kunci === 'pernyataanAlergen');
    const bahanRow = fit.rincianBaris.find((r) => r.kunci === 'daftarBahan');

    expect(namaRow?.tinggiHurufOMm).toBeGreaterThanOrEqual(2.0);
    expect(alergenRow?.tinggiHurufOMm).toBeGreaterThanOrEqual(2.0);
    expect(bahanRow?.tinggiHurufOMm).toBeGreaterThanOrEqual(1.0);
  });

  it('mendeteksi stiker yang terlalu pendek dan memberikan saran ukuran minimum yang muat', () => {
    const sample = SAMPLE_LABEL_CASES[0]!;
    const corrected = buildCorrectedLabel(sample.label, sample.answers);
    const tooShort = evaluateLabelPrintFit(corrected.baris, { lebarMm: 70, tinggiMm: 35 });

    expect(tooShort.muat).toBe(false);
    expect(tooShort.selisihTinggiMm).toBeGreaterThan(0);
    expect(tooShort.alasanTidakMuat).toContain('Pasal 9');
    expect(tooShort.ukuranMinimumDisarankan.lebarMm).toBe(70);
    expect(tooShort.ukuranMinimumDisarankan.tinggiMm).toBeGreaterThan(35);

    // Jika saran ukuran minimum dipakai kembali, hasilnya harus muat
    const recheck = evaluateLabelPrintFit(corrected.baris, tooShort.ukuranMinimumDisarankan);
    expect(recheck.muat).toBe(true);
  });

  it('menolak lebar stiker di bawah batas minimum (40 mm) dan menyarankan lebar yang layak', () => {
    const sample = SAMPLE_LABEL_CASES[0]!;
    const corrected = buildCorrectedLabel(sample.label, sample.answers);
    const tooNarrow = evaluateLabelPrintFit(corrected.baris, { lebarMm: 28, tinggiMm: 80 });

    expect(tooNarrow.muat).toBe(false);
    expect(tooNarrow.ukuranMinimumDisarankan.lebarMm).toBeGreaterThanOrEqual(MIN_STICKER_WIDTH_MM);
    expect(tooNarrow.alasanTidakMuat).toContain(`${MIN_STICKER_WIDTH_MM} mm`);
  });

  it('menyediakan ukuran standar percetakan yang valid', () => {
    expect(STICKER_PRESETS_MM.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_STICKER_DIMENSIONS_MM.lebarMm).toBeGreaterThanOrEqual(MIN_STICKER_WIDTH_MM);
  });
});
