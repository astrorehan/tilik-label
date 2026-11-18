'use client';

import { useEffect, useRef, useState } from 'react';
import { TilikMascot, type TilikMood } from '@/components/asisten/TilikMascot';
import { cn } from '@/lib/cn';

/**
 * Tempat Tilik di pemandangan teras footer. Tersembunyi sampai TilikGuide menandainya
 * data-phase="footer", yaitu setelah Tilik melompat turun dari bagian contoh.
 */
export const TILIK_FOOTER_SPOT_ID = 'tilik-footer-spot';

const FOOTER_SIZE = 112;

const LINES = [
  'Sampai jumpa! Cek labelmu sebelum cetak, ya.',
  'Aku jaga terasnya dulu.',
  'Hihi, geli!',
];

export function TilikFooterSpot() {
  const [hop, setHop] = useState(0);
  const [mood, setMood] = useState<TilikMood>('happy');
  const [sayIndex, setSayIndex] = useState(-1);
  const [saying, setSaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const greet = () => {
    setHop((count) => count + 1);
    setSayIndex((index) => (index + 1) % LINES.length);
    setSaying(true);
    setMood('happy');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaying(false), 3400);
  };

  return (
    <div id={TILIK_FOOTER_SPOT_ID} className="tilik-footer-spot" data-saying={saying ? '' : undefined}>
      <button type="button" className="tilik-footer-spot__btn" aria-label="Sapa Tilik" onClick={greet}>
        <span key={hop} className={cn('block size-full', hop > 0 && 'tilik-guide__hop')}>
          <TilikMascot mood={mood} size={FOOTER_SIZE} />
        </span>
      </button>
      <p role="status" className="tilik-footer-spot__say glass-float bubble">
        {sayIndex >= 0 ? LINES[sayIndex] : ''}
      </p>
    </div>
  );
}
