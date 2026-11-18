import type { CorrectedLabelKey, CorrectedLabelRow } from './correctedLabel';

/**
 * Metrik font nyata dari berkas `src/app/fonts/atkinson-hyperlegible-next.woff2`
 * yang diukur langsung dari tabel OpenType (`head`, `OS/2`, `glyf`).
 *
 * Dasar hukum Pasal 9 Peraturan BPOM Nomor 31 Tahun 2018 (serta perubahannya
 * pada Peraturan BPOM Nomor 20 Tahun 2021):
 * - Ayat (2): tulisan wajib dicantumkan dengan ukuran huruf paling kecil sama
 *   dengan atau lebih besar dari huruf kecil "o" pada jenis huruf Arial dengan
 *   ukuran 1 mm (Arial 6 point).
 * - Ayat (3): keterangan mengenai nama produk dan peringatan pada label wajib
 *   dicantumkan dengan ukuran huruf paling kecil sama dengan atau lebih besar
 *   dari huruf kecil "o" pada jenis huruf Arial dengan ukuran 2 mm.
 * - Ayat (4): keterangan berupa peringatan meliputi antara lain keterangan
 *   tentang alergen.
 */
export const ATKINSON_HYPERLEGIBLE_NEXT_METRICS = {
  postscriptName: 'AtkinsonHyperlegibleNext-Regular',
  unitsPerEm: 1000,
  /** Tinggi datar huruf kecil (x-height) dalam satuan unit font. */
  xHeightUnits: 496,
  /** Tinggi bounding box glyph huruf kecil "o" (minY: -12, maxY: 504). */
  lowercaseOHeightUnits: 516,
  /** Rasio x-height terhadap ukuran em (496 / 1000). */
  xHeightRatio: 0.496,
  /** Rasio tinggi huruf kecil "o" terhadap ukuran em (516 / 1000). */
  lowercaseOHeightRatio: 0.516,
  /** Rata-rata advance width teks label bahasa Indonesia (hasil layout nyata). */
  avgAdvanceRatio: 0.446,
  /**
   * Rasio lebar karakter efektif yang dipakai untuk estimasi ganti baris,
   * sudah memperhitungkan huruf tebal (alergen & judul) serta sisa ruang di
   * ujung kanan baris saat pembungkusan kata (word wrap).
   */
  effectiveCharWidthRatio: 0.52,
} as const;

/**
 * Ukuran em CSS (dalam mm) untuk teks umum agar tinggi huruf kecil "o" >= 1,0 mm.
 * Pada 2,15 mm (~6,1 pt):
 * - x-height = 2,15 * 0,496 = 1,066 mm (>= 1,0 mm)
 * - tinggi glyph "o" = 2,15 * 0,516 = 1,109 mm (>= 1,0 mm)
 */
export const BODY_FONT_SIZE_MM = 2.15;
export const BODY_LINE_HEIGHT_MM = 2.9;

/**
 * Ukuran em CSS (dalam mm) untuk nama produk dan peringatan alergen agar tinggi
 * huruf kecil "o" >= 2,0 mm (Pasal 9 ayat 3 dan 4).
 * Pada 4,05 mm (~11,5 pt):
 * - x-height = 4,05 * 0,496 = 2,009 mm (>= 2,0 mm)
 * - tinggi glyph "o" = 4,05 * 0,516 = 2,090 mm (>= 2,0 mm)
 */
export const HEADING_WARNING_FONT_SIZE_MM = 4.05;
export const HEADING_WARNING_LINE_HEIGHT_MM = 5.0;

/** Margin dalam (padding) tepi stiker dalam milimeter di setiap sisi. */
export const STICKER_PADDING_MM = 3;
/** Jarak vertikal antarbutir keterangan pada stiker dalam milimeter. */
export const STICKER_ROW_GAP_MM = 1.2;

