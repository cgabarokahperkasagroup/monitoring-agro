# PRD — Aplikasi Monitoring Kegiatan Karyawan Kebun Sawit (Monitoring Agro)

**Versi:** 0.2 (Scope MVP terkunci)
**Tanggal:** 10 Juni 2026
**Penyusun:** Tim Pengembangan — Barokah Perkasa Group
**Status:** Disetujui untuk lanjut ke desain teknis — keputusan kunci sudah difinalisasi oleh pemilik produk (Ilham)

---

## 0. Cara Membaca Dokumen Ini

Keputusan kunci sudah difinalisasi (lihat tabel). Sisa pertanyaan minor yang belum kritis tetap ditandai **🔶 PERLU KEPUTUSAN** dan bisa diputus saat desain teknis.

**Keputusan kunci yang sudah dikunci:**

| Topik | Keputusan |
|---|---|
| Engine sinkron offline | **PowerSync + Supabase** |
| Modul MVP (Fase 1) | **Panen + Pengiriman** dulu |
| Foto bukti | **Opsional** |
| Akses lintas estate | Hanya **Manajer Kebun & Manajemen/Admin Grup** |
| Platform | **Android & iOS** — Android dikerjakan dulu (mayoritas user lapangan); iOS untuk manajemen |
| Istilah/satuan | **janjang**, **divisi**, **basis** |
| Face recognition | **Fase 2** — consent & implementasi dikerjakan nanti |
| Login karyawan | Tidak ada — **dicatat oleh mandor** |
| Verifikasi identitas v1 | **NIK/ID + foto manual** (mandor memilih karyawan dari daftar) |
| Skala | **Multi-estate / grup** (banyak kebun/PT dalam satu grup) |
| Format dokumen | Markdown (.md) |
| Tech stack | Mobile: React Native + Supabase · Web: React/Vite + Supabase |
| Desain | Modern, clean, dominan putih |

---

## 1. Latar Belakang & Masalah

Operasional kebun sawit melibatkan banyak divisi yang bekerja di lapangan: **prunning (tunas/pruning), panen, pemupukan, pemeliharaan**, hingga **pengiriman buah (TBS) ke pabrik (PKS)**. Pencatatan kegiatan saat ini (asumsi) masih manual/kertas atau spreadsheet, sehingga:

- Data lambat sampai ke kantor/manajemen, rawan hilang dan sulit diaudit.
- Sulit memantau produktivitas per karyawan, per blok, dan per divisi secara real-time.
- Rekonsiliasi panen vs. pengiriman ke pabrik sering tidak akurat.
- Tidak ada batasan akses data yang jelas antar peran.

**Tantangan utama:** lokasi kebun umumnya memiliki **jaringan internet yang buruk atau tidak ada sama sekali**. Aplikasi harus tetap bisa dipakai penuh tanpa internet dan menyinkronkan data otomatis saat sinyal tersedia.

---

## 2. Tujuan & Sasaran

### 2.1 Tujuan Produk
Menyediakan aplikasi pencatatan kegiatan lapangan **offline-first** (mobile) dan **dashboard admin** (web) yang akurat, cepat, dan dapat diaudit, untuk seluruh divisi operasional kebun di lingkup multi-estate.

### 2.2 Sasaran Terukur (target awal — dapat disesuaikan)

| Sasaran | Indikator | Target |
|---|---|---|
| Pencatatan tepat waktu | % laporan tersinkron < 24 jam | ≥ 95% |
| Keandalan offline | Kehilangan data saat offline | 0% |
| Adopsi | % mandor aktif memakai aplikasi | ≥ 90% dalam 3 bulan |
| Akurasi rekonsiliasi | Selisih panen vs. terkirim ke PKS | < 2% |
| Kecepatan input | Waktu input 1 laporan kegiatan | < 60 detik |

### 2.3 Di Luar Lingkup (Non-Goals) untuk v1
- Payroll / perhitungan gaji otomatis (hanya menyediakan data dasar, integrasi menyusul).
- Modul keuangan/akuntansi penuh.
- Face recognition (Fase 2).
- Integrasi langsung ke timbangan jembatan pabrik (Fase 2/3, lihat §11).

---

## 3. Pengguna & Peran (Role-Based Access Control)

### 3.1 Persona Utama

