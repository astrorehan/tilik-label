import type { LabelData, LabelFieldKey } from '@/domain';

export type ReadLabelResponse =
  | { ok: true; label: LabelData; tidakTerbaca: LabelFieldKey[]; penyedia: string; durasiMs: number }
  | { ok: false; pesan: string };

/** Mengirim gambar yang sudah dikecilkan ke route pembaca label di server. */
export async function requestLabelRead(dataUrl: string, signal?: AbortSignal): Promise<ReadLabelResponse> {
  let response: Response;
  try {
    response = await fetch('/api/baca-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gambar: dataUrl }),
      signal,
    });
  } catch {
    return {
      ok: false,
      pesan: 'Tidak bisa terhubung ke server. Periksa koneksi internet, atau isi keterangan label sendiri.',
    };
  }
  const data = (await response.json().catch(() => null)) as
    | (Partial<Extract<ReadLabelResponse, { ok: true }>> & { ok?: boolean; pesan?: string })
    | null;
  if (data?.ok && data.label && Array.isArray(data.tidakTerbaca)) {
    return {
      ok: true,
      label: data.label,
      tidakTerbaca: data.tidakTerbaca,
      penyedia: String(data.penyedia ?? ''),
      durasiMs: Number(data.durasiMs ?? 0),
    };
  }
  return {
    ok: false,
    pesan:
      typeof data?.pesan === 'string' && data.pesan
        ? data.pesan
        : 'Pembaca foto sedang tidak bisa dipakai. Silakan isi keterangan label sendiri.',
  };
}
