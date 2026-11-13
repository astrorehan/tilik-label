/**
 * Penjelasan tabel nilai gizi menurut Peraturan BPOM 10/2026 untuk usaha mikro.
 * Data murni tanpa angka gizi: daftar nilai resmi dan tata cara hitung resmi
 * belum diperoleh, sehingga aplikasi hanya menjelaskan tiga jalan.
 */

export const NUTRITION_REGULATION = 'Peraturan BPOM 10/2026';

export type NutritionSourceStatus = 'belum-diperoleh';

export interface NutritionPath {
  id: 'uji-laboratorium' | 'nilai-kepala-bpom' | 'hitungan-bahan';
  nomor: number;
  /** Judul sehari-hari. */
  title: string;
  summary: string;
  /** Syarat atau kapan jalan ini dipakai. */
  when: string;
  /** Langkah aman yang bisa dilakukan sekarang. */
  caution: string;
  article: string;
  sourceStatus: NutritionSourceStatus;
  sourceNote: string;
}

export const NUTRITION_PATHS: readonly NutritionPath[] = [
  {
    id: 'uji-laboratorium',
    nomor: 1,
    title: 'Uji di laboratorium',
    summary:
      'Produk diperiksa di laboratorium, lalu hasil ujinya dipakai untuk mengisi tabel nilai gizi.',
    when: 'Usaha mikro boleh memilih jalan ini atau jalan nomor 2.',
    caution: 'Tanyakan ke Dinas Kesehatan atau Balai POM laboratorium mana yang dapat dipakai.',
    article: 'Pasal 7 ayat 1',
    sourceStatus: 'belum-diperoleh',
    sourceNote:
      'Syarat laboratorium dan bentuk hasil uji yang diterima belum dibaca. Perlu dicek ke Dinas Kesehatan atau BPOM.',
  },
  {
    id: 'nilai-kepala-bpom',
    nomor: 2,
    title: 'Pakai nilai yang ditetapkan Kepala BPOM',
    summary:
      'Usaha mikro boleh memakai nilai yang ditetapkan Kepala BPOM untuk mengisi tabel nilai gizi.',
    when: 'Usaha mikro boleh memilih jalan ini atau jalan nomor 1.',
    caution:
      'Aplikasi ini belum memuat daftarnya. Tanyakan ke Dinas Kesehatan atau Balai POM apakah produkmu ada di daftar.',
    article: 'Pasal 7 ayat 1',
    sourceStatus: 'belum-diperoleh',
    sourceNote:
      'Keputusan Kepala BPOM belum dibaca langsung. Menurut berita UKM Indonesia (24 Juli 2026), keputusan itu bernomor 265 Tahun 2026 dan memuat 465 jenis pangan. Ini dari berita, bukan dari teks resmi; perlu dicek ke Dinas Kesehatan atau BPOM. Berita yang sama menyebut nilai itu dapat dipakai tanpa uji laboratorium, untuk jenis pangan tertentu, bila jenis pangannya ada dalam penetapan itu (menurut berita UKM Indonesia, belum dibaca langsung).',
  },
  {
    id: 'hitungan-bahan',
    nomor: 3,
    title: 'Hitung dari bahan yang dipakai',
    summary:
      'Bila uji laboratorium dan nilai dari Kepala BPOM tidak tersedia, tabel dibuat dari hitungan bahan resep.',
    when: 'Dipakai bila kedua jalan sebelumnya tidak tersedia. Cara hitungnya mengikuti tata cara yang ditetapkan Kepala BPOM.',
    caution:
      'Simpan resep lengkap dan takaran tiap bahan. Jangan menghitung sendiri sebelum tata cara resminya jelas.',
    article: 'Pasal 7 ayat 2 dan 3',
    sourceStatus: 'belum-diperoleh',
    sourceNote:
      'Tata cara perhitungan dari Kepala BPOM belum dibaca. Perlu dicek ke Dinas Kesehatan atau BPOM.',
  },
];

export interface NutritionFact {
  id: 'G-01' | 'G-02' | 'G-05' | 'G-06';
  text: string;
  article: string;
  /** Catatan kehati-hatian, bila ada. */
  note?: string;
}

export const NUTRITION_FACTS: readonly NutritionFact[] = [
  {
    id: 'G-01',
    text: 'Tabel nilai gizi wajib dicantumkan pada label.',
    article: 'Pasal 2',
  },
  {
    id: 'G-02',
    text: 'Ada pangan yang dikecualikan, antara lain kopi bubuk, kopi instan, teh kering, air minum dalam kemasan, herba, rempah, bawang hitam, cuka makan, dan ragi.',
    article: 'Pasal 3',
    note: 'Daftar di atas disalin dari PRD dan tidak lengkap ("dan beberapa lainnya"). Daftar lengkap perlu dicek di teks resmi atau ke Dinas Kesehatan.',
  },
  {
    id: 'G-05',
    text: 'Tabel dicantumkan per satu takaran saji.',
    article: 'Pasal 8',
  },
  {
    id: 'G-06',
    text: 'Produk yang sudah berizin wajib menyesuaikan paling lambat 24 bulan sejak aturan diundangkan (diundangkan 17 Juni 2026 menurut siaran pers BPOM), termasuk produk industri rumah tangga.',
    article: 'Pasal 31',
    note: 'Tanggal diundangkan dan masa peralihan 24 bulan berasal dari siaran pers BPOM, bukan dibaca dari pasalnya. Tanggal akhir pastinya perlu dicek ke Dinas Kesehatan atau BPOM.',
  },
];

export const NUTRITION_SAFE_STEPS: readonly string[] = [
  'Tanyakan ke Dinas Kesehatan atau Balai POM jalan mana yang berlaku untuk produkmu.',
  'Simpan resep lengkap beserta takaran setiap bahan.',
  'Catat berapa gram atau mililiter satu takaran saji yang akan kamu tulis di label.',
  'Jangan mengisi angka gizi dari tebakan atau dari produk lain.',
];

export const NUTRITION_NO_NUMBERS = {
  title: 'Belum ada angka di aplikasi ini',
  text: 'Daftar nilai resmi dari Kepala BPOM dan tata cara hitung resminya belum kami peroleh dan baca langsung. Daripada menampilkan angka yang bisa keliru, aplikasi ini tidak menampilkan angka gizi apa pun dan tidak punya kalkulator. Kami baru akan menambahkannya setelah teks resminya terbaca.',
} as const;
