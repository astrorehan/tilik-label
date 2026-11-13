import { createEmptyAnswers, createEmptyLabelData } from './labelRules';
import type { AdditionalAnswers, LabelData } from './types';

export interface SampleLabelCase {
  id: string;
  judul: string;
  kategori: string;
  ringkasanSingkat: string;
  label: LabelData;
  answers: AdditionalAnswers;
}

/**
 * Tiga label contoh rekaan untuk uji coba tanpa unggah foto.
 * Contoh pertama sengaja dibuat tampak rapi di permukaan, namun gagal pada
 * urutan bahan (L-03), kalimat alergen (L-12), dan klaim bersyarat (L-18).
 */
export const SAMPLE_LABEL_CASES: SampleLabelCase[] = [
  {
    id: 'kue-kering-tampak-lengkap',
    judul: 'Kue Kering Kacang "Dapur Sari" (Contoh Rekaan)',
    kategori: 'Tampak lengkap, gagal di urutan bahan, alergen, dan klaim',
    ringkasanSingkat:
      'Semua keterangan pokok sudah tertulis, namun urutan tepung dan gula terbalik dari resep, kalimat alergen belum sesuai Pasal 51, dan memakai kata "100% Asli" pada produk campuran.',
    label: {
      ...createEmptyLabelData(),
      namaProduk: 'Kue Kering Kacang 100% Asli',
      daftarBahanTeks:
        'Komposisi: gula halus, tepung terigu, kacang tanah, telur, minyak nabati, garam.',
      beratBersihTeks: 'Berat bersih: 250 g',
      namaProdusen: 'Dapur Sari Rumahan',
      alamatProdusen: 'Jl. Kenanga No. 8, Kota Semarang 50131, Indonesia',
      keteranganHalalTeks: 'Halal Indonesia ID33110000987650425',
      kodeProduksiTeks: 'KS-131126',
      tanggalProduksiTeks: '13 Nov 2026',
      kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Jan 2027',
      nomorIzinTeks: 'P-IRT 2063374010456-29',
      pernyataanAlergenTeks: 'Mengandung kacang tanah.',
      caraPenyimpananTeks: 'Simpan di wadah tertutup rapat dan tempat kering.',
      pernyataanLain: ['Tanpa pengawet'],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: 'tepung terigu', jumlahGram: 500 },
        { nama: 'kacang tanah', jumlahGram: 300 },
        { nama: 'gula halus', jumlahGram: 220 },
        { nama: 'minyak nabati', jumlahGram: 200 },
        { nama: 'telur', jumlahGram: 100 },
        { nama: 'garam', jumlahGram: 10 },
      ],
      umurSimpanHari: 60,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: true,
    },
  },
  {
    id: 'sambal-bawang-rumahan',
    judul: 'Sambal Bawang "Ibu Wati" (Contoh Rekaan)',
    kategori: 'Format kedaluwarsa, singkatan bahan, dan klaim tanpa pengawet',
    ringkasanSingkat:
      'Masih memakai awalan "Komposisi" yang belum lengkap di singkatan (MSG, Bawang mrh.), memakai "Exp:" tanpa tanggal lengkap untuk umur simpan 30 hari, serta klaim tanpa pengawet.',
    label: {
      ...createEmptyLabelData(),
      namaProduk: 'Sambal Bawang Rumahan',
      daftarBahanTeks: 'cabai rawit, bawang mrh., minyak goreng, garam, MSG, natrium benzoat.',
      beratBersihTeks: '150 gram',
      namaProdusen: 'Usaha Ibu Wati',
      alamatProdusen: 'Kota Yogyakarta 55111',
      keteranganHalalTeks: 'Halal',
      kodeProduksiTeks: 'Batch 04',
      tanggalProduksiTeks: '',
      kedaluwarsaTeks: 'Exp: Des 2026',
      nomorIzinTeks: 'PIRT 2113471010012',
      pernyataanAlergenTeks: '',
      caraPenyimpananTeks: '',
      pernyataanLain: ['Tanpa pengawet', 'Bebas bahan tambahan pangan'],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: 'cabai rawit', jumlahGram: 400 },
        { nama: 'minyak goreng', jumlahGram: 250 },
        { nama: 'bawang merah', jumlahGram: 200 },
        { nama: 'garam', jumlahGram: 25 },
      ],
      umurSimpanHari: 30,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: false,
    },
  },
  {
    id: 'kerupuk-ikan-rapi',
    judul: 'Kerupuk Ikan Tenggiri "Sari Laut" (Contoh Rekaan)',
    kategori: 'Label rapi siap cetak dengan 2 pengingat fisik',
    ringkasanSingkat:
      'Seluruh 18 butir aturan yang bisa diperiksa dari teks berstatus lengkap, menyisakan 2 pengingat cetak (cetak tebal alergen dan ukuran huruf minimal).',
    label: {
      ...createEmptyLabelData(),
      namaProduk: 'Kerupuk Ikan Tenggiri',
      daftarBahanTeks:
        'Komposisi: tapioka, ikan tenggiri, telur ayam, bawang putih, gula pasir, garam.',
      beratBersihTeks: 'Berat bersih: 200 g',
      namaProdusen: 'Kelompok Usaha Sari Laut',
      alamatProdusen: 'Jl. Pelabuhan No. 4, Kota Cirebon 45112, Indonesia',
      keteranganHalalTeks: 'Halal Indonesia ID32110000443210824',
      kodeProduksiTeks: 'SL-131126',
      tanggalProduksiTeks: '13 Nov 2026',
      kedaluwarsaTeks: 'Baik digunakan sebelum: 13 Mei 2027',
      nomorIzinTeks: 'P-IRT 2023274010089-29',
      pernyataanAlergenTeks: 'Mengandung alergen, lihat daftar bahan yang dicetak tebal.',
      caraPenyimpananTeks: 'Simpan di tempat sejuk dan kering.',
      pernyataanLain: [],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: 'tapioka', jumlahGram: 1000 },
        { nama: 'ikan tenggiri', jumlahGram: 500 },
        { nama: 'telur ayam', jumlahGram: 150 },
        { nama: 'bawang putih', jumlahGram: 60 },
        { nama: 'gula pasir', jumlahGram: 40 },
        { nama: 'garam', jumlahGram: 30 },
      ],
      umurSimpanHari: 180,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: true,
    },
  },
];
