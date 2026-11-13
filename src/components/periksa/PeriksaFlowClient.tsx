'use client';

import { useEffect, useRef, useState } from 'react';
import { AssistantBox, RuleAssistant } from '@/components/asisten/AssistantBox';
import { LabelReportView } from '@/components/LabelReportView';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
  evaluatePermitPath,
  getUnansweredQuestions,
  prepareForCheck,
} from '@/domain';
import type { AdditionalAnswers, LabelData, LabelFieldKey } from '@/domain';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { requestLabelRead } from '@/lib/readLabelClient';
import { LabelForm } from './LabelForm';
import { LabelImageReference } from './LabelImageReference';
import { PermitPathView } from './PermitPathView';
import { QuestionsStep } from './QuestionsStep';
import { StartStep } from './StartStep';
import { StepIndicator, type FlowStep } from './StepIndicator';

const STEP_HEADINGS: Record<FlowStep, { title: string; lead: string }> = {
  mulai: {
    title: 'Mulai dari mana?',
    lead: 'Foto kemasan, unggah gambar label, atau isi sendiri bila label belum dibuat.',
  },
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

export function PeriksaFlowClient({ initial }: { initial?: PeriksaFlowInitial }) {
  const [step, setStep] = useState<FlowStep>(initial?.step ?? 'mulai');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [reading, setReading] = useState(false);
  const [readNotice, setReadNotice] = useState<
    { tone: 'success' | 'warning'; title: string; body: string } | null
  >(null);
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

      {step === 'mulai' && (
        <StartStep
          image={image}
          onImage={setImage}
          onContinue={() => setStep('isi')}
          onWithoutLabel={() => {
            setImage(null);
            setReadNotice(null);
            setStep('isi');
          }}
          reading={reading}
          onRead={async () => {
            if (!image) return;
            setReading(true);
            const result = await requestLabelRead(image.dataUrl);
            setReading(false);
            if (result.ok) {
              setLabel(result.label);
              setReadNotice({
                tone: result.tidakTerbaca.length > 0 ? 'warning' : 'success',
                title: 'Isi label sudah dibaca. Periksa dulu sebelum lanjut.',
                body:
                  result.tidakTerbaca.length > 0
                    ? `${result.tidakTerbaca.length} isian tidak terbaca dan ditandai di bawah. Lengkapi sesuai kemasan, dan betulkan isian lain yang salah baca.`
                    : 'Bandingkan setiap isian dengan kemasanmu dan betulkan yang salah baca. Hasil pemeriksaan memakai isian yang kamu sahkan.',
              });
            } else {
              setReadNotice({ tone: 'warning', title: 'Label belum bisa dibaca otomatis', body: result.pesan });
            }
            setStep('isi');
          }}
        />
      )}

      {step === 'isi' && image && <LabelImageReference image={image} />}

      {step === 'isi' && (
        <form
          className="panel space-y-6 p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setStep('tanya');
          }}
        >
          {readNotice && (
            <Notice tone={readNotice.tone} title={readNotice.title}>
              {readNotice.body}
            </Notice>
          )}
          <LabelForm value={label} onChange={setLabel} renderFieldNote={(key) => unreadableNote(label, key)} />
          <div className="flex flex-col-reverse gap-2.5 border-t border-line pt-5 sm:flex-row sm:justify-between">
            <Button variant="secondary" size="lg" icon="arrowLeft" onClick={() => setStep('mulai')}>
              Kembali
            </Button>
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
          onEditLabel={() => setStep('isi')}
          onEditAnswers={() => setStep('tanya')}
        />
      )}
    </div>
  );
}

function unreadableNote(label: LabelData, key: LabelFieldKey) {
  if (!label.unreadableFields?.includes(key)) return undefined;
  return (
    <span className="font-semibold text-warning-ink">
      Tidak terbaca dari foto. Isi sendiri sesuai kemasan.
    </span>
  );
}

function ResultStep({
  label,
  answers,
  onEditLabel,
  onEditAnswers,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  onEditLabel: () => void;
  onEditAnswers: () => void;
}) {
  const report = evaluateLabelRules(label, answers);
  const permit = evaluatePermitPath(label, answers);

  return (
    <div className="space-y-6">
      <PermitPathView result={permit} />
      <AssistantBox
        label={label}
        answers={answers}
        title="Ada yang belum jelas? Tanyakan ke asisten tentang hasil ini."
      />
      <LabelReportView
        report={report}
        productTitle={label.namaProduk || 'Label tanpa nama'}
        renderRuleExtra={(item) =>
          item.status === 'lengkap' ? null : (
            <RuleAssistant label={label} answers={answers} ruleId={item.id} />
          )
        }
      />
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
