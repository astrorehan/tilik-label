import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Icon } from '@/components/icons/icon';
import { Navbar } from '@/components/Navbar';
import { RuleStatusPill } from '@/components/RuleStatusPill';
import { ButtonLink } from '@/components/ui/button';
import { LedgerRow, Pill } from '@/components/ui/surface';
import { evaluateLabelRules } from '@/domain';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

const VERIFIED_FACTS = [
  {
    id: 'pokok',
    figure: '9 butir',
    label: 'Keterangan wajib pada setiap label',
    detail: 'Nama jenis pangan, komposisi, berat bersih, produsen, kedaluwarsa, hingga kode produksi.',
    sourceNo: 1,
  },
  {
    id: 'semarang',
    figure: '16 / 18',
    label: 'Sampel IRT di Semarang tanpa tabel gizi',
    detail: 'Studi satu kota (bukan angka nasional) akibat kurang paham aturan dan biaya uji lab.',
    sourceNo: 2,
  },
  {
    id: 'mikro',
    figure: '47,67%',
    label: 'Pelaku usaha mikro di registrasi BPOM',
    detail: 'Ditambah 24,97% usaha kecil dari total 11.924 perusahaan pada sistem registrasi.',
    sourceNo: 3,
  },
  {
    id: 'transisi',
    figure: '24 bulan',
    label: 'Masa penyesuaian tabel nilai gizi',
    detail: 'Terhitung sejak Peraturan BPOM 10/2026 diundangkan 17 Juni 2026, termasuk produk IRT.',
    sourceNo: 4,
  },
];

const LANDING_SOURCES = [
  'Peraturan BPOM 31/2018 Pasal 5 tentang Label Pangan Olahan dan Peraturan BPOM 4/2024 Pasal 9 & 14 (penangguhan SPP-IRT maksimal 3 bulan).',
  'Jurnal USM Law Review (2025), studi pada 18 sampel pangan industri rumah tangga di Kota Semarang.',
  'Siaran Pers BPOM, 24 Februari 2025, proporsi usaha mikro dan kecil dari 11.924 perusahaan di sistem registrasi BPOM.',
  'Peraturan BPOM 10/2026 Pasal 2 & Pasal 31; Siaran Pers BPOM, 30 Juli 2026.',
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Siapkan isi label',
    body: 'Potret kemasan, unggah rancangan label, atau ketik langsung isinya bila label belum dibuat.',
    highlight: false,
  },
  {
    step: '02',
    title: 'Lengkapi hal di luar foto',
    body: 'Konfirmasi urutan takaran resep, perkiraan umur simpan, cara simpan, dan kepemilikan sertifikat halal.',
    highlight: true,
  },
  {
    step: '03',
    title: 'Terima temuan & pasalnya',
    body: 'Setiap butir berstatus lengkap, kurang, atau tidak bisa dicek lengkap dengan pasal BPOM dan contoh benar.',
    highlight: false,
  },
];

