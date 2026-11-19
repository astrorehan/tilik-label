import { describe, expect, it } from 'vitest';
import { SAMPLE_LABEL_CASES } from '../../domain/sampleLabels';
import {
  DEFAULT_PROTOCOL_VERSION,
  DISCLAIMER_TEXT,
  MCP_RESOURCES,
  MCP_SERVER_INFO,
  MCP_TOOLS,
  handleMcpMessage,
  handleMcpPayload,
} from '../server/mcpServer';

describe('mcpServer JSON-RPC lifecycle', () => {
  it('merespons initialize dengan versi protokol, kapabilitas, dan instruksi', () => {
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'uji', version: '1' } },
    });
    expect(res).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: MCP_SERVER_INFO,
        capabilities: { tools: {}, resources: {} },
      },
    });
  });

  it('memakai versi bawaan bila versi klien tidak dikenal', () => {
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'initialize',
      params: { protocolVersion: '2099-01-01' },
    });
    expect((res?.result as { protocolVersion: string }).protocolVersion).toBe(DEFAULT_PROTOCOL_VERSION);
  });

  it('mengembalikan null untuk notifications/initialized dan status 202 di payload', () => {
    const note = { jsonrpc: '2.0', method: 'notifications/initialized' };
    expect(handleMcpMessage(note)).toBeNull();
    expect(handleMcpPayload(note)).toEqual({ status: 202 });
  });

  it('menjawab ping dan menolak metode tidak dikenal', () => {
    expect(handleMcpMessage({ jsonrpc: '2.0', id: 'p', method: 'ping' })).toEqual({
      jsonrpc: '2.0',
      id: 'p',
      result: {},
    });
    expect(handleMcpMessage({ jsonrpc: '2.0', id: 3, method: 'unknown/method' })).toMatchObject({
      jsonrpc: '2.0',
      id: 3,
      error: { code: -32601 },
    });
  });
});

