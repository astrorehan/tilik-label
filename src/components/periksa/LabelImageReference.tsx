import Image from 'next/image';
import { Disclosure } from '@/components/ui/disclosure';
import type { PreparedImage } from '@/lib/image/prepareImage';

export function LabelImageReference({ image }: { image: PreparedImage }) {
  return (
    <Disclosure label="Lihat foto label" icon="eye">
      <Image
        unoptimized
        src={image.dataUrl}
        width={image.width}
        height={image.height}
        alt="Foto label sebagai acuan saat mencocokkan teks"
        className="h-auto max-h-[26rem] w-full rounded-[14px] bg-paper object-contain"
      />
    </Disclosure>
  );
}
