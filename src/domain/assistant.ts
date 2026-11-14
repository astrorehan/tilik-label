import { evaluateLabelRules } from './labelRules';
import { evaluatePermitPath } from './permitRules';
import { LABEL_RULE_METADATA, PERMIT_RULE_METADATA, REGULATION_LAST_READ } from './regulations';
import type {
  AdditionalAnswers,
  AnyRuleId,
  LabelData,
  LabelFieldKey,
  LabelRuleId,
  PermitRuleId,
  ProductionEquipment,
} from './types';

/**
 * Asisten tanya jawab temuan (F-14): bagian murni.
 * Konteks dibangun ulang di server dari isi label dan jawaban, jadi status temuan
 * selalu berasal dari pemeriksa aturan, bukan dari peramban atau model.
 */

export type QuickQuestionId = 'maksud' | 'contoh' | 'kenapa' | 'prioritas' | 'jalur';

export interface QuickQuestion {
  id: QuickQuestionId;
  teks: string;
  /** true bila pertanyaan ini butuh satu temuan tertentu. */
  perTemuan: boolean;
}

export const QUICK_QUESTIONS: QuickQuestion[] = [
  { id: 'maksud', teks: 'Apa maksud temuan ini dalam bahasa sehari-hari?', perTemuan: true },
  { id: 'contoh', teks: 'Bagaimana contoh penulisan yang benar untuk labelku?', perTemuan: true },
  { id: 'kenapa', teks: 'Kenapa butir ini diperiksa saat mengurus izin?', perTemuan: true },
  { id: 'prioritas', teks: 'Mana yang sebaiknya kuperbaiki lebih dulu?', perTemuan: false },
  { id: 'jalur', teks: 'Jelaskan hasil jalur izin produkku.', perTemuan: false },
];

/** Batas panjang pertanyaan bebas lanjutan. */
export const MAX_FREE_QUESTION_LENGTH = 200;

export type AssistantRequest = {
  ruleId?: AnyRuleId;
} & ({ pertanyaanId: QuickQuestionId } | { pertanyaanBebas: string });

const LABEL_TEXT_KEYS: Array<Exclude<LabelFieldKey, 'pernyataanLain'>> = [
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
const MAX_TEXT = 1500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/**
 * Membersihkan isi label dan jawaban dari peramban. Teks dipotong, tipe yang salah
 * diganti nilai kosong. Mengembalikan null bila bentuknya sama sekali tidak sesuai.
 */
export function sanitizeCheckInput(
  rawLabel: unknown,
  rawAnswers: unknown,
): { label: LabelData; answers: AdditionalAnswers } | null {
  if (!isRecord(rawLabel) || !isRecord(rawAnswers)) {
    return null;
  }
  const label = Object.fromEntries(
    LABEL_TEXT_KEYS.map((key) => {
      const value = rawLabel[key];
      return [key, typeof value === 'string' ? value.slice(0, MAX_TEXT) : ''];
    }),
  ) as unknown as Omit<LabelData, 'pernyataanLain'>;
  const claims = Array.isArray(rawLabel.pernyataanLain)
    ? rawLabel.pernyataanLain
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 20)
        .map((item) => item.slice(0, 300))
    : [];
  const unreadable = Array.isArray(rawLabel.unreadableFields)
    ? rawLabel.unreadableFields.filter(
        (item): item is LabelFieldKey =>
          typeof item === 'string' &&
          ([...LABEL_TEXT_KEYS, 'pernyataanLain'] as string[]).includes(item),
      )
    : [];

  const resep = Array.isArray(rawAnswers.resep)
    ? rawAnswers.resep
        .filter(
          (item): item is { nama: string; jumlahGram: number } =>
            isRecord(item) &&
            typeof item.nama === 'string' &&
            typeof item.jumlahGram === 'number' &&
            Number.isFinite(item.jumlahGram),
        )
        .slice(0, 40)
        .map((item) => ({ nama: item.nama.slice(0, 100), jumlahGram: item.jumlahGram }))
    : [];
  const umur = rawAnswers.umurSimpanHari;
  const alat = rawAnswers.alatProduksi;
  const answers: AdditionalAnswers = {
    resep,
    umurSimpanHari: typeof umur === 'number' && Number.isFinite(umur) && umur > 0 ? umur : null,
    bergantungCaraSimpan: boolOrNull(rawAnswers.bergantungCaraSimpan),
    punyaSertifikatHalal: boolOrNull(rawAnswers.punyaSertifikatHalal),
    alatProduksi:
      alat === 'manual' || alat === 'semi_otomatis' || alat === 'otomatis'
        ? (alat as ProductionEquipment)
        : null,
    panganSiapSaji: boolOrNull(rawAnswers.panganSiapSaji),
    produksiDiRumah: boolOrNull(rawAnswers.produksiDiRumah),
    butuhPenangananKhusus: boolOrNull(rawAnswers.butuhPenangananKhusus),
    wajibSni: boolOrNull(rawAnswers.wajibSni),
  };
  return { label: { ...label, pernyataanLain: claims, unreadableFields: unreadable }, answers };
}

