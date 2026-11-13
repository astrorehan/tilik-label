'use client';

import { useEffect, useRef, useState } from 'react';
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
import { EXTRACTION_TEXT_FIELDS } from '@/domain/labelExtraction';
import type { AdditionalAnswers, LabelData, LabelFieldKey } from '@/domain';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { requestLabelRead } from '@/lib/readLabelClient';
import { LabelForm } from './LabelForm';
import { LabelImageReference } from './LabelImageReference';
import { PermitPathView } from './PermitPathView';
import { QuestionsStep } from './QuestionsStep';
import { StartStep } from './StartStep';
import { StepIndicator, type FlowStep } from './StepIndicator';

/** Batas waktu menunggu hasil baca di sisi klien (ms). */
const READ_TIMEOUT_MS = 35_000;

type ReadNotice = {
  tone: 'success' | 'warning';
  title: string;
  body: string;
  /** Kegagalan diumumkan tegas (role alert); selebihnya sopan (role status). */
  failed?: boolean;
};

interface PendingRead {
  label: LabelData;
}

function hasTypedLabel(label: LabelData): boolean {
  return (
    label.pernyataanLain.length > 0 ||
    EXTRACTION_TEXT_FIELDS.some((field) => label[field].trim() !== '')
  );
}

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
  const [readNotice, setReadNotice] = useState<ReadNotice | null>(null);
  const [pendingRead, setPendingRead] = useState<PendingRead | null>(null);
  const mountedRef = useRef(true);
  const readAbortRef = useRef<AbortController | null>(null);
  const [label, setLabel] = useState<LabelData>(() => initial?.label ?? createEmptyLabelData());
  const [answers, setAnswers] = useState<AdditionalAnswers>(
    () => initial?.answers ?? createEmptyAnswers(),
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      readAbortRef.current?.abort();
    };
  }, []);

  const clearRead = () => {
    setReadNotice(null);
    setPendingRead(null);
  };

  const runRead = async (dataUrl: string) => {
    const controller = new AbortController();
    readAbortRef.current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, READ_TIMEOUT_MS);
    setReading(true);
    const result = await requestLabelRead(dataUrl, controller.signal);
    clearTimeout(timer);
    if (readAbortRef.current === controller) readAbortRef.current = null;
    if (!mountedRef.current) return;
    setReading(false);
    if (result.ok) {
      const notice: ReadNotice = {
        tone: result.tidakTerbaca.length > 0 ? 'warning' : 'success',
        title: 'Isi label sudah dibaca. Periksa dulu sebelum lanjut.',
        body:
          result.tidakTerbaca.length > 0
            ? `${result.tidakTerbaca.length} isian tidak terbaca dan ditandai di bawah. Lengkapi sesuai kemasan, dan betulkan isian lain yang salah baca.`
            : 'Bandingkan setiap isian dengan kemasanmu dan betulkan yang salah baca. Hasil pemeriksaan memakai isian yang kamu sahkan.',
      };
      if (hasTypedLabel(label)) {
        // Jangan menimpa isian yang sudah diketik tanpa persetujuan.
        setPendingRead({ label: result.label });
        setReadNotice({
          ...notice,
          title: 'Isi label sudah dibaca, tetapi kamu sudah mengisi sendiri.',
          body: 'Pilih mau memakai hasil baca atau tetap dengan isianmu.',
        });
      } else {
        setLabel(result.label);
        setPendingRead(null);
        setReadNotice(notice);
      }
    } else {
      setPendingRead(null);
      setReadNotice({
        tone: 'warning',
        failed: true,
        title: 'Label belum bisa dibaca otomatis',
        body: timedOut
          ? 'Pembacaan terlalu lama. Coba lagi, atau isi keterangan label sendiri.'
          : result.pesan,
      });
    }
    setStep('isi');
  };

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
            if (image && !reading) void runRead(image.dataUrl);
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
            <div role={readNotice.failed ? 'alert' : 'status'}>
              <Notice tone={readNotice.tone} title={readNotice.title}>
                {readNotice.body}
                {pendingRead && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="md"
                      onClick={() => {
                        setLabel(pendingRead.label);
                        setPendingRead(null);
                        setReadNotice({
                          tone: 'success',
                          title: 'Isianmu diganti dengan hasil baca. Periksa dulu sebelum lanjut.',
                          body: 'Bandingkan setiap isian dengan kemasanmu dan betulkan yang salah baca.',
                        });
                      }}
                    >
                      Ganti dengan hasil baca
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setPendingRead(null);
                        setReadNotice(null);
                      }}
                    >
                      Biarkan isianku
                    </Button>
                  </div>
                )}
              </Notice>
            </div>
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
      <LabelReportView report={report} productTitle={label.namaProduk || 'Label tanpa nama'} />
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
