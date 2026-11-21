'use client';

import { useEffect, useRef, useState } from 'react';
import { TilikMascot, type TilikMood } from '@/components/asisten/TilikMascot';
import { cn } from '@/lib/cn';

/**
 * Tempat hinggap Tilik di beranda (di atas video, di teras footer). Tersembunyi sampai TilikGuide
 * memberinya data-here, yaitu setelah Tilik melompat ke sana. Letaknya diatur lewat className.
 */
export function TilikPerch({ id, lines, className }: { id: string; lines: string[]; className?: string }) {
  const [hop, setHop] = useState(0);
  const [mood, setMood] = useState<TilikMood>('happy');
  const [sayIndex, setSayIndex] = useState(-1);
  const [saying, setSaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const greet = () => {
    setHop((count) => count + 1);
    setSayIndex((index) => (index + 1) % lines.length);
    setSaying(true);
    setMood('happy');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaying(false), 3400);
  };

  return (
    <div id={id} className={cn('tilik-perch', className)} data-saying={saying ? '' : undefined}>
      <button type="button" className="tilik-perch__btn" aria-label="Sapa Tilik" onClick={greet}>
        <span key={hop} className={cn('block size-full', hop > 0 && 'tilik-guide__hop')}>
          <TilikMascot mood={mood} size={112} />
        </span>
      </button>
      <p role="status" className="tilik-perch__say glass-float bubble">
        {sayIndex >= 0 ? lines[sayIndex] : ''}
      </p>
    </div>
  );
}
