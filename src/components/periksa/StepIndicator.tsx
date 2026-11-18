import { cn } from '@/lib/cn';

export type FlowStep = 'mulai' | 'isi' | 'tanya' | 'hasil';

const STEP_LABELS: Record<FlowStep, string> = {
  mulai: 'Tambah label',
  isi: 'Isi label',
  tanya: 'Data produk',
  hasil: 'Hasil',
};

export const FLOW_STEPS: readonly FlowStep[] = ['mulai', 'isi', 'tanya', 'hasil'];

export function StepIndicator({
  current,
  farthestStep,
  onSelect,
}: {
  current: FlowStep;
  farthestStep: FlowStep;
  onSelect: (step: FlowStep) => void;
}) {
  const currentIndex = FLOW_STEPS.indexOf(current);
  const farthestIndex = FLOW_STEPS.indexOf(farthestStep);

  return (
    <nav aria-label={`Pemeriksaan, langkah ${currentIndex + 1} dari ${FLOW_STEPS.length}`}>
      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {FLOW_STEPS.map((step, index) => {
          const active = step === current;
          const available = !active && index <= farthestIndex;
          const className = cn(
            'flex min-h-11 w-full flex-col gap-2 rounded-lg text-left text-xs leading-tight before:h-[3px] before:w-full before:rounded-full sm:text-sm',
            active && 'font-bold text-ink before:bg-brand',
            available && 'font-semibold text-brand-deep before:bg-brand-soft hover:underline hover:before:bg-brand',
            !active && !available && 'text-ink-3 before:bg-line',
          );

          return (
            <li key={step} aria-current={active ? 'step' : undefined}>
              {available ? (
                <button type="button" className={className} onClick={() => onSelect(step)}>
                  {STEP_LABELS[step]}
                </button>
              ) : (
                <span className={className}>{STEP_LABELS[step]}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
