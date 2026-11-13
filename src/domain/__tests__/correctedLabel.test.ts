import { describe, expect, it } from 'vitest';
import {
  ALLERGEN_STATEMENT,
  MANDATORY_LABEL_ITEMS,
  buildCorrectedLabel,
  canDownloadLabel,
  splitAllergenParts,
  type CorrectedLabelKey,
} from '../correctedLabel';
import { createEmptyAnswers, createEmptyLabelData } from '../labelRules';
import { LABEL_RULE_METADATA } from '../regulations';
import { SAMPLE_LABEL_CASES } from '../sampleLabels';
import type { AdditionalAnswers, LabelData } from '../types';

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    ...createEmptyLabelData(),
    namaProduk: 'Keripik Pisang Renyah',
    daftarBahanTeks: 'Komposisi: pisang kepok, minyak kelapa sawit, gula pasir, garam.',
    beratBersihTeks: 'Berat bersih: 150 g',
    namaProdusen: 'Dapur Bu Rina',
    alamatProdusen: 'Jl. Melati No. 12, Kota Bandung 40115, Indonesia',
    kodeProduksiTeks: 'B01-131126',
    tanggalProduksiTeks: '13 Nov 2026',
    kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Des 2026',
    nomorIzinTeks: 'P-IRT 2053273010123-29',
    ...overrides,
  };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return { ...createEmptyAnswers(), bergantungCaraSimpan: false, ...overrides };
}

function row(result: ReturnType<typeof buildCorrectedLabel>, kunci: CorrectedLabelKey) {
  const found = result.baris.find((r) => r.kunci === kunci);
  if (!found) throw new Error(`baris ${kunci} tidak ada`);
  return found;
}

describe('MANDATORY_LABEL_ITEMS', () => {
  it('memuat sepuluh butir dengan urutan tetap dan pasal dari metadata aturan', () => {
    expect(MANDATORY_LABEL_ITEMS.map((i) => i.kunci)).toEqual([
      'namaProduk',
      'daftarBahan',
      'beratBersih',
      'produsen',
      'nomorIzin',
      'tanggalKodeProduksi',
      'kedaluwarsa',
      'pernyataanAlergen',
      'caraPenyimpanan',
      'keteranganHalal',
    ]);
    for (const entry of MANDATORY_LABEL_ITEMS) {
      expect(entry.rujukan).toEqual(LABEL_RULE_METADATA[entry.aturan].rujukan);
    }
  });
});

describe('buildCorrectedLabel: label lengkap', () => {
  it('siap diunduh dan baris mengikuti urutan butir', () => {
    const result = buildCorrectedLabel(makeLabel(), makeAnswers());
    expect(result.siapUnduh).toBe(true);
    expect(result.butirKosong).toEqual([]);
    expect(result.baris.slice(0, 10).map((r) => r.kunci)).toEqual(
      MANDATORY_LABEL_ITEMS.map((i) => i.kunci),
    );
  });

  it('butir wajib tetap berlaku untuk tiap butir: kosongkan satu per satu', () => {
    const cases: Array<[CorrectedLabelKey, Partial<LabelData>]> = [
      ['namaProduk', { namaProduk: '  ' }],
      ['daftarBahan', { daftarBahanTeks: '' }],
      ['beratBersih', { beratBersihTeks: '' }],
      ['produsen', { namaProdusen: '' }],
      ['produsen', { alamatProdusen: '' }],
      ['nomorIzin', { nomorIzinTeks: '' }],
      ['tanggalKodeProduksi', { kodeProduksiTeks: '' }],
      ['tanggalKodeProduksi', { tanggalProduksiTeks: '', kodeProduksiTeks: 'B01' }],
      ['kedaluwarsa', { kedaluwarsaTeks: '' }],
    ];
    for (const [kunci, override] of cases) {
      const result = buildCorrectedLabel(makeLabel(override), makeAnswers());
      expect(result.siapUnduh, `${kunci} ${JSON.stringify(override)}`).toBe(false);
      expect(row(result, kunci).kosong).toBe(true);
      expect(row(result, kunci).wajib).toBe(true);
      expect(result.butirKosong).toContain(row(result, kunci).judul);
    }
  });

  it('tanggal produksi boleh kosong bila kode memuat tanggal (sama seperti L-08)', () => {
    const result = buildCorrectedLabel(makeLabel({ tanggalProduksiTeks: '' }), makeAnswers());
    expect(row(result, 'tanggalKodeProduksi').kosong).toBe(false);
    expect(result.siapUnduh).toBe(true);
  });

  it('label sepenuhnya kosong: semua butir wajib kosong dan tidak ada yang dikarang', () => {
    const result = buildCorrectedLabel(createEmptyLabelData(), createEmptyAnswers());
    expect(result.siapUnduh).toBe(false);
    expect(result.butirKosong).toEqual([
      'Nama jenis pangan',
      'Daftar bahan',
      'Berat bersih / isi bersih',
      'Nama dan alamat produsen',
      'Nomor izin P-IRT',
      'Tanggal dan kode produksi',
      'Kedaluwarsa',
    ]);
    for (const r of result.baris) expect(r.teks).toBe('');
  });
});

