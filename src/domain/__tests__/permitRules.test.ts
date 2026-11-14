import { describe, expect, it } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData } from '../labelRules';
import { detectLabelClaims, evaluatePermitPath } from '../permitRules';
import type { AdditionalAnswers, LabelData, PermitRuleId } from '../types';

function makeLabel(overrides: Partial<LabelData> = {}): LabelData {
  return {
    ...createEmptyLabelData(),
    namaProduk: 'Keripik Singkong Pedas',
    pernyataanLain: [],
    ...overrides,
  };
}

function makeAnswers(overrides: Partial<AdditionalAnswers> = {}): AdditionalAnswers {
  return {
    ...createEmptyAnswers(),
    umurSimpanHari: 90,
    alatProduksi: 'manual',
    ...overrides,
  };
}

function ruleOf(id: PermitRuleId, label: LabelData, answers: AdditionalAnswers) {
  const found = evaluatePermitPath(label, answers).aturan.find((rule) => rule.id === id);
  if (!found) throw new Error(`Aturan ${id} tidak ditemukan`);
  return found;
}

describe('evaluatePermitPath: struktur hasil', () => {
  it('selalu mengembalikan delapan aturan I-01 sampai I-08 dengan pasal', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers());
    expect(result.aturan.map((rule) => rule.id)).toEqual([
      'I-01',
      'I-02',
      'I-03',
      'I-04',
      'I-05',
      'I-06',
      'I-07',
      'I-08',
    ]);
    for (const rule of result.aturan) {
      expect(rule.rujukan.peraturan).toBe('Peraturan BPOM Nomor 4 Tahun 2024');
      expect(rule.rujukan.pasal).toMatch(/^Pasal \d+/);
      expect(rule.penjelasan.length).toBeGreaterThan(0);
    }
  });

  it('setiap hasil akhir disertai alasan dan pasal', () => {
    const scenarios: AdditionalAnswers[] = [
      makeAnswers({ umurSimpanHari: 3 }),
      makeAnswers(),
      makeAnswers({ alatProduksi: 'otomatis' }),
      makeAnswers({ umurSimpanHari: null }),
      makeAnswers({ alatProduksi: null }),
    ];
    for (const answers of scenarios) {
      const result = evaluatePermitPath(makeLabel(), answers);
      expect(result.alasan.length).toBeGreaterThan(0);
      expect(result.rujukan.length).toBeGreaterThan(0);
      expect(result.judul.length).toBeGreaterThan(0);
    }
  });
});

describe('I-01 umur simpan kurang dari 7 hari (Pasal 3)', () => {
  it('umur simpan 6 hari membebaskan dari SPP-IRT', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers({ umurSimpanHari: 6 }));
    expect(result.hasil).toBe('tidak_wajib_spp_irt');
    expect(ruleOf('I-01', makeLabel(), makeAnswers({ umurSimpanHari: 6 })).dampak).toBe(
      'membebaskan',
    );
    expect(result.rujukan).toContainEqual({
      peraturan: 'Peraturan BPOM Nomor 4 Tahun 2024',
      pasal: 'Pasal 3',
    });
  });

  it('batas tepat 7 hari tidak lagi dikecualikan', () => {
    const answers = makeAnswers({ umurSimpanHari: 7 });
    expect(ruleOf('I-01', makeLabel(), answers).dampak).toBe('tidak_berlaku');
    expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('bisa_spp_irt');
  });

  it('umur simpan pecahan di bawah 7 hari tetap dikecualikan', () => {
    const answers = makeAnswers({ umurSimpanHari: 6.5 });
    expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('tidak_wajib_spp_irt');
  });

  it('umur simpan kosong, nol, negatif, atau bukan angka dianggap belum dijawab', () => {
    for (const umur of [null, 0, -3, Number.NaN]) {
      const answers = makeAnswers({ umurSimpanHari: umur });
      expect(ruleOf('I-01', makeLabel(), answers).dampak).toBe('belum_dijawab');
      expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('belum_bisa_ditentukan');
    }
  });

  it('pengecualian umur simpan didahulukan walau ada klaim atau alat otomatis', () => {
    const label = makeLabel({ pernyataanLain: ['Tinggi protein'] });
    const answers = makeAnswers({ umurSimpanHari: 2, alatProduksi: 'otomatis' });
    expect(evaluatePermitPath(label, answers).hasil).toBe('tidak_wajib_spp_irt');
  });
});

