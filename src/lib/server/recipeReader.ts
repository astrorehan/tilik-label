import { parseModelJson } from '../../domain/labelExtraction';
import {
  RECIPE_EXTRACTION_FAILURE_MESSAGES,
  RECIPE_EXTRACTION_JSON_SCHEMA,
  validateRecipeExtraction,
  type ExtractedRecipeItem,
  type RecipeExtractionFailure,
} from '../../domain/recipeExtraction';
import {
  callDeepseek,
  callHaiku,
  providerOrder,
  readProviderConfig,
  type ReadLabelOptions,
  type ReaderImage,
  type ReaderProviderId,
  type VisionTask,
} from './labelReader';

/**
 * Pembaca foto buku atau catatan resep, hanya dipakai di server.
 * Memakai konfigurasi penyedia dan pengaman yang sama dengan pembaca label.
 */

export const RECIPE_READER_SYSTEM_PROMPT = [
  'Kamu adalah alat penyalin daftar bahan dari foto buku resep, catatan resep tulisan tangan, atau tangkapan layar resep masakan.',
  'Tugasmu hanya MENYALIN nama bahan dan takaran yang terlihat di foto, bukan mengarang atau menebak bahan.',
  'Aturan:',
  '- Salin semua bahan yang tercantum di bagian bahan/resep sesuai urutan tertulis. Bila resep terbagi menjadi beberapa kelompok (misalnya Bahan A, Bahan B, Bumbu halus), salin semua bahannya tanpa menyertakan judul kelompok atau langkah cara membuat.',
  '- Bersihkan tanda daftar di awal baris (seperti "-", "•", atau nomor urut), tetapi biarkan nama bahan sesuai yang tertulis.',
  '- Konversi takaran ke gram atau ml hanya bila satuannya baku dan pasti: g/gr/gram tetap, kg × 1000, mg ÷ 1000, ons × 100 (1 ons = 100 g), ml/cc tetap, L/liter × 1000. Pecahan umum seperti 1/2 kg (= 500), 1/4 kg (= 250), atau 1,5 L (= 1500) boleh dihitung langsung.',
  '- Bila satuan tidak baku atau takaran tidak pasti (misalnya sdm, sdt, sendok, butir, buah, siung, lembar, batang, gelas, bungkus, sachet, secukupnya, sejumput) atau angkanya buram/tidak tertulis, isi jumlahGram dengan null dan salin takaran aslinya di takaranAsli (misalnya "2 butir", "1 sdt", "secukupnya"). Jangan menebak berat dalam gram dari sendok atau butir.',
  '- Bila jumlahGram sudah terisi angka, isi takaranAsli dengan string kosong "".',
  '- Jangan menambahkan bahan yang tidak terlihat di foto, dan jangan memberi saran atau komentar.',
  '- Bila gambar bukan catatan resep/daftar bahan atau tulisannya sama sekali tidak terbaca, isi bukanResep dengan true dan bahan dengan daftar kosong [].',
  '',
  'Jawab hanya dengan satu objek JSON yang sesuai skema berikut, tanpa teks lain:',
  JSON.stringify(RECIPE_EXTRACTION_JSON_SCHEMA),
].join('\n');

const RECIPE_USER_PROMPT =
  'Salin daftar bahan dan takaran resep pada gambar ini ke JSON sesuai skema.';

const RECIPE_VISION_TASK: VisionTask = {
  system: RECIPE_READER_SYSTEM_PROMPT,
  user: RECIPE_USER_PROMPT,
  schema: RECIPE_EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown>,
};

export type RecipeAttemptStatus =
  | 'berhasil'
  | 'tanpa_kunci'
  | 'galat'
  | 'waktu_habis'
  | 'ditolak_skema'
  | 'bukan_resep'
  | 'kosong';

export interface RecipeReaderAttempt {
  penyedia: ReaderProviderId;
  model?: string;
  status: RecipeAttemptStatus;
  durasiMs: number;
}

export type RecipeReaderOutcome =
  | {
      ok: true;
      bahan: ExtractedRecipeItem[];
      perluLengkapi: number;
      penyedia: ReaderProviderId;
      model: string;
      durasiMs: number;
      percobaan: RecipeReaderAttempt[];
    }
  | { ok: false; pesan: string; percobaan: RecipeReaderAttempt[] };

export interface ReadRecipeOptions extends ReadLabelOptions {
  signal?: AbortSignal;
}

const CALLERS: Record<ReaderProviderId, typeof callDeepseek> = {
  deepseek: callDeepseek,
  haiku: callHaiku,
};

/**
 * Membaca daftar bahan resep dari foto memakai penyedia utama dan cadangan.
 * Keluaran selalu divalidasi skema; bila gagal, pengguna tetap bisa mengisi manual.
 */
export async function readRecipeImage(
  image: ReaderImage,
  options: ReadRecipeOptions = {},
): Promise<RecipeReaderOutcome> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 14_000;
  const order = options.onlyProvider ? [options.onlyProvider] : providerOrder(env);
  const percobaan: RecipeReaderAttempt[] = [];
  let lastFailure: RecipeExtractionFailure | null = null;

  for (const id of order) {
    if (options.signal?.aborted) break;
    const config = readProviderConfig(id, env);
    if (!config) {
      percobaan.push({ penyedia: id, status: 'tanpa_kunci', durasiMs: 0 });
      continue;
    }
    const started = now();
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;
    try {
      const text = await CALLERS[id](config, image, {
        fetchImpl: options.fetchImpl,
        signal,
        task: RECIPE_VISION_TASK,
      });
      const durasiMs = now() - started;
      const result = validateRecipeExtraction(parseModelJson(text));
      if (result.ok) {
        percobaan.push({ penyedia: id, model: config.model, status: 'berhasil', durasiMs });
        return {
          ok: true,
          bahan: result.bahan,
          perluLengkapi: result.perluLengkapi,
          penyedia: id,
          model: config.model,
          durasiMs,
          percobaan,
        };
      }
      lastFailure = result.alasan;
      percobaan.push({
        penyedia: id,
        model: config.model,
        status:
          result.alasan === 'bukan_resep'
            ? 'bukan_resep'
            : result.alasan === 'kosong'
              ? 'kosong'
              : 'ditolak_skema',
        durasiMs,
      });
      if (result.alasan === 'bukan_resep') {
        break;
      }
    } catch {
      percobaan.push({
        penyedia: id,
        model: config.model,
        status: timeoutController.signal.aborted ? 'waktu_habis' : 'galat',
        durasiMs: now() - started,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const pesan = lastFailure
    ? RECIPE_EXTRACTION_FAILURE_MESSAGES[lastFailure]
    : percobaan.length > 0 && percobaan.every((attempt) => attempt.status === 'tanpa_kunci')
      ? 'Pembaca foto belum diaktifkan di server ini. Kamu tetap bisa menulis bahannya sendiri.'
      : 'Pembaca foto resep sedang tidak bisa dipakai. Kamu tetap bisa menulis bahannya sendiri.';
  return { ok: false, pesan, percobaan };
}