describe('buildCorrectedLabel: butir bersyarat', () => {
  it('alergen: wajib dan terisi otomatis bila ada alergen terdeteksi', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: tepung terigu, gula, telur.' }),
      makeAnswers(),
    );
    const r = row(result, 'pernyataanAlergen');
    expect(r.wajib).toBe(true);
    expect(r.kosong).toBe(false);
    expect(r.teks).toBe(ALLERGEN_STATEMENT);
    expect(result.alergenTerdeteksi).toEqual(['Serealia mengandung gluten', 'Telur']);
  });

  it('alergen: tidak wajib dan tidak dicetak bila tidak ada alergen', () => {
    const r = row(buildCorrectedLabel(makeLabel(), makeAnswers()), 'pernyataanAlergen');
    expect(r.wajib).toBe(false);
    expect(r.teks).toBe('');
  });

  it('cara penyimpanan: wajib dan menghalangi unduhan bila bergantung cara simpan dan kosong', () => {
    const result = buildCorrectedLabel(makeLabel(), makeAnswers({ bergantungCaraSimpan: true }));
    expect(row(result, 'caraPenyimpanan').wajib).toBe(true);
    expect(row(result, 'caraPenyimpanan').kosong).toBe(true);
    expect(result.siapUnduh).toBe(false);
  });

  it('cara penyimpanan: terisi dan siap unduh', () => {
    const result = buildCorrectedLabel(
      makeLabel({ caraPenyimpananTeks: 'Simpan di tempat sejuk dan kering.' }),
      makeAnswers({ bergantungCaraSimpan: true }),
    );
    expect(result.siapUnduh).toBe(true);
  });

  it('cara penyimpanan: tidak wajib bila tidak bergantung, dan diberi catatan bila belum dijawab', () => {
    const tidak = buildCorrectedLabel(makeLabel(), makeAnswers({ bergantungCaraSimpan: false }));
    expect(row(tidak, 'caraPenyimpanan').wajib).toBe(false);
    expect(tidak.siapUnduh).toBe(true);

    const belum = buildCorrectedLabel(makeLabel(), makeAnswers({ bergantungCaraSimpan: null }));
    expect(row(belum, 'caraPenyimpanan').wajib).toBe(false);
    expect(belum.catatan.some((c) => c.includes('cara penyimpanan'))).toBe(true);
  });

  it('halal: dicetak hanya bila bersertifikat; dihapus dengan catatan bila belum atau belum dijawab', () => {
    const teks = 'Halal Indonesia ID32110000123450123';
    const ya = buildCorrectedLabel(
      makeLabel({ keteranganHalalTeks: teks }),
      makeAnswers({ punyaSertifikatHalal: true }),
    );
    expect(row(ya, 'keteranganHalal').teks).toBe(teks);
    expect(row(ya, 'keteranganHalal').wajib).toBe(false);

    for (const status of [false, null]) {
      const tidak = buildCorrectedLabel(
        makeLabel({ keteranganHalalTeks: teks }),
        makeAnswers({ punyaSertifikatHalal: status }),
      );
      expect(row(tidak, 'keteranganHalal').teks).toBe('');
      expect(tidak.catatan.some((c) => c.includes('halal'))).toBe(true);
      expect(tidak.siapUnduh).toBe(true);
    }
  });

  it('halal bersertifikat tanpa teks: kosong tetapi tidak menghalangi unduhan', () => {
    const result = buildCorrectedLabel(makeLabel(), makeAnswers({ punyaSertifikatHalal: true }));
    expect(row(result, 'keteranganHalal').kosong).toBe(true);
    expect(result.siapUnduh).toBe(true);
  });
});

