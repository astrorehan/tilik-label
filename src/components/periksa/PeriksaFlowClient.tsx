'use client';

import { useEffect, useRef, useState } from 'react';
import { LabelReportView } from '@/components/LabelReportView';
import { Button } from '@/components/ui/button';
import { BukaCetakButton } from '@/components/cetak/BukaCetakButton';
import { SaveProductButton } from '@/components/produk/SaveProductButton';
import { Notice } from '@/components/ui/surface';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
  evaluatePermitPath,
  getUnansweredQuestions,
  prepareForCheck,
} from '@/domain';
import type { AdditionalAnswers, LabelData } from '@/domain';
import { LabelForm } from './LabelForm';
import { PermitPathView } from './PermitPathView';
import { QuestionsStep } from './QuestionsStep';
import { StepIndicator, type FlowStep } from './StepIndicator';

const STEP_HEADINGS: Record<FlowStep, { title: string; lead: string }> = {
  isi: {
    title: 'Isi label kemasan',
    lead: 'Tulis keterangan persis seperti yang tercetak di label. Kosongkan bagian yang memang tidak ada.',
  },
  tanya: {
    title: 'Hal yang tidak terlihat di label',
    lead: 'Lima pertanyaan singkat. Jawabanmu dipakai untuk menentukan jalur izin dan memeriksa butir label yang butuh data resep.',
  },
  hasil: {
    title: 'Hasil pemeriksaan',
    lead: 'Pemeriksaan awal, bukan pengesahan. Yang memutuskan tetap Dinas Kesehatan atau BPOM.',
  },
};

export interface PeriksaFlowInitial {
  label?: LabelData;
  answers?: AdditionalAnswers;
  step?: FlowStep;
}

export function PeriksaFlowClient({
  initial,
  productId: initialProductId,
}: {
  initial?: PeriksaFlowInitial;
  /** Id produk di Produk saya bila alur ini dibuka dari daftar itu. */
  productId?: string;
}) {
  const [productId, setProductId] = useState<string | undefined>(initialProductId);
  const [step, setStep] = useState<FlowStep>(initial?.step ?? 'isi');
  const [label, setLabel] = useState<LabelData>(() => initial?.label ?? createEmptyLabelData());
  const [answers, setAnswers] = useState<AdditionalAnswers>(
    () => initial?.answers ?? createEmptyAnswers(),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  const prepared = prepareForCheck(label, answers);
  const unanswered = getUnansweredQuestions(answers);
  const heading = STEP_HEADINGS[step];

  return (
    <div className="space-y-6">
      <StepIndicator current={step} onSelect={setStep} />

      <header>
        <h2 ref={headingRef} tabIndex={-1} className="type-h1 scroll-mt-28 text-ink focus:outline-none">
          {heading.title}
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-2">{heading.lead}</p>
      </header>

      {step === 'isi' && (
        <form
          className="panel space-y-6 p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setStep('tanya');
          }}
        >
          <LabelForm value={label} onChange={setLabel} />
          <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Button type="submit" size="lg" iconAfter="arrowRight">
              Lanjut ke pertanyaan
            </Button>
          </div>
        </form>
      )}

      {step === 'tanya' && (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            setStep('hasil');
          }}
        >
          <QuestionsStep answers={answers} onChange={setAnswers} />
          {unanswered.length > 0 && (
            <Notice tone="neutral" title={`${unanswered.length} pertanyaan belum dijawab`}>
              Kamu tetap bisa lanjut. Butir yang butuh jawaban itu akan ditandai &quot;tidak bisa
              dicek&quot; atau &quot;belum bisa ditentukan&quot;.
            </Notice>
          )}
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-between">
            <Button variant="secondary" size="lg" icon="arrowLeft" onClick={() => setStep('isi')}>
              Kembali ke isi label
            </Button>
            <Button type="submit" size="lg" iconAfter="arrowRight">
              Lihat hasil
            </Button>
          </div>
        </form>
      )}

      {step === 'hasil' && (
        <ResultStep
          label={prepared.label}
          answers={prepared.answers}
          productId={productId}
          onSaved={setProductId}
          onEditLabel={() => setStep('isi')}
          onEditAnswers={() => setStep('tanya')}
        />
      )}
    </div>
  );
}

function ResultStep({
  label,
  answers,
  productId,
  onSaved,
  onEditLabel,
  onEditAnswers,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  productId?: string;
  onSaved: (id: string) => void;
  onEditLabel: () => void;
  onEditAnswers: () => void;
}) {
  const report = evaluateLabelRules(label, answers);
  const permit = evaluatePermitPath(label, answers);

  return (
    <div className="space-y-6">
      <PermitPathView result={permit} />
      <LabelReportView report={report} productTitle={label.namaProduk || 'Label tanpa nama'} />
      <div className="panel p-5 sm:p-6">
        <h2 className="type-h3 text-ink">Simpan hasil ini</h2>
        <p className="mt-1 mb-3 text-sm leading-snug text-ink-2">
          Simpan isi label dan jawabanmu ke Produk saya supaya bisa dibuka lagi nanti dari HP ini.
        </p>
        <SaveProductButton
          label={label}
          answers={answers}
          productId={productId}
          onSaved={(product) => onSaved(product.id)}
        />
      </div>
      <div className="panel p-5 sm:p-6">
        <h2 className="type-h3 text-ink">Label perbaikan dan ringkasan</h2>
        <p className="mt-1 mb-3 text-sm leading-snug text-ink-2">
          Label teks siap cetak dan satu lembar ringkasan temuan, bisa disimpan sebagai PDF.
        </p>
        <BukaCetakButton
          label={label}
          answers={answers}
          productId={productId}
          onSaved={onSaved}
        />
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button variant="secondary" size="lg" icon="edit" onClick={onEditLabel}>
          Ubah isi label
        </Button>
        <Button variant="secondary" size="lg" icon="edit" onClick={onEditAnswers}>
          Ubah jawaban
        </Button>
      </div>
    </div>
  );
}