1. **Karyawan/Pekerja lapangan** — objek pencatatan saja, **tidak login**. Seluruh kegiatan dicatat oleh mandor (keputusan final, berlaku semua fase).
2. **Mandor / Kerani divisi** — pengguna utama aplikasi mobile. Mencatat kegiatan harian timnya di lapangan, sering offline.
3. **Asisten Divisi / Asisten Kebun** — memverifikasi & menyetujui laporan, memantau produktivitas divisinya.
4. **Manajer Kebun (Estate Manager)** — melihat dashboard seluruh divisi dalam 1 estate.
5. **Admin Grup / Manajemen Pusat** — melihat lintas estate, kelola master data & pengguna.
6. **Super Admin (IT)** — konfigurasi sistem, role, audit log.

### 3.2 Matriks Hak Akses (RBAC) — ringkas

| Kapabilitas | Mandor | Asisten | Mgr Kebun | Admin Grup | Super Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Input kegiatan lapangan | ✅ | ✅ | — | — | — |
| Edit laporan sendiri (sebelum approve) | ✅ | ✅ | — | — | — |
| Verifikasi/approve laporan | — | ✅ | ✅ | — | — |
| Lihat data divisi sendiri | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lihat data 1 estate (semua divisi) | — | — | ✅ | ✅ | ✅ |
| Lihat data lintas estate | — | — | — | ✅ | ✅ |
| Kelola master data (blok, karyawan, jenis kegiatan) | — | — | sebagian | ✅ | ✅ |
| Kelola pengguna & role | — | — | — | sebagian | ✅ |
| Lihat audit log | — | — | — | ✅ | ✅ |

> **Prinsip isolasi data multi-estate:** setiap pengguna hanya melihat data sesuai cakupan `estate_id` / `divisi_id` yang ditugaskan. Diterapkan di level database (Supabase Row Level Security), bukan hanya di UI.
>
> **Keputusan:** Akses **lintas estate** hanya untuk **Manajer Kebun** (dalam cakupan estate-nya) dan **Manajemen/Admin Grup** (seluruh estate). Mandor & Asisten tetap terkunci pada divisi/estate masing-masing.

---

## 4. Lingkup Fungsional (Modul per Divisi)

Setiap laporan kegiatan punya **field umum**: tanggal, estate, divisi, blok/afdeling, mandor pencatat, daftar karyawan + kehadiran, jam mulai/selesai, foto bukti (opsional), catatan, lokasi GPS (auto), status sinkronisasi.

### 4.1 Prunning (Tunas/Pruning)
- Blok & baris, jumlah pokok dikerjakan, jumlah pelepah dibuang (opsional), HK (hari kerja), output per karyawan, kualitas (sesuai standar songgo/over-pruning).

### 4.2 Panen
- Blok, jumlah **janjang (TBS)** per karyawan, estimasi tonase, brondolan (kg), buah mentah/busuk (mutu), nomor TPH (tempat pengumpulan hasil), basis & premi (opsional). Ini sumber utama angka produksi.

### 4.3 Pemupukan
- Jenis pupuk, dosis per pokok, jumlah pokok terpupuk, total pupuk dipakai (kg/sak), blok, metode (manual/mekanis), stok terpakai vs. rencana.

### 4.4 Pemeliharaan
- Jenis kegiatan (semprot/herbisida, rawat piringan, rawat jalan, garuk pasar, dll.), luas/jumlah pokok ditangani, bahan dipakai (mis. herbisida), HK.

### 4.5 Pengiriman Buah ke Pabrik (TBS ke PKS)
- Nomor SPB/surat jalan, kendaraan & sopir, asal blok/TPH, jumlah janjang & estimasi tonase muat, tujuan PKS, jam berangkat. (Tonase final dari timbangan pabrik diisi belakangan / direkonsiliasi.)
- **Rekonsiliasi panen → angkut → terima pabrik** untuk mendeteksi kehilangan/selisih.

> **Keputusan istilah/satuan baku:** gunakan **janjang** (satuan TBS), **divisi** (bukan afdeling), dan **basis** (target output per HK). Dikunci di master data agar konsisten lintas modul & laporan.

### 4.6 Master Data (dikelola dari web)
Estate, divisi/afdeling, blok (dengan luas & tahun tanam), TPH, daftar karyawan (NIK internal, divisi, status), jenis kegiatan & satuan, jenis pupuk/herbisida, kendaraan & sopir, PKS tujuan.

