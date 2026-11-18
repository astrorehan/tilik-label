'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/button';
import { flaggedClaim, replaceFlaggedClaim, validateClaimSuggestions } from '@/domain/tilikActions';
import type { AdditionalAnswers, LabelData } from '@/domain/types';
import { requestTilik, type TilikInput } from '@/lib/tilikClient';

export function ClaimSuggestions({
  label,
  answers,
  onChangeLabel,
}: {
  label: LabelData;
  answers: AdditionalAnswers;
  onChangeLabel: (next: LabelData) => void;
}) {
  const input = useMemo(() => ({ label, answers }), [label, answers]);
  const claims = useMemo(() => label.pernyataanLain.slice(0, 20).flatMap((_, index) => {
    const claim = flaggedClaim(label, answers, index);
    return claim ? [claim] : [];
  }), [label, answers]);
  const [selected, setSelected] = useState<number>();
  const [response, setResponse] = useState<{ input: TilikInput; index: number; options: string[] }>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [applied, setApplied] = useState('');
  const latestInput = useRef(input);
  const pending = useRef<AbortController>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const announcement = useRef<HTMLParagraphElement>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useLayoutEffect(() => {
    latestInput.current = input;
  }, [input]);

  const claim = claims.find(({ index }) => index === selected) ?? claims[0];
  const options = response?.input === input && response.index === claim?.index ? response.options : undefined;

  function selectClaim(index: number) {
    pending.current?.abort();
    pending.current = null;
    setSelected(index);
    setResponse(undefined);
    setBusy(false);
    setProblem('');
    setApplied('');
  }

  async function getSuggestions() {
    if (!claim || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setProblem('');
    setApplied('');
    setBusy(true);
    const result = await requestTilik('klaim', { ...input, klaim: claim.text, indeks: claim.index }, controller.signal);
    if (controller.signal.aborted) return;
    pending.current = null;
    setBusy(false);
    if (latestInput.current !== input) {
      setProblem('Label berubah saat saran disiapkan. Kamu bisa meminta saran untuk isian terbaru.');
      return;
    }
    if (!result.ok) {
      setProblem(result.pesan);
      return;
    }
    const checked = validateClaimSuggestions(result, label, answers, claim.index);
    if (checked) setResponse({ input, index: claim.index, options: checked });
    else setProblem('Aku belum menemukan tiga pengganti yang bisa ditampilkan.');
  }

  function applyClaim(text: string) {
    if (!claim || !options?.includes(text)) return;
    const next = replaceFlaggedClaim(label, answers, claim.index, text);
    if (!next) return;
    if (claims.length === 1) announcement.current?.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
    setResponse(undefined);
    setApplied(`Klaim diganti dengan “${text}” Hasil pemeriksaan sudah diperbarui.`);
    onChangeLabel(next);
  }

  if (!claim && !applied) return null;

  return (
    <section aria-labelledby={claim ? 'klaim-pengganti' : undefined} className="panel space-y-3 p-5 sm:p-6">
      {claim && (
        <>
          <h2 ref={heading} id="klaim-pengganti" tabIndex={-1} className="flex items-center gap-2 font-semibold text-ink focus:outline-none">
            <Icon name="chat" size={20} className="text-brand" /> Ganti kalimat promosi
          </h2>
          {claims.length === 1 ? (
            <p className="text-sm text-ink-2">Klaim yang perlu diganti: <strong className="wrap-anywhere text-ink">{claim.text}</strong></p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Pilih klaim yang ingin diganti">
              {claims.map((item) => (
                <Button
                  key={item.index} size="md" variant={item.index === claim.index ? 'accent' : 'secondary'}
                  className="max-w-full wrap-anywhere" aria-pressed={item.index === claim.index}
                  onClick={() => selectClaim(item.index)}
                >
                  {item.text}
                </Button>
              ))}
            </div>
          )}
          {options ? (
            <div className="space-y-2">
              <p className="text-sm text-ink-2" role="status">Tiga saran Tilik sudah diperiksa. Pilih satu untuk mengganti klaim di label.</p>
              <ul className="grid gap-2">
                {options.map((text) => (
                  <li key={text} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[16px] border border-line bg-surface/80 px-3.5 py-2">
                    <p className="min-w-0 flex-1 text-sm leading-snug text-ink">{text}</p>
                    <Button aria-label={`Pakai saran: ${text}`} size="md" variant="ghost" icon="check" className="px-3! text-brand-deep!" onClick={() => applyClaim(text)}>
                      Pakai
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Button size="md" variant="secondary" iconAfter="arrowRight" busy={busy} disabled={busy} onClick={() => void getSuggestions()}>
              {busy ? 'Menyiapkan saran…' : 'Minta tiga saran'}
            </Button>
          )}
          {problem && <p role="status" className="text-sm text-danger-ink">{problem}</p>}
        </>
      )}
      <p ref={announcement} tabIndex={-1} role="status" className="text-sm text-brand-deep empty:sr-only focus:outline-none">{applied}</p>
    </section>
  );
}
