import { describe, expect, it, vi } from 'vitest';
import { parseImageDataUrl, type FetchLike } from '../server/labelReader';
import { readRecipeImage } from '../server/recipeReader';

const JPEG_B64 = '/9j/4AAQ';
const IMAGE = parseImageDataUrl(`data:image/jpeg;base64,${JPEG_B64}`)!;

const ENV_BOTH = {
  LLM_PROVIDER: 'deepseek',
  LLM_DEEPSEEK_API_KEY: 'kunci-uji-ds',
  LLM_HAIKU_API_KEY: 'kunci-uji-hk',
};

function recipeJson() {
  return JSON.stringify({
    bukanResep: false,
    bahan: [
      { nama: 'Tepung terigu', jumlahGram: 500, takaranAsli: '' },
      { nama: 'Telur ayam', jumlahGram: null, takaranAsli: '2 butir' },
    ],
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
      id: 'msg_resep',
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

describe('readRecipeImage', () => {
  it('penyedia utama deepseek berhasil: mengembalikan daftar bahan tervalidasi', async () => {
    const fetchImpl = routedFetch({ deepseek: () => deepseekResponse(recipeJson()) });
    const result = await readRecipeImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.penyedia).toBe('deepseek');
    expect(result.perluLengkapi).toBe(1);
    expect(result.bahan).toEqual([
      { nama: 'Tepung terigu', jumlahGram: 500, takaranAsli: '' },
      { nama: 'Telur ayam', jumlahGram: null, takaranAsli: '2 butir' },
    ]);
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.messages[0].content).toContain('bukanResep');
    expect(body.messages[1].content[1].image_url.url).toBe(IMAGE.dataUrl);
  });

  it('penyedia utama galat: otomatis beralih ke penyedia cadangan haiku', async () => {
    const fetchImpl = routedFetch({
      deepseek: () => new Response('{}', { status: 503 }),
      haiku: () => anthropicResponse(recipeJson()),
    });
    const result = await readRecipeImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok && result.penyedia).toBe('haiku');
    expect(result.percobaan.map((attempt) => attempt.status)).toEqual(['galat', 'berhasil']);
    const body = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(body.output_config.format.schema.required).toEqual(['bukanResep', 'bahan']);
  });

  it('gambar bukan resep berhenti tanpa mencoba penyedia cadangan', async () => {
    const fetchImpl = routedFetch({
      deepseek: () => deepseekResponse(JSON.stringify({ bukanResep: true, bahan: [] })),
    });
    const result = await readRecipeImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(!result.ok && result.pesan).toMatch(/tidak tampak seperti catatan resep/);
  });

  it('keluaran tidak sesuai skema ditolak dan mencoba penyedia cadangan', async () => {
    const fetchImpl = routedFetch({
      deepseek: () => deepseekResponse('{"resep":[]}'),
      haiku: () => anthropicResponse('bukan json'),
    });
    const result = await readRecipeImage(IMAGE, { env: ENV_BOTH, fetchImpl });
    expect(result.ok).toBe(false);
    expect(result.percobaan.map((attempt) => attempt.status)).toEqual(['ditolak_skema', 'ditolak_skema']);
  });

  it('tanpa kunci sama sekali: mengembalikan pesan sopan tanpa memanggil jaringan', async () => {
    const fetchImpl = vi.fn<FetchLike>();
    const result = await readRecipeImage(IMAGE, { env: {}, fetchImpl });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.pesan).toMatch(/belum diaktifkan/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('waktu habis ditandai waktu_habis', async () => {
    const fetchImpl = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('dibatalkan')));
        }),
    );
    const result = await readRecipeImage(IMAGE, {
      env: { LLM_DEEPSEEK_API_KEY: 'kunci-uji-ds' },
      fetchImpl,
      timeoutMs: 20,
    });
    expect(result.ok).toBe(false);
    expect(result.percobaan[0]?.status).toBe('waktu_habis');
  });
});
