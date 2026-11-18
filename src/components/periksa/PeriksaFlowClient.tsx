'use client';

import { useEffect, useRef, useState } from 'react';
import { AssistantBox, RuleAssistant } from '@/components/asisten/AssistantBox';
import { BukaCetakButton } from '@/components/cetak/BukaCetakButton';
import { LabelReportView } from '@/components/LabelReportView';
import { SaveProductButton } from '@/components/produk/SaveProductButton';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { Notice } from '@/components/ui/surface';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
  evaluatePermitPath,
  prepareForCheck,
  type AdditionalAnswers,
  type LabelData,
} from '@/domain';
import { EXTRACTION_TEXT_FIELDS } from '@/domain/labelExtraction';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { requestLabelRead } from '@/lib/readLabelClient';
import { LabelForm } from './LabelForm';
import { LabelImageReference } from './LabelImageReference';
import { PermitPathView } from './PermitPathView';
import { QuestionsStep } from './QuestionsStep';
import { StartStep } from './StartStep';
import { StepIndicator, type FlowStep } from './StepIndicator';

const READ_TIMEOUT_MS = 35_000;

type ReadNotice = {
  tone: 'success' | 'warning';
  title: string;
  body?: string;
  failed?: boolean;
};

const STEP_HEADINGS: Record<FlowStep, { title: string; lead?: string }> = {
  mulai: { title: 'Tambahkan label' },
  isi: {
    title: 'Cocokkan isi label',
    lead: 'Salin sesuai tulisan di kemasan. Bagian yang belum ada boleh dikosongkan.',
  },
  tanya: {
    title: 'Lengkapi data produk',
    lead: 'Jawaban ini membantu menilai jalur izin dan isi label. Lewati yang belum kamu ketahui.',
  },
  hasil: {
    title: 'Hasil pemeriksaan',
    lead: 'Pemeriksaan awal berdasarkan aturan BPOM.',
  },
};

