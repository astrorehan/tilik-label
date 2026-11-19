import { buildCorrectedLabel, type CorrectedLabel } from './correctedLabel';
import { evaluateLabelRules } from './labelRules';
import { detectLabelClaims, evaluatePermitPath } from './permitRules';
import type { AdditionalQuestionId } from './questions';
import type {
  AdditionalAnswers,
  LabelCheckReport,
  LabelData,
  LabelFieldKey,
  LabelRuleId,
  LabelRuleResult,
  PermitPathResult,
  PermitRuleResult,
} from './types';

/**
 * Pengelompokan temuan untuk halaman hasil.
 * - `keputusan`: masih kurang walau label sudah diperbaiki otomatis, jadi butuh isian pengguna.
 * - `otomatis`: kurang di label asli, tetapi beres di label perbaikan.
 * - `cek`: belum bisa dipastikan dari teks; perlu data tambahan atau cek kemasan fisik.
 * - `aman`: sudah sesuai sejak awal.
 */
export type FindingGroupId = 'keputusan' | 'otomatis' | 'cek' | 'aman';

export interface FindingEntry {
  /** Hasil aturan pada label asli. */
  asli: LabelRuleResult;
  /** Hasil aturan yang sama pada label perbaikan. */
  sesudah: LabelRuleResult;
  group: FindingGroupId;
}

type ClaimField = 'namaProduk' | 'pernyataanLain';

export interface LabelReview {
  report: LabelCheckReport;
  correctedReport: LabelCheckReport;
  corrected: CorrectedLabel;
  permit: PermitPathResult;
  keputusanKlaim?: {
    aturan: PermitRuleResult;
    kolom: ClaimField[];
    saran: string;
  };
  groups: Record<FindingGroupId, FindingEntry[]>;
  skor: {
    total: number;
    /** Aturan yang sudah terpenuhi oleh label asli. */
    sekarang: number;
    /** Aturan yang terpenuhi bila memakai label perbaikan. */
    denganPerbaikan: number;
  };
}

/** Aturan yang dijamin oleh label cetak Tilik: ukuran huruf berskala mm dan alergen bercetak tebal. */
export const PRINT_GUARANTEED_RULES: readonly LabelRuleId[] = ['L-13', 'L-14'];

/** Kolom isian label yang menentukan tiap aturan, urut dari yang paling sering perlu diubah. */
export const FIELDS_BY_RULE: Partial<Record<LabelRuleId, readonly LabelFieldKey[]>> = {
  'L-01': ['namaProduk'],
  'L-02': ['daftarBahanTeks'],
  'L-03': ['daftarBahanTeks'],
  'L-04': ['daftarBahanTeks'],
  'L-05': ['beratBersihTeks'],
  'L-06': ['namaProdusen', 'alamatProdusen'],
  'L-07': ['keteranganHalalTeks'],
  'L-08': ['kodeProduksiTeks', 'tanggalProduksiTeks'],
  'L-09': ['kedaluwarsaTeks'],
  'L-10': ['kedaluwarsaTeks'],
  'L-11': ['nomorIzinTeks'],
  'L-12': ['pernyataanAlergenTeks'],
  'L-13': ['daftarBahanTeks'],
  'L-15': ['pernyataanLain'],
  'L-16': ['pernyataanLain'],
  'L-17': ['pernyataanLain'],
  'L-18': ['pernyataanLain'],
  'L-19': ['caraPenyimpananTeks'],
  'L-20': ['daftarBahanTeks', 'beratBersihTeks', 'kedaluwarsaTeks'],
};

/** Pertanyaan data produk yang bisa menuntaskan aturan yang belum bisa dicek. */
export const QUESTION_BY_RULE: Partial<Record<LabelRuleId, AdditionalQuestionId>> = {
  'L-03': 'resep',
  'L-07': 'sertifikatHalal',
  'L-10': 'umurSimpan',
  'L-16': 'resep',
  'L-18': 'resep',
  'L-19': 'caraSimpan',
};

function groupOf(asli: LabelRuleResult, sesudah: LabelRuleResult): FindingGroupId {
  if (asli.status === 'lengkap') return sesudah.status === 'kurang' ? 'keputusan' : 'aman';
  if (asli.status === 'tidak_bisa_dicek') return 'cek';
  if (sesudah.status === 'lengkap') return 'otomatis';
  return sesudah.status === 'kurang' ? 'keputusan' : 'cek';
}

/**
 * Memeriksa label asli dan label perbaikan otomatis sekaligus, lalu memilah
 * temuan menjadi yang sudah dibetulkan, yang butuh keputusan, dan yang perlu dicek.
 */
export function reviewLabel(label: LabelData, answers: AdditionalAnswers): LabelReview {
  const report = evaluateLabelRules(label, answers);
  const corrected = buildCorrectedLabel(label, answers);
  const correctedReport = evaluateLabelRules(corrected.data, answers);
  const afterById = new Map(correctedReport.hasil.map((item) => [item.id, item]));
  const { namaProduk, pernyataanLain } = corrected.data;
  const permit = evaluatePermitPath(
    { namaProduk, pernyataanLain, unreadableFields: label.unreadableFields },
    answers,
  );
  const claimRule = permit.aturan.find((rule) => rule.id === 'I-05' && rule.dampak === 'menghalangi');
  let keputusanKlaim: LabelReview['keputusanKlaim'];
  if (claimRule && permit.hasil !== 'tidak_wajib_spp_irt') {
    const kolom: ClaimField[] = [];
    if (detectLabelClaims({ namaProduk, pernyataanLain: [] }).length > 0) kolom.push('namaProduk');
    if (detectLabelClaims({ namaProduk: '', pernyataanLain }).length > 0) kolom.push('pernyataanLain');
    keputusanKlaim = {
      aturan: claimRule,
      kolom,
      saran: 'Hapus klaim jika ingin mengajukan SPP-IRT. Jika klaim dipertahankan, tanyakan jalur izin dan syarat klaim ke BPOM.',
    };
  }

  const groups: Record<FindingGroupId, FindingEntry[]> = {
    keputusan: [],
    otomatis: [],
    cek: [],
    aman: [],
  };
  for (const asli of report.hasil) {
    const sesudah = afterById.get(asli.id) ?? asli;
    const group = groupOf(asli, sesudah);
    groups[group].push({ asli, sesudah, group });
  }

  return {
    report,
    correctedReport,
    corrected,
    permit,
    keputusanKlaim,
    groups,
    skor: {
      total: report.hasil.length,
      sekarang: groups.aman.length,
      denganPerbaikan: groups.aman.length + groups.otomatis.length,
    },
  };
}
