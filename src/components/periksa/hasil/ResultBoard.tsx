'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ReportAssistant, useReportAssistant } from '@/components/asisten/ReportAssistant';
import { TilikBubble } from '@/components/asisten/TilikBubble';
import type { TilikMood } from '@/components/asisten/TilikMascot';
import { BukaCetakButton } from '@/components/cetak/BukaCetakButton';
import { FINDING_LABEL } from '@/components/findingLabels';
import { Icon } from '@/components/icons/icon';
import {
  SAVE_FAILURE_COPY,
  SaveProductButton,
  type ProductSaveStatus,
} from '@/components/produk/SaveProductButton';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { Notice, Pill } from '@/components/ui/surface';
import {
  evaluatePermitPath,
  FIELDS_BY_RULE,
  prepareForCheck,
  PRINT_GUARANTEED_RULES,
  QUESTION_BY_RULE,
  reviewLabel,
  type AdditionalAnswers,
  type AdditionalQuestionId,
  type CorrectedLabelKey,
  type FindingEntry,
  type LabelData,
  type LabelFieldKey,
  type LabelReview,
  type LabelRuleId,
} from '@/domain';
import { applyLabelEdit, greetingFindings, validateGreeting } from '@/domain/tilikActions';
import type { PreparedImage } from '@/lib/image/prepareImage';
import { cn } from '@/lib/cn';
import { focusInView } from '@/lib/pageFocus';
import { requestTilik, type TilikInput } from '@/lib/tilikClient';
import { PermitPathView } from '../PermitPathView';
import { ClaimSuggestions } from './ClaimSuggestions';
import { CorrectedLabelPreview, type RowMark } from './CorrectedLabelPreview';
import { FixDeck } from './FixDeck';
import { ReadinessRing, type RingSegment } from './ReadinessRing';

const ROW_BY_RULE: Partial<Record<LabelRuleId, CorrectedLabelKey>> = {
  'L-01': 'namaProduk',
  'L-02': 'daftarBahan',
  'L-03': 'daftarBahan',
  'L-04': 'daftarBahan',
  'L-05': 'beratBersih',
  'L-06': 'produsen',
  'L-07': 'keteranganHalal',
  'L-08': 'tanggalKodeProduksi',
  'L-09': 'kedaluwarsa',
  'L-10': 'kedaluwarsa',
  'L-11': 'nomorIzin',
  'L-12': 'pernyataanAlergen',
  'L-13': 'daftarBahan',
  'L-15': 'pernyataanLain',
  'L-16': 'pernyataanLain',
  'L-17': 'pernyataanLain',
  'L-18': 'pernyataanLain',
  'L-19': 'caraPenyimpanan',
};

const GROUP_LOOK = {
  aman: { color: 'var(--color-success)', label: 'Sudah sesuai' },
  otomatis: { color: 'var(--color-action-hover)', label: 'Dibetulkan Tilik' },
  keputusan: { color: 'var(--color-danger)', label: 'Butuh keputusanmu' },
  cek: { color: 'var(--color-gold)', label: 'Perlu dicek' },
} as const;

/**
 * Nomor perbaikan otomatis dan tanda baris di pratinjau. Satu baris bisa membawa
 * perbaikan otomatis sekaligus temuan yang masih menunggu keputusan.
 */
function buildRowMarks(review: LabelReview) {
  const numbers = new Map<LabelRuleId, number>(
    review.groups.otomatis.map((entry, index) => [entry.asli.id, index + 1]),
  );
  const marks: Partial<Record<CorrectedLabelKey, RowMark>> = {};
  const markFor = (row: CorrectedLabelKey) => (marks[row] ??= { numbers: [], needsDecision: false });
  for (const entry of review.groups.otomatis) {
    const row = ROW_BY_RULE[entry.asli.id];
    const number = numbers.get(entry.asli.id);
    if (row && number) markFor(row).numbers.push(number);
  }
  for (const entry of review.groups.keputusan) {
    const row = ROW_BY_RULE[entry.asli.id];
    if (row) markFor(row).needsDecision = true;
  }
  return { numbers, marks };
}

function fieldText(label: LabelData, key: LabelFieldKey): string {
  if (key === 'pernyataanLain') return label.pernyataanLain.filter((item) => item.trim()).join(', ');
  return label[key].trim();
}

