import { describe, expect, it } from 'vitest';
import { detectAllergens } from '../allergens';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
} from '../labelRules';
import type {
  AdditionalAnswers,
  LabelData,
  LabelFieldKey,
  LabelRuleId,
  RuleStatus,
} from '../types';

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    ...createEmptyLabelData(),
    namaProduk: 'Keripik Pisang Renyah',
    daftarBahanTeks:
      'Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, tepung terigu, garam.',
    beratBersihTeks: 'Berat bersih: 150 g',
    namaProdusen: 'Dapur Bu Rina',
    alamatProdusen: 'Jl. Melati No. 12, Kota Bandung 40115, Indonesia',
    keteranganHalalTeks: 'Halal Indonesia ID32110000123450123',
    kodeProduksiTeks: 'B01-131126',
    tanggalProduksiTeks: '13 Nov 2026',
    kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Des 2026',
    nomorIzinTeks: 'P-IRT 2053273010123-29',
    pernyataanAlergenTeks: 'Mengandung alergen, lihat daftar bahan yang dicetak tebal.',
    caraPenyimpananTeks: 'Simpan di tempat sejuk dan kering.',
    pernyataanLain: [],
    unreadableFields: [],
    ...overrides,
  };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return {
    ...createEmptyAnswers(),
    resep: [
      { nama: 'pisang kepok', jumlahGram: 1000 },
      { nama: 'minyak kelapa sawit', jumlahGram: 300 },
      { nama: 'gula pasir', jumlahGram: 150 },
      { nama: 'tepung terigu', jumlahGram: 100 },
      { nama: 'garam', jumlahGram: 20 },
    ],
    umurSimpanHari: 30,
    bergantungCaraSimpan: true,
    punyaSertifikatHalal: true,
    ...overrides,
  };
}