describe('I-02 pangan siap saji (Pasal 3)', () => {
  it('pangan siap saji tidak wajib SPP-IRT', () => {
    const answers = makeAnswers({ panganSiapSaji: true });
    expect(ruleOf('I-02', makeLabel(), answers).dampak).toBe('membebaskan');
    expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('tidak_wajib_spp_irt');
  });

  it('bukan pangan siap saji: pengecualian tidak berlaku', () => {
    expect(ruleOf('I-02', makeLabel(), makeAnswers({ panganSiapSaji: false })).dampak).toBe(
      'tidak_berlaku',
    );
  });

  it('belum dijawab: ditandai perlu dicek, tidak menghalangi hasil', () => {
    const answers = makeAnswers();
    expect(ruleOf('I-02', makeLabel(), answers).dampak).toBe('perlu_dicek');
    expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('bisa_spp_irt');
  });

  it('siap saji membebaskan walau umur simpan belum diisi', () => {
    const answers = makeAnswers({ panganSiapSaji: true, umurSimpanHari: null });
    expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('tidak_wajib_spp_irt');
  });
});

describe('I-03 tempat produksi (Pasal 5)', () => {
  it('produksi di rumah memenuhi syarat', () => {
    expect(ruleOf('I-03', makeLabel(), makeAnswers({ produksiDiRumah: true })).dampak).toBe(
      'memenuhi',
    );
  });

  it('produksi di luar rumah tinggal tidak bisa lewat SPP-IRT', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers({ produksiDiRumah: false }));
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
    expect(result.rujukan).toContainEqual({
      peraturan: 'Peraturan BPOM Nomor 4 Tahun 2024',
      pasal: 'Pasal 5',
    });
  });

  it('belum dijawab: masuk daftar perlu dicek', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers());
    expect(ruleOf('I-03', makeLabel(), makeAnswers()).dampak).toBe('perlu_dicek');
    expect(result.perluDicek.some((item) => item.includes('rumah tinggal'))).toBe(true);
  });
});

describe('I-04 alat produksi (Pasal 5)', () => {
  it('manual dan semi otomatis memenuhi syarat', () => {
    for (const alat of ['manual', 'semi_otomatis'] as const) {
      const answers = makeAnswers({ alatProduksi: alat });
      expect(ruleOf('I-04', makeLabel(), answers).dampak).toBe('memenuhi');
      expect(evaluatePermitPath(makeLabel(), answers).hasil).toBe('bisa_spp_irt');
    }
  });

  it('otomatis tidak bisa lewat SPP-IRT', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers({ alatProduksi: 'otomatis' }));
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
    expect(result.alasan.join(' ')).toMatch(/otomatis/);
  });

  it('alat belum diisi: belum bisa ditentukan', () => {
    for (const alat of [null, undefined]) {
      const result = evaluatePermitPath(makeLabel(), makeAnswers({ alatProduksi: alat }));
      expect(result.hasil).toBe('belum_bisa_ditentukan');
      expect(result.alasan.join(' ')).toMatch(/alat produksi/i);
    }
  });

  it('penghalang yang sudah pasti didahulukan dari alat yang belum diisi', () => {
    const result = evaluatePermitPath(
      makeLabel(),
      makeAnswers({ alatProduksi: null, wajibSni: true }),
    );
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
  });
});

describe('I-05 klaim pada label (Pasal 10)', () => {
  it('klaim gizi pada pernyataan lain menghalangi SPP-IRT', () => {
    const label = makeLabel({ pernyataanLain: ['Tinggi protein', 'Renyah'] });
    const result = evaluatePermitPath(label, makeAnswers());
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
    expect(result.klaimTerdeteksi).toEqual(['Tinggi protein']);
    expect(ruleOf('I-05', label, makeAnswers()).rujukan.pasal).toBe('Pasal 10');
  });

  it('klaim kesehatan pada nama produk ikut terdeteksi', () => {
    const label = makeLabel({ namaProduk: 'Jamu Kunyit Menyehatkan' });
    expect(evaluatePermitPath(label, makeAnswers()).hasil).toBe('tidak_bisa_spp_irt');
  });

  it('keterangan "tanpa pengawet" bukan klaim gizi atau kesehatan', () => {
    const label = makeLabel({ pernyataanLain: ['Tanpa pengawet', 'Tanpa pewarna'] });
    expect(detectLabelClaims(label)).toEqual([]);
    expect(evaluatePermitPath(label, makeAnswers()).hasil).toBe('bisa_spp_irt');
  });

  it('mendeteksi klaim rendah gula, bebas gluten, dan istilah bahasa Inggris', () => {
    expect(
      detectLabelClaims(
        makeLabel({ pernyataanLain: ['Rendah gula', 'Bebas gluten', 'High protein'] }),
      ),
    ).toEqual(['Rendah gula', 'Bebas gluten', 'High protein']);
  });

  it('klaim yang sama tidak dicatat dua kali', () => {
    expect(
      detectLabelClaims(
        makeLabel({ namaProduk: 'Kue Tinggi Protein', pernyataanLain: ['tinggi protein'] }),
      ),
    ).toEqual(['Tinggi Protein']);
  });

  it('label tanpa klaim memenuhi I-05', () => {
    expect(ruleOf('I-05', makeLabel(), makeAnswers()).dampak).toBe('memenuhi');
  });
});

