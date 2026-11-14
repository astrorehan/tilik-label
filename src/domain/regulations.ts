import type { LabelRuleId, NutritionRuleId, PermitRuleId, RegulationReference } from './types';

export const REGULATION_LAST_READ = '12 November 2026';

export const BPOM_31_2018 = 'Peraturan BPOM Nomor 31 Tahun 2018';
export const BPOM_4_2024 = 'Peraturan BPOM Nomor 4 Tahun 2024';
export const BPOM_10_2026 = 'Peraturan BPOM Nomor 10 Tahun 2026';

export const LABEL_RULE_METADATA: Record<
  LabelRuleId,
  { judul: string; rujukan: RegulationReference }
> = {
  'L-01': {
    judul: 'Nama jenis pangan tercantum',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 10' },
  },
  'L-02': {
    judul: 'Daftar bahan diawali kata pembuka resmi',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 14' },
  },
  'L-03': {
    judul: 'Bahan diurutkan dari yang terbanyak',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 14' },
  },
  'L-04': {
    judul: 'Nama bahan ditulis lengkap, bukan singkatan',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 14' },
  },
  'L-05': {
    judul: 'Berat bersih atau isi bersih memakai satuan metrik',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 26' },
  },
  'L-06': {
    judul: 'Nama dan alamat produsen memuat kota, kode pos, dan Indonesia',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5, Pasal 28, dan Pasal 29' },
  },
  'L-07': {
    judul: 'Keterangan halal hanya tercantum bila sudah bersertifikat',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 32' },
  },
  'L-08': {
    judul: 'Tanggal dan kode produksi tercantum',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 33' },
  },
  'L-09': {
    judul: 'Kedaluwarsa diawali "Baik digunakan sebelum"',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 5 dan Pasal 34' },
  },
  'L-10': {
    judul: 'Format kedaluwarsa memuat tanggal, bulan, dan tahun untuk umur simpan sampai 3 bulan',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 34' },
  },
  'L-11': {
    judul: 'Produk rumah tangga mencantumkan tulisan "P-IRT"',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 36' },
  },
  'L-12': {
    judul: 'Pernyataan alergen tercantum bila ada bahan alergen',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 49 dan Pasal 51' },
  },
  'L-13': {
    judul: 'Bahan alergen dicetak tebal pada daftar bahan',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 51' },
  },
  'L-14': {
    judul: 'Ukuran huruf minimal 1 mm (nama dan peringatan minimal 2 mm)',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 9' },
  },
  'L-15': {
    judul: 'Tidak memuat klaim menyehatkan, mengobati, atau mencerdaskan',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 67' },
  },
  'L-16': {
    judul: 'Keterangan "tanpa pengawet" dan sejenisnya sesuai syarat',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 24' },
  },
  'L-17': {
    judul: 'Tidak memuat pernyataan umum "bebas bahan tambahan pangan"',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 67 huruf z' },
  },
  'L-18': {
    judul: 'Kata "alami", "murni", "100%", "asli", dan "segar" sesuai syarat',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 63' },
  },
  'L-19': {
    judul: 'Cara penyimpanan tercantum bila umur simpan bergantung cara simpan',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 48' },
  },
  'L-20': {
    judul: 'Keterangan wajib ditulis dalam bahasa Indonesia',
    rujukan: { peraturan: BPOM_31_2018, pasal: 'Pasal 7' },
  },
};

export const PERMIT_RULE_METADATA: Record<
  PermitRuleId,
  { judul: string; rujukan: RegulationReference }
> = {
  'I-01': {
    judul: 'Tidak wajib SPP-IRT bila umur simpan kurang dari 7 hari',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 3' },
  },
  'I-02': {
    judul: 'Tidak wajib SPP-IRT bila berupa pangan siap saji',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 3' },
  },
  'I-03': {
    judul: 'Tempat produksi di rumah tinggal atau rumah toko yang ditinggali pemilik',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 5' },
  },
  'I-04': {
    judul: 'Alat produksi manual sampai semi otomatis',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 5' },
  },
  'I-05': {
    judul: 'Label tidak mencantumkan klaim',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 10' },
  },
  'I-06': {
    judul: 'Produk tidak butuh penanganan khusus dalam produksi atau distribusi',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 10' },
  },
  'I-07': {
    judul: 'Produk tidak termasuk pangan wajib SNI',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 10' },
  },
  'I-08': {
    judul: 'Jenis pangan termasuk yang diizinkan di Lampiran I',
    rujukan: { peraturan: BPOM_4_2024, pasal: 'Pasal 5 dan Pasal 9' },
  },
};

export const NUTRITION_RULE_METADATA: Record<
  NutritionRuleId,
  { judul: string; rujukan: RegulationReference }
> = {
  'G-01': {
    judul: 'Tabel nilai gizi wajib dicantumkan',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 2' },
  },
  'G-02': {
    judul:
      'Dikecualikan untuk kopi bubuk, kopi instan, teh kering, air minum dalam kemasan, herba, rempah, bawang hitam, cuka makan, ragi, dan beberapa lainnya',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 3' },
  },
  'G-03': {
    judul: 'Usaha mikro boleh memakai hasil uji lab atau nilai yang ditetapkan Kepala BPOM',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 7 ayat 1' },
  },
  'G-04': {
    judul:
      'Bila keduanya tidak tersedia, tabel dicantumkan berdasarkan hitungan dari bahan, dengan tata cara yang ditetapkan Kepala BPOM',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 7 ayat 2 dan 3' },
  },
  'G-05': {
    judul: 'Tabel dicantumkan per satu takaran saji',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 8' },
  },
  'G-06': {
    judul:
      'Produk yang sudah berizin wajib menyesuaikan paling lambat 24 bulan sejak aturan diundangkan, termasuk produk industri rumah tangga',
    rujukan: { peraturan: BPOM_10_2026, pasal: 'Pasal 31' },
  },
};
