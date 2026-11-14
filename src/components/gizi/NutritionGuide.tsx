import { Card, Notice, Pill, SourceNote } from '@/components/ui/surface';
import {
  NUTRITION_FACTS,
  NUTRITION_PATHS,
  NUTRITION_REGULATION,
  NUTRITION_NO_NUMBERS,
  NUTRITION_SAFE_STEPS,
} from '@/domain/nutritionGuide';

export function NutritionGuide() {
  return (
    <div className="space-y-8">
      <section aria-labelledby="tiga-jalan" className="space-y-4">
        <div className="max-w-2xl">
          <h2 id="tiga-jalan" className="type-h2 text-ink">
            Tiga jalan menyiapkan tabel nilai gizi
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-2">
            Untuk usaha mikro, {NUTRITION_REGULATION} Pasal 7 memberi tiga jalan. Jalan nomor 1 dan 2
            boleh dipilih; jalan nomor 3 dipakai bila keduanya tidak tersedia.
          </p>
        </div>

        <ol className="grid gap-4 lg:grid-cols-3">
          {NUTRITION_PATHS.map((path) => (
            <li key={path.id}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-tint font-semibold text-brand-deep"
                  >
                    {path.nomor}
                  </span>
                  <h3 className="type-h3 min-w-0 text-ink">{path.title}</h3>
                </div>
                <p className="leading-relaxed text-ink-2">{path.summary}</p>
                <p className="text-sm leading-relaxed text-ink">
                  <span className="font-semibold">Kapan dipakai: </span>
                  {path.when}
                </p>
                <p className="text-sm leading-relaxed text-ink">
                  <span className="font-semibold">Yang aman dilakukan: </span>
                  {path.caution}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Pill tone="info">{path.article}</Pill>
                  <Pill tone="warning" icon="warning">
                    Teks resmi belum dibaca
                  </Pill>
                </div>
                <SourceNote>{path.sourceNote}</SourceNote>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <Notice tone="warning" title={NUTRITION_NO_NUMBERS.title}>
        <p>{NUTRITION_NO_NUMBERS.text}</p>
      </Notice>

      <section aria-labelledby="langkah-aman" className="space-y-3">
        <h2 id="langkah-aman" className="type-h2 text-ink">
          Yang bisa kamu siapkan sekarang
        </h2>
        <ol className="max-w-2xl list-decimal space-y-2 pl-6 leading-relaxed text-ink-2 marker:font-semibold marker:text-ink">
          {NUTRITION_SAFE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="aturan-lain" className="space-y-3">
        <h2 id="aturan-lain" className="type-h2 text-ink">
          Aturan lain yang perlu kamu tahu
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {NUTRITION_FACTS.map((fact) => (
            <li key={fact.id}>
              <Card className="flex h-full flex-col gap-2 p-4">
                <p className="leading-relaxed text-ink">{fact.text}</p>
                <div>
                  <Pill tone="info">{fact.article}</Pill>
                </div>
                {fact.note && <SourceNote>{fact.note}</SourceNote>}
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
