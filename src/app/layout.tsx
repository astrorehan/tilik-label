import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Tilik Label — Cek dulu, baru cetak.',
  description:
    'Pemeriksa label kemasan untuk pembuat makanan rumahan berdasarkan Peraturan BPOM. Cek kekurangan label sebelum mencetak.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-[100dvh] bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
