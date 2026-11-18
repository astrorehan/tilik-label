'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Segmented } from '@/components/ui/choices';
import { TextField } from '@/components/ui/fields';
import { ADDITIONAL_QUESTIONS, isQuestionAnswered, parseAmountInput } from '@/domain';
import type { AdditionalAnswers, AdditionalQuestionId, ProductionEquipment } from '@/domain';
import { RecipeEditor } from './RecipeEditor';

type YesNo = 'ya' | 'tidak';

function toYesNo(value: boolean | null | undefined): YesNo | null {
  if (value == null) return null;
  return value ? 'ya' : 'tidak';
}

const QUESTIONS = ADDITIONAL_QUESTIONS.slice(1).concat(ADDITIONAL_QUESTIONS.slice(0, 1));

export function QuestionsStep({
  answers,
  onChange,
}: {
  answers: AdditionalAnswers;
  onChange: (next: AdditionalAnswers) => void;
}) {
  const [umurText, setUmurText] = useState(() =>
    answers.umurSimpanHari ? String(answers.umurSimpanHari) : '',
  );
  const umurInvalid = umurText.trim() !== '' && parseAmountInput(umurText) === null;

  const renderInput = (id: AdditionalQuestionId, hintId: string) => {
    switch (id) {
      case 'resep':
        return (
          <RecipeEditor
            value={answers.resep}
            onChange={(resep) => onChange({ ...answers, resep })}
            describedBy={hintId}
          />
        );
      case 'umurSimpan':
        return (
          <TextField
            id="tanya-umurSimpan"
            label="Umur simpan dalam hari"
            className="max-w-[16rem] [&_label]:sr-only"
            inputMode="numeric"
            suffix="hari"
            value={umurText}
            error={umurInvalid ? 'Isi dengan angka, misalnya 30.' : undefined}
            aria-describedby={umurInvalid ? `${hintId} tanya-umurSimpan-note` : hintId}
            onChange={(event) => {
              setUmurText(event.target.value);
              onChange({ ...answers, umurSimpanHari: parseAmountInput(event.target.value) });
            }}
            placeholder="30"
          />
        );
      case 'caraSimpan':
        return (
          <Segmented<YesNo>
            label="Apakah perlu cara simpan khusus?"
            describedBy={hintId}
            value={toYesNo(answers.bergantungCaraSimpan)}
            onChange={(value) => onChange({ ...answers, bergantungCaraSimpan: value === 'ya' })}
            options={[
              { value: 'ya', title: 'Ya' },
              { value: 'tidak', title: 'Tidak' },
            ]}
            className="max-w-xs"
          />
        );
      case 'sertifikatHalal':
        return (
          <Segmented<YesNo>
            label="Apakah sudah punya sertifikat halal?"
            describedBy={hintId}
            value={toYesNo(answers.punyaSertifikatHalal)}
            onChange={(value) => onChange({ ...answers, punyaSertifikatHalal: value === 'ya' })}
            options={[
              { value: 'ya', title: 'Sudah punya' },
              { value: 'tidak', title: 'Belum punya' },
            ]}
            className="max-w-xs"
          />
        );
      case 'alatProduksi':
        return (
          <Segmented<ProductionEquipment>
            label="Alat produksi"
            describedBy={hintId}
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
    <div className="space-y-2.5">
      {QUESTIONS.map((question) => {
        const hintId = `tanya-${question.id}-bantuan`;
        const titleId = `tanya-${question.id}-judul`;
        return (
          <section key={question.id} aria-labelledby={titleId} className="panel p-4 sm:p-5">
            <h2 id={titleId} className="type-h3 flex items-center gap-2.5">
              {question.judul}
              {isQuestionAnswered(question.id, answers) && (
                <>
                  <Icon name="check" size={17} className="shrink-0 text-success-ink" />
                  <span className="sr-only">Terjawab</span>
                </>
              )}
            </h2>
            <p className="mt-2 font-medium text-ink">{question.pertanyaan}</p>
            <p id={hintId} className="mt-1.5 mb-4 text-sm leading-relaxed text-ink-2">
              {question.bantuan}
            </p>
            {renderInput(question.id, hintId)}
          </section>
        );
      })}
    </div>
  );
}
