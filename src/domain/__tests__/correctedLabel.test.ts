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
      'Cara penyimpanan',
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

  it('cara penyimpanan: tidak wajib bila tidak bergantung; belum dijawab dan kosong memblokir unduhan', () => {
    const tidak = buildCorrectedLabel(makeLabel(), makeAnswers({ bergantungCaraSimpan: false }));
    expect(row(tidak, 'caraPenyimpanan').wajib).toBe(false);
    expect(tidak.siapUnduh).toBe(true);

    const belum = buildCorrectedLabel(makeLabel(), makeAnswers({ bergantungCaraSimpan: null }));
    expect(row(belum, 'caraPenyimpanan').wajib).toBe(true);
    expect(row(belum, 'caraPenyimpanan').kosong).toBe(true);
    expect(belum.siapUnduh).toBe(false);
    expect(belum.catatan).toContain('Jawab pertanyaan cara simpan atau tulis petunjuk penyimpanan.');

    const terisi = buildCorrectedLabel(
      makeLabel({ caraPenyimpananTeks: 'Simpan di tempat sejuk.' }),
      makeAnswers({ bergantungCaraSimpan: null }),
    );
    expect(terisi.siapUnduh).toBe(true);
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

  it('menyusun ulang bahan menurut resep bila semua bahan punya padanan', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, gula pasir; tepung\nminyak.' }),
      makeAnswers({
        resep: [
          { nama: 'garam', jumlahGram: 5 },
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'gula pasir', jumlahGram: 200 },
          { nama: 'minyak', jumlahGram: 100 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: tepung, gula pasir, minyak, garam.');
    expect(result.catatan.some((c) => c.includes('disusun ulang'))).toBe(true);
  });

  it('bahan label tanpa padanan resep: tidak diurutkan ulang, pemisah asli tetap, ada catatan', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam; vanili\ngula pasir, tepung.' }),
      makeAnswers({
        resep: [
          { nama: 'garam', jumlahGram: 5 },
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'gula pasir', jumlahGram: 200 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: garam; vanili\ngula pasir, tepung.');
    expect(result.catatan.some((c) => c.includes('vanili'))).toBe(true);
    expect(result.catatan.some((c) => c.includes('disusun ulang'))).toBe(false);
  });

  it('bahan resep tanpa padanan di label: tidak diurutkan ulang, ada catatan', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, tepung, gula.' }),
      makeAnswers({
        resep: [
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'garam', jumlahGram: 5 },
          { nama: 'gula', jumlahGram: 50 },
          { nama: 'ragi', jumlahGram: 2 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: garam, tepung, gula.');
    expect(result.catatan.some((c) => c.includes('ragi'))).toBe(true);
  });

  it('kecocokan bahan memakai kata utuh, bukan substring', () => {
    const result = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, gulai, tepung.' }),
      makeAnswers({
        resep: [
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'gula', jumlahGram: 50 },
          { nama: 'garam', jumlahGram: 5 },
        ],
      }),
    );
    expect(row(result, 'daftarBahan').teks).toBe('Komposisi: garam, gulai, tepung.');
    expect(result.catatan.some((c) => c.includes('belum cukup cocok'))).toBe(true);

    const utuh = buildCorrectedLabel(
      makeLabel({ daftarBahanTeks: 'Komposisi: garam, tepung terigu, gula.' }),
      makeAnswers({
        resep: [
          { nama: 'tepung', jumlahGram: 500 },
          { nama: 'gula', jumlahGram: 50 },
          { nama: 'garam', jumlahGram: 5 },
        ],
      }),
    );
    expect(row(utuh, 'daftarBahan').teks).toBe('Komposisi: tepung terigu, gula, garam.');
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
    for (const awal of ['Exp: ', 'EXP ', 'Expired: ', 'Kadaluarsa: ', 'Exp. date: ', 'Exp date ', 'ED: ', 'Best before ', 'Baik dikonsumsi sebelum: ', 'Exp Exp ', '']) {
      const result = buildCorrectedLabel(
        makeLabel({ kedaluwarsaTeks: `${awal}13 Des 2026` }),
        makeAnswers(),
      );
      expect(row(result, 'kedaluwarsa').teks, awal).toBe('Baik digunakan sebelum: 13 Des 2026');
    }
  });

  it('kedaluwarsa: awalan tak dikenal tidak diganti dan awalan baku tidak digandakan', () => {
    const lain = buildCorrectedLabel(makeLabel({ kedaluwarsaTeks: 'Edisi 13 Des 2026' }), makeAnswers());
    expect(row(lain, 'kedaluwarsa').teks).toBe('Baik digunakan sebelum: Edisi 13 Des 2026');
    const baku = buildCorrectedLabel(makeLabel(), makeAnswers());
    expect(row(baku, 'kedaluwarsa').teks.match(/Baik digunakan sebelum/g)).toHaveLength(1);
  });

  it('kedaluwarsa yang sudah benar dibiarkan; awalan tanpa tanggal tetap kosong', () => {
    const ok = buildCorrectedLabel(makeLabel(), makeAnswers());
    expect(row(ok, 'kedaluwarsa').teks).toBe('Baik digunakan sebelum: 13 Des 2026');
    const kosong = buildCorrectedLabel(makeLabel({ kedaluwarsaTeks: 'Exp:' }), makeAnswers());
    expect(row(kosong, 'kedaluwarsa').kosong).toBe(true);
    expect(kosong.siapUnduh).toBe(false);
  });

  it('P-IRT: penulisan tidak baku dinormalkan dengan catatan', () => {
    for (const teks of ['PIRT 123', 'P IRT 123', 'p.irt 123', 'P-irt 123']) {
      const result = buildCorrectedLabel(makeLabel({ nomorIzinTeks: teks }), makeAnswers());
      expect(row(result, 'nomorIzin').teks, teks).toBe('P-IRT 123');
      expect(result.catatan.some((c) => c.includes('dirapikan'))).toBe(true);
      expect(result.siapUnduh).toBe(true);
    }
  });

  it('P-IRT: teks tanpa tulisan P-IRT tidak diberi awalan, ditandai belum lengkap', () => {
    for (const teks of ['MD 123', '2053273010123-29']) {
      const result = buildCorrectedLabel(makeLabel({ nomorIzinTeks: teks }), makeAnswers());
      expect(row(result, 'nomorIzin').teks).toBe(teks);
      expect(row(result, 'nomorIzin').kosong).toBe(true);
      expect(result.butirKosong).toContain('Nomor izin P-IRT');
      expect(result.siapUnduh).toBe(false);
      expect(result.catatan).toContain('Tulisan P-IRT belum ada; tulis sesuai nomor izin dari dinas.');
    }
  });

  it('tanggal produksi: angka 6-8 digit yang bukan tanggal valid tidak dihitung', () => {
    const tanpaTanggal = { tanggalProduksiTeks: '' };
    for (const kode of ['LOT123456', '999999', '12345678', '991399', 'B01-000000']) {
      const result = buildCorrectedLabel(
        makeLabel({ ...tanpaTanggal, kodeProduksiTeks: kode }),
        makeAnswers(),
      );
      expect(row(result, 'tanggalKodeProduksi').kosong, kode).toBe(true);
    }
    for (const kode of ['13/11/26', '13-11-2026', '131126', '20261113', '13112026', 'A1 13.11.26']) {
      const result = buildCorrectedLabel(
        makeLabel({ ...tanpaTanggal, kodeProduksiTeks: kode }),
        makeAnswers(),
      );
      expect(row(result, 'tanggalKodeProduksi').kosong, kode).toBe(false);
    }
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
