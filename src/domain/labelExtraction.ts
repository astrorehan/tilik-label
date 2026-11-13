import { createEmptyLabelData } from './labelRules';
import type { LabelData, LabelFieldKey } from './types';

/**
 * Kontrak keluaran pembaca foto (F-03).
 * Model hanya membaca isi label. Setiap butir punya status:
 * - `terbaca`: teks terbaca dari gambar.
 * - `tidak_ada`: butir memang tidak tercantum di label.
 * - `tidak_terbaca`: butir tampak ada tetapi tidak bisa dibaca (buram, terpotong, tertutup).
 */
export type ExtractionStatus = 'terbaca' | 'tidak_ada' | 'tidak_terbaca';

export type ExtractionTextField = Exclude<LabelFieldKey, 'pernyataanLain'>;

export const EXTRACTION_TEXT_FIELDS: ExtractionTextField[] = [
  'namaProduk',
  'daftarBahanTeks',
  'beratBersihTeks',
  'namaProdusen',
  'alamatProdusen',
  'keteranganHalalTeks',
  'kodeProduksiTeks',
  'tanggalProduksiTeks',
  'kedaluwarsaTeks',
  'nomorIzinTeks',
  'pernyataanAlergenTeks',
  'caraPenyimpananTeks',
];

/** Penjelasan tiap butir untuk instruksi model. */
export const EXTRACTION_FIELD_DESCRIPTIONS: Record<LabelFieldKey, string> = {
  namaProduk: 'Nama jenis pangan atau nama produk, persis seperti tertulis.',
  daftarBahanTeks:
    'Daftar bahan lengkap termasuk kata pembukanya (misalnya "Komposisi:"), urutan dan ejaan persis seperti tertulis.',
  beratBersihTeks: 'Berat bersih atau isi bersih beserta satuan dan kata pembukanya.',
  namaProdusen: 'Nama produsen atau usaha yang memproduksi.',
  alamatProdusen: 'Alamat produsen persis seperti tertulis.',
  keteranganHalalTeks:
    'Tulisan halal atau nomor sertifikat halal. Bila hanya ada logo halal tanpa tulisan, tulis "Logo halal".',
  kodeProduksiTeks: 'Kode produksi atau kode batch.',
  tanggalProduksiTeks: 'Tanggal produksi.',
  kedaluwarsaTeks: 'Keterangan kedaluwarsa beserta kata pembukanya (misalnya "Baik digunakan sebelum").',
  nomorIzinTeks: 'Nomor izin edar atau P-IRT persis seperti tertulis.',
  pernyataanAlergenTeks: 'Kalimat peringatan alergen.',
  caraPenyimpananTeks: 'Petunjuk cara penyimpanan.',
  pernyataanLain:
    'Klaim atau tulisan lain di kemasan selain butir di atas (misalnya "Tanpa pengawet", "Renyah"), satu tulisan per isi daftar.',
};

/** JSON Schema keluaran model (dipakai untuk structured output dan dokumentasi). */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['butir', 'pernyataanLain', 'bukanLabelPangan'],
  properties: {
    butir: {
      type: 'object',
      additionalProperties: false,
      required: EXTRACTION_TEXT_FIELDS,
      properties: Object.fromEntries(
        EXTRACTION_TEXT_FIELDS.map((field) => [
          field,
          {
            type: 'object',
            additionalProperties: false,
            required: ['status', 'teks'],
            description: EXTRACTION_FIELD_DESCRIPTIONS[field],
            properties: {
              status: { type: 'string', enum: ['terbaca', 'tidak_ada', 'tidak_terbaca'] },
              teks: { type: 'string' },
            },
          },
        ]),
      ),
    },
    pernyataanLain: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'daftar'],
      description: EXTRACTION_FIELD_DESCRIPTIONS.pernyataanLain,
      properties: {
        status: { type: 'string', enum: ['terbaca', 'tidak_ada', 'tidak_terbaca'] },
        daftar: { type: 'array', items: { type: 'string' } },
      },
    },
    bukanLabelPangan: {
      type: 'boolean',
      description: 'true bila gambar bukan label kemasan pangan atau sama sekali tidak terbaca.',
    },
  },
} as const;

