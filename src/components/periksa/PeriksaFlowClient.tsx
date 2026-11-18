'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TilikBubble } from '@/components/asisten/TilikBubble';
import type { TilikMood } from '@/components/asisten/TilikMascot';
import { Icon } from '@/components/icons/icon';
import type { ProductSaveStatus } from '@/components/produk/SaveProductButton';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import {
  createEmptyAnswers,
  createEmptyLabelData,
  prepareForCheck,
  type AdditionalAnswers,
  type AdditionalQuestionId,
  type LabelData,
  type LabelFieldKey,
} from '@/domain';
import { declaredShelfLife } from '@/domain/labelEvidence';
import { ACCEPTED_IMAGE_TYPES, type PreparedImage } from '@/lib/image/prepareImage';
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
import { cn } from '@/lib/cn';
import { focusInView, holdHeightDuringNavigation } from '@/lib/pageFocus';
import { ResultBoard } from './hasil/ResultBoard';
import { LabelForm } from './LabelForm';
import { LabelStage } from './LabelStage';
import { QuestionsStep } from './QuestionsStep';
import { StartStep } from './StartStep';
import { FLOW_STEPS, StepIndicator, type FlowStep } from './StepIndicator';
import { useImagePicker } from './useImagePicker';

const READ_TIMEOUT_MS = 35_000;
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 350;
const RESULT_AUTOSAVE_DEBOUNCE_MS = 450;

const STEP_FOCUS: Record<FlowStep, string> = {
  mulai: '#periksa-judul',
  isi: '#isian-produk-judul',
  tanya: '[data-card-focus]',
  hasil: '#hasil-judul',
};

const TEXT_FIELDS: Exclude<LabelFieldKey, 'pernyataanLain'>[] = [
  'namaProduk',
  'daftarBahanTeks',
  'beratBersihTeks',
  'nomorIzinTeks',
  'namaProdusen',
  'alamatProdusen',
  'kodeProduksiTeks',
  'tanggalProduksiTeks',
  'kedaluwarsaTeks',
  'pernyataanAlergenTeks',
  'keteranganHalalTeks',
  'caraPenyimpananTeks',
];

type ReadNotice =
  | { kind: 'dibaca'; terisi: number; tidakTerbaca: number }
  | { kind: 'gagal'; body?: string }
  | { kind: 'menunggu' };

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

const STEP_HEADINGS: Record<Exclude<FlowStep, 'hasil'>, { title: string; lead: string }> = {
  mulai: {
    title: 'Tambahkan foto label',
    lead: 'Tilik membaca tulisan di kemasan, lalu memeriksanya dengan 20 aturan label pangan BPOM.',
  },
  isi: {
    title: 'Cocokkan isi label',
    lead: 'Bandingkan tiap kolom dengan tulisan di kemasan. Bagian yang memang tidak ada, biarkan kosong.',
  },
  tanya: {
    title: 'Lengkapi data produk',
    lead: 'Lengkapi informasi produk yang masih perlu dikonfirmasi.',
  },
};

