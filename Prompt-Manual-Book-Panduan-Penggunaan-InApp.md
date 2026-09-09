# PROMPT: Analisis Aplikasi ERP Konveksi & Generate Modul "Panduan Penggunaan" (Terintegrasi di Dalam Aplikasi)

Prompt ini untuk dipakai di sesi Claude Code (atau AI coding assistant lain) yang punya akses langsung ke source code aplikasi ERP konveksi kamu. Berbeda dari versi sebelumnya, di sini manual book **dibuat sebagai modul/halaman internal aplikasi** (bukan file HTML terpisah yang dibuka manual), dan bisa diakses lewat menu navigasi dengan label **"Panduan Penggunaan"**.

Copy-paste seluruh isi di bawah ini sebagai instruksi ke AI. Dipecah 2 tahap: Analisis dulu, baru Build modul.

---

## TAHAP 1 — ANALISIS FITUR & PEMETAAN WORKFLOW BISNIS

```
Kamu bertindak sebagai Business Analyst sekaligus Technical Writer untuk aplikasi
ERP Konveksi yang sedang saya bangun. Sebelum membuat modul Panduan Penggunaan,
lakukan dulu analisis menyeluruh terhadap codebase ini:

1. EKSPLORASI STRUKTUR APLIKASI
   - Telusuri struktur folder/project (routes, controllers, models,
     views/pages, komponen frontend, sistem navigasi/menu yang sudah ada) untuk
     memahami arsitektur aplikasi secara utuh.
   - Identifikasi seluruh modul yang ada (contoh tipikal ERP konveksi: Master
     Data [Customer, Supplier, Bahan/Material, Produk/Model Pakaian], Sales
     Order, Purchase Order, Cutting, Sewing/Produksi, Quality Control,
     Finishing, Gudang/Inventory, Pengiriman, Keuangan/Invoice,
     Payroll/Penggajian Karyawan, Laporan, User & Role Management, Dashboard).
   - Untuk tiap modul, catat: nama modul, sub-menu/fitur di dalamnya, entitas
     data utama, route/URL halaman, dan relasi antar modul.

2. PEMETAAN WORKFLOW BISNIS
   - Untuk tiap proses inti (order masuk sampai barang jadi dikirim), buat alur
     kerja end-to-end: aktor/role yang terlibat (admin, kasir, kepala produksi,
     operator jahit, QC, gudang, dsb), input yang dibutuhkan, output yang
     dihasilkan, status/state yang dilalui (misal: Draft -> Diproses -> Cutting
     -> Produksi -> QC -> Selesai -> Terkirim).
   - Sajikan sebagai daftar langkah bernomor per proses bisnis, bukan sekadar
     daftar fitur teknis.
   - Tandai fitur yang saling terhubung lintas modul (misal status order
     berubah otomatis saat QC approve).

3. INVENTARISASI ELEMEN UI PER MODUL
   - Untuk tiap halaman/menu: nama tombol aksi utama, field input wajib,
     validasi penting, filter/pencarian, dan output (tabel/laporan/grafik).
   - Kalau memungkinkan (punya akses browser/emulator), ambil screenshot
     aktual tiap halaman utama; kalau tidak, deskripsikan komponen UI secara
     rinci berdasarkan kode agar nanti bisa dilengkapi screenshot manual.

4. CEK SISTEM NAVIGASI & ROLE/PERMISSION YANG SUDAH ADA
   - Pelajari bagaimana menu navigasi (navbar/sidebar) saat ini didefinisikan
     di kode (misal file config menu, component Sidebar, array route) supaya
     modul Panduan Penggunaan nanti bisa ditambahkan dengan cara yang konsisten
     dengan pola yang sudah ada, bukan menambah kode yang menyimpang.
   - Cek juga sistem role/permission (siapa yang boleh akses menu apa), karena
     menu "Panduan Penggunaan" idealnya bisa diakses oleh SEMUA role yang login
     (tidak dibatasi permission khusus).

5. OUTPUT TAHAP 1
   Sajikan hasil analisis dalam dokumen terstruktur (markdown) berisi:
   a. Daftar modul & sub-fitur (hierarki menu) beserta route/URL masing-masing
   b. Alur workflow bisnis utama per proses (langkah bernomor per role/aktor)
   c. Peta relasi antar modul
   d. Daftar elemen UI penting per modul (tombol, field, status)
   e. Ringkasan pola navigasi & permission yang sudah ada di aplikasi

   Ini jadi dasar/outline untuk membangun modul Panduan Penggunaan di Tahap 2.
   Jangan menulis konten panduan dulu di tahap ini — fokus ke pemetaan dan
   validasi struktur.
```

