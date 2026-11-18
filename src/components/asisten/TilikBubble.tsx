import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { TilikMascot, type TilikMood } from './TilikMascot';

/**
 * Tilik berbicara lewat gelembung kaca. `messageKey` memicu animasi masuk
 * setiap kali isi pesannya berganti.
 */
export function TilikBubble({
  mood = 'idle',
  size = 64,
  messageKey,
  children,
  className,
  bubbleClassName,
}: {
  mood?: TilikMood;
  size?: number;
  messageKey?: string;
  children: ReactNode;
  className?: string;
  bubbleClassName?: string;
}) {
  return (
    <div className={cn('flex items-end gap-2.5', className)}>
      <TilikMascot mood={mood} size={size} className="-mb-1.5 shrink-0" />
      <div
        className={cn(
          'glass-float bubble min-w-0 flex-1 px-4 py-3 text-[0.9375rem] leading-snug text-ink',
          bubbleClassName,
        )}
      >
        <div key={messageKey} className="animate-fade">
          {children}
        </div>
      </div>
    </div>
  );
}
