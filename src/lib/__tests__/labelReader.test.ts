import { describe, expect, it, vi } from 'vitest';
import { EXTRACTION_TEXT_FIELDS } from '../../domain/labelExtraction';
import {
  parseImageDataUrl,
  providerOrder,
  readLabelImage,
  readProviderConfig,
  type FetchLike,
} from '../server/labelReader';

const JPEG_B64 = '/9j/4AAQ';
const PNG_B64 = 'iVBORw0KGgoAAAAA';
const WEBP_B64 = 'UklGRgAAAABXRUJQ';
const IMAGE = parseImageDataUrl(`data:image/jpeg;base64,${JPEG_B64}`)!;

const ENV_BOTH = {
  LLM_PROVIDER: 'deepseek',
  LLM_DEEPSEEK_API_KEY: 'kunci-uji-ds',
  LLM_HAIKU_API_KEY: 'kunci-uji-hk',
};

function extractionJson(nama = 'Keripik Uji') {
  return JSON.stringify({
    butir: Object.fromEntries(
      EXTRACTION_TEXT_FIELDS.map((field) => [
        field,
        field === 'namaProduk' ? { status: 'terbaca', teks: nama } : { status: 'tidak_ada', teks: '' },
      ]),
    ),
    pernyataanLain: { status: 'tidak_ada', daftar: [] },
    bukanLabelPangan: false,
  });
}

function deepseekResponse(content: string, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }] }),
    { status, headers: { 'content-type': 'application/json' } },
  );
}

