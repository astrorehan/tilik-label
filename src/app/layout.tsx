import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { bodyFont, displayFont, monoFont } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Tilik Label — Cek dulu, baru cetak.',
    template: '%s · Tilik Label',
  },
  description:
    'Pemeriksa label kemasan untuk pembuat makanan rumahan berdasarkan Peraturan BPOM. Cek kekurangan label sebelum mencetak.',
};

export const viewport: Viewport = {
  themeColor: '#0b2545',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[8px] focus:bg-ink focus:p-4 focus:text-paper"
        >
          Lewati ke isi halaman
        </a>
        {children}
      </body>
    </html>
  );
}
