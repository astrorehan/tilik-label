import Image from 'next/image';
import { Disclosure } from '@/components/ui/disclosure';
import type { PreparedImage } from '@/lib/image/prepareImage';

export function LabelImageReference({ image }: { image: PreparedImage }) {
  return (
    <Disclosure label="Foto acuan label" icon="eye" open>
      <Image
        unoptimized
        src={image.dataUrl}
        width={image.width}
        height={image.height}
        alt="Foto label sebagai acuan saat mencocokkan teks"
        className="h-auto max-h-[26rem] w-full rounded-[14px] bg-paper object-contain lg:max-h-[min(26rem,calc(100dvh-12rem))]"
      />
    </Disclosure>
  );
}
