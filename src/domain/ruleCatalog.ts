import type {
  AnyRuleId,
  LabelRuleId,
  NutritionRuleId,
  PermitRuleId,
  RegulationReference,
} from './types';
import {
  BPOM_10_2026,
  BPOM_31_2018,
  BPOM_4_2024,
  LABEL_RULE_METADATA,
  NUTRITION_RULE_METADATA,
  PERMIT_RULE_METADATA,
} from './regulations';

/** Penanda cara aturan dipakai aplikasi. */
export type CaraCekPenanda =
  | 'dari_label'
  | 'butuh_jawaban'
  | 'tidak_bisa_dari_foto'
  | 'perlu_dinas'
  | 'belum_otomatis';

export interface RuleCatalogEntry {
  id: AnyRuleId;
  judul: string;
  rujukan: RegulationReference;
  /** Penjelasan singkat bagaimana aplikasi memeriksa atau memakai aturan ini. */
  caraCek: string;
  penanda: CaraCekPenanda[];
}

export interface RuleCatalogSection {
  kunci: 'label' | 'izin' | 'gizi';
  judul: string;
  peraturan: string;
  tentang: string;
  tautan: string;
  entri: RuleCatalogEntry[];
}

export const PENANDA_LABEL: Record<CaraCekPenanda, string> = {
  dari_label: 'Dari label',
  butuh_jawaban: 'Butuh jawabanmu',
  tidak_bisa_dari_foto: 'Tidak bisa dicek dari foto',
  perlu_dinas: 'Perlu dicek ke Dinas Kesehatan',
  belum_otomatis: 'Belum diperiksa otomatis',
};

export const REGULATION_LINKS = {
  [BPOM_31_2018]: 'https://peraturan.go.id/files/bn1452-2018.pdf',
  [BPOM_4_2024]: 'https://peraturan.go.id/files/peraturan-bpom-no-4-tahun-2024.pdf',
  [BPOM_10_2026]: 'https://peraturan.go.id/files/peraturan-bpom-no-10-tahun-2026.pdf',
} as const;

interface CaraCek {
  caraCek: string;
  penanda: CaraCekPenanda[];
}

const DARI_LABEL: CaraCek = { caraCek: 'Dari label.', penanda: ['dari_label'] };
const LABEL_DAN_JAWABAN: CaraCek = {
  caraCek: 'Label dan jawaban pengguna.',
  penanda: ['dari_label', 'butuh_jawaban'],
};
const TIDAK_DARI_FOTO: CaraCek = {
  caraCek: 'Tidak bisa dicek dari foto, ditampilkan sebagai pengingat.',
  penanda: ['tidak_bisa_dari_foto'],
};
const LABEL_DAN_RESEP_L16: CaraCek = {
  caraCek:
    'Label dan resep. Klaim "tanpa" atau "bebas" dicocokkan dengan golongan bahan tambahan yang boleh diklaim, lalu dengan daftar bahan dan resep. Bila resep belum diisi, hasilnya belum bisa dipastikan.',
  penanda: ['dari_label', 'butuh_jawaban'],
};
const LABEL_DAN_RESEP_L18: CaraCek = {
  caraCek:
    'Label dan resep. Aplikasi hanya mendeteksi pertentangan dengan bahan; syarat Pasal 63 tetap perlu kamu pastikan sendiri.',
  penanda: ['dari_label', 'butuh_jawaban', 'tidak_bisa_dari_foto'],
};

