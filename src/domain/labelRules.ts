import { detectAllergens } from './allergens';
import { LABEL_RULE_METADATA } from './regulations';
import type {
  AdditionalAnswers,
  LabelCheckReport,
  LabelData,
  LabelFieldKey,
  LabelRuleId,
  LabelRuleResult,
  RuleStatus,
} from './types';

const INGREDIENT_PREFIXES = [
  'komposisi',
  'daftar bahan',
  'bahan yang digunakan',
  'bahan-bahan',
] as const;

const INGREDIENT_PREFIX_REGEX =
  /^\s*(komposisi|daftar bahan|bahan yang digunakan|bahan-bahan)\b\s*:?\s*/i;

const STANDALONE_ABBREVIATIONS: Array<{ pattern: RegExp; contoh: string }> = [
  { pattern: /\bmsg\b/i, contoh: 'MSG -> Mononatrium glutamat' },
  { pattern: /\bbtp\b/i, contoh: 'BTP -> tulis nama bahan tambahannya' },
  { pattern: /\bcmc\b/i, contoh: 'CMC -> Karboksimetil selulosa' },
  { pattern: /\btbhq\b/i, contoh: 'TBHQ -> Tersier butilhidrokuinon' },
  { pattern: /\bbha\b/i, contoh: 'BHA -> Butil hidroksianisol' },
  { pattern: /\bbht\b/i, contoh: 'BHT -> Butil hidroksitoluen' },
  { pattern: /\bnacl\b/i, contoh: 'NaCl -> Garam / Natrium klorida' },
  { pattern: /\b(dll|dkk|dsb|sdt|sdm)\b/i, contoh: 'singkatan umum (dll/dkk/sdt/sdm)' },
];

const DOTTED_ABBREVIATION_REGEX =
  /\b(tep|tpg|gl|bhn|mrg|pgl|prst|pwn|pgw|pms|mntg|gr|kt)\./gi;

const ALLOWED_NEGATIVE_BTP_RULES: Array<{
  label: string;
  keyword: string;
  contradictionKeywords: string[];
}> = [
  {
    label: 'tanpa pengawet',
    keyword: 'pengawet',
    contradictionKeywords: [
      'benzoat',
      'natrium benzoat',
      'kalium sorbat',
      'asam sorbat',
      'propionat',
      'nitrit',
      'nitrat',
      'metabisulfit',
      'sulfit',
    ],
  },
  {
    label: 'tanpa pewarna',
    keyword: 'pewarna',
    contradictionKeywords: [
      'tartrazin',
      'ponceau',
      'karmoisin',
      'kuning fcf',
      'biru berlian',
      'pewarna',
    ],
  },
  {
    label: 'tanpa pemanis buatan',
    keyword: 'pemanis buatan',
    contradictionKeywords: [
      'aspartam',
      'sakarin',
      'siklamat',
      'asesulfam',
      'sukralosa',
      'pemanis buatan',
    ],
  },
  {
    label: 'tanpa penguat rasa',
    keyword: 'penguat rasa',
    contradictionKeywords: [
      'mononatrium glutamat',
      'msg',
      'inosinat',
      'guanilat',
      'vetsin',
      'penguat rasa',
    ],
  },
  {
    label: 'tanpa antioksidan',
    keyword: 'antioksidan',
    contradictionKeywords: ['tbhq', 'bha', 'bht', 'tokoferol', 'askorbil'],
  },
];

const HEALTH_CLAIM_PATTERNS = [
  /\bmenyehatkan\b/i,
  /\bmengobati\b/i,
  /\bmenyembuhkan\b/i,
  /\bobat\b/i,
  /\banti[\s-]?penyakit\b/i,
  /\bmencegah penyakit\b/i,
  /\bmencerdaskan\b/i,
  /\bmeningkatkan kecerdasan\b/i,
  /\bmenurunkan kolesterol\b/i,
  /\bmenurunkan gula darah\b/i,
  /\bmenjaga imunitas\b/i,
  /\bmeningkatkan daya tahan tubuh\b/i,
  /\bberkhasiat\b/i,
];

const GENERAL_FREE_BTP_PATTERN =
  /\b(bebas|tanpa|tidak mengandung|non)[\s-]+(bahan tambahan pangan|btp|zat aditif|bahan kimia)\b/i;

const NATURAL_CLAIM_PATTERN = /\b(alami|murni|100%|100 persen|asli|segar)\b/gi;

const ENGLISH_MANDATORY_MARKERS = [
  /\bingredients\s*:/i,
  /\bnet\s*weight\b/i,
  /\bnet\s*wt\b/i,
  /\bbest\s*before\b/i,
  /\bexpired\s*date\b/i,
  /\bmanufactured\s*by\b/i,
  /\bproduced\s*by\b/i,
  /\bcontains\s+allergen\b/i,
  /\bkeep\s+refrigerated\b/i,
];