describe('mcpServer tools & resources', () => {
  it('mendaftarkan semua tool deterministik dengan anotasi readOnly', () => {
    const res = handleMcpMessage({ jsonrpc: '2.0', id: 10, method: 'tools/list' });
    const tools = (res?.result as { tools: typeof MCP_TOOLS }).tools;
    expect(tools.map((t) => t.name)).toEqual([
      'periksa_label',
      'susun_label_perbaikan',
      'cek_alergen_komposisi',
      'daftar_aturan_bpom',
    ]);
    expect(tools.every((t) => t.annotations.readOnlyHint && t.annotations.idempotentHint)).toBe(true);
  });

  it('periksa_label menangkap kesalahan urutan bahan, alergen, dan klaim pada kemasan contoh', () => {
    const sample = SAMPLE_LABEL_CASES[0]!;
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'periksa_label',
        arguments: { label: sample.label, answers: sample.answers },
      },
    });
    const result = res?.result as {
      isError?: boolean;
      structuredContent: {
        penafian: string;
        skor: { total: number; sekarang: number; denganPerbaikan: number };
        alergenTerdeteksi: string[];
        temuan: { perluKeputusan: Array<{ id: string }>; dibetulkanOtomatis: Array<{ id: string }> };
      };
    };
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.penafian).toBe(DISCLAIMER_TEXT);
    expect(result.structuredContent.skor.total).toBe(20);
    expect(result.structuredContent.alergenTerdeteksi.length).toBeGreaterThan(0);
    const allBadIds = [
      ...result.structuredContent.temuan.perluKeputusan,
      ...result.structuredContent.temuan.dibetulkanOtomatis,
    ].map((item) => item.id);
    expect(allBadIds).toContain('L-03');
    expect(allBadIds).toContain('L-12');
    expect(allBadIds).toContain('L-18');
  });

  it('periksa_label mengembalikan pertanyaanBelumDijawab bila fakta produksi belum diberikan', () => {
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'periksa_label',
        arguments: { label: { namaProduk: 'Keripik Pisang' } },
      },
    });
    const content = (res?.result as { structuredContent: { pertanyaanBelumDijawab: Array<{ id: string }> } })
      .structuredContent;
    expect(content.pertanyaanBelumDijawab.map((q) => q.id)).toEqual([
      'resep',
      'umurSimpan',
      'caraSimpan',
      'sertifikatHalal',
      'alatProduksi',
    ]);
  });

  it('susun_label_perbaikan mengembalikan teks perbaikan, alergen berformat tebal, dan cek skala cetak', () => {
    const sample = SAMPLE_LABEL_CASES[0]!;
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'susun_label_perbaikan',
        arguments: {
          label: sample.label,
          answers: sample.answers,
          ukuranStikerMm: { lebarMm: 100, tinggiMm: 80 },
        },
      },
    });
    const data = (res?.result as {
      structuredContent: {
        siapUnduh: boolean;
        daftarBahanBerformat: string;
        skalaCetak: { dimensi: { lebarMm: number; tinggiMm: number }; tinggiDibutuhkanMm: number };
      };
    }).structuredContent;
    expect(data.siapUnduh).toBe(true);
    expect(data.daftarBahanBerformat).toContain('**tepung terigu**');
    expect(data.skalaCetak.dimensi).toEqual({ lebarMm: 100, tinggiMm: 80 });
    expect(data.skalaCetak.tinggiDibutuhkanMm).toBeGreaterThan(0);
  });

  it('cek_alergen_komposisi mendeteksi alergen Pasal 49 dan memberi tanda tebal Pasal 51', () => {
    const res = handleMcpMessage({
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'cek_alergen_komposisi',
        arguments: { daftarBahanTeks: 'Komposisi: tepung terigu, gula pasir, kacang tanah, garam.' },
      },
    });
    const data = (res?.result as {
      structuredContent: {
        wajibPeringatanAlergen: boolean;
        kalimatPeringatanResmi: string;
        daftarBahanBerformat: string;
      };
    }).structuredContent;
    expect(data.wajibPeringatanAlergen).toBe(true);
    expect(data.kalimatPeringatanResmi).toMatch(/Mengandung alergen/i);
    expect(data.daftarBahanBerformat).toContain('**tepung terigu**');
    expect(data.daftarBahanBerformat).toContain('**kacang tanah**');
  });

  it('daftar_aturan_bpom mendukung pencarian per kode aturan dan menolak kode palsu', () => {
    const found = handleMcpMessage({
      jsonrpc: '2.0',
      id: 15,
      method: 'tools/call',
      params: { name: 'daftar_aturan_bpom', arguments: { kodeAturan: 'l-12' } },
    });
    const data = (found?.result as { structuredContent: { aturan: { id: string; rujukan: { pasal: string } } } })
      .structuredContent;
    expect(data.aturan.id).toBe('L-12');
    expect(data.aturan.rujukan.pasal).toContain('49');

    const missing = handleMcpMessage({
      jsonrpc: '2.0',
      id: 16,
      method: 'tools/call',
      params: { name: 'daftar_aturan_bpom', arguments: { kodeAturan: 'Z-99' } },
    });
    expect((missing?.result as { isError?: boolean }).isError).toBe(true);
  });

  it('resources/list dan resources/read memaparkan katalog, batasan, dan contoh', () => {
    const list = handleMcpMessage({ jsonrpc: '2.0', id: 20, method: 'resources/list' });
    expect((list?.result as { resources: typeof MCP_RESOURCES }).resources).toHaveLength(3);

    for (const resource of MCP_RESOURCES) {
      const read = handleMcpMessage({
        jsonrpc: '2.0',
        id: 21,
        method: 'resources/read',
        params: { uri: resource.uri },
      });
      const contents = (read?.result as { contents: Array<{ uri: string; text: string }> }).contents;
      expect(contents[0]?.uri).toBe(resource.uri);
      expect(() => JSON.parse(contents[0]!.text)).not.toThrow();
    }

    const unknown = handleMcpMessage({
      jsonrpc: '2.0',
      id: 22,
      method: 'resources/read',
      params: { uri: 'bpom://tidak-ada' },
    });
    expect(unknown?.error?.code).toBe(-32002);
  });
});
