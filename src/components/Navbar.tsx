import Link from 'next/link';

export function Navbar() {
  return (
    <header className="border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M5.25 4.5h13.5A1.5 1.5 0 0 1 20.25 6v12a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-stone-900">
              Tilik Label
            </span>
            <span className="hidden text-xs text-stone-500 sm:block">
              Cek dulu, baru cetak.
            </span>
          </div>
        </Link>

        <nav aria-label="Navigasi utama" className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/contoh"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200/70 hover:text-stone-900"
          >
            Lihat contoh
          </Link>
          <Link
            href="/periksa"
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-sm font-medium text-white transition-transform hover:bg-emerald-800 active:scale-[0.98]"
          >
            Periksa label
          </Link>
        </nav>
      </div>
    </header>
  );
}
