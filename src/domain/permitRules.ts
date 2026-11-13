import { PERMIT_RULE_METADATA } from './regulations';
import type {
  AdditionalAnswers,
  LabelData,
  PermitPathOutcome,
  PermitPathResult,
  PermitRuleId,
  PermitRuleImpact,
  PermitRuleResult,
  RegulationReference,
} from './types';

/** Batas umur simpan (hari) untuk pengecualian I-01. Pasal 3: "kurang dari 7 hari". */
export const PERMIT_SHELF_LIFE_EXEMPT_DAYS = 7;

/**
 * Pola klaim gizi dan klaim kesehatan untuk aturan I-05.
 * Keterangan "tanpa pengawet" dan sejenisnya bukan klaim gizi atau kesehatan,
 * sehingga ditangani aturan label L-16, bukan di sini.
 */
const CLAIM_PATTERNS: RegExp[] = [
  /\bmenyehatkan\b/i,
  /\bmengobati\b/i,
  /\bmenyembuhkan\b/i,
  /\bobat\b/i,
  /\bmencegah\s+penyakit\b/i,
  /\banti[\s-]?(penyakit|kanker|diabetes|kolesterol)\b/i,
  /\bmencerdaskan\b/i,
  /\bmeningkatkan\s+(kecerdasan|daya tahan tubuh|stamina|imunitas)\b/i,
  /\bmenjaga\s+(imunitas|daya tahan tubuh|kesehatan)\b/i,
  /\bmenurunkan\s+(kolesterol|gula darah|tekanan darah|berat badan)\b/i,
  /\bberkhasiat\b/i,
  /\bbaik\s+untuk\s+(kesehatan|jantung|pencernaan|diet|penderita)\b/i,
  /\b(tinggi|kaya|sumber|diperkaya|kaya akan)\s+(protein|serat|kalsium|vitamin|mineral|zat besi|omega|antioksidan|energi)\b/i,
  /\b(rendah|bebas|tanpa|tidak mengandung|nol)\s+(gula|garam|lemak|kalori|kolesterol|natrium|gluten|laktosa)\b/i,
  /\b(sugar[\s-]?free|low[\s-]?(sugar|fat|calorie|salt)|high[\s-]?(protein|fiber|fibre)|gluten[\s-]?free)\b/i,
];

function makeRule(
  id: PermitRuleId,
  dampak: PermitRuleImpact,
  penjelasan: string,
): PermitRuleResult {
  const meta = PERMIT_RULE_METADATA[id];
  return { id, judul: meta.judul, dampak, rujukan: meta.rujukan, penjelasan };
}

/** Mengambil klaim gizi atau kesehatan dari nama produk dan pernyataan lain pada label. */
export function detectLabelClaims(label: Pick<LabelData, 'namaProduk' | 'pernyataanLain'>): string[] {
  const texts = [label.namaProduk, ...label.pernyataanLain].filter((text) => text.trim());
  const found: string[] = [];
  for (const text of texts) {
    for (const pattern of CLAIM_PATTERNS) {
      const match = text.match(pattern);
      if (match && !found.some((item) => item.toLowerCase() === match[0].toLowerCase())) {
        found.push(match[0]);
      }
    }
  }
  return found;
}

