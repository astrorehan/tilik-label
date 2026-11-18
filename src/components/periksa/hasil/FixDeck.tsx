'use client';

import { useState } from 'react';
import { ReportFindingAssistant } from '@/components/asisten/ReportAssistant';
import { TilikBubble } from '@/components/asisten/TilikBubble';
import { FINDING_LABEL } from '@/components/findingLabels';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { TextArea, TextField } from '@/components/ui/fields';
import {
  ADDITIONAL_QUESTIONS,
  FIELDS_BY_RULE,
  QUESTION_BY_RULE,
  type FindingEntry,
  type LabelData,
  type LabelFieldKey,
  type LabelReview,
  type LabelRuleId,
} from '@/domain';
import type { AdditionalQuestionId } from '@/domain';
import { updateLabelField } from '@/domain/labelEvidence';
import { cn } from '@/lib/cn';
import { useCardTransition } from '../useCardTransition';

export const FIELD_TITLE: Record<LabelFieldKey, string> = {
  namaProduk: 'Nama jenis pangan',
  daftarBahanTeks: 'Daftar bahan',
  beratBersihTeks: 'Berat atau isi bersih',
  namaProdusen: 'Nama produsen',
  alamatProdusen: 'Alamat produsen',
  keteranganHalalTeks: 'Keterangan halal',
  kodeProduksiTeks: 'Kode produksi',
  tanggalProduksiTeks: 'Tanggal produksi',
  kedaluwarsaTeks: 'Keterangan kedaluwarsa',
  nomorIzinTeks: 'Nomor izin P-IRT',
  pernyataanAlergenTeks: 'Pernyataan alergen',
  caraPenyimpananTeks: 'Cara penyimpanan',
  pernyataanLain: 'Klaim atau tulisan lain (satu per baris)',
};

const MULTILINE: ReadonlySet<LabelFieldKey> = new Set(['daftarBahanTeks', 'alamatProdusen', 'pernyataanLain']);

function findEntry(review: LabelReview, id: LabelRuleId): FindingEntry | undefined {
  for (const group of Object.values(review.groups)) {
    const entry = group.find((item) => item.asli.id === id);
    if (entry) return entry;
  }
  return undefined;
}

function isResolved(entry: FindingEntry | undefined) {
  return entry?.sesudah.status === 'lengkap';
}

/**
 * Mode benahi: satu temuan per layar, dengan kolom isian langsung di kartunya.
 * Setiap ketikan diperiksa ulang oleh mesin aturan, jadi kartu berubah hijau
 * begitu aturannya terpenuhi. Kartu tidak hilang saat beres supaya tidak melompat.
 */
