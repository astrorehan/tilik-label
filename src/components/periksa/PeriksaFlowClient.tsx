'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BukaCetakButton } from '@/components/cetak/BukaCetakButton';
import { Icon } from '@/components/icons/icon';
import { LabelReportView } from '@/components/LabelReportView';
import {
  SAVE_FAILURE_COPY,
  SaveProductButton,
  type ProductSaveStatus,
} from '@/components/produk/SaveProductButton';
import { Button } from '@/components/ui/button';
import { Notice, Pill } from '@/components/ui/surface';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  evaluateLabelRules,
  evaluatePermitPath,
  prepareForCheck,
  type AdditionalAnswers,
  type LabelData,
  type LabelFieldKey,
  type LabelRuleId,
} from '@/domain';
import type { PreparedImage } from '@/lib/image/prepareImage';
import {
  clearPeriksaDraft,
  hasMeaningfulCheckData,
  hasTypedLabel,
  savePeriksaDraftResult,
  type DraftSaveFailure,
} from '@/lib/periksaDraft';
import {
  getProduct,
  isSameProductData,
  saveProductResult,
  type SavedProduct,
} from '@/lib/produkSaya';
import { requestLabelRead } from '@/lib/readLabelClient';
import { LabelForm } from './LabelForm';
import { LabelImageReference } from './LabelImageReference';
import { PermitPathView } from './PermitPathView';
import { QuestionsStep } from './QuestionsStep';
import { StartStep } from './StartStep';
import { FLOW_STEPS, StepIndicator, type FlowStep } from './StepIndicator';

const READ_TIMEOUT_MS = 35_000;
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 350;

const FIELD_BY_RULE: Partial<Record<LabelRuleId, LabelFieldKey>> = {
  'L-01': 'namaProduk',
  'L-02': 'daftarBahanTeks',
  'L-03': 'daftarBahanTeks',
  'L-04': 'daftarBahanTeks',
  'L-05': 'beratBersihTeks',
  'L-06': 'namaProdusen',
  'L-07': 'keteranganHalalTeks',
  'L-08': 'kodeProduksiTeks',
  'L-09': 'kedaluwarsaTeks',
  'L-10': 'kedaluwarsaTeks',
  'L-11': 'nomorIzinTeks',
  'L-12': 'pernyataanAlergenTeks',
  'L-15': 'pernyataanLain',
  'L-16': 'pernyataanLain',
  'L-17': 'pernyataanLain',
  'L-18': 'pernyataanLain',
  'L-19': 'caraPenyimpananTeks',
};

type ReadNotice = {
  tone: 'success' | 'warning';
  title: string;
  body?: string;
  failed?: boolean;
};

type DraftSaveStatus = 'idle' | 'saved' | DraftSaveFailure;