---

## TAHAP 2 — BUILD MODUL "PANDUAN PENGGUNAAN" (TERINTEGRASI DI DALAM APLIKASI)

```
Berdasarkan hasil analisis modul, fitur, dan workflow bisnis pada Tahap 1,
buatkan modul PANDUAN PENGGUNAAN sebagai bagian internal dari aplikasi ERP
Konveksi ini (bukan file HTML lepas yang dibuka manual di browser), dengan
ketentuan berikut:

A. INTEGRASI KE DALAM APLIKASI
   1. Tambahkan menu baru di navigation bar/sidebar utama dengan label
      "Panduan Penggunaan", ikuti pola penamaan & styling menu yang sudah ada
      di aplikasi (ikon, posisi, komponen menu) supaya konsisten secara visual.
   2. Tempatkan menu ini bisa diakses oleh SEMUA role/user yang sudah login
      (tidak dibatasi permission khusus), idealnya diletakkan di posisi yang
      mudah ditemukan (misal bagian bawah sidebar, dekat menu Profil/Logout,
      atau di header/topbar).
   3. Buat sebagai route/halaman baru di dalam aplikasi (contoh: /panduan atau
      /help sesuai konvensi routing yang sudah ada), dirender memakai layout
      aplikasi yang sama (header, sidebar tetap muncul) supaya user merasa
      masih "di dalam" aplikasi, bukan pindah ke halaman terpisah.
   4. Konten panduan disajikan dalam bentuk halaman yang bisa dibaca & dilihat
      langsung di dalam aplikasi (in-app viewer), dengan:
      - Sidebar/daftar isi kecil di sisi kiri atau tab-tab per modul, agar user
        bisa loncat cepat ke bagian yang dibutuhkan tanpa scroll panjang.
      - Search box sederhana untuk mencari kata kunci di dalam konten panduan
        (opsional, kalau memungkinkan secara teknis).
      - Tombol/link "Panduan halaman ini" di tiap modul aplikasi (misal di
        halaman Sales Order ada tombol kecil "?" yang langsung membuka bagian
        panduan modul Sales Order) — kalau memungkinkan tanpa mengubah banyak
        kode existing.

B. STRUKTUR KONTEN (mengikuti pola modul pelatihan referensi)
   1. Halaman pembuka: judul "Panduan Penggunaan [Nama Aplikasi]", versi
      aplikasi, ringkasan singkat cara memakai panduan ini.
   2. Daftar Isi/navigasi antar bagian (anchor/tab, bukan halaman terpisah agar
      tetap terasa satu kesatuan aplikasi).
   3. Bagian "Mengenal Aplikasi": gambaran umum aplikasi, siapa saja
      pengguna/role, dan alur kerja end-to-end (pakai hasil pemetaan workflow
      dari Tahap 1), tampilkan sebagai diagram alur sederhana (HTML/CSS atau
      SVG/komponen chart yang tersedia di framework aplikasi).
   4. Bagian "Komponen Antarmuka Utama": screenshot dashboard/halaman utama
      dengan NOMOR CALLOUT pada tiap elemen penting (mirip contoh: Title Bar,
      Menu, Sidebar, Search Bar, dst), lalu daftar penjelasan tiap nomor.
   5. Satu Sub-bagian per MODUL aplikasi (Master Data, Sales Order, Produksi,
      Gudang, Keuangan, dst) — untuk tiap modul sertakan:
      - Tujuan/fungsi modul & role yang berhak mengakses
      - Screenshot halaman + callout elemen penting (tombol, field, status)
      - Langkah-langkah penggunaan bernomor (step-by-step), mis. cara membuat
        Sales Order baru, cara ubah status produksi, cara approve QC, dst
      - Kotak "Catatan/Trik" untuk tips penting atau perhitungan otomatis
        dalam sistem
   6. Bagian "Alur Proses Bisnis End-to-End": diagram visual perjalanan satu
      Sales Order dari input sampai barang terkirim & invoice lunas, lintas
      semua modul.
   7. Bagian "Studi Kasus/Latihan": 2-3 skenario penggunaan nyata dengan
      kondisi awal, ketentuan, dan hasil yang diharapkan, agar user baru bisa
      praktik langsung di aplikasi.
   8. Bagian "FAQ/Troubleshooting" (opsional).
   9. Glossary istilah khusus konveksi (cutting, bordir, QC, reject, WIP, dst).

C. GAYA VISUAL & TEKNIS
   - Gunakan komponen UI, warna, tipografi, dan sistem styling (CSS
     framework/library) yang SAMA dengan yang sudah dipakai di aplikasi ini,
     supaya halaman Panduan Penggunaan terasa menyatu, bukan seperti dokumen
     tempelan.
   - Responsive untuk desktop & tablet, mengikuti breakpoint yang sudah ada di
     aplikasi.
   - Gunakan kotak bernomor (numbered badge) di atas screenshot untuk callout,
     konsisten dengan pola "1. Title Bar", "2. Menu Bar", dst pada contoh
     referensi.
   - Sertakan placeholder <img>/komponen gambar dengan alt text jelas di tiap
     tempat yang butuh screenshot aktual aplikasi, beri komentar/TODO yang
     mudah dicari (misal: {/* TODO: screenshot halaman Sales Order */}) supaya
     saya tinggal lengkapi dengan gambar asli nanti.
   - Sediakan opsi "Cetak/Export ke PDF" di halaman panduan (pakai print CSS
     atau fitur export yang sudah ada di aplikasi) untuk kebutuhan dokumentasi
     offline/cetak.

D. PROSES BUILD
   1. Generate dulu OUTLINE lengkap (daftar modul & sub-bagian final, beserta
      rencana lokasi menu & route baru) dan minta konfirmasi saya sebelum
      menulis seluruh konten, supaya urutan modul & workflow sudah sesuai
      kondisi aplikasi sebenarnya dan tidak bentrok dengan struktur route yang
      ada.
   2. Setelah outline disetujui, implementasikan:
      a. Penambahan menu "Panduan Penggunaan" di navigasi
      b. Route/halaman baru untuk menampilkan konten panduan
      c. Konten tiap bagian, dibangun bertahap per modul (bukan sekaligus)
         supaya saya bisa review tiap bagian
   3. Setelah selesai, jalankan build aplikasi untuk memastikan menu baru
      tampil dengan benar, route bisa diakses, dan tidak ada error/console
      warning.
   4. Berikan ringkasan akhir: nama file/komponen baru yang dibuat, route yang
      ditambahkan, serta daftar lokasi yang masih perlu saya lengkapi dengan
      screenshot asli aplikasi.
```

---

## Tips pemakaian

- **Jalankan Tahap 1 dulu secara terpisah**, review hasil pemetaannya sebelum lanjut ke Tahap 2 — supaya konten panduan benar-benar sesuai workflow aktual, bukan asumsi generik.
- Poin **A.1–A.4** di Tahap 2 adalah kunci permintaan kamu (label menu **"Panduan Penggunaan"**, bisa dibaca **di dalam aplikasi**) — pastikan bagian ini tidak dilewati AI saat implementasi.
- Kalau aplikasi kamu berbasis framework tertentu (React, Vue, Laravel Blade, dll), sebutkan eksplisit di awal prompt supaya AI langsung tahu pola komponen/routing yang harus diikuti.
- Untuk modul yang banyak, pecah bagian **B.5** per modul jadi prompt terpisah (satu prompt = satu modul) agar hasilnya lebih detail dan tidak terpotong konteksnya.
