import { ALLERGEN_GROUPS, detectAllergens } from './allergens';
import { createEmptyLabelData, evaluateLabelRules } from './labelRules';
import { LABEL_RULE_METADATA } from './regulations';
import type {
  AdditionalAnswers,
  LabelData,
  LabelRuleId,
  RegulationReference,
} from './types';

/** Kunci baris pada label perbaikan. */
export type CorrectedLabelKey =
  | 'namaProduk'
  | 'daftarBahan'
  | 'beratBersih'
  | 'produsen'
  | 'nomorIzin'
  | 'tanggalKodeProduksi'
  | 'kedaluwarsa'
  | 'pernyataanAlergen'
  | 'caraPenyimpanan'
  | 'keteranganHalal'
  | 'pernyataanLain';

/** Kapan sebuah butir wajib dicantumkan. */
export type MandatoryCondition =
  | 'selalu'
  | 'bila_ada_alergen'
  | 'bila_bergantung_cara_simpan'
  | 'opsional';

export interface MandatoryLabelItem {
  kunci: CorrectedLabelKey;
  judul: string;
  kondisi: MandatoryCondition;
  /** Aturan label yang menjadi dasar butir ini. */
  aturan: LabelRuleId;
  rujukan: RegulationReference;
}

function item(
  kunci: CorrectedLabelKey,
  judul: string,
  kondisi: MandatoryCondition,
  aturan: LabelRuleId,
): MandatoryLabelItem {
  return { kunci, judul, kondisi, aturan, rujukan: LABEL_RULE_METADATA[aturan].rujukan };
}

/**
 * Butir label beserta urutan tampilnya pada label cetak. Urutan ini adalah
 * usulan tata letak: PRD tidak menetapkan urutan tampil. Yang dijaga adalah
 * semua butir wajib ada dan bahan diurutkan dari yang terbanyak. Pasal diambil
 * dari LABEL_RULE_METADATA.
 */
export const MANDATORY_LABEL_ITEMS: readonly MandatoryLabelItem[] = [
  item('namaProduk', 'Nama jenis pangan', 'selalu', 'L-01'),
  item('daftarBahan', 'Daftar bahan', 'selalu', 'L-02'),
  item('beratBersih', 'Berat bersih / isi bersih', 'selalu', 'L-05'),
  item('produsen', 'Nama dan alamat produsen', 'selalu', 'L-06'),
  item('nomorIzin', 'Nomor izin P-IRT', 'selalu', 'L-11'),
  item('tanggalKodeProduksi', 'Tanggal dan kode produksi', 'selalu', 'L-08'),
  item('kedaluwarsa', 'Kedaluwarsa', 'selalu', 'L-09'),
  item('pernyataanAlergen', 'Pernyataan alergen', 'bila_ada_alergen', 'L-12'),
  item('caraPenyimpanan', 'Cara penyimpanan', 'bila_bergantung_cara_simpan', 'L-19'),
  item('keteranganHalal', 'Keterangan halal', 'opsional', 'L-07'),
];

export const ALLERGEN_STATEMENT = 'Mengandung alergen, lihat daftar bahan yang dicetak tebal.';
export const INGREDIENT_PREFIX_DEFAULT = 'Komposisi:';
export const EXPIRY_PREFIX = 'Baik digunakan sebelum:';

export interface CorrectedLabelRow {
  kunci: CorrectedLabelKey;
  judul: string;
  teks: string;
  wajib: boolean;
  /** True bila teks kosong. Hanya butir wajib yang kosong menghalangi unduhan. */
  kosong: boolean;
  rujukan: RegulationReference;
}

export interface IngredientPart {
  teks: string;
  alergen: boolean;
}

export interface CorrectedLabel {
  baris: CorrectedLabelRow[];
  siapUnduh: boolean;
  /** Judul butir wajib yang masih kosong. */
  butirKosong: string[];
  catatan: string[];
  /** Daftar bahan (termasuk awalan) dipotong menurut alergen untuk dicetak tebal. */
  bahanBagian: IngredientPart[];
  alergenTerdeteksi: string[];
}

const INGREDIENT_PREFIX_REGEX =
  /^\s*(komposisi|daftar bahan|bahan yang digunakan|bahan-bahan)\b\s*:?\s*/i;
