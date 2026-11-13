/** Status hasil pemeriksaan untuk satu butir aturan label atau izin. */
export type RuleStatus = 'lengkap' | 'kurang' | 'tidak_bisa_dicek';

/** Kode aturan label berdasarkan Peraturan BPOM Nomor 31 Tahun 2018. */
export type LabelRuleId =
  | 'L-01'
  | 'L-02'
  | 'L-03'
  | 'L-04'
  | 'L-05'
  | 'L-06'
  | 'L-07'
  | 'L-08'
  | 'L-09'
  | 'L-10'
  | 'L-11'
  | 'L-12'
  | 'L-13'
  | 'L-14'
  | 'L-15'
  | 'L-16'
  | 'L-17'
  | 'L-18'
  | 'L-19'
  | 'L-20';

/** Kode aturan jalur izin berdasarkan Peraturan BPOM Nomor 4 Tahun 2024. */
export type PermitRuleId =
  | 'I-01'
  | 'I-02'
  | 'I-03'
  | 'I-04'
  | 'I-05'
  | 'I-06'
  | 'I-07'
  | 'I-08';

/** Kode aturan nilai gizi berdasarkan Peraturan BPOM Nomor 10 Tahun 2026. */
export type NutritionRuleId =
  | 'G-01'
  | 'G-02'
  | 'G-03'
  | 'G-04'
  | 'G-05'
  | 'G-06';

export type AnyRuleId = LabelRuleId | PermitRuleId | NutritionRuleId;

/** Nama field label yang dapat diekstrak dari foto atau diisi pengguna. */
export type LabelFieldKey =
  | 'namaProduk'
  | 'daftarBahanTeks'
  | 'beratBersihTeks'
  | 'namaProdusen'
  | 'alamatProdusen'
  | 'keteranganHalalTeks'
  | 'kodeProduksiTeks'
  | 'tanggalProduksiTeks'
  | 'kedaluwarsaTeks'
  | 'nomorIzinTeks'
  | 'pernyataanAlergenTeks'
  | 'caraPenyimpananTeks'
  | 'pernyataanLain';

/** Data isi label kemasan hasil pembacaan foto dan pembetulan pengguna. */
export interface LabelData {
  namaProduk: string;
  daftarBahanTeks: string;
  beratBersihTeks: string;
  namaProdusen: string;
  alamatProdusen: string;
  keteranganHalalTeks: string;
  kodeProduksiTeks: string;
  tanggalProduksiTeks: string;
  kedaluwarsaTeks: string;
  nomorIzinTeks: string;
  pernyataanAlergenTeks: string;
  caraPenyimpananTeks: string;
  /** Klaim atau pernyataan lain yang tercantum di kemasan. */
  pernyataanLain: string[];
  /** Daftar field yang ditandai tidak terbaca saat ekstraksi foto awal. */
  unreadableFields?: LabelFieldKey[];
}

/** Satu bahan beserta takaran (gram/ml) dari resep produksi sekali buat. */
export interface RecipeIngredient {
  nama: string;
  jumlahGram: number;
}

export type ProductionEquipment = 'manual' | 'semi_otomatis' | 'otomatis';

/** Jawaban pertanyaan tambahan di luar informasi yang terlihat di foto label. */
export interface AdditionalAnswers {
  /** Urutan bahan dari takaran terbanyak ke tersedikit; kosong jika belum diisi. */
  resep: RecipeIngredient[];
  /** Perkiraan umur simpan dalam hari; null jika belum diisi. */
  umurSimpanHari: number | null;
  /** Apakah umur simpan bergantung pada cara penyimpanan tertentu. */
  bergantungCaraSimpan: boolean | null;
  /** Apakah produk sudah memiliki sertifikat halal resmi. */
  punyaSertifikatHalal: boolean | null;
  alatProduksi?: ProductionEquipment | null;
  panganSiapSaji?: boolean | null;
  produksiDiRumah?: boolean | null;
  butuhPenangananKhusus?: boolean | null;
  wajibSni?: boolean | null;
}

/** Rujukan pasal aturan resmi yang menjadi dasar penilaian. */
export interface RegulationReference {
  peraturan: string;
  pasal: string;
}

/** Hasil evaluasi untuk satu butir aturan label. */
export interface LabelRuleResult {
  id: LabelRuleId;
  judul: string;
  status: RuleStatus;
  rujukan: RegulationReference;
  penjelasan: string;
  saranPerbaikan?: string;
  contohBenar?: string;
}

/** Ringkasan hasil seluruh pemeriksaan label L-01 sampai L-20. */
export interface LabelCheckReport {
  hasil: LabelRuleResult[];
  ringkasan: {
    lengkap: number;
    kurang: number;
    tidakBisaDicek: number;
  };
  alergenTerdeteksi: string[];
  siapCetak: boolean;
}