function makeResult(
  id: LabelRuleId,
  status: RuleStatus,
  penjelasan: string,
  extra?: { saranPerbaikan?: string; contohBenar?: string },
): LabelRuleResult {
  const meta = LABEL_RULE_METADATA[id];
  return {
    id,
    judul: meta.judul,
    status,
    rujukan: meta.rujukan,
    penjelasan,
    ...(extra?.saranPerbaikan ? { saranPerbaikan: extra.saranPerbaikan } : {}),
    ...(extra?.contohBenar ? { contohBenar: extra.contohBenar } : {}),
  };
}

function isUnreadable(label: LabelData, ...fields: LabelFieldKey[]): boolean {
  const flagged = label.unreadableFields;
  if (!flagged?.length) {
    return false;
  }
  return fields.some((field) => flagged.includes(field));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripIngredientPrefix(text: string): string {
  return text.replace(INGREDIENT_PREFIX_REGEX, '').trim();
}

/**
 * Memecah daftar bahan menjadi daftar nama bahan bersih tanpa catatan dalam kurung.
 */
function parseIngredientTokens(daftarBahanTeks: string): string[] {
  const body = stripIngredientPrefix(daftarBahanTeks);
  if (!body) {
    return [];
  }

  return body
    .replace(/\([^)]*\)/g, '')
    .split(/[,;\n]+/)
    .map((part) => normalizeText(part.replace(/\.$/, '')))
    .filter(Boolean);
}

function hasFullDate(text: string): boolean {
  const numericFull = /\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\b/;
  const namedFull =
    /\b\d{1,2}[\s\-]+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|agu|ags|agt|sep|okt|nov|des)[\s\-]+\d{2,4}\b/i;
  return numericFull.test(text) || namedFull.test(text);
}

function hasMonthYear(text: string): boolean {
  if (hasFullDate(text)) {
    return true;
  }
  const numericMY = /\b(0?[1-9]|1[0-2])[\/.\-]\d{2,4}\b/;
  const namedMY =
    /\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|agu|ags|agt|sep|okt|nov|des)[\s\-\/]+\d{2,4}\b/i;
  return numericMY.test(text) || namedMY.test(text);
}

function containsAnyKeyword(haystack: string, keywords: string[]): string | undefined {
  const lower = haystack.toLowerCase();
  return keywords.find((kw) => lower.includes(kw));
}

function checkL01(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'namaProduk')) {
    return makeResult(
      'L-01',
      'tidak_bisa_dicek',
      'Nama jenis pangan belum terbaca jelas dari foto.',
      { saranPerbaikan: 'Periksa kemasan dan ketik nama jenis pangan secara manual.' },
    );
  }
  if (!label.namaProduk.trim()) {
    return makeResult('L-01', 'kurang', 'Nama jenis pangan belum tercantum pada label.', {
      saranPerbaikan: 'Cantumkan nama jenis pangan yang jelas (bukan hanya merek dagang).',
      contohBenar: 'Keripik Pisang Manis',
    });
  }
  return makeResult('L-01', 'lengkap', 'Nama jenis pangan sudah tercantum.');
}

function checkL02(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'daftarBahanTeks')) {
    return makeResult(
      'L-02',
      'tidak_bisa_dicek',
      'Daftar bahan belum terbaca jelas dari foto.',
      { saranPerbaikan: 'Ketik ulang daftar bahan seperti yang tertera pada kemasan.' },
    );
  }
  const raw = label.daftarBahanTeks.trim();
  if (!raw) {
    return makeResult('L-02', 'kurang', 'Daftar bahan belum tercantum.', {
      saranPerbaikan: `Awali daftar bahan dengan salah satu kata: ${INGREDIENT_PREFIXES.join(', ')}.`,
      contohBenar: 'Komposisi: singkong, minyak kelapa sawit, garam.',
    });
  }
  const hasPrefix = INGREDIENT_PREFIX_REGEX.test(raw);
  const body = stripIngredientPrefix(raw);
  if (!hasPrefix || !body) {
    return makeResult(
      'L-02',
      'kurang',
      'Daftar bahan belum diawali frasa pembuka resmi atau isinya masih kosong.',
      {
        saranPerbaikan:
          'Gunakan awalan "Komposisi:", "Daftar bahan:", "Bahan yang digunakan:", atau "Bahan-bahan:".',
        contohBenar: `Komposisi: ${body || 'singkong, minyak goreng, gula pasir, garam.'}`,
      },
    );
  }
  return makeResult('L-02', 'lengkap', 'Daftar bahan sudah diawali frasa pembuka sesuai ketentuan.');
}

