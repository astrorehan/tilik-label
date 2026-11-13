import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const CONTROL =
  'w-full rounded-[14px] border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-ink focus:border-brand focus:outline-none focus:shadow-[0_0_0_4px_var(--color-brand-soft)] aria-[invalid=true]:border-danger';

export function TextField({
  label,
  hint,
  error,
  suffix,
  className,
  id: providedId,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  suffix?: ReactNode;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? `${id}-note` : undefined}
          className={cn(CONTROL, 'min-h-[3.125rem]', Boolean(suffix) && 'pr-16')}
          {...rest}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-2">
            {suffix}
          </span>
        )}
      </div>
      {(hint || error) && (
        <p
          id={`${id}-note`}
          className={cn(
            'text-xs leading-snug',
            error ? 'font-semibold text-danger-ink' : 'text-ink-2',
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  className,
  id: providedId,
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; hint?: ReactNode }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-describedby={hint ? `${id}-note` : undefined}
        className={cn(CONTROL, 'min-h-24 py-3 leading-snug')}
        {...rest}
      />
      {hint && (
        <p id={`${id}-note`} className="text-xs leading-snug text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({
  label,
  hint,
  className,
  id: providedId,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; hint?: ReactNode }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={hint ? `${id}-note` : undefined}
        className={cn(CONTROL, 'min-h-[3.125rem]')}
        {...rest}
      >
        {children}
      </select>
      {hint && (
        <p id={`${id}-note`} className="text-xs leading-snug text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}
