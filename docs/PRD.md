# PRD: Tilik Label

| | |
| :-- | :-- |
| Versi | 0.2, spesifikasi aktif tim |
| Tanggal | 13 November 2026 |
| Lomba | IT RUSH 2026, Web Development, subtema Ekonomi dan Pemberdayaan Masyarakat |
| Batas kumpul | 20 November 2026, 23.59 WIB |
| Aturan terakhir dibaca | 12 November 2026 |

Cara membaca: **P0** wajib jadi, **P1** pembeda nilai, **P2** kalau sempat. Tanda **[A]** berarti asumsi yang belum diuji. Tanda **[B]** berarti bahan yang belum terbaca langsung dari sumber resminya.

---

## 1. Ringkasan

Tilik Label adalah alat periksa label kemasan untuk pembuat makanan rumahan. Pengguna memotret kemasannya. Aplikasi membaca isi label, memeriksanya terhadap aturan BPOM, lalu menunjukkan tiga hal: jalur izin yang sesuai, butir label yang kurang beserta pasalnya, dan bahan untuk tabel nilai gizi. Keluarannya label perbaikan siap cetak dan satu lembar ringkasan.

Aplikasi dipakai satu orang di satu HP, tanpa login.

**Kalimat jualan:** *"Cek dulu, baru cetak."*

## 2. Masalah

- **M1. Aturan label rinci dan tidak dikenal pembuatnya.** Label wajib memuat sembilan keterangan dengan cara penulisan tertentu (Peraturan BPOM 31/2018 Pasal 5 dan seterusnya). Pembuat makanan rumahan umumnya tidak pernah membaca aturan ini.
- **M2. Label menjadi titik gagal saat mengurus izin.** Rancangan label adalah syarat permohonan izin produksi rumah tangga. Permohonan ditangguhkan bila data label tidak lengkap, dengan waktu paling lama tiga bulan untuk melengkapi (Peraturan BPOM 4/2024 Pasal 9 dan 14). Label juga diperiksa Dinas Kesehatan (Pasal 18).
- **M3. Tabel nilai gizi kini wajib.** Peraturan BPOM 10/2026 mewajibkan semua pelaku usaha mencantumkan tabel nilai gizi (Pasal 2), termasuk produk industri rumah tangga, dengan waktu penyesuaian 24 bulan (Pasal 31).
- **M4. Kesalahan baru ketahuan setelah mencetak.** Label yang salah berarti stiker terbuang dan izin tertunda. [A]

**Bukti lapangan yang sudah dicek**