/** Semua kode aturan yang dikenal aplikasi. */
export const KNOWN_RULE_IDS: AnyRuleId[] = [
  ...(Object.keys(LABEL_RULE_METADATA) as LabelRuleId[]),
  ...(Object.keys(PERMIT_RULE_METADATA) as PermitRuleId[]),
];

export function isKnownRuleId(value: unknown): value is AnyRuleId {
  return typeof value === 'string' && (KNOWN_RULE_IDS as string[]).includes(value);
}

/**
 * Bahan acuan tetap untuk asisten: daftar aturan dan pasal yang dipakai aplikasi.
 * Isinya sama untuk semua permintaan supaya bisa di-cache penyedia.
 */
export function buildReferenceMaterial(): string {
  const label = Object.entries(LABEL_RULE_METADATA).map(
    ([id, meta]) => `${id} | ${meta.judul} | ${meta.rujukan.peraturan}, ${meta.rujukan.pasal}`,
  );
  const permit = Object.entries(PERMIT_RULE_METADATA).map(
    ([id, meta]) => `${id} | ${meta.judul} | ${meta.rujukan.peraturan}, ${meta.rujukan.pasal}`,
  );
  return [
    `Bahan acuan (dibaca dari teks resmi pada ${REGULATION_LAST_READ}). Format: kode | aturan | pasal.`,
    'Aturan label:',
    ...label,
    'Aturan jalur izin:',
    ...permit,
    'Catatan: Lampiran I Peraturan BPOM 4/2024 (jenis pangan yang boleh lewat SPP-IRT) belum dibaca, jadi jenis pangan selalu perlu dicek ke Dinas Kesehatan.',
  ].join('\n');
}

/** Membuang karakter kontrol dan memotong teks pengguna sebelum masuk konteks model. */
export function cleanForContext(text: string, max: number): string {
  return text
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Konteks terkunci per permintaan: hasil pemeriksaan terstruktur yang dihitung di server. */
export function buildLockedContext(label: LabelData, answers: AdditionalAnswers, ruleId?: AnyRuleId) {
  const report = evaluateLabelRules(label, answers);
  const permit = evaluatePermitPath(label, answers);
  const temuan = report.hasil.map((item) => ({
    kode: item.id,
    aturan: item.judul,
    status: item.status,
    pasal: `${item.rujukan.peraturan}, ${item.rujukan.pasal}`,
    penjelasan: item.penjelasan,
    ...(item.saranPerbaikan ? { saran: item.saranPerbaikan } : {}),
    ...(item.contohBenar ? { contohBenar: item.contohBenar } : {}),
  }));
  return {
    produk: cleanForContext(label.namaProduk, 80) || '(tanpa nama)',
    temuanDitanya: ruleId ?? null,
    jalurIzin: {
      hasil: permit.judul,
      alasan: permit.alasan,
      pasal: permit.rujukan.map((ref) => `${ref.peraturan}, ${ref.pasal}`),
      perluDicek: permit.perluDicek,
      aturan: permit.aturan.map((rule) => ({
        kode: rule.id,
        aturan: rule.judul,
        dampak: rule.dampak,
        pasal: `${rule.rujukan.peraturan}, ${rule.rujukan.pasal}`,
        penjelasan: rule.penjelasan,
      })),
    },
    temuan,
  };
}

/** Teks pertanyaan akhir yang dikirim ke model. */
export function resolveQuestion(request: AssistantRequest): string | null {
  if ('pertanyaanId' in request) {
    const quick = QUICK_QUESTIONS.find((q) => q.id === request.pertanyaanId);
    if (!quick) return null;
    if (quick.perTemuan && !request.ruleId) return null;
    return quick.teks;
  }
  const text = request.pertanyaanBebas.replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_FREE_QUESTION_LENGTH) return null;
  return text;
}