/** Batas ukuran fisik stiker yang wajar untuk dicetak (mm). */
export const MIN_STICKER_WIDTH_MM = 40;
export const MIN_STICKER_HEIGHT_MM = 25;
export const MAX_STICKER_WIDTH_MM = 200;
export const MAX_STICKER_HEIGHT_MM = 280;

export interface StickerDimensionsMm {
  lebarMm: number;
  tinggiMm: number;
}

export interface StickerPreset {
  id: string;
  label: string;
  kegunaan: string;
  dimensi: StickerDimensionsMm;
}

/** Ukuran stiker kemasan yang umum dipakai pelaku usaha makanan rumahan. */
export const STICKER_PRESETS_MM: readonly StickerPreset[] = [
  {
    id: '70x50',
    label: '70 × 50 mm',
    kegunaan: 'Toples sambal / botol kecil',
    dimensi: { lebarMm: 70, tinggiMm: 50 },
  },
  {
    id: '80x60',
    label: '80 × 60 mm',
    kegunaan: 'Standing pouch 150–250 g',
    dimensi: { lebarMm: 80, tinggiMm: 60 },
  },
  {
    id: '90x65',
    label: '90 × 65 mm',
    kegunaan: 'Pouch kue kering / keripuk',
    dimensi: { lebarMm: 90, tinggiMm: 65 },
  },
  {
    id: '100x75',
    label: '100 × 75 mm',
    kegunaan: 'Kemasan 250–500 g',
    dimensi: { lebarMm: 100, tinggiMm: 75 },
  },
  {
    id: '110x85',
    label: '110 × 85 mm',
    kegunaan: 'Kotak / pouch besar',
    dimensi: { lebarMm: 110, tinggiMm: 85 },
  },
];

export const DEFAULT_STICKER_DIMENSIONS_MM: StickerDimensionsMm = {
  lebarMm: 90,
  tinggiMm: 65,
};

/** Butir yang wajib memakai huruf kecil "o" minimal 2 mm (Pasal 9 ayat 3 & 4). */
export function isTwoMillimeterRow(kunci: CorrectedLabelKey): boolean {
  return kunci === 'namaProduk' || kunci === 'pernyataanAlergen';
}

/** Tinggi huruf kecil "o" dalam mm untuk ukuran font CSS tertentu pada font aplikasi. */
export function measureLowercaseOHeightMm(fontSizeMm: number): number {
  return Number((fontSizeMm * ATKINSON_HYPERLEGIBLE_NEXT_METRICS.xHeightRatio).toFixed(2));
}

export interface RowLayoutEstimate {
  kunci: CorrectedLabelKey;
  judul: string;
  fontSizeMm: number;
  tinggiHurufOMm: number;
  lineHeightMm: number;
  jumlahBaris: number;
  tinggiMm: number;
}

export interface LabelPrintFitResult {
  muat: boolean;
  dimensi: StickerDimensionsMm;
  lebarKontenMm: number;
  tinggiTersediaMm: number;
  tinggiDibutuhkanMm: number;
  selisihTinggiMm: number;
  rincianBaris: RowLayoutEstimate[];
  alasanTidakMuat?: string;
  /** Ukuran minimum pada lebar yang dipilih (atau lebar minimum 40 mm). */
  ukuranMinimumDisarankan: StickerDimensionsMm;
  /** Ukuran proporsional yang disarankan bila baik lebar maupun tinggi perlu disesuaikan. */
  ukuranProporsionalDisarankan: StickerDimensionsMm;
}

/**
 * Menghitung jumlah baris teks setelah pembungkusan kata (word wrap) pada
 * jumlah karakter maksimum per baris tertentu.
 */