function hasTypedLabel(label: LabelData): boolean {
  return (
    label.pernyataanLain.some((claim) => claim.trim() !== '') ||
    EXTRACTION_TEXT_FIELDS.some((field) => label[field].trim() !== '')
  );
}

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
  productId?: string;
}) {
  const [productId, setProductId] = useState(initialProductId);
  const [step, setStep] = useState<FlowStep>(initial?.step ?? 'mulai');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [reading, setReading] = useState(false);
  const [readNotice, setReadNotice] = useState<ReadNotice | null>(null);
  const [pendingRead, setPendingRead] = useState<LabelData | null>(null);
  const readAbortRef = useRef<AbortController | null>(null);
  const [label, setLabel] = useState(() => initial?.label ?? createEmptyLabelData());
  const [answers, setAnswers] = useState(() => initial?.answers ?? createEmptyAnswers());
  const flowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);

  useEffect(() => () => {
    readAbortRef.current?.abort();
    readAbortRef.current = null;
  }, []);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      flowRef.current?.scrollIntoView({ block: 'start' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [step]);

  const clearRead = () => {
    setReadNotice(null);
    setPendingRead(null);
  };

  const runRead = async (dataUrl: string) => {
    if (readAbortRef.current) return;
    const controller = new AbortController();
    readAbortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    setReading(true);
    const result = await requestLabelRead(dataUrl, controller.signal);
    clearTimeout(timer);
    if (readAbortRef.current !== controller) return;
    readAbortRef.current = null;
    setReading(false);

    if (!result.ok) {
      setReadNotice({
        tone: 'warning',
        failed: true,
        title: 'Label belum bisa dibaca otomatis',
        body: controller.signal.aborted
          ? 'Waktu baca habis. Isi sendiri atau kembali untuk mencoba lagi.'
          : result.pesan,
      });
    } else if (hasTypedLabel(label)) {
      setPendingRead(result.label);
      setReadNotice({
        tone: 'warning',
        title: 'Kamu sudah punya isian label',
        body: 'Pilih apakah hasil baca akan mengganti isianmu.',
      });
    } else {
      setLabel(result.label);
      setReadNotice({
        tone: result.tidakTerbaca.length ? 'warning' : 'success',
        title: 'Foto sudah dibaca',
        body: result.tidakTerbaca.length
          ? 'Lengkapi kolom bertanda “Tidak terbaca” dan cocokkan teksnya dengan foto.'
          : 'Cocokkan hasil baca dengan foto sebelum lanjut.',
      });
    }
    setStep('isi');
  };

  const heading = STEP_HEADINGS[step];
  const prepared = step === 'hasil' ? prepareForCheck(label, answers) : null;

  return (
    <div ref={flowRef} className="space-y-4 sm:space-y-5">
      <StepIndicator current={step} onSelect={setStep} />

      <header className="pb-1">
        <h1 ref={headingRef} tabIndex={-1} className="type-h1 focus:outline-none">
          {heading.title}
        </h1>
        {heading.lead && <p className="mt-2 max-w-xl text-base text-ink-2">{heading.lead}</p>}
      </header>

      {step === 'mulai' && (
        <StartStep
          image={image}
          onImage={(next) => {
            setImage(next);
            clearRead();
          }}
          onContinue={() => setStep('isi')}
          onWithoutLabel={() => {
            setImage(null);
            clearRead();
            setStep('isi');
          }}
          reading={reading}
          onRead={() => {
            if (image) void runRead(image.dataUrl);
          }}
        />
      )}

      {step === 'isi' && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setStep('tanya');
          }}
        >
          {readNotice && (
            <div role={readNotice.failed ? 'alert' : 'status'}>
              <Notice tone={readNotice.tone} title={readNotice.title}>
                {readNotice.body}
                {pendingRead && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="md"
                      onClick={() => {
                        setLabel(pendingRead);
                        setPendingRead(null);
                        setReadNotice({
                          tone: 'success',
                          title: 'Hasil baca dipakai',
                          body: 'Cocokkan kembali teks dengan foto.',
                        });
                      }}
                    >
                      Pakai hasil baca
                    </Button>
                    <Button variant="secondary" size="md" onClick={clearRead}>
                      Pertahankan isian
                    </Button>
                  </div>
                )}
              </Notice>
            </div>
          )}
          {image && <LabelImageReference image={image} />}
          <LabelForm
            value={label}
            onChange={setLabel}
            showExtras={Boolean(image)}
            renderFieldNote={(key) =>
              label.unreadableFields?.includes(key) ? (
                <span className="font-semibold text-warning-ink">Tidak terbaca. Cocokkan dengan label.</span>
              ) : undefined
            }
          />
          <StepActions onBack={() => setStep('mulai')} nextLabel="Lanjut ke data produk" />
        </form>
      )}

      {step === 'tanya' && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setStep('hasil');
          }}
        >
          <QuestionsStep answers={answers} onChange={setAnswers} />
          <StepActions onBack={() => setStep('isi')} nextLabel="Lihat hasil" />
        </form>
      )}

      {prepared && (
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

function StepActions({ onBack, nextLabel }: { onBack: () => void; nextLabel: string }) {
  return (
    <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
      <Button type="submit" iconAfter="arrowRight">{nextLabel}</Button>
      <Button variant="secondary" icon="arrowLeft" onClick={onBack}>Kembali</Button>
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
  const [exportOpen, setExportOpen] = useState(false);
  const report = evaluateLabelRules(label, answers);
  const permit = evaluatePermitPath(label, answers);

  return (
    <div className="space-y-4">
      <LabelReportView
        report={report}
        productTitle={label.namaProduk.trim() || 'Label tanpa nama'}
        actions={
          <div>
            <div className="flex flex-wrap items-start gap-2">
              <Button size="md" icon="edit" onClick={onEditLabel}>Ubah label</Button>
              <Button
                variant="secondary"
                size="md"
                aria-expanded={exportOpen}
                aria-controls="aksi-simpan-cetak"
                onClick={() => setExportOpen((open) => !open)}
              >
                Simpan atau cetak
              </Button>
            </div>
            <div id="aksi-simpan-cetak" hidden={!exportOpen}>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                <SaveProductButton
                  label={label}
                  answers={answers}
                  productId={productId}
                  onSaved={(product) => onSaved(product.id)}
                />
                <BukaCetakButton label={label} answers={answers} productId={productId} onSaved={onSaved} />
              </div>
            </div>
          </div>
        }
        renderRuleExtra={(item) =>
          item.status !== 'lengkap' && (
            <RuleAssistant label={label} answers={answers} ruleId={item.id} />
          )
        }
      />
      <PermitPathView result={permit}>
        <Button variant="secondary" size="md" icon="edit" onClick={onEditAnswers}>
          Ubah data produk
        </Button>
      </PermitPathView>
      <Disclosure label="Tanya tentang hasil" icon="chat">
        <AssistantBox label={label} answers={answers} title="Apa yang ingin kamu ketahui?" />
      </Disclosure>
    </div>
  );
}
