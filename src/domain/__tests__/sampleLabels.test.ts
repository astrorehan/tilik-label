import { describe, expect, it } from "vitest";
import { evaluateLabelRules } from "../labelRules";
import { evaluatePermitPath } from "../permitRules";
import { getUnansweredQuestions } from "../questions";
import { SAMPLE_LABEL_CASES, type SampleLabelCase } from "../sampleLabels";
import type { LabelRuleId, RuleStatus } from "../types";

function statusMap(item: SampleLabelCase): Map<LabelRuleId, RuleStatus> {
  const report = evaluateLabelRules(item.label, item.answers);
  return new Map(report.hasil.map((rule) => [rule.id, rule.status]));
}

function caseById(id: string): SampleLabelCase {
  const found = SAMPLE_LABEL_CASES.find((item) => item.id === id);
  if (!found) throw new Error(`Contoh ${id} tidak ditemukan`);
  return found;
}

describe("SAMPLE_LABEL_CASES: bentuk data", () => {
  it("berisi tiga contoh dengan id unik dan ditandai rekaan pada judul", () => {
    expect(SAMPLE_LABEL_CASES).toHaveLength(3);
    expect(new Set(SAMPLE_LABEL_CASES.map((item) => item.id)).size).toBe(3);
    for (const item of SAMPLE_LABEL_CASES) {
      expect(item.judul).toContain("Rekaan");
    }
  });

  it("tiap contoh menjawab kelima pertanyaan tambahan F-04, termasuk alat produksi", () => {
    for (const item of SAMPLE_LABEL_CASES) {
      expect(getUnansweredQuestions(item.answers)).toEqual([]);
      expect(item.answers.alatProduksi).toBeTruthy();
    }
  });

  it("tiga contoh punya kumpulan kesalahan yang berbeda", () => {
    const signatures = SAMPLE_LABEL_CASES.map((item) =>
      [...item.kesalahanDisengaja].sort().join(","),
    );
    expect(new Set(signatures).size).toBe(3);
  });
});

describe("SAMPLE_LABEL_CASES: kesalahan sesuai hasil pemeriksa", () => {
  it("butir yang disebut sengaja salah memang berstatus kurang, dan tidak ada yang kurang di luar itu", () => {
    for (const item of SAMPLE_LABEL_CASES) {
      const statuses = statusMap(item);
      const kurang = [...statuses.entries()]
        .filter(([, status]) => status === "kurang")
        .map(([id]) => id)
        .sort();
      expect(kurang, item.id).toEqual([...item.kesalahanDisengaja].sort());
    }
  });

  it("setiap ID aturan yang disebut di ringkasan termasuk kesalahan disengaja", () => {
    for (const item of SAMPLE_LABEL_CASES) {
      const mentioned = item.ringkasanSingkat.match(/L-\d{2}/g) ?? [];
      for (const id of mentioned) {
        expect(item.kesalahanDisengaja, `${item.id} menyebut ${id}`).toContain(
          id,
        );
      }
    }
  });

  it("semua kesalahan disengaja disebut di ringkasan", () => {
    for (const item of SAMPLE_LABEL_CASES) {
      for (const id of item.kesalahanDisengaja) {
        expect(item.ringkasanSingkat, item.id).toContain(id);
      }
    }
  });
});

describe("contoh pertama: tampak lengkap di permukaan tetapi gagal di dalam", () => {
  const item = caseById("kue-kering-tampak-lengkap");
  const statuses = statusMap(item);

  it("kurang di urutan bahan (L-03), alergen (L-12), dan klaim (L-18)", () => {
    expect(statuses.get("L-03")).toBe("kurang");
    expect(statuses.get("L-12")).toBe("kurang");
    expect(statuses.get("L-18")).toBe("kurang");
  });

  it("butir pokok lain lengkap", () => {
    for (const id of [
      "L-01",
      "L-02",
      "L-05",
      "L-06",
      "L-08",
      "L-09",
      "L-11",
    ] as const) {
      expect(statuses.get(id), id).toBe("lengkap");
    }
  });

  it("klaim bersyarat bukan satu-satunya klaim yang gagal diperiksa: aturan klaim lain tidak menandai salah", () => {
    expect(statuses.get("L-15")).toBe("lengkap");
    expect(statuses.get("L-16")).toBe("lengkap");
    expect(statuses.get("L-17")).toBe("lengkap");
  });
});

describe("jalur izin contoh", () => {
  it('menghasilkan jalur yang bervariasi dan tidak "belum bisa ditentukan"', () => {
    const outcomes = SAMPLE_LABEL_CASES.map(
      (item) => evaluatePermitPath(item.label, item.answers).hasil,
    );
    expect(outcomes).not.toContain("belum_bisa_ditentukan");
    expect(new Set(outcomes).size).toBeGreaterThanOrEqual(2);
  });

  it("contoh ketiga tidak bisa lewat SPP-IRT karena klaim pada label", () => {
    const item = caseById("kerupuk-ikan-klaim-gizi");
    const result = evaluatePermitPath(item.label, item.answers);
    expect(result.hasil).toBe("tidak_bisa_spp_irt");
    expect(result.klaimTerdeteksi.length).toBeGreaterThan(0);
  });
});

describe("kecepatan", () => {
  it("memeriksa ketiga contoh secara deterministik jauh di bawah tiga detik", () => {
    const start = performance.now();
    for (const item of SAMPLE_LABEL_CASES) {
      evaluateLabelRules(item.label, item.answers);
      evaluatePermitPath(item.label, item.answers);
    }
    expect(performance.now() - start).toBeLessThan(3000);
  });
});
