# Tilik Label

Pemeriksa label kemasan untuk pembuat makanan rumahan. *Cek dulu, baru cetak.*

Pengguna memotret kemasan produknya. Tilik Label lalu menunjukkan apa yang kurang menurut aturan BPOM, jalur izin yang tepat, dan label perbaikan yang siap dicetak. Tujuannya satu: kesalahan label ketahuan sebelum uang keluar untuk mencetak.

Karya ini disiapkan untuk IT RUSH 2026, cabang Web Development, subtema Ekonomi dan Pemberdayaan Masyarakat.

## Status

Kerangka aplikasi awal, pemeriksa aturan label (`L-01` sampai `L-20`) dengan unit test, serta halaman depan, contoh, dan periksa manual sudah tersedia.

| Bagian | Keadaan |
| :-- | :-- |
| Dokumen kebutuhan produk | Ada, lihat [docs/PRD.md](docs/PRD.md) |
| Pemeriksa aturan label (`L-01`–`L-20`) | Tersedia dengan unit test di `src/domain` |
| Halaman depan, contoh, & periksa manual | Tersedia (`/`, `/contoh`, `/periksa`) |
| Pembaca foto label & jalur izin | Belum dibuat |
| Situs publik | Belum ada |

## Masalah yang dijawab

Pembuat keripik, sambal, kue kering, dan olahan rumahan lain pandai memasak, tetapi tidak hafal aturan label pangan. Label diperiksa Dinas Kesehatan saat mengurus izin produksi rumah tangga, dan permohonan ditangguhkan bila data label tidak lengkap. Sejak Juni 2026, tabel nilai gizi juga wajib dicantumkan, termasuk untuk produk rumah tangga, dengan waktu penyesuaian 24 bulan.

Rincian masalah beserta sumbernya ada di PRD bagian 2.

## Cara kerja

1. Pengguna memotret kemasan, mengunggah desain, atau memilih "belum punya label".
2. Aplikasi menampilkan isi label yang terbaca sebagai isian yang bisa dibetulkan.
3. Pengguna menjawab beberapa pertanyaan tentang hal yang tidak terlihat di foto, misalnya resep dan umur simpan.
4. Aplikasi menunjukkan jalur izin yang sesuai beserta alasannya.
5. Aplikasi menampilkan daftar periksa label. Tiap butir berstatus lengkap, kurang, atau tidak bisa dicek dari foto, dan menunjuk pasal aturannya.
6. Aplikasi membantu menyiapkan tabel nilai gizi.
7. Pengguna mengunduh label perbaikan dan lembar ringkasan.

Aplikasi dipakai tanpa login. Data disimpan di perangkat pengguna.

## Prinsip

- **AI membaca, aturan yang memutuskan.** Model hanya mengambil isi label dari foto. Lolos atau tidaknya ditentukan pemeriksa aturan yang tetap dan bisa diuji.
- **Setiap temuan menunjuk pasalnya.** Pengguna bisa memeriksa sendiri dasar tiap temuan.
- **Pemeriksaan awal, bukan pengesahan.** Yang memutuskan tetap Dinas Kesehatan atau BPOM.
- **Yang tidak bisa dicek dikatakan tidak bisa dicek.** Contohnya ukuran huruf pada kemasan.

## Aturan yang dirujuk

| Aturan | Isi | Teks |
| :-- | :-- | :-- |
| Peraturan BPOM 31/2018 | Label Pangan Olahan | [peraturan.go.id](https://peraturan.go.id/files/bn1452-2018.pdf) |
| Peraturan BPOM 10/2026 | Informasi Nilai Gizi pada Label Pangan Olahan | [peraturan.go.id](https://peraturan.go.id/files/peraturan-bpom-no-10-tahun-2026.pdf) |
| Peraturan BPOM 4/2024 | Pedoman penerbitan izin produksi pangan industri rumah tangga (SPP-IRT) | [peraturan.go.id](https://peraturan.go.id/files/peraturan-bpom-no-4-tahun-2024.pdf) |

Aturan bisa berubah. Tanggal terakhir aturan dibaca dicatat di PRD.

## Rencana teknologi

Next.js dengan TypeScript, Tailwind CSS, dan Vitest. Pembacaan foto memakai model bahasa yang bisa membaca gambar lewat API. Tidak ada basis data dan tidak ada akun pengguna. Rinciannya di PRD bagian 8.

## Yang tidak dikerjakan

Login dan akun, pendaftaran izin secara daring, pembayaran, toko daring, uji laboratorium, dan jaminan lolos izin.

## Penggunaan template dan aset

- Komponen antarmuka (`src/components/ui`, ikon, dan token warna) diadaptasi dari proyek tim sebelumnya.
- Font [Atkinson Hyperlegible Next](https://github.com/googlefonts/atkinson-hyperlegible-next), Atkinson Hyperlegible Mono, dan [Mona Sans](https://github.com/github/mona-sans) dengan lisensi SIL Open Font License. Teks lisensinya ada di `src/app/fonts/`.

## Dokumen

- [docs/PRD.md](docs/PRD.md): kebutuhan produk, fitur, aturan yang diperiksa, batasan, dan rencana kerja.

## Tim

- Muhammad Raihan Surya
- Muhammad Choiruddin Ammar
- Ahmad Rafi Firdaus
