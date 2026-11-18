export interface AllergenGroup {
  kategori: string;
  kataKunci: string[];
}

/**
 * Daftar sepuluh kelompok bahan alergen beserta kata kunci turunannya
 * berdasarkan Peraturan BPOM Nomor 31 Tahun 2018 Pasal 49.
 */
export const ALLERGEN_GROUPS: AllergenGroup[] = [
  {
    kategori: 'Serealia mengandung gluten',
    kataKunci: [
      'gluten',
      'gandum',
      'terigu',
      'tepung terigu',
      'oat',
      'jelai',
      'barley',
      'gandum hitam',
      'rye',
      'malt',
      'tepung roti',
      'panir',
    ],
  },
  {
    kategori: 'Telur',
    kataKunci: ['telur', 'putih telur', 'kuning telur', 'tepung telur'],
  },
  {
    kategori: 'Ikan',
    kataKunci: [
      'ikan',
      'teri',
      'tenggiri',
      'tuna',
      'salmon',
      'lele',
      'patin',
      'bandeng',
      'kakap',
      'tongkol',
      'cakalang',
      'sarden',
      'petis ikan',
    ],
  },
  {
    kategori: 'Krustase',
    kataKunci: ['udang', 'ebi', 'rebon', 'kepiting', 'rajungan', 'lobster', 'krustase'],
  },
  {
    kategori: 'Moluska',
    kataKunci: ['cumi', 'sotong', 'gurita', 'kerang', 'tiram', 'siput', 'bekicot', 'moluska'],
  },
  {
    kategori: 'Kacang tanah',
    kataKunci: ['kacang tanah', 'selai kacang'],
  },
  {
    kategori: 'Kedelai',
    kataKunci: [
      'kedelai',
      'kacang kedelai',
      'kecap',
      'tahu',
      'tempe',
      'tauco',
      'lesitin kedelai',
      'susu kedelai',
      'edamame',
    ],
  },
  {
    kategori: 'Susu',
    kataKunci: [
      'susu',
      'susu bubuk',
      'susu kental manis',
      'keju',
      'mentega',
      'butter',
      'whey',
      'kasein',
      'laktosa',
      'yogurt',
      'yoghurt',
      'krimer susu',
    ],
  },
  {
    kategori: 'Kacang pohon',
    kataKunci: [
      'kacang mete',
      'mete',
      'mede',
      'almond',
      'kenari',
      'walnut',
      'hazelnut',
      'pistachio',
      'pecan',
      'macadamia',
      'kacang pohon',
    ],
  },
  {
    kategori: 'Sulfit',
    kataKunci: [
      'sulfit',
      'natrium metabisulfit',
      'kalium metabisulfit',
      'natrium sulfit',
      'natrium bisulfit',
      'belerang dioksida',
      'e220',
      'e221',
      'e222',
      'e223',
      'e224',
      'e226',
      'e227',
      'e228',
    ],
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mencocokkan daftar bahan mentah dengan sepuluh kategori alergen Pasal 49.
 * Menggunakan pencocokan batas kata agar tidak keliru pada potongan kata lain.
 */
export function detectAllergens(ingredientText: string): string[] {
  const normalized = ingredientText.toLowerCase();
  if (!normalized.trim()) {
    return [];
  }

  const found: string[] = [];
  for (const group of ALLERGEN_GROUPS) {
    const matched = group.kataKunci.some((keyword) => {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i');
      return pattern.test(normalized);
    });
    if (matched) {
      found.push(group.kategori);
    }
  }

  return found;
}

export interface IngredientPart {
  teks: string;
  alergen: boolean;
}

const ALLERGEN_KEYWORDS = ALLERGEN_GROUPS.flatMap((group) => group.kataKunci).sort((a, b) => b.length - a.length);
const ALLERGEN_PATTERN = new RegExp(`(?<![a-z0-9])(?:${ALLERGEN_KEYWORDS.map(escapeRegex).join('|')})(?![a-z0-9])`, 'gi');

/** Memotong teks menjadi bagian biasa dan bagian alergen dengan batas kata yang sama. */
export function splitAllergenParts(text: string): IngredientPart[] {
  const parts: IngredientPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(ALLERGEN_PATTERN)) {
    const start = match.index;
    if (start > cursor) parts.push({ teks: text.slice(cursor, start), alergen: false });
    parts.push({ teks: match[0], alergen: true });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ teks: text.slice(cursor), alergen: false });
  return parts;
}

/** Hanya pakai penanda visual jika salinannya cocok dengan daftar bahan saat ini. */
export function validateIngredientFormatting(value: unknown, ingredientText: string): string | undefined {
  if (typeof value !== 'string' || value.length > 3000) return;
  const formatted = value.trim().replace(/\s+/g, ' ');
  if (!formatted) return;
  const parts = formatted.split('**');
  if (parts.length % 2 === 0 || parts.some((part, index) => index % 2 === 1 && !part.trim())) return;
  if (parts.join('') === ingredientText.trim().replace(/\s+/g, ' ')) return formatted;
}

export function findUnboldAllergens(formatted: string): string[] {
  const parts = formatted.split('**');
  const bold: { start: number; end: number }[] = [];
  let cursor = 0;
  parts.forEach((part, index) => {
    if (index % 2 === 1) bold.push({ start: cursor, end: cursor + part.length });
    cursor += part.length;
  });

  cursor = 0;
  const unbold: string[] = [];
  for (const part of splitAllergenParts(parts.join(''))) {
    const end = cursor + part.teks.length;
    if (part.alergen && !bold.some((span) => span.start <= cursor && span.end >= end)) unbold.push(part.teks);
    cursor = end;
  }
  return [...new Set(unbold)];
}