### 4.7 Dashboard Admin (Web)
- Ringkasan KPI: produksi harian/bulanan, produktivitas per karyawan/divisi/estate, realisasi pemupukan vs. rencana, status pengiriman & rekonsiliasi.
- Filter per estate/divisi/blok/periode; drill-down; ekspor Excel/PDF.
- Peta sebaran kegiatan (opsional, dari GPS).
- Manajemen pengguna, role, dan master data.
- Audit log & status sinkronisasi perangkat.

---

## 5. Kebutuhan Inti: Arsitektur Offline-First

Ini adalah **persyaratan paling kritis**. Aplikasi mobile harus berfungsi 100% tanpa internet, menyimpan data di perangkat, lalu sinkron otomatis saat online.

### 5.1 Prinsip
- **Local-first:** semua operasi tulis/baca berjalan ke database lokal di HP terlebih dulu; UI tidak pernah menunggu jaringan.
- **Sinkronisasi di latar belakang:** saat ada koneksi, perubahan dikirim ke Supabase dan data baru ditarik turun.
- **Antrian tahan gangguan:** sinkron bisa terputus di tengah jalan tanpa kehilangan/duplikasi data (idempoten).
- **Resolusi konflik jelas:** aturan baku bila data yang sama diubah di dua tempat.

### 5.2 Pilihan Teknologi Sinkronisasi (hasil riset — perlu diputuskan)

| Opsi | Cara kerja | Kelebihan | Kekurangan | Cocok bila |
|---|---|---|---|---|
| **PowerSync** + Supabase | Layanan sinkron membaca Write-Ahead Log Postgres, mengelola sync rules & konflik | Sinkronisasi & conflict handling matang, "sync rules" pas untuk partisi data multi-estate, paling sedikit kode backend | Layanan/biaya tambahan, ketergantungan vendor | Sync correctness penting & multi-estate (**rekomendasi**) |
| **WatermelonDB** + Supabase | DB reaktif di klien, sync DIY via kolom `updated_at` | Performa bagus untuk data besar, gratis/open-source | Harus bangun & rawat logika backend sync sendiri, kolom tracking di tiap tabel | Tim siap maintain sync sendiri & hemat biaya |
| **Expo SQLite + sync custom** | SQLite lokal + endpoint sync buatan sendiri | Kontrol penuh, ringan | Paling banyak kerja & risiko bug sync | Kebutuhan sangat spesifik |
| **RxDB** | DB reaktif + replikasi | SDK klien kaya fitur | Tetap perlu bangun sisi backend | Alternatif WatermelonDB |

> **KEPUTUSAN FINAL:** menggunakan **PowerSync + Supabase**. Partisi data antar estate diatur lewat *sync rules* PowerSync (tiap perangkat hanya menarik data sesuai cakupan penggunanya — hemat penyimpanan & sinkron lebih cepat). Opsi lain di tabel hanya untuk konteks/perbandingan.

### 5.3 Strategi Resolusi Konflik (default usulan)
- Laporan kegiatan bersifat **append/owned** oleh pembuatnya → konflik minimal.
- Aturan default **last-write-wins per field** untuk edit; data yang sudah **di-approve dikunci** (tidak bisa diubah dari mobile).
- Setiap record punya `client_uuid` agar tidak duplikat saat retry sinkron.

### 5.4 Media (Foto)
Foto bukti **bersifat opsional**. Bila diambil: disimpan lokal dahulu, di-compress, lalu di-upload ke Supabase Storage saat online (antri terpisah dari data teks agar laporan tetap cepat sinkron). 🔶 PERLU KEPUTUSAN minor (saat desain): batas ukuran/jumlah foto per laporan.

### 5.5 Indikator untuk Pengguna
Status tiap laporan terlihat jelas: **Tersimpan lokal → Menunggu sinkron → Terkirim → Terverifikasi**, plus indikator "terakhir sinkron".

---

## 6. Model Data (Tingkat Tinggi)

Entitas inti (akan diperinci di fase desain DB):

- `organizations` (grup) → `estates` → `divisions` → `blocks` → `tph`
- `employees` (NIK, divisi, status)
- `users` & `roles` & `user_scopes` (pemetaan pengguna ke estate/divisi)
- `activities` (tabel induk: tipe, tanggal, lokasi, pembuat, status, `client_uuid`)
- detail per tipe: `harvest_records`, `pruning_records`, `fertilizing_records`, `maintenance_records`, `delivery_records`
- `attendance_lines` (kehadiran karyawan per kegiatan)
- `delivery_reconciliation` (panen ↔ angkut ↔ terima pabrik)
- `attachments` (foto), `audit_logs`, `sync_state`