const EXPIRY_OK_REGEX = /^\s*baik digunakan sebelum\b/i;
/** Awalan kedaluwarsa yang dikenali dan boleh diganti; teks lain tidak disentuh. */
const EXPIRY_OTHER_PREFIX_REGEX =
  /^(?:\s*(?:best\s+before|baik\s+dikonsumsi\s+sebelum|exp(?:ired|iry)?(?:\.?\s*date)?|kadaluarsa|kadaluwarsa|kedaluarsa|kedaluwarsa|ed)\b\.?\s*:?)+\s*/i;
const PIRT_STRICT_REGEX = /(?<![A-Za-z])P-IRT(?![A-Za-z])/;
const PIRT_LOOSE_REGEX = /(?<![A-Za-z])P[\s.-]?IRT(?![A-Za-z])/i;

function blank(value: string): boolean {
  return value.trim().length === 0;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Memecah daftar bahan pada koma/titik koma di luar tanda kurung. */
function splitIngredients(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of body) {
    if (ch === '(' || ch === '[') depth++;
    else if ((ch === ')' || ch === ']') && depth > 0) depth--;
    if ((ch === ',' || ch === ';' || ch === '\n') && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim().replace(/\.$/, '').trim()).filter(Boolean);
}

function tokenKey(token: string): string {
  return normalize(token.replace(/\([^)]*\)/g, ''));
}