export function ResultBoard({
  label,
  answers,
  image,
  productId,
  saveStatus,
  onSaveStatusChange,
  onSaved,
  onChangeLabel,
  onEditLabel,
  onEditAnswers,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  image: PreparedImage | null;
  productId?: string;
  saveStatus: ProductSaveStatus;
  onSaveStatusChange: (next: ProductSaveStatus) => void;
  onSaved: (id: string) => void;
  onChangeLabel: (next: LabelData) => void;
  onEditLabel: (field?: LabelFieldKey) => void;
  onEditAnswers: (question?: AdditionalQuestionId) => void;
}) {
  const prepared = useMemo(() => prepareForCheck(label, answers), [label, answers]);
  const review = useMemo(() => reviewLabel(prepared.label, prepared.answers), [prepared]);
  const permit = useMemo(() => evaluatePermitPath(prepared.label, prepared.answers), [prepared]);
  const assistantInput = useMemo(
    () => ({ label: prepared.label, answers: prepared.answers }),
    [prepared],
  );
  const productTitle = prepared.label.namaProduk.trim() || 'Label tanpa nama';
  const { groups } = review;
  const { numbers, marks } = useMemo(() => buildRowMarks(review), [review]);

  const scrollToDeck = () => {
    focusInView(document.querySelector<HTMLElement>('#benahi [data-card-focus]'));
  };
  const scrollToLabel = () => {
    focusInView(document.getElementById('label-perbaikan-judul'));
  };

  const printButton = (text: string, variant: ButtonVariant, size: 'md' | 'lg') => (
    <BukaCetakButton
      label={prepared.label}
      answers={prepared.answers}
      productId={productId}
      onSaved={onSaved}
      variant={variant}
      size={size}
    >
      {text}
    </BukaCetakButton>
  );

  return (
    <ReportAssistant
      report={review.report}
      productTitle={productTitle}
      input={assistantInput}
      onApplyLabelEdit={(edit) => onChangeLabel(applyLabelEdit(label, edit))}
    >
      <ResultHero
        review={review}
        assistantInput={assistantInput}
        productTitle={productTitle}
        image={image}
        actions={
          <>
            {groups.keputusan.length > 0 ? (
              <Button size="lg" iconAfter="arrowRight" onClick={scrollToDeck}>
                Mulai benahi
              </Button>
            ) : printButton('Cetak label perbaikan', 'primary', 'lg')}
            <AskTilikButton />
            <Button variant="ghost" icon="edit" onClick={() => onEditLabel()}>
              Ubah isian
            </Button>
          </>
        }
        status={<SaveStatus saveStatus={saveStatus} prepared={prepared} productId={productId} onSaved={onSaved} onSaveStatusChange={onSaveStatusChange} />}
      />

      {review.report.alergenTerdeteksi.length > 0 && (
        <Notice tone="warning" title="Alergen terdeteksi di daftar bahan">
          {review.report.alergenTerdeteksi.join(', ')}. Label perbaikan sudah mencetak tebal bahannya dan
          menambahkan kalimat peringatan alergen.
        </Notice>
      )}

      {/*
        Urutan kode sama dengan urutan tampil di layar sempit. Di layar lebar label
        perbaikan menempati kolom kanan sepanjang tiga baris; baris terakhir 1fr agar
        sisa tinggi kolom kanan tidak membuat celah di antara panel kiri.
      */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-6">
        <div className="min-w-0 space-y-4 empty:hidden lg:col-start-1">
          <FixDeck
            review={review}
            label={label}
            onChangeLabel={onChangeLabel}
            onEditAnswers={onEditAnswers}
            onFinish={scrollToLabel}
          />
          <ClaimSuggestions label={label} answers={prepared.answers} onChangeLabel={onChangeLabel} />
        </div>

        <aside
          id="label-perbaikan"
          aria-labelledby="label-perbaikan-judul"
          className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-3 lg:row-start-1"
        >
          <AutoFixPanel
            review={review}
            original={prepared.label}
            marks={marks}
            numbers={numbers}
            print={printButton('Buka label siap cetak', groups.keputusan.length === 0 ? 'primary' : 'secondary', 'md')}
          />
        </aside>

        {groups.cek.length > 0 && (
          <div className="min-w-0 lg:col-start-1">
            <CheckPanel entries={groups.cek} onEditLabel={onEditLabel} onEditAnswers={onEditAnswers} />
          </div>
        )}

        {groups.aman.length > 0 && (
          <div className="min-w-0 lg:col-start-1">
            <PassedPanel entries={groups.aman} />
          </div>
        )}
      </div>

      <PermitPathView result={permit}>
        <Button variant="secondary" size="md" icon="edit" onClick={() => onEditAnswers()}>
          Ubah data produk
        </Button>
      </PermitPathView>
    </ReportAssistant>
  );
}

function AskTilikButton() {
  const session = useReportAssistant();
  if (!session) return null;
  return (
    <Button
      variant="secondary"
      size="lg"
      icon="chat"
      aria-haspopup="dialog"
      aria-controls={session.controls}
      onClick={(event) => session.openAssistant(event.currentTarget)}
    >
      Tanya Tilik
    </Button>
  );
}

function ResultHero({
  review,
  assistantInput,
  productTitle,
  image,
  actions,
  status,
}: {
  review: LabelReview;
  assistantInput?: TilikInput;
  productTitle: string;
  image: PreparedImage | null;
  actions: ReactNode;
  status: ReactNode;
}) {
  const { groups, skor } = review;
  const keputusan = groups.keputusan.length;
  const cek = groups.cek.length;

  const segments: RingSegment[] = (['aman', 'otomatis', 'keputusan', 'cek'] as const).map((key) => ({
    key,
    value: groups[key].length,
    color: GROUP_LOOK[key].color,
    label: GROUP_LOOK[key].label,
  }));

  const headline =
    keputusan > 0
      ? `Tinggal ${keputusan} hal yang perlu kamu benahi`
      : cek > 0
        ? 'Labelmu hampir siap'
        : 'Labelmu sudah sesuai aturan';

  return (
    <section aria-labelledby="hasil-judul" className="glass-float overflow-hidden rounded-[32px] p-5 sm:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-10">
        <div className="order-2 flex flex-col items-center gap-5 sm:flex-row md:order-0 md:flex-col xl:flex-row">
          <ReadinessRing
            segments={segments}
            total={skor.total}
            value={skor.denganPerbaikan}
            caption="aturan terpenuhi dengan label perbaikan"
          />
          <ul className="grid w-full max-w-[16rem] gap-1.5 text-sm">
            {segments.map((segment) => (
              <li key={segment.key} className="flex items-center gap-2.5 rounded-[12px] px-2 py-1">
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: segment.color }} />
                <span className="flex-1 text-ink-2">{segment.label}</span>
                <span className="tabular font-bold text-ink">{segment.value}</span>
              </li>
            ))}
            <li className="mt-1 border-t border-line/70 px-2 pt-2 text-xs text-ink-3">
              Label aslimu: {skor.sekarang} dari {skor.total} aturan
            </li>
          </ul>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center gap-3">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.dataUrl}
                alt=""
                className="size-12 shrink-0 rounded-[14px] border border-white/80 object-cover shadow-raised"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-2">Hasil pemeriksaan</p>
              <p className="truncate font-semibold text-ink">{productTitle}</p>
            </div>
          </div>
          <h1 id="hasil-judul" tabIndex={-1} className="type-h1 scroll-mt-20 focus:outline-none sm:scroll-mt-24">{headline}</h1>
          <ResultGreeting review={review} input={assistantInput} />
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
          {status}
        </div>
      </div>
    </section>
  );
}