const LABEL_CARA_CEK: Record<LabelRuleId, CaraCek> = {
  'L-01': DARI_LABEL,
  'L-02': DARI_LABEL,
  'L-03': {
    caraCek: 'Dibandingkan dengan resep dari pengguna.',
    penanda: ['dari_label', 'butuh_jawaban'],
  },
  'L-04': DARI_LABEL,
  'L-05': DARI_LABEL,
  'L-06': DARI_LABEL,
  'L-07': LABEL_DAN_JAWABAN,
  'L-08': DARI_LABEL,
  'L-09': DARI_LABEL,
  'L-10': LABEL_DAN_JAWABAN,
  'L-11': DARI_LABEL,
  'L-12': {
    caraCek:
      'Daftar bahan dicocokkan dengan daftar alergen, dan kalimat peringatan alergen pada label juga diperiksa.',
    penanda: ['dari_label'],
  },
  'L-13': TIDAK_DARI_FOTO,
  'L-14': TIDAK_DARI_FOTO,
  'L-15': DARI_LABEL,
  'L-16': LABEL_DAN_RESEP_L16,
  'L-17': DARI_LABEL,
  'L-18': LABEL_DAN_RESEP_L18,
  'L-19': {
    caraCek:
      'Label dan jawaban pengguna. Jawabanmu dipakai bila ada; bila petunjuk simpan sudah tercantum di label, dianggap lengkap walau pertanyaannya belum dijawab.',
    penanda: ['dari_label', 'butuh_jawaban'],
  },
  'L-20': DARI_LABEL,
};

const PERMIT_CARA_CEK: Record<PermitRuleId, CaraCek> = {
  'I-01': {
    caraCek: 'Dari jawabanmu tentang umur simpan. Dipakai untuk menentukan jalur izin.',
    penanda: ['butuh_jawaban'],
  },
  'I-02': {
    caraCek:
      'Dari jawabanmu apakah produk berupa pangan siap saji. Dipakai untuk menentukan jalur izin. Bila belum dijawab, ditampilkan sebagai perlu dicek ke Dinas Kesehatan.',
    penanda: ['butuh_jawaban'],
  },
  'I-03': {
    caraCek: 'Dari jawabanmu tentang tempat produksi. Dipakai untuk menentukan jalur izin. Bila belum dijawab, ditampilkan sebagai perlu dicek ke Dinas Kesehatan.',
    penanda: ['butuh_jawaban'],
  },
  'I-04': {
    caraCek: 'Dari jawabanmu tentang alat produksi. Dipakai untuk menentukan jalur izin.',
    penanda: ['butuh_jawaban'],
  },
  'I-05': {
    caraCek:
      'Dari label: aplikasi mencari pernyataan klaim pada nama produk dan pernyataan lain di kemasan.',
    penanda: ['dari_label'],
  },
  'I-06': {
    caraCek: 'Dari jawabanmu tentang penanganan khusus. Dipakai untuk menentukan jalur izin. Bila belum dijawab, ditampilkan sebagai perlu dicek ke Dinas Kesehatan.',
    penanda: ['butuh_jawaban'],
  },
  'I-07': {
    caraCek: 'Dari jawabanmu apakah produk wajib SNI. Dipakai untuk menentukan jalur izin. Bila belum dijawab, ditampilkan sebagai perlu dicek ke Dinas Kesehatan.',
    penanda: ['butuh_jawaban'],
  },
  'I-08': {
    caraCek:
      'Belum diperiksa karena Lampiran I belum terbaca. Perlu dicek ke Dinas Kesehatan apakah jenis pangannya boleh lewat jalur rumah tangga.',
    penanda: ['perlu_dinas'],
  },
};

const GIZI_CARA_CEK: Record<NutritionRuleId, CaraCek> = {
  'G-01': {
    caraCek: 'Belum diperiksa otomatis, hanya penjelasan.',
    penanda: ['belum_otomatis'],
  },
  'G-02': {
    caraCek:
      'Belum diperiksa otomatis, hanya penjelasan. Daftar lengkap pengecualian perlu dicek ke teks resmi atau Dinas Kesehatan.',
    penanda: ['belum_otomatis', 'perlu_dinas'],
  },
  'G-03': {
    caraCek: 'Belum diperiksa otomatis, hanya penjelasan jalan yang boleh dipilih.',
    penanda: ['belum_otomatis'],
  },
  'G-04': {
    caraCek:
      'Belum diperiksa otomatis, hanya penjelasan. Tata cara hitung resmi belum terbaca, jadi aplikasi tidak menampilkan hitungan.',
    penanda: ['belum_otomatis'],
  },
  'G-05': {
    caraCek: 'Belum diperiksa otomatis, hanya penjelasan.',
    penanda: ['belum_otomatis'],
  },
  'G-06': {
    caraCek: 'Belum diperiksa otomatis, hanya penjelasan tentang masa penyesuaian.',
    penanda: ['belum_otomatis'],
  },
};