function checkL03(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  if (isUnreadable(label, 'daftarBahanTeks') || !label.daftarBahanTeks.trim()) {
    return makeResult(
      'L-03',
      'tidak_bisa_dicek',
      'Urutan bahan tidak bisa dicek karena daftar bahan belum tersedia.',
    );
  }

  const validRecipe = answers.resep.filter(
    (item) => item.nama.trim().length > 0 && Number.isFinite(item.jumlahGram) && item.jumlahGram > 0,
  );
  if (validRecipe.length < 2) {
    return makeResult(
      'L-03',
      'tidak_bisa_dicek',
      'Takaran resep minimal dua bahan utama belum diisi untuk membandingkan urutan terbanyak.',
      { saranPerbaikan: 'Isi bahan dan takaran sekali produksi di pertanyaan tambahan.' },
    );
  }

  const labelTokens = parseIngredientTokens(label.daftarBahanTeks);
  const sortedRecipe = [...validRecipe].sort((a, b) => b.jumlahGram - a.jumlahGram);

  const matchedPositions: Array<{ nama: string; gram: number; labelIndex: number }> = [];
  for (const recipeItem of sortedRecipe) {
    const target = normalizeText(recipeItem.nama);
    const idx = labelTokens.findIndex(
      (token) => token === target || token.includes(target) || target.includes(token),
    );
    if (idx !== -1) {
      matchedPositions.push({ nama: recipeItem.nama, gram: recipeItem.jumlahGram, labelIndex: idx });
    }
  }

  if (matchedPositions.length < 2) {
    return makeResult(
      'L-03',
      'tidak_bisa_dicek',
      'Nama bahan di resep belum cukup cocok dengan teks daftar bahan pada label.',
      { saranPerbaikan: 'Samakan penulisan nama bahan utama pada resep dan label.' },
    );
  }

  for (let i = 0; i < matchedPositions.length; i++) {
    const heavier = matchedPositions[i];
    if (!heavier) continue;
    for (let j = i + 1; j < matchedPositions.length; j++) {
      const lighter = matchedPositions[j];
      if (!lighter) continue;
      // Bahan dengan takaran sama boleh saling bertukar posisi.
      if (heavier.gram > lighter.gram && heavier.labelIndex > lighter.labelIndex) {
        return makeResult(
          'L-03',
          'kurang',
          `Urutan bahan tidak sesuai bobot resep: "${heavier.nama}" (${heavier.gram} g) seharusnya ditulis sebelum "${lighter.nama}" (${lighter.gram} g).`,
          {
            saranPerbaikan: 'Susun ulang daftar bahan mulai dari bahan dengan takaran paling banyak.',
            contohBenar: `Komposisi: ${sortedRecipe.map((item) => item.nama.trim()).join(', ')}.`,
          },
        );
      }
    }
  }

  return makeResult(
    'L-03',
    'lengkap',
    'Urutan bahan di label sudah sesuai urutan jumlah terbanyak pada resep.',
  );
}

function checkL04(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'daftarBahanTeks') || !label.daftarBahanTeks.trim()) {
    return makeResult(
      'L-04',
      'tidak_bisa_dicek',
      'Penulisan singkatan bahan belum bisa dicek karena daftar bahan belum tersedia.',
    );
  }

  const body = stripIngredientPrefix(label.daftarBahanTeks);
  const issues: string[] = [];

  for (const abbr of STANDALONE_ABBREVIATIONS) {
    const match = body.match(abbr.pattern);
    if (!match) continue;
    // Izinkan jika singkatan hanya muncul di dalam tanda kurung setelah kepanjangannya.
    const withoutParens = body.replace(/\([^)]*\)/g, '');
    if (abbr.pattern.test(withoutParens)) {
      issues.push(abbr.contoh);
    }
  }

  const dottedMatches = body.match(DOTTED_ABBREVIATION_REGEX);
  if (dottedMatches?.length) {
    issues.push(`singkatan bertitik (${[...new Set(dottedMatches)].join(', ')})`);
  }

  if (issues.length > 0) {
    return makeResult(
      'L-04',
      'kurang',
      `Ditemukan singkatan pada daftar bahan: ${issues.join('; ')}.`,
      {
        saranPerbaikan: 'Tulis seluruh nama bahan secara lengkap dalam bahasa Indonesia.',
        contohBenar: 'tepung terigu, margarin, mononatrium glutamat',
      },
    );
  }

  return makeResult('L-04', 'lengkap', 'Seluruh nama bahan sudah ditulis lengkap tanpa singkatan.');
}

function checkL05(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'beratBersihTeks')) {
    return makeResult(
      'L-05',
      'tidak_bisa_dicek',
      'Berat bersih atau isi bersih belum terbaca jelas dari foto.',
    );
  }

  const raw = label.beratBersihTeks.trim();
  if (!raw) {
    return makeResult('L-05', 'kurang', 'Berat bersih atau isi bersih belum tercantum.', {
      saranPerbaikan: 'Cantumkan berat bersih atau isi bersih memakai satuan g, kg, ml, atau L.',
      contohBenar: 'Berat bersih: 150 g',
    });
  }

  const validMetric = /\b\d+(?:[.,]\d+)?\s?(g|kg|ml|mL|l|L)\b/;
  if (!validMetric.test(raw)) {
    return makeResult(
      'L-05',
      'kurang',
      `Penulisan "${raw}" belum memakai simbol satuan metrik baku (g, kg, ml, atau L).`,
      {
        saranPerbaikan: 'Ganti satuan tidak baku (seperti gr, gram, ons, liter) dengan g, kg, ml, atau L.',
        contohBenar: 'Berat bersih: 250 g (atau Isi bersih: 250 ml)',
      },
    );
  }

  return makeResult('L-05', 'lengkap', 'Berat bersih atau isi bersih sudah memakai satuan metrik.');
}

