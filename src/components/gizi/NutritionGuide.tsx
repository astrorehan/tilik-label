import { Disclosure } from '@/components/ui/disclosure';
import { NUTRITION_FACTS, NUTRITION_PATHS, NUTRITION_SAFE_STEPS } from '@/domain/nutritionGuide';

export function NutritionGuide() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="sumber-nilai-gizi" className="space-y-3">
        <h2 id="sumber-nilai-gizi" className="type-h2">Dari mana angka gizi diperoleh?</h2>
        <p className="text-ink-2">Pilih uji laboratorium atau nilai dari BPOM. Bila keduanya belum tersedia, gunakan cara hitung resmi dari bahan.</p>
        <div className="space-y-2.5">
          {NUTRITION_PATHS.map((path) => (
            <Disclosure key={path.id} label={path.title} icon="document">
              <div className="space-y-2 text-sm leading-relaxed text-ink-2">
                <p>{path.summary}</p>
                <p>{path.when}</p>
                <p className="font-semibold text-ink">{path.caution}</p>
                <p className="text-xs text-ink-3">{path.article}</p>
              </div>
            </Disclosure>
          ))}
        </div>
      </section>

      <div className="space-y-2.5">
        <Disclosure label="Yang perlu disiapkan" icon="check">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
            {NUTRITION_SAFE_STEPS.map((step) => <li key={step}>{step}</li>)}
          </ul>
        </Disclosure>
        <Disclosure label="Ketentuan tabel dan pengecualian" icon="ledger">
          <ul className="divide-y divide-line">
            {NUTRITION_FACTS.map((fact) => (
              <li key={fact.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <p className="text-sm text-ink">{fact.text}</p>
                <p className="text-xs text-ink-3">{fact.article}</p>
                {fact.note && <p className="text-sm text-ink-2">{fact.note}</p>}
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </div>
  );
}
