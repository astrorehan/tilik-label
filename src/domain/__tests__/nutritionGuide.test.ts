import { describe, expect, it } from 'vitest';
import { NUTRITION_FACTS, NUTRITION_PATHS, nutritionDeadline } from '../nutritionGuide';

const UNIT_NUMBER =
  /\d+(?:[.,]\d+)?\s*(?:kkal|kal|kcal|kj|g|gr|gram|mg|mcg|µg|ml|%|persen)(?![a-z])/i;

describe('nutritionGuide', () => {
  it('memuat tiga jalan berurutan', () => {
    expect(NUTRITION_PATHS.map((p) => p.nomor)).toEqual([1, 2, 3]);
    expect(NUTRITION_PATHS.map((p) => p.id)).toEqual([
      'uji-laboratorium',
      'nilai-kepala-bpom',
      'hitungan-bahan',
    ]);
  });

  it('setiap jalan punya rujukan pasal dan status bahan belum diperoleh', () => {
    for (const p of NUTRITION_PATHS) {
      expect(p.article).toMatch(/^Pasal 7/);
      expect(p.sourceStatus).toBe('belum-diperoleh');
      expect(p.sourceNote).toMatch(/perlu dicek/i);
      expect(p.title && p.summary && p.when && p.caution).toBeTruthy();
    }
  });

  it('setiap butir fakta punya rujukan pasal', () => {
    expect(NUTRITION_FACTS.map((f) => f.id)).toEqual(['G-01', 'G-02', 'G-05', 'G-06']);
    for (const f of NUTRITION_FACTS) expect(f.article).toMatch(/^Pasal \d+/);
  });

  it('butir pengecualian menyatakan daftar lengkap perlu dicek', () => {
    const g02 = NUTRITION_FACTS.find((f) => f.id === 'G-02');
    expect(g02?.note).toMatch(/perlu dicek/i);
  });

  it('keputusan 265/2026 ditandai berasal dari berita', () => {
    const p = NUTRITION_PATHS.find((x) => x.id === 'nilai-kepala-bpom');
    expect(p?.sourceNote).toMatch(/berita/i);
    expect(p?.sourceNote).toMatch(/belum dibaca/i);
  });

  it('tidak ada angka gizi (angka dengan satuan gizi) di data', () => {
    const strings: string[] = [];
    for (const p of NUTRITION_PATHS) {
      strings.push(p.title, p.summary, p.when, p.caution, p.sourceNote);
    }
    for (const f of NUTRITION_FACTS) strings.push(f.text, f.note ?? '');
    for (const s of strings) expect(s).not.toMatch(UNIT_NUMBER);
    expect(UNIT_NUMBER.test('120 kkal')).toBe(true);
    expect(UNIT_NUMBER.test('5 g')).toBe(true);
  });

  it('batas penyesuaian 17 Juni 2028 dengan catatan perlu dicek', () => {
    const d = nutritionDeadline();
    expect(d.text).toBe('17 Juni 2028');
    expect(d.caveat).toMatch(/perlu dicek/i);
  });
});