function filledFields(label: LabelData): Set<LabelFieldKey> {
  const filled = new Set<LabelFieldKey>(TEXT_FIELDS.filter((key) => label[key].trim()));
  if (label.pernyataanLain.some((claim) => claim.trim())) filled.add('pernyataanLain');
  return filled;
}

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
  onDemoPrint,
}: {
  initial?: PeriksaFlowInitial;
  productId?: string;
  initialSavedProduct?: SavedProduct;
  persistDraft?: boolean;
  restoredFromDraft?: boolean;
  onResetDraft?: () => void;
  onDemoPrint?: (label: LabelData, answers: AdditionalAnswers) => void;
}) {
  const [productId, setProductId] = useState(initialProductId);
  const [step, setStep] = useState<FlowStep>(initial?.step ?? 'mulai');
  const [farthestStep, setFarthestStep] = useState<FlowStep>(initial?.farthestStep ?? step);
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [reading, setReading] = useState(false);
  const [readCancelled, setReadCancelled] = useState(false);
  const [readNotice, setReadNotice] = useState<ReadNotice | null>(null);
  const [pendingRead, setPendingRead] = useState<LabelData | null>(null);
  const [revealFields, setRevealFields] = useState<ReadonlySet<LabelFieldKey> | null>(null);
  const [questionToOpen, setQuestionToOpen] = useState<AdditionalQuestionId>();
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
  const heldHeight = useRef<ReturnType<typeof holdHeightDuringNavigation>>(undefined);
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

  const clearRead = () => {
    setReadNotice(null);
    setPendingRead(null);
    setReadCancelled(false);
  };

  const { picker, attachFileInput } = useImagePicker((next) => {
    setImage(next);
    clearRead();
  });

  useEffect(() => () => {
    const request = readRequestRef.current;
    if (!request) return;
    readRequestRef.current = null;
    clearTimeout(request.timer);
    request.controller.abort();
  }, []);

  useLayoutEffect(() => () => heldHeight.current?.release(), []);

  useLayoutEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    const flow = flowRef.current;
    const field = step === 'isi' && fieldToFocus.current
      ? flow?.querySelector<HTMLElement>(`#isian-${fieldToFocus.current}`)
      : null;
    fieldToFocus.current = null;
    const disclosure = field?.closest('details');
    if (disclosure) disclosure.open = true;

    const target = field ?? flow?.querySelector<HTMLElement>(STEP_FOCUS[step]) ?? null;
    const smooth = focusInView(target, field ? 'center' : 'start');
    heldHeight.current?.afterScroll(smooth);
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

  // Hasil yang dibuka langsung (draf dipulihkan) atau dibetulkan di halaman hasil disimpan
  // otomatis ke Produk saya, tanpa menggandakan entri yang sudah ada.
  useEffect(() => {
    if (onDemoPrint || step !== 'hasil' || resultSaveState.kind !== 'idle') return;
    if (!hasMeaningfulCheckData(label, answers)) return;
    const timer = setTimeout(() => {
      autoSaveResult(label, answers, productId);
    }, RESULT_AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [onDemoPrint, step, resultSaveState.kind, label, answers, productId, autoSaveResult]);

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
    if (next === step) return;
    if (next !== 'mulai') cancelRead();
    const nextFarthest =
      FLOW_STEPS.indexOf(next) > FLOW_STEPS.indexOf(farthestStep) ? next : farthestStep;
    let nextProductId = productId;
    if (next === 'hasil' && !onDemoPrint) {
      nextProductId = autoSaveResult(label, answers, productId);
    }
    heldHeight.current?.release();
    heldHeight.current = holdHeightDuringNavigation(flowRef.current);
    if (step === 'isi') setRevealFields(null);
    if (next !== 'tanya') setQuestionToOpen(undefined);
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

  const applyRead = (next: LabelData) => {
    setLabel(next);
    setRevealFields(filledFields(next));
    setReadNotice({
      kind: 'dibaca',
      terisi: filledFields(next).size,
      tidakTerbaca: next.unreadableFields?.length ?? 0,
    });
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
        kind: 'gagal',
        body: controller.signal.aborted
          ? 'Waktu baca habis. Isi sendiri atau kembali untuk mencoba lagi.'
          : !result.ok ? result.pesan : undefined,
      });
    } else if (hasTypedLabel(label)) {
      setPendingRead(result.label);
      setReadNotice({ kind: 'menunggu' });
    } else {
      applyRead(result.label);
    }
    goToStep('isi');
  };

  const draftFailed =
    draftSaveStatus === 'tidak_tersedia' || draftSaveStatus === 'gagal_tulis'
      ? draftSaveStatus
      : null;

  const guide = guideFor(step, { image, reading, cameraOpen: picker.cameraOpen, readNotice });

  const fileInput = (
    <input
      ref={attachFileInput}
      type="file"
      accept={ACCEPTED_IMAGE_TYPES.join(',')}
      hidden
      onChange={(event) => picker.handleFile(event.target.files?.[0])}
    />
  );

  const restoredNotice = restoredFromDraft && onResetDraft && (
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
  );

  if (step === 'hasil') {
    return (
      <div ref={flowRef} className="space-y-5">
        {fileInput}
        <StepIndicator current={step} farthestStep={farthestStep} onSelect={goToStep} />
        {restoredNotice}
        <div key="hasil" className="flow-step-in">
          <ResultBoard
            label={label}
            answers={answers}
            image={image}
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
            onChangeLabel={(next) => {
              setLabel(next);
              setResultSaveState({ kind: 'idle' });
            }}
            onEditLabel={(field) => {
              fieldToFocus.current = field ?? null;
              goToStep('isi');
            }}
            onEditAnswers={(question) => {
              goToStep('tanya');
              setQuestionToOpen(question);
            }}
            onDemoPrint={onDemoPrint}
          />
        </div>
      </div>
    );
  }

  const heading = STEP_HEADINGS[step];

  return (
    <div ref={flowRef} className="space-y-5">
      {fileInput}
      <StepIndicator current={step} farthestStep={farthestStep} onSelect={goToStep} />
      {restoredNotice}

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          <h1 id="periksa-judul" tabIndex={-1} className="type-h1 focus:outline-none">
            {heading.title}
          </h1>
          <p className="mt-2 text-base text-ink-2">{heading.lead}</p>
        </div>
        {persistDraft && draftSaveStatus === 'saved' && (
          <p
            role="status"
            aria-live="polite"
            className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-2"
          >
            <Icon name="savedOnDevice" size={15} className="shrink-0 text-success-ink" />
            Draf tersimpan otomatis
          </p>
        )}
      </header>

      {persistDraft && draftFailed && (
        <div role="status" aria-live="polite">
          <Notice tone="warning" title={DRAFT_FAILURE_COPY[draftFailed].title}>
            {DRAFT_FAILURE_COPY[draftFailed].body}
          </Notice>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 xl:gap-10">
        <aside
          aria-label="Meja foto label"
          className={cn(
            'min-w-0 space-y-4 lg:sticky lg:top-24',
            // Tanpa foto atau kamera, meja foto hanya berguna di desktop (seret dan lepas).
            // Pertanyaan data produk membahas hal yang tidak ada di foto, jadi di layar
            // sempit fotonya tidak perlu mendorong kartu pertanyaan ke bawah.
            ((!image && !(picker.cameraOpen && step === 'mulai')) || step === 'tanya') && 'hidden lg:block',
          )}
        >
          <LabelStage
            step={step}
            image={image}
            reading={reading}
            picker={picker}
            onReplace={() => {
              cancelRead();
              setImage(null);
              clearRead();
            }}
            onAddPhoto={() => goToStep('mulai')}
          />
          <TilikBubble mood={guide.mood} messageKey={guide.key} className="hidden lg:flex">
            {guide.text}
          </TilikBubble>
        </aside>

        <div className="min-w-0 space-y-4">
          <TilikBubble mood={guide.mood} messageKey={guide.key} size={52} className="lg:hidden">
            {guide.text}
          </TilikBubble>

          <div key={step} className="flow-step-in">
            {step === 'mulai' && (
              <StartStep
                image={image}
                picker={picker}
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
                {readNotice?.kind === 'gagal' && (
                  <div role="alert">
                    <Notice tone="warning" title="Label belum bisa dibaca otomatis">
                      {readNotice.body}
                    </Notice>
                  </div>
                )}
                {readNotice?.kind === 'menunggu' && pendingRead && (
                  <div role="status">
                    <Notice tone="warning" title="Kamu sudah punya isian label">
                      Pilih apakah hasil baca akan mengganti isianmu.
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="md"
                          onClick={() => {
                            setPendingRead(null);
                            applyRead(pendingRead);
                          }}
                        >
                          Pakai hasil baca
                        </Button>
                        <Button variant="secondary" size="md" onClick={clearRead}>
                          Pertahankan isian
                        </Button>
                      </div>
                    </Notice>
                  </div>
                )}
                {readNotice?.kind === 'dibaca' && (
                  <p role="status" className="sr-only">
                    Foto sudah dibaca. {readNotice.terisi} kolom terisi
                    {readNotice.tidakTerbaca > 0 ? `, ${readNotice.tidakTerbaca} tidak terbaca` : ''}.
                  </p>
                )}
                <LabelForm
                  value={label}
                  onChange={setLabel}
                  showExtras={Boolean(image)}
                  reveal={revealFields ?? undefined}
                />
                <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
                  <Button type="submit" iconAfter="arrowRight">Lanjut ke data produk</Button>
                  <Button variant="secondary" icon="arrowLeft" onClick={() => goToStep('mulai')}>
                    Kembali
                  </Button>
                </div>
              </form>
            )}

            {step === 'tanya' && (
              <QuestionsStep
                answers={answers}
                onChange={setAnswers}
                onBack={() => goToStep('isi')}
                onDone={() => goToStep('hasil')}
                initialQuestion={questionToOpen}
                shelfLifeFromLabel={declaredShelfLife(label)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function guideFor(
  step: FlowStep,
  {
    image,
    reading,
    cameraOpen,
    readNotice,
  }: {
    image: PreparedImage | null;
    reading: boolean;
    cameraOpen: boolean;
    readNotice: ReadNotice | null;
  },
): { mood: TilikMood; text: string; key: string } {
  if (step === 'mulai') {
    if (reading) {
      return { mood: 'thinking', key: 'membaca', text: 'Sebentar ya, aku sedang membaca tulisan di fotomu.' };
    }
    if (image) {
      return image.mutu.baik
        ? { mood: 'happy', key: 'foto-baik', text: 'Fotonya jelas! Tekan Baca label, nanti aku salin tulisannya ke kolom isian.' }
        : { mood: 'alert', key: 'foto-kurang', text: 'Fotonya agak sulit dibaca. Boleh tetap dicoba, tapi beberapa kolom mungkin perlu kamu betulkan.' };
    }
    if (cameraOpen) {
      return { mood: 'explaining', key: 'kamera', text: 'Pegang kemasan sejajar kamera. Aku kasih tahu kalau tulisannya sudah cukup jelas.' };
    }
    return {
      mood: 'idle',
      key: 'sapa',
      text: 'Halo, aku Tilik. Kirim foto label kemasanmu. Aku bacakan isinya, lalu kuperiksa dengan aturan BPOM.',
    };
  }
  if (step === 'isi') {
    if (readNotice?.kind === 'gagal') {
      return { mood: 'alert', key: 'gagal', text: 'Maaf, fotonya belum bisa kubaca. Ketik isinya di sini, nanti tetap kuperiksa.' };
    }
    if (readNotice?.kind === 'menunggu') {
      return { mood: 'explaining', key: 'menunggu', text: 'Kamu sudah punya isian. Mau pakai hasil bacaanku, atau tetap isianmu?' };
    }
    if (readNotice?.kind === 'dibaca') {
      return readNotice.tidakTerbaca > 0
        ? {
            mood: 'alert',
            key: 'dibaca-sebagian',
            text: `Aku sudah mengisi ${readNotice.terisi} kolom. ${readNotice.tidakTerbaca} bagian kurang jelas di foto dan kutandai kuning. Tolong dicek ya.`,
          }
        : {
            mood: 'happy',
            key: 'dibaca',
            text: `Aku sudah mengisi ${readNotice.terisi} kolom dari foto. Cocokkan sebentar dengan kemasannya sebelum lanjut.`,
          };
    }
    return image
      ? { mood: 'explaining', key: 'salin', text: 'Salin tulisan dari foto ke kolom-kolom ini. Fotonya bisa diperbesar kalau tulisannya kecil.' }
      : { mood: 'explaining', key: 'ketik', text: 'Ketik tulisan yang ada di kemasan. Kolom yang memang tidak ada biarkan kosong, nanti kuberi tahu yang kurang.' };
  }
  return {
    mood: 'explaining',
    key: 'tanya',
    text: 'Ada hal yang tidak kelihatan di foto. Jawab sebisanya, yang belum tahu boleh dilewati dulu.',
  };
}
