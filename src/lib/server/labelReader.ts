import Anthropic from '@anthropic-ai/sdk';
import {
  EXTRACTION_FAILURE_MESSAGES,
  EXTRACTION_FIELD_DESCRIPTIONS,
  EXTRACTION_JSON_SCHEMA,
  parseModelJson,
  validateExtraction,
  type ExtractionResult,
} from '../../domain/labelExtraction';
import type { LabelData, LabelFieldKey } from '../../domain/types';

/**
 * Pembaca label dari foto (F-03), hanya dipakai di server.
 * Kunci API dibaca dari environment variable server dan tidak pernah dikirim ke peramban.
 */

export type ReaderProviderId = 'deepseek' | 'haiku';

export interface ReaderProviderConfig {
  id: ReaderProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

type Env = Record<string, string | undefined>;

const DEFAULTS: Record<ReaderProviderId, { baseUrl: string; model: string }> = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-flash' },
  haiku: { baseUrl: 'https://api.anthropic.com', model: 'claude-haiku-5-5' },
};

const ENV_NAMES: Record<ReaderProviderId, { key: string; baseUrl: string; model: string }> = {
  deepseek: {
    key: 'LLM_DEEPSEEK_API_KEY',
    baseUrl: 'LLM_DEEPSEEK_BASE_URL',
    model: 'LLM_DEEPSEEK_MODEL',
  },
  haiku: { key: 'LLM_HAIKU_API_KEY', baseUrl: 'LLM_HAIKU_BASE_URL', model: 'LLM_HAIKU_MODEL' },
};

/** Konfigurasi satu penyedia, atau null bila kuncinya kosong. */
export function readProviderConfig(id: ReaderProviderId, env: Env): ReaderProviderConfig | null {
  const names = ENV_NAMES[id];
  const apiKey = env[names.key]?.trim();
  if (!apiKey) {
    return null;
  }
  return {
    id,
    apiKey,
    baseUrl: (env[names.baseUrl]?.trim() || DEFAULTS[id].baseUrl).replace(/\/+$/, ''),
    model: env[names.model]?.trim() || DEFAULTS[id].model,
  };
}

/** Urutan penyedia: penyedia utama dari LLM_PROVIDER (bawaan deepseek), lalu penyedia satunya. */
export function providerOrder(env: Env): ReaderProviderId[] {
  const primary: ReaderProviderId = env.LLM_PROVIDER?.trim() === 'haiku' ? 'haiku' : 'deepseek';
  return primary === 'deepseek' ? ['deepseek', 'haiku'] : ['haiku', 'deepseek'];
}

export const READER_SYSTEM_PROMPT = [
  'Kamu adalah alat penyalin isi label kemasan pangan dari foto. Tugasmu hanya MENYALIN tulisan yang terlihat di label, bukan menilai label.',
  'Aturan:',
  '- Salin teks persis seperti tertulis: ejaan, singkatan, huruf besar-kecil, tanda baca, dan urutan bahan tidak boleh dibetulkan, karena kesalahan penulisan justru yang akan diperiksa.',
  '- Jangan menebak atau melengkapi tulisan yang tidak terlihat. Bila butir tidak ada di label, beri status "tidak_ada" dan teks kosong. Bila butir tampak ada tetapi buram, terpotong, atau tertutup, beri status "tidak_terbaca" dan salin bagian yang terbaca saja.',
  '- Jangan memberi pendapat, saran, atau penilaian apa pun.',
  '- Bila gambar bukan label kemasan pangan atau sama sekali tidak terbaca, isi bukanLabelPangan dengan true.',
  '',
  'Butir yang disalin:',
  ...Object.entries(EXTRACTION_FIELD_DESCRIPTIONS).map(([key, text]) => `- ${key}: ${text}`),
  '',
  'Jawab hanya dengan satu objek JSON yang sesuai skema berikut, tanpa teks lain:',
  JSON.stringify(EXTRACTION_JSON_SCHEMA),
].join('\n');

const USER_PROMPT = 'Salin isi label kemasan pada gambar ini ke JSON sesuai skema.';

export interface ReaderImage {
  /** Data URL gambar (data:image/jpeg;base64,...). */
  dataUrl: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
}

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/;

/** Batas ukuran data URL (karakter). Gambar sudah dikecilkan di perangkat, jadi biasanya jauh di bawah ini. */
export const MAX_IMAGE_DATA_URL_LENGTH = 6_000_000;

export function parseImageDataUrl(value: unknown): ReaderImage | null {
  if (typeof value !== 'string' || value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return null;
  }
  const match = value.match(DATA_URL_PATTERN);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  const mediaType = match[1] as ReaderImage['mediaType'];
  const base64 = match[2];
  if (base64.length % 4 !== 0 || !hasMagicBytes(mediaType, base64)) {
    return null;
  }
  return { dataUrl: value, mediaType, base64 };
}

/** Memeriksa byte awal gambar sesuai jenisnya (JPEG, PNG, WebP). */
function hasMagicBytes(mediaType: ReaderImage['mediaType'], base64: string): boolean {
  const head = Buffer.from(base64.slice(0, 16), 'base64');
  if (mediaType === 'image/jpeg') {
    return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (mediaType === 'image/png') {
    return head.length >= 4 && head[0] === 0x89 && head.toString('latin1', 1, 4) === 'PNG';
  }
  return (
    head.length >= 12 &&
    head.toString('latin1', 0, 4) === 'RIFF' &&
    head.toString('latin1', 8, 12) === 'WEBP'
  );
}

export type FetchLike = typeof fetch;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: 'jaringan' | 'status' | 'ditolak' | 'kosong',
  ) {
    super(message);
  }
}

