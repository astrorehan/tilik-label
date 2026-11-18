import { Icon } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

export type FlowStep = 'mulai' | 'isi' | 'tanya' | 'hasil';

const STEP_LABELS: Record<FlowStep, string> = {
  mulai: 'Foto label',
  isi: 'Cocokkan isi',
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
      <ol className="glass flex items-center gap-1 rounded-full p-1.5">
        {FLOW_STEPS.map((step, index) => {
          const active = step === current;
          const available = !active && index <= farthestIndex;
          const done = index < currentIndex || (available && index < farthestIndex);
          const className = cn(
            'flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-2.5 text-sm leading-tight transition-[background-color,color] duration-200 sm:justify-start sm:px-3',
            active && 'bg-ink font-semibold text-surface shadow-raised',
            available && 'font-semibold text-brand-deep hover:bg-brand-tint',
            !active && !available && 'text-ink-3',
          );
          const badge = (
            <span
              aria-hidden
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                active ? 'bg-action text-ink' : done ? 'bg-brand text-surface' : 'border border-line-strong/50',
              )}
            >
              {done && !active ? <Icon name="check" size={14} strokeWidth={2.4} /> : index + 1}
            </span>
          );
          const text = (
            <span className={cn('truncate', active ? 'inline' : 'sr-only sm:not-sr-only sm:inline')}>
              {STEP_LABELS[step]}
            </span>
          );

          return (
            <li key={step} aria-current={active ? 'step' : undefined} className={cn(active ? 'flex-[2.2] sm:flex-1' : 'flex-1')}>
              {available ? (
                <button type="button" className={className} onClick={() => onSelect(step)}>
                  {badge}
                  {text}
                </button>
              ) : (
                <span className={className}>
                  {badge}
                  {text}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
