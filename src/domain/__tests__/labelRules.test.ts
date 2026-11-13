import { describe, expect, it } from 'vitest';
import { detectAllergens } from '../allergens';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
} from '../labelRules';
import type { AdditionalAnswers, LabelData, LabelRuleId } from '../types';

function makeValidLabel(overrides: Partial<LabelData> = {}): LabelData {
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
    ...overrides,
  };
}

function makeValidAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
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

function getRule(
  id: LabelRuleId,
  label: LabelData,
  answers: AdditionalAnswers = makeValidAnswers(),
) {
  const report = evaluateLabelRules(label, answers);
  const found = report.hasil.find((rule) => rule.id === id);
  if (!found) {
    throw new Error(`Rule ${id} tidak ditemukan`);
  }
  return found;
}

describe('detectAllergens', () => {
  it('mendeteksi alergen dari sepuluh kelompok Pasal 49', () => {
    const detected = detectAllergens(
      'Komposisi: tepung terigu, telur ayam, ikan tenggiri, kacang tanah, kecap kedelai, susu bubuk.',
    );

    expect(detected).toContain('Serealia mengandung gluten');
    expect(detected).toContain('Telur');
    expect(detected).toContain('Ikan');
    expect(detected).toContain('Kacang tanah');
    expect(detected).toContain('Kedelai');
    expect(detected).toContain('Susu');
  });

  it('tidak salah cocok pada kata lain yang tidak mengandung alergen', () => {
    const detected = detectAllergens('Komposisi: singkong, minyak kelapa sawit, gula merah, garam.');
    expect(detected).toEqual([]);
  });
});

describe('evaluateLabelRules — kondisi dasar lengkap', () => {
  it('mengembalikan 20 aturan dengan 18 lengkap dan 2 tidak bisa dicek (L-13, L-14) pada label rapi', () => {
    const report = evaluateLabelRules(makeValidLabel(), makeValidAnswers());

    expect(report.hasil).toHaveLength(20);
    expect(report.ringkasan.kurang).toBe(0);
    expect(report.ringkasan.tidakBisaDicek).toBe(2);
    expect(report.ringkasan.lengkap).toBe(18);
    expect(report.siapCetak).toBe(true);
  });
});

