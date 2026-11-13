import { describe, expect, it } from 'vitest';
import {
  LABEL_RULE_METADATA,
  NUTRITION_RULE_METADATA,
  PERMIT_RULE_METADATA,
} from '../regulations';
import {
  BAHAN_BELUM_TERBACA,
  HAL_TIDAK_DIPERIKSA,
  PENANDA_LABEL,
  REGULATION_LINKS,
  RULE_CATALOG,
} from '../ruleCatalog';

function section(kunci: string) {
  const found = RULE_CATALOG.find((s) => s.kunci === kunci);
  if (!found) throw new Error(`Bagian ${kunci} tidak ada`);
  return found;
}

function entry(id: string) {
  return RULE_CATALOG.flatMap((s) => s.entri).find((e) => e.id === id);
}

describe('katalog aturan', () => {
  it('memuat 20 aturan L, 8 aturan I, dan 6 aturan G', () => {
    expect(section('label').entri).toHaveLength(20);
    expect(section('izin').entri).toHaveLength(8);
    expect(section('gizi').entri).toHaveLength(6);
  });

  it('memakai id berurutan', () => {
    expect(section('label').entri[0]?.id).toBe('L-01');
    expect(section('label').entri[19]?.id).toBe('L-20');
    expect(section('izin').entri.map((e) => e.id)).toEqual([
      'I-01', 'I-02', 'I-03', 'I-04', 'I-05', 'I-06', 'I-07', 'I-08',
    ]);
    expect(section('gizi').entri.map((e) => e.id)).toEqual([
      'G-01', 'G-02', 'G-03', 'G-04', 'G-05', 'G-06',
    ]);
  });

  it('setiap entri punya pasal, cara cek, dan penanda', () => {
    for (const s of RULE_CATALOG) {
      for (const e of s.entri) {
        expect(e.rujukan.pasal, e.id).toMatch(/Pasal \d+/);
        expect(e.rujukan.peraturan, e.id).toBe(s.peraturan);
        expect(e.caraCek.length, e.id).toBeGreaterThan(5);
        expect(e.penanda.length, e.id).toBeGreaterThan(0);
        for (const p of e.penanda) expect(PENANDA_LABEL[p]).toBeTruthy();
      }
    }
  });

  it('judul dan rujukan sama dengan metadata', () => {
    const meta: Record<string, { judul: string; rujukan: unknown }> = {
      ...LABEL_RULE_METADATA,
      ...PERMIT_RULE_METADATA,
      ...NUTRITION_RULE_METADATA,
    };
    for (const s of RULE_CATALOG) {
      for (const e of s.entri) {
        expect(e.rujukan).toEqual(meta[e.id]?.rujukan);
        expect(e.judul).toBe(meta[e.id]?.judul);
      }
    }
  });

  it('menandai butir yang tidak bisa dicek otomatis', () => {
    expect(entry('L-13')?.penanda).toContain('tidak_bisa_dari_foto');
    expect(entry('L-14')?.penanda).toContain('tidak_bisa_dari_foto');
    expect(entry('I-08')?.penanda).toContain('perlu_dinas');
    expect(entry('G-01')?.penanda).toContain('belum_otomatis');
  });

  it('punya tautan resmi, daftar batasan, dan bahan belum terbaca', () => {
    for (const s of RULE_CATALOG) {
      expect(s.tautan).toBe(REGULATION_LINKS[s.peraturan as keyof typeof REGULATION_LINKS]);
      expect(s.tautan).toMatch(/^https:\/\/peraturan\.go\.id\//);
    }
    expect(HAL_TIDAK_DIPERIKSA.length).toBeGreaterThan(0);
    expect(BAHAN_BELUM_TERBACA).toHaveLength(4);
  });
});