Semua tabel transaksi membawa `estate_id`/`division_id` untuk **Row Level Security** dan partisi sinkronisasi.

---

## 7. Kebutuhan Non-Fungsional

- **Keandalan offline:** nol kehilangan data; sinkron idempoten.
- **Keamanan:** RLS di Supabase, autentikasi Supabase Auth, enkripsi data lokal di perangkat, audit log untuk aksi sensitif.
- **Performa:** input < 60 detik; daftar laporan tetap responsif dengan ribuan record lokal.
- **Skalabilitas:** desain multi-tenant (multi-estate) sejak awal.
- **Usability:** UI modern, clean, dominan putih; ramah dipakai mandor (tombol besar, alur cepat, bisa satu tangan, hemat baterai). 🔶 PERLU KEPUTUSAN: dukungan Bahasa Indonesia saja atau plus bahasa daerah/istilah lokal.
- **Perangkat target:** **Android & iOS**. Pengembangan **Android dulu** (mayoritas user lapangan/mandor pakai Android); **iOS menyusul** dan terutama untuk manajemen. Penggunaan React Native memungkinkan satu basis kode untuk keduanya. 🔶 Minor: tetapkan versi Android minimum (usulan Android 9/API 28+) & iOS minimum saat desain.
- **Audit & retensi:** kebijakan penyimpanan data & backup.

---

## 8. Rencana Rilis Bertahap

### Fase 1 — MVP (fondasi offline-first) — **DIKUNCI**
Target platform: **Android dulu**. Cakupan: Auth + RBAC dasar, master data inti, modul **Panen** + **Pengiriman** (paling bernilai untuk produksi), sinkronisasi offline-first via **PowerSync**, dashboard ringkas (web), verifikasi identitas via **NIK + foto opsional**, pencatatan oleh mandor (tanpa login karyawan).

### Fase 2 — Kelengkapan operasional + iOS + Face Recognition
Modul **Prunning, Pemupukan, Pemeliharaan**; rilis **iOS** (untuk manajemen); rekonsiliasi pengiriman penuh; dashboard analitik lengkap & ekspor; **fitur face recognition** (lihat §9 — termasuk penyiapan consent & kebijakan UU PDP, dikerjakan nanti).

### Fase 3 — Integrasi & lanjutan
Integrasi timbangan pabrik/SPB digital, modul premi/basis untuk payroll, notifikasi, peta lanjutan.

---

## 9. Analisis Fitur Face Recognition (Fase 2)

Anda menyebut ada aplikasi yang **memindai wajah karyawan lalu menampilkan kegiatan yang dilakukan orang tersebut**. Berikut pendapat dan kebutuhannya secara jujur dan skeptis.

### 9.1 Untuk apa sebenarnya fitur ini?
Bedakan dua kebutuhan yang sering tercampur:
1. **Absensi/verifikasi kehadiran** — memastikan karyawan benar-benar hadir saat kegiatan dicatat (anti "titip absen").
2. **Identifikasi cepat** — scan wajah → sistem menampilkan identitas + riwayat kegiatan orang itu.

Keduanya bisa, tapi implikasinya berbeda. Untuk lapangan sawit, nilai terbesar biasanya ada di **verifikasi kehadiran saat input panen/HK**, bukan sekadar menampilkan profil.

### 9.2 Pendekatan teknis yang disarankan: **on-device (di HP), offline**
Karena internet susah, face recognition **harus berjalan di perangkat**, bukan kirim foto ke server. Alurnya:
- **Enrollment** (sekali): daftarkan wajah tiap karyawan → simpan **face embedding** (vektor angka), bukan menyimpan foto mentah bila bisa dihindari.
- **Matching di lapangan:** kamera HP mendeteksi wajah → cocokkan dengan embedding lokal (1:N) → tandai kehadiran. Semua offline, hasil ikut antrian sinkron.

### 9.3 Komponen/Tools yang dibutuhkan
- **SDK face recognition on-device** dengan **liveness/anti-spoofing**. Opsi yang ditemukan: **KBY-AI FaceRecognition-React-Native**, **FacePlugin SDK**, **ZKTeco react-native-face-ai**. Semua menekankan pemrosesan di perangkat (data tidak keluar HP) dan deteksi anti-spoof (foto/video/topeng).

  > ⚠️ **Catatan skeptis:** klaim akurasi vendor (mis. "99,85% NIST") adalah klaim pemasaran pada kondisi ideal. Akurasi nyata di lapangan sawit jauh lebih menantang: cahaya matahari terik, wajah berkeringat/berdebu, helm/topi, kamera HP murah. **Wajib uji pilot (PoC)** sebelum komitmen lisensi.