export function FixDeck({
  review,
  label,
  onChangeLabel,
  onEditAnswers,
  onFinish,
}: {
  review: LabelReview;
  label: LabelData;
  onChangeLabel: (next: LabelData) => void;
  onEditAnswers: (question?: AdditionalQuestionId) => void;
  onFinish?: () => void;
}) {
  const [ids, setIds] = useState<LabelRuleId[]>(() => review.groups.keputusan.map((entry) => entry.asli.id));
  const { index, moveTo, regionRef, cardRef } = useCardTransition<HTMLElement>(0);

  // Temuan baru yang muncul setelah pengguna mengubah isian ikut masuk antrean.
  const missing = review.groups.keputusan.map((entry) => entry.asli.id).filter((id) => !ids.includes(id));
  if (missing.length > 0) setIds([...ids, ...missing]);

  if (ids.length === 0) return null;

  const resolvedCount = ids.filter((id) => isResolved(findEntry(review, id))).length;
  const allDone = resolvedCount === ids.length;
  const safeIndex = Math.min(index, ids.length - 1);
  const id = ids[safeIndex] as LabelRuleId;
  const entry = findEntry(review, id);
  if (!entry) return null;
  const resolved = isResolved(entry);
  const finding = resolved ? entry.sesudah : entry.sesudah.status === 'kurang' ? entry.sesudah : entry.asli;
  const fields = FIELDS_BY_RULE[id] ?? [];
  const questionId = QUESTION_BY_RULE[id];
  const question = questionId ? ADDITIONAL_QUESTIONS.find((item) => item.id === questionId) : undefined;
  const last = safeIndex === ids.length - 1;

  const setField = (key: LabelFieldKey, text: string) => onChangeLabel(updateLabelField(label, key, text));

  return (
    <section ref={regionRef} id="benahi" aria-labelledby="benahi-judul" className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5 sm:px-7">
        <div>
          <h2 id="benahi-judul" className="font-semibold text-ink">Benahi satu per satu</h2>
          <p className="text-sm text-ink-2" aria-live="polite">
            <span className="tabular font-semibold text-ink">{resolvedCount}</span> dari {ids.length} sudah beres
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Lompat ke temuan">
          {ids.map((item, position) => {
            const done = isResolved(findEntry(review, item));
            const current = position === safeIndex;
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => moveTo(position)}
                  aria-label={`${FINDING_LABEL[item]}${done ? ', beres' : ''}`}
                  aria-current={current ? 'step' : undefined}
                  className={cn(
                    'grid h-7 place-items-center rounded-full text-xs font-bold transition-[width,background-color,color] duration-300 ease-out',
                    current ? 'w-11' : 'w-7',
                    done
                      ? 'bg-success text-white'
                      : current
                        ? 'bg-ink text-surface'
                        : 'bg-paper-deep text-ink-2 hover:bg-line',
                  )}
                >
                  {done ? <Icon name="check" size={14} strokeWidth={2.6} /> : position + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div key={id} ref={cardRef} className="space-y-4 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-2">
          <span
            key={resolved ? 'beres' : 'belum'}
            className={cn(
              'animate-pop inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold',
              resolved ? 'bg-success-tint text-success-ink' : 'bg-danger-tint text-danger-ink',
            )}
          >
            <Icon name={resolved ? 'check' : 'warning'} size={14} />
            {resolved ? 'Beres' : 'Perlu dibenahi'}
          </span>
          <span className="text-xs text-ink-3">
            {id} · {finding.rujukan.peraturan}, {finding.rujukan.pasal}
          </span>
        </div>

        <h3 tabIndex={-1} data-card-focus className="type-h2 focus:outline-none">
          {FINDING_LABEL[id]}
        </h3>

        <TilikBubble mood={resolved ? 'happy' : 'alert'} size={56} messageKey={resolved ? 'beres' : 'belum'}>
          {resolved ? (
            <p>
              <strong>Beres!</strong> Aturan ini sudah terpenuhi.{' '}
              {last ? 'Itu yang terakhir.' : 'Lanjut ke temuan berikutnya?'}
            </p>
          ) : (
            <p>{finding.saranPerbaikan ?? finding.penjelasan}</p>
          )}
        </TilikBubble>

        {!resolved && finding.saranPerbaikan && (
          <p className="text-sm leading-relaxed text-ink-2">{finding.penjelasan}</p>
        )}

        {!resolved && finding.contohBenar && (
          <div className="rounded-[16px] border border-line/80 bg-paper/80 p-3.5">
            <p className="text-xs font-semibold text-ink-2">Contoh penulisan</p>
            <p className="mt-1 wrap-anywhere">{finding.contohBenar}</p>
          </div>
        )}

        {fields.length > 0 && (
          <div className={cn('grid gap-3', fields.length > 1 && 'sm:grid-cols-2')}>
            {fields.map((key) => {
              const value = key === 'pernyataanLain' ? label.pernyataanLain.join('\n') : label[key];
              const Field = MULTILINE.has(key) ? TextArea : TextField;
              return (
                <Field
                  key={key}
                  id={`benahi-${id}-${key}`}
                  label={FIELD_TITLE[key]}
                  value={value}
                  onChange={(event) => setField(key, event.target.value)}
                  className={cn(MULTILINE.has(key) && fields.length > 1 && 'sm:col-span-2')}
                />
              );
            })}
          </div>
        )}
        {fields.length > 0 && (
          <p className="text-xs text-ink-3">
            Setiap perubahan langsung diperiksa ulang. Label perbaikan dan cincin di atas ikut berubah.
          </p>
        )}

        {question && !resolved && (
          <Button variant="secondary" size="md" icon="help" onClick={() => onEditAnswers(question.id)}>
            Jawab pertanyaan: {question.judul.toLowerCase()}
          </Button>
        )}

        <div className="flex flex-col-reverse gap-2.5 border-t border-line/70 pt-4 sm:flex-row sm:items-center">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon="arrowLeft"
              onClick={() => moveTo(safeIndex - 1)}
              disabled={safeIndex === 0}
            >
              Sebelumnya
            </Button>
            <ReportFindingAssistant ruleId={id} title={FINDING_LABEL[id]} />
          </div>
          <div className="flex flex-1 justify-end">
            {last ? (
              allDone && onFinish ? (
                <Button iconAfter="arrowRight" onClick={onFinish}>Lihat label perbaikan</Button>
              ) : null
            ) : (
              <Button
                variant={resolved ? 'primary' : 'secondary'}
                iconAfter="arrowRight"
                onClick={() => moveTo(safeIndex + 1)}
              >
                {resolved ? 'Berikutnya' : 'Lewati dulu'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
