import type { LabelRuleId } from '@/domain';

/** Nama singkat tiap aturan label untuk judul temuan. */
export const FINDING_LABEL: Record<LabelRuleId, string> = {
  'L-01': 'Nama jenis pangan',
  'L-02': 'Pembuka daftar bahan',
  'L-03': 'Urutan bahan',
  'L-04': 'Penulisan nama bahan',
  'L-05': 'Satuan isi bersih',
  'L-06': 'Nama dan alamat produsen',
  'L-07': 'Keterangan halal',
  'L-08': 'Tanggal dan kode produksi',
  'L-09': 'Pembuka keterangan kedaluwarsa',
  'L-10': 'Format tanggal kedaluwarsa',
  'L-11': 'Penulisan P-IRT',
  'L-12': 'Pernyataan alergen',
  'L-13': 'Cetak tebal bahan alergen',
  'L-14': 'Ukuran huruf',
  'L-15': 'Klaim kesehatan',
  'L-16': 'Klaim tanpa pengawet dan sejenisnya',
  'L-17': 'Klaim bebas bahan tambahan pangan',
  'L-18': 'Klaim alami, murni, atau sejenisnya',
  'L-19': 'Petunjuk penyimpanan',
  'L-20': 'Bahasa pada label',
};
