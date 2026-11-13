import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '@/domain';
import { POST } from './route';

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/asisten', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const VALID = { label: createEmptyLabelData(), answers: createEmptyAnswers(), ruleId: 'L-01', pertanyaanId: 'maksud' };

describe('POST /api/asisten', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('menolak badan rusak, kode aturan palsu, dan pertanyaan tidak sah', async () => {
    expect((await post('x')).status).toBe(400);
    expect((await post({ ...VALID, ruleId: 'Z-99' })).status).toBe(400);
    expect((await post({ ...VALID, pertanyaanId: 'maksud', ruleId: undefined })).status).toBe(400);
    expect((await post({ ...VALID, pertanyaanId: undefined, pertanyaanBebas: 'a'.repeat(300) })).status).toBe(400);
  });

  it('menolak permintaan lintas situs', async () => {
    expect((await post(VALID, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  });

  it('tanpa kunci: jawaban gagal yang sopan, tanpa jaringan', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const response = await post(VALID, { 'x-forwarded-for': '198.51.100.1' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('terikat batas pemanggilan per pengunjung (F-12)', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    let last: Response | undefined;
    for (let i = 0; i < 21; i++) last = await post(VALID, { 'x-forwarded-for': '198.51.100.77' });
    expect(last?.status).toBe(429);
    expect(await last?.json()).toMatchObject({ ok: false, batasTercapai: true });
  });
});

describe('POST /api/asisten: saringan cakupan', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('pertanyaan bebas di luar topik ditolak tanpa memanggil model', async () => {
    // Kunci dikosongkan supaya test tidak pernah menyentuh jaringan walau saringan gagal.
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const response = await post(
      { label: createEmptyLabelData(), answers: createEmptyAnswers(), pertanyaanBebas: 'Tulis puisi tentang laut' },
      { 'x-forwarded-for': '198.51.100.200' },
    );
    expect(await response.json()).toMatchObject({ ok: true, diLuarCakupan: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('badan terlalu besar ditolak 413', async () => {
    const response = await POST(
      new Request('http://localhost/api/asisten', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '999999' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(413);
  });
});
