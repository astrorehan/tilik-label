'use client';

import { useState, type ReactNode } from 'react';
import { Segmented } from '@/components/ui/choices';
import { TextField } from '@/components/ui/fields';
import { Pill } from '@/components/ui/surface';
import { ADDITIONAL_QUESTIONS, isQuestionAnswered, parseAmountInput } from '@/domain';
import type {
  AdditionalAnswers,
  AdditionalQuestion,
  AdditionalQuestionId,
  ProductionEquipment,
} from '@/domain';
import { RecipeEditor } from './RecipeEditor';

type YesNo = 'ya' | 'tidak';

function toYesNo(value: boolean | null | undefined): YesNo | null {
  if (value == null) return null;
  return value ? 'ya' : 'tidak';
}

function QuestionCard({
  question,
  number,
  answered,
  children,
}: {
  question: AdditionalQuestion;
  number: number;
  answered: boolean;
  children: ReactNode;
}) {
  const headingId = `tanya-${question.id}-judul`;
  const helpId = `tanya-${question.id}-bantuan`;
  return (
    <section aria-labelledby={headingId} className="rule-row">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="type-code text-xs font-semibold text-ink-3">{number}/5</span>
          <h3 id={headingId} className="type-h3 text-ink">
            {question.judul}
          </h3>
        </div>
        <Pill tone={answered ? 'success' : 'neutral'} dot={answered}>
          {answered ? 'Terjawab' : 'Belum dijawab'}
        </Pill>
      </div>
      <p className="mt-2 text-base text-ink">{question.pertanyaan}</p>
      <p id={helpId} className="mt-1 text-sm leading-snug text-ink-2">
        {question.bantuan}
      </p>
      <div className="mt-3.5">{children}</div>
      <p className="mt-2.5 text-xs font-medium text-ink-3">
        Dipakai untuk: {question.dipakaiUntuk.join(', ')}
      </p>
    </section>
  );
}

interface QuestionsStepProps {
  answers: AdditionalAnswers;
  onChange: (next: AdditionalAnswers) => void;
}

/** Lima pertanyaan tambahan F-04 tentang hal yang tidak terlihat di foto. */
export function QuestionsStep({ answers, onChange }: QuestionsStepProps) {
  const [umurText, setUmurText] = useState(() =>
    answers.umurSimpanHari ? String(answers.umurSimpanHari) : '',
  );
  const umurInvalid = umurText.trim() !== '' && parseAmountInput(umurText) === null;

  const renderInput = (id: AdditionalQuestionId) => {
    switch (id) {
      case 'resep':
        return (
          <RecipeEditor
            value={answers.resep}
            onChange={(resep) => onChange({ ...answers, resep })}
            describedBy="tanya-resep-bantuan"
          />
        );
      case 'umurSimpan':
        return (
          <TextField
            id="tanya-umurSimpan"
            label="Umur simpan dalam hari"
            className="max-w-[16rem] [&_label]:sr-only"
            type="text"
            inputMode="numeric"
            suffix="hari"
            value={umurText}
            error={umurInvalid ? 'Isi dengan angka, misalnya 30.' : undefined}
            onChange={(event) => {
              setUmurText(event.target.value);
              onChange({ ...answers, umurSimpanHari: parseAmountInput(event.target.value) });
            }}
            placeholder="Contoh: 30"
          />
        );
      case 'caraSimpan':
        return (
          <Segmented<YesNo>
            label="Apakah umur simpan bergantung pada cara simpan?"
            value={toYesNo(answers.bergantungCaraSimpan)}
            onChange={(value) => onChange({ ...answers, bergantungCaraSimpan: value === 'ya' })}
            options={[
              { value: 'ya', title: 'Ya, perlu cara khusus' },
              { value: 'tidak', title: 'Tidak' },
            ]}
            className="max-w-md"
          />
        );
      case 'sertifikatHalal':
        return (
          <Segmented<YesNo>
            label="Apakah sudah punya sertifikat halal?"
            value={toYesNo(answers.punyaSertifikatHalal)}
            onChange={(value) => onChange({ ...answers, punyaSertifikatHalal: value === 'ya' })}
            options={[
              { value: 'ya', title: 'Sudah punya' },
              { value: 'tidak', title: 'Belum punya' },
            ]}
            className="max-w-md"
          />
        );
      case 'alatProduksi':
        return (
          <Segmented<ProductionEquipment>
            label="Alat produksi"
            value={answers.alatProduksi ?? null}
            onChange={(value) => onChange({ ...answers, alatProduksi: value })}
            options={[
              { value: 'manual', title: 'Manual' },
              { value: 'semi_otomatis', title: 'Semi otomatis' },
              { value: 'otomatis', title: 'Otomatis' },
            ]}
            className="max-w-lg"
          />
        );
    }
  };

  return (
    <div className="panel overflow-hidden">
      {ADDITIONAL_QUESTIONS.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          number={index + 1}
          answered={isQuestionAnswered(question.id, answers)}
        >
          {renderInput(question.id)}
        </QuestionCard>
      ))}
    </div>
  );
}