export default function HomePage() {
  const sampleCase = SAMPLE_LABEL_CASES[0];
  if (!sampleCase) {
    throw new Error('Data contoh label tidak tersedia');
  }

  const previewReport = evaluateLabelRules(sampleCase.label, sampleCase.answers);
  const highlightRules = previewReport.hasil
    .filter((item) => item.status !== 'lengkap')
    .slice(0, 4);

  return (
    <div className="min-h-[100dvh] bg-surface text-ink">
      <Navbar />

      <main id="main-content">
        <section className="px-3 pt-2 sm:px-5 lg:px-6">
          <div className="hero-canvas relative mx-auto flex max-w-[84rem] flex-col items-center rounded-[32px] px-4 pt-12 text-center sm:px-8 sm:pt-16 lg:rounded-[40px] lg:pt-20">
            <Pill tone="ink" dot>
              Pemeriksa label pangan rumahan · Cek dulu, baru cetak
            </Pill>

            <h1 className="type-display mt-6 max-w-4xl text-ink">
              <span className="block">Temukan salah label</span>
              <span className="block">sebelum stiker dicetak.</span>
            </h1>

            <p className="mt-6 max-w-[40rem] text-[1.0625rem] leading-relaxed text-ink-2 lg:text-lg">
              Pembuat keripik, sambal, dan kue kering rumahan sering baru tahu labelnya keliru saat
              permohonan SPP-IRT ditangguhkan Dinas Kesehatan hingga maksimal 3 bulan. Tilik Label
              memeriksa isi kemasan memakai aturan tetap dan menunjuk pasalnya satu per satu.
            </p>

            <div className="mt-8 flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
              <ButtonLink href="/periksa" size="lg" icon="scan">
                Periksa label saya
              </ButtonLink>
              <ButtonLink href="/contoh" size="lg" variant="secondary">
                Lihat 3 contoh label
              </ButtonLink>
            </div>

            <Link
              href="/contoh"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-brand-deep underline underline-offset-4 hover:text-ink"
            >
              Coba tanpa memotret · buka 3 contoh juri →
            </Link>

            <aside
              aria-label="Pratinjau contoh pemeriksaan"
              className="card-elevated card-enter relative -mb-[clamp(4.5rem,11vw,8rem)] mt-10 w-full max-w-4xl rounded-[24px] border border-line bg-surface p-5 text-left sm:p-7"
            >
              <div className="record-heading flex-wrap">
                <div>
                  <span className="type-eyebrow text-xs">Pratinjau contoh pemeriksaan</span>
                  <h2 className="type-h2 mt-1 text-ink">{sampleCase.judul}</h2>
                </div>
                <Pill tone="danger" dot>
                  {previewReport.ringkasan.kurang} butir kurang
                </Pill>
              </div>

              <div className="mt-5 grid gap-6 lg:grid-cols-12">
                <div className="space-y-3 rounded-[18px] bg-paper p-4 lg:col-span-5">
                  <p className="text-xs font-semibold text-ink-3">Cuplikan isi label</p>
                  <p className="text-sm font-semibold text-ink">{sampleCase.label.namaProduk}</p>
                  <p className="text-xs leading-relaxed text-ink-2">
                    {sampleCase.ringkasanSingkat}
                  </p>
                  <div className="space-y-1.5 border-t border-line pt-3 text-xs">
                    <LedgerRow label="Lengkap" value={previewReport.ringkasan.lengkap} />
                    <LedgerRow label="Kurang" value={previewReport.ringkasan.kurang} strong />
                    <LedgerRow
                      label="Tidak bisa dicek"
                      value={previewReport.ringkasan.tidakBisaDicek}
                      muted
                    />
                  </div>
                </div>

                <div className="divide-y divide-line lg:col-span-7">
                  {highlightRules.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="type-code text-xs font-semibold text-ink-2">
                          {item.id} · {item.rujukan.pasal}
                        </span>
                        <RuleStatusPill status={item.status} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                        {item.penjelasan}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs">
                <span className="text-ink-3">
                  Pemeriksaan awal, bukan pengesahan resmi Dinas Kesehatan atau BPOM.
                </span>
                <Link
                  href="/contoh"
                  className="font-semibold text-brand-deep hover:underline"
                >
                  Buka semua 20 butir →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <div aria-hidden className="h-[clamp(4.5rem,11vw,8rem)]" />

        <section
          aria-labelledby="masalah-angka"
          className="mx-auto max-w-[84rem] px-5 pt-14 sm:px-8 lg:pt-20"
        >
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <p className="type-eyebrow">Masalah dalam angka</p>
              <h2 id="masalah-angka" className="type-h1 max-w-[19rem] text-ink">
                Aturan rinci, salah cetak mahal.
              </h2>
            </div>

            <ol className="grid gap-y-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-y-0">
              {VERIFIED_FACTS.map((fact) => (
                <li
                  key={fact.id}
                  className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 border-t border-line pt-5 sm:grid-cols-1 sm:gap-y-3 sm:pr-6 lg:border-l lg:border-t-0 lg:py-1 lg:pl-6 lg:pr-4 lg:first:border-l-0 lg:first:pl-0"
                >
                  <p className="type-num-l whitespace-nowrap text-brand-deep sm:type-num-xl">
                    {fact.figure}
                  </p>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="font-semibold leading-snug text-ink">
                      {fact.label}
                      <a
                        href={`#sumber-${fact.sourceNo}`}
                        aria-label={`Sumber ${fact.sourceNo}`}
                        className="ml-1 inline-flex align-super text-xs font-semibold text-ink-3 underline underline-offset-2 hover:text-brand"
                      >
                        {fact.sourceNo}
                      </a>
                    </p>
                    <p className="text-[0.9375rem] leading-snug text-ink-2">{fact.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="cara-kerja"
          className="mx-auto max-w-[84rem] px-5 pt-20 sm:px-8 lg:pt-24"
        >
          <header className="max-w-2xl">
            <p className="type-eyebrow">Alur pemeriksaan</p>
            <h2 id="cara-kerja" className="type-h1 mt-2 text-ink">
              Tiga langkah sebelum stiker naik cetak.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-2">
              Tidak perlu akun. Isi keterangan label, lengkapi hal yang tidak terlihat di kemasan,
              lalu baca hasilnya per pasal.
            </p>
          </header>

          <ol className="relative mt-12 grid gap-10 pl-9 before:absolute before:bottom-6 before:left-[11px] before:top-3 before:w-px before:bg-line-strong/50 lg:mt-14 lg:grid-cols-3 lg:gap-x-8 lg:pl-0 lg:before:bottom-auto lg:before:left-0 lg:before:right-0 lg:before:top-[11px] lg:before:h-px lg:before:w-auto">
            {WORKFLOW_STEPS.map((item) => (
              <li key={item.step} className="relative flex flex-col">
                <div className="flex items-center gap-3 lg:block">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-9 top-0 size-[23px] rounded-full border-[5px] border-surface lg:static lg:block ${
                      item.highlight ? 'bg-gold' : 'bg-brand'
                    }`}
                  />
                  <span className="type-code text-xs font-semibold text-brand-deep lg:mt-5 lg:block">
                    Langkah {item.step}
                  </span>
                </div>

                <div className="mt-4 flex-1 rounded-[20px] border border-line bg-paper p-5">
                  <h3 className="type-h2 text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="prinsip-aturan" className="px-3 pt-20 sm:px-5 lg:px-6 lg:pt-24">
          <div className="mx-auto max-w-[84rem] rounded-[32px] bg-ink px-6 py-12 text-white sm:px-10 lg:rounded-[40px] lg:px-14 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-5">
                <p className="text-sm font-semibold text-gold">Prinsip Tilik Label</p>
                <h2 id="prinsip-aturan" className="type-title text-white">
                  Isi dibaca, aturan tetap yang memutuskan.
                </h2>
                <p className="text-base leading-relaxed text-brand-soft">
                  Status setiap butir tidak pernah ditebak. Seluruh pemeriksaan dijalankan oleh
                  fungsi deterministik murni yang memetakan isi kemasan langsung ke pasal Peraturan
                  BPOM 31/2018.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
                <div className="rounded-[20px] border border-white/15 bg-white/5 p-5">
                  <Icon name="tag" size={24} className="text-gold" />
                  <h3 className="mt-3 text-base font-semibold text-white">1. Teks dari label</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-soft/90">
                    Nama pangan, komposisi, berat bersih, kedaluwarsa, izin, dan klaim diperiksa
                    sesuai format tertulis.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/15 bg-white/5 p-5">
                  <Icon name="ledger" size={24} className="text-gold" />
                  <h3 className="mt-3 text-base font-semibold text-white">2. Resep & fakta</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-soft/90">
                    Urutan komposisi dicocokkan dengan gramasi resep, umur simpan, serta sertifikat
                    halal pengguna.
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/15 bg-white/5 p-5">
                  <Icon name="shield" size={24} className="text-gold" />
                  <h3 className="mt-3 text-base font-semibold text-white">3. Tiga status jujur</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-soft/90">
                    Lengkap, kurang, atau tidak bisa dicek dari foto seperti tinggi huruf 1 mm dan
                    cetak tebal alergen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Sumber angka" className="mx-auto mt-14 max-w-[84rem] px-5 pb-12 sm:px-8">
          <div className="flex flex-col gap-1.5 border-t border-line pt-6 text-[0.875rem] leading-snug text-ink-2">
            {LANDING_SOURCES.map((source, index) => (
              <p key={source} id={`sumber-${index + 1}`} className="scroll-mt-24">
                {index + 1}. {source}
              </p>
            ))}
          </div>
        </section>

        <section aria-labelledby="ajakan" className="px-3 pb-12 sm:px-5 lg:px-6 lg:pb-16">
          <div className="hero-canvas mx-auto flex max-w-[84rem] flex-col items-center gap-6 rounded-[32px] px-5 py-12 text-center sm:px-8 lg:rounded-[40px] lg:py-16">
            <h2 id="ajakan" className="type-title max-w-2xl text-ink">
              Periksa label Anda sekarang, tanpa daftar akun.
            </h2>
            <p className="max-w-[34rem] text-ink-2 lg:text-lg">
              Isi sendiri keterangan label atau pelajari tiga contoh produk dengan kesalahan yang
              berbeda.
            </p>
            <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center">
              <ButtonLink href="/periksa" size="lg" icon="scan">
                Periksa label saya
              </ButtonLink>
              <ButtonLink href="/contoh" size="lg" variant="secondary" icon="document">
                Lihat contoh juri
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