| Fakta | Sumber |
| :-- | :-- |
| Di Kota Semarang, 16 dari 18 produk industri rumah tangga yang diteliti tidak mencantumkan informasi nilai gizi. Penyebabnya kurang paham aturan dan biaya uji laboratorium. | [Jurnal USM Law Review, 2025](https://journals.usm.ac.id/index.php/julr/article/view/11794) (abstrak) |
| Dari 11.924 perusahaan di sistem registrasi BPOM, 47,67% usaha mikro dan 24,97% usaha kecil. Program pendampingan BPOM tahun 2024 menjangkau 2.318 pelaku usaha. | [Siaran pers BPOM, 24 Feb 2025](https://www.pom.go.id/siaran-pers/bpom-percepat-proses-perizinan-umkm-pangan-olahan-capai-55-9-persen-registrasi-produk-di-bpom) |
| BPOM menyiapkan jenjang izin di antara izin rumah tangga dan izin edar penuh. Disebut pula bahwa produk tanpa izin akan ditarik dari pasar modern. | [Berita BPOM, 30 Apr 2026](https://www.pom.go.id/berita/bpom-siapkan-regulasi-baru-dorong-umkm-naik-kelas-dan-perluas-jangkauan-pasar) |
| Peraturan BPOM 10/2026 diundangkan 17 Juni 2026 dengan masa peralihan 24 bulan. | [Siaran pers BPOM, 30 Jul 2026](https://www.pom.go.id/siaran-pers/nutri-level-hadir-di-indonesia-permudah-konsumen-pilih-pangan-lebih-sehat) |

Catatan: studi Semarang hanya satu kota dengan 18 sampel. Angka itu tidak boleh ditulis sebagai angka nasional.

## 3. Tesis dan prinsip

> **Tesis:** sebagian besar kesalahan label rumahan adalah kelalaian terhadap aturan yang tertulis jelas. Kesalahan seperti itu bisa ditemukan mesin dalam hitungan detik, asal mesinnya memeriksa dengan aturan yang tetap, bukan dengan tebakan.

**Prinsip yang tidak boleh dilanggar**

1. **AI membaca dan menjelaskan, aturan yang memutuskan.** Model hanya mengambil isi label dari foto atau menjelaskan temuan yang sudah ada. Status tiap butir tetap ditentukan fungsi aturan yang bisa diuji.
2. **Pengguna mengesahkan hasil baca.** Isi yang terbaca selalu ditampilkan dulu dan bisa dibetulkan sebelum diperiksa.
3. **Setiap temuan menunjuk pasal.** Tidak ada temuan tanpa dasar aturan.
4. **Tiga status, bukan dua.** Lengkap, kurang, atau tidak bisa dicek dari foto. Aplikasi tidak pernah menebak hal yang tidak terlihat.
5. **Pemeriksaan awal, bukan pengesahan.** Kalimat ini tampil di halaman hasil dan di lembar ringkasan.
6. **Aplikasi tidak mengarang data izin.** Nomor izin, keterangan halal, dan tanggal hanya berasal dari pengguna.

## 4. Pengguna

Semua nama fiktif.

### 4.1 Pembuat makanan rumahan (pengguna utama), "Bu Rina"
Membuat kerupuk ikan di rumah, menjual lewat warung dan pesanan WhatsApp. Memakai HP Android kelas menengah. Labelnya dibuat sendiri di aplikasi desain atau oleh percetakan.
**Kebutuhan:** *"Sebelum saya cetak seribu stiker, saya ingin tahu label saya sudah benar atau belum."*
**Kebutuhan desain:** tanpa login, satu tugas per layar, bahasa sehari-hari, hasil bisa diunduh dan diteruskan lewat WhatsApp.

### 4.2 Pendamping UMKM (pengguna kedua), "Pak Dedi"
Petugas pendamping atau penyuluh yang membantu banyak pembuat makanan mengurus izin.
**Kebutuhan:** *"Saya ingin binaan saya datang dengan label yang sudah rapi, supaya waktu saya tidak habis untuk kesalahan yang sama."*
Versi lomba tidak membuat alur khusus untuk peran ini; ia memakai alur yang sama, dan ditulis sebagai sasaran utama pada bagian target pengguna serta keberlanjutan di proposal.

### 4.3 Juri
Membuka situs di laptop, punya beberapa menit, tidak membawa kemasan.
**Kebutuhan desain:** tiga label contoh yang sengaja salah, hasil muncul tanpa akun dan tanpa memotret.

## 5. Alur utama

| Langkah | Yang dilakukan pengguna | Yang dilakukan aplikasi | Fitur |
| :-- | :-- | :-- | :-- |
| 1 | Memotret kemasan, mengunggah desain, atau memilih "belum punya label" | Menerima gambar dan memeriksa mutunya (buram, gelap, terpotong) | F-02 |
| 2 | Membetulkan isi yang salah terbaca | Menampilkan isi label sebagai isian per butir | F-03 |
| 3 | Menjawab pertanyaan tentang hal yang tidak terlihat di foto | Menanyakan resep, umur simpan, cara simpan, sertifikat halal, alat produksi | F-04 |
| 4 | Membaca jalur izin | Menentukan jalur dari jawaban, dengan alasan dan pasal | F-05 |
| 5 | Membaca daftar periksa | Memeriksa tiap butir label dengan aturan tetap | F-06 |
| 5b *(opsional)* | Menanyakan arti temuan atau contoh perbaikan | Menjelaskan temuan berdasarkan hasil cek dan ringkasan pasal resmi tanpa mengubah status | F-14 |
| 6 | Memilih cara menyiapkan tabel gizi | Menjelaskan tiga jalan resmi dan membantu jalan yang dipilih | F-07 |
| 7 | Mengunduh hasil | Membuat label perbaikan dan lembar ringkasan | F-08 |

## 6. Fitur

**F-01 · Halaman depan · P0**
Menjelaskan masalah, cara kerja dalam tiga langkah, dan dua tombol: "Periksa label saya" dan "Lihat contoh".
- [ ] Dalam satu layar laptop terlihat apa aplikasinya dan cara mencobanya.
- [ ] Setiap angka mencantumkan sumber.

**F-02 · Mulai periksa · P0**
Tiga pintu masuk: kamera, unggah berkas, atau tanpa label. Pemeriksaan mutu gambar dilakukan di perangkat.
- [ ] Bila izin kamera ditolak, pengguna diarahkan ke unggah berkas.
- [ ] Gambar dikecilkan di perangkat sebelum dikirim.
- [ ] Pintu "belum punya label" langsung menuju isian kosong di langkah 2.

**F-03 · Baca label dan pembetulan · P0**
Model membaca gambar dan mengembalikan isi label dalam bentuk terstruktur: nama produk, daftar bahan, berat bersih, nama dan alamat produsen, keterangan halal, kode produksi, kedaluwarsa, nomor izin, pernyataan alergen, dan pernyataan lain di kemasan.
- [ ] Keluaran model divalidasi dengan skema. Keluaran yang tidak sesuai ditolak dan pengguna diarahkan mengisi sendiri.
- [ ] Tiap butir yang tidak terbaca ditandai "tidak terbaca", bukan dikosongkan diam-diam.
- [ ] Pengguna bisa mengubah setiap butir sebelum lanjut.

**F-04 · Pertanyaan tambahan · P0**
Paling banyak lima pertanyaan: bahan dan takaran sekali produksi, umur simpan, cara simpan, kepemilikan sertifikat halal, dan alat produksi (manual, semi otomatis, atau otomatis).
- [ ] Semua pertanyaan bisa dijawab dengan pilihan atau angka, kecuali resep.

**F-05 · Penentu jalur izin · P0**
Menentukan satu dari tiga hasil berdasarkan aturan di bagian 7.2: tidak wajib izin produksi rumah tangga, bisa lewat izin produksi rumah tangga, atau tidak bisa lewat jalur itu.
- [ ] Hasil selalu disertai alasan dan pasal.
- [ ] Bila jenis pangan belum bisa dipastikan boleh lewat jalur rumah tangga, hasil ditulis "perlu dicek ke Dinas Kesehatan". [B]

**F-06 · Pemeriksa label · P0**
Fungsi aturan memeriksa isi label yang sudah disahkan pengguna. Daftar aturan ada di bagian 7.1.
- [ ] Tiap butir berstatus lengkap, kurang, atau tidak bisa dicek dari foto.
- [ ] Butir yang kurang menampilkan pasal, penjelasan singkat, dan contoh penulisan yang benar.
- [ ] Seluruh fungsi aturan punya tes unit.

**F-07 · Bantuan tabel nilai gizi · P1**
Menjelaskan tiga jalan untuk usaha mikro menurut Peraturan BPOM 10/2026 Pasal 7: uji laboratorium, nilai yang ditetapkan Kepala BPOM, atau hitungan dari bahan.
- [ ] Bila daftar nilai resmi sudah diperoleh, aplikasi mencocokkan produk ke daftar itu dan menjelaskan cocok atau tidaknya. [B]
- [ ] Bila tata cara hitung resmi sudah diperoleh, aplikasi menghitung dari resep dan menandai hasilnya "hasil hitung". [B]
- [ ] Bila keduanya belum diperoleh sampai 15 November, fitur ini hanya menampilkan penjelasan tiga jalan dan tidak menampilkan angka.

**F-08 · Label perbaikan dan ringkasan · P0**
Label teks siap cetak yang memuat semua butir wajib dalam urutan yang benar, dan satu lembar ringkasan temuan.
- [ ] Label tidak bisa diunduh selama masih ada butir wajib yang kosong.
- [ ] Ringkasan memuat kalimat "pemeriksaan awal, bukan pengesahan".
- [ ] Keduanya bisa disimpan sebagai PDF lewat cetak peramban.

**F-09 · Contoh untuk juri · P0**
Tiga label rekaan dengan kesalahan yang berbeda. Hasil baca untuk ketiganya disimpan, sehingga tetap tampil walau layanan model tidak tersedia.
- [ ] Dari tiga contoh, minimal satu tampak lengkap di permukaan tetapi gagal di urutan bahan, alergen, dan klaim.
- [ ] Hasil pemeriksaan muncul dalam tiga detik.
- [ ] Label contoh ditandai jelas sebagai rekaan.

**F-10 · Halaman aturan dan batasan · P0**
Daftar aturan yang diperiksa beserta pasalnya, hal yang tidak diperiksa, dan tanggal terakhir aturan dibaca.

**F-11 · Simpan di perangkat ("Produk saya") · P0**
Produk dan hasil pemeriksaan tersimpan di perangkat sebagai daftar "Produk saya" lengkap dengan status tiap label dan bisa dibuka lagi.
- [ ] Ada peringatan bahwa data hilang bila data peramban dihapus.

**F-12 · Pengaman layanan · P0**
Batas jumlah pemanggilan model per pengunjung, batas belanja di akun penyedia, dan pesan yang jelas saat batas tercapai.

**F-13 · Hitung modal per kemasan · P2**
Kalkulator biaya bahan, kemasan, dan tenaga.

**F-14 · Asisten tanya jawab temuan · P1**
Asisten terpagar di halaman hasil (`F-06` dan `F-08`) untuk menjelaskan maksud temuan, istilah hukum, dan contoh penulisan perbaikan dalam bahasa sehari-hari. Bukan chatbot umum bebas.
- [ ] Hanya tampil setelah hasil pemeriksaan tersedia, melalui tombol tanya per temuan atau pertanyaan cepat siap pakai (bukan kotak obrolan terbuka di halaman depan).
- [ ] Server menyertakan hasil pemeriksaan terstruktur dan ringkasan pasal BPOM sebagai konteks terkunci (memanfaatkan prompt caching) serta melarang model mengubah status temuan atau mengarang pasal di luar bahan acuan.
- [ ] Pertanyaan di luar cakupan label pangan olahan atau di luar bahan acuan ditolak dengan sopan dan diarahkan ke Dinas Kesehatan atau teks resmi BPOM.
- [ ] Terikat batas pemanggilan per pengunjung bersama `F-12`.

## 7. Aturan yang diperiksa

Semua pasal di bawah dibaca dari teks resmi pada 12 November 2026.

### 7.1 Label (Peraturan BPOM 31/2018)

| ID | Aturan | Pasal | Cara cek |
| :-- | :-- | :-- | :-- |
| L-01 | Nama jenis pangan tercantum | 5, 10 | Dari label |
| L-02 | Daftar bahan tercantum dan diawali "komposisi", "daftar bahan", "bahan yang digunakan", atau "bahan-bahan" | 5, 14 | Dari label |
| L-03 | Bahan diurutkan dari yang terbanyak | 14 | Dibandingkan dengan resep dari pengguna |
| L-04 | Nama bahan ditulis lengkap, bukan singkatan | 14 | Dari label |
| L-05 | Berat bersih atau isi bersih tercantum dengan satuan metrik (g, kg, ml, L) | 5, 26 | Dari label |
| L-06 | Nama dan alamat produsen tercantum, alamat minimal memuat kota, kode pos, dan Indonesia | 5, 28, 29 | Dari label |
| L-07 | Keterangan halal hanya dicantumkan bila sudah bersertifikat | 5, 32 | Label dan jawaban pengguna |
| L-08 | Tanggal dan kode produksi tercantum | 5, 33 | Dari label |
| L-09 | Kedaluwarsa tercantum, diawali "Baik digunakan sebelum" | 5, 34 | Dari label |
| L-10 | Untuk umur simpan sampai 3 bulan, kedaluwarsa memuat tanggal, bulan, dan tahun | 34 | Label dan jawaban pengguna |
| L-11 | Produk rumah tangga mencantumkan tulisan "P-IRT" | 36 | Dari label |
| L-12 | Bahan alergen ada di daftar bahan dan disertai kalimat "Mengandung alergen, lihat daftar bahan yang dicetak tebal" | 49, 51 | Daftar bahan dicocokkan dengan daftar alergen |
| L-13 | Alergen dicetak tebal | 51 | Tidak bisa dicek dari foto, ditampilkan sebagai pengingat |
| L-14 | Ukuran huruf minimal 1 mm, nama produk dan peringatan minimal 2 mm | 9 | Tidak bisa dicek dari foto, ditampilkan sebagai pengingat |
| L-15 | Tidak ada pernyataan bahwa produk menyehatkan, berfungsi sebagai obat, atau meningkatkan kecerdasan | 67 | Dari label |
| L-16 | Keterangan "tanpa pengawet" dan sejenisnya hanya untuk lima jenis bahan tambahan yang diizinkan dan hanya bila benar | 24 | Label dan resep |
| L-17 | Tidak ada pernyataan umum "bebas bahan tambahan pangan" atau yang semakna | 67 huruf z | Dari label |
| L-18 | Kata "alami", "murni", "100%", "asli", dan "segar" hanya dipakai sesuai syaratnya | 63 | Label dan resep |
| L-19 | Cara penyimpanan tercantum bila umur simpan bergantung pada cara simpan | 48 | Label dan jawaban pengguna |
| L-20 | Keterangan wajib ditulis dalam bahasa Indonesia | 7 | Dari label |

Daftar alergen menurut Pasal 49: serealia mengandung gluten, telur, ikan, krustase, moluska, kacang tanah, kedelai, susu, kacang pohon, dan sulfit.

### 7.2 Jalur izin (Peraturan BPOM 4/2024)

| ID | Aturan | Pasal |
| :-- | :-- | :-- |
| I-01 | Tidak wajib izin produksi rumah tangga bila umur simpan kurang dari 7 hari | 3 |
| I-02 | Tidak wajib izin produksi rumah tangga bila berupa pangan siap saji | 3 |
| I-03 | Tempat produksi di rumah tinggal atau rumah toko yang ditinggali pemilik | 5 |
| I-04 | Alat produksi manual sampai semi otomatis | 5 |
| I-05 | Tidak bisa lewat jalur rumah tangga bila label mencantumkan klaim | 10 |
| I-06 | Tidak bisa lewat jalur rumah tangga bila produk butuh penanganan khusus dalam produksi atau distribusi | 10 |
| I-07 | Tidak bisa lewat jalur rumah tangga bila produk wajib SNI | 10 |
| I-08 | Jenis pangan harus termasuk yang diizinkan di Lampiran I | 5, 9 |

I-08 belum bisa diperiksa aplikasi karena Lampiran I belum terbaca. [B]

### 7.3 Nilai gizi (Peraturan BPOM 10/2026)

| ID | Aturan | Pasal |
| :-- | :-- | :-- |
| G-01 | Tabel nilai gizi wajib dicantumkan | 2 |
| G-02 | Dikecualikan untuk kopi bubuk, kopi instan, teh kering, air minum dalam kemasan, herba, rempah, bawang hitam, cuka makan, ragi, dan beberapa lainnya | 3 |
| G-03 | Usaha mikro boleh memakai hasil uji lab atau nilai yang ditetapkan Kepala BPOM | 7 ayat 1 |
| G-04 | Bila keduanya tidak tersedia, tabel dicantumkan berdasarkan hitungan dari bahan, dengan tata cara yang ditetapkan Kepala BPOM | 7 ayat 2 dan 3 |
| G-05 | Tabel dicantumkan per satu takaran saji | 8 |
| G-06 | Produk yang sudah berizin wajib menyesuaikan paling lambat 24 bulan sejak aturan diundangkan, termasuk produk industri rumah tangga | 31 |

## 8. Arsitektur

- **Kerangka:** Next.js (App Router), TypeScript mode ketat, Tailwind CSS.
- **Pemeriksa aturan:** fungsi murni di `src/domain`, tanpa ketergantungan pada jaringan atau model. Diuji dengan Vitest.
- **Pembaca label:** satu route di server yang mengirim gambar ke model utama `DeepSeek-V4.1-Flash-1017` (`deepseek-flash`, mode non-thinking) lewat API server, dengan opsi pembanding/percobaan `claude-haiku-5-5` lewat konfigurasi environment server. Keluaran terstruktur wajib divalidasi skema dan memiliki fallback isian manual. Kunci API hanya ada di server.
- **Asisten tanya jawab:** satu route terpisah di server memakai `DeepSeek-V4.1-Flash-1017` (`deepseek-flash`, dengan `claude-haiku-5-5` sebagai opsi percobaan) bersama konteks hasil pemeriksaan dan ringkasan pasal BPOM yang di-cache, tanpa hak mengubah status aturan dari `src/domain`.
- **Penyimpanan:** di perangkat pengguna. Tidak ada basis data dan tidak ada akun.
- **Keluaran cetak:** halaman khusus cetak, disimpan sebagai PDF lewat peramban.
- **Rilis:** Vercel. Pemeriksaan otomatis (lint, tipe, tes) lewat GitHub Actions.

Gambar label dikirim ke penyedia model untuk dibaca dan tidak disimpan di server aplikasi. Hal ini ditulis terang di layar unggah.

## 9. Kebutuhan lain

| Area | Target |
| :-- | :-- |
| Tampilan | Layak dipakai dari lebar 360 px sampai 1440 px |
| Bahasa | Bahasa Indonesia sehari-hari, tanpa istilah hukum yang tidak dijelaskan |
| Kecepatan | Hasil pemeriksaan aturan muncul seketika setelah isi disahkan. Pembacaan foto paling lama 15 detik [A] |
| Ketahanan | Bila model gagal atau batas tercapai, pengguna tetap bisa mengisi sendiri dan mendapat hasil pemeriksaan |
| Keamanan | Kunci API tidak pernah sampai ke peramban. Ada batas pemanggilan per pengunjung |
| Mutu kode | TypeScript ketat, ESLint, tes unit untuk seluruh aturan, tes alur utama dari ujung ke ujung |

## 10. Yang sengaja tidak dikerjakan

- Login, akun, dan penyimpanan di server.
- Pendaftaran izin secara daring.
- Pembayaran dan toko daring.
- Uji laboratorium atau pengganti uji laboratorium.
- Jaminan bahwa label pasti lolos pemeriksaan dinas.
- Pemeriksaan desain visual, warna, atau merek dagang.
- Aturan khusus minuman (penanda Nutri-Level), pangan bayi, dan pangan keperluan khusus.
- Chatbot konsultasi hukum umum atau tanya jawab di luar konteks hasil pemeriksaan label.

## 11. Risiko dan hal yang belum pasti

| Hal | Akibat bila salah | Penanganan |
| :-- | :-- | :-- |
| Model salah membaca foto | Temuan keliru | Pengguna mengesahkan hasil baca sebelum diperiksa |
| Asisten tanya jawab salah menyebut pasal atau bertentangan dengan hasil cek | Pengguna bingung atau menerima saran keliru | Konteks terkunci ke JSON hasil pemeriksaan + ringkasan pasal resmi di server, dilarang mengubah status temuan |
| Pengguna menganggap hasil sebagai pengesahan | Kecewa saat ditolak dinas | Kalimat batasan di hasil dan ringkasan |
| Daftar nilai gizi resmi belum diperoleh [B] | F-07 tidak bisa menampilkan angka | F-07 turun menjadi penjelasan saja |
| Tata cara hitung gizi resmi belum terbaca [B] | Hitungan tidak sesuai ketentuan | Tidak menampilkan hitungan sebelum tata caranya dibaca |
| Lampiran jenis pangan izin rumah tangga belum terbaca [B] | Jalur izin kurang pasti | Hasil ditulis "perlu dicek ke Dinas Kesehatan" |
| Aturan khusus klaim dan perubahan aturan label belum terbaca [B] | Ada ketentuan yang terlewat | Dibaca sebelum 14 November, daftar aturan diperbarui |
| Belum ada wawancara [A] | Masalah M4 belum terbukti | Lihat bagian 12 |
| Aturan berubah | Hasil usang | Tanggal terakhir dibaca tampil di aplikasi |

## 12. Rencana validasi

Target minimal sebelum 18 November: satu pendamping UMKM atau petugas Dinas Kesehatan, dan dua pembuat makanan rumahan.

| Kode | Hipotesis | Lulus bila |
| :-- | :-- | :-- |
| H1 | Label sering dikembalikan atau harus direvisi saat mengurus izin | Pendamping atau petugas membenarkan dan memberi contoh |
| H2 | Pembuat makanan pernah mencetak ulang label karena salah | Minimal satu dari dua pernah mengalami |
| H3 | Daftar periksa dari aplikasi dipahami tanpa penjelasan | Dua dari dua bisa menyebut apa yang harus diperbaiki |
| H4 | Tabel nilai gizi adalah kesulitan nyata | Minimal satu dari tiga menyebutnya tanpa ditanya |
| H5 | Pendamping atau petugas memeriksa label secara rutin | Narasumber menyebut jumlah label yang diperiksa per bulan |
| H6 | Kesalahan yang sering muncul adalah cara penulisan, bukan hanya keterangan yang hilang | Narasumber memberi minimal dua contoh kesalahan penulisan |
| H7 | Ada kisah nyata kerugian akibat label salah | Minimal satu kisah yang boleh dikutip tanpa nama |

**Uji teknis tambahan:**
- **Uji pembanding chatbot umum:** Dua atau tiga label difoto dan ditanyakan ke chatbot umum masing-masing dua kali; catat butir yang terlewat, pasal yang keliru, dan perbedaan jawaban antarpercobaan.
- **Uji ketepatan baca:** Uji pembacaan pada sekitar 20 label kemasan nyata dan laporkan ketepatan per butir.

Hasil yang gagal tetap ditulis apa adanya di proposal.

## 13. Rencana kerja

| Tanggal | Pekerjaan |
| :-- | :-- |
| 12 sampai 13 Nov | Kerangka proyek, pemeriksa aturan label (L-01 sampai L-20) dengan tes, baca sisa aturan |
| 14 sampai 15 Nov | Pembaca foto dan layar pembetulan, pertanyaan tambahan, penentu jalur izin |
| 16 sampai 17 Nov | Label dan ringkasan siap cetak, tiga contoh, halaman aturan, rilis ke publik, F-07 sesuai bahan yang tersedia |
| 18 Nov | Hasil wawancara masuk proposal, rekam video |
| 19 Nov | Fitur dibekukan, perbaikan galat |
| 20 Nov | Cek ulang semua tautan, kumpulkan sebelum siang |

Pembagian tugas diisi tim.

## 14. Kriteria selesai

- Juri bisa membuka situs, memilih satu contoh, dan melihat temuan beserta pasalnya tanpa akun.
- Foto kemasan nyata bisa dibaca, dibetulkan, dan diperiksa dari HP.
- Seluruh aturan L dan I yang bisa dicek punya tes unit dan lulus.
- Label perbaikan dan ringkasan bisa diunduh.
- Halaman aturan dan batasan terisi dan sesuai dengan yang benar-benar diperiksa.

## 15. Daftar periksa lomba

- [ ] Situs bisa diakses publik dan tetap aktif sampai 30 November.
- [ ] Repositori publik.
- [ ] README memuat daftar yang diwajibkan aturan lomba butir V.5. Isinya diputuskan dan ditulis tim.
- [ ] Proposal mengikuti templat resmi, dengan nama berkas `ITRUSH26_NamaTim_JudulKarya.pdf`.
- [ ] Video 3 sampai 5 menit, YouTube Unlisted.
- [ ] Surat pernyataan ditandatangani ketua tim.
- [ ] Semua dokumen di repo sudah dibaca dan disetujui tim.

## 16. Keputusan terbuka

**Sudah diputuskan (13 November 2026):**
- Nama aplikasi: **Tilik Label** (menggantikan nama kerja *Cek Label*).
- Cakupan fitur tambahan: `F-11` ("Produk saya" di perangkat) naik ke P0, `F-09` menyertakan minimal satu contoh jebakan lengkap-di-permukaan, dan ditambah `F-14` (asisten tanya jawab temuan terpagar) pada prioritas P1.
- Model utama pembaca foto (`F-03`) & asisten tanya jawab (`F-14`): **DeepSeek-V4.1-Flash-1017** (`deepseek-flash`) di server, dengan **Claude Haiku 5.5** (`claude-haiku-5-5`) sebagai model percobaan/pembanding, dilindungi batas pemanggilan dan batas belanja (`F-12`).
- Tim pengembang: Muhammad Raihan Surya, Muhammad Choiruddin Ammar, Ahmad Rafi Firdaus (pembagian peran resmi menyusul).

**Masih terbuka:**
1. Batas belanja harian/total pada akun penyedia model (`F-12`).
2. Tiga produk contoh spesifik untuk juri (`F-09`).
3. Apakah F-07 menampilkan angka atau cukup penjelasan, bergantung pada bahan [B] sampai 15 November.

## 17. Sumber

**Aturan (teks resmi)**
- [Peraturan BPOM 31/2018 tentang Label Pangan Olahan](https://peraturan.go.id/files/bn1452-2018.pdf)
- [Peraturan BPOM 10/2026 tentang Informasi Nilai Gizi pada Label Pangan Olahan](https://peraturan.go.id/files/peraturan-bpom-no-10-tahun-2026.pdf)
- [Peraturan BPOM 4/2024 tentang Pedoman Penerbitan SPP-IRT](https://peraturan.go.id/files/peraturan-bpom-no-4-tahun-2024.pdf)

**Belum terbaca langsung [B]**
- Keputusan Kepala BPOM tentang nilai kandungan zat gizi untuk pangan olahan usaha mikro. Menurut [UKM Indonesia, 24 Jul 2026](https://ukmindonesia.id/baca-deskripsi-posts/informasi-nilai-gizi-produk-usaha-mikro-kini-tanpa-uji-lab-untuk-465-jenis-olahan), keputusan ini bernomor 265 Tahun 2026 dan memuat 465 jenis pangan.
- Tata cara perhitungan nilai gizi dari bahan (Peraturan BPOM 10/2026 Pasal 7 ayat 3).
- Lampiran I Peraturan BPOM 4/2024 tentang jenis pangan yang diizinkan.
- Aturan khusus klaim dan Peraturan BPOM 20/2021 (perubahan pertama aturan label).

**Lain-lain**
- [Jurnal USM Law Review, 2025](https://journals.usm.ac.id/index.php/julr/article/view/11794)
- [Siaran pers BPOM, 24 Feb 2025](https://www.pom.go.id/siaran-pers/bpom-percepat-proses-perizinan-umkm-pangan-olahan-capai-55-9-persen-registrasi-produk-di-bpom)
- [Berita BPOM, 30 Apr 2026](https://www.pom.go.id/berita/bpom-siapkan-regulasi-baru-dorong-umkm-naik-kelas-dan-perluas-jangkauan-pasar)
- [Siaran pers BPOM, 30 Jul 2026](https://www.pom.go.id/siaran-pers/nutri-level-hadir-di-indonesia-permudah-konsumen-pilih-pangan-lebih-sehat)
- [Berita BPOM tentang rencana pemanfaatan AI untuk pendaftaran pangan olahan, 11 Sep 2024](https://www.pom.go.id/berita/peluang-bpom-manfaatkan-ai-untuk-pendaftaran-pangan-olahan)