const DRAFT_FAILURE_COPY: Record<DraftSaveFailure, { title: string; body: string }> = {
  tidak_tersedia: {
    title: 'Draf tidak bisa disimpan otomatis di peramban ini',
    body: 'Penyimpanan di perangkat sedang tidak tersedia (misalnya di mode privat atau diblokir). Isianmu tetap bisa dilanjutkan, tetapi akan hilang bila halaman ditutup atau dimuat ulang.',
  },
  gagal_tulis: {
    title: 'Draf gagal disimpan otomatis',
    body: 'Penyimpanan di perangkat penuh atau menolak tulisan. Isianmu tetap bisa dilanjutkan, tetapi mungkin hilang bila halaman ditutup.',
  },
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

export interface PeriksaFlowInitial {
  label?: LabelData;
  answers?: AdditionalAnswers;
  step?: FlowStep;
  farthestStep?: FlowStep;
}

export function PeriksaFlowClient({
  initial,
  productId: initialProductId,
  initialSavedProduct,
  persistDraft = false,
  restoredFromDraft = false,
  onResetDraft,
}: {
  initial?: PeriksaFlowInitial;
  productId?: string;
  initialSavedProduct?: SavedProduct;
  persistDraft?: boolean;
  restoredFromDraft?: boolean;
  onResetDraft?: () => void;
}) {
  const [productId, setProductId] = useState(initialProductId);
  const [step, setStep] = useState<FlowStep>(initial?.step ?? 'mulai');
  const [farthestStep, setFarthestStep] = useState<FlowStep>(initial?.farthestStep ?? step);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [reading, setReading] = useState(false);
  const [readCancelled, setReadCancelled] = useState(false);
  const [readNotice, setReadNotice] = useState<ReadNotice | null>(null);
  const [pendingRead, setPendingRead] = useState<LabelData | null>(null);
  const readRequestRef = useRef<{ controller: AbortController; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [label, setLabel] = useState(() => initial?.label ?? createEmptyLabelData());
  const [answers, setAnswers] = useState(() => initial?.answers ?? createEmptyAnswers());
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>(() =>
    restoredFromDraft ? 'saved' : 'idle',
  );
  const [resultSaveState, setResultSaveState] = useState<ProductSaveStatus>(() =>
    initialSavedProduct && (initial?.step ?? 'mulai') === 'hasil'
      ? { kind: 'saved', product: initialSavedProduct, source: 'auto' }
      : { kind: 'idle' },
  );
  const flowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const fieldToFocus = useRef<LabelFieldKey | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressDraftFlushRef = useRef(false);
  const lastSavedDraftSignatureRef = useRef<string>(
    restoredFromDraft && hasMeaningfulCheckData(label, answers)
      ? JSON.stringify({ label, answers, step, farthestStep, productId })
      : '',
  );
  const latestDraftRef = useRef({
    persistDraft,
    label,
    answers,
    step,
    farthestStep,
    productId,
  });

  useEffect(() => () => {
    const request = readRequestRef.current;
    if (!request) return;
    readRequestRef.current = null;
    clearTimeout(request.timer);
    request.controller.abort();
  }, []);

  useEffect(() => {
    if (previousStep.current !== step) {
      previousStep.current = step;
      const field = step === 'isi' && fieldToFocus.current
        ? flowRef.current?.querySelector<HTMLElement>(`#isian-${fieldToFocus.current}`)
        : null;
      fieldToFocus.current = null;
      if (field) {
        const disclosure = field.closest('details');
        if (disclosure) disclosure.open = true;
        field.scrollIntoView({ block: 'center' });
        field.focus({ preventScroll: true });
        return;
      }
      flowRef.current?.scrollIntoView({ block: 'start' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [step]);

  const persistDraftNow = useCallback(
    (snapshot: {
      label: LabelData;
      answers: AdditionalAnswers;
      step: FlowStep;
      farthestStep: FlowStep;
      productId?: string;
    }) => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
      if (!hasMeaningfulCheckData(snapshot.label, snapshot.answers)) {
        if (lastSavedDraftSignatureRef.current !== '') {
          clearPeriksaDraft();
          lastSavedDraftSignatureRef.current = '';
        }
        setDraftSaveStatus('idle');
        return;
      }
      const signature = JSON.stringify(snapshot);
      if (signature === lastSavedDraftSignatureRef.current) return;
      const result = savePeriksaDraftResult(snapshot);
      if (result.ok) {
        lastSavedDraftSignatureRef.current = signature;
        setDraftSaveStatus('saved');
      } else {
        setDraftSaveStatus(result.reason);
      }
    },
    [],
  );

  // Auto-save draf pemeriksaan dengan debounce saat pengguna mengisi label atau menjawab data produk.
  useEffect(() => {
    latestDraftRef.current = { persistDraft, label, answers, step, farthestStep, productId };
    if (!persistDraft || suppressDraftFlushRef.current) return;

    const snapshot = { label, answers, step, farthestStep, productId };
    const nextSignature = hasMeaningfulCheckData(label, answers) ? JSON.stringify(snapshot) : '';
    if (nextSignature === lastSavedDraftSignatureRef.current) return;

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      draftTimerRef.current = null;
      if (suppressDraftFlushRef.current) return;
      persistDraftNow(snapshot);
    }, DRAFT_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [persistDraft, label, answers, step, farthestStep, productId, persistDraftNow]);

  // Pastikan perubahan terbaru tetap tersimpan jika pengguna langsung me-refresh atau menutup tab.
  useEffect(() => {
    if (!persistDraft) return;
    const flushPending = () => {
      if (suppressDraftFlushRef.current) return;
      const current = latestDraftRef.current;
      if (!current.persistDraft) return;
      if (!hasMeaningfulCheckData(current.label, current.answers)) return;
      const snapshot = {
        label: current.label,
        answers: current.answers,
        step: current.step,
        farthestStep: current.farthestStep,
        productId: current.productId,
      };
      const signature = JSON.stringify(snapshot);
      if (signature === lastSavedDraftSignatureRef.current) return;
      const result = savePeriksaDraftResult(snapshot);
      if (result.ok) lastSavedDraftSignatureRef.current = signature;
    };
    window.addEventListener('pagehide', flushPending);
    window.addEventListener('beforeunload', flushPending);
    return () => {
      window.removeEventListener('pagehide', flushPending);
      window.removeEventListener('beforeunload', flushPending);
    };
  }, [persistDraft]);

  const autoSaveResult = useCallback(
    (
      nextLabel: LabelData,
      nextAnswers: AdditionalAnswers,
      currentProductId?: string,
    ): string | undefined => {
      const nextPrepared = prepareForCheck(nextLabel, nextAnswers);
      if (!hasMeaningfulCheckData(nextPrepared.label, nextPrepared.answers)) {
        setResultSaveState({ kind: 'idle' });
        return currentProductId;
      }

      const stored = currentProductId ? getProduct(currentProductId) : null;
      if (stored && isSameProductData(stored, nextPrepared)) {
        setResultSaveState({ kind: 'saved', product: stored, source: 'auto' });
        return stored.id;
      }

      const result = saveProductResult({
        id: currentProductId,
        label: nextPrepared.label,
        answers: nextPrepared.answers,
      });
      if (result.ok) {
        setProductId(result.product.id);
        setResultSaveState({ kind: 'saved', product: result.product, source: 'auto' });
        return result.product.id;
      }

      setResultSaveState({ kind: 'failed', reason: result.reason });
      return currentProductId;
    },
    [],
  );

  // Bila halaman langsung dibuka di langkah hasil (mis. draf yang dipulihkan) dan belum tersinkron,
  // simpan otomatis ke Produk saya tanpa menggandakan entri yang sudah ada.
  useEffect(() => {
    if (step !== 'hasil' || resultSaveState.kind !== 'idle') return;
    if (!hasMeaningfulCheckData(label, answers)) return;
    const timer = setTimeout(() => {
      autoSaveResult(label, answers, productId);
    }, 0);
    return () => clearTimeout(timer);
  }, [step, resultSaveState.kind, label, answers, productId, autoSaveResult]);

  const cancelRead = () => {
    const request = readRequestRef.current;
    if (!request) return;
    readRequestRef.current = null;
    clearTimeout(request.timer);
    request.controller.abort();
    setReading(false);
    setReadCancelled(true);
  };

  const goToStep = (next: FlowStep) => {
    if (next !== 'mulai') cancelRead();
    const nextFarthest =
      FLOW_STEPS.indexOf(next) > FLOW_STEPS.indexOf(farthestStep) ? next : farthestStep;
    let nextProductId = productId;
    if (next === 'hasil') {
      nextProductId = autoSaveResult(label, answers, productId);
    }
    setStep(next);
    setFarthestStep(nextFarthest);
    if (persistDraft && !suppressDraftFlushRef.current) {
      persistDraftNow({
        label,
        answers,
        step: next,
        farthestStep: nextFarthest,
        productId: nextProductId,
      });
    }
  };

  const handleResetDraft = () => {
    suppressDraftFlushRef.current = true;
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
      draftTimerRef.current = null;
    }
    lastSavedDraftSignatureRef.current = '';
    onResetDraft?.();
  };

  const clearRead = () => {
    setReadNotice(null);
    setPendingRead(null);
    setReadCancelled(false);
  };

  const runRead = async (dataUrl: string) => {
    if (readRequestRef.current) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);
    readRequestRef.current = { controller, timer };
    clearRead();
    setReading(true);
    const result = await requestLabelRead(dataUrl, controller.signal);
    clearTimeout(timer);
    if (readRequestRef.current?.controller !== controller) return;
    readRequestRef.current = null;
    setReading(false);

    if (controller.signal.aborted || !result.ok) {
      setReadNotice({
        tone: 'warning',
        failed: true,
        title: 'Label belum bisa dibaca otomatis',
        body: controller.signal.aborted
          ? 'Waktu baca habis. Isi sendiri atau kembali untuk mencoba lagi.'
          : !result.ok ? result.pesan : undefined,
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
    goToStep('isi');
  };

  const heading = STEP_HEADINGS[step];
  const prepared = useMemo(
    () => (step === 'hasil' ? prepareForCheck(label, answers) : null),
    [step, label, answers],
  );
  const draftFailed =
    draftSaveStatus === 'tidak_tersedia' || draftSaveStatus === 'gagal_tulis'
      ? draftSaveStatus
      : null;

  return (
    <div ref={flowRef} className="space-y-4 sm:space-y-5">
      <StepIndicator current={step} farthestStep={farthestStep} onSelect={goToStep} />

      {restoredFromDraft && onResetDraft && (
        <div role="status">
          <Notice
            tone="info"
            title="Draf pemeriksaan terakhirmu dipulihkan"
            action={
              <Button variant="secondary" size="md" icon="reset" onClick={handleResetDraft}>
                Mulai dari awal
              </Button>
            }
          >
            Isian sebelumnya dimuat otomatis dari perangkat ini supaya tidak hilang saat halaman
            dimuat ulang.
          </Notice>
        </div>
      )}

      <header className="pb-1">
        <h1 ref={headingRef} tabIndex={-1} className="type-h1 focus:outline-none">
          {heading.title}
        </h1>
        {heading.lead && <p className="mt-2 max-w-xl text-base text-ink-2">{heading.lead}</p>}
        {persistDraft && step !== 'hasil' && draftSaveStatus === 'saved' && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-2"
          >
            <Icon name="savedOnDevice" size={15} className="shrink-0 text-success-ink" />
            Draf tersimpan otomatis di perangkat ini
          </p>
        )}
      </header>

      {persistDraft && step !== 'hasil' && draftFailed && (
        <div role="status" aria-live="polite">
          <Notice tone="warning" title={DRAFT_FAILURE_COPY[draftFailed].title}>
            {DRAFT_FAILURE_COPY[draftFailed].body}
          </Notice>
        </div>
      )}

      {step === 'mulai' && (
        <StartStep
          image={image}
          onImage={(next) => {
            setImage(next);
            clearRead();
          }}
          onContinue={() => goToStep('isi')}
          onWithoutLabel={() => {
            setImage(null);
            clearRead();
            goToStep('isi');
          }}
          reading={reading}
          readCancelled={readCancelled}
          onCancelRead={cancelRead}
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
            goToStep('tanya');
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
                          tone: pendingRead.unreadableFields?.length ? 'warning' : 'success',
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
          <div className={image ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] lg:gap-5' : undefined}>
            {image && (
              <aside className="min-w-0 lg:sticky lg:top-22">
                <LabelImageReference image={image} />
              </aside>
            )}
            <div className="min-w-0 space-y-4">
              <LabelForm value={label} onChange={setLabel} showExtras={Boolean(image)} />
              <StepActions onBack={() => goToStep('mulai')} nextLabel="Lanjut ke data produk" />
            </div>
          </div>
        </form>
      )}

      {step === 'tanya' && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            goToStep('hasil');
          }}
        >
          <QuestionsStep answers={answers} onChange={setAnswers} />
          <StepActions onBack={() => goToStep('isi')} nextLabel="Lihat hasil" />
        </form>
      )}

      {prepared && (
        <ResultStep
          label={prepared.label}
          answers={prepared.answers}
          productId={productId}
          saveStatus={resultSaveState}
          onSaveStatusChange={setResultSaveState}
          onSaved={(id) => {
            setProductId(id);
            const saved = getProduct(id);
            if (saved) {
              setResultSaveState((previous) =>
                previous.kind === 'saved' && previous.product.id === saved.id
                  ? previous
                  : { kind: 'saved', product: saved, source: 'manual' },
              );
            }
          }}
          onEditLabel={(field) => {
            fieldToFocus.current = field ?? null;
            goToStep('isi');
          }}
          onEditAnswers={() => goToStep('tanya')}
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
  saveStatus,
  onSaveStatusChange,
  onSaved,
  onEditLabel,
  onEditAnswers,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  productId?: string;
  saveStatus: ProductSaveStatus;
  onSaveStatusChange: (next: ProductSaveStatus) => void;
  onSaved: (id: string) => void;
  onEditLabel: (field?: LabelFieldKey) => void;
  onEditAnswers: () => void;
}) {
  const report = evaluateLabelRules(label, answers);
  const permit = evaluatePermitPath(label, answers);

  return (
    <div className="space-y-4">
      <LabelReportView
        report={report}
        productTitle={label.namaProduk.trim() || 'Label tanpa nama'}
        assistantInput={{ label, answers }}
        actions={
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-2">
              <Button size="md" icon="edit" onClick={() => onEditLabel()}>Ubah label</Button>
              <SaveProductButton
                label={label}
                answers={answers}
                productId={productId}
                autoSaveStatus={saveStatus}
                hideInlineStatus
                onSaved={(product) => onSaved(product.id)}
                onSaveResult={(result) => {
                  if (result.ok) {
                    onSaveStatusChange({ kind: 'saved', product: result.product, source: 'manual' });
                  } else {
                    onSaveStatusChange({ kind: 'failed', reason: result.reason });
                  }
                }}
              />
              <BukaCetakButton label={label} answers={answers} productId={productId} onSaved={onSaved} />
            </div>

            <div aria-live="polite">
              {saveStatus.kind === 'saved' && (
                <div
                  role="status"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] border border-success/25 bg-success-tint/80 px-3.5 py-2.5 text-sm text-ink-2"
                >
                  <Pill tone="success" icon="savedOnDevice">
                    {saveStatus.source === 'auto'
                      ? 'Tersimpan otomatis di perangkat ini'
                      : 'Tersimpan di perangkat ini'}
                  </Pill>
                  <span className="min-w-0 leading-snug">
                    <Link
                      href="/produk"
                      className="font-semibold text-brand-deep underline underline-offset-2"
                    >
                      Lihat di Produk saya
                    </Link>
                    . Data hanya ada di peramban ini dan hilang bila data peramban dihapus.
                  </span>
                </div>
              )}
              {saveStatus.kind === 'failed' && (
                <Notice tone="warning" title={SAVE_FAILURE_COPY[saveStatus.reason].title}>
                  {SAVE_FAILURE_COPY[saveStatus.reason].body}
                </Notice>
              )}
            </div>
          </div>
        }
        renderRuleExtra={(item) => {
          if (item.status !== 'kurang') return null;
          const field = FIELD_BY_RULE[item.id];
          if (!field) return null;
          return (
            <Button variant="secondary" size="md" icon="edit" onClick={() => onEditLabel(field)}>
              Perbaiki di isian label
            </Button>
          );
        }}
      />
      <PermitPathView result={permit} defaultOpen>
        <Button variant="secondary" size="md" icon="edit" onClick={onEditAnswers}>
          Ubah data produk
        </Button>
      </PermitPathView>
    </div>
  );
}
