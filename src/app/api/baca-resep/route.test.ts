import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/baca-resep', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/baca-resep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('menolak badan bukan JSON dan gambar tidak sah', async () => {
    expect((await post('bukan json')).status).toBe(400);
    expect((await post({ gambar: 'data:text/plain;base64,AAAA' })).status).toBe(400);
  });

  it('menolak permintaan lintas situs dari peramban', async () => {
    const response = await post(
      { gambar: 'data:image/jpeg;base64,/9j/4AAQ' },
      { 'sec-fetch-site': 'cross-site' },
    );
    expect(response.status).toBe(403);
  });

  it('menolak badan terlalu besar walau tanpa content-length', async () => {
    const big = new Uint8Array(7_000_000).fill(65);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(big);
        controller.close();
      },
    });
    const request = new Request('http://localhost/api/baca-resep', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    request.headers.delete('content-length');
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('tanpa kunci penyedia: arahkan isi manual tanpa memanggil jaringan', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const response = await post(
      { gambar: 'data:image/jpeg;base64,/9j/4AAQ' },
      { 'x-forwarded-for': '203.0.113.41' },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false, arahan: 'isi_manual' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('mengembalikan daftar bahan tervalidasi saat penyedia berhasil', async () => {
    vi.stubEnv('LLM_PROVIDER', 'deepseek');
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', 'kunci-uji');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                bukanResep: false,
                bahan: [
                  { nama: 'Cabai merah', jumlahGram: 200, takaranAsli: '' },
                  { nama: 'Garam', jumlahGram: null, takaranAsli: '1 sdt' },
                ],
              }),
            },
            finish_reason: 'stop',
          },
        ],
      }),
    );
    const response = await post(
      { gambar: 'data:image/jpeg;base64,/9j/4AAQ' },
      { 'x-forwarded-for': '203.0.113.42' },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toMatchObject({
      ok: true,
      perluLengkapi: 1,
      bahan: [
        { nama: 'Cabai merah', jumlahGram: 200, takaranAsli: '' },
        { nama: 'Garam', jumlahGram: null, takaranAsli: '1 sdt' },
      ],
    });
  });

  it('terikat batas pemanggilan foto per pengunjung (F-12)', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    let last: Response | undefined;
    for (let i = 0; i < 11; i++) {
      last = await post(
        { gambar: 'data:image/jpeg;base64,/9j/4AAQ' },
        { 'x-forwarded-for': '203.0.113.43' },
      );
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(await last?.json()).toMatchObject({ ok: false, arahan: 'isi_manual', batasTercapai: true });
  });
});
