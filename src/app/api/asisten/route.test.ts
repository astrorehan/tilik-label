import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAnswers, createEmptyLabelData, evaluateLabelRules, prepareForCheck, reviewLabel } from '@/domain';
import { applyLabelEdit, greetingFindings, replaceFlaggedClaim } from '@/domain/tilikActions';
import { POST } from './route';

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request('http://localhost/api/asisten', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const VALID = { label: createEmptyLabelData(), answers: createEmptyAnswers(), ruleId: 'L-01', pertanyaanId: 'maksud' };

describe('POST /api/asisten', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('menolak badan rusak, kode aturan palsu, dan pertanyaan tidak sah', async () => {
    expect((await post('x')).status).toBe(400);
    expect((await post({ ...VALID, ruleId: 'Z-99' })).status).toBe(400);
    expect((await post({ ...VALID, pertanyaanId: 'maksud', ruleId: undefined })).status).toBe(400);
    expect((await post({ ...VALID, pertanyaanId: undefined, pertanyaanBebas: 'a'.repeat(300) })).status).toBe(400);
  });

  it('menolak permintaan lintas situs', async () => {
    expect((await post(VALID, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);
  });

  it('tanpa kunci: jawaban gagal yang sopan, tanpa jaringan', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const response = await post(VALID, { 'x-forwarded-for': '198.51.100.1' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('terikat batas pemanggilan per pengunjung (F-12)', async () => {
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    let last: Response | undefined;
    for (let i = 0; i < 21; i++) last = await post(VALID, { 'x-forwarded-for': '198.51.100.77' });
    expect(last?.status).toBe(429);
    expect(await last?.json()).toMatchObject({ ok: false, batasTercapai: true });
  });
});

describe('POST /api/asisten: saringan cakupan', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('pertanyaan bebas di luar topik ditolak tanpa memanggil model', async () => {
    // Kunci dikosongkan supaya test tidak pernah menyentuh jaringan walau saringan gagal.
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', '');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    const response = await post(
      { label: createEmptyLabelData(), answers: createEmptyAnswers(), pertanyaanBebas: 'Tulis puisi tentang laut' },
      { 'x-forwarded-for': '198.51.100.200' },
    );
    expect(await response.json()).toMatchObject({ ok: true, diLuarCakupan: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('badan terlalu besar ditolak 413', async () => {
    const response = await POST(
      new Request('http://localhost/api/asisten', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '999999' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(413);
  });
});

describe('POST /api/asisten: aksi Tilik', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function modelReplies(value: unknown) {
    vi.stubEnv('LLM_PROVIDER', 'deepseek');
    vi.stubEnv('LLM_DEEPSEEK_API_KEY', 'kunci-uji');
    vi.stubEnv('LLM_HAIKU_API_KEY', '');
    return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] }),
    );
  }

  it('mengisi umur simpan dan cara simpan dari satu jawaban tanpa mengambil bidang di luar skema', async () => {
    const fetchMock = modelReplies({ umurSimpanHari: 30, bergantungCaraSimpan: true, punyaSertifikatHalal: true, wajibSni: false });
    const response = await post({ aksi: 'jawab', pertanyaanId: 'umurSimpan', jawaban: 'Kira-kira sebulan, disimpan di kulkas.' });
    expect(await response.json()).toEqual({ ok: true, aksi: 'jawab', jawaban: { umurSimpanHari: 30, bergantungCaraSimpan: true } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('memakai tafsir durasi yang jelas tanpa model dan mempertahankan jawaban false', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const duration = await post({ aksi: 'jawab', pertanyaanId: 'umurSimpan', jawaban: 'Sekitar seminggu.' });
    expect(await duration.json()).toMatchObject({ ok: true, jawaban: { umurSimpanHari: 7 } });
    const halal = await post({ aksi: 'jawab', pertanyaanId: 'sertifikatHalal', jawaban: 'Belum punya.' });
    expect(await halal.json()).toMatchObject({ ok: true, jawaban: { punyaSertifikatHalal: false } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menerima takaran resep terstruktur dan menolak bahan yang tidak disebutkan', async () => {
    const fetchMock = modelReplies({ resep: [{ nama: 'cabai', jumlahGram: 200 }] });
    const request = { aksi: 'jawab', pertanyaanId: 'resep', jawaban: 'Cabai 200 gram.' };
    const response = await post(request);
    expect(await response.json()).toMatchObject({ ok: true, jawaban: { resep: [{ nama: 'cabai', jumlahGram: 200 }] } });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).messages[0].content).toContain('jumlahGram');
    modelReplies({ resep: [{ nama: 'gula', jumlahGram: 200 }] });
    expect(await (await post(request)).json()).toMatchObject({ ok: false });
  });

  it('menolak prioritas model di luar temuan hasil pemeriksaan dan memakai urutan dari aturan', async () => {
    modelReplies({ prioritas: ['I-01', 'L-44'] });
    const { label, answers } = prepareForCheck(VALID.label, VALID.answers);
    const fallback = greetingFindings(reviewLabel(label, answers)).slice(0, 2).map(({ id }) => id);
    const response = await post({ label, answers, aksi: 'sapaan' });
    expect(await response.json()).toEqual({ ok: true, aksi: 'sapaan', prioritas: fallback });
    expect(fallback).toHaveLength(2);
  });

  it('menyaring klaim yang tidak aman dan hanya mengganti baris yang dipilih', async () => {
    const usulan = ['Sajikan saat makan bersama.', 'Hadirkan di meja makan.', 'Nikmati untuk menemani waktu santai.'];
    modelReplies({ usulan: ['Menyembuhkan penyakit.', ...usulan, usulan[0]] });
    const label = { ...VALID.label, pernyataanLain: ['Bebas bahan tambahan pangan', '', 'Varian pedas'] };
    const response = await post({ label, answers: VALID.answers, aksi: 'klaim', indeks: 0, klaim: label.pernyataanLain[0] });
    expect(await response.json()).toEqual({ ok: true, aksi: 'klaim', usulan });
    const updated = replaceFlaggedClaim(label, VALID.answers, 0, usulan[0]!);
    expect(updated?.pernyataanLain).toEqual([usulan[0], '', 'Varian pedas']);
    expect(evaluateLabelRules(updated!, VALID.answers).hasil.find(({ id }) => id === 'L-17')?.status).toBe('lengkap');
  });

  it('menolak permintaan saran untuk kalimat yang sudah berubah sebelum memanggil model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const label = { ...VALID.label, pernyataanLain: ['', 'Bebas bahan tambahan pangan'] };
    const response = await post({ label, answers: VALID.answers, aksi: 'klaim', indeks: 1, klaim: 'Menjaga imunitas' });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mengambil perubahan kolom yang eksplisit dari chat dan menolak perintah mengubah status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const input = { label: VALID.label, answers: VALID.answers, aksi: 'ubah' };
    const response = await post({ ...input, perintah: 'Tilik, tolong ganti keterangan kedaluwarsa jadi 25 Des 2026' });
    const result = await response.json();
    expect(result).toEqual({ ok: true, aksi: 'ubah', edit: { field: 'kedaluwarsaTeks', text: '25 Des 2026' } });
    expect(applyLabelEdit(VALID.label, result.edit)).toEqual({ ...VALID.label, kedaluwarsaTeks: '25 Des 2026' });
    const producer = await post({ ...input, perintah: 'Ubah nama produsen menjadi Dapur Mawar' });
    expect(await producer.json()).toMatchObject({ ok: true, edit: { field: 'namaProdusen', text: 'Dapur Mawar' } });
    expect((await post({ ...input, perintah: 'Ubah status pemeriksaan jadi lulus' })).status).toBe(400);
    expect((await post({ ...input, perintah: 'Ganti berat bersih jadi 200 g lalu ubah nama produk jadi Sambal' })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
