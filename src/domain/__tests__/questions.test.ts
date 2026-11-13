import { describe, expect, it } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '../labelRules';
import {
  ADDITIONAL_QUESTIONS,
  cleanRecipe,
  getUnansweredQuestions,
  isQuestionAnswered,
  parseAmountInput,
  prepareForCheck,
} from '../questions';
import { LABEL_RULE_METADATA, PERMIT_RULE_METADATA } from '../regulations';

describe('ADDITIONAL_QUESTIONS', () => {
  it('paling banyak lima pertanyaan sesuai F-04', () => {
    expect(ADDITIONAL_QUESTIONS).toHaveLength(5);
    expect(ADDITIONAL_QUESTIONS.map((q) => q.id)).toEqual([
      'resep',
      'umurSimpan',
      'caraSimpan',
      'sertifikatHalal',
      'alatProduksi',
    ]);
  });

  it('semua pertanyaan dijawab dengan pilihan atau angka, kecuali resep', () => {
    for (const question of ADDITIONAL_QUESTIONS) {
      if (question.id === 'resep') {
        expect(question.jenis).toBe('resep');
      } else {
        expect(['angka', 'pilihan']).toContain(question.jenis);
      }
    }
  });

  it('setiap pertanyaan menunjuk aturan yang benar-benar ada', () => {
    const known = new Set([
      ...Object.keys(LABEL_RULE_METADATA),
      ...Object.keys(PERMIT_RULE_METADATA),
    ]);
    for (const question of ADDITIONAL_QUESTIONS) {
      expect(question.dipakaiUntuk.length).toBeGreaterThan(0);
      for (const id of question.dipakaiUntuk) {
        expect(known.has(id)).toBe(true);
      }
    }
  });
});

describe('parseAmountInput', () => {
  it.each([
    ['500', 500],
    ['1,5', 1.5],
    ['2.5', 2.5],
    ['1.000', 1000],
    ['12.500', 12500],
    ['1.250,5', 1250.5],
    [' 30 ', 30],
  ])('"%s" menjadi %d', (input, expected) => {
    expect(parseAmountInput(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '0', '-5', '1,2,3', '10 gram', '1..2'])(
    '"%s" tidak sah',
    (input) => {
      expect(parseAmountInput(input)).toBeNull();
    },
  );
});

describe('cleanRecipe', () => {
  it('membuang baris kosong, takaran nol, dan takaran bukan angka', () => {
    expect(
      cleanRecipe([
        { nama: ' tepung terigu ', jumlahGram: 500 },
        { nama: '', jumlahGram: 100 },
        { nama: 'gula', jumlahGram: 0 },
        { nama: 'garam', jumlahGram: Number.NaN },
        { nama: 'telur', jumlahGram: 120 },
      ]),
    ).toEqual([
      { nama: 'tepung terigu', jumlahGram: 500 },
      { nama: 'telur', jumlahGram: 120 },
    ]);
  });
});

describe('isQuestionAnswered dan getUnansweredQuestions', () => {
  it('jawaban kosong: kelima pertanyaan belum dijawab', () => {
    expect(getUnansweredQuestions(createEmptyAnswers())).toHaveLength(5);
  });

  it('jawaban "tidak" tetap dihitung sudah dijawab', () => {
    const answers = {
      ...createEmptyAnswers(),
      bergantungCaraSimpan: false,
      punyaSertifikatHalal: false,
    };
    expect(isQuestionAnswered('caraSimpan', answers)).toBe(true);
    expect(isQuestionAnswered('sertifikatHalal', answers)).toBe(true);
  });

  it('umur simpan nol atau negatif belum dianggap dijawab', () => {
    expect(isQuestionAnswered('umurSimpan', { ...createEmptyAnswers(), umurSimpanHari: 0 })).toBe(
      false,
    );
    expect(isQuestionAnswered('umurSimpan', { ...createEmptyAnswers(), umurSimpanHari: 14 })).toBe(
      true,
    );
  });

  it('resep hanya berisi baris tidak lengkap belum dianggap dijawab', () => {
    const answers = { ...createEmptyAnswers(), resep: [{ nama: 'gula', jumlahGram: 0 }] };
    expect(isQuestionAnswered('resep', answers)).toBe(false);
  });

  it('semua terisi: tidak ada yang tersisa', () => {
    const answers = {
      ...createEmptyAnswers(),
      resep: [{ nama: 'singkong', jumlahGram: 1000 }],
      umurSimpanHari: 60,
      bergantungCaraSimpan: true,
      punyaSertifikatHalal: true,
      alatProduksi: 'manual' as const,
    };
    expect(getUnansweredQuestions(answers)).toEqual([]);
  });
});

describe('prepareForCheck', () => {
  it('merapikan pernyataan dan resep tanpa mengubah masukan', () => {
    const label = { ...createEmptyLabelData(), pernyataanLain: ['Tanpa pengawet', '', '  '] };
    const answers = {
      ...createEmptyAnswers(),
      resep: [
        { nama: 'singkong', jumlahGram: 1000 },
        { nama: '', jumlahGram: 0 },
      ],
      umurSimpanHari: Number.NaN,
    };
    const snapshot = JSON.stringify({ label, answers });
    const prepared = prepareForCheck(label, answers);
    expect(prepared.label.pernyataanLain).toEqual(['Tanpa pengawet']);
    expect(prepared.answers.resep).toEqual([{ nama: 'singkong', jumlahGram: 1000 }]);
    expect(prepared.answers.umurSimpanHari).toBeNull();
    expect(JSON.stringify({ label, answers })).toBe(snapshot);
  });
});
