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
