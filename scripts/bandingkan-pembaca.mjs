#!/usr/bin/env node
/**
 * Skrip pembanding pembaca foto (bukan bagian test otomatis).
 * Mengirim gambar label rekaan yang sama ke kedua penyedia lewat route /api/baca-label
 * di server pengembangan, lalu mencatat ketepatan per butir dan waktu baca.
 *
 * Cara pakai:
 *   1. Isi kunci di .env.local, lalu jalankan `npm run dev`.
 *   2. node scripts/bandingkan-pembaca.mjs [--url http://localhost:3000] [--ulang 1]
 *
 * Setiap gambar x penyedia x ulangan = satu panggilan model sungguhan (berbayar).
 * Pemilihan penyedia lewat header `x-tilik-penyedia` hanya berlaku di luar produksi.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.join(here, 'contoh-label');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const baseUrl = option('url', 'http://localhost:3000');
const repeat = Math.max(1, Number(option('ulang', '1')) || 1);
const providers = option('penyedia', 'deepseek,haiku').split(',');

const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/, '')
    .trim();

/** Membandingkan satu butir. Harapan null berarti butir sengaja sulit dibaca: benar bila ditandai tidak terbaca. */
function scoreField(key, expected, label, unreadable) {
  if (expected === null) {
    return unreadable.includes(key) ? 1 : 0;
  }
  if (Array.isArray(expected)) {
    const got = (label[key] ?? []).map(normalize).sort();
    const want = expected.map(normalize).sort();
    return JSON.stringify(got) === JSON.stringify(want) ? 1 : 0;
  }
  const got = normalize(label[key]);
  const want = normalize(expected);
  if (got === want) return 1;
  // Kata pembuka yang ikut terbaca (mis. "Kode produksi: KS-0111") tetap dihitung benar.
  return want && got.endsWith(want) ? 1 : 0;
}

const { gambar } = JSON.parse(await readFile(path.join(folder, 'harapan.json'), 'utf8'));
const rows = [];

for (const [file, expected] of Object.entries(gambar)) {
  const data = await readFile(path.join(folder, file));
  const dataUrl = `data:image/jpeg;base64,${data.toString('base64')}`;
  for (const provider of providers) {
    for (let run = 1; run <= repeat; run++) {
      const started = Date.now();
      const response = await fetch(`${baseUrl}/api/baca-label`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-tilik-penyedia': provider },
        body: JSON.stringify({ gambar: dataUrl }),
      });
      const body = await response.json().catch(() => ({}));
      const elapsed = Date.now() - started;
      if (!body.ok) {
        rows.push({ file, provider, run, ok: false, benar: 0, total: Object.keys(expected).length, ms: elapsed, salah: [body.pesan ?? `HTTP ${response.status}`] });
        continue;
      }
      const salah = [];
      let benar = 0;
      for (const [key, value] of Object.entries(expected)) {
        const score = scoreField(key, value, body.label, body.tidakTerbaca ?? []);
        benar += score;
        if (!score) salah.push(key);
      }
      rows.push({ file, provider, run, ok: true, benar, total: Object.keys(expected).length, ms: body.durasiMs ?? elapsed, salah });
    }
  }
}

console.log('| Gambar | Penyedia | Ulangan | Butir tepat | Waktu baca | Butir meleset |');
console.log('| :-- | :-- | --: | --: | --: | :-- |');
for (const row of rows) {
  console.log(
    `| ${row.file} | ${row.provider} | ${row.run} | ${row.benar}/${row.total} | ${(row.ms / 1000).toFixed(1)} s | ${row.salah.join(', ') || '-'} |`,
  );
}

for (const provider of providers) {
  const mine = rows.filter((row) => row.provider === provider);
  const benar = mine.reduce((sum, row) => sum + row.benar, 0);
  const total = mine.reduce((sum, row) => sum + row.total, 0);
  const avg = mine.reduce((sum, row) => sum + row.ms, 0) / Math.max(1, mine.length);
  console.log(`\n${provider}: ${benar}/${total} butir tepat, rata-rata ${(avg / 1000).toFixed(1)} s per gambar.`);
}
