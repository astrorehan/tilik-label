import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  MAX_FREE_QUESTION_LENGTH,
  QUICK_QUESTIONS,
  type AssistantRequest,
  type QuickQuestionId,
} from '@/domain/assistant';
import type { AdditionalAnswers, AnyRuleId, LabelCheckReport, LabelData, LabelRuleResult } from '@/domain';
import { AssistantAnswer } from './AssistantAnswer';
import { TilikMascot, type TilikMood } from './TilikMascot';

export interface AssistantInput {
  label: LabelData;
  answers: AdditionalAnswers;
}

interface Reply {
  kind: 'answer' | 'notice' | 'error';
  text: string;
}

interface Exchange {
  question: string;
  ruleId?: AnyRuleId;
  reply?: Reply;
}

const QUICK_LABEL: Record<QuickQuestionId, string> = {
  maksud: 'Apa artinya?',
  contoh: 'Contoh penulisan',
  kenapa: 'Kenapa dicek?',
  prioritas: 'Mulai dari mana?',
  jalur: 'Jalur izin produk',
};

const REPLY_MOOD: Record<Reply['kind'], TilikMood> = {
  answer: 'explaining',
  notice: 'alert',
  error: 'alert',
};

async function ask(input: AssistantInput, question: AssistantRequest, signal: AbortSignal): Promise<Reply> {
  try {
    const response = await fetch('/api/asisten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, ...question }),
      signal,
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; jawaban?: string; pesan?: string; diLuarCakupan?: boolean }
      | null;
    if (data?.ok && typeof data.jawaban === 'string') {
      return { kind: data.diLuarCakupan ? 'notice' : 'answer', text: data.jawaban };
    }
    return { kind: 'error', text: data?.pesan ?? 'Tilik sedang tidak tersedia. Coba lagi nanti.' };
  } catch {
    return { kind: 'error', text: 'Koneksi terputus. Periksa koneksi internet, lalu coba lagi.' };
  }
}

function answerFromReport(report?: LabelCheckReport, finding?: LabelRuleResult, questionId?: QuickQuestionId) {
  if (finding) {
    if (questionId === 'contoh' && finding.contohBenar) {
      return [finding.saranPerbaikan ?? finding.penjelasan, `Contoh: ${finding.contohBenar}`].join('\n');
    }
    return [
      finding.penjelasan,
      ...(finding.saranPerbaikan ? [`- ${finding.saranPerbaikan}`] : []),
    ].join('\n');
  }

  const needsFix = (report?.ringkasan.kurang ?? 0) > 0;
  const firstFindings = report?.hasil.filter((item) =>
    item.status === (needsFix ? 'kurang' : 'tidak_bisa_dicek'),
  ).slice(0, 2);
  if (!firstFindings?.length) return 'Semua bagian yang diperiksa tercatat lengkap.';

  return [
    needsFix ? 'Mulai dari bagian yang perlu diperbaiki.' : 'Ini bagian yang perlu dipastikan sebelum cetak.',
    ...firstFindings.map((item) => `- ${item.id} · ${item.judul}. ${item.saranPerbaikan ?? item.penjelasan}`),
  ].join('\n');
}

