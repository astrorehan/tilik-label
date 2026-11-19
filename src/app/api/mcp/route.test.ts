import { describe, expect, it } from 'vitest';
import { GET, OPTIONS, POST } from './route';

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('POST /api/mcp', () => {
  it('melayani initialize dan tools/call tanpa memanggil jaringan', async () => {
    const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    expect(init.status).toBe(200);
    expect(init.headers.get('Cache-Control')).toBe('no-store');
    expect(init.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await init.json()).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: { serverInfo: { name: 'tilik-label' } },
    });

    const call = await post({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'cek_alergen_komposisi',
        arguments: { daftarBahanTeks: 'Komposisi: ikan tenggiri, tepung tapioka, garam.' },
      },
    });
    expect(call.status).toBe(200);
    expect(await call.json()).toMatchObject({
      jsonrpc: '2.0',
      id: 2,
      result: {
        structuredContent: {
          wajibPeringatanAlergen: true,
          alergenTerdeteksi: ['Ikan'],
        },
      },
    });
  });

  it('mengembalikan 202 untuk notifikasi JSON-RPC', async () => {
    const res = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(res.status).toBe(202);
  });

  it('mengembalikan JSON-RPC Parse error (-32700) untuk JSON rusak', async () => {
    const res = await post('{rusak');
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ jsonrpc: '2.0', error: { code: -32700 } });
  });

  it('menolak payload terlalu besar (413)', async () => {
    const res = await post({ jsonrpc: '2.0', id: 1, method: 'ping' }, { 'content-length': '999999' });
    expect(res.status).toBe(413);
  });

  it('GET mengembalikan 405 dan OPTIONS mengembalikan 204 dengan header CORS', async () => {
    const getRes = await GET();
    expect(getRes.status).toBe(405);
    expect(getRes.headers.get('Allow')).toContain('POST');

    const optRes = await OPTIONS();
    expect(optRes.status).toBe(204);
    expect(optRes.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