function checkL06(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'namaProdusen', 'alamatProdusen')) {
    return makeResult(
      'L-06',
      'tidak_bisa_dicek',
      'Nama atau alamat produsen belum terbaca jelas dari foto.',
    );
  }

  const missing: string[] = [];
  const nama = label.namaProdusen.trim();
  const alamat = label.alamatProdusen.trim();

  if (!nama) missing.push('nama produsen');
  if (!alamat) {
    missing.push('alamat produsen');
  } else {
    const hasPostal = /\b\d{5}\b/.test(alamat);
    const hasIndonesia = /\bindonesia\b/i.test(alamat);
    const hasExplicitCity = /\b(kota|kab\.?|kabupaten)\s+[a-z]{2,}/i.test(alamat);
    const commaParts = alamat
      .replace(/\b\d{5}\b/g, '')
      .replace(/\bindonesia\b/gi, '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length >= 3);

    if (!hasExplicitCity && commaParts.length === 0) missing.push('nama kota/kabupaten');
    if (!hasPostal) missing.push('kode pos 5 digit');
    if (!hasIndonesia) missing.push('kata "Indonesia"');
  }

  if (missing.length > 0) {
    return makeResult(
      'L-06',
      'kurang',
      `Identitas produsen belum lengkap, masih kurang: ${missing.join(', ')}.`,
      {
        saranPerbaikan:
          'Lengkapi nama produsen serta alamat yang memuat minimal nama kota/kabupaten, kode pos, dan Indonesia.',
        contohBenar: 'Diproduksi oleh: Dapur Bu Rina, Kota Bandung 40115, Indonesia',
      },
    );
  }

  return makeResult(
    'L-06',
    'lengkap',
    'Nama produsen dan komponen alamat (kota, kode pos, Indonesia) sudah tercantum.',
  );
}

function checkL07(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  const halalText = label.keteranganHalalTeks.trim();
  const mentionsHalalInClaims = label.pernyataanLain.some((item) => /\bhalal\b/i.test(item));
  const hasHalalOnLabel = Boolean(halalText) || mentionsHalalInClaims;

  if (!hasHalalOnLabel) {
    if (isUnreadable(label, 'keteranganHalalTeks')) {
      return makeResult(
        'L-07',
        'tidak_bisa_dicek',
        'Status keterangan halal belum terbaca jelas dari foto.',
      );
    }
    return makeResult(
      'L-07',
      'lengkap',
      'Tidak mencantumkan keterangan halal tanpa sertifikat.',
    );
  }

  if (answers.punyaSertifikatHalal === false) {
    return makeResult(
      'L-07',
      'kurang',
      'Label mencantumkan keterangan atau logo halal, padahal produk belum memiliki sertifikat halal resmi.',
      {
        saranPerbaikan:
          'Hapus tulisan dan logo halal dari rancangan label sampai sertifikat halal terbit.',
      },
    );
  }

  if (answers.punyaSertifikatHalal == null) {
    return makeResult(
      'L-07',
      'tidak_bisa_dicek',
      'Keterangan halal terdeteksi di label, namun kepemilikan sertifikat halal belum dikonfirmasi.',
      { saranPerbaikan: 'Jawab pertanyaan sertifikat halal agar status butir ini dapat dipastikan.' },
    );
  }

  return makeResult(
    'L-07',
    'lengkap',
    'Keterangan halal tercantum dan sesuai dengan kepemilikan sertifikat halal.',
  );
}

function checkL08(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'kodeProduksiTeks', 'tanggalProduksiTeks')) {
    return makeResult(
      'L-08',
      'tidak_bisa_dicek',
      'Tanggal atau kode produksi belum terbaca jelas dari foto.',
    );
  }

  const kode = label.kodeProduksiTeks.trim();
  const tanggal = label.tanggalProduksiTeks.trim();
  const embeddedDateInCode = /(\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b|\b\d{6,8}\b)/.test(kode);

  if (!kode && !tanggal) {
    return makeResult('L-08', 'kurang', 'Tanggal dan kode produksi belum tercantum.', {
      saranPerbaikan: 'Cantumkan tanggal produksi sekaligus kode produksi/batch.',
      contohBenar: 'Kode produksi: 131126-B1 (Tanggal produksi: 13 Nov 2026)',
    });
  }

  if (!kode || (!tanggal && !embeddedDateInCode)) {
    return makeResult(
      'L-08',
      'kurang',
      'Salah satu dari tanggal produksi atau kode produksi/batch masih belum lengkap.',
      {
        saranPerbaikan: 'Pastikan tanggal produksi dan kode batch produksi keduanya tertulis jelas.',
        contohBenar: 'Tanggal/Kode produksi: 13/11/2026 - B01',
      },
    );
  }

  return makeResult('L-08', 'lengkap', 'Tanggal dan kode produksi sudah tercantum.');
}

