"use client";

import { useState } from "react";
import { LedgerRow, Pill } from "@/components/ui/surface";
import { PermitPathView } from "@/components/periksa/PermitPathView";
import { ButtonLink } from "@/components/ui/button";
import {
  ADDITIONAL_QUESTIONS,
  evaluateLabelRules,
  evaluatePermitPath,
} from "@/domain";
import type { AdditionalQuestionId } from "@/domain";
import type { SampleLabelCase } from "@/domain/sampleLabels";
import { cn } from "@/lib/cn";
import { LabelReportView } from "./LabelReportView";

interface SampleSelectorClientProps {
  cases: SampleLabelCase[];
}

const EQUIPMENT_LABEL = {
  manual: "Manual",
  semi_otomatis: "Semi otomatis",
  otomatis: "Otomatis",
} as const;

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "Ya";
  if (value === false) return "Tidak";
  return "-";
}

function describeAnswer(
  id: AdditionalQuestionId,
  item: SampleLabelCase,
): string {
  const { answers } = item;
  switch (id) {
    case "umurSimpan":
      return answers.umurSimpanHari === null
        ? "-"
        : `${answers.umurSimpanHari} hari`;
    case "caraSimpan":
      return yesNo(answers.bergantungCaraSimpan);
    case "sertifikatHalal":
      return yesNo(answers.punyaSertifikatHalal);
    case "alatProduksi":
      return answers.alatProduksi ? EQUIPMENT_LABEL[answers.alatProduksi] : "-";
    default:
      return "-";
  }
}

export function SampleSelectorClient({ cases }: SampleSelectorClientProps) {
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");
  const activeCase = cases.find((item) => item.id === selectedId) ?? cases[0];

  if (!activeCase) {
    return null;
  }

  const report = evaluateLabelRules(activeCase.label, activeCase.answers);
  const permitResult = evaluatePermitPath(activeCase.label, activeCase.answers);
  const sortedRecipe = activeCase.answers.resep
    .slice()
    .sort((a, b) => b.jumlahGram - a.jumlahGram);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {cases.map((item) => {
          const isSelected = item.id === activeCase.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex flex-col items-start rounded-[20px] p-5 text-left transition-[border-color,background-color] duration-150",
                isSelected
                  ? "border-2 border-brand bg-brand-tint/45"
                  : "border border-line bg-surface hover:border-line-strong",
              )}
            >
              <Pill tone="gold">Contoh rekaan</Pill>
              <p className="mt-3 text-xs font-semibold leading-snug text-brand-deep">
                {item.kategori}
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {item.judul}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                {item.ringkasanSingkat}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="panel space-y-5 p-5 sm:p-6 lg:col-span-4 lg:self-start">
          <div className="record-heading">
            <div className="min-w-0">
              <Pill tone="gold">Data rekaan, bukan produk nyata</Pill>
              <h2 className="type-h2 mt-2 text-ink">{activeCase.judul}</h2>
            </div>
          </div>

          <dl className="divide-y divide-line text-sm">
            <div className="py-3 first:pt-0">
              <dt className="text-xs font-semibold text-ink-3">Nama produk</dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.namaProduk || "-"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">Daftar bahan</dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.daftarBahanTeks || "-"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">
                Berat / isi bersih
              </dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.beratBersihTeks || "-"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">
                Produsen & alamat
              </dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.namaProdusen} —{" "}
                {activeCase.label.alamatProdusen}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">
                Kedaluwarsa & kode
              </dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.kedaluwarsaTeks || "-"} ·{" "}
                {activeCase.label.kodeProduksiTeks || "-"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="text-xs font-semibold text-ink-3">
                Izin & alergen
              </dt>
              <dd className="mt-1 text-ink">
                {activeCase.label.nomorIzinTeks || "-"} ·{" "}
                {activeCase.label.pernyataanAlergenTeks ||
                  "(tanpa kalimat alergen)"}
              </dd>
            </div>
            <div className="py-3">
              <dt className="mb-2 text-xs font-semibold text-ink-3">
                Resep (takaran terbanyak)
              </dt>
              <dd className="space-y-1.5">
                {sortedRecipe.map((r) => (
                  <LedgerRow
                    key={r.nama}
                    label={r.nama}
                    value={`${r.jumlahGram} g`}
                    className="text-xs text-ink"
                  />
                ))}
              </dd>
            </div>
            <div className="py-3 last:pb-0">
              <dt className="mb-2 text-xs font-semibold text-ink-3">
                Jawaban pertanyaan tambahan
              </dt>
              <dd className="space-y-1.5">
                {ADDITIONAL_QUESTIONS.filter(
                  (question) => question.id !== "resep",
                ).map((question) => (
                  <LedgerRow
                    key={question.id}
                    label={question.judul}
                    value={describeAnswer(question.id, activeCase)}
                    className="text-xs text-ink"
                  />
                ))}
              </dd>
            </div>
          </dl>
        </aside>

        <div className="min-w-0 space-y-6 lg:col-span-8">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-2">
            <Pill tone="gold">Contoh rekaan</Pill>
            Hasil pemeriksaan untuk {activeCase.judul}
          </p>
          <PermitPathView result={permitResult} />
          <LabelReportView report={report} productTitle={activeCase.judul} />
        </div>
      </div>

      <div className="flex flex-col items-start gap-3 rounded-[20px] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-ink-2">
          Ketiga contoh di atas rekaan. Untuk produk Anda sendiri, isi atau foto
          label di alur periksa lalu jawab lima pertanyaan singkat.
        </p>
        <ButtonLink href="/periksa" size="md" icon="scan">
          Coba dengan label sendiri
        </ButtonLink>
      </div>
    </div>
  );
}