function ResultGreeting({ review, input }: { review: LabelReview; input?: TilikInput }) {
  const candidates = greetingFindings(review);
  const [initial] = useState(() => input && candidates.length > 1
    ? { input, ids: candidates.map(({ id }) => id) }
    : null);
  const [ids, setIds] = useState<LabelRuleId[]>();

  useEffect(() => {
    if (!initial) return;
    const controller = new AbortController();
    // Satu permintaan saat hasil dibuka. Ketikan pada label cukup menghitung ulang aturan.
    const timer = setTimeout(async () => {
      const result = await requestTilik('sapaan', initial.input, controller.signal);
      if (!controller.signal.aborted && result.ok) {
        const selected = validateGreeting(result, initial.ids);
        if (selected) setIds(selected);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [initial]);

  const ranked = ids?.flatMap((id) => candidates.find((candidate) => candidate.id === id) ?? []);
  const priorities = ranked?.length ? ranked : candidates.slice(0, 2);
  const fixed = review.groups.otomatis.length;
  const firstSteps = 'Yang masih perlu kamu tangani dulu:';
  const summary = fixed > 0
    ? priorities.length > 0
      ? `Aku sudah membetulkan ${fixed} hal di label perbaikan. ${firstSteps}`
      : `Aku sudah membetulkan ${fixed} hal di label perbaikan. Sisanya sudah sesuai.`
    : priorities.length > 0
      ? firstSteps
      : 'Semua aturan yang bisa kuperiksa sudah terpenuhi.';
  const mood: TilikMood = priorities.length > 0 ? 'explaining' : 'happy';

  return (
    <div aria-live="polite">
      <TilikBubble mood={mood} size={60}>
        <p>{summary}</p>
        {priorities.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {priorities.map((item) => (
              <li key={item.id} className="text-sm leading-snug text-ink-2">
                <strong className="text-ink">{FINDING_LABEL[item.id]}.</strong>{' '}
                {item.saranPerbaikan ?? item.penjelasan}
              </li>
            ))}
          </ul>
        )}
      </TilikBubble>
    </div>
  );
}

function SaveStatus({
  saveStatus,
  prepared,
  productId,
  onSaved,
  onSaveStatusChange,
}: {
  saveStatus: ProductSaveStatus;
  prepared: { label: LabelData; answers: AdditionalAnswers };
  productId?: string;
  onSaved: (id: string) => void;
  onSaveStatusChange: (next: ProductSaveStatus) => void;
}) {
  return (
    <div aria-live="polite">
      {saveStatus.kind === 'saved' && (
        <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
          <Icon name="savedOnDevice" size={16} className="text-success-ink" />
          {saveStatus.source === 'auto' ? 'Tersimpan otomatis di' : 'Tersimpan di'}{' '}
          <Link href="/produk" className="font-semibold text-brand-deep underline underline-offset-2">
            Produk saya
          </Link>
          <span className="text-ink-3">· hanya di peramban ini</span>
        </p>
      )}
      {saveStatus.kind === 'failed' && (
        <div className="space-y-2">
          <Notice tone="warning" title={SAVE_FAILURE_COPY[saveStatus.reason].title}>
            {SAVE_FAILURE_COPY[saveStatus.reason].body}
          </Notice>
          <SaveProductButton
            label={prepared.label}
            answers={prepared.answers}
            productId={productId}
            hideInlineStatus
            onSaved={(product) => onSaved(product.id)}
            onSaveResult={(result) => {
              onSaveStatusChange(
                result.ok
                  ? { kind: 'saved', product: result.product, source: 'manual' }
                  : { kind: 'failed', reason: result.reason },
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

function AutoFixPanel({
  review,
  original,
  marks,
  numbers,
  print,
}: {
  review: LabelReview;
  original: LabelData;
  marks: Partial<Record<CorrectedLabelKey, RowMark>>;
  numbers: Map<LabelRuleId, number>;
  print: ReactNode;
}) {
  const { corrected, groups } = review;
  return (
    <section className="panel space-y-5 p-5 sm:p-6">
      <div>
        <h2 id="label-perbaikan-judul" tabIndex={-1} className="type-h3 flex items-center gap-2 focus:outline-none">
          <Icon name="tag" size={20} className="text-brand" />
          Label perbaikan dari Tilik
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {groups.otomatis.length > 0
            ? `${groups.otomatis.length} hal sudah dibetulkan otomatis. Ukuran huruf mengikuti aturan saat dicetak.`
            : 'Tidak ada yang perlu dibetulkan otomatis. Ukuran huruf mengikuti aturan saat dicetak.'}
        </p>
      </div>

      <div className="rounded-[20px] bg-[repeating-linear-gradient(45deg,rgb(36_41_31/0.025)_0_8px,transparent_8px_16px)] p-3 sm:p-4">
        <CorrectedLabelPreview corrected={corrected} marks={marks} />
      </div>

      {(groups.otomatis.length > 0 || groups.keputusan.length > 0) && (
        <ul aria-label="Arti tanda pada label" className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
          {groups.otomatis.length > 0 && (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-5 rounded-[4px] bg-action/70" />
              Dibetulkan Tilik
            </li>
          )}
          {groups.keputusan.length > 0 && (
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="text-sm leading-none font-semibold text-ink underline decoration-danger decoration-wavy underline-offset-2">
                abc
              </span>
              Menunggu keputusanmu
            </li>
          )}
        </ul>
      )}

      {groups.otomatis.length > 0 && (
        <ol className="space-y-3">
          {groups.otomatis.map((entry) => (
            <AutoFixItem key={entry.asli.id} entry={entry} number={numbers.get(entry.asli.id)} original={original} correctedData={corrected.data} />
          ))}
        </ol>
      )}

      <div className="space-y-2 border-t border-line/70 pt-4">
        {print}
        {!corrected.siapUnduh && (
          <p className="text-xs leading-relaxed text-ink-2">
            Bisa dicetak setelah butir wajib ini terisi: {corrected.butirKosong.join(', ')}.
          </p>
        )}
      </div>
    </section>
  );
}

function AutoFixItem({
  entry,
  number,
  original,
  correctedData,
}: {
  entry: FindingEntry;
  number?: number;
  original: LabelData;
  correctedData: LabelData;
}) {
  const fields = FIELDS_BY_RULE[entry.asli.id] ?? [];
  const before = fields.map((key) => fieldText(original, key)).filter(Boolean).join(' · ');
  const after = fields.map((key) => fieldText(correctedData, key)).filter(Boolean).join(' · ');
  const changed = before !== after;

  return (
    <li className="enter flex gap-3">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-deep text-xs font-bold text-white">
        {number}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">{FINDING_LABEL[entry.asli.id]}</p>
        {changed ? (
          <div className="mt-1 space-y-1">
            <p className="line-clamp-2 text-ink-3 line-through decoration-danger/60">{before || '(belum ada)'}</p>
            <p className="line-clamp-3 rounded-[8px] bg-action/45 px-1.5 py-0.5 text-ink">{after || '(dihapus dari label)'}</p>
          </div>
        ) : (
          <p className="mt-0.5 text-ink-2">{entry.sesudah.penjelasan}</p>
        )}
        <p className="mt-1 text-xs text-ink-3">{entry.asli.rujukan.pasal}</p>
      </div>
    </li>
  );
}

function CheckPanel({
  entries,
  onEditLabel,
  onEditAnswers,
}: {
  entries: FindingEntry[];
  onEditLabel: (field?: LabelFieldKey) => void;
  onEditAnswers: (question?: AdditionalQuestionId) => void;
}) {
  return (
    <section aria-labelledby="perlu-dicek-judul" className="panel p-5 sm:p-6">
      <h2 id="perlu-dicek-judul" className="type-h3 flex items-center gap-2">
        <Icon name="eye" size={20} className="text-gold-deep" />
        Perlu dicek lagi
        <span className="tabular rounded-full bg-gold-tint px-2 py-0.5 text-sm text-gold-deep">{entries.length}</span>
      </h2>
      <p className="mt-1 text-sm text-ink-2">Bagian ini belum bisa dipastikan dari tulisan saja.</p>
      <ul className="mt-3 divide-y divide-line/70">
        {entries.map((entry) => {
          const id = entry.asli.id;
          const guaranteed = PRINT_GUARANTEED_RULES.includes(id);
          const question = QUESTION_BY_RULE[id];
          const field = FIELDS_BY_RULE[id]?.[0];
          const unreadable = entry.asli.penjelasan.includes('belum terbaca');
          return (
            <li key={id} className="py-3.5 first:pt-2 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{FINDING_LABEL[id]}</p>
                {guaranteed && <Pill tone="success" icon="check">Dijamin di label cetak Tilik</Pill>}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {guaranteed
                  ? id === 'L-14'
                    ? 'Label cetak Tilik memakai huruf minimal 1 mm, serta 2 mm untuk nama produk dan peringatan alergen. Cek sendiri bila memakai desain lain.'
                    : 'Label cetak Tilik mencetak tebal setiap bahan alergen. Cek sendiri bila memakai desain lain.'
                  : entry.asli.penjelasan}
              </p>
              {!guaranteed && (question || (unreadable && field)) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {question && (
                    <Button variant="secondary" size="md" icon="help" onClick={() => onEditAnswers(question)}>
                      Jawab pertanyaannya
                    </Button>
                  )}
                  {unreadable && field && (
                    <Button variant="secondary" size="md" icon="edit" onClick={() => onEditLabel(field)}>
                      Isi kolomnya
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PassedPanel({ entries }: { entries: FindingEntry[] }) {
  return (
    <section aria-labelledby="sudah-sesuai-judul" className="panel p-5 sm:p-6">
      <h2 id="sudah-sesuai-judul" className="type-h3 flex items-center gap-2">
        <Icon name="check" size={20} className="text-success-ink" />
        Sudah sesuai
        <span className="tabular rounded-full bg-success-tint px-2 py-0.5 text-sm text-success-ink">{entries.length}</span>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li
            key={entry.asli.id}
            title={entry.asli.penjelasan}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border border-success/20 bg-success-tint/70 px-3 text-sm font-medium text-success-ink',
            )}
          >
            <Icon name="check" size={15} />
            {FINDING_LABEL[entry.asli.id]}
          </li>
        ))}
      </ul>
    </section>
  );
}
