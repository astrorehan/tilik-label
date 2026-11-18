import {
  cleanRecipe,
  type AdditionalAnswers,
  type LabelData,
} from '@/domain';
import { EXTRACTION_TEXT_FIELDS } from '@/domain/labelExtraction';
import {
  STORAGE_UNAVAILABLE_SNAPSHOT,
  parseAnswers,
  parseLabel,
} from './produkSaya';
import { getSafeStorage, readJson, readRaw, writeJson, type StorageLike } from './safeStorage';

/** Kunci penyimpanan draf pemeriksaan; angka versi dinaikkan bila bentuk data berubah. */
export const PERIKSA_DRAFT_KEY = 'tilik-label:draf-periksa:v1';

export const DRAFT_FLOW_STEPS = ['mulai', 'isi', 'tanya', 'hasil'] as const;
export type DraftFlowStep = (typeof DRAFT_FLOW_STEPS)[number];

/** Penanda snapshot saat penyimpanan tidak tersedia. */
export const DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT = STORAGE_UNAVAILABLE_SNAPSHOT;

export interface PeriksaDraft {
  label: LabelData;
  answers: AdditionalAnswers;
  step: DraftFlowStep;
  farthestStep: DraftFlowStep;
  /** ID produk di Produk saya bila pemeriksaan ini sudah pernah tersimpan. */
  productId?: string;
  /** Waktu draf terakhir disimpan otomatis, format ISO. */
  diperbaruiPada: string;
}

export interface PeriksaDraftInput {
  label: LabelData;
  answers: AdditionalAnswers;
  step: DraftFlowStep;
  farthestStep: DraftFlowStep;
  productId?: string;
}

export type DraftSaveFailure = 'tidak_tersedia' | 'gagal_tulis';