function build<Id extends AnyRuleId>(
  meta: Record<Id, { judul: string; rujukan: RegulationReference }>,
  cara: Record<Id, CaraCek>,
): RuleCatalogEntry[] {
  return (Object.keys(meta) as Id[]).map((id) => ({
    id,
    judul: meta[id].judul,
    rujukan: meta[id].rujukan,
    caraCek: cara[id].caraCek,
    penanda: cara[id].penanda,
  }));
}

export const RULE_CATALOG: RuleCatalogSection[] = [
  {
    kunci: 'label',
    judul: 'Label',
    peraturan: BPOM_31_2018,
    tentang: 'Label Pangan Olahan. Dipakai untuk memeriksa isi label kemasan.',
    tautan: REGULATION_LINKS[BPOM_31_2018],
    entri: build(LABEL_RULE_METADATA, LABEL_CARA_CEK),
  },
  {
    kunci: 'izin',
    judul: 'Jalur izin',
    peraturan: BPOM_4_2024,
    tentang:
      'Pedoman penerbitan SPP-IRT. Dipakai untuk menentukan jalur izin dari jawabanmu dan isi label.',
    tautan: REGULATION_LINKS[BPOM_4_2024],
    entri: build(PERMIT_RULE_METADATA, PERMIT_CARA_CEK),
  },
  {
    kunci: 'gizi',
    judul: 'Nilai gizi',
    peraturan: BPOM_10_2026,
    tentang: 'Informasi Nilai Gizi pada Label Pangan Olahan. Untuk saat ini hanya penjelasan.',
    tautan: REGULATION_LINKS[BPOM_10_2026],
    entri: build(NUTRITION_RULE_METADATA, GIZI_CARA_CEK),
  },
];

/** Hal yang sengaja tidak diperiksa atau tidak dikerjakan aplikasi. */
export const HAL_TIDAK_DIPERIKSA: string[] = [
  'Bahan alergen dicetak tebal (L-13) dan ukuran huruf minimal (L-14): keduanya tidak bisa dicek dari foto, hanya ditampilkan sebagai pengingat.',
  'Kecocokan jenis pangan dengan Lampiran I Peraturan BPOM 4/2024 (I-08): perlu dicek ke Dinas Kesehatan.',
  'Jaminan bahwa label pasti lolos pemeriksaan Dinas Kesehatan.',
  'Pengganti uji laboratorium, dan pendaftaran izin secara daring.',
  'Desain visual, warna, atau merek dagang.',
  'Aturan khusus minuman (penanda Nutri-Level), pangan bayi, dan pangan keperluan khusus.',
  'Tanya jawab hukum umum di luar hasil pemeriksaan label.',
];

/** Bahan yang belum terbaca langsung dari sumber resminya. */
export const BAHAN_BELUM_TERBACA: string[] = [
  'Keputusan Kepala BPOM tentang nilai kandungan zat gizi untuk pangan olahan usaha mikro. Menurut pemberitaan UKM Indonesia (24 Juli 2026), keputusan ini bernomor 265 Tahun 2026 dan memuat 465 jenis pangan.',
  'Tata cara perhitungan nilai gizi dari bahan (Peraturan BPOM 10/2026 Pasal 7 ayat 3).',
  'Lampiran I Peraturan BPOM 4/2024 tentang jenis pangan yang diizinkan.',
  'Aturan khusus klaim dan Peraturan BPOM 20/2021 (perubahan pertama aturan label).',
];