function anthropicResponse(text: string, stopReason = 'end_turn') {
  return new Response(
    JSON.stringify({
      id: 'msg_uji',
      type: 'message',
      role: 'assistant',
      model: 'claude-haiku-5-5',
      content: [{ type: 'text', text }],
      stop_reason: stopReason,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

/** Tiruan fetch yang menjawab per penyedia berdasarkan URL. */
function routedFetch(handlers: {
  deepseek?: () => Response | Promise<Response>;
  haiku?: () => Response | Promise<Response>;
}) {
  return vi.fn<FetchLike>(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('deepseek')) {
      if (!handlers.deepseek) throw new Error('tidak diharapkan');
      return handlers.deepseek();
    }
    if (!handlers.haiku) throw new Error('tidak diharapkan');
    return handlers.haiku();
  });
}

describe('konfigurasi penyedia', () => {
  it('membaca kunci, alamat, dan model dari environment dengan nilai bawaan', () => {
    expect(readProviderConfig('deepseek', { LLM_DEEPSEEK_API_KEY: ' k ' })).toEqual({
      id: 'deepseek',
      apiKey: 'k',
      baseUrl: 'https://api.deepseek.com',
      model: 'deepseek-flash',
    });
    expect(
      readProviderConfig('haiku', {
        LLM_HAIKU_API_KEY: 'k',
        LLM_HAIKU_BASE_URL: 'https://contoh.test/',
        LLM_HAIKU_MODEL: 'claude-haiku-5-5',
      }),
    ).toEqual({ id: 'haiku', apiKey: 'k', baseUrl: 'https://contoh.test', model: 'claude-haiku-5-5' });
  });

  it('kunci kosong berarti penyedia tidak aktif', () => {
    expect(readProviderConfig('haiku', { LLM_HAIKU_API_KEY: '  ' })).toBeNull();
  });

  it('urutan penyedia mengikuti LLM_PROVIDER, bawaan deepseek', () => {
    expect(providerOrder({})).toEqual(['deepseek', 'haiku']);
    expect(providerOrder({ LLM_PROVIDER: 'haiku' })).toEqual(['haiku', 'deepseek']);
    expect(providerOrder({ LLM_PROVIDER: 'lain' })).toEqual(['deepseek', 'haiku']);
  });
});

describe('parseImageDataUrl', () => {
  it('menerima JPEG, PNG, WebP base64', () => {
    expect(parseImageDataUrl(`data:image/jpeg;base64,${JPEG_B64}`)?.mediaType).toBe('image/jpeg');
    expect(parseImageDataUrl(`data:image/png;base64,${PNG_B64}`)?.mediaType).toBe('image/png');
    expect(parseImageDataUrl(`data:image/webp;base64,${WEBP_B64}`)?.mediaType).toBe('image/webp');
  });

  it('menolak magic byte yang tidak cocok dengan jenisnya', () => {
    expect(parseImageDataUrl(`data:image/png;base64,${JPEG_B64}`)).toBeNull();
    expect(parseImageDataUrl(`data:image/jpeg;base64,${WEBP_B64}`)).toBeNull();
    expect(parseImageDataUrl(`data:image/webp;base64,${PNG_B64}`)).toBeNull();
    expect(parseImageDataUrl('data:image/jpeg;base64,AAAA')).toBeNull();
  });

  it('menolak panjang base64 bukan kelipatan 4', () => {
    expect(parseImageDataUrl(`data:image/jpeg;base64,${JPEG_B64.slice(0, 7)}`)).toBeNull();
  });

  it('menolak jenis lain, bukan base64, dan bukan teks', () => {
    expect(parseImageDataUrl('data:image/gif;base64,AAAA')).toBeNull();
    expect(parseImageDataUrl('data:image/jpeg,teks')).toBeNull();
    expect(parseImageDataUrl(42)).toBeNull();
    expect(parseImageDataUrl(`data:image/jpeg;base64,${'A'.repeat(6_000_001)}`)).toBeNull();
  });
});

describe('readLabelImage', () => {
  it('penyedia utama deepseek berhasil: mengembalikan label tervalidasi', async () => {
    const fetchImpl = routedFetch({ deepseek: () => deepseekResponse(extractionJson()) });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.penyedia).toBe('deepseek');
    expect(result.label.namaProduk).toBe('Keripik Uji');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('deepseek-flash');
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[1].content[1].image_url.url).toBe(IMAGE.dataUrl);
  });

  it('penyedia haiku dipanggil lewat API Anthropic dengan keluaran terstruktur', async () => {
    const fetchImpl = routedFetch({ haiku: () => anthropicResponse(extractionJson('Kue Uji')) });
    const result = await readLabelImage(IMAGE, {
      env: { ...ENV_BOTH, LLM_PROVIDER: 'haiku' },
      fetchImpl,
    });
    expect(result.ok && result.penyedia).toBe('haiku');
    expect(result.ok && result.label.namaProduk).toBe('Kue Uji');
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://api.anthropic.com/v1/messages');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.messages[0].content[0]).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: JPEG_B64 },
    });
  });

  it('penyedia utama galat: penyedia satunya dicoba', async () => {
    const fetchImpl = routedFetch({
      deepseek: () => new Response('{}', { status: 503 }),
      haiku: () => anthropicResponse(extractionJson()),
    });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok && result.penyedia).toBe('haiku');
    expect(result.percobaan.map((a) => a.status)).toEqual(['galat', 'berhasil']);
  });

  it('kunci penyedia utama kosong: langsung ke penyedia satunya', async () => {
    const fetchImpl = routedFetch({ haiku: () => anthropicResponse(extractionJson()) });
    const result = await readLabelImage(IMAGE, {
      env: { LLM_HAIKU_API_KEY: 'kunci-uji-hk' },
      fetchImpl,
    });
    expect(result.ok && result.penyedia).toBe('haiku');
    expect(result.percobaan[0]).toEqual({ penyedia: 'deepseek', status: 'tanpa_kunci', durasiMs: 0 });
  });

  it('keluaran tidak sesuai skema ditolak, lalu penyedia satunya dicoba', async () => {
    const fetchImpl = routedFetch({
      deepseek: () => deepseekResponse('{"namaProduk":"tanpa skema"}'),
      haiku: () => anthropicResponse('bukan json'),
    });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.percobaan.map((a) => a.status)).toEqual(['ditolak_skema', 'ditolak_skema']);
    expect(result.pesan).toMatch(/isi keterangan label sendiri/);
  });

  it('gambar bukan label: berhenti tanpa mencoba penyedia lain', async () => {
    const raw = JSON.parse(extractionJson());
    const fetchImpl = routedFetch({
      deepseek: () => deepseekResponse(JSON.stringify({ ...raw, bukanLabelPangan: true })),
    });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(!result.ok && result.pesan).toMatch(/tidak tampak seperti label/);
  });

  it('penolakan dari haiku (refusal) dianggap gagal', async () => {
    const fetchImpl = routedFetch({ haiku: () => anthropicResponse('', 'refusal') });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl, onlyProvider: 'haiku' });
    expect(result.ok).toBe(false);
    expect(result.percobaan).toHaveLength(1);
  });

  it('waktu habis ditandai dan tidak menggantung', async () => {
    const fetchImpl = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('dibatalkan')));
        }),
    );
    const result = await readLabelImage(IMAGE, {
      env: { LLM_DEEPSEEK_API_KEY: 'kunci-uji-ds' },
      fetchImpl,
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.percobaan[0]?.status).toBe('waktu_habis');
  });

  it('tanpa kunci sama sekali: pesan pembaca belum diaktifkan, tanpa panggilan jaringan', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const result = await readLabelImage(IMAGE, { env: {}, fetchImpl });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.pesan).toMatch(/belum diaktifkan/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('kunci tidak pernah muncul di hasil', async () => {
    const fetchImpl = routedFetch({ deepseek: () => new Response('{}', { status: 401 }), haiku: () => new Response('{}', { status: 401 }) });
    const result = await readLabelImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(JSON.stringify(result)).not.toMatch(/kunci-uji/);
  });
});