function checkL09(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'kedaluwarsaTeks')) {
    return makeResult(
      'L-09',
      'tidak_bisa_dicek',
      'Keterangan kedaluwarsa belum terbaca jelas dari foto.',
    );
  }

  const raw = label.kedaluwarsaTeks.trim();
  if (!raw) {
    return makeResult('L-09', 'kurang', 'Keterangan kedaluwarsa belum tercantum.', {
      saranPerbaikan: 'Cantumkan kedaluwarsa diawali frasa resmi "Baik digunakan sebelum".',
      contohBenar: 'Baik digunakan sebelum: 13 Des 2026',
    });
  }

  if (!/^\s*baik digunakan sebelum\b/i.test(raw)) {
    return makeResult(
      'L-09',
      'kurang',
      `Keterangan "${raw}" belum diawali frasa resmi "Baik digunakan sebelum".`,
      {
        saranPerbaikan: 'Ganti awalan seperti "Exp", "Expired", atau "Kadaluarsa" dengan "Baik digunakan sebelum".',
        contohBenar: 'Baik digunakan sebelum: 13 Des 2026',
      },
    );
  }

  return makeResult('L-09', 'lengkap', 'Kedaluwarsa sudah diawali frasa "Baik digunakan sebelum".');
}

function checkL10(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  if (isUnreadable(label, 'kedaluwarsaTeks') || !label.kedaluwarsaTeks.trim()) {
    return makeResult(
      'L-10',
      'tidak_bisa_dicek',
      'Format tanggal kedaluwarsa belum bisa diperiksa karena teks kedaluwarsa belum tersedia.',
    );
  }

  if (answers.umurSimpanHari === null) {
    return makeResult(
      'L-10',
      'tidak_bisa_dicek',
      'Perkiraan umur simpan belum diisi untuk menentukan kelengkapan tanggal kedaluwarsa.',
      { saranPerbaikan: 'Isi umur simpan produk (dalam hari) pada pertanyaan tambahan.' },
    );
  }

  const raw = label.kedaluwarsaTeks.trim();
  if (answers.umurSimpanHari <= 90) {
    if (!hasFullDate(raw)) {
      return makeResult(
        'L-10',
        'kurang',
        `Untuk umur simpan ${answers.umurSimpanHari} hari (sampai 3 bulan), kedaluwarsa wajib memuat tanggal, bulan, dan tahun lengkap.`,
        {
          saranPerbaikan: 'Tulis tanggal, bulan, dan tahun secara lengkap.',
          contohBenar: 'Baik digunakan sebelum: 25 Nov 2026',
        },
      );
    }
    return makeResult(
      'L-10',
      'lengkap',
      'Format kedaluwarsa sudah memuat tanggal, bulan, dan tahun lengkap.',
    );
  }

  if (!hasMonthYear(raw)) {
    return makeResult(
      'L-10',
      'kurang',
      'Untuk umur simpan lebih dari 3 bulan, kedaluwarsa minimal memuat bulan dan tahun.',
      {
        saranPerbaikan: 'Lengkapi keterangan kedaluwarsa minimal dengan bulan dan tahun.',
        contohBenar: 'Baik digunakan sebelum: Nov 2027',
      },
    );
  }

  return makeResult('L-10', 'lengkap', 'Format bulan dan tahun kedaluwarsa sudah sesuai umur simpan.');
}

function checkL11(label: LabelData): LabelRuleResult {
  if (isUnreadable(label, 'nomorIzinTeks')) {
    return makeResult(
      'L-11',
      'tidak_bisa_dicek',
      'Tulisan atau nomor P-IRT belum terbaca jelas dari foto.',
    );
  }

  const raw = label.nomorIzinTeks.trim();
  if (!raw) {
    return makeResult('L-11', 'kurang', 'Tulisan "P-IRT" belum tercantum pada label.', {
      saranPerbaikan: 'Sediakan ruang dan cantumkan tulisan "P-IRT" sesuai nomor izin produksi rumah tangga.',
      contohBenar: 'P-IRT 2053273010123-29',
    });
  }

  if (!/\bP-IRT\b/i.test(raw)) {
    return makeResult(
      'L-11',
      'kurang',
      `Teks izin "${raw}" belum memuat tulisan baku "P-IRT" (dengan tanda hubung).`,
      {
        saranPerbaikan: 'Gunakan penulisan baku "P-IRT" diikuti nomor izin resmi dari dinas.',
        contohBenar: 'P-IRT 2053273010123-29',
      },
    );
  }

  return makeResult('L-11', 'lengkap', 'Tulisan "P-IRT" sudah tercantum.');
}