export type DraftSaveResult =
  | { ok: true; draft: PeriksaDraft }
  | { ok: false; reason: DraftSaveFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function isDraftFlowStep(value: unknown): value is DraftFlowStep {
  return typeof value === 'string' && (DRAFT_FLOW_STEPS as readonly string[]).includes(value);
}

function normalizeFarthestStep(step: DraftFlowStep, farthestStep: DraftFlowStep): DraftFlowStep {
  return DRAFT_FLOW_STEPS.indexOf(farthestStep) >= DRAFT_FLOW_STEPS.indexOf(step)
    ? farthestStep
    : step;
}

/** True bila ada setidaknya satu kolom teks atau pernyataan label yang sudah diisi. */
export function hasTypedLabel(label: LabelData): boolean {
  return (
    label.pernyataanLain.some((claim) => claim.trim() !== '') ||
    EXTRACTION_TEXT_FIELDS.some((field) => label[field].trim() !== '')
  );
}

/** True bila ada setidaknya satu jawaban data produk atau resep bermakna yang sudah diisi. */
export function hasMeaningfulAnswers(answers: AdditionalAnswers): boolean {
  return (
    cleanRecipe(answers.resep).length > 0 ||
    (typeof answers.umurSimpanHari === 'number' &&
      Number.isFinite(answers.umurSimpanHari) &&
      answers.umurSimpanHari > 0) ||
    answers.bergantungCaraSimpan != null ||
    answers.punyaSertifikatHalal != null ||
    answers.alatProduksi != null ||
    answers.panganSiapSaji != null ||
    answers.produksiDiRumah != null ||
    answers.butuhPenangananKhusus != null ||
    answers.wajibSni != null
  );
}

/** True bila label atau jawaban produk sudah punya isi bermakna untuk disimpan. */
export function hasMeaningfulCheckData(
  label: LabelData,
  answers: AdditionalAnswers,
): boolean {
  return hasTypedLabel(label) || hasMeaningfulAnswers(answers);
}

/** True bila draf valid dan memuat isian/jawaban yang layak dipulihkan. */
export function hasDraftContent(
  draft: Pick<PeriksaDraft, 'label' | 'answers'> | null | undefined,
): boolean {
  if (!draft) return false;
  return hasMeaningfulCheckData(draft.label, draft.answers);
}

/** Memvalidasi bentuk draf mentah dari localStorage. Null bila bentuk tidak sah. */
export function parsePeriksaDraft(raw: unknown): PeriksaDraft | null {
  if (!isRecord(raw)) return null;
  if (!isDraftFlowStep(raw.step) || !isDraftFlowStep(raw.farthestStep)) return null;
  if (!isIsoDate(raw.diperbaruiPada)) return null;

  const label = parseLabel(raw.label);
  const answers = parseAnswers(raw.answers);
  if (!label || !answers) return null;

  let productId: string | undefined;
  if (raw.productId !== undefined && raw.productId !== null) {
    if (typeof raw.productId !== 'string') return null;
    const trimmed = raw.productId.trim();
    if (trimmed.length > 0) productId = trimmed;
  }

  return {
    label,
    answers,
    step: raw.step,
    farthestStep: normalizeFarthestStep(raw.step, raw.farthestStep),
    ...(productId ? { productId } : {}),
    diperbaruiPada: raw.diperbaruiPada,
  };
}

// --- Fungsi akses penyimpanan ---------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Berlangganan perubahan draf (tab ini dan tab lain). Untuk useSyncExternalStore. */
export function subscribePeriksaDraft(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PERIKSA_DRAFT_KEY) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** Snapshot teks mentah (stabil bila data sama) untuk useSyncExternalStore. */
export function getPeriksaDraftSnapshot(): string {
  const storage = getSafeStorage();
  if (!storage) return DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT;
  return readRaw(PERIKSA_DRAFT_KEY, storage) ?? '';
}

/** Mengubah snapshot mentah menjadi draf tervalidasi, atau null. */
export function parsePeriksaDraftSnapshot(snapshot: string): PeriksaDraft | null {
  if (snapshot === '' || snapshot === DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT) return null;
  try {
    return parsePeriksaDraft(JSON.parse(snapshot));
  } catch {
    return null;
  }
}

/** Membaca draf pemeriksaan dari penyimpanan; null bila kosong, rusak, atau tidak tersedia. */
export function loadPeriksaDraft(storage?: StorageLike | null): PeriksaDraft | null {
  return readJson(PERIKSA_DRAFT_KEY, parsePeriksaDraft, storage);
}

/** Menyimpan draf pemeriksaan dan menyebut alasan bila gagal. */
export function savePeriksaDraftResult(
  input: PeriksaDraftInput,
  storage?: StorageLike | null,
  now: Date = new Date(),
): DraftSaveResult {
  const target = storage === undefined ? getSafeStorage() : storage;
  if (!target) return { ok: false, reason: 'tidak_tersedia' };

  const productId = input.productId?.trim();
  const draft: PeriksaDraft = {
    label: input.label,
    answers: input.answers,
    step: input.step,
    farthestStep: normalizeFarthestStep(input.step, input.farthestStep),
    ...(productId ? { productId } : {}),
    diperbaruiPada: now.toISOString(),
  };

  if (!writeJson(PERIKSA_DRAFT_KEY, draft, target)) {
    return { ok: false, reason: 'gagal_tulis' };
  }
  notify();
  return { ok: true, draft };
}

/** Menyimpan draf pemeriksaan; null bila penyimpanan tidak tersedia atau gagal tulis. */
export function savePeriksaDraft(
  input: PeriksaDraftInput,
  storage?: StorageLike | null,
  now: Date = new Date(),
): PeriksaDraft | null {
  const result = savePeriksaDraftResult(input, storage, now);
  return result.ok ? result.draft : null;
}

/** Menghapus draf pemeriksaan dari penyimpanan. */
export function clearPeriksaDraft(storage?: StorageLike | null): boolean {
  const target = storage === undefined ? getSafeStorage() : storage;
  if (!target) return false;
  try {
    target.removeItem(PERIKSA_DRAFT_KEY);
    notify();
    return true;
  } catch {
    return false;
  }
}
