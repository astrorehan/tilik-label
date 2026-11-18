import type { LabelData, LabelFieldKey } from './types';

type ShelfLifeLabel = Pick<LabelData, 'pernyataanLain' | 'unreadableFields'>;
const SHELF_LIFE_PATTERN = /^(?:umur|masa)\s+simpan\s*:?\s*(\d+(?:[.,]\d+)?)\s*(jam|hari|minggu|bulan|tahun)(?:\s+sejak\s+(?:tanggal\s+)?produksi)?[.!]?$/i;
const DAYS_PER_UNIT: Record<string, number> = { jam: 1 / 24, hari: 1, minggu: 7, bulan: 30, tahun: 365 };

/** Pembacaan foto bisa menyisipkan spasi di tengah kata. */
export const MENYEHATKAN_CLAIM_PATTERN = /\bmeny[\s\u200b]*ehatkan\b/i;

export function updateLabelField(label: LabelData, key: LabelFieldKey, text: string): LabelData {
  const unreadableFields = label.unreadableFields?.filter((field) => field !== key);
  const update = key === 'pernyataanLain' ? { pernyataanLain: text.split('\n') } : { [key]: text };
  const next = { ...label, ...update, ...(unreadableFields ? { unreadableFields } : {}) };
  if (key === 'daftarBahanTeks') delete next.daftarBahanBerformat;
  return next;
}

/** Pernyataan durasi yang berdiri sendiri, tanpa menebak dari klaim atau kode batch. */
export function declaredShelfLife(label: ShelfLifeLabel): number | null {
  if (label.unreadableFields?.includes('pernyataanLain')) return null;
  const durations = new Set<number>();
  for (const line of label.pernyataanLain) {
    const match = line.trim().match(SHELF_LIFE_PATTERN);
    if (!match) continue;
    const days = Number(match[1]!.replace(',', '.')) * DAYS_PER_UNIT[match[2]!.toLowerCase()]!;
    if (Number.isFinite(days) && days > 0) durations.add(days);
  }
  return durations.size === 1 ? [...durations][0]! : null;
}

/** Pisahkan bahan utama dengan tetap menjaga anak bahan dan koma desimal. */
export function splitIngredients(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index++) {
    const character = body[index];
    if (character === '(' || character === '[') depth++;
    else if ((character === ')' || character === ']') && depth > 0) depth--;

    const decimalComma = character === ',' && /\d,\d/.test(body.slice(index - 1, index + 2));
    if (depth === 0 && !decimalComma && (character === ',' || character === ';' || character === '\n')) {
      parts.push(body.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((part) => part.trim().replace(/\.$/, '').trim()).filter(Boolean);
}

/** Baca persentase eksplisit pada tingkat utama, tanpa memakai angka anak bahan. */
export function declaredIngredientOrder(body: string) {
  const ingredients = splitIngredients(body);
  if (ingredients.some((ingredient) => ingredient.includes(':'))) return null;
  const shares = ingredients.flatMap((ingredient) => {
    const match = ingredient.match(/^([^%()[\]]+?)(?:\s*\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)|\s+(\d+(?:[.,]\d+)?)\s*%)$/);
    if (!match) return [];
    const share = Number((match[2] ?? match[3] ?? '').replace(',', '.'));
    return share > 0 && share <= 100 ? [{ ingredient, share }] : [];
  });
  const inversion = shares.findIndex((item, index) => index > 0 && item.share > shares[index - 1]!.share);
  if (inversion > 0) return { reversed: [shares[inversion - 1]!.ingredient, shares[inversion]!.ingredient] };
  const total = shares.reduce((sum, item) => sum + item.share, 0);
  if (shares.length === ingredients.length && Math.abs(total - 100) < 0.01) return { reversed: [] };
  return null;
}