function validDayMonth(day: number, month: number): boolean {
  return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

/** True bila teks memuat pola tanggal yang valid (dd/mm/yy(yy), dd-mm-yyyy, ddmmyy, ddmmyyyy, yyyymmdd). */
export function containsValidDate(text: string): boolean {
  for (const m of text.matchAll(/(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g)) {
    if (validDayMonth(Number(m[1]), Number(m[2]))) return true;
  }
  for (const m of text.matchAll(/(?<!\d)(\d{6}|\d{8})(?!\d)/g)) {
    const d = m[1] as string;
    if (d.length === 6 && validDayMonth(Number(d.slice(0, 2)), Number(d.slice(2, 4)))) return true;
    if (d.length === 8) {
      if (validDayMonth(Number(d.slice(0, 2)), Number(d.slice(2, 4)))) return true;
      if (validDayMonth(Number(d.slice(6, 8)), Number(d.slice(4, 6)))) return true;
    }
  }
  return false;
}

/** Kecocokan kata utuh: sama persis, atau nama resep di awal/akhir token sebagai kata utuh. */
function wholeWordMatch(key: string, target: string): boolean {
  if (key.length === 0 || target.length === 0) return false;
  return key === target || key.startsWith(`${target} `) || key.endsWith(` ${target}`);
}

interface SortedIngredients {
  tokens: string[];
  matched: number;
  recipeTanpaPadanan: string[];
  labelTanpaPadanan: string[];
  resepCukup: boolean;
}

function sortByRecipe(tokens: string[], answers: AdditionalAnswers): SortedIngredients {
  const recipe = answers.resep
    .filter((r) => r.nama.trim().length > 0 && Number.isFinite(r.jumlahGram) && r.jumlahGram > 0)
    .map((r, index) => ({ ...r, index }))
    .sort((a, b) => b.jumlahGram - a.jumlahGram || a.index - b.index);
  if (recipe.length < 2) {
    return { tokens, matched: 0, recipeTanpaPadanan: [], labelTanpaPadanan: [], resepCukup: false };
  }

  const used = new Set<number>();
  const ordered: number[] = [];
  const tanpaPadanan: string[] = [];
  for (const r of recipe) {
    const target = normalize(r.nama);
    const idx = tokens.findIndex((token, i) => {
      if (used.has(i)) return false;
      const key = tokenKey(token);
      return wholeWordMatch(key, target);
    });
    if (idx === -1) {
      tanpaPadanan.push(r.nama.trim());
    } else {
      used.add(idx);
      ordered.push(idx);
    }
  }
  const labelTanpaPadanan = tokens.filter((_, i) => !used.has(i));
  // Urutan hanya diubah bila setiap bahan label dan setiap bahan resep punya padanan.
  if (ordered.length < 2 || labelTanpaPadanan.length > 0 || tanpaPadanan.length > 0) {
    return {
      tokens,
      matched: ordered.length,
      recipeTanpaPadanan: tanpaPadanan,
      labelTanpaPadanan,
      resepCukup: true,
    };
  }
  return {
    tokens: ordered.map((i) => tokens[i] as string),
    matched: ordered.length,
    recipeTanpaPadanan: tanpaPadanan,
    labelTanpaPadanan,
    resepCukup: true,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALLERGEN_KEYWORDS: string[] = ALLERGEN_GROUPS.flatMap((group) => group.kataKunci).sort(
  (a, b) => b.length - a.length,
);

/** Memotong teks menjadi bagian biasa dan bagian alergen (batas kata seperti detectAllergens). */
export function splitAllergenParts(text: string): IngredientPart[] {
  if (text.length === 0) return [];
  const regex = new RegExp(
    `(^|[^a-z0-9])(${ALLERGEN_KEYWORDS.map(escapeRegex).join('|')})(?=[^a-z0-9]|$)`,
    'gi',
  );
  const parts: IngredientPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const start = match.index + (match[1] ?? '').length;
    const end = start + (match[2] ?? '').length;
    if (start > cursor) parts.push({ teks: text.slice(cursor, start), alergen: false });
    parts.push({ teks: text.slice(start, end), alergen: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ teks: text.slice(cursor), alergen: false });
  return parts;
}

/** True bila semua butir wajib terisi. */
export function canDownloadLabel(
  baris: readonly Pick<CorrectedLabelRow, 'wajib' | 'kosong'>[],
): boolean {
  return baris.every((row) => !(row.wajib && row.kosong));
}

function cleanClaims(
  claims: readonly string[],
  answers: AdditionalAnswers,
): { kept: string[]; removed: string[] } {
  const kept: string[] = [];
  const removed: string[] = [];
  for (const claim of claims) {
    if (blank(claim)) continue;
    const probe: LabelData = { ...createEmptyLabelData(), pernyataanLain: [claim] };
    const hasil = evaluateLabelRules(probe, answers).hasil;
    const bad = hasil.some((r) => (r.id === 'L-15' || r.id === 'L-17') && r.status === 'kurang');
    (bad ? removed : kept).push(claim.trim());
  }
  return { kept, removed };
}

/** Aturan yang sudah terwakili oleh butir kosong, supaya catatan tidak ganda. */
const KEY_BY_RULE: Partial<Record<LabelRuleId, CorrectedLabelKey>> = {
  'L-01': 'namaProduk',
  'L-02': 'daftarBahan',
  'L-05': 'beratBersih',
  'L-06': 'produsen',
  'L-08': 'tanggalKodeProduksi',
  'L-09': 'kedaluwarsa',
  'L-11': 'nomorIzin',
  'L-19': 'caraPenyimpanan',
};

/**
 * Menyusun label perbaikan. Hanya perbaikan yang aman dan deterministik yang
 * dilakukan; nomor izin, tanggal, dan alamat tidak pernah dikarang. Butir wajib
 * yang kosong ditandai dan membuat `siapUnduh` bernilai false.
 */
export function buildCorrectedLabel(label: LabelData, answers: AdditionalAnswers): CorrectedLabel {
  const catatan: string[] = [];

  // Daftar bahan
  const rawIngredients = label.daftarBahanTeks.trim();
  const prefixMatch = INGREDIENT_PREFIX_REGEX.exec(rawIngredients);
  const body = prefixMatch ? rawIngredients.slice(prefixMatch[0].length).trim() : rawIngredients;
  let ingredientText = '';
  let bahanBagian: IngredientPart[] = [];
  const alergenTerdeteksi = detectAllergens(body);
  if (body.length > 0) {
    const original = splitIngredients(body);
    const sorted = sortByRecipe(original, answers);
    let reordered = false;
    const prefix = prefixMatch
      ? `${(prefixMatch[1] as string).replace(/^./, (c) => c.toUpperCase())}:`
      : INGREDIENT_PREFIX_DEFAULT;
    if (!prefixMatch) {
      catatan.push(`Awalan "${INGREDIENT_PREFIX_DEFAULT}" ditambahkan pada daftar bahan.`);
    }
    if (!sorted.resepCukup) {
      catatan.push(
        'Urutan bahan belum bisa dipastikan dari yang terbanyak karena resep minimal dua bahan belum diisi. Urutan mengikuti teks asli.',
      );
    } else if (
      sorted.matched < 2 ||
      sorted.labelTanpaPadanan.length > 0 ||
      sorted.recipeTanpaPadanan.length > 0
    ) {
      catatan.push(
        'Nama bahan di resep belum cukup cocok dengan daftar bahan, jadi urutan dibiarkan seperti teks asli. Cek sendiri bahwa urutannya dari yang terbanyak.',
      );
      if (sorted.labelTanpaPadanan.length > 0) {
        catatan.push(
          `Bahan di label yang tidak ada padanannya di resep: ${sorted.labelTanpaPadanan.join(', ')}.`,
        );
      }
      if (sorted.recipeTanpaPadanan.length > 0) {
        catatan.push(
          `Bahan resep yang tidak ditemukan di daftar bahan: ${sorted.recipeTanpaPadanan.join(', ')}.`,
        );
      }
    } else if (sorted.tokens.join('|') !== original.join('|')) {
      reordered = true;
      catatan.push('Bahan disusun ulang dari takaran terbanyak menurut resep.');
    }
    // Pemisah asli (titik koma, baris baru) dipertahankan kecuali bahan benar-benar diurutkan ulang.
    const bodyText = reordered ? sorted.tokens.join(', ') : body.replace(/\.\s*$/, '');
    ingredientText = `${prefix} ${bodyText}.`;
    bahanBagian = splitAllergenParts(ingredientText);
  }

  // Pernyataan alergen
  const wajibAlergen = alergenTerdeteksi.length > 0;
  const alergenText = wajibAlergen ? ALLERGEN_STATEMENT : '';
  if (wajibAlergen && normalize(label.pernyataanAlergenTeks) !== normalize(ALLERGEN_STATEMENT)) {
    catatan.push('Kalimat alergen resmi ditambahkan (Pasal 49 dan Pasal 51).');
  }

  // Kedaluwarsa
  const rawExpiry = label.kedaluwarsaTeks.trim();
  let expiryText = '';
  if (rawExpiry.length > 0) {
    if (EXPIRY_OK_REGEX.test(rawExpiry)) {
      expiryText = rawExpiry;
    } else {
      const rest = rawExpiry.replace(EXPIRY_OTHER_PREFIX_REGEX, '').trim();
      if (rest.length > 0) {
        expiryText = `${EXPIRY_PREFIX} ${rest}`;
        catatan.push(`Awalan kedaluwarsa dijadikan "${EXPIRY_PREFIX}".`);
      }
    }
  }

  // Nomor izin: hanya dari pengguna. Tulisan "P-IRT" tidak pernah ditambahkan ke teks yang bukan nomor izin.
  const rawPirt = label.nomorIzinTeks.trim();
  let pirtText = rawPirt;
  let pirtBelumLengkap = false;
  if (rawPirt.length > 0) {
    if (PIRT_STRICT_REGEX.test(rawPirt)) {
      pirtText = rawPirt;
    } else if (PIRT_LOOSE_REGEX.test(rawPirt)) {
      pirtText = rawPirt.replace(PIRT_LOOSE_REGEX, 'P-IRT');
      catatan.push('Penulisan "P-IRT" dirapikan sesuai bentuk bakunya.');
    } else {
      pirtBelumLengkap = true;
      catatan.push('Tulisan P-IRT belum ada; tulis sesuai nomor izin dari dinas.');
    }
  }

  // Produsen
  const produsenNama = label.namaProdusen.trim();
  const produsenAlamat = label.alamatProdusen.trim();
  const produsenText = [produsenNama, produsenAlamat].filter(Boolean).join('\n');
  const produsenKosong = produsenNama === '' || produsenAlamat === '';

  // Tanggal dan kode produksi (kode wajib; tanggal wajib kecuali sudah ada di kode, seperti L-08)
  const tanggal = label.tanggalProduksiTeks.trim();
  const kode = label.kodeProduksiTeks.trim();
  const kodeMemuatTanggal = containsValidDate(kode);
  const tanggalKodeText = [tanggal, kode].filter(Boolean).join('\n');
  const tanggalKodeKosong = kode === '' || (tanggal === '' && !kodeMemuatTanggal);

  // Cara penyimpanan
  const simpanText = label.caraPenyimpananTeks.trim();
  const simpanBelumDijawab = answers.bergantungCaraSimpan === null && simpanText === '';
  const wajibSimpan = answers.bergantungCaraSimpan === true || simpanBelumDijawab;
  if (simpanBelumDijawab) {
    catatan.push('Jawab pertanyaan cara simpan atau tulis petunjuk penyimpanan.');
  }

  // Halal
  const halalRaw = label.keteranganHalalTeks.trim();
  let halalText = '';
  if (halalRaw.length > 0) {
    if (answers.punyaSertifikatHalal === true) {
      halalText = halalRaw;
    } else {
      catatan.push(
        'Keterangan halal dihapus karena belum dipastikan bersertifikat (Pasal 32). Cantumkan hanya bila sudah punya sertifikat.',
      );
    }
  }

  // Klaim
  const { kept, removed } = cleanClaims(label.pernyataanLain, answers);
  for (const claim of removed) {
    catatan.push(
      `Pernyataan "${claim}" dibuang karena termasuk klaim yang tidak boleh dicantumkan (Pasal 67).`,
    );
  }

  const nilai: Record<
    CorrectedLabelKey,
    { teks: string; kosong?: boolean; wajib?: boolean }
  > = {
    namaProduk: { teks: label.namaProduk.trim() },
    daftarBahan: { teks: ingredientText },
    beratBersih: { teks: label.beratBersihTeks.trim() },
    produsen: { teks: produsenText, kosong: produsenKosong },
    nomorIzin: { teks: pirtText, kosong: pirtBelumLengkap || blank(pirtText) },
    tanggalKodeProduksi: { teks: tanggalKodeText, kosong: tanggalKodeKosong },
    kedaluwarsa: { teks: expiryText },
    pernyataanAlergen: { teks: alergenText, wajib: wajibAlergen },
    caraPenyimpanan: { teks: simpanText, wajib: wajibSimpan },
    keteranganHalal: { teks: halalText, wajib: false },
    pernyataanLain: { teks: kept.join('\n'), wajib: false },
  };

  const baris: CorrectedLabelRow[] = MANDATORY_LABEL_ITEMS.map((def) => {
    const value = nilai[def.kunci];
    return {
      kunci: def.kunci,
      judul: def.judul,
      teks: value.teks,
      wajib: value.wajib ?? def.kondisi === 'selalu',
      kosong: value.kosong ?? blank(value.teks),
      rujukan: def.rujukan,
    };
  });
  baris.push({
    kunci: 'pernyataanLain',
    judul: 'Pernyataan lain',
    teks: nilai.pernyataanLain.teks,
    wajib: false,
    kosong: blank(nilai.pernyataanLain.teks),
    rujukan: LABEL_RULE_METADATA['L-15'].rujukan,
  });

  const butirKosong = baris.filter((r) => r.wajib && r.kosong).map((r) => r.judul);

  // Temuan yang masih tersisa pada label hasil perbaikan dan tidak bisa diperbaiki otomatis.
  const kosongKeys = new Set(baris.filter((r) => r.wajib && r.kosong).map((r) => r.kunci));
  const corrected: LabelData = {
    ...label,
    daftarBahanTeks: ingredientText,
    kedaluwarsaTeks: expiryText,
    nomorIzinTeks: pirtText,
    pernyataanAlergenTeks: alergenText,
    keteranganHalalTeks: halalText,
    pernyataanLain: kept,
    unreadableFields: [],
  };
  for (const r of evaluateLabelRules(corrected, answers).hasil) {
    if (r.status !== 'kurang') continue;
    const key = KEY_BY_RULE[r.id];
    if (key && kosongKeys.has(key)) continue;
    catatan.push(`${r.id}: ${r.penjelasan} (${r.rujukan.pasal})`);
  }

  return {
    baris,
    siapUnduh: canDownloadLabel(baris),
    butirKosong,
    catatan,
    bahanBagian,
    alergenTerdeteksi,
  };
}
