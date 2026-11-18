import { cn } from '@/lib/cn';

export type FlowStep = 'mulai' | 'isi' | 'tanya' | 'hasil';

const STEPS: { id: FlowStep; label: string }[] = [
  { id: 'mulai', label: 'Tambah label' },
  { id: 'isi', label: 'Isi label' },
  { id: 'tanya', label: 'Data produk' },
  { id: 'hasil', label: 'Hasil' },
];

export function StepIndicator({
  current,
  onSelect,
}: {
  current: FlowStep;
  onSelect: (step: FlowStep) => void;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === current);

  return (
    <nav aria-label={`Pemeriksaan, langkah ${currentIndex + 1} dari ${STEPS.length}`}>
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((step, index) => {
          const active = step.id === current;
          const done = index < currentIndex;
          const className = cn(
            'flex min-h-11 w-full flex-col gap-2 rounded-lg text-left text-xs leading-tight before:h-[3px] before:w-full before:rounded-full sm:text-sm',
            active && 'font-bold text-ink before:bg-brand',
            done && 'font-semibold text-brand-deep before:bg-brand-soft hover:underline hover:before:bg-brand',
            !active && !done && 'text-ink-3 before:bg-line',
          );

          return (
            <li key={step.id} aria-current={active ? 'step' : undefined}>
              {done ? (
                <button type="button" className={className} onClick={() => onSelect(step.id)}>
                  {step.label}
                </button>
              ) : (
                <span className={className}>{step.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