describe('buildCorrectedLabel: perbaikan otomatis', () => {
  it('menambah awalan Komposisi bila belum ada, dan mempertahankan awalan resmi lain', () => {
    const tanpa = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'pisang, minyak, garam' }),
      makeAnswers(),
    );
    expect(row(tanpa, 'daftarBahan').teks).toBe('Komposisi: pisang, minyak, garam.');

    const daftar = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'daftar bahan: pisang, minyak, garam.' }),
      makeAnswers(),
    );
    expect(row(daftar, 'daftarBahan').teks).toBe('Daftar bahan: pisang, minyak, garam.');
  });

  it('menyusun ulang bahan menurut resep dan menaruh bahan tak cocok di belakang', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, vanili, gula pasir, tepung, minyak.' }),
      makeAnswers({
        resep: [
          { nama: 'garam', jumlahGram: 5 },
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'gula pasir', jumlahGram: 200 },
          { nama: 'minyak', jumlahGram: 100 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe(
      'Komposisi: tepung, gula pasir, minyak, garam, vanili.',
    );
    expect(result.catatan.some((c) => c.includes('disusun ulang'))).toBe(true);
  });

  it('tidak memecah koma di dalam tanda kurung', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, bumbu (bawang, merica), tepung.' }),
      makeAnswers({
        resep: [
          { nama: 'tepung', jumlahGram: 300 },
          { nama: 'bumbu', jumlahGram: 50 },
          { nama: 'garam', jumlahGram: 10 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: tepung, bumbu (bawang, merica), garam.');
  });

  it('tanpa resep yang cukup, urutan tidak diubah dan ada catatan', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, tepung.' }),
      makeAnswers({ resep: [{ nama: 'tepung', jumlahGram: 5 }] }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: garam, tepung.');
    expect(result.catatan.some((c) => c.includes('belum bisa dipastikan'))).toBe(true);
    expect(result.siapUnduh).toBe(true);
  });

  it('resep tidak cocok dengan label: urutan tetap dan ada catatan', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, tepung.' }),
      makeAnswers({
        resep: [
          { nama: 'coklat', jumlahGram: 50 },
          { nama: 'susu', jumlahGram: 40 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: garam, tepung.');
    expect(result.catatan.some((c) => c.includes('belum cukup cocok'))).toBe(true);
  });

  it('mengganti awalan Exp/Expired/Kadaluarsa dan menambah awalan pada tanggal polos', () => {
    for (const awal of ['Exp: ', 'EXP ', 'Expired: ', 'Kadaluarsa: ', 'Exp. date: ', '']) {
      const result = buildCorrectedLabel(
        makeLabel({ kedaluwarsaTeks: `${awal}13 Des 2026` }),
        makeAnswers(),
      );
      expect(row(result, 'kedaluwarsa').teks, awal).toBe('Baik digunakan sebelum: 13 Des 2026');
    }
  });

  it('kedaluwarsa yang sudah benar dibiarkan; awalan tanpa tanggal tetap kosong', () => {
    const ok = buildCorrectedLabel(makeLabel(), makeAnswers());
    expect(row(ok, 'kedaluwarsa').teks).toBe('Baik digunakan sebelum: 13 Des 2026');
    const kosong = buildCorrectedLabel(makeLabel({ kedaluwarsaTeks: 'Exp:' }), makeAnswers());
    expect(row(kosong, 'kedaluwarsa').kosong).toBe(true);
    expect(kosong.siapUnduh).toBe(false);
  });

  it('menulis P-IRT di depan nomor tanpa mengarang nomor', () => {
    const result = buildCorrectedLabel(
      makeLabel({ nomorIzinTeks: '2053273010123-29' }),
      makeAnswers(),
    );
    expect(row(result, 'nomorIzin').teks).toBe('P-IRT 2053273010123-29');
  });

  it('membuang klaim L-15 dan L-17 dengan catatan, mempertahankan klaim lain', () => {
    const result = buildCorrectedLabel(
      makeLabel({ pernyataanLain: ['Menyehatkan jantung', 'Bebas bahan tambahan pangan', 'Renyah dan gurih'] }),
      makeAnswers(),
    );
    expect(row(result, 'pernyataanLain').teks).toBe('Renyah dan gurih');
    expect(result.catatan.filter((c) => c.includes('dibuang'))).toHaveLength(2);
  });

  it('tidak pernah mengarang alamat atau nomor izin saat kosong', () => {
    const result = buildCorrectedLabel(
      makeLabel({ alamatProdusen: '', nomorIzinTeks: '' }),
      makeAnswers(),
    );
    expect(row(result, 'produsen').teks).toBe('Dapur Bu Rina');
    expect(row(result, 'nomorIzin').teks).toBe('');
    expect(result.siapUnduh).toBe(false);
  });

  it('mencatat temuan lain yang tidak bisa diperbaiki otomatis', () => {
    const result = buildCorrectedLabel(
      makeLabel({ beratBersihTeks: '150 buah' }),
      makeAnswers(),
    );
    expect(result.catatan.some((c) => c.startsWith('L-05'))).toBe(true);
  });
});

describe('alergen cetak tebal', () => {
  it('splitAllergenParts memotong dan gabungannya sama dengan teks asli', () => {
    const teks = 'Komposisi: tepung terigu, gula, Telur, minyak.';
    const parts = splitAllergenParts(teks);
    expect(parts.map((p) => p.teks).join('')).toBe(teks);
    expect(parts.filter((p) => p.alergen).map((p) => p.teks)).toEqual(['tepung terigu', 'Telur']);
  });

  it('tidak menebalkan potongan di tengah kata', () => {
    expect(splitAllergenParts('Komposisi: ikanku, soto').some((p) => p.alergen)).toBe(false);
    expect(splitAllergenParts('teri.').filter((p) => p.alergen).map((p) => p.teks)).toEqual(['teri']);
  });

  it('bahanBagian memuat awalan dan penanda alergen konsisten dengan detectAllergens', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'tepung terigu, gula, susu bubuk' }),
      makeAnswers(),
    );
    expect(result.bahanBagian.map((p) => p.teks).join('')).toBe(row(result, 'daftarBahan').teks);
    expect(result.bahanBagian.filter((p) => p.alergen).map((p) => p.teks)).toEqual([
      'tepung terigu',
      'susu bubuk',
    ]);
  });

  it('bahanBagian kosong bila daftar bahan kosong', () => {
    expect(buildCorrectedLabel(makeLabel({ daftarBahanTeks: '' }), makeAnswers()).bahanBagian).toEqual([]);
  });
});

describe('canDownloadLabel', () => {
  it('false hanya bila ada butir wajib yang kosong', () => {
    expect(canDownloadLabel([])).toBe(true);
    expect(canDownloadLabel([{ wajib: true, kosong: false }])).toBe(true);
    expect(canDownloadLabel([{ wajib: false, kosong: true }])).toBe(true);
    expect(
      canDownloadLabel([
        { wajib: true, kosong: false },
        { wajib: true, kosong: true },
      ]),
    ).toBe(false);
  });
});

describe('label contoh', () => {
  it('contoh kue kering: lengkap, bahan terurut menurut resep, alergen tercantum', () => {
    const kue = SAMPLE_LABEL_CASES[0];
    if (!kue) throw new Error('contoh tidak ada');
    const result = buildCorrectedLabel(kue.label, kue.answers);
    expect(result.siapUnduh).toBe(true);
    expect(row(result, 'daftarBahan').teks.startsWith('Komposisi: tepung terigu, kacang tanah, gula halus')).toBe(true);
    expect(row(result, 'pernyataanAlergen').teks).toBe(ALLERGEN_STATEMENT);
  });
});

describe('label contoh dengan butir kosong', () => {
  it('contoh yang memang belum lengkap tidak bisa diunduh dan butir kosongnya disebut', () => {
    const hasil = SAMPLE_LABEL_CASES.map((c) => buildCorrectedLabel(c.label, c.answers));
    for (const result of hasil) {
      expect(result.siapUnduh).toBe(result.butirKosong.length === 0);
    }
    expect(hasil.some((r) => !r.siapUnduh)).toBe(true);
  });
});
