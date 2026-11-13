'use client';

import { cn } from '@/lib/cn';

export type FlowStep = 'isi' | 'tanya' | 'hasil';

const STEPS: Array<{ id: FlowStep; label: string }> = [
  { id: 'isi', label: 'Isi label' },
  { id: 'tanya', label: 'Pertanyaan' },
  { id: 'hasil', label: 'Hasil' },
];

/** Penanda langkah alur periksa. Setiap langkah bisa dibuka kembali. */
export function StepIndicator({
  current,
  onSelect,
}: {
  current: FlowStep;
  onSelect: (step: FlowStep) => void;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);
  return (
    <nav aria-label="Langkah pemeriksaan">
      <ol className="grid grid-cols-3 gap-1.5 rounded-full bg-paper-deep p-1">
        {STEPS.map((step, index) => {
          const active = step.id === current;
          const done = index < currentIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(11_37_69/0.14)]'
                    : done
                      ? 'text-brand-deep hover:bg-surface/60'
                      : 'text-ink-2 hover:bg-surface/60 hover:text-ink',
                )}
              >
                <span className="type-code text-xs" aria-hidden>
                  {index + 1}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