function checkL12(
  label: LabelData,
  detectedAllergens: string[],
): LabelRuleResult {
  if (isUnreadable(label, 'daftarBahanTeks', 'pernyataanAlergenTeks')) {
    return makeResult(
      'L-12',
      'tidak_bisa_dicek',
      'Daftar bahan atau pernyataan alergen belum terbaca jelas dari foto.',
    );
  }

  if (detectedAllergens.length === 0) {
    return makeResult(
      'L-12',
      'lengkap',
      'Tidak terdeteksi bahan dari 10 kelompok alergen Pasal 49 pada daftar bahan.',
    );
  }

  const normalized = normalizeText(label.pernyataanAlergenTeks);
  const hasMandatoryPhrase =
    normalized.includes('mengandung alergen') &&
    normalized.includes('lihat daftar bahan yang dicetak tebal');

  if (!hasMandatoryPhrase) {
    return makeResult(
      'L-12',
      'kurang',
      `Daftar bahan memuat potensi alergen (${detectedAllergens.join(', ')}), tetapi kalimat peringatan alergen resmi belum tercantum.`,
      {
        saranPerbaikan:
          'Tambahkan kalimat persis: "Mengandung alergen, lihat daftar bahan yang dicetak tebal."',
        contohBenar: 'Mengandung alergen, lihat daftar bahan yang dicetak tebal.',
      },
    );
  }

  return makeResult(
    'L-12',
    'lengkap',
    `Pernyataan alergen sudah tercantum untuk alergen terdeteksi (${detectedAllergens.join(', ')}).`,
  );
}

function checkL13(detectedAllergens: string[]): LabelRuleResult {
  if (detectedAllergens.length > 0) {
    return makeResult(
      'L-13',
      'tidak_bisa_dicek',
      `Ketebalan huruf tidak dapat dipastikan dari foto/teks polos. Pastikan bahan terkait (${detectedAllergens.join(', ')}) dicetak tebal pada daftar bahan.`,
      {
        saranPerbaikan: 'Periksa berkas desain cetak agar setiap bahan alergen memakai huruf tebal (bold).',
        contohBenar: 'Komposisi: **tepung terigu**, gula pasir, **telur**, minyak nabati.',
      },
    );
  }

  return makeResult(
    'L-13',
    'tidak_bisa_dicek',
    'Ketebalan cetak alergen tidak bisa dicek dari foto. Pastikan jika ada bahan turunan alergen, namanya dicetak tebal.',
  );
}

function checkL14(): LabelRuleResult {
  return makeResult(
    'L-14',
    'tidak_bisa_dicek',
    'Ukuran fisik huruf tidak bisa diukur dari foto. Pastikan ukuran minimal 1 mm dan nama produk serta peringatan minimal 2 mm sebelum dicetak.',
    {
      saranPerbaikan: 'Ukur langsung pada file desain ukuran cetak 1:1 (skala 100%) atau uji cetak satu lembar.',
    },
  );
}

function collectClaimTexts(label: LabelData): string {
  return [label.namaProduk, ...label.pernyataanLain].filter(Boolean).join(' | ');
}

function checkL15(label: LabelData): LabelRuleResult {
  const combined = collectClaimTexts(label);
  for (const pattern of HEALTH_CLAIM_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      return makeResult(
        'L-15',
        'kurang',
        `Ditemukan pernyataan yang mengarah pada klaim kesehatan atau pengobatan ("${match[0]}").`,
        {
          saranPerbaikan:
            'Hapus kata yang menyatakan produk menyehatkan, mengobati, atau meningkatkan kecerdasan.',
        },
      );
    }
  }

  if (isUnreadable(label, 'pernyataanLain')) {
    return makeResult(
      'L-15',
      'tidak_bisa_dicek',
      'Sebagian pernyataan di kemasan belum terbaca jelas untuk memeriksa klaim kesehatan.',
    );
  }

  return makeResult('L-15', 'lengkap', 'Tidak ditemukan klaim kesehatan, obat, atau kecerdasan.');
}

function checkL16(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  const claimText = collectClaimTexts(label);
  const negativeMatches = claimText.match(
    /\b(tanpa|bebas|tidak menggunakan|non)[\s-]+([a-z]+(?:\s+[a-z]+)?)/gi,
  );

  if (!negativeMatches?.length) {
    return makeResult('L-16', 'lengkap', 'Tidak ada klaim negatif bahan tambahan pangan.');
  }

  const ingredientAndRecipe = [
    label.daftarBahanTeks,
    ...answers.resep.map((item) => item.nama),
  ].join(' ');

  for (const rawPhrase of negativeMatches) {
    if (GENERAL_FREE_BTP_PATTERN.test(rawPhrase)) {
      // Ditangani oleh aturan L-17.
      continue;
    }

    const lowerPhrase = normalizeText(rawPhrase);
    const matchedCategory = ALLOWED_NEGATIVE_BTP_RULES.find((rule) =>
      lowerPhrase.includes(rule.keyword),
    );

    if (!matchedCategory) {
      // Hanya tangkap klaim seputar BTP di luar lima golongan (mis. pengemulsi, penstabil, perisa).
      if (/(pengemulsi|penstabil|perisa|pengental|pengembang|antikempal|btp)/i.test(lowerPhrase)) {
        return makeResult(
          'L-16',
          'kurang',
          `Pernyataan "${rawPhrase}" bukan termasuk lima jenis bahan tambahan pangan yang diizinkan untuk klaim negatif (pengawet, pewarna, pemanis buatan, penguat rasa, antioksidan).`,
          {
            saranPerbaikan: 'Hapus klaim negatif untuk golongan bahan tambahan selain lima jenis yang diizinkan.',
          },
        );
      }
      continue;
    }

    const contradiction = containsAnyKeyword(
      ingredientAndRecipe,
      matchedCategory.contradictionKeywords,
    );
    if (contradiction) {
      return makeResult(
        'L-16',
        'kurang',
        `Label mencantumkan "${rawPhrase}", tetapi daftar bahan atau resep masih memuat "${contradiction}".`,
        {
          saranPerbaikan: `Hapus pernyataan "${rawPhrase}" karena bertentangan dengan komposisi produk.`,
        },
      );
    }

    if (answers.resep.length === 0) {
      return makeResult(
        'L-16',
        'tidak_bisa_dicek',
        `Klaim "${rawPhrase}" hanya sah bila seluruh bahan di resep benar-benar tidak mengandung ${matchedCategory.keyword}.`,
        { saranPerbaikan: 'Lengkapi seluruh bahan resep pada pertanyaan tambahan untuk memastikan kebenarannya.' },
      );
    }
  }

  return makeResult(
    'L-16',
    'lengkap',
    'Keterangan negatif bahan tambahan pangan sesuai kategori dan komposisi produk.',
  );
}