describe('evaluateLabelRules — L-01 sampai L-10', () => {
  it('L-01: kurang jika nama jenis pangan kosong, tidak_bisa_dicek jika tidak terbaca', () => {
    expect(getRule('L-01', makeValidLabel({ namaProduk: '   ' })).status).toBe('kurang');
    expect(
      getRule('L-01', makeValidLabel({ unreadableFields: ['namaProduk'] })).status,
    ).toBe('tidak_bisa_dicek');
  });

  it('L-02: menerima empat kata pembuka resmi dan menolak jika tanpa awalan', () => {
    expect(
      getRule('L-02', makeValidLabel({ daftarBahanTeks: 'Bahan-bahan: singkong, garam.' })).status,
    ).toBe('lengkap');
    expect(
      getRule('L-02', makeValidLabel({ daftarBahanTeks: 'Daftar bahan: singkong, garam.' })).status,
    ).toBe('lengkap');
    expect(
      getRule(
        'L-02',
        makeValidLabel({ daftarBahanTeks: 'Bahan yang digunakan: singkong, garam.' }),
      ).status,
    ).toBe('lengkap');
    expect(
      getRule('L-02', makeValidLabel({ daftarBahanTeks: 'singkong, minyak goreng, garam' })).status,
    ).toBe('kurang');
  });

  it('L-03: kurang bila urutan bahan di label terbalik dari takaran resep terbanyak', () => {
    const label = makeValidLabel({
      daftarBahanTeks:
        'Komposisi: tepung terigu, pisang kepok, minyak kelapa sawit, gula pasir, garam.',
    });
    const result = getRule('L-03', label, makeValidAnswers());
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('pisang kepok');
  });

  it('L-03: tidak_bisa_dicek bila resep belum diisi', () => {
    const result = getRule('L-03', makeValidLabel(), makeValidAnswers({ resep: [] }));
    expect(result.status).toBe('tidak_bisa_dicek');
  });

  it('L-04: kurang bila memakai singkatan bahan, namun membolehkan singkatan dalam kurung setelah kepanjangan', () => {
    expect(
      getRule('L-04', makeValidLabel({ daftarBahanTeks: 'Komposisi: singkong, MSG, tep. terigu.' }))
        .status,
    ).toBe('kurang');

    expect(
      getRule(
        'L-04',
        makeValidLabel({
          daftarBahanTeks: 'Komposisi: singkong, mononatrium glutamat (MSG), garam.',
        }),
      ).status,
    ).toBe('lengkap');
  });

  it('L-05: hanya menerima satuan metrik baku g, kg, ml, L', () => {
    expect(getRule('L-05', makeValidLabel({ beratBersihTeks: 'Isi bersih: 500 ml' })).status).toBe(
      'lengkap',
    );
    expect(getRule('L-05', makeValidLabel({ beratBersihTeks: 'Berat bersih: 1,5 kg' })).status).toBe(
      'lengkap',
    );
    expect(getRule('L-05', makeValidLabel({ beratBersihTeks: 'Berat bersih: 150 gram' })).status).toBe(
      'kurang',
    );
    expect(getRule('L-05', makeValidLabel({ beratBersihTeks: '2 ons' })).status).toBe('kurang');
  });

  it('L-06: memeriksa kelengkapan nama produsen, kota, kode pos 5 digit, dan Indonesia', () => {
    expect(
      getRule(
        'L-06',
        makeValidLabel({ alamatProdusen: 'Jl. Melati No. 12, Kota Bandung, Indonesia' }),
      ).status,
    ).toBe('kurang');
    expect(
      getRule('L-06', makeValidLabel({ alamatProdusen: 'Kota Bandung 40115' })).status,
    ).toBe('kurang');
    expect(
      getRule(
        'L-06',
        makeValidLabel({
          alamatProdusen: 'Dusun Krajan RT 02, Kabupaten Malang 65154, Indonesia',
        }),
      ).status,
    ).toBe('lengkap');
  });

  it('L-07: kurang jika keterangan halal dicantumkan tanpa sertifikat halal', () => {
    const result = getRule(
      'L-07',
      makeValidLabel({ keteranganHalalTeks: 'Halal' }),
      makeValidAnswers({ punyaSertifikatHalal: false }),
    );
    expect(result.status).toBe('kurang');

    expect(
      getRule(
        'L-07',
        makeValidLabel({ keteranganHalalTeks: '' }),
        makeValidAnswers({ punyaSertifikatHalal: false }),
      ).status,
    ).toBe('lengkap');
  });

  it('L-08: kurang bila kode atau tanggal produksi tidak lengkap', () => {
    expect(
      getRule('L-08', makeValidLabel({ kodeProduksiTeks: '', tanggalProduksiTeks: '' })).status,
    ).toBe('kurang');
    expect(
      getRule('L-08', makeValidLabel({ kodeProduksiTeks: 'B01', tanggalProduksiTeks: '' })).status,
    ).toBe('kurang');
  });

  it('L-09: wajib diawali "Baik digunakan sebelum"', () => {
    expect(
      getRule('L-09', makeValidLabel({ kedaluwarsaTeks: 'Exp: 13 Des 2026' })).status,
    ).toBe('kurang');
    expect(
      getRule('L-09', makeValidLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum 13/12/2026' }))
        .status,
    ).toBe('lengkap');
  });

  it('L-10: umur simpan sampai 3 bulan wajib memuat tanggal, bulan, dan tahun', () => {
    expect(
      getRule(
        'L-10',
        makeValidLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum: Des 2026' }),
        makeValidAnswers({ umurSimpanHari: 60 }),
      ).status,
    ).toBe('kurang');

    expect(
      getRule(
        'L-10',
        makeValidLabel({ kedaluwarsaTeks: 'Baik digunakan sebelum: Des 2027' }),
        makeValidAnswers({ umurSimpanHari: 365 }),
      ).status,
    ).toBe('lengkap');
  });
});

describe('evaluateLabelRules — L-11 sampai L-20', () => {
  it('L-11: mewajibkan tulisan P-IRT dengan tanda hubung', () => {
    expect(getRule('L-11', makeValidLabel({ nomorIzinTeks: 'PIRT 123456' })).status).toBe('kurang');
    expect(getRule('L-11', makeValidLabel({ nomorIzinTeks: '' })).status).toBe('kurang');
  });

  it('L-12: kurang bila ada alergen tanpa kalimat wajib Pasal 51', () => {
    const result = getRule(
      'L-12',
      makeValidLabel({
        daftarBahanTeks: 'Komposisi: pisang kepok, tepung terigu, telur, gula.',
        pernyataanAlergenTeks: '',
      }),
    );
    expect(result.status).toBe('kurang');
    expect(result.penjelasan).toContain('Telur');
  });

  it('L-13 dan L-14: selalu tidak_bisa_dicek sebagai pengingat sebelum cetak', () => {
    expect(getRule('L-13', makeValidLabel()).status).toBe('tidak_bisa_dicek');
    expect(getRule('L-14', makeValidLabel()).status).toBe('tidak_bisa_dicek');
  });

  it('L-15: kurang bila ada klaim menyehatkan atau mengobati', () => {
    expect(
      getRule(
        'L-15',
        makeValidLabel({ pernyataanLain: ['Membantu menurunkan kolesterol'] }),
      ).status,
    ).toBe('kurang');
  });

  it('L-16: kurang bila mengklaim tanpa pengawet tetapi memakai pengawet atau klaim di luar 5 golongan', () => {
    expect(
      getRule(
        'L-16',
        makeValidLabel({
          daftarBahanTeks: 'Komposisi: cabai, bawang merah, natrium benzoat.',
          pernyataanLain: ['Tanpa pengawet'],
        }),
      ).status,
    ).toBe('kurang');

    expect(
      getRule(
        'L-16',
        makeValidLabel({
          pernyataanLain: ['Tanpa pengemulsi'],
        }),
      ).status,
    ).toBe('kurang');

    expect(
      getRule(
        'L-16',
        makeValidLabel({
          pernyataanLain: ['Tanpa pengawet'],
        }),
      ).status,
    ).toBe('lengkap');
  });

  it('L-17: melarang pernyataan umum bebas bahan tambahan pangan', () => {
    expect(
      getRule(
        'L-17',
        makeValidLabel({ pernyataanLain: ['Bebas bahan tambahan pangan'] }),
      ).status,
    ).toBe('kurang');
  });

  it('L-18: menguji kata bersyarat alami, murni, 100%, asli, dan segar', () => {
    expect(
      getRule(
        'L-18',
        makeValidLabel({
          namaProduk: 'Keripik Pisang 100% Murni',
          daftarBahanTeks: 'Komposisi: pisang kepok, gula pasir, minyak goreng.',
        }),
      ).status,
    ).toBe('kurang');

    expect(
      getRule(
        'L-18',
        makeValidLabel({
          namaProduk: 'Madu Hutan Asli',
          daftarBahanTeks: 'Komposisi: madu hutan.',
          pernyataanAlergenTeks: '',
        }),
        makeValidAnswers({
          resep: [
            { nama: 'madu hutan', jumlahGram: 500 },
            { nama: 'kemasan', jumlahGram: 10 },
          ],
        }),
      ).status,
    ).toBe('tidak_bisa_dicek');
  });

  it('L-19: kurang bila bergantung cara simpan tetapi petunjuk penyimpanan kosong', () => {
    expect(
      getRule(
        'L-19',
        makeValidLabel({ caraPenyimpananTeks: '' }),
        makeValidAnswers({ bergantungCaraSimpan: true }),
      ).status,
    ).toBe('kurang');
  });

  it('L-20: kurang bila memakai istilah wajib berbahasa Inggris', () => {
    expect(
      getRule(
        'L-20',
        makeValidLabel({
          daftarBahanTeks: 'Ingredients: banana, palm oil, sugar.',
          kedaluwarsaTeks: 'Best before: 13 Dec 2026',
        }),
      ).status,
    ).toBe('kurang');
  });
});