- **Liveness detection** untuk mencegah scan foto/HP lain — ini yang membuat fitur bermakna untuk anti-kecurangan.
- **Penyimpanan embedding lokal** (mis. di SQLite/secure storage) + sinkronisasi embedding ke perangkat lain.
- **Lisensi SDK** — sebagian besar SDK akurat bersifat **komersial/berbayar** (biaya per perangkat/tahunan). Open-source ada tapi umumnya lebih lemah pada liveness.
- **Kamera & izin** (mis. VisionCamera) dan perangkat dengan kamera depan layak.

### 9.4 Risiko, Biaya & Kepatuhan (penting)
- **Biometrik = data pribadi sensitif** menurut UU PDP (UU No. 27/2022). Perlu **persetujuan tertulis karyawan**, kebijakan privasi, tujuan jelas, retensi & penghapusan, serta pengamanan. 🔶 PERLU KEPUTUSAN: apakah perusahaan siap dengan proses consent & kebijakan ini? Sebaiknya libatkan HR/legal.
- **Biaya lisensi SDK + waktu enrollment** ratusan/ribuan karyawan tidak kecil.
- **Akurasi lapangan** belum tentu memadai → siapkan **fallback** (pilih dari daftar / QR ID) agar operasi tidak macet saat wajah gagal dikenali.

### 9.5 Rekomendasi
Tunda ke **Fase 2** dan jalankan **pilot terbatas (1 divisi)** lebih dulu untuk mengukur akurasi & penerimaan karyawan. Untuk v1, **NIK + foto manual** sudah memberi 80% manfaat akuntabilitas dengan biaya & risiko jauh lebih rendah. Alternatif menengah yang murah & andal: **QR/barcode ID card** per karyawan.

---

## 10. Stack Teknologi (disepakati)

| Komponen | Teknologi |
|---|---|
| Mobile | React Native (disarankan via Expo) |
| Backend & DB | Supabase (Postgres, Auth, Storage, RLS) |
| Sinkron offline | PowerSync (rekomendasi) atau WatermelonDB |
| Web dashboard | React + Vite + Supabase |
| Desain | Modern, clean, dominan putih (lihat §12) |
| Face recognition (Fase 2) | SDK on-device komersial dengan liveness |

---

## 11. Asumsi & Dependensi
- Setiap mandor memiliki smartphone Android yang layak.
- Master data karyawan & blok tersedia / dapat dimigrasikan.
- Konektivitas tersedia minimal berkala (mess, kantor divisi, atau saat kembali) untuk sinkron.
- Integrasi pabrik (timbangan/SPB) tergantung kesediaan sistem PKS — kemungkinan Fase 3.

---

## 12. Catatan Desain/UX
Mengikuti instruksi proyek: **tren modern, clean, dominan putih**. Prinsip: kontras tinggi agar terbaca di bawah matahari, target sentuh besar, alur input minim langkah, status sinkron sangat jelas, ikon per divisi, dan mode hemat data/baterai.

---

## 13. Keputusan Final & Sisa Item Minor

### 13.1 Sudah dikunci ✅
1. Engine sinkron: **PowerSync + Supabase**.
2. Modul MVP: **Panen + Pengiriman** dulu.
3. Foto bukti: **opsional**.
4. Akses lintas estate: hanya **Manajer Kebun & Manajemen/Admin Grup**.
5. Platform: **Android & iOS**, Android dikerjakan dulu; iOS untuk manajemen.
6. Istilah/satuan: **janjang, divisi, basis**.
7. Face recognition: **Fase 2**, consent & implementasi dikerjakan nanti.
8. Login karyawan: **tidak ada**, dicatat mandor.

### 13.2 Item minor (diputus saat desain teknis, tidak menghambat)
- Batas ukuran/jumlah foto per laporan.
- Versi minimum Android (usulan API 28+) & iOS.
- Bahasa: ID saja atau tambah istilah lokal.
- Detail field opsional tiap modul (mis. mutu panen, dosis pupuk).

---

*Scope MVP sudah terkunci. Langkah berikutnya: **desain database & Row Level Security (Supabase)** → **konfigurasi PowerSync & sync rules per estate/divisi** → **wireframe UI mobile (Android)** → **rencana sprint Fase 1**. Beri tahu saya mau mulai dari yang mana.*
