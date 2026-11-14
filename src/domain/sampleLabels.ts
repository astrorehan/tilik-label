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
    judul: 'Kue Kering Kacang "Dapur Contoh" (Contoh Rekaan)',
    kategori: "Tampak lengkap, gagal di urutan bahan, alergen, dan klaim",
    ringkasanSingkat:
      'Sekilas lengkap, tetapi urutan bahannya keliru: gula ditulis sebelum tepung dan kacang padahal takarannya lebih sedikit. Kalimat alergen belum memakai bunyi resmi, dan kata "Murni" kurang tepat untuk kue campuran.',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Kue Kering Kacang Murni",
      daftarBahanTeks:
        "Komposisi: gula halus, tepung terigu, kacang tanah, telur, minyak nabati, garam.",
      beratBersihTeks: "Berat bersih: 250 g",
      namaProdusen: "Dapur Contoh Rekaan",
      alamatProdusen: "Jl. Contoh No. 1, Kota Semarang 50131, Indonesia",
      keteranganHalalTeks: "Halal Indonesia ID00000000000000000",
      kodeProduksiTeks: "KC-131126",
      tanggalProduksiTeks: "13 Nov 2026",
      kedaluwarsaTeks: "Baik digunakan sebelum: 13 Jan 2027",
      nomorIzinTeks: "P-IRT 0000000000000-00",
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
    judul: 'Sambal Bawang "Contoh" (Contoh Rekaan)',
    kategori:
      "Banyak butir kurang: format, singkatan, halal, dan klaim bahan tambahan",
    ringkasanSingkat:
      'Banyak yang kurang: penulisan bahan dan satuan tidak baku, tanggal produksi kosong, tulisan halal tanpa sertifikat, dan klaim "tanpa pengawet" padahal memakai pengawet.',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Sambal Bawang Rumahan",
      daftarBahanTeks:
        "cabai rawit, bawang mrh., minyak goreng, garam, MSG, natrium benzoat.",
      beratBersihTeks: "150 gram",
      namaProdusen: "Usaha Contoh Rekaan",
      alamatProdusen: "Jl. Contoh No. 2, Kota Yogyakarta 55111",
      keteranganHalalTeks: "Halal",
      kodeProduksiTeks: "Batch 04",
      tanggalProduksiTeks: "",
      kedaluwarsaTeks: "Exp: Des 2026",
      nomorIzinTeks: "PIRT 0000000000000",
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
    judul: 'Kerupuk Ikan Tenggiri "Laut Contoh" (Contoh Rekaan)',
    kategori: "Rapi di bentuk, tetapi memuat klaim kesehatan dan gizi",
    ringkasanSingkat:
      'Bahan, alergen, tanggal, dan izin sudah benar. Masalahnya ada pada klaim "menyehatkan" dan "tinggi protein", serta cara simpan yang belum ditulis.',
    label: {
      ...createEmptyLabelData(),
      namaProduk: "Kerupuk Ikan Tenggiri",
      daftarBahanTeks:
        "Komposisi: tapioka, ikan tenggiri, telur ayam, bawang putih, gula pasir, garam.",
      beratBersihTeks: "Berat bersih: 200 g",
      namaProdusen: "Kelompok Usaha Contoh Rekaan",
      alamatProdusen: "Jl. Contoh No. 3, Kota Cirebon 45112, Indonesia",
      keteranganHalalTeks: "Halal Indonesia ID00000000000000000",
      kodeProduksiTeks: "LC-131126",
      tanggalProduksiTeks: "13 Nov 2026",
      kedaluwarsaTeks: "Baik digunakan sebelum: 13 Mei 2027",
      nomorIzinTeks: "P-IRT 0000000000000-00",
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
