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

/**
 * Hasil akhir penentu jalur izin (F-05).
 * - `tidak_wajib_spp_irt`: produk dikecualikan dari kewajiban SPP-IRT.
 * - `bisa_spp_irt`: produk bisa diajukan lewat SPP-IRT (jenis pangan tetap perlu dicek ke Dinas Kesehatan).
 * - `tidak_bisa_spp_irt`: produk tidak bisa lewat jalur SPP-IRT.
 * - `belum_bisa_ditentukan`: jawaban penentu belum diisi.
 */
export type PermitPathOutcome =
  | 'tidak_wajib_spp_irt'
  | 'bisa_spp_irt'
  | 'tidak_bisa_spp_irt'
  | 'belum_bisa_ditentukan';

/**
 * Pengaruh satu aturan `I-*` terhadap jalur izin.
 * - `membebaskan`: syarat pengecualian terpenuhi.
 * - `menghalangi`: produk tidak bisa lewat SPP-IRT karena aturan ini.
 * - `memenuhi`: syarat jalur SPP-IRT terpenuhi.
 * - `tidak_berlaku`: pengecualian tidak berlaku untuk produk ini.
 * - `belum_dijawab`: jawaban penentu belum diisi pengguna.
 * - `perlu_dicek`: tidak bisa dipastikan aplikasi, perlu dicek ke Dinas Kesehatan.
 */
export type PermitRuleImpact =
  | 'membebaskan'
  | 'menghalangi'
  | 'memenuhi'
  | 'tidak_berlaku'
  | 'belum_dijawab'
  | 'perlu_dicek';

/** Hasil evaluasi untuk satu butir aturan jalur izin. */
export interface PermitRuleResult {
  id: PermitRuleId;
  judul: string;
  dampak: PermitRuleImpact;
  rujukan: RegulationReference;
  penjelasan: string;
}

/** Ringkasan hasil penentu jalur izin beserta alasan dan pasalnya. */
export interface PermitPathResult {
  hasil: PermitPathOutcome;
  judul: string;
  /** Kalimat alasan utama yang menentukan hasil. */
  alasan: string[];
  /** Pasal yang menjadi dasar hasil. */
  rujukan: RegulationReference[];
  /** Hasil per aturan I-01 sampai I-08. */
  aturan: PermitRuleResult[];
  /** Hal yang belum bisa dipastikan aplikasi dan perlu dicek ke Dinas Kesehatan. */
  perluDicek: string[];
  /** Klaim pada label yang terdeteksi untuk aturan I-05. */
  klaimTerdeteksi: string[];
}
