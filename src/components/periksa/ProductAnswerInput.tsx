'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { AdditionalQuestion } from '@/domain/questions';
import { QUESTION_ANSWER_LIMIT, validateAnswerPatch, type AnswerPatch } from '@/domain/tilikActions';
import type { AdditionalAnswers } from '@/domain/types';
import { requestTilik } from '@/lib/tilikClient';

interface SpeechInput {
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechInput;
  webkitSpeechRecognition?: new () => SpeechInput;
};

const EXAMPLES: Record<AdditionalQuestion['id'], string> = {
  umurSimpan: 'Sekitar sebulan, disimpan di kulkas.',
  caraSimpan: 'Perlu disimpan di kulkas supaya awet.',
  sertifikatHalal: 'Sertifikatnya masih dalam proses.',
  alatProduksi: 'Saya pakai mesin giling, sisanya dikerjakan tangan.',
  resep: 'Cabai 200 gram, bawang 100 gram, dan minyak 50 ml.',
};

function describeAnswer(patch: AnswerPatch) {
  const parts = [];
  if (patch.umurSimpanHari !== undefined && patch.umurSimpanHari !== null) {
    parts.push(`umur simpan ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(patch.umurSimpanHari)} hari`);
  }
  if (typeof patch.bergantungCaraSimpan === 'boolean') parts.push(patch.bergantungCaraSimpan ? 'perlu cara simpan khusus' : 'cukup di suhu ruang');
  if (typeof patch.punyaSertifikatHalal === 'boolean') parts.push(patch.punyaSertifikatHalal ? 'sertifikat halal sudah terbit' : 'sertifikat halal belum terbit');
  if (patch.alatProduksi) parts.push(`alat produksi ${patch.alatProduksi.replace('_', ' ')}`);
  if (patch.resep) parts.push(`${patch.resep.length} bahan resep`);
  return `Aku mengisi ${parts.join(', ')}. Cek jawabanmu sebelum lanjut.`;
}

export function ProductAnswerInput({
  question,
  answers,
  onApply,
}: {
  question: AdditionalQuestion;
  answers: AdditionalAnswers;
  onApply: (patch: AnswerPatch, previous: AdditionalAnswers) => AnswerPatch | null;
}) {
  const id = useId();
  const textField = useRef<HTMLTextAreaElement>(null);
  const request = useRef<AbortController>(null);
  const speech = useRef<SpeechInput>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => () => {
    request.current?.abort();
    if (speech.current) {
      speech.current.onend = null;
      speech.current.onerror = null;
      speech.current.onresult = null;
      speech.current.abort();
    }
  }, []);

  function dictate() {
    if (speech.current) {
      speech.current.stop();
      return;
    }
    setProblem('');
    setMessage('');
    const browser = window as SpeechWindow;
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setProblem('Peramban ini belum mendukung dikte. Kamu bisa mengetik jawaban di sini.');
      textField.current?.focus();
      return;
    }
    try {
      const voice = new Recognition();
      voice.lang = 'id-ID';
      voice.onresult = (event) => {
        const transcript = Array.from(event.results, (result) => result[0]?.transcript ?? '').join(' ').trim();
        if (!transcript) return;
        setDraft(transcript.slice(0, QUESTION_ANSWER_LIMIT));
        setMessage('Dikte selesai. Cek teksnya, lalu pilih Isi jawaban.');
      };
      voice.onerror = (event) => {
        if (event.error !== 'aborted') {
          setProblem(event.error === 'not-allowed'
            ? 'Izin mikrofon belum diberikan. Izinkan mikrofon atau ketik jawabanmu.'
            : 'Ucapan belum tertangkap. Coba dikte lagi atau ketik jawabanmu.');
        }
      };
      voice.onend = () => {
        speech.current = null;
        setListening(false);
      };
      voice.start();
      speech.current = voice;
      setListening(true);
    } catch {
      setProblem('Mikrofon belum bisa digunakan. Kamu masih bisa mengetik jawabanmu.');
    }
  }

  async function fillAnswer() {
    const text = draft.trim();
    if (!text || request.current || listening) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setProblem('');
    setMessage('');
    const result = await requestTilik('jawab', { pertanyaanId: question.id, jawaban: text }, controller.signal);
    if (controller.signal.aborted) return;
    request.current = null;
    setBusy(false);
    if (!result.ok) {
      setProblem(result.pesan);
      return;
    }
    const patch = validateAnswerPatch(result.jawaban, question.id, text);
    if (!patch) {
      setProblem('Aku belum bisa mencocokkan jawaban itu. Coba lebih spesifik atau isi pilihan di atas.');
      return;
    }
    const applied = onApply(patch, answers);
    if (!applied) {
      setProblem('Isian berubah saat Tilik membaca. Pilih Isi jawaban lagi kalau masih ingin memakainya.');
      return;
    }
    setMessage(describeAnswer(applied));
  }

  return (
    <div className="border-t border-line/70 pt-3">
      <Button
        variant="ghost" size="md" icon="chat" className="px-3! text-brand-deep!"
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpen(!open)}
        disabled={busy || listening}
      >
        Jawab dengan teks atau suara
      </Button>
      <div id={id} hidden={!open}>
        {open && (
          <div className="mt-2 space-y-3 rounded-[18px] border border-line bg-paper/80 p-3.5 sm:p-4">
            <label htmlFor={`${id}-jawaban`} className="text-sm font-semibold text-ink">Jawab dengan kata-katamu</label>
            <textarea
              id={`${id}-jawaban`}
              ref={textField}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setMessage(''); setProblem(''); }}
              rows={2}
              maxLength={QUESTION_ANSWER_LIMIT}
              placeholder={EXAMPLES[question.id]}
              className="block min-h-22 w-full resize-y rounded-[14px] border border-line-strong bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-ink-3 focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)] focus:outline-none"
              readOnly={busy || listening}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="md" variant="secondary" icon="microphone" aria-pressed={listening} disabled={busy} onClick={dictate}>
                {listening ? 'Hentikan dikte' : 'Dikte'}
              </Button>
              <Button type="button" size="md" iconAfter="arrowRight" busy={busy} disabled={!draft.trim() || busy || listening} onClick={() => void fillAnswer()}>
                {busy ? 'Membaca jawaban…' : 'Isi jawaban'}
              </Button>
            </div>
            <div aria-live="polite" className={problem ? 'text-sm text-danger-ink' : 'text-sm text-brand-deep'}>
              {problem || (listening ? 'Tilik sedang mendengarkan…' : message)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
