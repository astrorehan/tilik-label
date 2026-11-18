import Image from 'next/image';

export function PhotoGuide() {
  return (
    <div className="flex items-start gap-4">
      <Image
        src="/contoh-foto/kue-kering-kacang.jpg"
        alt="Contoh foto sisi kemasan yang memuat daftar bahan"
        width={1080}
        height={1440}
        sizes="104px"
        className="w-20 shrink-0 rounded-xl sm:w-26"
      />
      <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-ink-2">
        <li>Foto bagian yang memuat daftar bahan.</li>
        <li>Masukkan seluruh stiker ke dalam bingkai.</li>
        <li>Cari cahaya merata dan hindari pantulan.</li>
      </ul>
    </div>
  );
}