function isValidShelfLife(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function checkI01(answers: AdditionalAnswers): PermitRuleResult {
  if (!isValidShelfLife(answers.umurSimpanHari)) {
    return makeRule(
      'I-01',
      'belum_dijawab',
      'Umur simpan belum diisi, jadi belum diketahui apakah produk dikecualikan dari SPP-IRT.',
    );
  }
  if (answers.umurSimpanHari < PERMIT_SHELF_LIFE_EXEMPT_DAYS) {
    return makeRule(
      'I-01',
      'membebaskan',
      `Umur simpan ${answers.umurSimpanHari} hari, kurang dari 7 hari. Produk seperti ini tidak wajib SPP-IRT.`,
    );
  }
  return makeRule(
    'I-01',
    'tidak_berlaku',
    `Umur simpan ${answers.umurSimpanHari} hari, tidak kurang dari 7 hari, jadi pengecualian ini tidak berlaku.`,
  );
}

function checkI02(answers: AdditionalAnswers): PermitRuleResult {
  if (answers.panganSiapSaji === true) {
    return makeRule(
      'I-02',
      'membebaskan',
      'Produk berupa pangan siap saji. Pangan siap saji tidak wajib SPP-IRT.',
    );
  }
  if (answers.panganSiapSaji === false) {
    return makeRule('I-02', 'tidak_berlaku', 'Produk bukan pangan siap saji.');
  }
  return makeRule(
    'I-02',
    'perlu_dicek',
    'Belum dipastikan apakah produk termasuk pangan siap saji (misalnya makanan jadi yang langsung dimakan, seperti nasi kotak). Bila ya, produk tidak wajib SPP-IRT.',
  );
}

function checkI03(answers: AdditionalAnswers): PermitRuleResult {
  if (answers.produksiDiRumah === true) {
    return makeRule(
      'I-03',
      'memenuhi',
      'Produksi dilakukan di rumah tinggal atau rumah toko yang ditinggali pemilik.',
    );
  }
  if (answers.produksiDiRumah === false) {
    return makeRule(
      'I-03',
      'menghalangi',
      'Produksi tidak dilakukan di rumah tinggal atau rumah toko yang ditinggali pemilik, jadi tidak termasuk industri rumah tangga.',
    );
  }
  return makeRule(
    'I-03',
    'perlu_dicek',
    'Pastikan produksi dilakukan di rumah tinggal atau rumah toko yang juga ditinggali pemilik.',
  );
}

function checkI04(answers: AdditionalAnswers): PermitRuleResult {
  switch (answers.alatProduksi) {
    case 'manual':
      return makeRule('I-04', 'memenuhi', 'Alat produksi manual, sesuai syarat industri rumah tangga.');
    case 'semi_otomatis':
      return makeRule(
        'I-04',
        'memenuhi',
        'Alat produksi semi otomatis, masih sesuai syarat industri rumah tangga.',
      );
    case 'otomatis':
      return makeRule(
        'I-04',
        'menghalangi',
        'Alat produksi otomatis. Industri rumah tangga hanya memakai alat manual sampai semi otomatis.',
      );
    default:
      return makeRule(
        'I-04',
        'belum_dijawab',
        'Jenis alat produksi belum diisi (manual, semi otomatis, atau otomatis).',
      );
  }
}

function checkI05(claims: string[]): PermitRuleResult {
  if (claims.length > 0) {
    return makeRule(
      'I-05',
      'menghalangi',
      `Label mencantumkan klaim (${claims.map((c) => `"${c}"`).join(', ')}). Produk dengan klaim tidak bisa lewat SPP-IRT.`,
    );
  }
  return makeRule(
    'I-05',
    'memenuhi',
    'Tidak ditemukan klaim gizi atau kesehatan pada nama produk dan pernyataan lain di label.',
  );
}

function checkI06(answers: AdditionalAnswers): PermitRuleResult {
  if (answers.butuhPenangananKhusus === true) {
    return makeRule(
      'I-06',
      'menghalangi',
      'Produk butuh penanganan khusus dalam produksi atau distribusi (misalnya harus disimpan beku atau dingin).',
    );
  }
  if (answers.butuhPenangananKhusus === false) {
    return makeRule('I-06', 'memenuhi', 'Produk tidak butuh penanganan khusus.');
  }
  return makeRule(
    'I-06',
    'perlu_dicek',
    'Pastikan produk tidak butuh penanganan khusus, misalnya harus disimpan beku atau dingin selama dijual.',
  );
}

function checkI07(answers: AdditionalAnswers): PermitRuleResult {
  if (answers.wajibSni === true) {
    return makeRule('I-07', 'menghalangi', 'Produk termasuk pangan yang wajib SNI.');
  }
  if (answers.wajibSni === false) {
    return makeRule('I-07', 'memenuhi', 'Produk tidak termasuk pangan wajib SNI.');
  }
  return makeRule(
    'I-07',
    'perlu_dicek',
    'Pastikan produk tidak termasuk pangan yang wajib SNI.',
  );
}

function checkI08(): PermitRuleResult {
  return makeRule(
    'I-08',
    'perlu_dicek',
    'Daftar jenis pangan yang boleh lewat SPP-IRT (Lampiran I) belum dibaca aplikasi. Jenis pangan ini perlu dicek ke Dinas Kesehatan.',
  );
}

function uniqueReferences(rules: PermitRuleResult[]): RegulationReference[] {
  const seen = new Set<string>();
  const refs: RegulationReference[] = [];
  for (const rule of rules) {
    const key = `${rule.rujukan.peraturan}|${rule.rujukan.pasal}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(rule.rujukan);
    }
  }
  return refs;
}

const OUTCOME_TITLES: Record<PermitPathOutcome, string> = {
  tidak_wajib_spp_irt: 'Tidak wajib izin produksi rumah tangga (SPP-IRT)',
  bisa_spp_irt: 'Bisa lewat izin produksi rumah tangga (SPP-IRT)',
  tidak_bisa_spp_irt: 'Tidak bisa lewat jalur izin produksi rumah tangga (SPP-IRT)',
  belum_bisa_ditentukan: 'Jalur izin belum bisa ditentukan',
};

/**
 * Menentukan jalur izin produksi berdasarkan aturan I-01 sampai I-08
 * (Peraturan BPOM Nomor 4 Tahun 2024). Fungsi murni tanpa jaringan.
 *
 * Urutan penentuan:
 * 1. Bila pengecualian Pasal 3 berlaku (I-01 atau I-02): tidak wajib SPP-IRT.
 * 2. Bila umur simpan belum diisi: belum bisa ditentukan, karena produk mungkin dikecualikan.
 * 3. Bila ada aturan yang menghalangi (I-03 sampai I-07): tidak bisa lewat SPP-IRT.
 * 4. Bila alat produksi belum diisi: belum bisa ditentukan.
 * 5. Selain itu: bisa lewat SPP-IRT, dengan jenis pangan (I-08) perlu dicek ke Dinas Kesehatan.
 */
export function evaluatePermitPath(
  label: Pick<LabelData, 'namaProduk' | 'pernyataanLain'>,
  answers: AdditionalAnswers,
): PermitPathResult {
  const klaimTerdeteksi = detectLabelClaims(label);
  const aturan: PermitRuleResult[] = [
    checkI01(answers),
    checkI02(answers),
    checkI03(answers),
    checkI04(answers),
    checkI05(klaimTerdeteksi),
    checkI06(answers),
    checkI07(answers),
    checkI08(),
  ];

  const byImpact = (impact: PermitRuleImpact) => aturan.filter((rule) => rule.dampak === impact);
  const membebaskan = byImpact('membebaskan');
  const menghalangi = byImpact('menghalangi');
  const belumDijawab = byImpact('belum_dijawab');
  const perluDicekRules = byImpact('perlu_dicek');
  const i01 = aturan[0];

  let hasil: PermitPathOutcome;
  let alasan: string[];
  let decisive: PermitRuleResult[];
  let perluDicek: string[];

  if (membebaskan.length > 0) {
    hasil = 'tidak_wajib_spp_irt';
    decisive = membebaskan;
    alasan = membebaskan.map((rule) => rule.penjelasan);
    perluDicek = [
      'Tanyakan ke Dinas Kesehatan bila ragu apakah produk termasuk pengecualian ini.',
    ];
  } else if (i01?.dampak === 'belum_dijawab') {
    hasil = 'belum_bisa_ditentukan';
    decisive = [i01, ...menghalangi];
    alasan = [
      'Isi umur simpan dulu. Produk dengan umur simpan kurang dari 7 hari tidak wajib SPP-IRT.',
      ...menghalangi.map((rule) => rule.penjelasan),
    ];
    perluDicek = [];
  } else if (menghalangi.length > 0) {
    hasil = 'tidak_bisa_spp_irt';
    decisive = menghalangi;
    alasan = menghalangi.map((rule) => rule.penjelasan);
    perluDicek = [
      'Tanyakan jalur izin lain yang sesuai (misalnya izin edar dari BPOM) ke Dinas Kesehatan atau Balai POM setempat.',
    ];
  } else if (belumDijawab.length > 0) {
    hasil = 'belum_bisa_ditentukan';
    decisive = belumDijawab;
    alasan = belumDijawab.map((rule) => rule.penjelasan);
    perluDicek = [];
  } else {
    hasil = 'bisa_spp_irt';
    decisive = aturan.filter((rule) => rule.dampak === 'memenuhi' || rule.id === 'I-08');
    alasan = [
      'Umur simpan 7 hari atau lebih, alat produksi manual atau semi otomatis, dan tidak ada klaim pada label.',
    ];
    perluDicek = perluDicekRules.map((rule) => rule.penjelasan);
  }

  return {
    hasil,
    judul: OUTCOME_TITLES[hasil],
    alasan,
    rujukan: uniqueReferences(decisive),
    aturan,
    perluDicek,
    klaimTerdeteksi,
  };
}