export function AssistantChat({
  id,
  open,
  title,
  initialMood = 'idle',
  input,
  ruleId,
  report,
  finding,
}: {
  id: string;
  open: boolean;
  title: string;
  initialMood?: TilikMood;
  input?: AssistantInput;
  ruleId?: AnyRuleId;
  report?: LabelCheckReport;
  finding?: LabelRuleResult;
}) {
  const [history, setHistory] = useState<Exchange[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const pendingRequest = useRef<AbortController>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const latestEntry = useRef<HTMLLIElement>(null);
  const inputId = useId();
  const draftKey = ruleId ?? 'ringkasan';
  const draft = drafts[draftKey] ?? '';
  const last = history.at(-1);
  const busy = Boolean(last && !last.reply);
  const mood = last?.reply ? REPLY_MOOD[last.reply.kind] : busy ? 'thinking' : initialMood;
  const questions = QUICK_QUESTIONS.filter(({ id, perTemuan }) => {
    if (perTemuan !== Boolean(ruleId)) return false;
    return input || id === 'prioritas' || id === 'maksud' || (id === 'contoh' && finding?.contohBenar);
  });

  useEffect(() => () => pendingRequest.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const viewport = scroller.current;
      const entry = latestEntry.current;
      if (viewport && entry) {
        // Mulai dari pertanyaan terbaru, termasuk ketika jawabannya lebih tinggi dari panel.
        viewport.scrollTop += entry.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 16;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, last]);

  async function send(question: string, request: AssistantRequest) {
    if (pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    const exchange = { question, ruleId };
    setHistory((previous) => [...previous, exchange]);

    const reply: Reply = input
      ? await ask(input, request, controller.signal)
      : {
          kind: 'answer',
          text: answerFromReport(report, finding, 'pertanyaanId' in request ? request.pertanyaanId : undefined),
        };

    if (controller.signal.aborted) return;
    pendingRequest.current = null;
    setHistory((previous) => [...previous.slice(0, -1), { ...exchange, reply }]);
    if (reply.kind === 'error' && 'pertanyaanBebas' in request) {
      setDrafts((previous) => previous[draftKey] ? previous : { ...previous, [draftKey]: request.pertanyaanBebas });
    }
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-brand-tint py-3 pr-15 pl-4 sm:gap-4 sm:py-4 sm:pl-5">
        <div className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-brand-soft sm:size-[4.75rem]">
          <TilikMascot size={68} mood={mood} animated={open} className="size-14 sm:size-[4.25rem]" />
        </div>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="type-h2 text-ink">Tanya Tilik</h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm leading-snug text-ink-2">
            {ruleId && <span className="rounded-full bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold text-brand-deep">{ruleId}</span>}
            <span className="line-clamp-2 wrap-anywhere">{title}</span>
          </p>
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-5">
        <div role="log" aria-label="Riwayat percakapan">
          <ol className="space-y-5">
            {history.map((item, index) => (
              <li key={index} ref={item === last ? latestEntry : undefined} className="space-y-3">
                <div className="ml-auto w-fit max-w-[88%] rounded-[18px] rounded-br-sm bg-brand-tint px-3.5 py-2.5 text-sm text-ink">
                  <p className="mb-1 text-xs font-semibold text-brand-deep">
                    <span className="sr-only">Pertanyaan tentang </span>
                    {item.ruleId ?? 'Ringkasan'}
                  </p>
                  <p className="wrap-anywhere">{item.question}</p>
                </div>
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-tint">
                    <TilikMascot size={36} mood={item.reply ? 'idle' : 'thinking'} animated={open && !item.reply} />
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <p className="mb-1.5 text-xs font-bold text-brand-deep">Tilik</p>
                    {item.reply ? (
                      item.reply.kind === 'answer' ? (
                        <AssistantAnswer text={item.reply.text} />
                      ) : (
                        <p className="rounded-xl border border-warning bg-warning-tint px-3 py-2.5 text-sm leading-relaxed wrap-anywhere text-warning-ink">
                          {item.reply.text}
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-ink-2">Sedang menyiapkan jawaban…</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className={history.length ? 'mt-5 border-t border-line pt-4' : undefined}>
          <p className="mb-2 text-sm font-semibold text-ink-2">Pertanyaan cepat</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pertanyaan cepat">
            {questions.map((question) => (
              <Button
                key={question.id}
                size="md"
                variant="secondary"
                iconAfter="arrowRight"
                className="px-3!"
                disabled={busy}
                onClick={() => void send(question.teks, { ruleId, pertanyaanId: question.id })}
              >
                {QUICK_LABEL[question.id]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {input && (
        <footer className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const question = draft.trim();
              if (!question || pendingRequest.current) return;
              setDrafts((previous) => ({ ...previous, [draftKey]: '' }));
              void send(question, { ruleId, pertanyaanBebas: question });
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Pertanyaan lain tentang {ruleId ? `temuan ${ruleId}` : 'hasil pemeriksaan label'}
            </label>
            <input
              id={inputId}
              type="text"
              value={draft}
              maxLength={MAX_FREE_QUESTION_LENGTH}
              onChange={(event) => {
                const text = event.target.value;
                setDrafts((previous) => ({ ...previous, [draftKey]: text }));
              }}
              placeholder={ruleId ? 'Tanya soal temuan ini…' : 'Tanya soal labelmu…'}
              className="min-h-11 min-w-0 flex-1 rounded-[14px] border border-line-strong bg-paper px-3 text-base text-ink placeholder:text-ink-3 focus:border-brand"
            />
            <Button type="submit" size="md" icon="send" className="shrink-0 px-3.5!" disabled={busy || !draft.trim()}>
              Tanya
            </Button>
          </form>
          <p className="mt-2 text-xs text-ink-3">Status temuan mengikuti laporan pemeriksaan.</p>
        </footer>
      )}
    </>
  );
}
