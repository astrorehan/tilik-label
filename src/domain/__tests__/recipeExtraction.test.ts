import { describe, expect, it } from 'vitest';
import {
  MAX_RECIPE_ITEMS,
  MAX_RECIPE_NAME_LENGTH,
  RECIPE_EXTRACTION_FAILURE_MESSAGES,
  validateRecipeExtraction,
} from '../recipeExtraction';

describe('validateRecipeExtraction', () => {
  it('menerima daftar bahan dengan campuran gram/ml dan satuan tidak baku', () => {
    const result = validateRecipeExtraction({
      bukanResep: false,
      bahan: [
        { nama: '  Tepung   terigu ', jumlahGram: 500, takaranAsli: '500 gr' },
        { nama: 'Telur ayam', jumlahGram: null, takaranAsli: '  2   butir ' },
        { nama: 'Garam', jumlahGram: null, takaranAsli: 'secukupnya' },
        { nama: 'Minyak goreng', jumlahGram: 125.555, takaranAsli: '' },
      ],
    });
    expect(result).toEqual({
      ok: true,
      perluLengkapi: 2,
      bahan: [
        { nama: 'Tepung terigu', jumlahGram: 500, takaranAsli: '' },
        { nama: 'Telur ayam', jumlahGram: null, takaranAsli: '2 butir' },
        { nama: 'Garam', jumlahGram: null, takaranAsli: 'secukupnya' },
        { nama: 'Minyak goreng', jumlahGram: 125.56, takaranAsli: '' },
      ],
    });
  });

  it('menolak keluaran bukan JSON (undefined)', () => {
    expect(validateRecipeExtraction(undefined)).toEqual({ ok: false, alasan: 'bukan_json' });
  });

  it('menandai gambar bukan resep', () => {
    expect(validateRecipeExtraction({ bukanResep: true, bahan: [] })).toEqual({
      ok: false,
      alasan: 'bukan_resep',
    });
  });

  it('menolak daftar bahan kosong atau hanya berisi nama kosong', () => {
    expect(validateRecipeExtraction({ bukanResep: false, bahan: [] })).toEqual({
      ok: false,
      alasan: 'kosong',
    });
    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: '   ', jumlahGram: 100, takaranAsli: '' }],
      }),
    ).toEqual({ ok: false, alasan: 'kosong' });
  });

  it('menolak properti tambahan, tipe salah, dan jumlah tidak sah', () => {
    expect(
      validateRecipeExtraction({ bukanResep: false, bahan: [], catatan: 'ekstra' }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });

    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: 'Gula', jumlahGram: 0, takaranAsli: '' }],
      }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });

    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: 'Gula', jumlahGram: -10, takaranAsli: '' }],
      }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });

    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: 'Gula', jumlahGram: '100', takaranAsli: '' }],
      }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });

    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: 'Gula', jumlahGram: 100, takaranAsli: '', ekstra: true }],
      }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });
  });

  it('menolak jumlah baris atau panjang teks melebihi batas', () => {
    const tooMany = Array.from({ length: MAX_RECIPE_ITEMS + 1 }, (_, i) => ({
      nama: `Bahan ${i}`,
      jumlahGram: 10,
      takaranAsli: '',
    }));
    expect(validateRecipeExtraction({ bukanResep: false, bahan: tooMany })).toEqual({
      ok: false,
      alasan: 'skema_tidak_sesuai',
    });

    expect(
      validateRecipeExtraction({
        bukanResep: false,
        bahan: [{ nama: 'a'.repeat(MAX_RECIPE_NAME_LENGTH + 1), jumlahGram: 10, takaranAsli: '' }],
      }),
    ).toEqual({ ok: false, alasan: 'skema_tidak_sesuai' });
  });

  it('memiliki pesan kesalahan berbahasa Indonesia untuk setiap alasan', () => {
    for (const reason of ['bukan_json', 'skema_tidak_sesuai', 'bukan_resep', 'kosong'] as const) {
      expect(RECIPE_EXTRACTION_FAILURE_MESSAGES[reason].length).toBeGreaterThan(10);
    }
  });
});
