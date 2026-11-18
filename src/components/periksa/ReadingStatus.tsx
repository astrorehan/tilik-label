'use client';

import { useEffect, useState } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/lib/cn';

/** Hal yang dicari pembaca label. Ini daftar yang dicari, bukan kemajuan sungguhan. */
const READING_TARGETS: { icon: IconName; text: string }[] = [
  { icon: 'tag', text: 'Nama jenis pangan' },
  { icon: 'document', text: 'Daftar bahan dan urutannya' },
  { icon: 'scale', text: 'Berat atau isi bersih' },
  { icon: 'home', text: 'Nama dan alamat produsen' },
  { icon: 'stamp', text: 'Nomor izin P-IRT' },
  { icon: 'calendar', text: 'Kode produksi dan kedaluwarsa' },
  { icon: 'shield', text: 'Alergen, halal, dan klaim' },
];

const TICK_MS = 1600;

function useTick(length: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((value) => value + 1), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return { index: index % length, rounds: Math.floor(index / length) };
}

/** Satu baris yang berganti-ganti di atas foto selama label dibaca. */
export function ReadingTicker({ className }: { className?: string }) {
  const { index, rounds } = useTick(READING_TARGETS.length);
  const text = rounds > 0 ? 'Tulisannya cukup banyak, sebentar lagi…' : `Mencari ${(READING_TARGETS[index]?.text ?? 'tulisan').toLowerCase()}…`;
  return (
    <p className={className}>
      <span className="sr-only">Tilik sedang membaca label.</span>
      <span key={text} aria-hidden className="animate-fade block truncate">
        {text}
      </span>
    </p>
  );
}

/** Daftar yang dicari, dengan sorotan berpindah supaya terasa ada yang bekerja. */
export function ReadingChecklist() {
  const { index } = useTick(READING_TARGETS.length);
  return (
    <ul aria-hidden className="grid gap-1.5 sm:grid-cols-2">
      {READING_TARGETS.map((target, position) => {
        const active = position === index;
        return (
          <li
            key={target.text}
            className={cn(
              'flex items-center gap-2.5 rounded-[14px] px-3 py-2 text-sm transition-[background-color,color] duration-300',
              active ? 'bg-action/70 font-semibold text-ink' : 'text-ink-2',
            )}
          >
            <Icon name={target.icon} size={18} className={active ? 'text-ink' : 'text-brand'} />
            {target.text}
            {active && <span className="pulse-dot ml-auto size-2 rounded-full bg-brand-deep" />}
          </li>
        );
      })}
    </ul>
  );
}
