import {
  evaluateLabelRules,
  evaluatePermitPath,
  type AdditionalAnswers,
  type LabelCheckReport,
  type LabelData,
  type LabelFieldKey,
  type PermitPathOutcome,
  type ProductionEquipment,
  type RecipeIngredient,
} from '@/domain';
import { getSafeStorage, readJson, readRaw, writeJson, type StorageLike } from './safeStorage';

/** Kunci penyimpanan; angka versi dinaikkan bila bentuk data berubah. */
export const PRODUK_SAYA_KEY = 'tilik-label:produk-saya:v1';

/**
 * Batas jumlah produk. localStorage umumnya hanya ~5 MB per situs dan satu
 * produk memuat teks label serta resep, jadi daftar dibatasi supaya
 * penyimpanan tidak penuh dan daftar tetap mudah dibaca di HP.
 */
export const MAX_SAVED_PRODUCTS = 50;

export const NAMA_PRODUK_KOSONG = 'Produk tanpa nama';

export interface SavedProduct {
  id: string;
  nama: string;
  /** Waktu pertama disimpan, format ISO. */
  dibuatPada: string;
  /** Waktu terakhir disimpan ulang, format ISO. */
  diperbaruiPada: string;
  label: LabelData;
  answers: AdditionalAnswers;
}

export interface ProductInput {
  id?: string;
  label: LabelData;
  answers: AdditionalAnswers;
}

export interface ProductSummary {
  ringkasan: LabelCheckReport['ringkasan'];
  siapCetak: boolean;
  jalurIzin: PermitPathOutcome;
  jalurIzinJudul: string;
}

const LABEL_STRING_KEYS = [
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
] as const;

const FIELD_KEYS: readonly string[] = [...LABEL_STRING_KEYS, 'pernyataanLain'];
const EQUIPMENT: readonly string[] = ['manual', 'semi_otomatis', 'otomatis'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function parseLabel(raw: unknown): LabelData | null {
  if (!isRecord(raw)) return null;
  const label: Record<string, unknown> = {};
  for (const key of LABEL_STRING_KEYS) {
    if (typeof raw[key] !== 'string') return null;
    label[key] = raw[key];
  }
  const claims = raw.pernyataanLain;
  if (!Array.isArray(claims) || !claims.every((item) => typeof item === 'string')) return null;
  label.pernyataanLain = [...(claims as string[])];

  const unreadable = raw.unreadableFields;
  if (unreadable !== undefined) {
    if (
      !Array.isArray(unreadable) ||
      !unreadable.every((k) => typeof k === 'string' && FIELD_KEYS.includes(k))
    ) {
      return null;
    }
    label.unreadableFields = [...(unreadable as LabelFieldKey[])];
  }
  return label as unknown as LabelData;
}

/** undefined = bentuk tidak sah; null = belum diisi. */
function nullableBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === 'boolean' ? value : undefined;
}

function parseAnswers(raw: unknown): AdditionalAnswers | null {
  if (!isRecord(raw) || !Array.isArray(raw.resep)) return null;

  const resep: RecipeIngredient[] = [];
  for (const item of raw.resep) {
    if (
      !isRecord(item) ||
      typeof item.nama !== 'string' ||
      typeof item.jumlahGram !== 'number' ||
      !Number.isFinite(item.jumlahGram)
    ) {
      return null;
    }
    resep.push({ nama: item.nama, jumlahGram: item.jumlahGram });
  }

  const umur = raw.umurSimpanHari;
  if (umur !== null && umur !== undefined && (typeof umur !== 'number' || !Number.isFinite(umur))) {
    return null;
  }

  const bergantung = nullableBoolean(raw.bergantungCaraSimpan);
  const halal = nullableBoolean(raw.punyaSertifikatHalal);
  const siapSaji = nullableBoolean(raw.panganSiapSaji);
  const rumah = nullableBoolean(raw.produksiDiRumah);
  const khusus = nullableBoolean(raw.butuhPenangananKhusus);
  const sni = nullableBoolean(raw.wajibSni);
  if (
    bergantung === undefined ||
    halal === undefined ||
    siapSaji === undefined ||
    rumah === undefined ||
    khusus === undefined ||
    sni === undefined
  ) {
    return null;
  }

  const alat = raw.alatProduksi;
  if (alat !== undefined && alat !== null && !(typeof alat === 'string' && EQUIPMENT.includes(alat))) {
    return null;
  }

  return {
    resep,
    umurSimpanHari: typeof umur === 'number' ? umur : null,
    bergantungCaraSimpan: bergantung,
    punyaSertifikatHalal: halal,
    alatProduksi: (alat ?? null) as ProductionEquipment | null,
    panganSiapSaji: siapSaji,
    produksiDiRumah: rumah,
    butuhPenangananKhusus: khusus,
    wajibSni: sni,
  };
}

function productName(label: Pick<LabelData, 'namaProduk'>): string {
  const nama = label.namaProduk.trim();
  return nama.length > 0 ? nama : NAMA_PRODUK_KOSONG;
}

function parseProduct(raw: unknown): SavedProduct | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (!isIsoDate(raw.dibuatPada) || !isIsoDate(raw.diperbaruiPada)) return null;
  const label = parseLabel(raw.label);
  const answers = parseAnswers(raw.answers);
  if (!label || !answers) return null;
  return {
    id: raw.id,
    nama: productName(label),
    dibuatPada: raw.dibuatPada,
    diperbaruiPada: raw.diperbaruiPada,
    label,
    answers,
  };
}