function checkL17(label: LabelData): LabelRuleResult {
  const claimText = collectClaimTexts(label);
  const match = claimText.match(GENERAL_FREE_BTP_PATTERN);

  if (match) {
    return makeResult(
      'L-17',
      'kurang',
      `Ditemukan pernyataan umum yang dilarang: "${match[0]}".`,
      {
        saranPerbaikan:
          'Hapus frasa umum "bebas BTP" atau "tanpa bahan tambahan pangan". Gunakan pernyataan khusus hanya jika memenuhi syarat Pasal 24.',
      },
    );
  }

  if (isUnreadable(label, 'pernyataanLain')) {
    return makeResult(
      'L-17',
      'tidak_bisa_dicek',
      'Sebagian pernyataan di kemasan belum terbaca jelas untuk memeriksa larangan frasa bebas BTP.',
    );
  }

  return makeResult('L-17', 'lengkap', 'Tidak ditemukan pernyataan umum bebas bahan tambahan pangan.');
}

function checkL18(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  const claimText = collectClaimTexts(label);
  const matches = claimText.match(NATURAL_CLAIM_PATTERN);

  if (!matches?.length) {
    return makeResult(
      'L-18',
      'lengkap',
      'Tidak menggunakan kata "alami", "murni", "100%", "asli", atau "segar".',
    );
  }

  const uniqueWords = [...new Set(matches.map((word) => word.toLowerCase()))];
  const ingredientAndRecipe = [
    label.daftarBahanTeks,
    ...answers.resep.map((item) => item.nama),
  ].join(' ');
  const syntheticFound = containsAnyKeyword(ingredientAndRecipe, [
    'perisa sintetis',
    'pewarna sintetis',
    'tartrazin',
    'benzoat',
    'kalium sorbat',
    'aspartam',
    'sakarin',
    'siklamat',
    'msg',
    'mononatrium glutamat',
    'tbhq',
    'bha',
    'bht',
  ]);

  if (syntheticFound) {
    return makeResult(
      'L-18',
      'kurang',
      `Kata ${uniqueWords.map((w) => `"${w}"`).join(', ')} tercantum pada label, tetapi komposisi atau resep memuat bahan tambahan sintetis ("${syntheticFound}").`,
      {
        saranPerbaikan:
          'Hapus kata tersebut atau pastikan seluruh proses dan komposisi memenuhi syarat Pasal 63.',
      },
    );
  }

  const ingredientCount = parseIngredientTokens(label.daftarBahanTeks).length;
  if (
    uniqueWords.some((word) => word === 'murni' || word === '100%' || word === '100 persen') &&
    ingredientCount > 1
  ) {
    return makeResult(
      'L-18',
      'kurang',
      'Kata "murni" atau "100%" umumnya hanya untuk produk tunggal tanpa bahan tambahan atau campuran lain.',
      {
        saranPerbaikan: 'Hapus kata "murni" atau "100%" bila produk terdiri atas beberapa bahan campuran.',
      },
    );
  }

  return makeResult(
    'L-18',
    'tidak_bisa_dicek',
    `Kata bersyarat (${uniqueWords.join(', ')}) tercantum pada label. Pemakaiannya wajib memenuhi syarat bahan dan proses pengolahan pada Pasal 63.`,
    {
      saranPerbaikan: 'Pastikan tidak ada campuran bahan tambahan sintetis atau proses yang menyalahi syarat Pasal 63.',
    },
  );
}

