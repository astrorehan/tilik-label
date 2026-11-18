import localFont from 'next/font/local';

export const bodyFont = localFont({
  src: './fonts/atkinson-hyperlegible-next.woff2',
  weight: '400 800',
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

export const displayFont = localFont({
  src: './fonts/mona-sans.woff2',
  weight: '680',
  style: 'normal',
  variable: '--font-display',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Arial', 'sans-serif'],
});

export const monoFont = localFont({
  src: './fonts/atkinson-hyperlegible-mono.woff2',
  weight: '400 700',
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
});