export function countWrappedLines(text: string, maxCharsPerLine: number): number {
  const safeMax = Math.max(1, Math.floor(maxCharsPerLine));
  const paragraphs = text.split('\n');
  let totalLines = 0;

  for (const rawParagraph of paragraphs) {
    const paragraph = rawParagraph.trim();
    if (paragraph.length === 0) {
      totalLines += 1;
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLineLength = 0;
    let linesInParagraph = 1;

    for (const word of words) {
      if (word.length > safeMax) {
        // Kata yang lebih panjang dari satu baris akan dipotong oleh overflow-wrap: anywhere
        if (currentLineLength > 0) {
          linesInParagraph += 1;
          currentLineLength = 0;
        }
        const fullChunks = Math.floor(word.length / safeMax);
        const remainder = word.length % safeMax;
        if (remainder === 0) {
          linesInParagraph += Math.max(0, fullChunks - 1);
          currentLineLength = safeMax;
        } else {
          linesInParagraph += fullChunks;
          currentLineLength = remainder;
        }
      } else if (currentLineLength === 0) {
        currentLineLength = word.length;
      } else if (currentLineLength + 1 + word.length <= safeMax) {
        currentLineLength += 1 + word.length;
      } else {
        linesInParagraph += 1;
        currentLineLength = word.length;
      }
    }

    totalLines += linesInParagraph;
  }

  return Math.max(1, totalLines);
}

function computeHeightForWidth(
  tampil: readonly CorrectedLabelRow[],
  lebarMm: number,
): {
  lebarKontenMm: number;
  rincianBaris: RowLayoutEstimate[];
  tinggiDibutuhkanMm: number;
} {
  const lebarKontenMm = Math.max(10, lebarMm - 2 * STICKER_PADDING_MM);
  const rincianBaris: RowLayoutEstimate[] = tampil.map((row) => {
    const isLarge = isTwoMillimeterRow(row.kunci);
    const fontSizeMm = isLarge ? HEADING_WARNING_FONT_SIZE_MM : BODY_FONT_SIZE_MM;
    const lineHeightMm = isLarge ? HEADING_WARNING_LINE_HEIGHT_MM : BODY_LINE_HEIGHT_MM;
    const charWidthMm =
      fontSizeMm *
      ATKINSON_HYPERLEGIBLE_NEXT_METRICS.effectiveCharWidthRatio *
      (isLarge ? 1.06 : 1);
    const maxCharsPerLine = Math.max(1, Math.floor(lebarKontenMm / charWidthMm));
    const displayText = row.kosong ? `[Belum diisi: ${row.judul}]` : row.teks;
    const jumlahBaris = countWrappedLines(displayText, maxCharsPerLine);
    const tinggiMm = Number((jumlahBaris * lineHeightMm).toFixed(2));

    return {
      kunci: row.kunci,
      judul: row.judul,
      fontSizeMm,
      tinggiHurufOMm: measureLowercaseOHeightMm(fontSizeMm),
      lineHeightMm,
      jumlahBaris,
      tinggiMm,
    };
  });

  const totalRowHeight = rincianBaris.reduce((sum, item) => sum + item.tinggiMm, 0);
  const totalGaps = Math.max(0, rincianBaris.length - 1) * STICKER_ROW_GAP_MM;
  const tinggiDibutuhkanMm = Math.ceil(2 * STICKER_PADDING_MM + totalRowHeight + totalGaps);

  return {
    lebarKontenMm,
    rincianBaris,
    tinggiDibutuhkanMm,
  };
}

/**
 * Memeriksa apakah seluruh butir pada label perbaikan muat dicetak pada ukuran
 * stiker fisik (`lebarMm` × `tinggiMm`) dengan tetap menjamin batas ukuran
 * huruf minimum Pasal 9 Peraturan BPOM Nomor 31 Tahun 2018.
 */
export function evaluateLabelPrintFit(
  baris: readonly CorrectedLabelRow[],
  dimensi: StickerDimensionsMm,
): LabelPrintFitResult {
  const lebarMm = Math.round(dimensi.lebarMm);
  const tinggiMm = Math.round(dimensi.tinggiMm);
  const tampil = baris.filter((row) => row.wajib || !row.kosong);

  const safeWidth = Math.max(MIN_STICKER_WIDTH_MM, lebarMm);
  const layoutAtRequested = computeHeightForWidth(tampil, safeWidth);
  const tinggiTersediaMm = Math.max(0, tinggiMm - 2 * STICKER_PADDING_MM);
  const selisihTinggiMm = layoutAtRequested.tinggiDibutuhkanMm - tinggiMm;

  const lebarTerlaluSempit = lebarMm < MIN_STICKER_WIDTH_MM;
  const tinggiTerlaluPendek =
    tinggiMm < MIN_STICKER_HEIGHT_MM || layoutAtRequested.tinggiDibutuhkanMm > tinggiMm;
  const muat = !lebarTerlaluSempit && !tinggiTerlaluPendek;

  const ukuranMinimumDisarankan: StickerDimensionsMm = {
    lebarMm: safeWidth,
    tinggiMm: Math.max(MIN_STICKER_HEIGHT_MM, layoutAtRequested.tinggiDibutuhkanMm),
  };

  // Cari prasetel standar terkecil yang muat, atau hitung ukuran proporsional (rasio ~4:3)
  let ukuranProporsionalDisarankan: StickerDimensionsMm | undefined;
  for (const preset of STICKER_PRESETS_MM) {
    const check = computeHeightForWidth(tampil, preset.dimensi.lebarMm);
    if (check.tinggiDibutuhkanMm <= preset.dimensi.tinggiMm) {
      ukuranProporsionalDisarankan = preset.dimensi;
      break;
    }
  }
  if (!ukuranProporsionalDisarankan) {
    // Cari lebar mulai 90 mm hingga 160 mm yang menghasilkan rasio nyaman
    let candidateWidth = Math.max(90, safeWidth);
    let candidateHeight = computeHeightForWidth(tampil, candidateWidth).tinggiDibutuhkanMm;
    while (candidateHeight > candidateWidth * 0.9 && candidateWidth < 150) {
      candidateWidth += 10;
      candidateHeight = computeHeightForWidth(tampil, candidateWidth).tinggiDibutuhkanMm;
    }
    ukuranProporsionalDisarankan = {
      lebarMm: candidateWidth,
      tinggiMm: Math.ceil(candidateHeight / 5) * 5,
    };
  }

  let alasanTidakMuat: string | undefined;
  if (!muat) {
    if (lebarTerlaluSempit) {
      alasanTidakMuat = `Lebar stiker ${lebarMm} mm terlalu sempit untuk memuat teks berhuruf minimal 1 mm dan 2 mm (Pasal 9). Gunakan lebar minimal ${MIN_STICKER_WIDTH_MM} mm (disarankan ${ukuranMinimumDisarankan.lebarMm} × ${ukuranMinimumDisarankan.tinggiMm} mm).`;
    } else {
      alasanTidakMuat = `Pada lebar ${lebarMm} mm, seluruh butir wajib dengan ukuran huruf minimum Pasal 9 (huruf kecil "o" 1 mm untuk teks umum dan 2 mm untuk nama produk serta peringatan alergen) membutuhkan tinggi minimal ${ukuranMinimumDisarankan.tinggiMm} mm (kurang ${Math.max(1, selisihTinggiMm)} mm dari tinggi ${tinggiMm} mm).`;
    }
  }

  return {
    muat,
    dimensi: { lebarMm, tinggiMm },
    lebarKontenMm: layoutAtRequested.lebarKontenMm,
    tinggiTersediaMm,
    tinggiDibutuhkanMm: layoutAtRequested.tinggiDibutuhkanMm,
    selisihTinggiMm,
    rincianBaris: layoutAtRequested.rincianBaris,
    ...(alasanTidakMuat ? { alasanTidakMuat } : {}),
    ukuranMinimumDisarankan,
    ukuranProporsionalDisarankan,
  };
}
