import { createEmptyAnswers, createEmptyLabelData } from "./labelRules";
import type { AdditionalAnswers, LabelData, LabelRuleId } from "./types";

export interface SampleLabelCase {
  id: string;
  judul: string;
  kategori: string;
  ringkasanSingkat: string;
  label: LabelData;
  answers: AdditionalAnswers;
  /** Butir aturan label yang sengaja dibuat berstatus kurang pada contoh ini. */
  kesalahanDisengaja: LabelRuleId[];
}

/**
 * Tiga label contoh rekaan untuk uji coba tanpa unggah foto. Semua nama,
 * alamat, nomor izin, dan nomor halal di sini fiktif.
 * Contoh pertama sengaja dibuat tampak rapi di permukaan, namun gagal pada
 * urutan bahan (L-03), kalimat alergen (L-12), dan klaim kata "murni" (L-18).
 * Contoh kedua gagal pada format penulisan. Contoh ketiga rapi di bentuk,
 * namun memuat klaim kesehatan dan gizi sehingga tidak bisa lewat SPP-IRT.
 */
export const SAMPLE_LABEL_CASES: SampleLabelCase[] = [
  {
    id: "kue-kering-tampak-lengkap",
    judul: 'Kue Kering Kacang "Dapur Sari" (Contoh Rekaan)',
    kategori: "Tampak lengkap, gagal di urutan bahan, alergen, dan klaim",
    ringkasanSingkat:
      'Semua keterangan pokok sudah tertulis, namun gula ditulis sebelum tepung padahal takaran tepung lebih banyak (L-03), kalimat alergen belum sesuai Pasal 51 (L-12), dan kata "Murni" dipakai pada produk campuran (L-18).',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Kue Kering Kacang Murni",
      daftarBahanTeks:
        "Komposisi: gula halus, tepung terigu, kacang tanah, telur, minyak nabati, garam.",
      beratBersihTeks: "Berat bersih: 250 g",
      namaProdusen: "Dapur Sari Rumahan",
      alamatProdusen: "Jl. Kenanga No. 8, Kota Semarang 50131, Indonesia",
      keteranganHalalTeks: "Halal Indonesia ID33110000987650425",
      kodeProduksiTeks: "KS-131126",
      tanggalProduksiTeks: "13 Nov 2026",
      kedaluwarsaTeks: "Baik digunakan sebelum: 13 Jan 2027",
      nomorIzinTeks: "P-IRT 2063374010456-29",
      pernyataanAlergenTeks: "Mengandung kacang tanah.",
      caraPenyimpananTeks: "Simpan di wadah tertutup rapat dan tempat kering.",
      pernyataanLain: ["Tanpa pengawet"],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: "tepung terigu", jumlahGram: 500 },
        { nama: "kacang tanah", jumlahGram: 300 },
        { nama: "gula halus", jumlahGram: 220 },
        { nama: "minyak nabati", jumlahGram: 200 },
        { nama: "telur", jumlahGram: 100 },
        { nama: "garam", jumlahGram: 10 },
      ],
      umurSimpanHari: 60,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: true,
      alatProduksi: "semi_otomatis",
    },
    kesalahanDisengaja: ["L-03", "L-12", "L-18"],
  },
  {
    id: "sambal-bawang-rumahan",
    judul: 'Sambal Bawang "Ibu Wati" (Contoh Rekaan)',
    kategori:
      "Banyak butir kurang: format, singkatan, halal, dan klaim bahan tambahan",
    ringkasanSingkat:
      'Daftar bahan tanpa awalan "Komposisi" dan memakai singkatan (L-02, L-04), satuan "gram" tidak baku (L-05), alamat tanpa kata Indonesia (L-06), "Halal" tanpa sertifikat (L-07), tanggal produksi kosong (L-08), kedaluwarsa "Exp: Des 2026" (L-09, L-10), "PIRT" salah tulis (L-11), "Tanpa pengawet" padahal memakai natrium benzoat (L-16), "Bebas bahan tambahan pangan" (L-17), dan cara simpan kosong (L-19).',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Sambal Bawang Rumahan",
      daftarBahanTeks:
        "cabai rawit, bawang mrh., minyak goreng, garam, MSG, natrium benzoat.",
      beratBersihTeks: "150 gram",
      namaProdusen: "Usaha Ibu Wati",
      alamatProdusen: "Kota Yogyakarta 55111",
      keteranganHalalTeks: "Halal",
      kodeProduksiTeks: "Batch 04",
      tanggalProduksiTeks: "",
      kedaluwarsaTeks: "Exp: Des 2026",
      nomorIzinTeks: "PIRT 2113471010012",
      pernyataanAlergenTeks: "",
      caraPenyimpananTeks: "",
      pernyataanLain: ["Tanpa pengawet", "Bebas bahan tambahan pangan"],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: "cabai rawit", jumlahGram: 400 },
        { nama: "minyak goreng", jumlahGram: 250 },
        { nama: "bawang merah", jumlahGram: 200 },
        { nama: "garam", jumlahGram: 25 },
        { nama: "MSG", jumlahGram: 5 },
        { nama: "natrium benzoat", jumlahGram: 1 },
      ],
      umurSimpanHari: 30,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: false,
      alatProduksi: "manual",
    },
    kesalahanDisengaja: [
      "L-02",
      "L-04",
      "L-05",
      "L-06",
      "L-07",
      "L-08",
      "L-09",
      "L-10",
      "L-11",
      "L-16",
      "L-17",
      "L-19",
    ],
  },
  {
    id: "kerupuk-ikan-klaim-gizi",
    judul: 'Kerupuk Ikan Tenggiri "Sari Laut" (Contoh Rekaan)',
    kategori: "Rapi di bentuk, tetapi memuat klaim kesehatan dan gizi",
    ringkasanSingkat:
      'Bahan, alergen, tanggal, dan izin sudah benar. Kesalahannya ada di klaim: "menyehatkan" dilarang (L-15), cara simpan belum ditulis (L-19), dan klaim "tinggi protein" membuat produk tidak bisa lewat jalur SPP-IRT (Pasal 10).',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Kerupuk Ikan Tenggiri",
      daftarBahanTeks:
        "Komposisi: tapioka, ikan tenggiri, telur ayam, bawang putih, gula pasir, garam.",
      beratBersihTeks: "Berat bersih: 200 g",
      namaProdusen: "Kelompok Usaha Sari Laut",
      alamatProdusen: "Jl. Pelabuhan No. 4, Kota Cirebon 45112, Indonesia",
      keteranganHalalTeks: "Halal Indonesia ID32110000443210824",
      kodeProduksiTeks: "SL-131126",
      tanggalProduksiTeks: "13 Nov 2026",
      kedaluwarsaTeks: "Baik digunakan sebelum: 13 Mei 2027",
      nomorIzinTeks: "P-IRT 2023274010089-29",
      pernyataanAlergenTeks:
        "Mengandung alergen, lihat daftar bahan yang dicetak tebal.",
      caraPenyimpananTeks: "",
      pernyataanLain: ["Menyehatkan untuk keluarga", "Tinggi protein"],
    },
    answers: {
      ...createEmptyAnswers(),
      resep: [
        { nama: "tapioka", jumlahGram: 1000 },
        { nama: "ikan tenggiri", jumlahGram: 500 },
        { nama: "telur ayam", jumlahGram: 150 },
        { nama: "bawang putih", jumlahGram: 60 },
        { nama: "gula pasir", jumlahGram: 40 },
        { nama: "garam", jumlahGram: 30 },
      ],
      umurSimpanHari: 180,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: true,
      alatProduksi: "semi_otomatis",
    },
    kesalahanDisengaja: ["L-15", "L-19"],
  },
];
