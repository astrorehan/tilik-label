import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { ButtonLink } from '@/components/ui/button';
import { Card, Notice, Pill, SourceNote, type PillTone } from '@/components/ui/surface';
import {
  BAHAN_BELUM_TERBACA,
  HAL_TIDAK_DIPERIKSA,
  PENANDA_LABEL,
  REGULATION_LAST_READ,
  RULE_CATALOG,
  type CaraCekPenanda,
  type RuleCatalogEntry,
  type RuleCatalogSection,
} from '@/domain';

export const metadata: Metadata = {
  title: 'Aturan dan batasan',
  description:
    'Daftar aturan BPOM yang diperiksa Tilik Label beserta pasalnya, hal yang tidak diperiksa, dan tanggal terakhir aturan dibaca.',
};

const PENANDA_TONE: Record<CaraCekPenanda, PillTone> = {
  dari_label: 'info',
  butuh_jawaban: 'gold',
  tidak_bisa_dari_foto: 'warning',
  perlu_dinas: 'warning',
  belum_otomatis: 'neutral',
};

function RuleItem({ entry }: { entry: RuleCatalogEntry }) {
  return (
    <li className="grid gap-2 py-4 md:grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,18rem)] md:gap-x-5">
      <p className="type-code font-semibold text-brand-deep">{entry.id}</p>
      <div className="min-w-0">
        <p className="font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
          {entry.judul}
        </p>
        <p className="mt-1 text-sm text-ink-2">{entry.rujukan.pasal}</p>
      </div>
      <div className="min-w-0 space-y-2">
        <p className="text-sm leading-snug text-ink-2">{entry.caraCek}</p>
        <div className="flex flex-wrap gap-1.5">
          {entry.penanda.map((penanda) => (
            <Pill key={penanda} tone={PENANDA_TONE[penanda]} className="!whitespace-normal !leading-tight py-1.5 text-left">
              {PENANDA_LABEL[penanda]}
            </Pill>
          ))}
        </div>
      </div>
    </li>
  );
}

function RuleSection({ section }: { section: RuleCatalogSection }) {
  const headingId = `aturan-${section.kunci}`;
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <p className="type-eyebrow">{section.peraturan}</p>
        <h2 id={headingId} className="type-h2 mt-1 text-ink">
          {section.judul}
        </h2>
        <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-ink-2">{section.tentang}</p>
        <p className="mt-2">
          <a
            href={section.tautan}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand-deep underline underline-offset-2"
          >
            Baca teks resmi (PDF, peraturan.go.id)
            <span className="sr-only"> (membuka tab baru)</span>
          </a>
        </p>
      </div>
      <Card className="px-4 sm:px-5">
        <ul className="divide-y divide-line">
          {section.entri.map((entry) => (
            <RuleItem key={entry.id} entry={entry} />
          ))}
        </ul>
      </Card>
    </section>
  );
}

export default function AturanPage() {
  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <Navbar />

      <main
        id="main-content"
        className="mx-auto max-w-[84rem] space-y-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
      >
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <div className="max-w-2xl">
            <p className="type-eyebrow">Aturan dan batasan</p>
            <h1 className="type-h1 mt-1.5 text-ink">Apa yang diperiksa, dan apa yang tidak</h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-2">
              Tilik Label memeriksa label dengan aturan yang tetap, bukan dengan tebakan. Tiap
              temuan menunjuk pasalnya. Halaman ini memuat semua aturan itu, cara aplikasi
              memakainya, dan hal yang belum atau tidak diperiksa.
            </p>
            <p className="mt-3">
              <Pill tone="neutral" className="!whitespace-normal !leading-tight py-1.5">
                Aturan terakhir dibaca: {REGULATION_LAST_READ}
              </Pill>
            </p>
          </div>
          <ButtonLink href="/periksa" size="md" icon="scan">
            Periksa label saya
          </ButtonLink>
        </header>

        <Notice tone="warning" title="Pemeriksaan awal, bukan pengesahan">
          Hasil Tilik Label tidak menggantikan pemeriksaan Dinas Kesehatan atau BPOM dan tidak
          menjamin label pasti lolos. Bila ragu, tanyakan ke Dinas Kesehatan setempat.
        </Notice>

        {RULE_CATALOG.map((section) => (
          <RuleSection key={section.kunci} section={section} />
        ))}

        <section aria-labelledby="tidak-diperiksa" className="space-y-3">
          <h2 id="tidak-diperiksa" className="type-h2 text-ink">
            Yang tidak diperiksa
          </h2>
          <Card className="p-4 sm:p-5">
            <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-2 marker:text-ink-3">
              {HAL_TIDAK_DIPERIKSA.map((item) => (
                <li key={item} className="[overflow-wrap:anywhere]">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section aria-labelledby="belum-terbaca" className="space-y-3">
          <h2 id="belum-terbaca" className="type-h2 text-ink">
            Bahan yang belum terbaca
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-ink-2">
            Bahan berikut belum terbaca langsung dari sumber resminya, jadi aplikasi tidak
            memakainya untuk memutuskan apa pun. Bila ada hubungannya dengan produkmu, cek ke
            Dinas Kesehatan.
          </p>
          <Card className="p-4 sm:p-5">
            <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-2 marker:text-ink-3">
              {BAHAN_BELUM_TERBACA.map((item) => (
                <li key={item} className="[overflow-wrap:anywhere]">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <SourceNote>
            Pasal yang tercantum di halaman ini dibaca dari teks resmi pada {REGULATION_LAST_READ}.
            Bahan di bagian &apos;belum terbaca&apos; belum dibaca langsung. Aturan bisa berubah,
            jadi tanggal ini ditampilkan agar kamu tahu seberapa baru isinya.
          </SourceNote>
        </section>
      </main>

      <Footer />
    </div>
  );
}
