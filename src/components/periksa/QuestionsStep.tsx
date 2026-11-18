'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { TilikBubble } from '@/components/asisten/TilikBubble';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { ADDITIONAL_QUESTIONS, isQuestionAnswered, parseAmountInput } from '@/domain';
import type { AdditionalAnswers, AdditionalQuestion, AdditionalQuestionId, ProductionEquipment } from '@/domain';
import { QUESTION_ANSWER_FIELDS, type AnswerPatch } from '@/domain/tilikActions';
import { cn } from '@/lib/cn';
import { ProductAnswerInput } from './ProductAnswerInput';
import { RecipeEditor } from './RecipeEditor';
import { useCardTransition } from './useCardTransition';

type YesNo = 'ya' | 'tidak';

function toYesNo(value: boolean | null | undefined): YesNo | null {
  if (value == null) return null;
  return value ? 'ya' : 'tidak';
}

/** Resep paling panjang diisi, jadi ditaruh paling akhir. */
export const QUESTION_ORDER = ADDITIONAL_QUESTIONS.slice(1).concat(ADDITIONAL_QUESTIONS.slice(0, 1));

/** Jeda sebelum pindah otomatis, supaya pilihan sempat terlihat. */
const AUTO_ADVANCE_MS = 420;

const SHELF_LIFE_PRESETS: { days: number; label: string }[] = [
  { days: 7, label: '1 minggu' },
  { days: 30, label: '1 bulan' },
  { days: 90, label: '3 bulan' },
  { days: 180, label: '6 bulan' },
  { days: 365, label: '1 tahun' },
];

interface ChoiceOption<T extends string> {
  value: T;
  title: string;
  description: string;
}

const STORAGE_OPTIONS: ChoiceOption<YesNo>[] = [
  { value: 'ya', title: 'Ya, perlu cara khusus', description: 'Misalnya harus di tempat kering, sejuk, atau kulkas.' },
  { value: 'tidak', title: 'Tidak perlu', description: 'Tetap awet di suhu ruang biasa.' },
];

const HALAL_OPTIONS: ChoiceOption<YesNo>[] = [
  { value: 'ya', title: 'Sudah punya', description: 'Sertifikat halal resmi sudah terbit.' },
  { value: 'tidak', title: 'Belum punya', description: 'Belum mengurus atau masih dalam proses.' },
];

const EQUIPMENT_OPTIONS: ChoiceOption<ProductionEquipment>[] = [
  { value: 'manual', title: 'Manual', description: 'Dikerjakan tangan atau dengan alat dapur biasa.' },
  { value: 'semi_otomatis', title: 'Semi otomatis', description: 'Sebagian dibantu mesin, misalnya mesin giling atau pengemas sederhana.' },
  { value: 'otomatis', title: 'Otomatis', description: 'Seluruh proses berjalan dengan mesin.' },
];

const CHOICE_QUESTIONS: AdditionalQuestionId[] = ['caraSimpan', 'sertifikatHalal', 'alatProduksi'];

const HINT_OVERRIDE: Partial<Record<AdditionalQuestionId, string>> = {
  alatProduksi: 'Pilih yang paling mendekati cara kamu membuatnya. Dipakai untuk menentukan jalur izin.',
};