/** Semua pasal yang boleh disebut asisten (dari bahan acuan). */
export function allowedArticleNumbers(): Set<string> {
  const numbers = new Set<string>();
  for (const meta of [...Object.values(LABEL_RULE_METADATA), ...Object.values(PERMIT_RULE_METADATA)]) {
    for (const match of meta.rujukan.pasal.matchAll(/\d+/g)) numbers.add(match[0]);
  }
  return numbers;
}

/** Peraturan yang dikenal aplikasi, sebagai pasangan nomor/tahun. */
export const KNOWN_REGULATIONS = ['31/2018', '4/2024', '10/2026'];

/**
 * Menemukan nomor pasal yang disebut jawaban tetapi tidak ada di bahan acuan.
 * Menangkap rangkaian seperti "Pasal 5, 10 dan 14" dan singkatan "Ps. 9".
 */
export function findUnknownArticles(answer: string): string[] {
  const allowed = allowedArticleNumbers();
  const unknown = new Set<string>();
  const pattern = /\b(?:pasal|ps\.?)\s+(\d+(?:\s*(?:,|dan|serta|atau|-|sampai)\s*\d+)*)/gi;
  for (const match of answer.matchAll(pattern)) {
    for (const number of match[1]?.match(/\d+/g) ?? []) {
      if (!allowed.has(number)) unknown.add(number);
    }
  }
  return [...unknown];
}

/**
 * Menemukan peraturan bernomor yang tidak ada di bahan acuan,
 * mis. "UU 18/2012", "PP Nomor 86 Tahun 2019", "Peraturan BPOM Nomor 22 Tahun 2019".
 */
export function findUnknownRegulations(answer: string): string[] {
  const unknown = new Set<string>();
  const patterns = [
    /\b(?:peraturan|perka|perkaban|permenkes|pp|uu|undang-undang|keputusan|kepmenkes)\b[^.\n]{0,40}?\bnomor\s+(\d+)\s+tahun\s+(\d{4})/gi,
    /\b(?:peraturan|perka|perkaban|permenkes|pp|uu|bpom|keputusan|kepmenkes)\s+(?:no\.?\s*)?(\d+)\s*\/\s*(\d{4})/gi,
  ];
  for (const pattern of patterns) {
    for (const match of answer.matchAll(pattern)) {
      const key = `${match[1]}/${match[2]}`;
      if (!KNOWN_REGULATIONS.includes(key)) unknown.add(key);
    }
  }
  return [...unknown];
}

const DOMAIN_KEYWORDS =
  /\b(label|kemasan|bahan|komposisi|pasal|aturan|peraturan|izin|p-?irt|spp|halal|alergen|kedaluwarsa|kadaluarsa|kadaluwarsa|expired|exp|berat|bersih|produsen|alamat|kode|produksi|tanggal|simpan|penyimpanan|klaim|pengawet|pewarna|pemanis|gizi|bpom|dinas|temuan|status|cetak|tulisan|penulisan|huruf|urutan|takaran|resep|umur|jalur|siap saji|stiker|logo|nomor|merek|nama produk|bahasa)\b|\b[li]-\d{2}\b/i;

/**
 * Saringan cakupan di server untuk pertanyaan bebas tanpa temuan tertentu.
 * Pertanyaan yang sama sekali tidak menyinggung label atau aturan ditolak sebelum memanggil model.
 */
export function isQuestionInScope(question: string, ruleId?: AnyRuleId): boolean {
  if (ruleId) {
    // Di dalam kotak temuan, pertanyaan pendek seperti "apa artinya?" tetap wajar.
    return true;
  }
  return DOMAIN_KEYWORDS.test(question);
}

export const OUT_OF_SCOPE_ANSWER =
  'Maaf, pertanyaan itu di luar cakupan asisten ini. Asisten hanya menjelaskan hasil pemeriksaan label di halaman ini. Untuk hal lain, tanyakan ke Dinas Kesehatan setempat atau baca teks resmi Peraturan BPOM.';