describe('I-06 penanganan khusus (Pasal 10)', () => {
  it('butuh penanganan khusus tidak bisa lewat SPP-IRT', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers({ butuhPenangananKhusus: true }));
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
  });

  it('tidak butuh penanganan khusus memenuhi syarat', () => {
    expect(
      ruleOf('I-06', makeLabel(), makeAnswers({ butuhPenangananKhusus: false })).dampak,
    ).toBe('memenuhi');
  });

  it('belum dijawab ditandai perlu dicek', () => {
    expect(ruleOf('I-06', makeLabel(), makeAnswers()).dampak).toBe('perlu_dicek');
  });
});

describe('I-07 pangan wajib SNI (Pasal 10)', () => {
  it('wajib SNI tidak bisa lewat SPP-IRT', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers({ wajibSni: true }));
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
    expect(result.perluDicek.join(' ')).toMatch(/Dinas Kesehatan/);
  });

  it('tidak wajib SNI memenuhi syarat', () => {
    expect(ruleOf('I-07', makeLabel(), makeAnswers({ wajibSni: false })).dampak).toBe('memenuhi');
  });

  it('belum dijawab ditandai perlu dicek', () => {
    expect(ruleOf('I-07', makeLabel(), makeAnswers()).dampak).toBe('perlu_dicek');
  });
});

describe('I-08 jenis pangan Lampiran I (Pasal 5 dan 9)', () => {
  it('selalu perlu dicek ke Dinas Kesehatan karena Lampiran I belum terbaca', () => {
    const rule = ruleOf('I-08', makeLabel(), makeAnswers());
    expect(rule.dampak).toBe('perlu_dicek');
    expect(rule.penjelasan).toMatch(/perlu dicek ke Dinas Kesehatan/);
  });

  it('hasil "bisa lewat SPP-IRT" selalu menyertakan catatan jenis pangan', () => {
    const result = evaluatePermitPath(
      makeLabel(),
      makeAnswers({
        produksiDiRumah: true,
        butuhPenangananKhusus: false,
        wajibSni: false,
        panganSiapSaji: false,
      }),
    );
    expect(result.hasil).toBe('bisa_spp_irt');
    expect(result.alasan).toHaveLength(1);
    expect(result.perluDicek).toHaveLength(1);
    expect(result.perluDicek[0]).toMatch(/Lampiran I/);
    expect(result.rujukan).toContainEqual({
      peraturan: 'Peraturan BPOM Nomor 4 Tahun 2024',
      pasal: 'Pasal 5 dan Pasal 9',
    });
  });
});

describe('kombinasi dan urutan penentuan', () => {
  it('syarat yang belum dipastikan disebut dalam alasan hasil "bisa lewat SPP-IRT"', () => {
    const result = evaluatePermitPath(makeLabel(), makeAnswers());
    expect(result.hasil).toBe('bisa_spp_irt');
    expect(result.judul).toMatch(/^Kemungkinan bisa/);
    expect(result.alasan[1]).toMatch(/4 syarat yang belum dipastikan/);
    expect(result.perluDicek).toHaveLength(5);
  });

  it('umur simpan kosong didahulukan walau ada penghalang, karena produk mungkin dikecualikan', () => {
    const result = evaluatePermitPath(
      makeLabel({ pernyataanLain: ['Rendah lemak'] }),
      makeAnswers({ umurSimpanHari: null }),
    );
    expect(result.hasil).toBe('belum_bisa_ditentukan');
    expect(result.alasan[0]).toMatch(/umur simpan/i);
    expect(result.alasan.join(' ')).toMatch(/Rendah lemak/);
  });

  it('beberapa penghalang sekaligus dicantumkan semua sebagai alasan', () => {
    const result = evaluatePermitPath(
      makeLabel({ pernyataanLain: ['Menyehatkan'] }),
      makeAnswers({ alatProduksi: 'otomatis', wajibSni: true }),
    );
    expect(result.hasil).toBe('tidak_bisa_spp_irt');
    expect(result.alasan).toHaveLength(3);
    expect(result.rujukan.map((ref) => ref.pasal)).toEqual(['Pasal 5', 'Pasal 10']);
  });

  it('jawaban kosong total: belum bisa ditentukan', () => {
    const result = evaluatePermitPath(makeLabel(), createEmptyAnswers());
    expect(result.hasil).toBe('belum_bisa_ditentukan');
    expect(result.judul).toBe('Jalur izin belum bisa ditentukan');
  });

  it('tidak mengubah objek masukan', () => {
    const label = makeLabel({ pernyataanLain: ['Tinggi serat'] });
    const answers = makeAnswers();
    const snapshot = JSON.stringify({ label, answers });
    evaluatePermitPath(label, answers);
    expect(JSON.stringify({ label, answers })).toBe(snapshot);
  });
});
