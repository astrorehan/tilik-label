import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/baca-label', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/baca-label', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('menolak badan bukan JSON', async () => {
    const response = await post('bukan json');
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, arahan: 'isi_manual' });
  });

  it('menolak gambar tidak sah', async () => {
    const response = await post({ gambar: 'data:text/plain;base64,AAAA' });
    expect(response.status).toBe(400);
  });

  it('tanpa kunci penyedia: arahkan isi manual tanpa memanggil jaringan', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await post({ gambar: 'data:image/jpeg;base64,AAAA' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false, arahan: 'isi_manual' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