function rule(
  id: LabelRuleId,
  label: LabelData,
  answers: AdditionalAnswers = makeAnswers(),
) {
  const found = evaluateLabelRules(label, answers).hasil.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Rule ${id} tidak ditemukan`);
  }
  return found;
}

function status(
  id: LabelRuleId,
  label: LabelData,
  answers: AdditionalAnswers = makeAnswers(),
): RuleStatus {
  return rule(id, label, answers).status;
}

function unreadable(...fields: LabelFieldKey[]): Partial<LabelData> {
  return { unreadableFields: fields };
}

describe('evaluateLabelRules - label dan jawaban kosong', () => {
  it('label kosong dan jawaban kosong menghasilkan 20 hasil berurutan tanpa galat', () => {
    const report = evaluateLabelRules(createEmptyLabelData(), createEmptyAnswers());
    expect(report.hasil.map((item) => item.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `L-${String(i + 1).padStart(2, '0')}`),
    );
    expect(report.alergenTerdeteksi).toEqual([]);
  });

  it('label kosong tidak dinyatakan siap cetak dan ringkasannya berjumlah 20', () => {
    const { ringkasan, siapCetak } = evaluateLabelRules(
      createEmptyLabelData(),
      createEmptyAnswers(),
    );
    expect(siapCetak).toBe(false);
    expect(ringkasan.kurang).toBeGreaterThan(0);
    expect(ringkasan.lengkap + ringkasan.kurang + ringkasan.tidakBisaDicek).toBe(20);
  });

  it('status tiap butir untuk label kosong (dokumentasi perilaku sekarang)', () => {
    const expected: Record<LabelRuleId, RuleStatus> = {
      'L-01': 'kurang',
      'L-02': 'kurang',
      'L-03': 'tidak_bisa_dicek',
      'L-04': 'tidak_bisa_dicek',
      'L-05': 'kurang',
      'L-06': 'kurang',
      'L-07': 'lengkap',
      'L-08': 'kurang',
      'L-09': 'kurang',
      'L-10': 'tidak_bisa_dicek',
      'L-11': 'kurang',
      'L-12': 'lengkap',
      'L-13': 'tidak_bisa_dicek',
      'L-14': 'tidak_bisa_dicek',
      'L-15': 'lengkap',
      'L-16': 'lengkap',
      'L-17': 'lengkap',
      'L-18': 'lengkap',
      'L-19': 'tidak_bisa_dicek',
      'L-20': 'tidak_bisa_dicek',
    };
    for (const [id, want] of Object.entries(expected)) {
      expect(status(id as LabelRuleId, createEmptyLabelData(), createEmptyAnswers()), id).toBe(
        want,
      );
    }
  });
});

describe('evaluateLabelRules - unreadableFields menjadi tidak_bisa_dicek', () => {
  const cases: Array<[LabelRuleId, LabelFieldKey[]]> = [
    ['L-01', ['namaProduk']],
    ['L-02', ['daftarBahanTeks']],
    ['L-03', ['daftarBahanTeks']],
    ['L-04', ['daftarBahanTeks']],
    ['L-05', ['beratBersihTeks']],
    ['L-06', ['namaProdusen']],
    ['L-06', ['alamatProdusen']],
    ['L-08', ['kodeProduksiTeks']],
    ['L-08', ['tanggalProduksiTeks']],
    ['L-09', ['kedaluwarsaTeks']],
    ['L-10', ['kedaluwarsaTeks']],
    ['L-11', ['nomorIzinTeks']],
    ['L-12', ['daftarBahanTeks']],
    ['L-12', ['pernyataanAlergenTeks']],
    ['L-19', ['caraPenyimpananTeks']],
  ];

  it.each(cases)('%s tidak_bisa_dicek bila %j tidak terbaca', (id, fields) => {
    expect(status(id, makeLabel(unreadable(...fields)))).toBe('tidak_bisa_dicek');
  });

  it('field lain yang tidak terbaca tidak memengaruhi butir yang tidak terkait', () => {
    expect(status('L-05', makeLabel(unreadable('namaProduk')))).toBe('lengkap');
    expect(status('L-11', makeLabel(unreadable('beratBersihTeks')))).toBe('lengkap');
  });

  it('daftar bahan tidak terbaca: alergen tidak dideteksi dan L-12 tidak_bisa_dicek', () => {
    const report = evaluateLabelRules(makeLabel(unreadable('daftarBahanTeks')), makeAnswers());
    expect(report.alergenTerdeteksi).toEqual([]);
    expect(report.hasil.find((r) => r.id === 'L-12')?.status).toBe('tidak_bisa_dicek');
  });

  it('L-07: teks halal yang terisi tetap dinilai walau field ditandai tidak terbaca', () => {
    expect(
      status(
        'L-07',
        makeLabel({ keteranganHalalTeks: 'Halal', ...unreadable('keteranganHalalTeks') }),
        makeAnswers({ punyaSertifikatHalal: false }),
      ),
    ).toBe('kurang');
  });

  it('L-07: tidak_bisa_dicek bila teks halal kosong dan field ditandai tidak terbaca', () => {
    expect(
      status('L-07', makeLabel({ keteranganHalalTeks: '', ...unreadable('keteranganHalalTeks') })),
    ).toBe('tidak_bisa_dicek');
  });

  it('L-15 dan L-17: tidak_bisa_dicek bila pernyataanLain tidak terbaca dan tidak ada temuan', () => {
    const label = makeLabel(unreadable('pernyataanLain'));
    expect(status('L-15', label)).toBe('tidak_bisa_dicek');
    expect(status('L-17', label)).toBe('tidak_bisa_dicek');
  });

  it('L-15 dan L-17: temuan nyata tetap kurang walau pernyataanLain ditandai tidak terbaca', () => {
    const label = makeLabel({
      pernyataanLain: ['Menyehatkan', 'Bebas BTP'],
      ...unreadable('pernyataanLain'),
    });
    expect(status('L-15', label)).toBe('kurang');
    expect(status('L-17', label)).toBe('kurang');
  });
});

describe('L-02 tambahan', () => {
  it('awalan huruf besar tanpa titik dua diterima', () => {
    expect(status('L-02', makeLabel({ daftarBahanTeks: 'DAFTAR BAHAN tepung, gula' }))).toBe(
      'lengkap',
    );
  });

  it('awalan dengan spasi di depan diterima', () => {
    expect(status('L-02', makeLabel({ daftarBahanTeks: '  Bahan-bahan: tepung' }))).toBe('lengkap');
  });

  it('awalan saja tanpa isi: kurang', () => {
    expect(status('L-02', makeLabel({ daftarBahanTeks: 'Komposisi:' }))).toBe('kurang');
  });

  it('kata "komposisinya" bukan awalan resmi', () => {
    expect(status('L-02', makeLabel({ daftarBahanTeks: 'Komposisinya tepung, gula' }))).toBe(
      'kurang',
    );
  });

  it('"bahan" saja atau tanpa awalan bukan awalan resmi', () => {
    expect(status('L-02', makeLabel({ daftarBahanTeks: 'Bahan: tepung, gula' }))).toBe('kurang');
    expect(status('L-02', makeLabel({ daftarBahanTeks: 'tepung, gula' }))).toBe('kurang');
  });
});

describe('L-03 tambahan', () => {
  it('sebagian bahan resep tidak cocok tetapi minimal dua cocok dan berurutan: lengkap', () => {
    const label = makeLabel({ daftarBahanTeks: 'Komposisi: pisang kepok, gula pasir, garam.' });
    expect(status('L-03', label)).toBe('lengkap');
  });

  it('hanya satu bahan resep yang cocok: tidak_bisa_dicek', () => {
    const label = makeLabel({ daftarBahanTeks: 'Komposisi: pisang kepok, bumbu rahasia.' });
    expect(status('L-03', label)).toBe('tidak_bisa_dicek');
  });

  it('takaran sama boleh bertukar posisi', () => {
    const label = makeLabel({ daftarBahanTeks: 'Komposisi: gula, garam.' });
    const answers = makeAnswers({
      resep: [
        { nama: 'garam', jumlahGram: 50 },
        { nama: 'gula', jumlahGram: 50 },
      ],
    });
    expect(status('L-03', label, answers)).toBe('lengkap');
  });

  it('resep dengan jumlah nol, negatif, NaN, atau nama kosong tidak dihitung', () => {
    const answers = makeAnswers({
      resep: [
        { nama: 'pisang kepok', jumlahGram: 100 },
        { nama: 'garam', jumlahGram: 0 },
        { nama: 'gula pasir', jumlahGram: -5 },
        { nama: 'tepung terigu', jumlahGram: Number.NaN },
        { nama: '  ', jumlahGram: 40 },
      ],
    });
    expect(status('L-03', makeLabel(), answers)).toBe('tidak_bisa_dicek');
  });

  it('nama bahan label yang memuat nama resep dianggap cocok', () => {
    const label = makeLabel({
      daftarBahanTeks: 'Komposisi: gula pasir halus, tepung terigu protein sedang.',
    });
    const answers = makeAnswers({
      resep: [
        { nama: 'tepung terigu', jumlahGram: 500 },
        { nama: 'gula pasir', jumlahGram: 100 },
      ],
    });
    expect(status('L-03', label, answers)).toBe('kurang');
  });

  it('catatan dalam kurung diabaikan saat memecah token bahan', () => {
    const label = makeLabel({
      daftarBahanTeks: 'Komposisi: pisang kepok (segar, dipilih), gula pasir.',
    });
    expect(status('L-03', label)).toBe('lengkap');
  });

  it('daftar bahan kosong: tidak_bisa_dicek', () => {
    expect(status('L-03', makeLabel({ daftarBahanTeks: '' }))).toBe('tidak_bisa_dicek');
  });

  it('pesan kurang menyebut bahan yang salah urutan', () => {
    const result = rule('L-03', makeLabel({ daftarBahanTeks: 'Komposisi: garam, pisang kepok.' }));
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('pisang kepok');
    expect(result.penjelasan).toContain('garam');
  });
});

describe('L-04 tambahan', () => {
  it.each(['MSG', 'BTP', 'CMC', 'TBHQ', 'BHA', 'BHT', 'NaCl', 'dll', 'dkk', 'dsb', 'sdt', 'sdm'])(
    'singkatan %s berdiri sendiri: kurang',
    (abbr) => {
      expect(
        status('L-04', makeLabel({ daftarBahanTeks: `Komposisi: tepung, ${abbr}, gula` })),
      ).toBe('kurang');
    },
  );

  it.each([
    'tep.',
    'tpg.',
    'gl.',
    'bhn.',
    'mrg.',
    'pgl.',
    'prst.',
    'pwn.',
    'pgw.',
    'pms.',
    'mntg.',
    'gr.',
    'kt.',
  ])('singkatan bertitik %s: kurang', (abbr) => {
    expect(status('L-04', makeLabel({ daftarBahanTeks: `Komposisi: ${abbr} terigu, gula` }))).toBe(
      'kurang',
    );
  });

  it('singkatan dengan huruf besar-kecil campur dikenali', () => {
    expect(status('L-04', makeLabel({ daftarBahanTeks: 'Komposisi: Msg, gula' }))).toBe('kurang');
  });

  it('singkatan hanya di dalam kurung setelah kepanjangan: lengkap', () => {
    expect(
      status(
        'L-04',
        makeLabel({ daftarBahanTeks: 'Komposisi: mononatrium glutamat (MSG), garam' }),
      ),
    ).toBe('lengkap');
  });

  it('kata yang memuat potongan singkatan tidak dianggap singkatan', () => {
    expect(
      status('L-04', makeLabel({ daftarBahanTeks: 'Komposisi: bhatara, gula, cmcxyz' })),
    ).toBe('lengkap');
  });

  it('pesan menyebut singkatan yang ditemukan', () => {
    expect(
      rule('L-04', makeLabel({ daftarBahanTeks: 'Komposisi: tepung, MSG' })).penjelasan,
    ).toContain('MSG');
  });

  it('hasil konsisten pada pemeriksaan berulang (tanpa state regex global)', () => {
    const label = makeLabel({ daftarBahanTeks: 'Komposisi: tep. terigu, gr. gula' });
    expect(status('L-04', label)).toBe('kurang');
    expect(status('L-04', label)).toBe('kurang');
  });
});

describe('L-05 tambahan', () => {
  it.each([
    '150 g',
    '150g',
    '1 kg',
    '1,5 kg',
    '1.5 kg',
    '250 ml',
    '250ml',
    '1 L',
    '1 l',
    '500 mL',
    'Isi bersih: 330 ml',
  ])('menerima %s', (text) => {
    expect(status('L-05', makeLabel({ beratBersihTeks: text }))).toBe('lengkap');
  });

  it.each(['250 gram', '250 gr', '250 gr.', '2 ons', '1 liter', '1 ltr', '250 cc', 'seratus g'])(
    'menolak satuan tidak baku atau angka tidak ditulis %s',
    (text) => {
      expect(status('L-05', makeLabel({ beratBersihTeks: text }))).toBe('kurang');
    },
  );

  it('angka tanpa satuan: kurang', () => {
    expect(status('L-05', makeLabel({ beratBersihTeks: '250' }))).toBe('kurang');
  });

  it('satuan tanpa angka: kurang', () => {
    expect(status('L-05', makeLabel({ beratBersihTeks: 'g' }))).toBe('kurang');
  });

  it('kebijakan: huruf besar "G" atau "KG" saat ini ditolak (simbol baku huruf kecil)', () => {
    expect(status('L-05', makeLabel({ beratBersihTeks: '150 G' }))).toBe('kurang');
    expect(status('L-05', makeLabel({ beratBersihTeks: '1 KG' }))).toBe('kurang');
  });

  it('pesan kurang menyebut tulisan asli', () => {
    expect(rule('L-05', makeLabel({ beratBersihTeks: '250 gram' })).penjelasan).toContain(
      '250 gram',
    );
  });
});

describe('L-06 tambahan', () => {
  it('alamat tanpa kode pos: kurang dan menyebut kode pos', () => {
    const result = rule(
      'L-06',
      makeLabel({ alamatProdusen: 'Jl. Melati 12, Kota Bandung, Indonesia' }),
    );
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('kode pos');
  });

  it('alamat tanpa kata Indonesia: kurang dan menyebut Indonesia', () => {
    const result = rule(
      'L-06',
      makeLabel({ alamatProdusen: 'Jl. Melati 12, Kota Bandung 40115' }),
    );
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('Indonesia');
  });

  it('alamat tanpa kota: kurang dan menyebut kota', () => {
    const result = rule('L-06', makeLabel({ alamatProdusen: '40115 Indonesia' }));
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('kota');
  });

  it('kode pos 4 atau 6 digit tidak diterima', () => {
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Jl. Melati, Kota Bandung 4011, Indonesia' })),
    ).toBe('kurang');
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Jl. Melati, Kota Bandung 401155, Indonesia' })),
    ).toBe('kurang');
  });

  it('kata Indonesia huruf besar semua diterima', () => {
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Jl. Melati 12, Bandung 40115, INDONESIA' })),
    ).toBe('lengkap');
  });

  it('kota dengan awalan "Kab." atau "Kabupaten" tanpa koma diterima', () => {
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Desa Sukamaju Kab. Garut 44151 Indonesia' })),
    ).toBe('lengkap');
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Desa Sukamaju Kabupaten Garut 44151 Indonesia' })),
    ).toBe('lengkap');
  });

  it('nama produsen kosong dengan alamat lengkap: kurang dan menyebut nama produsen', () => {
    const result = rule('L-06', makeLabel({ namaProdusen: '' }));
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('nama produsen');
  });

  it('nama dan alamat kosong: menyebut keduanya', () => {
    const result = rule('L-06', makeLabel({ namaProdusen: '', alamatProdusen: '' }));
    expect(result.penjelasan).toContain('nama produsen');
    expect(result.penjelasan).toContain('alamat produsen');
  });

  it('kebijakan: bagian beralamat koma apa pun (>= 3 huruf) dianggap nama kota (heuristik longgar)', () => {
    expect(
      status('L-06', makeLabel({ alamatProdusen: 'Jl. Melati 12, 40115, Indonesia' })),
    ).toBe('lengkap');
  });
});

describe('L-07 tambahan', () => {
  it('halal tercantum, jawaban belum diisi: tidak_bisa_dicek', () => {
    expect(status('L-07', makeLabel(), makeAnswers({ punyaSertifikatHalal: null }))).toBe(
      'tidak_bisa_dicek',
    );
  });

  it('halal tercantum dan bersertifikat: lengkap', () => {
    expect(status('L-07', makeLabel(), makeAnswers({ punyaSertifikatHalal: true }))).toBe(
      'lengkap',
    );
  });

  it('halal hanya di pernyataanLain dan tidak bersertifikat: kurang', () => {
    expect(
      status(
        'L-07',
        makeLabel({ keteranganHalalTeks: '', pernyataanLain: ['Produk Halal'] }),
        makeAnswers({ punyaSertifikatHalal: false }),
      ),
    ).toBe('kurang');
  });

  it('tanpa keterangan halal dan tanpa sertifikat: lengkap', () => {
    expect(
      status(
        'L-07',
        makeLabel({ keteranganHalalTeks: '' }),
        makeAnswers({ punyaSertifikatHalal: false }),
      ),
    ).toBe('lengkap');
  });

  it('kebijakan: kata "halalan" di pernyataanLain tidak dianggap klaim halal, tetapi teks bebas di keteranganHalalTeks selalu dianggap klaim', () => {
    expect(
      status(
        'L-07',
        makeLabel({ keteranganHalalTeks: '', pernyataanLain: ['halalan thayyiban'] }),
        makeAnswers({ punyaSertifikatHalal: false }),
      ),
    ).toBe('lengkap');
    expect(
      status(
        'L-07',
        makeLabel({ keteranganHalalTeks: 'bukan produk halal' }),
        makeAnswers({ punyaSertifikatHalal: false }),
      ),
    ).toBe('kurang');
  });
});

describe('L-08 tambahan', () => {
  it('tanggal ada tetapi kode kosong: kurang', () => {
    expect(status('L-08', makeLabel({ kodeProduksiTeks: '' }))).toBe('kurang');
  });

  it('kode ada tetapi tanggal kosong dan kode tidak memuat tanggal: kurang', () => {
    expect(status('L-08', makeLabel({ kodeProduksiTeks: 'B01', tanggalProduksiTeks: '' }))).toBe(
      'kurang',
    );
  });

  it('kode memuat tanggal 6 digit tanpa kolom tanggal: lengkap', () => {
    expect(
      status('L-08', makeLabel({ kodeProduksiTeks: 'B01-131126', tanggalProduksiTeks: '' })),
    ).toBe('lengkap');
  });

  it('kode memuat tanggal bergaris miring tanpa kolom tanggal: lengkap', () => {
    expect(
      status('L-08', makeLabel({ kodeProduksiTeks: '13/11/2026 B1', tanggalProduksiTeks: '' })),
    ).toBe('lengkap');
  });

  it('keduanya kosong atau hanya spasi: kurang', () => {
    expect(status('L-08', makeLabel({ kodeProduksiTeks: '', tanggalProduksiTeks: '' }))).toBe(
      'kurang',
    );
    expect(status('L-08', makeLabel({ kodeProduksiTeks: '   ', tanggalProduksiTeks: '  ' }))).toBe(
      'kurang',
    );
  });

  it('hanya tanggal tertulis tanpa kode: pesan menyebut salah satu belum lengkap', () => {
    expect(rule('L-08', makeLabel({ kodeProduksiTeks: '' })).penjelasan).toContain('Salah satu');
  });
});

describe('L-09 tambahan', () => {
  it('awalan huruf besar semua dan spasi di depan diterima', () => {
    expect(
      status('L-09', makeLabel({ kedaluwarsaTeks: '  BAIK DIGUNAKAN SEBELUM 13 Des 2026' })),
    ).toBe('lengkap');
  });

  it.each(['Exp: 13 Des 2026', 'Expired 13 Des 2026', 'Kadaluarsa 13 Des 2026', '13 Des 2026'])(
    'menolak awalan %s',
    (text) => {
      expect(status('L-09', makeLabel({ kedaluwarsaTeks: text }))).toBe('kurang');
    },
  );

  it('frasa resmi di tengah kalimat (bukan awalan) ditolak', () => {
    expect(
      status(
        'L-09',
        makeLabel({ kedaluwarsaTeks: 'Lihat tutup. Baik digunakan sebelum 13 Des 2026' }),
      ),
    ).toBe('kurang');
  });

  it('frasa resmi tanpa tanggal lolos L-09 (tanggal dinilai di L-10)', () => {
    expect(status('L-09', makeLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum' }))).toBe(
      'lengkap',
    );
  });
});

describe('L-10 tambahan', () => {
  const dengan = (hari: number | null) => makeAnswers({ umurSimpanHari: hari });
  const bulanTahun = makeLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum: Nov 2026' });

  it('umur simpan tepat 90 hari masih "sampai 3 bulan": bulan dan tahun saja kurang', () => {
    expect(status('L-10', bulanTahun, dengan(90))).toBe('kurang');
  });

  it('umur simpan 91 hari: bulan dan tahun cukup', () => {
    expect(status('L-10', bulanTahun, dengan(91))).toBe('lengkap');
  });

  it('umur simpan 90 hari dengan tanggal penuh: lengkap', () => {
    expect(status('L-10', makeLabel(), dengan(90))).toBe('lengkap');
  });

  it('umur simpan 91 hari tanpa bulan: kurang', () => {
    expect(
      status('L-10', makeLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum: 2027' }), dengan(91)),
    ).toBe('kurang');
  });

  it('umur simpan belum diisi (null): tidak_bisa_dicek', () => {
    expect(status('L-10', makeLabel(), dengan(null))).toBe('tidak_bisa_dicek');
  });

  it('umur simpan 0 hari diperlakukan sebagai sampai 3 bulan', () => {
    expect(status('L-10', bulanTahun, dengan(0))).toBe('kurang');
  });

  it('kedaluwarsa kosong: tidak_bisa_dicek walau umur simpan terisi', () => {
    expect(status('L-10', makeLabel({ kedaluwarsaTeks: '' }), dengan(30))).toBe('tidak_bisa_dicek');
  });

  describe('format tanggal penuh untuk umur simpan sampai 90 hari', () => {
    it.each([
      '13 Des 2026',
      '13 Desember 2026',
      '13-Des-2026',
      '13 des 26',
      '1 Agu 2026',
      '1 Agt 2026',
      '1 Ags 2026',
      '13/12/2026',
      '13-12-2026',
      '13.12.2026',
      '13/12/26',
      '2026-12-13',
      '2026/12/13',
    ])('%s dianggap tanggal lengkap', (tanggal) => {
      const label = makeLabel({ kedaluwarsaTeks: `Baik digunakan sebelum: ${tanggal}` });
      expect(status('L-10', label, dengan(60))).toBe('lengkap');
    });

    it.each(['Des 2026', 'Desember 2026', '12/2026', '12-2026', '2026', '13 Desember'])(
      '%s bukan tanggal lengkap',
      (tanggal) => {
        const label = makeLabel({ kedaluwarsaTeks: `Baik digunakan sebelum: ${tanggal}` });
        expect(status('L-10', label, dengan(60))).toBe('kurang');
      },
    );

    it('nama bulan bahasa Inggris tidak dikenali sebagai tanggal penuh', () => {
      const label = makeLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Dec 2026' });
      expect(status('L-10', label, dengan(60))).toBe('kurang');
    });
  });

  describe('format bulan dan tahun untuk umur simpan lebih dari 90 hari', () => {
    it.each([
      'Des 2026',
      'Desember 2026',
      'Des-2026',
      'Des/2026',
      'Des 26',
      '12/2026',
      '12-2026',
      '12.2026',
      '12/26',
      '1/2027',
      '13 Des 2026',
      '13/12/2026',
    ])('%s diterima', (tanggal) => {
      const label = makeLabel({ kedaluwarsaTeks: `Baik digunakan sebelum: ${tanggal}` });
      expect(status('L-10', label, dengan(180))).toBe('lengkap');
    });

    it.each(['2027', 'Desember', '13/2026', '00/2026'])('%s ditolak', (tanggal) => {
      const label = makeLabel({ kedaluwarsaTeks: `Baik digunakan sebelum: ${tanggal}` });
      expect(status('L-10', label, dengan(180))).toBe('kurang');
    });
  });
});

describe('L-11 tambahan', () => {
  it.each(['P-IRT No. 2053273010123-29', 'p-irt 2053273010123-29', 'Nomor P-IRT: 123'])(
    'menerima %s',
    (text) => {
      expect(status('L-11', makeLabel({ nomorIzinTeks: text }))).toBe('lengkap');
    },
  );

  it.each([
    'PIRT 2053273010123-29',
    'P IRT 2053273010123-29',
    'P.IRT 2053273010123-29',
    '2053273010123-29',
  ])('menolak penulisan %s', (text) => {
    expect(status('L-11', makeLabel({ nomorIzinTeks: text }))).toBe('kurang');
  });

  it('kebijakan: P-IRT tanpa nomor saat ini lolos (hanya tulisan yang diperiksa)', () => {
    expect(status('L-11', makeLabel({ nomorIzinTeks: 'P-IRT' }))).toBe('lengkap');
  });

  it('pesan penolakan menyebut tulisan asli dan P-IRT', () => {
    const result = rule('L-11', makeLabel({ nomorIzinTeks: 'PIRT 123' }));
    expect(result.penjelasan).toContain('PIRT 123');
    expect(result.penjelasan).toContain('P-IRT');
  });
});

describe('L-12 sampai L-14 tambahan', () => {
  const withEgg = { daftarBahanTeks: 'Komposisi: tepung terigu, telur, gula.' };

  it('kalimat alergen sebagian (hanya "Mengandung alergen"): kurang', () => {
    expect(
      status('L-12', makeLabel({ ...withEgg, pernyataanAlergenTeks: 'Mengandung alergen' })),
    ).toBe('kurang');
  });

  it('kalimat alergen sebagian (hanya "lihat daftar bahan yang dicetak tebal"): kurang', () => {
    expect(
      status(
        'L-12',
        makeLabel({ ...withEgg, pernyataanAlergenTeks: 'Lihat daftar bahan yang dicetak tebal.' }),
      ),
    ).toBe('kurang');
  });

  it('kalimat tanpa kata "dicetak tebal": kurang', () => {
    expect(
      status(
        'L-12',
        makeLabel({ ...withEgg, pernyataanAlergenTeks: 'Mengandung alergen, lihat daftar bahan.' }),
      ),
    ).toBe('kurang');
  });

  it('kalimat dengan huruf besar, spasi ganda dan baris baru diterima', () => {
    expect(
      status(
        'L-12',
        makeLabel({
          ...withEgg,
          pernyataanAlergenTeks: 'MENGANDUNG  ALERGEN,\nlihat daftar bahan yang dicetak tebal',
        }),
      ),
    ).toBe('lengkap');
  });

  it('pernyataan kosong dengan alergen terdeteksi: kurang dan menyebut kategori', () => {
    const result = rule('L-12', makeLabel({ ...withEgg, pernyataanAlergenTeks: '' }));
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('Telur');
    expect(result.penjelasan).toContain('Serealia mengandung gluten');
  });

  it('tanpa alergen terdeteksi, pernyataan alergen tidak diwajibkan', () => {
    expect(
      status(
        'L-12',
        makeLabel({ daftarBahanTeks: 'Komposisi: singkong, garam.', pernyataanAlergenTeks: '' }),
      ),
    ).toBe('lengkap');
  });

  it('alergen hanya diperiksa pada daftar bahan, bukan pada nama produk', () => {
    expect(
      status(
        'L-12',
        makeLabel({
          namaProduk: 'Kue Telur Gulung',
          daftarBahanTeks: 'Komposisi: singkong, garam.',
          pernyataanAlergenTeks: '',
        }),
      ),
    ).toBe('lengkap');
  });

  it('alergenTerdeteksi pada laporan mengikuti urutan kelompok Pasal 49 di kode', () => {
    const report = evaluateLabelRules(
      makeLabel({ daftarBahanTeks: 'Komposisi: susu, telur, tepung terigu' }),
      makeAnswers(),
    );
    expect(report.alergenTerdeteksi).toEqual(['Serealia mengandung gluten', 'Telur', 'Susu']);
  });

  it('L-13: selalu tidak_bisa_dicek, pesan menyebut alergen bila ada', () => {
    const dengan = rule('L-13', makeLabel(withEgg));
    expect(dengan.status).toBe('tidak_bisa_dicek');
    expect(dengan.penjelasan).toContain('Telur');
    const tanpa = rule('L-13', makeLabel({ daftarBahanTeks: 'Komposisi: singkong' }));
    expect(tanpa.status).toBe('tidak_bisa_dicek');
    expect(tanpa.penjelasan).not.toContain('Telur');
  });

  it('L-14: selalu tidak_bisa_dicek untuk label apa pun', () => {
    expect(status('L-14', createEmptyLabelData(), createEmptyAnswers())).toBe('tidak_bisa_dicek');
    expect(status('L-14', makeLabel())).toBe('tidak_bisa_dicek');
  });
});

describe('L-15 tambahan', () => {
  it.each([
    'menyehatkan',
    'mengobati',
    'menyembuhkan',
    'obat',
    'antipenyakit',
    'anti penyakit',
    'anti-penyakit',
    'mencegah penyakit',
    'mencerdaskan',
    'meningkatkan kecerdasan',
    'menurunkan kolesterol',
    'menurunkan gula darah',
    'menjaga imunitas',
    'meningkatkan daya tahan tubuh',
    'berkhasiat',
  ])('klaim "%s" di pernyataanLain: kurang', (klaim) => {
    expect(status('L-15', makeLabel({ pernyataanLain: [`Produk ${klaim}`] }))).toBe('kurang');
  });

  it('klaim pada nama produk juga terdeteksi', () => {
    expect(status('L-15', makeLabel({ namaProduk: 'Jamu Berkhasiat' }))).toBe('kurang');
  });

  it('huruf besar semua dikenali', () => {
    expect(status('L-15', makeLabel({ pernyataanLain: ['MENYEHATKAN'] }))).toBe('kurang');
  });

  it('kata yang hanya memuat potongan kata klaim bukan klaim', () => {
    expect(status('L-15', makeLabel({ pernyataanLain: ['Perobatan tradisional'] }))).toBe(
      'lengkap',
    );
  });

  it('kebijakan: klaim di daftar bahan tidak diperiksa (hanya nama produk dan pernyataanLain)', () => {
    expect(status('L-15', makeLabel({ daftarBahanTeks: 'Komposisi: ramuan obat, gula' }))).toBe(
      'lengkap',
    );
  });

  it('pesan menyebut kata yang cocok', () => {
    expect(rule('L-15', makeLabel({ pernyataanLain: ['Berkhasiat'] })).penjelasan).toContain(
      'Berkhasiat',
    );
  });

  it('pernyataan biasa: lengkap', () => {
    expect(status('L-15', makeLabel({ pernyataanLain: ['Renyah dan gurih'] }))).toBe('lengkap');
  });
});

describe('L-16 tambahan', () => {
  const golongan = [
    'tanpa pengawet',
    'tanpa pewarna',
    'tanpa pemanis buatan',
    'tanpa penguat rasa',
    'tanpa antioksidan',
  ];

  it('tanpa klaim negatif: lengkap', () => {
    expect(status('L-16', makeLabel({ pernyataanLain: ['Renyah'] }))).toBe('lengkap');
  });

  it.each([
    ['tanpa pengawet', 'natrium benzoat'],
    ['tanpa pewarna', 'tartrazin'],
    ['tanpa pemanis buatan', 'sakarin'],
    ['tanpa penguat rasa', 'mononatrium glutamat'],
    ['tanpa antioksidan', 'tokoferol'],
  ])('klaim "%s" bertentangan dengan bahan "%s": kurang', (klaim, bahan) => {
    const label = makeLabel({
      pernyataanLain: [klaim],
      daftarBahanTeks: `Komposisi: tepung singkong, ${bahan}`,
    });
    expect(status('L-16', label)).toBe('kurang');
  });

  it.each(golongan)('klaim "%s" tanpa resep: tidak_bisa_dicek', (klaim) => {
    expect(
      status(
        'L-16',
        makeLabel({ pernyataanLain: [klaim], daftarBahanTeks: 'Komposisi: singkong, garam.' }),
        makeAnswers({ resep: [] }),
      ),
    ).toBe('tidak_bisa_dicek');
  });

  it.each(golongan)('klaim "%s" dengan resep terisi dan tanpa pertentangan: lengkap', (klaim) => {
    expect(status('L-16', makeLabel({ pernyataanLain: [klaim] }))).toBe('lengkap');
  });

  it('kata pembuka "bebas", "tidak menggunakan", dan "non" juga ditangkap', () => {
    const base = { daftarBahanTeks: 'Komposisi: singkong, natrium benzoat' };
    expect(status('L-16', makeLabel({ ...base, pernyataanLain: ['Bebas pengawet'] }))).toBe(
      'kurang',
    );
    expect(
      status('L-16', makeLabel({ ...base, pernyataanLain: ['Tidak menggunakan pengawet'] })),
    ).toBe('kurang');
    expect(status('L-16', makeLabel({ ...base, pernyataanLain: ['Non pengawet'] }))).toBe(
      'kurang',
    );
  });

  it('klaim negatif di nama produk juga diperiksa', () => {
    expect(
      status(
        'L-16',
        makeLabel({
          namaProduk: 'Kecap Tanpa Pengawet',
          daftarBahanTeks: 'Komposisi: kedelai, natrium benzoat',
        }),
      ),
    ).toBe('kurang');
  });

  it.each([
    'tanpa pengemulsi',
    'tanpa penstabil',
    'tanpa perisa',
    'tanpa pengental',
    'tanpa pengembang',
    'tanpa antikempal',
  ])('klaim di luar lima golongan "%s": kurang', (klaim) => {
    const result = rule('L-16', makeLabel({ pernyataanLain: [klaim] }));
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain(klaim);
  });

  it('klaim negatif non-BTP (mis. "tanpa gula") tidak dinilai oleh L-16', () => {
    expect(status('L-16', makeLabel({ pernyataanLain: ['Tanpa gula tambahan'] }))).toBe('lengkap');
  });

  it('klaim umum bebas BTP dilewati L-16 dan ditangani L-17', () => {
    const label = makeLabel({ pernyataanLain: ['Bebas bahan tambahan pangan'] });
    expect(status('L-16', label)).toBe('lengkap');
    expect(status('L-17', label)).toBe('kurang');
  });

  it('kebijakan: pencocokan bahan bertentangan memakai potongan kata tanpa batas kata ("sulfit" dalam "sulfitasi")', () => {
    expect(
      status(
        'L-16',
        makeLabel({
          pernyataanLain: ['Tanpa pengawet'],
          daftarBahanTeks: 'Komposisi: gula hasil sulfitasi',
        }),
      ),
    ).toBe('kurang');
  });

  it('klaim negatif memeriksa nama bahan di resep, bukan hanya daftar bahan label', () => {
    expect(
      status(
        'L-16',
        makeLabel({ pernyataanLain: ['Tanpa pengawet'] }),
        makeAnswers({ resep: [{ nama: 'kalium sorbat', jumlahGram: 2 }] }),
      ),
    ).toBe('kurang');
  });
});

describe('L-17 varian', () => {
  it.each([
    'Bebas bahan tambahan pangan',
    'Tanpa bahan tambahan pangan',
    'Tidak mengandung bahan tambahan pangan',
    'Non bahan tambahan pangan',
    'Bebas BTP',
    'Tanpa BTP',
    'Tanpa-BTP',
    'Bebas zat aditif',
    'Tanpa bahan kimia',
    'Tidak mengandung bahan kimia',
    'BEBAS BAHAN KIMIA',
    'Produk tanpa    bahan kimia berbahaya',
  ])('"%s": kurang', (klaim) => {
    expect(status('L-17', makeLabel({ pernyataanLain: [klaim] }))).toBe('kurang');
  });

  it('klaim pada nama produk juga diperiksa', () => {
    expect(status('L-17', makeLabel({ namaProduk: 'Sambal Tanpa BTP' }))).toBe('kurang');
  });

  it('pesan menyebut frasa yang ditemukan', () => {
    expect(rule('L-17', makeLabel({ pernyataanLain: ['Bebas BTP'] })).penjelasan).toContain(
      'Bebas BTP',
    );
  });

  it('frasa spesifik golongan (bukan umum) tidak menjadi temuan L-17', () => {
    expect(status('L-17', makeLabel({ pernyataanLain: ['Tanpa pengawet'] }))).toBe('lengkap');
  });

  it('kata yang hanya memuat BTP sebagai potongan tidak menjadi temuan', () => {
    expect(status('L-17', makeLabel({ pernyataanLain: ['Tanpa btpx'] }))).toBe('lengkap');
  });

  it('kebijakan: klaim semakna tanpa kata pembuka bebas/tanpa (mis. "hanya bahan alami") tidak ditangkap', () => {
    expect(status('L-17', makeLabel({ pernyataanLain: ['Hanya bahan alami'] }))).toBe('lengkap');
  });

  it('pernyataan di daftar bahan tidak diperiksa', () => {
    expect(
      status('L-17', makeLabel({ daftarBahanTeks: 'Komposisi: singkong (bebas BTP)' })),
    ).toBe('lengkap');
  });
});

describe('L-18 kata bersyarat', () => {
  const satuBahan = { daftarBahanTeks: 'Komposisi: madu hutan.' };
  const banyakBahan = { daftarBahanTeks: 'Komposisi: pisang kepok, gula pasir, garam.' };

  it.each(['alami', 'asli', 'segar'])(
    'kata "%s" dengan satu bahan tanpa bahan sintetis: tidak_bisa_dicek',
    (kata) => {
      const result = rule('L-18', makeLabel({ ...satuBahan, pernyataanLain: [`Madu ${kata}`] }));
      expect(result.status).toBe('tidak_bisa_dicek');
      expect(result.penjelasan).toContain(kata);
    },
  );

  it.each(['alami', 'asli', 'segar'])(
    'kata "%s" dengan banyak bahan: tetap tidak_bisa_dicek (hanya murni dan 100% yang ditolak)',
    (kata) => {
      expect(status('L-18', makeLabel({ ...banyakBahan, pernyataanLain: [`Rasa ${kata}`] }))).toBe(
        'tidak_bisa_dicek',
      );
    },
  );

  it('"murni" dengan satu bahan: tidak_bisa_dicek', () => {
    expect(status('L-18', makeLabel({ ...satuBahan, pernyataanLain: ['Madu murni'] }))).toBe(
      'tidak_bisa_dicek',
    );
  });

  it('"murni" dengan banyak bahan: kurang', () => {
    expect(status('L-18', makeLabel({ ...banyakBahan, pernyataanLain: ['Murni'] }))).toBe(
      'kurang',
    );
  });

  it('"100 persen" dengan banyak bahan: kurang', () => {
    expect(
      status('L-18', makeLabel({ ...banyakBahan, pernyataanLain: ['100 persen bahan pilihan'] })),
    ).toBe('kurang');
  });

  it('"100 persen" dengan satu bahan: tidak_bisa_dicek', () => {
    expect(
      status('L-18', makeLabel({ ...satuBahan, pernyataanLain: ['100 persen madu'] })),
    ).toBe('tidak_bisa_dicek');
  });

  it.each(['alami', 'murni', 'asli', 'segar'])(
    'kata "%s" bersama bahan sintetis: kurang dan menyebut bahan sintetis',
    (kata) => {
      const result = rule(
        'L-18',
        makeLabel({ daftarBahanTeks: 'Komposisi: madu, tartrazin', pernyataanLain: [kata] }),
      );
      expect(result.status).toBe('kurang');
      expect(result.penjelasan).toContain('tartrazin');
    },
  );

  it.each([
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
  ])('bahan sintetis "%s" dengan kata "alami": kurang', (bahan) => {
    expect(
      status(
        'L-18',
        makeLabel({ daftarBahanTeks: `Komposisi: singkong, ${bahan}`, pernyataanLain: ['Alami'] }),
      ),
    ).toBe('kurang');
  });

  it('bahan sintetis hanya ada di resep: kurang', () => {
    expect(
      status(
        'L-18',
        makeLabel({ ...banyakBahan, pernyataanLain: ['Alami'] }),
        makeAnswers({ resep: [{ nama: 'pewarna sintetis', jumlahGram: 1 }] }),
      ),
    ).toBe('kurang');
  });

  it('kata bersyarat pada nama produk juga diperiksa', () => {
    expect(status('L-18', makeLabel({ ...satuBahan, namaProduk: 'Madu Asli' }))).toBe(
      'tidak_bisa_dicek',
    );
  });

  it('huruf besar semua dikenali', () => {
    expect(status('L-18', makeLabel({ ...satuBahan, pernyataanLain: ['ALAMI'] }))).toBe(
      'tidak_bisa_dicek',
    );
  });

  it.each(['alamiah', 'kealamian', 'aslinya', 'segara', 'pemurni', 'asliku'])(
    'kata "%s" yang hanya memuat potongan kata bersyarat tidak memicu',
    (kata) => {
      expect(status('L-18', makeLabel({ pernyataanLain: [kata] }))).toBe('lengkap');
    },
  );

  it('tanpa kata bersyarat: lengkap', () => {
    expect(status('L-18', makeLabel({ pernyataanLain: ['Renyah'] }))).toBe('lengkap');
  });

  it('kata berulang dengan huruf besar-kecil berbeda hanya disebut sekali di pesan', () => {
    const result = rule(
      'L-18',
      makeLabel({ ...satuBahan, namaProduk: 'Madu Asli', pernyataanLain: ['ASLI'] }),
    );
    expect(result.penjelasan.match(/asli/g)).toHaveLength(1);
  });

  describe('"100%" (batas akhir pola tidak boleh gagal setelah tanda persen)', () => {
    it.each(['100%', '100% Asli', 'Madu 100%', '100% alami', '(100%)', 'Bahan 100%.'])(
      '"%s" dengan banyak bahan dikenali sebagai klaim 100 persen dan menghasilkan kurang',
      (teks) => {
        const result = rule(
          'L-18',
          makeLabel({ ...banyakBahan, namaProduk: 'Produk', pernyataanLain: [teks] }),
        );
        expect(result.status).toBe('kurang');
        expect(result.penjelasan).toContain('Kata "murni" atau "100%"');
      },
    );

    it('"100%" sendirian dengan satu bahan: tidak_bisa_dicek dan menyebut 100%', () => {
      const result = rule('L-18', makeLabel({ ...satuBahan, pernyataanLain: ['100%'] }));
      expect(result.status).toBe('tidak_bisa_dicek');
      expect(result.penjelasan).toContain('100%');
    });

    it('"100% Asli" dengan satu bahan: tidak_bisa_dicek dan menyebut 100% serta asli', () => {
      const result = rule('L-18', makeLabel({ ...satuBahan, pernyataanLain: ['100% Asli'] }));
      expect(result.status).toBe('tidak_bisa_dicek');
      expect(result.penjelasan).toContain('100%');
      expect(result.penjelasan).toContain('asli');
    });

    it('"100%" bersama bahan sintetis: kurang dengan pesan bahan sintetis dan menyebut 100%', () => {
      const result = rule(
        'L-18',
        makeLabel({ daftarBahanTeks: 'Komposisi: madu, benzoat', pernyataanLain: ['100%'] }),
      );
      expect(result.status).toBe('kurang');
      expect(result.penjelasan).toContain('benzoat');
      expect(result.penjelasan).toContain('"100%"');
    });

    it('"1100%" bukan klaim 100%', () => {
      expect(status('L-18', makeLabel({ ...banyakBahan, pernyataanLain: ['Diskon 1100%'] }))).toBe(
        'lengkap',
      );
    });

    it('persentase lain ("10%", "99%") bukan kata bersyarat', () => {
      expect(
        status(
          'L-18',
          makeLabel({ ...banyakBahan, pernyataanLain: ['Kadar gula 10%', '99% bahan pilihan'] }),
        ),
      ).toBe('lengkap');
    });
  });
});

describe('L-19 tiga keadaan jawaban', () => {
  it('bergantung = true, ada petunjuk: lengkap', () => {
    expect(status('L-19', makeLabel(), makeAnswers({ bergantungCaraSimpan: true }))).toBe(
      'lengkap',
    );
  });

  it('bergantung = true, petunjuk kosong atau hanya spasi: kurang', () => {
    for (const teks of ['', '   ']) {
      expect(
        status(
          'L-19',
          makeLabel({ caraPenyimpananTeks: teks }),
          makeAnswers({ bergantungCaraSimpan: true }),
        ),
      ).toBe('kurang');
    }
  });

  it('bergantung = false: lengkap dengan atau tanpa petunjuk', () => {
    expect(
      status(
        'L-19',
        makeLabel({ caraPenyimpananTeks: '' }),
        makeAnswers({ bergantungCaraSimpan: false }),
      ),
    ).toBe('lengkap');
    expect(status('L-19', makeLabel(), makeAnswers({ bergantungCaraSimpan: false }))).toBe(
      'lengkap',
    );
  });

  it('bergantung = null, ada petunjuk: lengkap', () => {
    expect(status('L-19', makeLabel(), makeAnswers({ bergantungCaraSimpan: null }))).toBe(
      'lengkap',
    );
  });

  it('bergantung = null, petunjuk kosong: tidak_bisa_dicek', () => {
    expect(
      status(
        'L-19',
        makeLabel({ caraPenyimpananTeks: '' }),
        makeAnswers({ bergantungCaraSimpan: null }),
      ),
    ).toBe('tidak_bisa_dicek');
  });

  it('tidak terbaca mengalahkan jawaban apa pun', () => {
    for (const jawaban of [true, false, null]) {
      expect(
        status(
          'L-19',
          makeLabel(unreadable('caraPenyimpananTeks')),
          makeAnswers({ bergantungCaraSimpan: jawaban }),
        ),
      ).toBe('tidak_bisa_dicek');
    }
  });
});

describe('L-20 penanda bahasa Inggris', () => {
  const cases: Array<[string, Partial<LabelData>]> = [
    ['Ingredients:', { daftarBahanTeks: 'Ingredients: flour, sugar' }],
    ['Ingredients :', { daftarBahanTeks: 'Ingredients : flour' }],
    ['Net weight', { beratBersihTeks: 'Net weight 150 g' }],
    ['Netweight', { beratBersihTeks: 'Netweight 150 g' }],
    ['Net wt', { beratBersihTeks: 'Net wt. 150 g' }],
    ['Best before', { kedaluwarsaTeks: 'Best before 13 Dec 2026' }],
    ['Bestbefore', { kedaluwarsaTeks: 'Bestbefore 13 Dec 2026' }],
    ['Expired date', { kedaluwarsaTeks: 'Expired date 13 Dec 2026' }],
    ['Expired  Date', { kedaluwarsaTeks: 'Expired  Date: 13/12/2026' }],
    [
      'Manufactured by',
      { alamatProdusen: 'Manufactured by Dapur Bu Rina, Bandung 40115, Indonesia' },
    ],
    ['Produced by', { alamatProdusen: 'Produced by Dapur Bu Rina, Bandung 40115, Indonesia' }],
    ['Contains allergen', { pernyataanAlergenTeks: 'Contains allergen: egg' }],
    ['Contains allergens', { pernyataanAlergenTeks: 'Contains allergens: egg' }],
    ['Keep refrigerated', { caraPenyimpananTeks: 'Keep refrigerated' }],
    ['KEEP  REFRIGERATED', { caraPenyimpananTeks: 'KEEP  REFRIGERATED' }],
  ];

  it.each(cases)('penanda "%s" memicu kurang', (_nama, override) => {
    expect(status('L-20', makeLabel(override))).toBe('kurang');
  });

  it('label berbahasa Indonesia: lengkap', () => {
    expect(status('L-20', makeLabel())).toBe('lengkap');
  });

  it('kebijakan: "Ingredients" tanpa titik dua tidak memicu (pola mensyaratkan titik dua)', () => {
    expect(status('L-20', makeLabel({ daftarBahanTeks: 'Ingredients flour' }))).toBe('lengkap');
  });

  it('kebijakan: pernyataanLain dan nama produk tidak diperiksa bahasanya', () => {
    expect(status('L-20', makeLabel({ pernyataanLain: ['Net weight 100 g'] }))).toBe('lengkap');
  });

  it('semua kolom yang diperiksa kosong: tidak_bisa_dicek', () => {
    expect(status('L-20', createEmptyLabelData())).toBe('tidak_bisa_dicek');
  });

  it('hanya kolom di luar daftar (nama produk) terisi: tidak_bisa_dicek', () => {
    expect(status('L-20', { ...createEmptyLabelData(), namaProduk: 'Net weight snack' })).toBe(
      'tidak_bisa_dicek',
    );
  });

  it('kata Inggris umum lain bukan penanda keterangan wajib', () => {
    expect(
      status(
        'L-20',
        makeLabel({ namaProduk: 'Cookies', daftarBahanTeks: 'Komposisi: cookies, gula' }),
      ),
    ).toBe('lengkap');
  });
});

describe('detectAllergens - kelompok dan batas kata', () => {
  it('teks kosong atau spasi: tidak ada alergen', () => {
    expect(detectAllergens('')).toEqual([]);
    expect(detectAllergens('   \n ')).toEqual([]);
  });

  it.each([
    [
      'Serealia mengandung gluten',
      ['gandum', 'terigu', 'tepung terigu', 'oat', 'gluten', 'tepung roti', 'panir', 'malt', 'barley', 'rye', 'jelai'],
    ],
    ['Telur', ['telur', 'putih telur', 'kuning telur', 'tepung telur']],
    [
      'Ikan',
      ['ikan', 'teri', 'tenggiri', 'tuna', 'salmon', 'lele', 'patin', 'bandeng', 'kakap', 'tongkol', 'cakalang', 'sarden'],
    ],
    ['Krustase', ['udang', 'ebi', 'rebon', 'kepiting', 'rajungan', 'lobster']],
    ['Moluska', ['cumi', 'sotong', 'gurita', 'kerang', 'tiram', 'siput']],
    ['Kacang tanah', ['kacang tanah', 'selai kacang']],
    ['Kedelai', ['kedelai', 'kecap', 'tahu', 'tempe', 'tauco', 'edamame']],
    [
      'Susu',
      ['susu', 'susu bubuk', 'keju', 'mentega', 'butter', 'whey', 'kasein', 'laktosa', 'yogurt', 'yoghurt'],
    ],
    [
      'Kacang pohon',
      ['kacang mete', 'mete', 'mede', 'almond', 'kenari', 'walnut', 'hazelnut', 'pistachio', 'pecan', 'macadamia'],
    ],
    ['Sulfit', ['sulfit', 'natrium metabisulfit', 'kalium metabisulfit', 'belerang dioksida', 'e220', 'e223']],
  ])('kelompok %s terdeteksi dari kata kunci', (kategori, kataKunci) => {
    for (const kata of kataKunci) {
      expect(detectAllergens(`Komposisi: garam, ${kata}, air`), kata).toContain(kategori);
    }
  });

  it('setiap kelompok dilaporkan tepat satu kali walau banyak kata kunci', () => {
    const found = detectAllergens('susu, keju, mentega, butter');
    expect(found.filter((x) => x === 'Susu')).toHaveLength(1);
  });

  it('kata kunci tidak peka huruf besar-kecil', () => {
    expect(detectAllergens('TELUR, Kecap')).toEqual(['Telur', 'Kedelai']);
  });

  it('batas kata: "kecap" tidak cocok pada kata yang memuatnya', () => {
    expect(detectAllergens('kecapi, berkecap, kecapan')).toEqual([]);
    expect(detectAllergens('kecap manis')).toEqual(['Kedelai']);
  });

  it.each([
    'butterfly',
    'cumi2',
    'oatmeal',
    'tahun',
    'tahuan',
    'susunan',
    'metempe',
    'teriyaki',
    'meteran',
    'rebonan',
    'ikannya',
  ])('"%s" bukan alergen', (kata) => {
    expect(detectAllergens(`Komposisi: ${kata}`)).toEqual([]);
  });

  it('tanda baca dan baris baru bertindak sebagai batas kata', () => {
    expect(detectAllergens('(telur)')).toEqual(['Telur']);
    expect(detectAllergens('gula;telur.')).toEqual(['Telur']);
    expect(detectAllergens('gula\ntelur\n')).toEqual(['Telur']);
    expect(detectAllergens('gula/susu')).toEqual(['Susu']);
  });

  it('tanda hubung bertindak sebagai batas kata ("tepung-terigu" cocok pada "terigu")', () => {
    expect(detectAllergens('tepung-terigu')).toEqual(['Serealia mengandung gluten']);
  });

  it('kata kunci majemuk memerlukan satu spasi ("kacang tanah")', () => {
    expect(detectAllergens('kacang tanah')).toEqual(['Kacang tanah']);
    expect(detectAllergens('kacang hijau')).toEqual([]);
  });

  it('kacang mete memicu kacang pohon dan bukan kacang tanah', () => {
    expect(detectAllergens('kacang mete')).toEqual(['Kacang pohon']);
  });

  it('kecap dan tahu memicu kedelai walau tidak ada kata "kedelai"', () => {
    expect(detectAllergens('kecap, tahu')).toEqual(['Kedelai']);
  });

  it('kode E tidak peka huruf besar-kecil dan tidak cocok pada kode lebih panjang', () => {
    expect(detectAllergens('E220')).toEqual(['Sulfit']);
    expect(detectAllergens('e2200')).toEqual([]);
  });

  it('kebijakan: hanya kata kunci terdaftar yang dideteksi ("santan" tidak, "minyak ikan" ya)', () => {
    expect(detectAllergens('santan')).toEqual([]);
    expect(detectAllergens('minyak ikan')).toEqual(['Ikan']);
  });

  it('kebijakan: "susu kedelai" memicu dua kelompok, "krimer" tanpa kata susu tidak memicu apa pun', () => {
    expect(detectAllergens('susu kedelai')).toEqual(['Kedelai', 'Susu']);
    expect(detectAllergens('krimer')).toEqual([]);
  });

  it('kebijakan: "kacang" saja dan "kacang kedelai" - kacang saja bukan alergen terdaftar', () => {
    expect(detectAllergens('kacang')).toEqual([]);
    expect(detectAllergens('kacang kedelai')).toEqual(['Kedelai']);
  });
});
