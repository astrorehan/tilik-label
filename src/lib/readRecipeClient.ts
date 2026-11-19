import type { ExtractedRecipeItem } from '@/domain/recipeExtraction';

export type ReadRecipeResponse =
  | {
      ok: true;
      bahan: ExtractedRecipeItem[];
      perluLengkapi: number;
      penyedia: string;
      durasiMs: number;
    }
  | { ok: false; pesan: string };

/** Mengirim foto buku/catatan resep yang sudah dikecilkan ke route pembaca resep di server. */
export async function requestRecipeRead(
  dataUrl: string,
  signal?: AbortSignal,
): Promise<ReadRecipeResponse> {
  let response: Response;
  try {
    response = await fetch('/api/baca-resep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gambar: dataUrl }),
      signal,
    });
  } catch {
    return {
      ok: false,
      pesan: 'Tidak bisa terhubung ke server. Periksa koneksi internet, atau tulis bahannya sendiri.',
    };
  }
  const data = (await response.json().catch(() => null)) as
    | (Partial<Extract<ReadRecipeResponse, { ok: true }>> & { ok?: boolean; pesan?: string })
    | null;
  if (data?.ok && Array.isArray(data.bahan)) {
    return {
      ok: true,
      bahan: data.bahan,
      perluLengkapi: Number(data.perluLengkapi ?? 0),
      penyedia: String(data.penyedia ?? ''),
      durasiMs: Number(data.durasiMs ?? 0),
    };
  }
  return {
    ok: false,
    pesan:
      typeof data?.pesan === 'string' && data.pesan
        ? data.pesan
        : 'Pembaca foto resep sedang tidak bisa dipakai. Kamu tetap bisa menulis bahannya sendiri.',
  };
}
