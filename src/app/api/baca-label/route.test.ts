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

describe('POST /api/baca-label: batas pemanggilan', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('menjawab 429 dengan pesan jelas dan Retry-After setelah batas tercapai', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const send = () =>
      POST(
        new Request('http://localhost/api/baca-label', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
          body: JSON.stringify({ gambar: 'data:image/jpeg;base64,AAAA' }),
        }),
      );
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) last = await send();
    expect(last?.status).toBe(429);
    expect(last?.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(await last?.json()).toMatchObject({ ok: false, arahan: 'isi_manual', batasTercapai: true });
  });
});

describe('POST /api/baca-label: asal permintaan', () => {
  it('menolak permintaan lintas situs dari peramban', async () => {
    const response = await POST(
      new Request('http://localhost/api/baca-label', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' },
        body: JSON.stringify({ gambar: 'data:image/jpeg;base64,AAAA' }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
