/**
 * Pembungkus aman untuk localStorage. Penyimpanan peramban bisa tidak ada
 * (render di server), diblokir, penuh, atau melempar galat (mode privat),
 * jadi semua fungsi di sini tidak pernah melempar dan mengembalikan nilai
 * gagal yang aman.
 */

/** Bagian dari Storage yang dipakai aplikasi; memudahkan tiruan saat test. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PROBE_KEY = 'tilik-label:cek-penyimpanan';

/** Mengambil localStorage peramban, atau null bila tidak ada atau tidak boleh diakses. */
export function getSafeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function resolve(storage?: StorageLike | null): StorageLike | null {
  return storage === undefined ? getSafeStorage() : storage;
}

/** Mengecek apakah penyimpanan benar-benar bisa ditulis dan dibaca. */
export function isStorageAvailable(storage?: StorageLike | null): boolean {
  const target = resolve(storage);
  if (!target) return false;
  try {
    target.setItem(PROBE_KEY, '1');
    const ok = target.getItem(PROBE_KEY) === '1';
    target.removeItem(PROBE_KEY);
    return ok;
  } catch {
    return false;
  }
}

/** Membaca teks mentah; null bila kosong, tidak ada penyimpanan, atau akses gagal. */
export function readRaw(key: string, storage?: StorageLike | null): string | null {
  const target = resolve(storage);
  if (!target) return null;
  try {
    return target.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Membaca dan memvalidasi JSON. `validate` menerima nilai hasil parse dan
 * mengembalikan nilai bertipe, atau null bila bentuknya tidak sah.
 * Mengembalikan null untuk data kosong, JSON rusak, atau validasi gagal.
 */
export function readJson<T>(
  key: string,
  validate: (raw: unknown) => T | null,
  storage?: StorageLike | null,
): T | null {
  const text = readRaw(key, storage);
  if (text === null) return null;
  try {
    return validate(JSON.parse(text));
  } catch {
    return null;
  }
}

/** Menulis nilai sebagai JSON. Mengembalikan false bila gagal (penuh, diblokir, dll). */
export function writeJson(key: string, value: unknown, storage?: StorageLike | null): boolean {
  const target = resolve(storage);
  if (!target) return false;
  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
