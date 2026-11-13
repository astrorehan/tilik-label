import type { LabelCheckReport } from '@/domain';
import { RuleStatusPill } from './RuleStatusPill';

interface LabelReportViewProps {
  report: LabelCheckReport;
  productTitle?: string;
}

export function LabelReportView({ report, productTitle }: LabelReportViewProps) {
  return (
    <section className="space-y-6" aria-label="Hasil pemeriksaan aturan label">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            {productTitle ? (
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                {productTitle}
              </h2>
            ) : (
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">
                Ringkasan Pemeriksaan Label
              </h2>
            )}
            <p className="mt-1 text-sm text-stone-600">
              Pemeriksaan awal berdasarkan Peraturan BPOM 31/2018, bukan pengesahan resmi Dinas Kesehatan atau BPOM.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              report.siapCetak
                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                : 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
            }`}
          >
            {report.siapCetak ? 'Tidak ada temuan kurang' : `${report.ringkasan.kurang} butir perlu diperbaiki`}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
            <p className="text-xs font-medium text-emerald-900">Lengkap</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800">
              {report.ringkasan.lengkap}
            </p>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 px-4 py-3">
            <p className="text-xs font-medium text-rose-900">Kurang</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-rose-800">
              {report.ringkasan.kurang}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3">
            <p className="text-xs font-medium text-amber-900">Tidak bisa dicek</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-amber-800">
              {report.ringkasan.tidakBisaDicek}
            </p>
          </div>
        </div>

        {report.alergenTerdeteksi.length > 0 && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <span className="font-medium text-stone-900">Alergen terdeteksi pada bahan: </span>
            {report.alergenTerdeteksi.join(', ')}.
          </div>
        )}
      </div>

      <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {report.hasil.map((item) => (
          <article key={item.id} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-stone-500">
                  {item.id}
                </span>
                <h3 className="text-sm font-semibold text-stone-900 sm:text-base">
                  {item.judul}
                </h3>
              </div>
              <RuleStatusPill status={item.status} />
            </div>

            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {item.penjelasan}
            </p>

            {(item.saranPerbaikan || item.contohBenar) && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-stone-200/80 bg-stone-50 px-3.5 py-2.5 text-xs text-stone-700">
                {item.saranPerbaikan && (
                  <p>
                    <span className="font-semibold text-stone-900">Perbaikan: </span>
                    {item.saranPerbaikan}
                  </p>
                )}
                {item.contohBenar && (
                  <p>
                    <span className="font-semibold text-stone-900">Contoh benar: </span>
                    <span className="font-mono text-stone-800">{item.contohBenar}</span>
                  </p>
                )}
              </div>
            )}

            <p className="mt-2.5 text-xs text-stone-500">
              Rujukan: {item.rujukan.peraturan}, {item.rujukan.pasal}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
