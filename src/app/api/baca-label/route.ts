import { NextResponse } from 'next/server';
import {
  parseImageDataUrl,
  readLabelImage,
  type ReaderProviderId,
} from '@/lib/server/labelReader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Batas ukuran badan permintaan (byte). */
const MAX_BODY_BYTES = 6_500_000;

function manual(pesan: string, status: number) {
  return NextResponse.json({ ok: false, pesan, arahan: 'isi_manual' }, { status });
}

/**
 * POST /api/baca-label
 * Badan: { gambar: "data:image/jpeg;base64,..." }
 * Gambar hanya diteruskan ke penyedia model untuk dibaca dan tidak disimpan di server.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY_BYTES) {
    return manual('Gambar terlalu besar. Coba foto ulang atau isi sendiri.', 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return manual('Permintaan tidak sah.', 400);
  }
  const image = parseImageDataUrl(
    typeof body === 'object' && body !== null ? (body as { gambar?: unknown }).gambar : undefined,
  );
  if (!image) {
    return manual('Gambar tidak sah. Pakai foto berformat JPG, PNG, atau WebP.', 400);
  }

  // Skrip pembanding boleh memilih satu penyedia, hanya di luar produksi.
  const requested = request.headers.get('x-tilik-penyedia');
  const onlyProvider: ReaderProviderId | undefined =
    process.env.NODE_ENV !== 'production' && (requested === 'deepseek' || requested === 'haiku')
      ? requested
      : undefined;

  const outcome = await readLabelImage(image, { onlyProvider });
  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, pesan: outcome.pesan, arahan: 'isi_manual', percobaan: outcome.percobaan },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      label: outcome.label,
      tidakTerbaca: outcome.tidakTerbaca,
      penyedia: outcome.penyedia,
      model: outcome.model,
      durasiMs: outcome.durasiMs,
      percobaan: outcome.percobaan,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
