/**
 * Kontrak keluaran pembaca foto catatan resep.
 * Model hanya menyalin daftar bahan dan takaran yang terlihat di buku/catatan resep.
 * Satuan metrik (g, kg, mg, ml, L, ons) boleh dikonversi ke gram/ml; satuan tidak baku
 * (sdm, sdt, butir, siung, secukupnya) dibiarkan kosong (`jumlahGram: null`) dengan
 * tulisan aslinya di `takaranAsli` supaya pengguna yang melengkapi, bukan tebakan AI.
 */

export interface ExtractedRecipeItem {
  nama: string;
  /** Takaran dalam gram atau ml; null bila satuan bukan metrik atau tidak terbaca. */
  jumlahGram: number | null;
  /** Tulisan takaran asli di catatan resep saat `jumlahGram` bernilai null. */
  takaranAsli: string;
}

export const MAX_RECIPE_ITEMS = 40;
export const MAX_RECIPE_NAME_LENGTH = 100;
export const MAX_RECIPE_NOTE_LENGTH = 60;
export const MAX_RECIPE_AMOUNT = 1_000_000;

/** JSON Schema keluaran model untuk pembaca foto resep. */
export const RECIPE_EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['bukanResep', 'bahan'],
  properties: {
    bukanResep: {
      type: 'boolean',
      description:
        'true bila gambar bukan catatan resep, buku resep, atau daftar bahan, atau tulisannya sama sekali tidak terbaca.',
    },
    bahan: {
      type: 'array',
      description: 'Daftar bahan yang terbaca dari foto resep sesuai urutan tertulis.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nama', 'jumlahGram', 'takaranAsli'],
        properties: {
          nama: { type: 'string', description: 'Nama bahan persis seperti tertulis.' },
          jumlahGram: {
            type: ['number', 'null'],
            description:
              'Takaran dalam gram atau ml (kg, mg, liter, ons boleh dikonversi). Isi null bila satuan tidak baku (sdm, sdt, butir, siung, secukupnya) atau tidak terbaca.',
          },
          takaranAsli: {
            type: 'string',
            description:
              'Tulisan takaran asli bila jumlahGram bernilai null (mis. "2 butir", "1 sdt", "secukupnya"); string kosong bila jumlahGram terisi.',
          },
        },
      },
    },
  },
} as const;

export type RecipeExtractionFailure =
  | 'bukan_json'
  | 'skema_tidak_sesuai'
  | 'bukan_resep'
  | 'kosong';

export type RecipeExtractionResult =
  | { ok: true; bahan: ExtractedRecipeItem[]; perluLengkapi: number }
  | { ok: false; alasan: RecipeExtractionFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeAmount(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 ? rounded : value;
}

/**
 * Memvalidasi keluaran model terhadap skema pembaca resep secara ketat.
 * Keluaran yang tidak sesuai ditolak seluruhnya agar pengguna tetap bisa mengisi manual.
 */
export function validateRecipeExtraction(raw: unknown): RecipeExtractionResult {
  if (raw === undefined) {
    return { ok: false, alasan: 'bukan_json' };
  }
  if (
    !isRecord(raw) ||
    !hasOnlyKeys(raw, ['bukanResep', 'bahan']) ||
    typeof raw.bukanResep !== 'boolean' ||
    !Array.isArray(raw.bahan)
  ) {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }
  if (raw.bukanResep) {
    return { ok: false, alasan: 'bukan_resep' };
  }
  if (raw.bahan.length > MAX_RECIPE_ITEMS) {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }

  const bahan: ExtractedRecipeItem[] = [];
  for (const entry of raw.bahan) {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, ['nama', 'jumlahGram', 'takaranAsli']) ||
      typeof entry.nama !== 'string' ||
      typeof entry.takaranAsli !== 'string'
    ) {
      return { ok: false, alasan: 'skema_tidak_sesuai' };
    }
    const rawAmount = entry.jumlahGram;
    if (
      rawAmount !== null &&
      (typeof rawAmount !== 'number' ||
        !Number.isFinite(rawAmount) ||
        rawAmount <= 0 ||
        rawAmount > MAX_RECIPE_AMOUNT)
    ) {
      return { ok: false, alasan: 'skema_tidak_sesuai' };
    }
    if (
      entry.nama.length > MAX_RECIPE_NAME_LENGTH ||
      entry.takaranAsli.length > MAX_RECIPE_NOTE_LENGTH
    ) {
      return { ok: false, alasan: 'skema_tidak_sesuai' };
    }
    const nama = cleanText(entry.nama);
    if (!nama) continue;
    const jumlahGram = rawAmount === null ? null : normalizeAmount(rawAmount);
    const takaranAsli = jumlahGram === null ? cleanText(entry.takaranAsli) : '';
    bahan.push({ nama, jumlahGram, takaranAsli });
  }

  if (bahan.length === 0) {
    return { ok: false, alasan: 'kosong' };
  }

  const perluLengkapi = bahan.filter((item) => item.jumlahGram === null).length;
  return { ok: true, bahan, perluLengkapi };
}

/** Pesan untuk pengguna saat pembacaan foto resep ditolak. */
export const RECIPE_EXTRACTION_FAILURE_MESSAGES: Record<RecipeExtractionFailure, string> = {
  bukan_json: 'Hasil baca resep tidak bisa dipakai. Kamu tetap bisa menulis bahannya sendiri.',
  skema_tidak_sesuai:
    'Hasil baca resep belum lengkap atau tidak sesuai. Kamu tetap bisa menulis bahannya sendiri.',
  bukan_resep:
    'Gambar ini tidak tampak seperti catatan resep atau daftar bahan, atau tulisannya tidak terbaca. Coba foto ulang, atau isi sendiri.',
  kosong:
    'Belum ada bahan yang terbaca dari foto ini. Coba foto lebih dekat dan terang, atau isi sendiri.',
};