function ChoiceCards<T extends string>({
  label,
  describedBy,
  options,
  value,
  onPick,
}: {
  label: string;
  describedBy: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onPick: (value: T) => void;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className="grid gap-2.5">
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'press flex min-h-16 cursor-pointer items-center gap-3.5 rounded-[18px] border px-4 py-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand',
              selected
                ? 'border-ink bg-action text-ink shadow-raised'
                : 'border-line bg-surface/80 hover:border-line-strong',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={selected}
              onChange={() => onPick(option.value)}
            />
            <span
              aria-hidden
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
                selected ? 'border-ink bg-ink text-action' : 'border-line-strong',
              )}
            >
              {selected && <Icon name="check" size={16} strokeWidth={2.5} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{option.title}</span>
              <span className="mt-0.5 block text-sm leading-snug text-ink-2">{option.description}</span>
            </span>
            <kbd
              aria-hidden
              className="hidden size-7 shrink-0 place-items-center rounded-[8px] border border-line bg-paper font-sans text-xs font-semibold text-ink-3 sm:grid"
            >
              {index + 1}
            </kbd>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Data produk ditanyakan satu per satu. Tilik yang bertanya; pilihan langsung
 * membawa ke pertanyaan berikutnya, dan angka 1-3 di papan ketik ikut memilih.
 */
export function QuestionsStep({
  answers,
  onChange,
  onBack,
  onDone,
  initialQuestion,
  shelfLifeFromLabel = null,
}: {
  answers: AdditionalAnswers;
  onChange: (next: AdditionalAnswers) => void;
  onBack: () => void;
  onDone: () => void;
  initialQuestion?: AdditionalQuestionId;
  shelfLifeFromLabel?: number | null;
}) {
  const { index, moveTo, regionRef, cardRef } = useCardTransition(
    Math.max(0, QUESTION_ORDER.findIndex((question) => question.id === initialQuestion)),
  );
  const [umurText, setUmurText] = useState(() =>
    answers.umurSimpanHari ? String(answers.umurSimpanHari) : '',
  );
  const [recipeRevision, setRecipeRevision] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestAnswers = useRef(answers);
  const question = QUESTION_ORDER[index] as AdditionalQuestion;
  const last = index === QUESTION_ORDER.length - 1;
  const hintId = `tanya-${question.id}-bantuan`;
  const umurInvalid = umurText.trim() !== '' && parseAmountInput(umurText) === null;
  const answeredCount = QUESTION_ORDER.filter((item) => isQuestionAnswered(item.id, answers)).length;

  useLayoutEffect(() => {
    latestAnswers.current = answers;
  }, [answers]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const goTo = (next: number) => {
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (next < 0) {
      onBack();
      return;
    }
    if (next >= QUESTION_ORDER.length) {
      onDone();
      return;
    }
    moveTo(next);
  };

  const pickThenAdvance = (apply: () => void) => {
    apply();
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      goTo(index + 1);
    }, AUTO_ADVANCE_MS);
  };

  const applyAnswer = (patch: AnswerPatch, previous: AdditionalAnswers) => {
    if (latestAnswers.current !== previous || advanceTimer.current !== null) return null;
    const applied: AnswerPatch = {};
    for (const item of QUESTION_ORDER) {
      const field = QUESTION_ANSWER_FIELDS[item.id];
      if (patch[field] !== undefined && (item.id === question.id || !isQuestionAnswered(item.id, previous))) {
        Object.assign(applied, { [field]: patch[field] });
      }
    }
    if (typeof applied.umurSimpanHari === 'number') setUmurText(String(applied.umurSimpanHari));
    if (applied.resep) setRecipeRevision((revision) => revision + 1);
    onChange({ ...previous, ...applied });
    return applied;
  };

  const pickOption = (position: number) => {
    switch (question.id) {
      case 'caraSimpan': {
        const option = STORAGE_OPTIONS[position];
        if (option) pickThenAdvance(() => onChange({ ...answers, bergantungCaraSimpan: option.value === 'ya' }));
        break;
      }
      case 'sertifikatHalal': {
        const option = HALAL_OPTIONS[position];
        if (option) pickThenAdvance(() => onChange({ ...answers, punyaSertifikatHalal: option.value === 'ya' }));
        break;
      }
      case 'alatProduksi': {
        const option = EQUIPMENT_OPTIONS[position];
        if (option) pickThenAdvance(() => onChange({ ...answers, alatProduksi: option.value }));
        break;
      }
      default:
        break;
    }
  };

  // Angka 1-3 memilih jawaban saat fokus tidak sedang di kolom ketik.
  useEffect(() => {
    if (!CHOICE_QUESTIONS.includes(question.id)) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && target !== document.body && !regionRef.current?.closest('form')?.contains(target)) return;
      if (target?.closest('input[type="text"], input:not([type]), textarea, [contenteditable="true"]')) return;
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= 3) {
        event.preventDefault();
        pickOption(digit - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const renderInput = () => {
    switch (question.id) {
      case 'resep':
        return (
          <RecipeEditor
            key={recipeRevision}
            value={answers.resep}
            onChange={(resep) => onChange({ ...answers, resep })}
            describedBy={hintId}
          />
        );
      case 'umurSimpan':
        return (
          <div className="space-y-3">
            <div className="relative max-w-[18rem]">
              <label htmlFor="tanya-umurSimpan" className="sr-only">Umur simpan dalam hari</label>
              <input
                id="tanya-umurSimpan"
                inputMode="numeric"
                autoComplete="off"
                value={umurText}
                placeholder={String(shelfLifeFromLabel ?? 30)}
                aria-invalid={umurInvalid || undefined}
                aria-describedby={umurInvalid ? `${hintId} tanya-umurSimpan-galat` : hintId}
                onChange={(event) => {
                  setUmurText(event.target.value);
                  onChange({ ...answers, umurSimpanHari: parseAmountInput(event.target.value) });
                }}
                className="tabular min-h-16 w-full rounded-[18px] border border-line-strong bg-surface px-5 pr-20 font-label text-3xl font-semibold text-ink placeholder:text-ink-3/60 focus:border-brand focus:shadow-[0_0_0_4px_var(--color-brand-soft)] focus:outline-none aria-[invalid=true]:border-danger"
              />
              <span className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-lg text-ink-2">
                hari
              </span>
            </div>
            {shelfLifeFromLabel !== null && (
              <p className="text-sm text-ink-2">Tilik memakai umur simpan yang tertulis di label ({new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(shelfLifeFromLabel)} hari) bila kolom ini kosong.</p>
            )}
            {umurInvalid && (
              <p id="tanya-umurSimpan-galat" className="text-sm font-semibold text-danger-ink">
                Isi dengan angka, misalnya 30.
              </p>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Pilihan cepat umur simpan">
              {SHELF_LIFE_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() =>
                    pickThenAdvance(() => {
                      setUmurText(String(preset.days));
                      onChange({ ...answers, umurSimpanHari: preset.days });
                    })
                  }
                  className={cn(
                    'press min-h-11 rounded-full border px-4 text-sm font-semibold',
                    answers.umurSimpanHari === preset.days
                      ? 'border-ink bg-action text-ink'
                      : 'border-line bg-surface/80 text-ink-2 hover:text-ink',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 'caraSimpan':
        return (
          <ChoiceCards<YesNo>
            label="Apakah perlu cara simpan khusus?"
            describedBy={hintId}
            options={STORAGE_OPTIONS}
            value={toYesNo(answers.bergantungCaraSimpan)}
            onPick={(value) =>
              pickThenAdvance(() => onChange({ ...answers, bergantungCaraSimpan: value === 'ya' }))
            }
          />
        );
      case 'sertifikatHalal':
        return (
          <ChoiceCards<YesNo>
            label="Apakah sudah punya sertifikat halal?"
            describedBy={hintId}
            options={HALAL_OPTIONS}
            value={toYesNo(answers.punyaSertifikatHalal)}
            onPick={(value) =>
              pickThenAdvance(() => onChange({ ...answers, punyaSertifikatHalal: value === 'ya' }))
            }
          />
        );
      case 'alatProduksi':
        return (
          <ChoiceCards<ProductionEquipment>
            label="Alat produksi"
            describedBy={hintId}
            options={EQUIPMENT_OPTIONS}
            value={answers.alatProduksi ?? null}
            onPick={(value) => pickThenAdvance(() => onChange({ ...answers, alatProduksi: value }))}
          />
        );
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        goTo(index + 1);
      }}
    >
      <div ref={regionRef} className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-3 sm:px-7">
          <p className="text-sm font-semibold text-ink-2">
            Pertanyaan <span className="tabular text-ink">{index + 1}</span> dari {QUESTION_ORDER.length}
          </p>
          <ol className="flex items-center gap-1.5" aria-label="Lompat ke pertanyaan">
            {QUESTION_ORDER.map((item, position) => {
              const answered = isQuestionAnswered(item.id, answers);
              const current = position === index;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => goTo(position)}
                    aria-label={`${item.judul}${answered ? ', terjawab' : ''}`}
                    aria-current={current ? 'step' : undefined}
                    className={cn(
                      'block h-2.5 rounded-full transition-[width,background-color] duration-300 ease-out',
                      current ? 'w-7 bg-brand' : answered ? 'w-2.5 bg-brand/55' : 'w-2.5 bg-line-strong/35',
                    )}
                  />
                </li>
              );
            })}
          </ol>
        </div>
        <div aria-hidden className="h-1 bg-line/40">
          <div
            className="h-full rounded-r-full bg-brand transition-[width] duration-500 ease-out"
            style={{ width: `${(answeredCount / QUESTION_ORDER.length) * 100}%` }}
          />
        </div>

        <div
          key={question.id}
          ref={cardRef}
          role="group"
          aria-labelledby={`tanya-${question.id}-judul`}
          className="space-y-5 px-5 py-6 sm:px-7 sm:py-8"
        >
          <TilikBubble mood="explaining" size={68} bubbleClassName="px-5 py-4">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">{question.judul}</p>
            <h2 id={`tanya-${question.id}-judul`} tabIndex={-1} data-card-focus className="mt-1 scroll-mt-20 font-label text-xl leading-snug font-semibold text-ink focus:outline-none sm:scroll-mt-24 sm:text-[1.4rem]">
              {question.pertanyaan}
            </h2>
          </TilikBubble>
          <p id={hintId} className="text-sm leading-relaxed text-ink-2">
            {HINT_OVERRIDE[question.id] ?? question.bantuan}
          </p>
          {renderInput()}
          <ProductAnswerInput question={question} answers={answers} onApply={applyAnswer} />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
        <Button variant="secondary" icon="arrowLeft" onClick={() => goTo(index - 1)}>
          {index === 0 ? 'Kembali ke isi label' : 'Sebelumnya'}
        </Button>
        <div className="flex flex-1 flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          {!last && !isQuestionAnswered(question.id, answers) && (
            <Button variant="ghost" onClick={() => goTo(index + 1)}>
              Lewati dulu
            </Button>
          )}
          <Button type="submit" iconAfter="arrowRight">
            {last ? 'Lihat hasil pemeriksaan' : 'Lanjut'}
          </Button>
        </div>
      </div>
      {last ? (
        <p className="text-sm text-ink-2">
          Resep boleh dikosongkan. Tanpa resep, urutan bahan dan klaim seperti &ldquo;tanpa pengawet&rdquo; belum bisa dicek.
        </p>
      ) : CHOICE_QUESTIONS.includes(question.id) ? (
        <p className="hidden text-xs text-ink-3 sm:block">
          Tip: tekan angka 1 sampai {question.id === 'alatProduksi' ? 3 : 2} untuk memilih jawaban.
        </p>
      ) : null}
    </form>
  );
}
