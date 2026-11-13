import localFont from 'next/font/local';

export const bodyFont = localFont({
  src: './fonts/atkinson-hyperlegible-next.woff2',
  weight: '200 800',
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
});

export const displayFont = localFont({
  src: './fonts/mona-sans.woff2',
  weight: '200 900',
  style: 'normal',
  variable: '--font-display',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '75% 125%' }],
  fallback: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
});

export const monoFont = localFont({
  src: './fonts/atkinson-hyperlegible-mono.woff2',
  weight: '200 800',
  variable: '--font-mono',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
});
