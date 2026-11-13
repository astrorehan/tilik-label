import { describe, expect, it } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '@/domain';
import type { AdditionalAnswers, LabelData } from '@/domain';
import {
  MAX_SAVED_PRODUCTS,
  NAMA_PRODUK_KOSONG,
  PRODUK_SAYA_KEY,
  deleteProduct,
  getProduct,
  listProducts,
  parseProductList,
  parseProductsSnapshot,
  removeProduct,
  saveProduct,
  saveProductResult,
  sortProducts,
  summarizeProduct,
  upsertProduct,
  type SavedProduct,
} from '../produkSaya';
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

function throwingStorage(): StorageLike {
  const fail = () => {
    throw new DOMException('penuh', 'QuotaExceededError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return { ...createEmptyLabelData(), namaProduk: 'Keripik Singkong', ...overrides };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return { ...createEmptyAnswers(), ...overrides };
}

let counter = 0;
const nextId = () => `id-${++counter}`;

function makeProduct(overrides: Partial<SavedProduct> = {}): SavedProduct {
  return {
    id: 'p1',
    nama: 'Keripik Singkong',
    dibuatPada: '2026-01-01T00:00:00.000Z',
    diperbaruiPada: '2026-01-01T00:00:00.000Z',
    label: makeLabel(),
    answers: makeAnswers(),
    ...overrides,
  };
}

describe('parseProductList', () => {
  it('menerima daftar sah', () => {
    const list = parseProductList([makeProduct()]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('p1');
  });

  it('mengembalikan daftar kosong untuk data bukan array', () => {
    expect(parseProductList(null)).toEqual([]);
    expect(parseProductList({ a: 1 })).toEqual([]);
    expect(parseProductList('x')).toEqual([]);
  });

  it('membuang entri rusak tetapi mempertahankan yang sah', () => {
    const list = parseProductList([
      makeProduct({ id: 'ok' }),
      null,
      42,
      { id: 'tanpa-label' },
      makeProduct({ id: '' }),
      makeProduct({ id: 'tgl-rusak', diperbaruiPada: 'bukan tanggal' }),
      { ...makeProduct({ id: 'label-rusak' }), label: { namaProduk: 5 } },
      { ...makeProduct({ id: 'jawaban-rusak' }), answers: { resep: 'x' } },
      { ...makeProduct({ id: 'resep-rusak' }), answers: makeAnswers({ resep: [{ nama: 'a', jumlahGram: NaN }] }) },
    ]);
    expect(list.map((p) => p.id)).toEqual(['ok']);
  });

  it('menolak bidang opsional yang salah tipe', () => {
    const bad = { ...makeProduct({ id: 'x' }), answers: { ...makeAnswers(), alatProduksi: 'roket' } };
    const bad2 = { ...makeProduct({ id: 'y' }), label: { ...makeLabel(), unreadableFields: ['bukanField'] } };
    expect(parseProductList([bad, bad2])).toEqual([]);
  });

  it('mengisi bidang jawaban opsional yang hilang dengan null', () => {
    const raw = { ...makeProduct(), answers: makeAnswers() };
    const [product] = parseProductList([raw]);
    expect(product.answers.alatProduksi).toBeNull();
    expect(product.answers.wajibSni).toBeNull();
  });

  it('mengambil yang pertama bila id ganda', () => {
    const list = parseProductList([
      makeProduct({ id: 'a', nama: 'Pertama' }),
      makeProduct({ id: 'a', label: makeLabel({ namaProduk: 'Kedua' }) }),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].label.namaProduk).toBe('Keripik Singkong');
  });

  it('menghitung nama dari label, bukan dari data tersimpan', () => {
    const [product] = parseProductList([makeProduct({ nama: 'Nama Lama', label: makeLabel({ namaProduk: ' Dodol ' }) })]);
    expect(product.nama).toBe('Dodol');
  });

  it(`membatasi sampai ${MAX_SAVED_PRODUCTS} produk, mempertahankan yang terbaru`, () => {
    const many = Array.from({ length: MAX_SAVED_PRODUCTS + 5 }, (_, i) =>
      makeProduct({
        id: `p${i}`,
        diperbaruiPada: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      }),
    );
    const list = parseProductList(many);
    expect(list).toHaveLength(MAX_SAVED_PRODUCTS);
    expect(list[0].id).toBe(`p${MAX_SAVED_PRODUCTS + 4}`);
  });
});

describe('sortProducts', () => {
  it('terbaru diperbarui lebih dulu dan tidak mengubah masukan', () => {
    const a = makeProduct({ id: 'a', diperbaruiPada: '2026-02-01T00:00:00.000Z' });
    const b = makeProduct({ id: 'b', diperbaruiPada: '2026-03-01T00:00:00.000Z' });
    const input = [a, b];
    expect(sortProducts(input).map((p) => p.id)).toEqual(['b', 'a']);
    expect(input.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('upsertProduct', () => {
  const t1 = new Date('2026-05-01T08:00:00.000Z');
  const t2 = new Date('2026-05-02T09:30:00.000Z');

  it('menambah produk baru dengan id dari makeId dan nama dari label', () => {
    const { list, product } = upsertProduct([], { label: makeLabel(), answers: makeAnswers() }, t1, () => 'baru');
    expect(product?.id).toBe('baru');
    expect(product?.nama).toBe('Keripik Singkong');
    expect(product?.dibuatPada).toBe(t1.toISOString());
    expect(product?.diperbaruiPada).toBe(t1.toISOString());
    expect(list).toHaveLength(1);
  });

  it('memakai nama cadangan bila nama produk kosong', () => {
    const { product } = upsertProduct([], { label: makeLabel({ namaProduk: '   ' }), answers: makeAnswers() }, t1, nextId);
    expect(product?.nama).toBe(NAMA_PRODUK_KOSONG);
  });

  it('memperbarui: diperbaruiPada berubah, dibuatPada tetap, tidak menambah entri', () => {
    const first = upsertProduct([], { label: makeLabel(), answers: makeAnswers() }, t1, () => 'x');
    const second = upsertProduct(
      first.list,
      { id: 'x', label: makeLabel({ namaProduk: 'Keripik Pedas' }), answers: makeAnswers({ umurSimpanHari: 30 }) },
      t2,
      nextId,
    );
    expect(second.list).toHaveLength(1);
    expect(second.product?.dibuatPada).toBe(t1.toISOString());
    expect(second.product?.diperbaruiPada).toBe(t2.toISOString());
    expect(second.product?.nama).toBe('Keripik Pedas');
    expect(second.product?.answers.umurSimpanHari).toBe(30);
  });

  it('id tak dikenal diperlakukan sebagai produk baru dengan id itu', () => {
    const { product } = upsertProduct([], { id: 'dari-url', label: makeLabel(), answers: makeAnswers() }, t1, nextId);
    expect(product?.id).toBe('dari-url');
  });

  it('menolak produk baru saat batas penuh tanpa menghapus yang lama', () => {
    const full = Array.from({ length: MAX_SAVED_PRODUCTS }, (_, i) => makeProduct({ id: `p${i}` }));
    const result = upsertProduct(full, { label: makeLabel(), answers: makeAnswers() }, t1, nextId);
    expect(result.product).toBeNull();
    expect(result.list).toHaveLength(MAX_SAVED_PRODUCTS);
  });

  it('tetap boleh memperbarui produk lama saat batas penuh', () => {
    const full = Array.from({ length: MAX_SAVED_PRODUCTS }, (_, i) => makeProduct({ id: `p${i}` }));
    const result = upsertProduct(full, { id: 'p3', label: makeLabel(), answers: makeAnswers() }, t1, nextId);
    expect(result.product?.id).toBe('p3');
    expect(result.list).toHaveLength(MAX_SAVED_PRODUCTS);
    expect(result.list[0].id).toBe('p3');
  });

  it('tidak mengubah daftar masukan', () => {
    const list = [makeProduct()];
    upsertProduct(list, { id: 'p1', label: makeLabel(), answers: makeAnswers() }, t2, nextId);
    expect(list[0].diperbaruiPada).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('removeProduct', () => {
  it('menghapus hanya id yang cocok', () => {
    const list = [makeProduct({ id: 'a' }), makeProduct({ id: 'b' })];
    expect(removeProduct(list, 'a').map((p) => p.id)).toEqual(['b']);
    expect(removeProduct(list, 'zzz')).toHaveLength(2);
  });
});

describe('summarizeProduct', () => {
  it('menghitung ulang ringkasan dan jalur izin dari masukan mentah', () => {
    const summary = summarizeProduct(makeProduct());
    const { lengkap, kurang, tidakBisaDicek } = summary.ringkasan;
    expect(summary.siapCetak).toBe(kurang === 0);
    expect(lengkap + kurang + tidakBisaDicek).toBe(20);
    expect(summary.jalurIzin).toBe('belum_bisa_ditentukan');
    expect(summary.jalurIzinJudul.length).toBeGreaterThan(0);
  });

  it('label kosong punya butir kurang', () => {
    const summary = summarizeProduct(makeProduct({ label: createEmptyLabelData() }));
    expect(summary.ringkasan.kurang).toBeGreaterThan(0);
    expect(summary.siapCetak).toBe(false);
  });

  it('jalur izin ikut jawaban', () => {
    const summary = summarizeProduct(
      makeProduct({ answers: makeAnswers({ alatProduksi: 'manual', umurSimpanHari: 90 }) }),
    );
    expect(summary.jalurIzin).not.toBe('belum_bisa_ditentukan');
  });
});

describe('fungsi akses penyimpanan', () => {
  it('simpan lalu baca, ambil, dan hapus', () => {
    const storage = memoryStorage();
    const saved = saveProduct({ label: makeLabel(), answers: makeAnswers() }, storage);
    expect(saved).not.toBeNull();
    expect(listProducts(storage)).toHaveLength(1);
    expect(getProduct(saved!.id, storage)?.nama).toBe('Keripik Singkong');
    expect(getProduct('tidak-ada', storage)).toBeNull();
    expect(deleteProduct(saved!.id, storage)).toBe(true);
    expect(listProducts(storage)).toEqual([]);
    expect(deleteProduct(saved!.id, storage)).toBe(false);
  });

  it('simpan ulang dengan id sama memperbarui, bukan menggandakan', () => {
    const storage = memoryStorage();
    const first = saveProductResult({ label: makeLabel(), answers: makeAnswers() }, storage, new Date('2026-05-01T00:00:00Z'), () => 'x');
    const second = saveProductResult({ id: 'x', label: makeLabel({ namaProduk: 'B' }), answers: makeAnswers() }, storage, new Date('2026-05-03T00:00:00Z'), nextId);
    expect(first.ok && second.ok).toBe(true);
    const list = listProducts(storage);
    expect(list).toHaveLength(1);
    expect(list[0].dibuatPada).toBe('2026-05-01T00:00:00.000Z');
    expect(list[0].diperbaruiPada).toBe('2026-05-03T00:00:00.000Z');
  });

  it('data JSON rusak dianggap kosong dan bisa ditimpa', () => {
    const storage = memoryStorage();
    storage.setItem(PRODUK_SAYA_KEY, '{bukan json');
    expect(listProducts(storage)).toEqual([]);
    expect(saveProduct({ label: makeLabel(), answers: makeAnswers() }, storage)).not.toBeNull();
    expect(listProducts(storage)).toHaveLength(1);
  });

  it('entri tidak valid di penyimpanan dibuang saat dibaca', () => {
    const storage = memoryStorage();
    storage.setItem(PRODUK_SAYA_KEY, JSON.stringify([makeProduct({ id: 'ok' }), { id: 'rusak' }, 7]));
    expect(listProducts(storage).map((p) => p.id)).toEqual(['ok']);
  });

  it('storage yang melempar: baca kosong, simpan dan hapus gagal tanpa melempar', () => {
    const storage = throwingStorage();
    expect(listProducts(storage)).toEqual([]);
    expect(saveProduct({ label: makeLabel(), answers: makeAnswers() }, storage)).toBeNull();
    expect(saveProductResult({ label: makeLabel(), answers: makeAnswers() }, storage)).toEqual({ ok: false, reason: 'gagal_tulis' });
    expect(deleteProduct('x', storage)).toBe(false);
    expect(getProduct('x', storage)).toBeNull();
  });

  it('tanpa penyimpanan (null): gagal dengan alasan tidak_tersedia', () => {
    expect(saveProductResult({ label: makeLabel(), answers: makeAnswers() }, null)).toEqual({ ok: false, reason: 'tidak_tersedia' });
    expect(listProducts(null)).toEqual([]);
  });

  it('tanpa argumen storage di server (tanpa window): gagal aman', () => {
    expect(listProducts()).toEqual([]);
    expect(saveProduct({ label: makeLabel(), answers: makeAnswers() })).toBeNull();
  });

  it('menolak produk ke-51 dengan alasan batas_penuh', () => {
    const storage = memoryStorage();
    for (let i = 0; i < MAX_SAVED_PRODUCTS; i += 1) {
      expect(saveProductResult({ label: makeLabel(), answers: makeAnswers() }, storage, new Date(2026, 0, 1, 0, i), nextId).ok).toBe(true);
    }
    const result = saveProductResult({ label: makeLabel(), answers: makeAnswers() }, storage, new Date(), nextId);
    expect(result).toEqual({ ok: false, reason: 'batas_penuh' });
    expect(listProducts(storage)).toHaveLength(MAX_SAVED_PRODUCTS);
  });
});

describe('parseProductsSnapshot', () => {
  it('kosong, penanda tidak tersedia, dan JSON rusak menghasilkan daftar kosong', () => {
    expect(parseProductsSnapshot('')).toEqual([]);
    expect(parseProductsSnapshot('\u0000tidak-tersedia')).toEqual([]);
    expect(parseProductsSnapshot('{rusak')).toEqual([]);
  });

  it('mengurai teks mentah sah', () => {
    expect(parseProductsSnapshot(JSON.stringify([makeProduct()]))).toHaveLength(1);
  });
});
