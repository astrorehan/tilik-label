import { Icon } from '@/components/icons/icon';
import { Notice, Pill, type NoticeTone, type PillTone } from '@/components/ui/surface';
import type { PermitPathOutcome, PermitPathResult, PermitRuleImpact } from '@/domain';

const OUTCOME_TONE: Record<PermitPathOutcome, NoticeTone> = {
  tidak_wajib_spp_irt: 'success',
  bisa_spp_irt: 'info',
  tidak_bisa_spp_irt: 'danger',
  belum_bisa_ditentukan: 'warning',
};

const IMPACT_LOOK: Record<PermitRuleImpact, { label: string; tone: PillTone }> = {
  membebaskan: { label: 'Membebaskan', tone: 'success' },
  memenuhi: { label: 'Memenuhi', tone: 'success' },
  tidak_berlaku: { label: 'Tidak berlaku', tone: 'neutral' },
  menghalangi: { label: 'Menghalangi', tone: 'danger' },
  belum_dijawab: { label: 'Belum dijawab', tone: 'warning' },
  perlu_dicek: { label: 'Perlu dicek', tone: 'warning' },
};

/** Tampilan hasil penentu jalur izin (F-05) beserta alasan dan pasalnya. */
export function PermitPathView({ result }: { result: PermitPathResult }) {
  return (
    <section aria-labelledby="jalur-izin-judul" className="panel p-5 sm:p-6">
      <div className="record-heading">
        <div>
          <p className="type-eyebrow text-xs">Jalur izin · Peraturan BPOM 4/2024</p>
          <h2 id="jalur-izin-judul" className="type-h2 mt-1 text-ink">
            {result.judul}
          </h2>
        </div>
      </div>

      <Notice tone={OUTCOME_TONE[result.hasil]} title="Alasannya" className="mt-4">
        <ul className="list-disc space-y-1 pl-4">
          {result.alasan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-medium text-ink-3">
          Dasar: {result.rujukan.map((ref) => `${ref.peraturan}, ${ref.pasal}`).join('; ')}
        </p>
      </Notice>

      {result.perluDicek.length > 0 && (
        <div className="mt-4 rounded-[16px] border border-line bg-paper px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Icon name="help" size={18} className="text-ink-2" />
            Perlu dicek ke Dinas Kesehatan
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-snug text-ink-2">
            {result.perluDicek.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="group mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand-deep">
          <Icon
            name="chevronDown"
            size={18}
            className="transition-transform group-open:rotate-180"
          />
          Lihat delapan aturan jalur izin
        </summary>
        <ul className="mt-2 divide-y divide-line rounded-[16px] border border-line">
          {result.aturan.map((rule) => {
            const look = IMPACT_LOOK[rule.dampak];
            return (
              <li key={rule.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    <span className="type-code mr-2 text-xs text-ink-2">{rule.id}</span>
                    {rule.judul}
                  </p>
                  <Pill tone={look.tone}>{look.label}</Pill>
                </div>
                <p className="mt-1 text-sm leading-snug text-ink-2">{rule.penjelasan}</p>
                <p className="mt-1 text-xs font-medium text-ink-3">
                  Rujukan: {rule.rujukan.peraturan}, {rule.rujukan.pasal}
                </p>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
