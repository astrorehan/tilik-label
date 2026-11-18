import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Icon } from '@/components/icons/icon';
import { Navbar } from '@/components/Navbar';
import { Disclosure } from '@/components/ui/disclosure';
import { Pill, type PillTone } from '@/components/ui/surface';
import {
  BAHAN_BELUM_TERBACA,
  HAL_TIDAK_DIPERIKSA,
  PENANDA_LABEL,
  REGULATION_LAST_READ,
  RULE_CATALOG,
  type CaraCekPenanda,
  type RuleCatalogSection,
} from '@/domain';

export const metadata: Metadata = {
  title: 'Aturan dan batasan',
  description: 'Rujukan aturan BPOM dan cakupan pemeriksaan Tilik Label.',
};

const PENANDA_TONE: Record<CaraCekPenanda, PillTone> = {
  dari_label: 'info',
  butuh_jawaban: 'gold',
  tidak_bisa_dari_foto: 'warning',
  perlu_dinas: 'warning',
  belum_otomatis: 'neutral',
};

function RuleSection({ section }: { section: RuleCatalogSection }) {
  return (
    <Disclosure label={section.judul} icon="document">
      <p className="text-sm text-ink-2">{section.tentang}</p>
      <a
        href={section.tautan}
        target="_blank"
        rel="noopener noreferrer"
        className="action-link my-1"
      >
        {section.peraturan} (PDF) <Icon name="external" size={16} />
        <span className="sr-only"> (membuka tab baru)</span>
      </a>
      <ul className="divide-y divide-line border-t border-line">
        {section.entri.map((entry) => (
          <li key={entry.id} className="space-y-1.5 py-3">
            <p className="font-semibold">{entry.judul}</p>
            <p className="text-sm text-ink-2">{entry.caraCek}</p>
            <p className="text-xs text-ink-3">{entry.id} · {entry.rujukan.pasal}</p>
            <div className="flex flex-wrap gap-1.5">
              {entry.penanda.map((penanda) => (
                <Pill key={penanda} tone={PENANDA_TONE[penanda]} className="min-h-7 whitespace-normal py-1">
                  {PENANDA_LABEL[penanda]}
                </Pill>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

export default function AturanPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="page-shell max-w-[58rem] flex-1 space-y-6 py-8 sm:py-12">
        <header>
          <h1 className="type-h1">Aturan dan batasan</h1>
          <p className="mt-2 text-ink-2">Lihat cakupan pemeriksaan label dan rujukan Peraturan BPOM.</p>
        </header>

        <div className="space-y-2.5">
          {RULE_CATALOG.map((section) => <RuleSection key={section.kunci} section={section} />)}
          <Disclosure label="Batas pemeriksaan" icon="info">
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink-2">
              {HAL_TIDAK_DIPERIKSA.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <h2 className="mt-4 font-semibold">Rujukan yang masih perlu ditinjau</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-2">
              {BAHAN_BELUM_TERBACA.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Disclosure>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <Link href="/nilai-gizi" className="action-link">Panduan tabel nilai gizi <Icon name="arrowRight" size={17} /></Link>
          <p className="text-sm text-ink-3">Rujukan ditinjau {REGULATION_LAST_READ}</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
