# Tilik Label: panduan untuk juri

Dibaca dalam tiga menit. Mencobanya tidak butuh akun, tidak butuh memasang apa pun, dan tidak butuh kemasan sungguhan.

- **Situs:** _[diisi setelah rilis]_
- **Mode juri:** _[situs]/juri_
- **Video demo:** _[diisi setelah unggah]_
- **README lengkap:** [README.md](README.md)
- **Cabang:** Web Development, subtema Ekonomi dan Pemberdayaan Masyarakat

> Tilik Label adalah pemeriksaan awal, bukan pengesahan. Semua kemasan, merek, alamat, dan nomor izin pada contoh adalah rekaan.

## Tilik Label dalam satu menit

Pembuat makanan rumahan harus mencantumkan belasan keterangan di label dengan cara penulisan tertentu, dan label itu diperiksa Dinas Kesehatan saat mengurus izin SPP-IRT. Kesalahan biasanya baru ketahuan setelah stiker dicetak.

Tilik Label membaca foto stiker kemasan, lalu memeriksanya:

1. **AI hanya membaca.** Model menyalin tulisan di foto ke kolom isian. Pengguna mencocokkan isiannya dulu.
2. **Aturan yang memutuskan.** 20 aturan label (Peraturan BPOM 31/2018) dan 8 aturan jalur izin (Peraturan BPOM 4/2024) ditulis sebagai fungsi kode yang diuji. Hasilnya sama setiap kali.
3. **Setiap temuan menunjuk pasal.** Misalnya `L-09 · Peraturan BPOM 31/2018, Pasal 34`.
4. **Hasilnya label perbaikan.** Yang bisa dibetulkan langsung dibetulkan, sisanya ditanyakan ke pemilik, lalu label dicetak dengan ukuran huruf sesuai aturan.

## Yang bisa dicoba (lima menit)

Buka **[situs]/juri**, lalu pilih salah satu kemasan contoh.

| Langkah | Yang dilakukan | Yang seharusnya terlihat |
|---|---|---|
| 1 | Pilih **Sambal bawang** | Foto kemasan masuk dan dinilai "cukup jelas" |
| 2 | Klik **Baca label dengan Tilik** | Dalam beberapa detik, sekitar sepuluh kolom terisi dari foto. Bila layanan model sedang tidak tersedia, pakai **Isi cepat dari data contoh** |
| 3 | Klik **Lanjut ke data produk**, lalu **Isi semua jawaban** | Lima jawaban (umur simpan, cara simpan, halal, alat, resep) terisi |
| 4 | Klik **Lihat hasil pemeriksaan** | Cincin skor dari 20 aturan, jumlah yang sudah dibetulkan Tilik, dan daftar yang butuh keputusan pemilik |
| 5 | Lihat kartu **Benahi satu per satu** | Tiap temuan punya kode aturan, pasal, penjelasan, dan contoh penulisan |
| 6 | Klik **Tanya Tilik** → **Mulai dari mana?** | Jawaban dalam bahasa sehari-hari yang hanya menyebut pasal dari bahan acuan |

Yang paling menarik di contoh sambal: label menulis **"Tanpa pengawet"** padahal komposisinya memuat **natrium benzoat**, dan menulis **"Halal"** padahal pemiliknya belum bersertifikat. Keduanya tertangkap karena aturan mencocokkan label dengan resep dan jawaban, bukan hanya mencari kata yang hilang.

Dua contoh lain menguji hal berbeda:

| Contoh | Sekilas | Yang tertangkap |
|---|---|---|
| **Kue kering kacang** | Tampak lengkap | Urutan bahan tidak cocok dengan takaran resep (gula ditulis sebelum tepung), kalimat alergen tidak memakai bunyi resmi, kata "Murni" untuk kue campuran |
| **Kerupuk ikan** | Rapi | Klaim "menyehatkan" dan "tinggi protein", cara simpan belum ditulis, dan klaim membuat produk tidak bisa lewat jalur SPP-IRT |

Lalu:

1. **Ubah satu isian** di hasil, misalnya hapus "Tanpa pengawet". Cincin skor dan label perbaikan langsung ikut berubah.
2. **Buka halaman Aturan label** (`/aturan`). Daftar aturan yang benar-benar diperiksa, pasalnya, dan hal yang tidak diperiksa.
3. **Coba foto sendiri.** Di langkah pertama, pilih **Ambil foto langsung** atau **Unggah gambar**. Kemasan apa pun yang punya daftar bahan bisa dipakai.
4. **Lihat hasil tanpa mengisi apa pun** di `/contoh`: hasil pemeriksaan ketiga contoh langsung tampil.

## Bukti di repositori

| Yang ingin dicek | Di mana |
|---|---|
| 20 aturan label, ditulis sebagai fungsi murni | [`src/domain/labelRules.ts`](src/domain/labelRules.ts) |
| 8 aturan jalur izin | [`src/domain/permitRules.ts`](src/domain/permitRules.ts) |
| Tes tiap aturan (715 tes lulus, `npm test`) | [`src/domain/__tests__/`](src/domain/__tests__) |
| Tiga contoh dan kesalahan yang disengaja | [`src/domain/sampleLabels.ts`](src/domain/sampleLabels.ts) |
| Pagar asisten: konteks terkunci, pasal di luar acuan ditolak | [`src/domain/assistant.ts`](src/domain/assistant.ts), [`src/lib/server/assistant.ts`](src/lib/server/assistant.ts) |
| Batas pemanggilan model per pengunjung | [`src/lib/server/rateLimit.ts`](src/lib/server/rateLimit.ts) |
| Daftar aturan beserta pasal dan cara ceknya | [docs/aturan.md](docs/aturan.md) |
| Masalah, pengguna, dan keputusan rancangan | [docs/PRD.md](docs/PRD.md) |

## Batasan yang kami akui

- Ukuran huruf pada kemasan asli tidak bisa diukur dari foto. Tilik menjaminnya hanya di label cetak buatannya sendiri.
- Tabel nilai gizi hanya berupa panduan tiga jalan resmi, tanpa angka, karena tata cara hitung resminya belum terbaca langsung.
- Jenis pangan yang diizinkan untuk SPP-IRT (Lampiran I Peraturan BPOM 4/2024) belum diperiksa; hasilnya ditulis "perlu dicek ke Dinas Kesehatan".
- "Produk saya" tersimpan di peramban, jadi hilang bila data peramban dihapus.

## Menjalankan di komputer sendiri

```sh
git clone https://github.com/astrorehan/tilik-label.git
cd tilik-label
npm ci
npm test        # 715 tes
npm run dev     # http://localhost:3000/juri
```

Tanpa kunci API pun mode juri, isian manual, dan seluruh pemeriksaan tetap jalan. Kunci hanya dibutuhkan untuk pembaca foto dan Tanya Tilik; caranya ada di [README: Jalankan di komputer sendiri](README.md#jalankan-di-komputer-sendiri).