/** Batas panjang teks per butir supaya keluaran aneh tidak masuk ke formulir. */
export const MAX_FIELD_LENGTH = 1500;
export const MAX_CLAIMS = 20;

export type ExtractionResult =
  | { ok: true; label: LabelData; tidakTerbaca: LabelFieldKey[] }
  | { ok: false; alasan: 'bukan_json' | 'skema_tidak_sesuai' | 'bukan_label' };

const STATUSES: readonly ExtractionStatus[] = ['terbaca', 'tidak_ada', 'tidak_terbaca'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStatus(value: unknown): value is ExtractionStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Mengambil objek JSON dari teks keluaran model, termasuk bila dibungkus blok kode. */
export function parseModelJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/**
 * Memvalidasi keluaran model terhadap skema secara ketat lalu mengubahnya menjadi LabelData.
 * Keluaran yang tidak sesuai ditolak seluruhnya (pengguna diarahkan mengisi sendiri).
 * Butir berstatus `tidak_terbaca` dikosongkan dan dicatat di `unreadableFields`.
 */
export function validateExtraction(raw: unknown): ExtractionResult {
  if (raw === undefined) {
    return { ok: false, alasan: 'bukan_json' };
  }
  if (!isRecord(raw) || !isRecord(raw.butir) || !isRecord(raw.pernyataanLain)) {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }
  if (typeof raw.bukanLabelPangan !== 'boolean') {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }
  if (raw.bukanLabelPangan) {
    return { ok: false, alasan: 'bukan_label' };
  }

  const label = createEmptyLabelData();
  const tidakTerbaca: LabelFieldKey[] = [];

  for (const field of EXTRACTION_TEXT_FIELDS) {
    const item = raw.butir[field];
    if (!isRecord(item) || !isStatus(item.status) || typeof item.teks !== 'string') {
      return { ok: false, alasan: 'skema_tidak_sesuai' };
    }
    if (item.teks.length > MAX_FIELD_LENGTH) {
      return { ok: false, alasan: 'skema_tidak_sesuai' };
    }
    const teks = cleanText(item.teks);
    if (item.status === 'terbaca' && teks) {
      label[field] = teks;
    } else if (item.status === 'tidak_terbaca') {
      // Teks sebagian (bila ada) tetap ditampilkan supaya mudah dibetulkan.
      label[field] = teks;
      tidakTerbaca.push(field);
    }
  }

  const claims = raw.pernyataanLain;
  if (
    !isStatus(claims.status) ||
    !Array.isArray(claims.daftar) ||
    !claims.daftar.every((item) => typeof item === 'string') ||
    claims.daftar.length > MAX_CLAIMS
  ) {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }
  const daftar = (claims.daftar as string[]).map(cleanText).filter(Boolean);
  if (daftar.some((item) => item.length > MAX_FIELD_LENGTH)) {
    return { ok: false, alasan: 'skema_tidak_sesuai' };
  }
  if (claims.status !== 'tidak_ada') {
    label.pernyataanLain = daftar;
  }
  if (claims.status === 'tidak_terbaca') {
    tidakTerbaca.push('pernyataanLain');
  }

  label.unreadableFields = tidakTerbaca;
  return { ok: true, label, tidakTerbaca };
}

/** Pesan untuk pengguna saat keluaran ditolak. */
export const EXTRACTION_FAILURE_MESSAGES: Record<
  Extract<ExtractionResult, { ok: false }>['alasan'],
  string
> = {
  bukan_json: 'Hasil baca tidak bisa dipakai. Silakan isi keterangan label sendiri.',
  skema_tidak_sesuai: 'Hasil baca tidak lengkap atau tidak sesuai. Silakan isi keterangan label sendiri.',
  bukan_label:
    'Gambar ini tidak tampak seperti label kemasan pangan, atau tulisannya tidak terbaca. Coba foto ulang, atau isi sendiri.',
};
