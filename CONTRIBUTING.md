# Panduan Kontribusi — Tilik Label

Dokumen ini menjadi acuan kerja tim selama pengembangan **Tilik Label**.

## 1. Alur Kerja Git

1. Pastikan cabang `main` selalu dalam keadaan stabil dan dapat di-build.
2. Jangan bekerja atau melakukan commit fitur baru langsung di `main`. Buat branch baru dari `main` terbaru:
   - `feat/<nama-fitur>` untuk fitur baru (contoh: `feat/domain-rules`, `feat/pembaca-foto`, `feat/cetak-ringkasan`)
   - `fix/<perbaikan>` untuk perbaikan bug (contoh: `fix/kompresi-gambar`)
   - `test/<cakupan>` untuk penambahan atau pembaruan pengujian
   - `chore/<tugas>` untuk konfigurasi proyek, CI, atau pembaruan dependensi
   - `docs/<bagian>` untuk pembaruan dokumentasi
3. Buat Pull Request ke `main` setelah pekerjaan selesai, lalu lakukan review minimal oleh satu rekan tim sebelum merge.

## 2. Aturan Pesan Commit

Tulis pesan commit yang singkat, jelas, dan menjelaskan *apa* perubahan yang dilakukan:

- `feat: tambah pemeriksa aturan L-01 sampai L-10`
- `fix: perbaiki format berat bersih pada satuan ml`
- `test: tambah unit test jalur izin P-IRT`
- `chore: pasang konfigurasi vitest dan eslint`
- `docs: perbarui daftar anggota tim di README`

## 3. Batas Modul & Pembagian Kode

Agar pengembangan paralel tidak saling menimpa file:

- `src/domain/`: fungsi deterministik murni untuk aturan label (`L-*`), jalur izin (`I-*`), dan informasi gizi (`G-*`), beserta tipe data dan unit test Vitest. Modul ini tidak boleh memanggil jaringan, API eksternal, atau mengakses DOM browser.
- `src/app/api/`: route handler sisi server (pembaca foto kemasan dan pembatasan pemanggilan). Seluruh kunci API hanya boleh dibaca dari environment variable di server.
- `src/app/` & `src/components/`: antarmuka pengguna, formulir koreksi, penyimpanan lokal di peramban, dan tampilan cetak PDF.

Jika perlu mengubah kontrak tipe data di `src/domain/types.ts`, koordinasikan dulu dengan rekan tim sebelum melakukan perubahan.

## 4. Keamanan & Rahasia

- Jangan pernah menyimpan API key, token, atau kredensial langsung di dalam kode sumber.
- Gunakan `.env.local` untuk konfigurasi lokal dan pastikan file `.env*` tidak pernah di-commit.

## 5. Pemeriksaan Sebelum Pull Request

Pastikan seluruh pemeriksaan berikut lulus di lokal sebelum mengajukan PR:

- Pemeriksaan linter (`npm run lint`)
- Pemeriksaan tipe TypeScript (`npx tsc --noEmit`)
- Seluruh unit test (`npm test`)
- Build produksi (`npm run build`) jika menyentuh routing atau konfigurasi Next.js
