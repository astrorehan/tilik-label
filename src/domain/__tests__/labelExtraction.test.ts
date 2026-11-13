import { describe, expect, it } from 'vitest';
import {
  EXTRACTION_JSON_SCHEMA,
  EXTRACTION_TEXT_FIELDS,
  parseModelJson,
  validateExtraction,
} from '../labelExtraction';

function makeRaw(overrides: Record<string, { status: string; teks: string }> = {}) {
  const butir = Object.fromEntries(
    EXTRACTION_TEXT_FIELDS.map((field) => [field, { status: 'tidak_ada', teks: '' }]),
  ) as Record<string, { status: string; teks: string }>;
  return {
    butir: { ...butir, ...overrides },
    pernyataanLain: { status: 'terbaca', daftar: ['Tanpa pengawet', '  '] },
    bukanLabelPangan: false,
  };
}

describe('EXTRACTION_JSON_SCHEMA', () => {
  it('mewajibkan semua butir dan menolak properti tambahan', () => {
    expect(EXTRACTION_JSON_SCHEMA.additionalProperties).toBe(false);
    expect(EXTRACTION_JSON_SCHEMA.properties.butir.required).toEqual(EXTRACTION_TEXT_FIELDS);
    expect(Object.keys(EXTRACTION_JSON_SCHEMA.properties.butir.properties)).toHaveLength(12);
  });
});

describe('parseModelJson', () => {
  it('membaca JSON polos dan JSON dalam blok kode', () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('teks bukan JSON menghasilkan undefined', () => {
    expect(parseModelJson('Maaf, saya tidak bisa membaca.')).toBeUndefined();
  });
});

describe('validateExtraction', () => {
  it('butir terbaca masuk ke LabelData, spasi dirapikan', () => {
    const result = validateExtraction(
      makeRaw({ namaProduk: { status: 'terbaca', teks: '  Keripik   Pisang ' } }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.label.namaProduk).toBe('Keripik Pisang');
    expect(result.label.pernyataanLain).toEqual(['Tanpa pengawet']);
    expect(result.tidakTerbaca).toEqual([]);
  });

  it('butir tidak terbaca ditandai, bukan dikosongkan diam-diam', () => {
    const result = validateExtraction(
      makeRaw({
        kedaluwarsaTeks: { status: 'tidak_terbaca', teks: 'Baik digunakan seb' },
        alamatProdusen: { status: 'tidak_terbaca', teks: '' },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tidakTerbaca).toEqual(['alamatProdusen', 'kedaluwarsaTeks']);
    expect(result.label.unreadableFields).toEqual(['alamatProdusen', 'kedaluwarsaTeks']);
    expect(result.label.kedaluwarsaTeks).toBe('Baik digunakan seb');
  });

  it('butir tidak ada dikosongkan tanpa tanda tidak terbaca', () => {
    const result = validateExtraction(makeRaw({ nomorIzinTeks: { status: 'tidak_ada', teks: 'abc' } }));
    expect(result.ok && result.label.nomorIzinTeks).toBe('');
  });

  it('pernyataan lain tidak terbaca ikut ditandai', () => {
    const raw = { ...makeRaw(), pernyataanLain: { status: 'tidak_terbaca', daftar: [] } };
    const result = validateExtraction(raw);
    expect(result.ok && result.tidakTerbaca).toEqual(['pernyataanLain']);
  });

  it('menolak bukan JSON, bentuk salah, status tak dikenal, dan butir hilang', () => {
    expect(validateExtraction(undefined)).toEqual({ ok: false, alasan: 'bukan_json' });
    expect(validateExtraction([])).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });
    expect(validateExtraction({ ...makeRaw(), bukanLabelPangan: 'tidak' })).toEqual({
      ok: false,
      alasan: 'skema_tidak_sesuai',
    });
    expect(
      validateExtraction(makeRaw({ namaProduk: { status: 'mungkin', teks: 'x' } })),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });
    const missing = makeRaw();
    delete (missing.butir as Record<string, unknown>).beratBersihTeks;
    expect(validateExtraction(missing)).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });
  });

  it('menolak teks terlalu panjang dan daftar klaim berlebihan', () => {
    expect(
      validateExtraction(makeRaw({ namaProduk: { status: 'terbaca', teks: 'a'.repeat(1501) } })).ok,
    ).toBe(false);
    const raw = { ...makeRaw(), pernyataanLain: { status: 'terbaca', daftar: Array(21).fill('x') } };
    expect(validateExtraction(raw).ok).toBe(false);
    const wrongType = { ...makeRaw(), pernyataanLain: { status: 'terbaca', daftar: [1] } };
    expect(validateExtraction(wrongType).ok).toBe(false);
  });

  it('gambar bukan label pangan ditolak dengan alasan sendiri', () => {
    expect(validateExtraction({ ...makeRaw(), bukanLabelPangan: true })).toEqual({
      ok: false,
      alasan: 'bukan_label',
    });
  });
});
