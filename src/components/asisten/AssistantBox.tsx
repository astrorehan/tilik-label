'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/surface';
import { MAX_FREE_QUESTION_LENGTH, QUICK_QUESTIONS } from '@/domain';
import type { AdditionalAnswers, AnyRuleId, LabelData, QuickQuestionId } from '@/domain';

interface Exchange {
  pertanyaan: string;
  jawaban: string;
  galat?: boolean;
}

async function ask(payload: Record<string, unknown>): Promise<{ ok: boolean; teks: string }> {
  try {
    const response = await fetch('/api/asisten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; jawaban?: string; pesan?: string }
      | null;
    if (data?.ok && typeof data.jawaban === 'string') return { ok: true, teks: data.jawaban };
    return {
      ok: false,
      teks: data?.pesan ?? 'Asisten sedang tidak bisa dipakai. Penjelasan dan pasal tiap temuan tetap bisa dibaca.',
    };
  } catch {
    return { ok: false, teks: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' };
  }
}

/**
 * Kotak tanya jawab terpagar (F-14). Hanya pertanyaan cepat siap pakai dan satu
 * pertanyaan lanjutan pendek; konteks hasil pemeriksaan dikunci di server.
 */
export function AssistantBox({
  label,
  answers,
  ruleId,
  title,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  ruleId?: AnyRuleId;
  title: string;
}) {
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [freeText, setFreeText] = useState('');
  const inputId = useId();
  const questions = QUICK_QUESTIONS.filter((q) => q.perTemuan === Boolean(ruleId));

  const send = async (pertanyaan: string, extra: { pertanyaanId: QuickQuestionId } | { pertanyaanBebas: string }) => {
    if (busy) return;
    setBusy(true);
    const result = await ask({ label, answers, ...(ruleId ? { ruleId } : {}), ...extra });
    if (!result.ok && 'pertanyaanBebas' in extra) {
      // Pertanyaan dikembalikan ke isian supaya tidak perlu diketik ulang.
      setFreeText(extra.pertanyaanBebas);
    }
    setHistory((prev) => [...prev, { pertanyaan, jawaban: result.teks, galat: !result.ok }]);
    setBusy(false);
  };

  return (
    <div className="space-y-3 rounded-[16px] border border-brand-soft bg-brand-tint/50 p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <Button
            key={question.id}
            variant="secondary"
            size="md"
            disabled={busy}
            className="!h-auto !min-h-11 !py-2 !text-left whitespace-normal"
            onClick={() => void send(question.teks, { pertanyaanId: question.id })}
          >
            {question.teks}
          </Button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const text = freeText.trim();
          if (!text) return;
          setFreeText('');
          void send(text, { pertanyaanBebas: text });
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Pertanyaan lain tentang {ruleId ? 'temuan ini' : 'hasil pemeriksaan'}
        </label>
        <input
          id={inputId}
          type="text"
          value={freeText}
          maxLength={MAX_FREE_QUESTION_LENGTH}
          onChange={(event) => setFreeText(event.target.value)}
          placeholder={ruleId ? 'Pertanyaan lain tentang temuan ini' : 'Pertanyaan lain tentang hasil ini'}
          className="min-h-11 w-full min-w-0 rounded-[14px] border border-line-strong bg-surface px-3.5 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:shadow-[0_0_0_4px_var(--color-brand-soft)] focus:outline-none"
        />
        <Button type="submit" size="md" icon="send" disabled={busy || !freeText.trim()}>
          Tanya
        </Button>
      </form>

      <div aria-live="polite" className="space-y-3">
        {busy && (
          <p className="text-sm text-ink-2">
            Asisten sedang menyiapkan penjelasan…
          </p>
        )}
        {history.map((item, index) => (
          <div key={index} className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">{item.pertanyaan}</p>
            {item.galat ? (
              <Notice tone="warning">{item.jawaban}</Notice>
            ) : (
              <p className="whitespace-pre-line rounded-[14px] bg-surface px-3.5 py-3 text-sm leading-relaxed text-ink-2">
                {item.jawaban}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-ink-3">
        Penjelasan asisten, bukan pengesahan. Status temuan tetap dari pemeriksa aturan dan tidak
        berubah oleh jawaban ini.
      </p>
    </div>
  );
}

/** Tombol tanya per temuan yang membuka kotak asisten di bawah temuan itu. */
export function RuleAssistant({
  label,
  answers,
  ruleId,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  ruleId: AnyRuleId;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="md"
        icon="chat"
        className="!px-3 text-brand-deep"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? 'Tutup asisten' : `Tanya tentang ${ruleId}`}
      </Button>
      {open && (
        <div className="mt-2">
          <AssistantBox label={label} answers={answers} ruleId={ruleId} title={`Tanya tentang temuan ${ruleId}`} />
        </div>
      )}
    </div>
  );
}