/** Memanggil DeepSeek lewat API chat completions (mode non-thinking, keluaran JSON). */
export async function callDeepseek(
  config: ReaderProviderConfig,
  image: ReaderImage,
  options: { fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: READER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: image.dataUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 4000,
        stream: false,
      }),
      signal: options.signal,
    });
  } catch {
    throw new ProviderError('Gagal menghubungi penyedia.', 'jaringan');
  }
  if (!response.ok) {
    throw new ProviderError(`Penyedia menjawab status ${response.status}.`, 'status');
  }
  const data = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }>;
  } | null;
  const choice = data?.choices?.[0];
  if (choice?.finish_reason === 'content_filter') {
    throw new ProviderError('Penyedia menolak permintaan.', 'ditolak');
  }
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new ProviderError('Penyedia tidak mengembalikan isi.', 'kosong');
  }
  return content;
}

/** Memanggil Claude Haiku lewat API Anthropic dengan keluaran terstruktur. */
export async function callHaiku(
  config: ReaderProviderConfig,
  image: ReaderImage,
  options: { fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    authToken: null,
    baseURL: config.baseUrl,
    maxRetries: 0,
    ...(options.fetchImpl ? { fetch: options.fetchImpl } : {}),
  });
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(
      {
        model: config.model,
        max_tokens: 4000,
        system: [
          { type: 'text', text: READER_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        thinking: { type: 'disabled' },
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown> },
        },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      },
      { signal: options.signal },
    );
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ProviderError('Gagal menghubungi penyedia.', 'jaringan');
    }
    if (error instanceof Anthropic.APIError) {
      throw new ProviderError(`Penyedia menjawab status ${error.status ?? 'tidak diketahui'}.`, 'status');
    }
    throw new ProviderError('Gagal menghubungi penyedia.', 'jaringan');
  }
  if (message.stop_reason === 'refusal') {
    throw new ProviderError('Penyedia menolak permintaan.', 'ditolak');
  }
  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
  if (!text.trim()) {
    throw new ProviderError('Penyedia tidak mengembalikan isi.', 'kosong');
  }
  return text;
}

export type AttemptStatus =
  | 'berhasil'
  | 'tanpa_kunci'
  | 'galat'
  | 'waktu_habis'
  | 'ditolak_skema'
  | 'bukan_label';

export interface ReaderAttempt {
  penyedia: ReaderProviderId;
  model?: string;
  status: AttemptStatus;
  durasiMs: number;
}

export type ReaderOutcome =
  | {
      ok: true;
      label: LabelData;
      tidakTerbaca: LabelFieldKey[];
      penyedia: ReaderProviderId;
      model: string;
      durasiMs: number;
      percobaan: ReaderAttempt[];
    }
  | { ok: false; pesan: string; percobaan: ReaderAttempt[] };

export interface ReadLabelOptions {
  env?: Env;
  fetchImpl?: FetchLike;
  /** Batas waktu per penyedia (ms). */
  timeoutMs?: number;
  /** Batasi ke satu penyedia saja (dipakai skrip pembanding). */
  onlyProvider?: ReaderProviderId;
  now?: () => number;
}

const CALLERS: Record<ReaderProviderId, typeof callDeepseek> = {
  deepseek: callDeepseek,
  haiku: callHaiku,
};

/**
 * Membaca label dengan penyedia utama. Bila penyedia utama gagal atau kuncinya kosong,
 * penyedia satunya dicoba. Keluaran selalu divalidasi skema; bila semua gagal,
 * pengguna diarahkan mengisi sendiri.
 */
export async function readLabelImage(
  image: ReaderImage,
  options: ReadLabelOptions = {},
): Promise<ReaderOutcome> {
  const env = options.env ?? process.env;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 14_000;
  const order = options.onlyProvider ? [options.onlyProvider] : providerOrder(env);
  const percobaan: ReaderAttempt[] = [];
  let lastFailure: Extract<ExtractionResult, { ok: false }>['alasan'] | null = null;

  for (const id of order) {
    const config = readProviderConfig(id, env);
    if (!config) {
      percobaan.push({ penyedia: id, status: 'tanpa_kunci', durasiMs: 0 });
      continue;
    }
    const started = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const text = await CALLERS[id](config, image, {
        fetchImpl: options.fetchImpl,
        signal: controller.signal,
      });
      const durasiMs = now() - started;
      const result = validateExtraction(parseModelJson(text));
      if (result.ok) {
        percobaan.push({ penyedia: id, model: config.model, status: 'berhasil', durasiMs });
        return {
          ok: true,
          label: result.label,
          tidakTerbaca: result.tidakTerbaca,
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
        status: result.alasan === 'bukan_label' ? 'bukan_label' : 'ditolak_skema',
        durasiMs,
      });
      if (result.alasan === 'bukan_label') {
        // Sifat gambarnya, bukan galat penyedia: tidak perlu mencoba penyedia lain.
        break;
      }
    } catch {
      percobaan.push({
        penyedia: id,
        model: config.model,
        status: controller.signal.aborted ? 'waktu_habis' : 'galat',
        durasiMs: now() - started,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  const pesan = lastFailure
    ? EXTRACTION_FAILURE_MESSAGES[lastFailure]
    : percobaan.every((attempt) => attempt.status === 'tanpa_kunci')
      ? 'Pembaca foto belum diaktifkan di server ini. Silakan isi keterangan label sendiri.'
      : 'Pembaca foto sedang tidak bisa dipakai. Silakan isi keterangan label sendiri.';
  return { ok: false, pesan, percobaan };
}
