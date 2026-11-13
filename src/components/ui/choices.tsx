'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: Array<{ value: T; title: ReactNode }>;
  className?: string;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex gap-1 rounded-full bg-paper-deep p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-3 text-center text-sm font-semibold transition-[background-color,box-shadow,color] duration-150',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand',
              selected
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgb(11_37_69/0.14)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            {option.title}
          </label>
        );
      })}
    </div>
  );
}
