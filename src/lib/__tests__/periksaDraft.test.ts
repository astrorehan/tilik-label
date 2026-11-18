import { describe, expect, it, vi } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '@/domain';
import type { AdditionalAnswers, LabelData } from '@/domain';
import {
  DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT,
  PERIKSA_DRAFT_KEY,
  clearPeriksaDraft,
  getPeriksaDraftSnapshot,
  hasDraftContent,
  hasMeaningfulAnswers,
  hasMeaningfulCheckData,
  hasTypedLabel,
  loadPeriksaDraft,
  parsePeriksaDraft,
  parsePeriksaDraftSnapshot,
  savePeriksaDraft,
  savePeriksaDraftResult,
  subscribePeriksaDraft,
  type PeriksaDraft,
} from '../periksaDraft';
import { isSameProductData } from '../produkSaya';
import type { StorageLike } from '../safeStorage';

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function throwingStorage(name = 'QuotaExceededError'): StorageLike {
  const fail = () => {
    throw new DOMException('gagal', name);
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return { ...createEmptyLabelData(), namaProduk: 'Keripik Pisang', ...overrides };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return { ...createEmptyAnswers(), ...overrides };
}

function makeDraft(overrides: Partial<PeriksaDraft> = {}): PeriksaDraft {
  return {
    label: makeLabel(),
    answers: makeAnswers(),
    step: 'isi',
    farthestStep: 'tanya',
    diperbaruiPada: '2026-05-10T08:00:00.000Z',
    ...overrides,
  };
}

describe('hasTypedLabel & hasMeaningfulAnswers', () => {
  it('false untuk label kosong atau hanya spasi', () => {
    expect(hasTypedLabel(createEmptyLabelData())).toBe(false);
    expect(
      hasTypedLabel({
        ...createEmptyLabelData(),
        namaProduk: '   ',
        pernyataanLain: ['  ', ''],
      }),
    ).toBe(false);
  });

  it('true bila ada kolom teks atau pernyataan label yang terisi', () => {
    expect(hasTypedLabel(makeLabel())).toBe(true);
    expect(
      hasTypedLabel({
        ...createEmptyLabelData(),
        beratBersihTeks: '150 g',
      }),
    ).toBe(true);
    expect(
      hasTypedLabel({
        ...createEmptyLabelData(),
        pernyataanLain: ['Tanpa pengawet'],
      }),
    ).toBe(true);
  });

  it('false untuk jawaban kosong atau baris resep belum lengkap', () => {
    expect(hasMeaningfulAnswers(createEmptyAnswers())).toBe(false);
    expect(
      hasMeaningfulAnswers(
        makeAnswers({
          resep: [
            { nama: '   ', jumlahGram: 100 },
            { nama: 'Gula', jumlahGram: 0 },
          ],
          umurSimpanHari: 0,
        }),
      ),
    ).toBe(false);
  });

  it('true bila ada resep sah atau jawaban produk terisi', () => {
    expect(
      hasMeaningfulAnswers(makeAnswers({ resep: [{ nama: 'Singkong', jumlahGram: 500 }] })),
    ).toBe(true);
    expect(hasMeaningfulAnswers(makeAnswers({ umurSimpanHari: 30 }))).toBe(true);
    expect(hasMeaningfulAnswers(makeAnswers({ bergantungCaraSimpan: false }))).toBe(true);
    expect(hasMeaningfulAnswers(makeAnswers({ punyaSertifikatHalal: true }))).toBe(true);
    expect(hasMeaningfulAnswers(makeAnswers({ alatProduksi: 'manual' }))).toBe(true);
  });

  it('hasMeaningfulCheckData dan hasDraftContent memeriksa gabungan label dan jawaban', () => {
    expect(hasMeaningfulCheckData(createEmptyLabelData(), createEmptyAnswers())).toBe(false);
    expect(hasDraftContent(null)).toBe(false);
    expect(hasDraftContent(makeDraft({ label: createEmptyLabelData(), answers: createEmptyAnswers() }))).toBe(false);
    expect(
      hasDraftContent(
        makeDraft({
          label: createEmptyLabelData(),
          answers: makeAnswers({ umurSimpanHari: 14 }),
        }),
      ),
    ).toBe(true);
  });
});

describe('parsePeriksaDraft', () => {
  it('menerima draf sah dengan atau tanpa productId', () => {
    const withoutId = parsePeriksaDraft(makeDraft());
    expect(withoutId?.step).toBe('isi');
    expect(withoutId?.farthestStep).toBe('tanya');
    expect(withoutId?.productId).toBeUndefined();

    const withId = parsePeriksaDraft(makeDraft({ productId: '  prod-1  ' }));
    expect(withId?.productId).toBe('prod-1');
  });

  it('mengabaikan productId kosong atau spasi', () => {
    const parsed = parsePeriksaDraft(makeDraft({ productId: '   ' }));
    expect(parsed?.productId).toBeUndefined();
  });

  it('menyamakan farthestStep ke step bila farthestStep tertinggal', () => {
    const parsed = parsePeriksaDraft(makeDraft({ step: 'hasil', farthestStep: 'isi' }));
    expect(parsed?.step).toBe('hasil');
    expect(parsed?.farthestStep).toBe('hasil');
  });

  it('menolak bentuk data tidak sah', () => {
    expect(parsePeriksaDraft(null)).toBeNull();
    expect(parsePeriksaDraft('teks')).toBeNull();
    expect(parsePeriksaDraft([])).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), step: 'tidak-dikenal' })).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), farthestStep: 'tidak-dikenal' })).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), diperbaruiPada: 'bukan-tanggal' })).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), label: null })).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), answers: { resep: 'bukan-array' } })).toBeNull();
    expect(parsePeriksaDraft({ ...makeDraft(), productId: 123 })).toBeNull();
  });

  it('mengisi kolom teks label yang hilang dengan string kosong', () => {
    const raw = {
      ...makeDraft(),
      label: { namaProduk: 'Dodol Garut', pernyataanLain: ['Khas Garut'] },
    };
    const parsed = parsePeriksaDraft(raw);
    expect(parsed?.label.namaProduk).toBe('Dodol Garut');
    expect(parsed?.label.daftarBahanTeks).toBe('');
    expect(parsed?.label.pernyataanLain).toEqual(['Khas Garut']);
  });
});

