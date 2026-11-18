import { cleanForContext, MAX_FREE_QUESTION_LENGTH } from './assistant';
import { declaredShelfLife, updateLabelField } from './labelEvidence';
import { evaluateLabelRules } from './labelRules';
import { ADDITIONAL_QUESTIONS, parseAmountInput, type AdditionalQuestionId } from './questions';
import type { LabelReview } from './reportGroups';
import type { AdditionalAnswers, LabelData, LabelFieldKey, LabelRuleId } from './types';

export const QUESTION_ANSWER_LIMIT = 600;
export const QUESTION_ANSWER_FIELDS = {
  umurSimpan: 'umurSimpanHari',
  caraSimpan: 'bergantungCaraSimpan',
  sertifikatHalal: 'punyaSertifikatHalal',
  alatProduksi: 'alatProduksi',
  resep: 'resep',
} as const satisfies Record<AdditionalQuestionId, keyof AdditionalAnswers>;

export type AnswerPatch = Partial<Pick<AdditionalAnswers, (typeof QUESTION_ANSWER_FIELDS)[AdditionalQuestionId]>>;

export function isProductQuestion(id: unknown): id is AdditionalQuestionId {
  return ADDITIONAL_QUESTIONS.some((question) => question.id === id);
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

const QUESTION_CUES: Record<AdditionalQuestionId, RegExp> = {
  umurSimpan: /\b(?:jam|hari|minggu|bulan|tahun|sehari|seminggu|sebulan|setahun)\b/i,
  caraSimpan: /\b(?:simpan\w*|disimpan|dingin|beku|kulkas|freezer|suhu ruang|tempat kering)\b/i,
  sertifikatHalal: /\b(?:sertifikat|halal)\b/i,
  alatProduksi: /\b(?:manual|otomatis|mesin|dapur|tangan)\b/i,
  resep: /./,
};

export function validateAnswerPatch(raw: unknown, question: AdditionalQuestionId, statement: string): AnswerPatch | null {
  const value = record(raw);
  if (!value) return null;
  const includes = (id: AdditionalQuestionId) => id === question || QUESTION_CUES[id].test(statement);
  const patch: AnswerPatch = {};
  const { umurSimpanHari, bergantungCaraSimpan, punyaSertifikatHalal, alatProduksi, resep } = value;
  if (includes('umurSimpan') && typeof umurSimpanHari === 'number' && umurSimpanHari > 0 && Number.isFinite(umurSimpanHari)) {
    patch.umurSimpanHari = umurSimpanHari;
  }
  if (includes('caraSimpan') && typeof bergantungCaraSimpan === 'boolean') patch.bergantungCaraSimpan = bergantungCaraSimpan;
  if (includes('sertifikatHalal') && typeof punyaSertifikatHalal === 'boolean') patch.punyaSertifikatHalal = punyaSertifikatHalal;
  if (includes('alatProduksi') && (alatProduksi === 'manual' || alatProduksi === 'semi_otomatis' || alatProduksi === 'otomatis')) {
    patch.alatProduksi = alatProduksi;
  }
  if (question === 'resep' && Array.isArray(resep) && resep.length > 0 && resep.length <= 40) {
    const rows = resep.map(record);
    if (rows.every((row): row is { nama: string; jumlahGram: number } => {
      const name = typeof row?.nama === 'string' ? row.nama.trim() : '';
      return name.length > 0 && name.length <= 100 && statement.toLowerCase().includes(name.toLowerCase()) &&
        typeof row?.jumlahGram === 'number' && row.jumlahGram > 0 && Number.isFinite(row.jumlahGram);
    })) {
      patch.resep = rows.map(({ nama, jumlahGram }) => ({ nama: nama.trim(), jumlahGram }));
    }
  }
  return Object.hasOwn(patch, QUESTION_ANSWER_FIELDS[question]) ? patch : null;
}

/** Jawaban yang bisa dipastikan tanpa memanggil layanan model. */
export function directProductAnswer(question: AdditionalQuestionId, statement: string): AnswerPatch | null {
  const text = statement.toLowerCase().replace(/[.!]+$/, '').trim();
  if (question === 'umurSimpan') {
    const duration = text.replace(/^(?:sekitar|kira-kira|kurang lebih)\s+/, '')
      .replace(/^(sehari|seminggu|sebulan|setahun)$/, (word) => `1 ${word.slice(2)}`);
    const days = parseAmountInput(duration) ?? declaredShelfLife({ pernyataanLain: [`Umur simpan ${duration}`] });
    return days === null ? null : { umurSimpanHari: days };
  }
  if (question === 'caraSimpan' && /^(ya|iya|tidak|nggak|enggak|tidak perlu)$/.test(text)) {
    return { bergantungCaraSimpan: text === 'ya' || text === 'iya' };
  }
  if (question === 'sertifikatHalal' && /^(ya|iya|sudah|sudah punya|tidak|belum|belum punya)$/.test(text)) {
    return { punyaSertifikatHalal: /^(ya|iya|sudah)/.test(text) };
  }
  if (question === 'alatProduksi') {
    const equipment = text.replace(/^semi[- ]otomatis$/, 'semi_otomatis');
    if (equipment === 'manual' || equipment === 'semi_otomatis' || equipment === 'otomatis') {
      return { alatProduksi: equipment };
    }
  }
  return null;
}

export function greetingFindings(review: LabelReview) {
  return [
    ...review.groups.keputusan.map(({ sesudah }) => sesudah),
    ...review.groups.cek.map(({ asli }) => asli),
  ].slice(0, 6);
}

export function validateGreeting(raw: unknown, allowed: readonly LabelRuleId[]): LabelRuleId[] | null {
  const priorities = record(raw)?.prioritas;
  if (!Array.isArray(priorities) || priorities.length < 1 || priorities.length > 2) return null;
  const ids = priorities.filter((id): id is LabelRuleId => allowed.includes(id));
  return ids.length === priorities.length && new Set(ids).size === ids.length ? ids : null;
}

const CLAIM_RULES: ReadonlySet<LabelRuleId> = new Set(['L-15', 'L-16', 'L-17', 'L-18']);

function checkClaim(label: LabelData, answers: AdditionalAnswers, text: string) {
  // Isolasi kalimat supaya klaim lain dan nama produk tidak menutupi temuannya.
  const probe = { ...label, namaProduk: '', pernyataanLain: [text], unreadableFields: [] };
  return evaluateLabelRules(probe, answers).hasil.filter(({ id }) => CLAIM_RULES.has(id));
}

export function flaggedClaim(label: LabelData, answers: AdditionalAnswers, index: number) {
  const text = label.pernyataanLain[index]?.trim();
  if (!text) return null;
  const issue = checkClaim(label, answers, text).find(({ status }) => status === 'kurang');
  return issue ? { index, text, reason: issue.saranPerbaikan ?? issue.penjelasan } : null;
}

// Model merangkai ajakan penyajian. Kosakata ini membatasi usulan pada ajakan,
// tanpa memasukkan fakta baru tentang bahan, kesehatan, atau izin produk.
const SERVING_VERBS = ['Nikmati', 'Sajikan', 'Hadirkan'];
const SERVING_OCCASIONS = [
  'saat makan bersama', 'sebagai pelengkap hidangan', 'saat berkumpul bersama keluarga',
  'untuk menemani waktu santai', 'di meja makan', 'bersama hidangan favoritmu', 'saat istirahat',
];
export const CLAIM_COPY_OPTIONS = SERVING_OCCASIONS.flatMap((occasion) =>
  SERVING_VERBS.map((verb) => `${verb} ${occasion}.`),
);
const CLAIM_COPY = new Set(CLAIM_COPY_OPTIONS);

export function replaceFlaggedClaim(label: LabelData, answers: AdditionalAnswers, index: number, text: string) {
  if (!CLAIM_COPY.has(text) || !flaggedClaim(label, answers, index)) return null;
  if (label.pernyataanLain.some((claim) => claim.trim().toLowerCase() === text.toLowerCase())) return null;
  if (checkClaim(label, answers, text).some(({ status }) => status !== 'lengkap')) return null;
  return { ...label, pernyataanLain: label.pernyataanLain.map((claim, position) => position === index ? text : claim) };
}

export function validateClaimSuggestions(raw: unknown, label: LabelData, answers: AdditionalAnswers, index: number) {
  const suggestions = record(raw)?.usulan;
  if (!Array.isArray(suggestions) || suggestions.length > 9) return null;
  const usable = new Map<string, string>();
  for (const text of suggestions) {
    if (typeof text !== 'string' || !replaceFlaggedClaim(label, answers, index, text)) continue;
    const occasion = text.replace(/^\S+\s/, '');
    if (!usable.has(occasion)) usable.set(occasion, text);
  }
  const unique = [...usable.values()].slice(0, 3);
  return unique.length === 3 ? unique : null;
}

export const LABEL_FIELD_TITLES: Record<LabelFieldKey, string> = {
  namaProduk: 'Nama jenis pangan',
  daftarBahanTeks: 'Daftar bahan',
  beratBersihTeks: 'Berat atau isi bersih',
  namaProdusen: 'Nama produsen',
  alamatProdusen: 'Alamat produsen',
  keteranganHalalTeks: 'Keterangan halal',
  kodeProduksiTeks: 'Kode produksi',
  tanggalProduksiTeks: 'Tanggal produksi',
  kedaluwarsaTeks: 'Keterangan kedaluwarsa',
  nomorIzinTeks: 'Nomor izin P-IRT',
  pernyataanAlergenTeks: 'Pernyataan alergen',
  caraPenyimpananTeks: 'Cara penyimpanan',
  pernyataanLain: 'Klaim atau tulisan lain',
};

const LABEL_EDIT_NAMES: Record<Exclude<LabelFieldKey, 'pernyataanLain'>, string> = {
  namaProdusen: 'nama (?:produsen|pembuat)',
  namaProduk: 'nama (?:produk|jenis pangan)|nama',
  daftarBahanTeks: 'komposisi|daftar bahan',
  beratBersihTeks: 'berat(?: bersih)?|isi bersih|netto',
  alamatProdusen: 'alamat(?: produsen| pembuat)?',
  keteranganHalalTeks: '(?:keterangan |tulisan )?halal',
  kodeProduksiTeks: 'kode (?:produksi|batch)|nomor batch',
  tanggalProduksiTeks: 'tanggal (?:produksi|pembuatan)',
  kedaluwarsaTeks: '(?:tanggal |keterangan )?(?:kedaluwarsa|kadaluarsa|kadaluwarsa|expired|exp)',
  nomorIzinTeks: '(?:nomor )?(?:izin(?: edar)?|p-?irt|spp-?irt)',
  pernyataanAlergenTeks: '(?:pernyataan |peringatan )?alergen',
  caraPenyimpananTeks: 'cara (?:simpan|penyimpanan)|petunjuk penyimpanan',
};

type TextEditField = keyof typeof LABEL_EDIT_NAMES;
export interface LabelEdit { field: TextEditField; text: string }

const EDIT_INTENT = /^(?:tilik[, ]+)?(?:(?:tolong|bisa|coba|aku mau|saya mau)\s+)*(?:ubah(?:in)?|ganti(?:in)?|isi(?:kan)?|set|tulis(?:kan)?)\s+/i;
const ANOTHER_EDIT = /(?:[,;]\s*|\b(?:dan|lalu|terus)\s+)(?:ubah(?:in)?|ganti(?:in)?|isi(?:kan)?|set|tulis(?:kan)?)\s+/i;

export function labelEditRequest(statement: string) {
  const text = cleanForContext(statement, MAX_FREE_QUESTION_LENGTH + 1);
  if (text.length > MAX_FREE_QUESTION_LENGTH || !EDIT_INTENT.test(text)) return null;
  const rest = text.replace(EDIT_INTENT, '');
  for (const [key, aliases] of Object.entries(LABEL_EDIT_NAMES)) {
    const match = new RegExp(`^(?:bagian )?(?:${aliases})(?:nya)?(?=\\s|:|$)\\s*(.*)$`, 'i').exec(rest);
    if (!match) continue;
    const value = match[1]!.trim();
    if (value && !value.endsWith('?') && !ANOTHER_EDIT.test(value)) {
      return { field: key as TextEditField, value };
    }
  }
  return null;
}

export function readLabelEdit(field: TextEditField, phrase: string): LabelEdit | null {
  const explicit = /^(?:(?:jadi|menjadi|ke|dengan|sebagai)\s+|:\s*)(.+)$/i.exec(phrase)?.[1];
  const text = explicit?.replace(/^["“](.+)["”]$/, '$1').trim();
  return text ? { field, text } : null;
}

export function applyLabelEdit(label: LabelData, edit: LabelEdit) {
  return updateLabelField(label, edit.field, edit.text);
}
