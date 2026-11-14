import type { AdditionalAnswers, AnyRuleId, LabelData, RecipeIngredient } from './types';

/** Kode lima pertanyaan tambahan F-04. */
export type AdditionalQuestionId =
  | 'resep'
  | 'umurSimpan'
  | 'caraSimpan'
  | 'sertifikatHalal'
  | 'alatProduksi';

export interface AdditionalQuestion {
  id: AdditionalQuestionId;
  judul: string;
  pertanyaan: string;
  bantuan: string;
  /** Cara menjawab: resep (isian bebas per bahan), angka, atau pilihan. */
  jenis: 'resep' | 'angka' | 'pilihan';
  /** Aturan yang memakai jawaban ini, supaya pengguna tahu gunanya. */
  dipakaiUntuk: AnyRuleId[];
}

/**
 * Paling banyak lima pertanyaan tentang hal yang tidak terlihat di foto (PRD F-04).
 * Semua dijawab dengan pilihan atau angka, kecuali resep.
 */
export const ADDITIONAL_QUESTIONS: AdditionalQuestion[] = [
  {
    id: 'resep',
    judul: 'Bahan dan takaran sekali produksi',
    pertanyaan: 'Bahan apa saja yang dipakai, dan berapa banyak untuk sekali masak?',
    bantuan:
      'Tulis dalam gram atau ml. Dipakai untuk mengecek urutan bahan di label dan kebenaran tulisan seperti "tanpa pengawet".',
    jenis: 'resep',
    dipakaiUntuk: ['L-03', 'L-16', 'L-18'],
  },
  {
    id: 'umurSimpan',
    judul: 'Umur simpan',
    pertanyaan: 'Berapa hari produk masih layak dimakan sejak dibuat?',
    bantuan:
      'Perkiraan saja. Dipakai untuk menentukan jalur izin dan cara menulis tanggal kedaluwarsa.',
    jenis: 'angka',
    dipakaiUntuk: ['I-01', 'L-10'],
  },
  {
    id: 'caraSimpan',
    judul: 'Cara simpan',
    pertanyaan:
      'Apakah produk cepat rusak kalau tidak disimpan dengan cara tertentu, misalnya harus di tempat kering atau di kulkas?',
    bantuan: 'Kalau ya, label wajib memuat petunjuk cara menyimpan.',
    jenis: 'pilihan',
    dipakaiUntuk: ['L-19'],
  },
  {
    id: 'sertifikatHalal',
    judul: 'Sertifikat halal',
    pertanyaan: 'Apakah produk ini sudah punya sertifikat halal resmi?',
    bantuan: 'Tulisan atau logo halal hanya boleh ada di label bila sertifikatnya sudah terbit.',
    jenis: 'pilihan',
    dipakaiUntuk: ['L-07'],
  },
  {
    id: 'alatProduksi',
    judul: 'Alat produksi',
    pertanyaan: 'Alat apa yang dipakai untuk membuat produk ini?',
    bantuan:
      'Manual: dikerjakan tangan atau alat dapur biasa. Semi otomatis: sebagian dibantu mesin, misalnya mesin giling atau mesin pengemas sederhana. Otomatis: seluruh proses berjalan dengan mesin.',
    jenis: 'pilihan',
    dipakaiUntuk: ['I-04'],
  },
];

/**
 * Mengubah isian angka dari pengguna menjadi bilangan.
 * Menerima koma desimal ("1,5") dan titik ribuan ala Indonesia ("1.000").
 * Mengembalikan null bila kosong, bukan angka, nol, atau negatif.
 */
export function parseAmountInput(text: string): number | null {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (!trimmed) {
    return null;
  }
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmed)) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+(,\d+)?$/.test(trimmed)) {
    normalized = trimmed.replace(',', '.');
  } else if (/^\d+(\.\d+)?$/.test(trimmed)) {
    normalized = trimmed;
  } else {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Membuang baris resep yang belum lengkap (nama kosong atau takaran tidak sah). */
export function cleanRecipe(rows: RecipeIngredient[]): RecipeIngredient[] {
  return rows
    .map((row) => ({ nama: row.nama.trim(), jumlahGram: row.jumlahGram }))
    .filter(
      (row) => row.nama.length > 0 && Number.isFinite(row.jumlahGram) && row.jumlahGram > 0,
    );
}

/** Apakah satu pertanyaan tambahan sudah dijawab. */
export function isQuestionAnswered(
  id: AdditionalQuestionId,
  answers: AdditionalAnswers,
): boolean {
  switch (id) {
    case 'resep':
      return cleanRecipe(answers.resep).length > 0;
    case 'umurSimpan':
      return (
        typeof answers.umurSimpanHari === 'number' &&
        Number.isFinite(answers.umurSimpanHari) &&
        answers.umurSimpanHari > 0
      );
    case 'caraSimpan':
      return answers.bergantungCaraSimpan != null;
    case 'sertifikatHalal':
      return answers.punyaSertifikatHalal != null;
    case 'alatProduksi':
      return answers.alatProduksi != null;
  }
}

/** Daftar pertanyaan yang belum dijawab, dalam urutan tampil. */
export function getUnansweredQuestions(answers: AdditionalAnswers): AdditionalQuestion[] {
  return ADDITIONAL_QUESTIONS.filter((question) => !isQuestionAnswered(question.id, answers));
}

/**
 * Merapikan isian sebelum diperiksa: membuang baris pernyataan kosong
 * dan baris resep yang belum lengkap. Tidak mengubah objek masukan.
 */
export function prepareForCheck(
  label: LabelData,
  answers: AdditionalAnswers,
): { label: LabelData; answers: AdditionalAnswers } {
  return {
    label: {
      ...label,
      pernyataanLain: label.pernyataanLain.map((item) => item.trim()).filter(Boolean),
    },
    answers: {
      ...answers,
      resep: cleanRecipe(answers.resep),
      umurSimpanHari:
        typeof answers.umurSimpanHari === 'number' &&
        Number.isFinite(answers.umurSimpanHari) &&
        answers.umurSimpanHari > 0
          ? answers.umurSimpanHari
          : null,
    },
  };
}