function checkL19(label: LabelData, answers: AdditionalAnswers): LabelRuleResult {
  if (isUnreadable(label, 'caraPenyimpananTeks')) {
    return makeResult(
      'L-19',
      'tidak_bisa_dicek',
      'Petunjuk cara penyimpanan belum terbaca jelas dari foto.',
    );
  }

  const hasStorage = Boolean(label.caraPenyimpananTeks.trim());
  if (answers.bergantungCaraSimpan === false) {
    return makeResult(
      'L-19',
      'lengkap',
      'Umur simpan produk tidak bergantung pada cara penyimpanan khusus.',
    );
  }

  if (answers.bergantungCaraSimpan === true) {
    if (!hasStorage) {
      return makeResult(
        'L-19',
        'kurang',
        'Umur simpan bergantung pada cara penyimpanan, tetapi petunjuk penyimpanan belum tercantum.',
        {
          saranPerbaikan: 'Tambahkan petunjuk penyimpanan yang jelas pada kemasan.',
          contohBenar: 'Simpan di tempat sejuk dan kering (atau Simpan pada suhu 4°C).',
        },
      );
    }
    return makeResult('L-19', 'lengkap', 'Petunjuk cara penyimpanan sudah tercantum.');
  }

  if (hasStorage) {
    return makeResult('L-19', 'lengkap', 'Petunjuk cara penyimpanan sudah tercantum.');
  }

  return makeResult(
    'L-19',
    'tidak_bisa_dicek',
    'Belum diketahui apakah umur simpan produk bergantung pada cara penyimpanan.',
    { saranPerbaikan: 'Jawab pertanyaan tentang cara penyimpanan pada langkah pertanyaan tambahan.' },
  );
}

function checkL20(label: LabelData): LabelRuleResult {
  const combined = [
    label.daftarBahanTeks,
    label.beratBersihTeks,
    label.kedaluwarsaTeks,
    label.alamatProdusen,
    label.pernyataanAlergenTeks,
    label.caraPenyimpananTeks,
  ]
    .filter(Boolean)
    .join(' ');

  if (!combined.trim()) {
    return makeResult(
      'L-20',
      'tidak_bisa_dicek',
      'Keterangan label belum cukup tersedia untuk memeriksa penggunaan bahasa Indonesia.',
    );
  }

  const matchedForeign = ENGLISH_MANDATORY_MARKERS.filter((pattern) => pattern.test(combined));
  if (matchedForeign.length > 0) {
    return makeResult(
      'L-20',
      'kurang',
      'Ditemukan keterangan wajib berbahasa asing (misalnya "Ingredients", "Net weight", atau "Best before").',
      {
        saranPerbaikan: 'Tulis seluruh keterangan wajib dalam bahasa Indonesia.',
        contohBenar: 'Komposisi, Berat bersih, Baik digunakan sebelum, Diproduksi oleh.',
      },
    );
  }

  return makeResult('L-20', 'lengkap', 'Keterangan wajib sudah ditulis dalam bahasa Indonesia.');
}

/** Membuat objek LabelData kosong sebagai nilai awal formulir atau fallback manual. */
export function createEmptyLabelData(): LabelData {
  return {
    namaProduk: '',
    daftarBahanTeks: '',
    beratBersihTeks: '',
    namaProdusen: '',
    alamatProdusen: '',
    keteranganHalalTeks: '',
    kodeProduksiTeks: '',
    tanggalProduksiTeks: '',
    kedaluwarsaTeks: '',
    nomorIzinTeks: '',
    pernyataanAlergenTeks: '',
    caraPenyimpananTeks: '',
    pernyataanLain: [],
    unreadableFields: [],
  };
}

/** Membuat objek jawaban tambahan kosong sebagai nilai awal. */
export function createEmptyAnswers(): AdditionalAnswers {
  return {
    resep: [],
    umurSimpanHari: null,
    bergantungCaraSimpan: null,
    punyaSertifikatHalal: null,
  };
}

/**
 * Memeriksa seluruh 20 butir aturan label (L-01 sampai L-20)
 * secara deterministik terhadap data label yang telah disahkan pengguna.
 */
export function evaluateLabelRules(
  label: LabelData,
  answers: AdditionalAnswers = createEmptyAnswers(),
): LabelCheckReport {
  const detectedAllergens = isUnreadable(label, 'daftarBahanTeks')
    ? []
    : detectAllergens(label.daftarBahanTeks);

  const hasil: LabelRuleResult[] = [
    checkL01(label),
    checkL02(label),
    checkL03(label, answers),
    checkL04(label),
    checkL05(label),
    checkL06(label),
    checkL07(label, answers),
    checkL08(label),
    checkL09(label),
    checkL10(label, answers),
    checkL11(label),
    checkL12(label, detectedAllergens),
    checkL13(detectedAllergens),
    checkL14(),
    checkL15(label),
    checkL16(label, answers),
    checkL17(label),
    checkL18(label, answers),
    checkL19(label, answers),
    checkL20(label),
  ];

  const ringkasan = {
    lengkap: hasil.filter((item) => item.status === 'lengkap').length,
    kurang: hasil.filter((item) => item.status === 'kurang').length,
    tidakBisaDicek: hasil.filter((item) => item.status === 'tidak_bisa_dicek').length,
  };

  return {
    hasil,
    ringkasan,
    alergenTerdeteksi: detectedAllergens,
    siapCetak: ringkasan.kurang === 0,
  };
}
