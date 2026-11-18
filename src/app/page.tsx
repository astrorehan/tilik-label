import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { ExampleResult } from '@/components/beranda/ExampleResult';
import { StepCards } from '@/components/beranda/StepCards';
import { Icon } from '@/components/icons/icon';
import { Navbar } from '@/components/Navbar';
import { ButtonLink } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <section aria-labelledby="judul-beranda" className="page-shell home-hero">
          <div className="home-intro">
            <p className="mb-3 text-sm font-semibold text-brand-deep sm:mb-5">
              Untuk usaha pangan rumahan
            </p>
            <h1 id="judul-beranda" className="home-title">
              Cek label <span className="block">sebelum cetak.</span>
            </h1>
            <p className="mt-5 max-w-[25rem] text-lg leading-relaxed text-ink-2 sm:mt-6 sm:text-xl">
              Periksa kelengkapan stiker kemasan dari foto atau draf label. Langsung mulai tanpa akun.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-9">
              <ButtonLink href="/periksa" icon="scan" size="xl">
                Periksa label
              </ButtonLink>
              <Link href="/contoh" className="action-link">
                Coba contoh <Icon name="arrowRight" size={17} />
              </Link>
              <Link href="/juri" className="action-link">Demo juri <Icon name="arrowRight" size={17} /></Link>
            </div>
          </div>

          <figure className="home-photo">
            <Image
              src="/visual/kemasan-keripik-ikan.webp"
              alt="Stiker di sisi kemasan keripik ikan"
              fill
              preload
              unoptimized
              fetchPriority="high"
              sizes="(min-width: 1200px) 568px, (min-width: 900px) 50vw, 92vw"
              className="object-cover"
            />
            <span className="scan-frame" aria-hidden="true" />
            <figcaption className="glass home-photo-caption">
              <span className="icon-tile shrink-0"><Icon name="scan" size={22} /></span>
              <span>
                <strong className="block leading-tight text-ink">Bagian yang difoto</strong>
                <span className="mt-0.5 block text-sm leading-snug text-ink-2">Stiker yang memuat komposisi.</span>
              </span>
            </figcaption>
          </figure>
        </section>

        <StepCards />
        <ExampleResult />
      </main>
      <Footer illustrated />
    </div>
  );
}
