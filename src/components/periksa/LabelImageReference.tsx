'use client';

import Image from 'next/image';
import { Icon } from '@/components/icons/icon';
import type { PreparedImage } from '@/lib/image/prepareImage';

/** Gambar label sebagai acuan saat mengisi atau membetulkan isian. */
export function LabelImageReference({ image }: { image: PreparedImage }) {
  return (
    <details className="group panel p-4" open>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-deep">
        <Icon name="chevronDown" size={18} className="transition-transform group-open:rotate-180" />
        Gambar label sebagai acuan
      </summary>
      <Image
        unoptimized
        src={image.dataUrl}
        width={image.width}
        height={image.height}
        alt="Gambar label yang sedang diisi"
        className="mt-3 h-auto max-h-[28rem] w-full rounded-[14px] border border-line bg-paper object-contain"
      />
    </details>
  );
}
