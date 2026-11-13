import { describe, expect, it } from 'vitest';
import {
  getSafeStorage,
  isStorageAvailable,
  readJson,
  readRaw,
  writeJson,
  type StorageLike,
} from '../safeStorage';

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

function throwingStorage(name = 'SecurityError'): StorageLike {
  const fail = () => {
    throw new DOMException('diblokir', name);
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

const asNumberList = (raw: unknown) =>
  Array.isArray(raw) && raw.every((x) => typeof x === 'number') ? (raw as number[]) : null;

describe('getSafeStorage', () => {
  it('mengembalikan null bila window tidak ada (render di server)', () => {
    expect(getSafeStorage()).toBeNull();
  });
});

describe('isStorageAvailable', () => {
  it('true untuk penyimpanan normal dan tidak meninggalkan sisa kunci', () => {
    const storage = memoryStorage();
    expect(isStorageAvailable(storage)).toBe(true);
    expect(storage.data.size).toBe(0);
  });

  it('false bila null, melempar galat, atau penuh', () => {
    expect(isStorageAvailable(null)).toBe(false);
    expect(isStorageAvailable(throwingStorage())).toBe(false);
    expect(isStorageAvailable(throwingStorage('QuotaExceededError'))).toBe(false);
  });

  it('false tanpa argumen bila tidak ada window', () => {
    expect(isStorageAvailable()).toBe(false);
  });
});

describe('readJson', () => {
  it('membaca nilai sah', () => {
    const storage = memoryStorage();
    storage.setItem('k', '[1,2,3]');
    expect(readJson('k', asNumberList, storage)).toEqual([1, 2, 3]);
  });

  it('null untuk kunci kosong', () => {
    expect(readJson('k', asNumberList, memoryStorage())).toBeNull();
  });

  it('null untuk JSON rusak', () => {
    const storage = memoryStorage();
    storage.setItem('k', '{rusak');
    expect(readJson('k', asNumberList, storage)).toBeNull();
  });

  it('null bila validasi menolak bentuk data', () => {
    const storage = memoryStorage();
    storage.setItem('k', '["a"]');
    expect(readJson('k', asNumberList, storage)).toBeNull();
  });

  it('null bila validator melempar', () => {
    const storage = memoryStorage();
    storage.setItem('k', '1');
    expect(
      readJson(
        'k',
        () => {
          throw new Error('x');
        },
        storage,
      ),
    ).toBeNull();
  });

  it('null bila akses penyimpanan melempar atau penyimpanan tidak ada', () => {
    expect(readJson('k', asNumberList, throwingStorage())).toBeNull();
    expect(readJson('k', asNumberList, null)).toBeNull();
    expect(readRaw('k', throwingStorage())).toBeNull();
  });
});

describe('writeJson', () => {
  it('menulis dan mengembalikan true', () => {
    const storage = memoryStorage();
    expect(writeJson('k', { a: 1 }, storage)).toBe(true);
    expect(storage.data.get('k')).toBe('{"a":1}');
  });

  it('false saat penyimpanan penuh atau diblokir', () => {
    expect(writeJson('k', 1, throwingStorage('QuotaExceededError'))).toBe(false);
    expect(writeJson('k', 1, throwingStorage())).toBe(false);
  });

  it('false bila penyimpanan tidak ada', () => {
    expect(writeJson('k', 1, null)).toBe(false);
  });

  it('false bila nilai tidak bisa diserialisasi', () => {
    const loop: Record<string, unknown> = {};
    loop.self = loop;
    expect(writeJson('k', loop, memoryStorage())).toBe(false);
  });
});
