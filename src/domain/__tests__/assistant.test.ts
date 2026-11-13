import { describe, expect, it } from 'vitest';
import {
  QUICK_QUESTIONS,
  buildLockedContext,
  buildReferenceMaterial,
  findUnknownArticles,
  isKnownRuleId,
  resolveQuestion,
  sanitizeCheckInput,
} from '../assistant';
import { createEmptyAnswers, createEmptyLabelData } from '../labelRules';

describe('sanitizeCheckInput', () => {
  it('menolak bentuk yang bukan objek', () => {
    expect(sanitizeCheckInput(null, {})).toBeNull();
    expect(sanitizeCheckInput({}, [])).toBeNull();
  });

  it('mengisi nilai kosong untuk tipe yang salah dan memotong teks panjang', () => {
    const result = sanitizeCheckInput(
      { namaProduk: 'a'.repeat(5000), daftarBahanTeks: 42, pernyataanLain: ['Renyah', 3], unreadableFields: ['namaProduk', 'palsu'] },
      { resep: [{ nama: 'gula', jumlahGram: 10 }, { nama: 'x' }], umurSimpanHari: -1, alatProduksi: 'robot', punyaSertifikatHalal: 'ya' },
    );
    expect(result?.label.namaProduk).toHaveLength(1500);
    expect(result?.label.daftarBahanTeks).toBe('');
    expect(result?.label.pernyataanLain).toEqual(['Renyah']);
    expect(result?.label.unreadableFields).toEqual(['namaProduk']);
    expect(result?.answers.resep).toEqual([{ nama: 'gula', jumlahGram: 10 }]);
    expect(result?.answers.umurSimpanHari).toBeNull();
    expect(result?.answers.alatProduksi).toBeNull();
    expect(result?.answers.punyaSertifikatHalal).toBeNull();
  });

  it('status temuan dari peramban diabaikan karena tidak termasuk masukan', () => {
    const result = sanitizeCheckInput({ ...createEmptyLabelData(), status: 'lengkap' }, createEmptyAnswers());
    expect(result && 'status' in result.label).toBe(false);
  });
});

describe('buildLockedContext', () => {
  it('menghitung temuan dan jalur izin di server, lengkap dengan pasal', () => {
    const context = buildLockedContext(createEmptyLabelData(), createEmptyAnswers(), 'L-01');
    expect(context.temuanDitanya).toBe('L-01');
    expect(context.temuan).toHaveLength(20);
    expect(context.temuan[0]).toMatchObject({ kode: 'L-01', status: 'kurang' });
    expect(context.temuan[0]?.pasal).toMatch(/Pasal 5/);
    expect(context.jalurIzin.aturan).toHaveLength(8);
  });
});

describe('resolveQuestion', () => {
  it('pertanyaan per temuan butuh kode temuan', () => {
    expect(resolveQuestion({ pertanyaanId: 'maksud' })).toBeNull();
    expect(resolveQuestion({ pertanyaanId: 'maksud', ruleId: 'L-03' })).toBe(QUICK_QUESTIONS[0]?.teks);
    expect(resolveQuestion({ pertanyaanId: 'prioritas' })).toMatch(/lebih dulu/);
  });

  it('pertanyaan bebas dibatasi panjangnya dan tidak boleh kosong', () => {
    expect(resolveQuestion({ pertanyaanBebas: '   ' })).toBeNull();
    expect(resolveQuestion({ pertanyaanBebas: 'a'.repeat(201) })).toBeNull();
    expect(resolveQuestion({ pertanyaanBebas: '  Apa itu  P-IRT? ' })).toBe('Apa itu P-IRT?');
  });

  it('kode pertanyaan tak dikenal ditolak', () => {
    expect(resolveQuestion({ pertanyaanId: 'resep' as never })).toBeNull();
  });
});

describe('bahan acuan dan pasal', () => {
  it('bahan acuan memuat semua aturan L dan I', () => {
    const text = buildReferenceMaterial();
    expect(text).toMatch(/L-20 \|/);
    expect(text).toMatch(/I-08 \|/);
    expect(text).toMatch(/Lampiran I/);
  });

  it('pasal yang tidak ada di bahan acuan terdeteksi', () => {
    expect(findUnknownArticles('Lihat Pasal 14 dan Pasal 51.')).toEqual([]);
    expect(findUnknownArticles('Menurut pasal 99 dan Pasal 14')).toEqual(['99']);
  });

  it('kode aturan dikenali', () => {
    expect(isKnownRuleId('L-12')).toBe(true);
    expect(isKnownRuleId('I-05')).toBe(true);
    expect(isKnownRuleId('X-01')).toBe(false);
  });
});
