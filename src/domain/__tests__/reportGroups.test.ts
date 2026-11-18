import { describe, expect, it } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '../labelRules';
import { PRINT_GUARANTEED_RULES, reviewLabel, type FindingGroupId } from '../reportGroups';
import type { AdditionalAnswers, LabelData, LabelRuleId } from '../types';

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    ...createEmptyLabelData(),
    namaProduk: 'Keripik Pisang Renyah',
    daftarBahanTeks: 'Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, garam.',
    beratBersihTeks: 'Berat bersih: 150 g',
    namaProdusen: 'Dapur Bu Rina',
    alamatProdusen: 'Jl. Melati No. 12, Kota Bandung 40115, Indonesia',
    kodeProduksiTeks: 'B01-131126',
    tanggalProduksiTeks: '13 Nov 2026',
    kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Des 2026',
    nomorIzinTeks: 'P-IRT 2053273010123-29',
    ...overrides,
  };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return { ...createEmptyAnswers(), bergantungCaraSimpan: false, ...overrides };
}

function groupOf(review: ReturnType<typeof reviewLabel>, id: LabelRuleId): FindingGroupId | undefined {
  return (Object.keys(review.groups) as FindingGroupId[]).find((group) =>
    review.groups[group].some((entry) => entry.asli.id === id),
  );
}

describe('reviewLabel', () => {
  it('memilah setiap aturan ke tepat satu kelompok', () => {
    const review = reviewLabel(makeLabel(), makeAnswers());
    const total = Object.values(review.groups).reduce((sum, group) => sum + group.length, 0);
    expect(total).toBe(review.report.hasil.length);
    expect(review.skor.total).toBe(20);
    expect(review.skor.sekarang).toBe(review.groups.aman.length);
    expect(review.skor.denganPerbaikan).toBe(review.groups.aman.length + review.groups.otomatis.length);
  });

  it('menaruh awalan daftar bahan yang hilang di kelompok otomatis', () => {
    const review = reviewLabel(
      makeLabel({ daftarBahanTeks: 'pisang kepok, minyak kelapa sawit, garam' }),
      makeAnswers(),
    );
    expect(review.report.hasil.find((item) => item.id === 'L-02')?.status).toBe('kurang');
    expect(groupOf(review, 'L-02')).toBe('otomatis');
  });

  it('menaruh nomor izin yang kosong di kelompok keputusan karena tidak pernah dikarang', () => {
    const review = reviewLabel(makeLabel({ nomorIzinTeks: '' }), makeAnswers());
    expect(groupOf(review, 'L-11')).toBe('keputusan');
  });

  it('membuang klaim halal tanpa sertifikat lewat perbaikan otomatis', () => {
    const review = reviewLabel(
      makeLabel({ keteranganHalalTeks: 'Halal' }),
      makeAnswers({ punyaSertifikatHalal: false }),
    );
    expect(review.report.hasil.find((item) => item.id === 'L-07')?.status).toBe('kurang');
    expect(groupOf(review, 'L-07')).toBe('otomatis');
    expect(review.corrected.data.keteranganHalalTeks).toBe('');
  });

  it('menaruh klaim "tanpa pengawet" yang bertentangan dengan komposisi di kelompok otomatis', () => {
    const review = reviewLabel(
      makeLabel({
        daftarBahanTeks: 'Komposisi: cabai rawit, garam, natrium benzoat.',
        pernyataanLain: ['Tanpa pengawet'],
      }),
      makeAnswers(),
    );
    expect(review.report.hasil.find((item) => item.id === 'L-16')?.status).toBe('kurang');
    expect(groupOf(review, 'L-16')).toBe('otomatis');
    expect(review.corrected.data.pernyataanLain).toEqual([]);
  });

  it('menaruh aturan cetak fisik di kelompok cek', () => {
    const review = reviewLabel(makeLabel({ daftarBahanTeks: 'Komposisi: pisang, telur.' }), makeAnswers());
    for (const id of PRINT_GUARANTEED_RULES) {
      expect(groupOf(review, id)).toBe('cek');
    }
  });

  it('mencetak tebal alergen yang terlihat belum tebal di label asli', () => {
    const ingredients = 'Komposisi: singkong, telur.';
    const review = reviewLabel(makeLabel({ daftarBahanTeks: ingredients, daftarBahanBerformat: ingredients }), makeAnswers());
    expect(groupOf(review, 'L-13')).toBe('otomatis');
    expect(review.corrected.data.daftarBahanBerformat).toContain('**telur**');
  });

  it('tidak mengubah label masukan', () => {
    const label = makeLabel({ daftarBahanTeks: 'pisang, garam' });
    const snapshot = JSON.stringify(label);
    reviewLabel(label, makeAnswers());
    expect(JSON.stringify(label)).toBe(snapshot);
  });
});