/** Terbaru diperbarui lebih dulu. Tidak mengubah daftar asli. */
export function sortProducts(list: readonly SavedProduct[]): SavedProduct[] {
  return [...list].sort((a, b) => Date.parse(b.diperbaruiPada) - Date.parse(a.diperbaruiPada));
}

/**
 * Memvalidasi data mentah dari penyimpanan. Entri rusak dibuang, id ganda
 * hanya diambil yang pertama, dan hasilnya diurutkan serta dibatasi.
 */
export function parseProductList(raw: unknown): SavedProduct[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: SavedProduct[] = [];
  for (const item of raw) {
    const product = parseProduct(item);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    result.push(product);
  }
  return sortProducts(result).slice(0, MAX_SAVED_PRODUCTS);
}

/**
 * Menambah produk baru atau memperbarui yang beridentitas sama. Saat
 * memperbarui, `dibuatPada` dipertahankan. `product` bernilai null bila
 * produk baru ditolak karena daftar sudah penuh; daftar dikembalikan apa
 * adanya supaya tidak ada produk lama yang terhapus diam-diam.
 */
export function upsertProduct(
  list: readonly SavedProduct[],
  input: ProductInput,
  now: Date,
  makeId: () => string,
): { list: SavedProduct[]; product: SavedProduct | null } {
  const iso = now.toISOString();
  const existing = input.id ? list.find((item) => item.id === input.id) : undefined;

  if (existing) {
    const product: SavedProduct = {
      ...existing,
      nama: productName(input.label),
      diperbaruiPada: iso,
      label: input.label,
      answers: input.answers,
    };
    return {
      list: sortProducts(list.map((item) => (item.id === existing.id ? product : item))),
      product,
    };
  }

  if (list.length >= MAX_SAVED_PRODUCTS) {
    return { list: sortProducts(list), product: null };
  }

  const product: SavedProduct = {
    id: input.id ?? makeId(),
    nama: productName(input.label),
    dibuatPada: iso,
    diperbaruiPada: iso,
    label: input.label,
    answers: input.answers,
  };
  return { list: sortProducts([...list, product]), product };
}

export function removeProduct(list: readonly SavedProduct[], id: string): SavedProduct[] {
  return list.filter((item) => item.id !== id);
}

/** Menghitung ulang status dengan aturan terbaru dari masukan mentah. */
export function summarizeProduct(product: SavedProduct): ProductSummary {
  const report = evaluateLabelRules(product.label, product.answers);
  const permit = evaluatePermitPath(product.label, product.answers);
  return {
    ringkasan: report.ringkasan,
    siapCetak: report.siapCetak,
    jalurIzin: permit.hasil,
    jalurIzinJudul: permit.judul,
  };
}

function defaultMakeId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // jatuh ke cadangan di bawah
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Fungsi akses penyimpanan ---------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Berlangganan perubahan daftar (tab ini dan tab lain). Untuk useSyncExternalStore. */
export function subscribeProducts(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PRODUK_SAYA_KEY) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** Penanda snapshot saat penyimpanan tidak tersedia. */
export const STORAGE_UNAVAILABLE_SNAPSHOT = '\u0000tidak-tersedia';

/** Snapshot teks mentah (stabil bila data sama) untuk useSyncExternalStore. */
export function getProductsSnapshot(): string {
  const storage = getSafeStorage();
  if (!storage) return STORAGE_UNAVAILABLE_SNAPSHOT;
  return readRaw(PRODUK_SAYA_KEY, storage) ?? '';
}

/** Mengubah snapshot menjadi daftar produk. */
export function parseProductsSnapshot(snapshot: string): SavedProduct[] {
  if (snapshot === '' || snapshot === STORAGE_UNAVAILABLE_SNAPSHOT) return [];
  try {
    return parseProductList(JSON.parse(snapshot));
  } catch {
    return [];
  }
}

export function listProducts(storage?: StorageLike | null): SavedProduct[] {
  return readJson(PRODUK_SAYA_KEY, parseProductList, storage) ?? [];
}

export function getProduct(id: string, storage?: StorageLike | null): SavedProduct | null {
  return listProducts(storage).find((item) => item.id === id) ?? null;
}

export type SaveFailure = 'tidak_tersedia' | 'batas_penuh' | 'gagal_tulis';

export type SaveResult = { ok: true; product: SavedProduct } | { ok: false; reason: SaveFailure };

/** Seperti `saveProduct`, tetapi menyebut alasan bila gagal. */
export function saveProductResult(
  input: ProductInput,
  storage?: StorageLike | null,
  now: Date = new Date(),
  makeId: () => string = defaultMakeId,
): SaveResult {
  const target = storage === undefined ? getSafeStorage() : storage;
  if (!target) return { ok: false, reason: 'tidak_tersedia' };
  const { list, product } = upsertProduct(listProducts(target), input, now, makeId);
  if (!product) return { ok: false, reason: 'batas_penuh' };
  if (!writeJson(PRODUK_SAYA_KEY, list, target)) return { ok: false, reason: 'gagal_tulis' };
  notify();
  return { ok: true, product };
}

/** Menyimpan produk; null bila gagal (penyimpanan tidak ada, penuh, atau batas jumlah tercapai). */
export function saveProduct(input: ProductInput, storage?: StorageLike | null): SavedProduct | null {
  const result = saveProductResult(input, storage);
  return result.ok ? result.product : null;
}

export function deleteProduct(id: string, storage?: StorageLike | null): boolean {
  const target = storage === undefined ? getSafeStorage() : storage;
  if (!target) return false;
  const current = listProducts(target);
  if (!current.some((item) => item.id === id)) return false;
  const ok = writeJson(PRODUK_SAYA_KEY, removeProduct(current, id), target);
  if (ok) notify();
  return ok;
}
