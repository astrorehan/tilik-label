'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  describedBy,
}: {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  options: Array<{ value: T; title: ReactNode }>;
  className?: string;
  describedBy?: string;
}) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-describedby={describedBy}
      className={cn('flex flex-wrap gap-1 rounded-[18px] bg-paper-deep p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex min-h-11 min-w-max flex-1 cursor-pointer items-center justify-center rounded-[14px] border border-transparent px-3 text-center text-sm font-semibold transition-[background-color,border-color,box-shadow,color] duration-150',
              'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand',
              selected
                ? 'border-brand/50 bg-surface text-ink shadow-hairline'
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
