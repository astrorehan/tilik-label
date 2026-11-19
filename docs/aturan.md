# Aturan yang diperiksa

Setiap aturan di bawah ditulis sebagai fungsi murni di `src/domain/`, tanpa jaringan dan tanpa model. Model bahasa tidak ikut menentukan status apa pun. Teks resmi terakhir dibaca pada 12 November 2026.

Tiap butir menghasilkan satu dari tiga status (`RuleStatus` di `src/domain/types.ts`):

| Status | Arti | Tampil di aplikasi sebagai |
|---|---|---|
| `lengkap` | Sudah sesuai aturan | Sudah sesuai |
| `kurang` | Ada yang kurang atau keliru | Dibetulkan Tilik, atau Butuh keputusanmu |
| `tidak_bisa_dicek` | Tidak bisa dipastikan dari tulisan saja | Perlu dicek |

Penjelasan cara cek yang tampil di halaman `/aturan` diambil dari `src/domain/ruleCatalog.ts`, jadi halaman itu dan kode selalu sama.

## Label: Peraturan BPOM 31/2018

Kode: `checkL01` sampai `checkL20` di [`src/domain/labelRules.ts`](../src/domain/labelRules.ts), dipanggil lewat `evaluateLabelRules`. Tes: [`labelRules.test.ts`](../src/domain/__tests__/labelRules.test.ts) dan [`labelRules.edge.test.ts`](../src/domain/__tests__/labelRules.edge.test.ts).

| ID | Aturan | Pasal | Sumber data |
|:--|:--|:--|:--|
| L-01 | Nama jenis pangan tercantum | 5, 10 | Label |
| L-02 | Daftar bahan tercantum dan diawali "Komposisi", "Daftar bahan", "Bahan yang digunakan", atau "Bahan-bahan" | 5, 14 | Label |
| L-03 | Bahan diurutkan dari yang terbanyak | 14 | Label dan takaran resep |
| L-04 | Nama bahan ditulis lengkap, bukan singkatan | 14 | Label |
| L-05 | Berat atau isi bersih memakai satuan metrik (g, kg, ml, L) | 5, 26 | Label |
| L-06 | Nama dan alamat produsen, alamat memuat kota, kode pos, dan Indonesia | 5, 28, 29 | Label |
| L-07 | Keterangan halal hanya bila sudah bersertifikat | 5, 32 | Label dan jawaban |
| L-08 | Tanggal dan kode produksi tercantum | 5, 33 | Label |
| L-09 | Kedaluwarsa diawali "Baik digunakan sebelum" | 5, 34 | Label |
| L-10 | Umur simpan sampai 3 bulan: tanggal, bulan, dan tahun | 34 | Label dan jawaban |
| L-11 | Produk rumah tangga menulis "P-IRT" | 36 | Label |
| L-12 | Bahan alergen disertai kalimat "Mengandung alergen, lihat daftar bahan yang dicetak tebal" | 49, 51 | Label dan daftar alergen |
| L-13 | Bahan alergen dicetak tebal | 51 | Label, bila gaya huruf terlihat jelas |
| L-14 | Huruf minimal 1 mm, nama produk dan peringatan minimal 2 mm | 9 | Tidak bisa dari foto; dijamin di label cetak Tilik |
| L-15 | Tidak menyatakan menyehatkan, berkhasiat obat, atau mencerdaskan | 67 | Label |
| L-16 | "Tanpa pengawet" dan sejenisnya hanya bila benar | 24 | Label dan resep |
| L-17 | Tidak ada pernyataan umum "bebas bahan tambahan pangan" | 67 huruf z | Label |
| L-18 | "Alami", "murni", "100%", "asli", "segar" sesuai syarat | 63 | Label dan resep; syarat lengkapnya dipastikan pengguna |
| L-19 | Cara penyimpanan bila umur simpan bergantung padanya | 48 | Label dan jawaban |
| L-20 | Keterangan wajib dalam bahasa Indonesia | 7 | Label |

Daftar alergen (Pasal 49) ada di [`src/domain/allergens.ts`](../src/domain/allergens.ts): serealia mengandung gluten, telur, ikan, krustase, moluska, kacang tanah, kedelai, susu, kacang pohon, dan sulfit.

## Jalur izin: Peraturan BPOM 4/2024

Kode: [`src/domain/permitRules.ts`](../src/domain/permitRules.ts) (`evaluatePermitPath`). Tes: [`permitRules.test.ts`](../src/domain/__tests__/permitRules.test.ts).

| ID | Aturan | Pasal |
|:--|:--|:--|
| I-01 | Tidak wajib SPP-IRT bila umur simpan kurang dari 7 hari | 3 |
| I-02 | Tidak wajib SPP-IRT bila pangan siap saji | 3 |
| I-03 | Tempat produksi di rumah tinggal atau rumah toko yang ditinggali | 5 |
| I-04 | Alat produksi manual sampai semi otomatis | 5 |
| I-05 | Tidak bisa lewat SPP-IRT bila label memuat klaim | 10 |
| I-06 | Tidak bisa lewat SPP-IRT bila butuh penanganan khusus | 10 |
| I-07 | Tidak bisa lewat SPP-IRT bila wajib SNI | 10 |
| I-08 | Jenis pangan termasuk Lampiran I | 5, 9 |

`I-08` belum diperiksa karena Lampiran I belum terbaca langsung; hasilnya selalu "perlu dicek ke Dinas Kesehatan".

## Nilai gizi: Peraturan BPOM 10/2026

Kode: [`src/domain/nutritionGuide.ts`](../src/domain/nutritionGuide.ts), tampil di `/nilai-gizi`. Bagian ini berupa panduan, bukan pemeriksaan, dan sengaja tidak menampilkan angka gizi.

| ID | Isi | Pasal |
|:--|:--|:--|
| G-01 | Tabel nilai gizi wajib | 2 |
| G-02 | Pengecualian (kopi, teh kering, air minum dalam kemasan, rempah, dan lainnya) | 3 |
| G-03 | Usaha mikro boleh memakai uji lab atau nilai yang ditetapkan Kepala BPOM | 7 ayat 1 |
| G-04 | Bila keduanya tidak ada, dihitung dari bahan dengan tata cara Kepala BPOM | 7 ayat 2–3 |
| G-05 | Per satu takaran saji | 8 |
| G-06 | Produk berizin menyesuaikan paling lambat 24 bulan | 31 |

## Yang tidak diperiksa

Desain visual, warna, dan merek; aturan khusus minuman (Nutri-Level), pangan bayi, dan pangan keperluan khusus; aturan khusus klaim di luar Peraturan BPOM 31/2018; serta Peraturan BPOM 20/2021 (perubahan pertama aturan label), yang belum terbaca langsung.

## Teks resmi

- [Peraturan BPOM 31/2018 tentang Label Pangan Olahan](https://peraturan.go.id/files/bn1452-2018.pdf)
- [Peraturan BPOM 4/2024 tentang Pedoman Penerbitan SPP-IRT](https://peraturan.go.id/files/peraturan-bpom-no-4-tahun-2024.pdf)
- [Peraturan BPOM 10/2026 tentang Informasi Nilai Gizi pada Label Pangan Olahan](https://peraturan.go.id/files/peraturan-bpom-no-10-tahun-2026.pdf)