describe('akses penyimpanan draf pemeriksaan', () => {
  const t1 = new Date('2026-05-10T08:00:00.000Z');
  const t2 = new Date('2026-05-10T08:05:00.000Z');

  it('simpan, baca, perbarui, dan hapus draf di penyimpanan', () => {
    const storage = memoryStorage();
    const first = savePeriksaDraftResult(
      {
        label: makeLabel(),
        answers: makeAnswers({ umurSimpanHari: 30 }),
        step: 'tanya',
        farthestStep: 'tanya',
      },
      storage,
      t1,
    );
    expect(first.ok).toBe(true);
    expect(storage.data.has(PERIKSA_DRAFT_KEY)).toBe(true);

    const loaded = loadPeriksaDraft(storage);
    expect(loaded?.label.namaProduk).toBe('Keripik Pisang');
    expect(loaded?.answers.umurSimpanHari).toBe(30);
    expect(loaded?.step).toBe('tanya');
    expect(loaded?.diperbaruiPada).toBe(t1.toISOString());

    const updated = savePeriksaDraft(
      {
        label: makeLabel({ namaProduk: 'Keripik Pisang Cokelat' }),
        answers: makeAnswers({ umurSimpanHari: 45 }),
        step: 'hasil',
        farthestStep: 'isi',
        productId: 'p-123',
      },
      storage,
      t2,
    );
    expect(updated?.productId).toBe('p-123');
    expect(updated?.farthestStep).toBe('hasil');
    expect(updated?.diperbaruiPada).toBe(t2.toISOString());

    expect(clearPeriksaDraft(storage)).toBe(true);
    expect(loadPeriksaDraft(storage)).toBeNull();
  });

  it('mengembalikan null untuk JSON rusak tanpa melempar', () => {
    const storage = memoryStorage();
    storage.setItem(PERIKSA_DRAFT_KEY, '{rusak');
    expect(loadPeriksaDraft(storage)).toBeNull();
  });

  it('gagal aman saat penyimpanan tidak tersedia (null) atau melempar galat', () => {
    expect(
      savePeriksaDraftResult(
        {
          label: makeLabel(),
          answers: makeAnswers(),
          step: 'isi',
          farthestStep: 'isi',
        },
        null,
        t1,
      ),
    ).toEqual({ ok: false, reason: 'tidak_tersedia' });
    expect(loadPeriksaDraft(null)).toBeNull();
    expect(clearPeriksaDraft(null)).toBe(false);

    const broken = throwingStorage('QuotaExceededError');
    expect(
      savePeriksaDraftResult(
        {
          label: makeLabel(),
          answers: makeAnswers(),
          step: 'isi',
          farthestStep: 'isi',
        },
        broken,
        t1,
      ),
    ).toEqual({ ok: false, reason: 'gagal_tulis' });
    expect(loadPeriksaDraft(broken)).toBeNull();
    expect(clearPeriksaDraft(broken)).toBe(false);
  });

  it('aman di lingkungan server tanpa window', () => {
    expect(getPeriksaDraftSnapshot()).toBe(DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT);
    expect(loadPeriksaDraft()).toBeNull();
    expect(
      savePeriksaDraft({
        label: makeLabel(),
        answers: makeAnswers(),
        step: 'isi',
        farthestStep: 'isi',
      }),
    ).toBeNull();
  });

  it('parsePeriksaDraftSnapshot mengurai snapshot sah dan mengabaikan kosong/rusak', () => {
    expect(parsePeriksaDraftSnapshot('')).toBeNull();
    expect(parsePeriksaDraftSnapshot(DRAFT_STORAGE_UNAVAILABLE_SNAPSHOT)).toBeNull();
    expect(parsePeriksaDraftSnapshot('{rusak')).toBeNull();

    const parsed = parsePeriksaDraftSnapshot(JSON.stringify(makeDraft({ productId: 'p9' })));
    expect(parsed?.productId).toBe('p9');
    expect(parsed?.label.namaProduk).toBe('Keripik Pisang');
  });

  it('subscribePeriksaDraft memberi tahu pelanggan saat draf disimpan atau dihapus', () => {
    const storage = memoryStorage();
    const listener = vi.fn();
    const unsubscribe = subscribePeriksaDraft(listener);

    savePeriksaDraft(
      {
        label: makeLabel(),
        answers: makeAnswers(),
        step: 'isi',
        farthestStep: 'isi',
      },
      storage,
      t1,
    );
    clearPeriksaDraft(storage);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    savePeriksaDraft(
      {
        label: makeLabel(),
        answers: makeAnswers(),
        step: 'isi',
        farthestStep: 'isi',
      },
      storage,
      t2,
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('isSameProductData', () => {
  it('membedakan data label atau jawaban yang berubah dan yang sama persis', () => {
    const a = { label: makeLabel(), answers: makeAnswers({ umurSimpanHari: 30 }) };
    const b = { label: makeLabel(), answers: makeAnswers({ umurSimpanHari: 30 }) };
    const c = { label: makeLabel({ namaProduk: 'Lain' }), answers: makeAnswers({ umurSimpanHari: 30 }) };

    expect(isSameProductData(a, b)).toBe(true);
    expect(isSameProductData(a, c)).toBe(false);
  });
});
