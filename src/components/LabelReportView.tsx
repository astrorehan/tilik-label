import { Notice, Pill } from '@/components/ui/surface';
import type { LabelCheckReport } from '@/domain';
import { RuleStatusPill } from './RuleStatusPill';

interface LabelReportViewProps {
  report: LabelCheckReport;
  productTitle?: string;
}

export function LabelReportView({ report, productTitle }: LabelReportViewProps) {
  return (
    <section className="space-y-6" aria-label="Hasil pemeriksaan aturan label">
      <div className="panel p-5 sm:p-6">
        <div className="record-heading flex-wrap">
          <div className="min-w-0">
            <h2 className="type-h2 break-words text-ink">
              {productTitle || 'Ringkasan Pemeriksaan Label'}
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              Pemeriksaan awal berdasarkan Peraturan BPOM 31/2018, bukan pengesahan resmi Dinas
              Kesehatan atau BPOM.
            </p>
          </div>
          <Pill tone={report.siapCetak ? 'success' : 'danger'} dot>
            {report.siapCetak
              ? 'Tidak ada temuan kurang'
              : `${report.ringkasan.kurang} butir perlu diperbaiki`}
          </Pill>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-success/25 bg-success-tint px-4 py-3.5">
            <p className="text-xs font-semibold text-success-ink">Lengkap</p>
            <p className="type-num-l mt-1 text-success-ink">{report.ringkasan.lengkap}</p>
          </div>
          <div className="rounded-[18px] border border-danger/25 bg-danger-tint px-4 py-3.5">
            <p className="text-xs font-semibold text-danger-ink">Kurang</p>
            <p className="type-num-l mt-1 text-danger-ink">{report.ringkasan.kurang}</p>
          </div>
          <div className="rounded-[18px] border border-warning bg-warning-tint px-4 py-3.5">
            <p className="text-xs font-semibold text-warning-ink">Tidak bisa dicek</p>
            <p className="type-num-l mt-1 text-warning-ink">
              {report.ringkasan.tidakBisaDicek}
            </p>
          </div>
        </div>

        {report.alergenTerdeteksi.length > 0 && (
          <Notice tone="warning" title="Alergen terdeteksi pada daftar bahan" className="mt-4">
            Ditemukan unsur alergen: <strong className="text-ink">{report.alergenTerdeteksi.join(', ')}</strong>.
            Pastikan dicetak tebal dan disertai kalimat pernyataan alergen.
          </Notice>
        )}
      </div>

      <div className="panel overflow-hidden">
        {report.hasil.map((item) => (
          <article key={item.id} className="rule-row">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="type-code rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink-2">
                  {item.id}
                </span>
                <h3 className="text-base font-semibold text-ink">{item.judul}</h3>
              </div>
              <RuleStatusPill status={item.status} />
            </div>

            <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.penjelasan}</p>

            {(item.saranPerbaikan || item.contohBenar) && (
              <div className="mt-3 space-y-1.5 rounded-[16px] border border-line bg-paper px-4 py-3 text-xs text-ink-2">
                {item.saranPerbaikan && (
                  <p>
                    <span className="font-semibold text-ink">Perbaikan: </span>
                    {item.saranPerbaikan}
                  </p>
                )}
                {item.contohBenar && (
                  <p>
                    <span className="font-semibold text-ink">Contoh benar: </span>
                    <span className="type-code text-xs text-ink">{item.contohBenar}</span>
                  </p>
                )}
              </div>
            )}

            <p className="mt-2.5 text-xs font-medium text-ink-3">
              Rujukan: {item.rujukan.peraturan}, {item.rujukan.pasal}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
