import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { RuleStatusPill } from '@/components/RuleStatusPill';
import { evaluateLabelRules, REGULATION_LAST_READ } from '@/domain';
import { SAMPLE_LABEL_CASES } from '@/domain/sampleLabels';

const WORKFLOW_STEPS = [
  {
    nomor: '01',
    judul: 'Siapkan isi label',
    ringkas: 'Potret kemasan, unggah rancangan, atau ketik langsung bila belum punya label.',
  },
  {
    nomor: '02',
    judul: 'Lengkapi hal di luar foto',
    ringkas: 'Isi urutan bahan di resep, perkiraan umur simpan, cara simpan, dan status halal.',
  },
  {
    nomor: '03',
    judul: 'Terima temuan beserta pasalnya',
    ringkas: 'Tahu mana yang lengkap, kurang, atau perlu dicek fisik sebelum uang keluar untuk cetak.',
  },
];

const VERIFIED_FACTS = [
  {
    angka: '9 butir wajib',
    keterangan: 'Keterangan pokok yang wajib dimuat pada setiap label pangan olahan beserta tata cara penulisannya.',
    sumber: 'Peraturan BPOM 31/2018 Pasal 5',
  },
  {
    angka: '16 dari 18 produk',
    keterangan:
      'Sampel pangan industri rumah tangga di Kota Semarang yang diteliti belum mencantumkan informasi nilai gizi (studi satu kota, bukan angka nasional).',
    sumber: 'Jurnal USM Law Review, 2025',
  },
  {
    angka: '47,67% mikro · 24,97% kecil',
    keterangan: 'Proporsi pelaku usaha mikro dan kecil dari 11.924 perusahaan pada sistem registrasi BPOM.',
    sumber: 'Siaran Pers BPOM, 24 Feb 2025',
  },
  {
    angka: '24 bulan penyesuaian',
    keterangan:
      'Masa peralihan kewajiban tabel nilai gizi sejak Peraturan BPOM 10/2026 diundangkan pada 17 Juni 2026, berlaku juga bagi produk rumah tangga.',
    sumber: 'Peraturan BPOM 10/2026 Pasal 2 & Pasal 31; Siaran Pers BPOM, 30 Jul 2026',
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
    <div className="min-h-[100dvh] bg-stone-50 text-stone-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 items-start gap-10 py-10 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="space-y-6 lg:col-span-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-700" aria-hidden="true" />
              Pemeriksa label pangan rumahan · Cek dulu, baru cetak
            </p>

            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-5xl sm:leading-[1.08]">
              Temukan kesalahan label BPOM sebelum stiker dicetak.
            </h1>

            <p className="max-w-[65ch] text-base leading-relaxed text-stone-600">
              Pembuat keripik, sambal, dan kue kering rumahan sering baru tahu labelnya keliru saat
              permohonan SPP-IRT ditangguhkan Dinas Kesehatan hingga maksimal 3 bulan (Peraturan BPOM
              4/2024 Pasal 9 dan Pasal 14). Tilik Label memeriksa isi kemasan memakai aturan tetap dan
              menunjukkan pasalnya satu per satu.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/periksa"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-transform hover:bg-emerald-800 active:scale-[0.98]"
              >
                Periksa label saya
              </Link>
              <Link
                href="/contoh"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 active:scale-[0.98]"
              >
                Lihat contoh
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-6 sm:grid-cols-3">
              {WORKFLOW_STEPS.map((step) => (
                <div key={step.nomor} className="space-y-1">
                  <span className="font-mono text-xs font-semibold text-emerald-800">
                    Langkah {step.nomor}
                  </span>
                  <h2 className="text-sm font-semibold text-stone-900">{step.judul}</h2>
                  <p className="text-xs leading-relaxed text-stone-600">{step.ringkas}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            aria-label="Pratinjau contoh pemeriksaan"
            className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 lg:col-span-5"
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Contoh hasil pemeriksaan
                </span>
                <h2 className="mt-1 text-base font-semibold text-stone-900">
                  {sampleCase.judul}
                </h2>
              </div>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 font-mono text-xs font-medium text-rose-800 ring-1 ring-rose-200">
                {previewReport.ringkasan.kurang} kurang
              </span>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-stone-600">
              {sampleCase.ringkasanSingkat}
            </p>

            <div className="mt-4 divide-y divide-stone-200 border-t border-stone-200">
              {highlightRules.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-stone-700">
                      {item.id} · {item.rujukan.pasal}
                    </span>
                    <RuleStatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">{item.penjelasan}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4 text-xs">
              <span className="text-stone-500">
                Pemeriksaan awal, bukan pengesahan.
              </span>
              <Link href="/contoh" className="font-semibold text-emerald-800 hover:underline">
                Buka semua 20 butir
              </Link>
            </div>
          </aside>
        </section>

        <section
          aria-labelledby="judul-fakta"
          className="border-t border-stone-200 py-12"
        >
          <div className="max-w-2xl">
            <h2 id="judul-fakta" className="text-xl font-semibold tracking-tight text-stone-900">
              Mengapa pemeriksaan label sejak awal penting
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Setiap angka dan dasar aturan di bawah merujuk sumber tertulis yang diperiksa tim.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {VERIFIED_FACTS.map((fact) => (
              <div
                key={fact.angka}
                className="border-t border-stone-300 pt-4"
              >
                <p className="font-mono text-lg font-semibold text-stone-900">{fact.angka}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                  {fact.keterangan}
                </p>
                <p className="mt-2 text-xs font-medium text-stone-500">
                  Sumber: {fact.sumber}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Tilik Label adalah alat pemeriksaan awal, bukan pengesahan resmi Dinas Kesehatan atau BPOM.
          </p>
          <p>Aturan terakhir dibaca: {REGULATION_LAST_READ}</p>
        </div>
      </footer>
    </div>
  );
}
