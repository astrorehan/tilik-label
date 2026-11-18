import Image from 'next/image';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Icon, type IconName } from '@/components/icons/icon';
import { Navbar } from '@/components/Navbar';
import { ButtonLink } from '@/components/ui/button';

const STEPS: { icon: IconName; title: string; description: string }[] = [
  { icon: 'camera', title: 'Tambahkan label', description: 'Pakai foto, desain, atau teks label.' },
  { icon: 'edit', title: 'Cocokkan isinya', description: 'Periksa teks dan lengkapi data produk.' },
  { icon: 'ledger', title: 'Tinjau hasil', description: 'Lihat yang bisa kamu perbaiki sebelum cetak.' },
];

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
            </div>
          </div>

          <figure className="home-photo">
            <Image
              src="/visual/kemasan-keripik-ikan.png"
              alt="Stiker di sisi kemasan keripik ikan"
              fill
              loading="eager"
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

        <section aria-labelledby="cara-periksa" className="page-shell pb-12 sm:pb-16">
          <h2 id="cara-periksa" className="sr-only">Cara periksa label</h2>
          <ol className="grid divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {STEPS.map((step) => (
              <li key={step.title} className="flex items-start gap-3.5 px-1 py-4 sm:py-5 md:px-5 lg:px-7">
                <span className="icon-tile mt-0.5 shrink-0"><Icon name={step.icon} size={21} /></span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-2">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </div>
  );
}
