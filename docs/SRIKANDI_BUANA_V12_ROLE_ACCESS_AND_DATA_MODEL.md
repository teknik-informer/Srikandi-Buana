# Srikandi Buana v12 — Kontrak Hak Akses, Ruang Lingkup Data, dan Model Domain

**Status:** fondasi desain untuk implementasi bertahap  
**Basis kode:** `feat/ecosystem-v11-5`  
**Tanggal:** 10 November 2026

Dokumen ini menetapkan batas keamanan dan bentuk data sebelum penambahan dashboard Pemerintah, Mitra/NGO, lahan pertanian, hasil panen, program bantuan, dan integrasi Manager.io. Dokumen ini bukan bukti bahwa fitur-fitur tersebut sudah aktif. Implementasi database dan autentikasi harus mengikuti kontrak ini, diuji di staging, lalu ditinjau sebelum rilis.

---

## 1. Keputusan arsitektur

1. **Satu platform, satu identitas, satu sumber kebijakan akses.** Empat dashboard adalah pengalaman kerja yang berbeda di atas data inti yang sama; bukan empat aplikasi dan empat basis data yang saling menyalin.
2. **Enam role internal tetap dipertahankan.** Role yang saat ini valid adalah `admin`, `ketua`, `sekretaris`, `bendahara`, `koordinator`, dan `anggota`. Jangan mengganti keenamnya dengan empat role dashboard.
3. **Pemerintah dan NGO adalah akses eksternal berbasis pemberian wewenang (access grant).** Keduanya tidak boleh dipaksakan ke kolom `users.role` yang saat ini dibatasi enam role internal. Organisasi eksternal, penanggung jawab, tujuan akses, proyek, masa berlaku, dan pencabutan izin harus direkam terpisah.
4. **Batas organisasi diperiksa lebih dahulu.** Setiap query privat harus dibatasi ke `workspace_owner`/owner yang benar sebelum menerapkan scope program, proyek, mitra, atau pemilik data.
5. **Akses ditentukan oleh role + scope + tujuan + status.** Role saja tidak cukup. Pengurus, pemerintah, dan NGO tidak otomatis memperoleh akses ke seluruh data anggota, seluruh proyek, atau seluruh transaksi.
6. **Pemeriksaan akses wajib di server/API.** Menyembunyikan menu atau tombol bukan pengamanan. API, file, pencarian, ekspor, notifikasi, unduhan, ringkasan agregat, dan endpoint laporan harus menerapkan policy yang sama.
7. **Satu sumber kebenaran akuntansi.** Jika Manager.io ditetapkan sebagai buku besar resmi, portal mengelola anggaran operasional, persetujuan, realisasi program, dan bukti; Manager.io menjadi sumber jurnal resmi. Jangan mem-posting jurnal yang sama ke dua sistem.

### Kondisi fondasi yang sudah ada

- `users.role` dibatasi pada enam role internal melalui migrasi `002_roles.sql`.
- Akun anggota saat ini divalidasi terhadap record anggota berstatus aktif dan terverifikasi.
- Principal sudah membawa `workspace_owner` sebagai `userId`, `memberId`, dan `programIds`.
- Kebijakan lama sudah membatasi anggota ke record miliknya dan koordinator ke program yang ditugaskan.
- Database utama menggunakan tabel `records` berbasis `owner` dan `kind`, serta tabel operasional, kas, aset, perdagangan, dan buku besar yang sudah ada.

Konsekuensinya: akses eksternal memerlukan jalur autentikasi dan otorisasi yang dirancang secara eksplisit. Jangan mengubah constraint role atau melewati pemeriksaan keanggotaan sebagai jalan pintas.

---

## 2. Peta pengalaman dashboard

| Pengalaman | Pengguna | Tujuan utama | Batas data |
|---|---|---|---|
| **Administrasi / Pengurus** | Admin, Ketua, Sekretaris, Bendahara, Koordinator | Mengelola organisasi, anggota, program, aset, keuangan, publikasi, dan pertanggungjawaban | Role internal, workspace, serta penugasan program |
| **Portal Anggota** | Anggota terverifikasi | Profil, lahan milik/kelolaan, agenda, informasi harga, pengajuan, dan status bantuan miliknya | Data milik anggota dan informasi publik |
| **Portal Pemerintah** | Akun institusi pemerintah yang disetujui | Memantau program, sasaran bantuan, capaian, komoditas, dokumen, dan laporan yang diizinkan | Instansi, skema bantuan, wilayah, dan proyek yang secara eksplisit diberikan |
| **Portal Mitra / NGO** | Akun yayasan, NGO, donor, atau mitra | Memantau proyek dukungan, anggaran hibah, milestone, bukti, hasil, dan evaluasi | Organisasi mitra dan proyek/funding yang ditugaskan |

Dashboard administrasi tetap satu workspace dengan navigasi yang disesuaikan role. Akun pemerintah dan mitra hanya melihat portal eksternal setelah grant mereka aktif. Auditor dapat ditambahkan sebagai persona **read-only** terpisah pada tahap berikutnya; bukan role yang otomatis mendapat akses.

---

## 3. Matriks kewenangan

Kode: **FULL** = kewenangan penuh dalam workspace; **RW** = baca/tulis sesuai validasi; **R** = baca; **A** = menyetujui keputusan pada workflow yang ditentukan; **S** = baca/tulis terbatas pada scope yang ditugaskan; **OWN** = data milik sendiri; **AGG** = agregat yang sudah disetujui; **—** = tidak ada akses.

Matriks ini adalah **target policy**. Implementasi tetap harus memeriksa kondisi status, kepemilikan, dan workflow; matriks tidak boleh diterjemahkan menjadi akses global tanpa filter data.

| Modul / data | Admin | Ketua | Sekretaris | Bendahara | Koordinator | Anggota | Pemerintah | NGO/Mitra |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Ringkasan organisasi | FULL | R/A | R | R | S | OWN | AGG/S | S |
| Direktori anggota | FULL | R | RW | — | S terbatas | OWN | AGG; identitas hanya dengan dasar hukum dan izin khusus | Data samaran/agregat; identitas hanya per kasus yang sah |
| Profil dan akun | FULL | R terbatas | RW data organisasi | — | — | OWN | — | — |
| Lahan dan luas garapan | FULL | R | Verifikasi administratif terbatas | — | S | OWN; ajukan perubahan | AGG/S wilayah atau program | S proyek, utamakan data agregat |
| Siklus tanam dan hasil panen | FULL | R | R administratif | R ringkasan biaya bila berwenang | S | OWN; input data sendiri | AGG/S komoditas dan periode | S proyek/komoditas |
| Program dan kegiatan | FULL | A/R | RW | R | S/RW | R informasi publik dan pengajuan | S program yang ditetapkan | S proyek dukungan |
| Anggaran dan hibah | FULL | A/R | R dokumen | RW sesuai otorisasi | S terbatas | OWN informasi bantuan | S sesuai skema/instansi | S hanya hibah/proyek sendiri |
| Kas, jurnal, buku besar | FULL | R/A workflow | — | RW, termasuk posting sesuai pemisahan tugas | —; bukti biaya proyek saja | OWN bukti/pengajuan | AGG laporan resmi, bukan jurnal mentah | AGG/S laporan proyek, bukan buku besar lengkap |
| Aset dan alat pertanian | FULL | R/A sesuai workflow | R administrasi | RW pencatatan aset | S pemakaian program | OWN pengajuan/peminjaman | S distribusi program | S aset proyek sendiri |
| Distribusi bantuan | FULL | A | RW verifikasi berkas | RW bukti/penyaluran sesuai tugas | S pelaksanaan | OWN status dan tanda terima | S skema/daftar yang secara sah ditugaskan | S penerima dan output proyek sendiri |
| Dokumen dan LPJ | FULL | R/A | RW dokumen organisasi | RW laporan keuangan | S laporan program | OWN dokumen pribadi | S dokumen resmi yang ditetapkan | S dokumen proyek hibah |
| Publikasi dan galeri | FULL | R/A | RW/publikasi | — | S unggah dokumentasi | R publik | R konten publik | R konten publik |
| Pengaturan, user, dan hak akses | FULL | R audit | — | — | — | — | — | — |
| Jejak audit | FULL | R ringkasan | R sesuai tugas | R keuangan | R scope penugasan | R aktivitas akun sendiri | R aktivitas aksesnya sendiri | R aktivitas aksesnya sendiri |

### Aturan tambahan yang tidak boleh dilewati

- Ketua dapat menyetujui keputusan tertentu, tetapi itu tidak otomatis memberi hak mengubah jurnal keuangan.
- Bendahara mengelola transaksi dan aset sesuai pemisahan tugas; hak mengubah akun, mengundang pengguna, atau mengubah policy tetap terpisah.
- Koordinator hanya menjangkau `programIds` yang ditugaskan dan data turunan program tersebut.
- Anggota hanya dapat membaca/mengubah field profil yang diizinkan, lahan yang dimilikinya atau dikelolanya, pengajuan miliknya, dan status bantuan miliknya.
- Pemerintah tidak memperoleh daftar NIK atau seluruh direktori anggota hanya karena memiliki akun pemerintah.
- NGO A tidak boleh melihat proyek, penerima, anggaran, bukti, maupun komunikasi milik NGO B.
- Ekspor PDF/Excel mengikuti policy yang sama dengan layar. Berkas yang bisa dibuka lewat URL langsung tetap harus memeriksa akses.
- Data yang dicabut izinnya tidak boleh tetap terlihat melalui cache, tautan unduhan lama, notifikasi, atau endpoint pencarian.

---

## 4. Model scope dan klasifikasi data

Setiap permintaan akses privat harus lolos seluruh pemeriksaan yang relevan:

1. **Identity:** akun aktif dan sesi sah.
2. **Workspace:** data berada pada workspace yang tepat (`owner`/`workspace_owner`).
3. **Audience/role:** jenis pengguna diizinkan untuk tindakan tersebut.
4. **Grant:** untuk pihak eksternal, izin aktif, belum kedaluwarsa, dan belum dicabut.
5. **Assignment:** organisasi, program, proyek, sumber dana, wilayah, atau kasus penerima cocok dengan penugasan.
6. **Purpose and classification:** data sesuai tujuan pemberian izin dan klasifikasi kerahasiaannya.
7. **Workflow state:** tindakan hanya tersedia pada status yang sah, misalnya submitted, approved, atau completed.
8. **Audit:** perubahan hak akses, pembukaan dokumen sensitif, ekspor, dan keputusan penting tercatat.

### Klasifikasi minimum

| Kelas | Contoh | Kebijakan |
|---|---|---|
| Publik | Berita, pengumuman publik, agenda terbuka | Dapat dibaca tanpa akun |
| Internal | Data kegiatan, daftar tugas, administrasi umum | Pengurus sesuai role |
| Rahasia organisasi | Kontak anggota, data kelompok, dokumen internal | Akses minimum sesuai kebutuhan |
| Pribadi terbatas | NIK, alamat detail, rekening, berkas identitas | Field-level authorization, enkripsi, akses tercatat |
| Keuangan terbatas | Jurnal, rekening, bukti pembayaran, rincian penerima | Bendahara/admin dan auditor yang ditugaskan |
| Hibah/proyek terbatas | Proposal, anggaran, bukti, evaluasi | Hanya pengurus berwenang dan mitra pada proyeknya |

**NIK:** jangan menyimpan NIK dalam teks biasa atau menampilkannya di tabel/ekspor umum. Sebelum fitur ini dibuat, tetapkan dasar pemrosesan, minimisasi field, enkripsi pada level aplikasi/KMS, masking, rotasi kunci, pembatasan ekspor, dan audit pembukaan. Dokumen ini tidak mengasumsikan bahwa data NIK sudah tersedia atau tersimpan dalam database saat ini.

---

## 5. Model data target

Gunakan tabel relasional untuk entitas dan relasi yang harus konsisten. Tabel `records` tetap dapat dipakai untuk konten fleksibel, tetapi bukan tempat utama untuk relasi proyek, hak akses eksternal, transaksi, maupun data yang membutuhkan constraint dan pelacakan.

### A. Identitas eksternal dan pemberian akses

| Tabel | Kolom inti yang disarankan | Constraint / fungsi |
|---|---|---|
| `external_organizations` | `id`, `type`, `legal_name`, `registration_ref`, `verification_status`, `created_at`, `updated_at` | `type`: government/ngo/partner; nama legal dan status verifikasi; nomor registrasi disimpan sesuai klasifikasi |
| `workspace_access_grants` | `id`, `workspace_owner`, `user_id`, `external_organization_id`, `audience`, `purpose`, `status`, `valid_from`, `valid_until`, `approved_by`, `revoked_at`, `created_at` | Grant harus disetujui pengurus yang berwenang; masa berlaku eksplisit; pencabutan tidak menghapus audit |
| `workspace_access_project_scopes` | `grant_id`, `project_id`, `scope_level` | Relasi many-to-many grant ↔ project; unik per grant/project |
| `workspace_access_audit` | `id`, `grant_id`, `actor_id`, `action`, `reason`, `created_at` | Rekam pembuatan, perubahan, pemakaian sensitif, kedaluwarsa, dan pencabutan grant |

Jangan menerima `organization_id`, `project_id`, atau scope dari browser sebagai bukti hak. Server harus memuat grant aktif dari database. Untuk akun yang dapat bergabung ke beberapa workspace, bentuk relasi identitas-ke-workspace harus mendukung lebih dari satu keanggotaan tanpa menggandakan kredensial; migrasinya perlu direncanakan terpisah dari penambahan dashboard.

### B. Pertanian

| Tabel | Kolom inti yang disarankan | Fungsi |
|---|---|---|
| `farm_parcels` | `id`, `workspace_owner`, `member_id`, `name`, `area_value`, `area_unit`, `location_ref`, `land_status`, `verification_status`, `verified_by`, `verified_at` | Satu bidang lahan/garapan per record; luas dan satuan tervalidasi; bukti kepemilikan/pengelolaan terpisah |
| `crop_cycles` | `id`, `parcel_id`, `commodity_id`, `season`, `planting_date`, `expected_harvest_date`, `status` | Siklus tanam pada bidang tertentu |
| `harvest_records` | `id`, `crop_cycle_id`, `harvest_date`, `quantity`, `unit`, `grade`, `unit_price`, `verification_status`, `recorded_by` | Hasil panen aktual dengan satuan jelas, tanggal, sumber, dan status verifikasi |
| `commodities` | `id`, `code`, `name`, `unit`, `active` | Referensi komoditas dan satuan standar |

Luas lahan, jumlah petani, dan hasil panen dalam dashboard harus berasal dari record yang telah diverifikasi, bukan perkiraan dari jumlah anggota atau input yang belum diperiksa. Lokasi persil dan koordinat presisi termasuk data sensitif.

### C. Program, hibah, dan dampak

| Tabel | Kolom inti yang disarankan | Fungsi |
|---|---|---|
| `funding_sources` | `id`, `workspace_owner`, `source_name`, `source_type`, `funder_organization_id`, `agreement_ref`, `period_start`, `period_end`, `status` | Sumber pendanaan dan perjanjian |
| `projects` | `id`, `workspace_owner`, `funding_source_id`, `partner_organization_id`, `code`, `name`, `start_date`, `end_date`, `status` | Proyek yang punya organisasi pelaksana, mitra, dan periode |
| `project_budget_lines` | `id`, `project_id`, `account_code`, `line_name`, `budget_amount`, `currency` | Pagu per kategori/akun; bukan jurnal |
| `project_milestones` | `id`, `project_id`, `title`, `indicator`, `target_value`, `unit`, `due_date`, `status` | Target dan tenggat capaian |
| `project_progress_updates` | `id`, `milestone_id`, `reported_value`, `narrative`, `reported_by`, `reported_at`, `verification_status` | Pelaporan progres dan verifikasi |
| `project_evidence` | `id`, `project_id`, `progress_update_id`, `storage_key`, `mime`, `checksum`, `visibility`, `consent_ref`, `uploaded_by`, `created_at` | Bukti dokumen/foto/video; akses melalui handler terotorisasi |

Anggaran proyek harus dibedakan dari realisasi dan jurnal. Target dan capaian tidak boleh diubah diam-diam; koreksi menyimpan nilai lama, aktor, alasan, dan timestamp.

### D. Program bantuan dan distribusi

| Tabel | Kolom inti yang disarankan | Fungsi |
|---|---|---|
| `aid_programs` | `id`, `workspace_owner`, `funding_source_id`, `name`, `eligibility_rules`, `period_start`, `period_end`, `status` | Definisi skema bantuan |
| `aid_recipients` | `id`, `aid_program_id`, `member_id`, `eligibility_status`, `verification_status`, `verified_by`, `verified_at` | Relasi penerima dan pemeriksaan kelayakan |
| `aid_distributions` | `id`, `aid_program_id`, `distribution_date`, `location_ref`, `status`, `approved_by` | Satu kegiatan penyaluran |
| `aid_distribution_items` | `id`, `distribution_id`, `recipient_id`, `item_type`, `quantity`, `value_amount`, `receipt_evidence_id`, `received_at` | Barang/nilai yang benar-benar diterima |

Penerima bantuan bukan sekadar baris ekspor. Terapkan verifikasi, alasan kelayakan, pencegahan duplikasi, bukti serah terima, koreksi yang dapat diaudit, dan akses kasus yang minimum.

### E. Integrasi akuntansi Manager.io

| Tabel | Kolom inti yang disarankan | Fungsi |
|---|---|---|
| `accounting_connections` | `id`, `workspace_owner`, `provider`, `business_ref`, `credential_secret_ref`, `status`, `last_success_at` | Konfigurasi koneksi per business; token hanya direferensikan ke secret store |
| `accounting_mappings` | `id`, `connection_id`, `local_code`, `external_account_key`, `mapping_type` | Pemetaan akun/pos program ke akun Manager.io |
| `accounting_sync_batches` | `id`, `connection_id`, `direction`, `started_at`, `finished_at`, `status`, `cursor_ref` | Satu batch sinkronisasi |
| `accounting_external_refs` | `id`, `connection_id`, `local_record_type`, `local_record_id`, `external_record_id`, `external_updated_at` | Idempotensi dan tautan record eksternal |
| `accounting_sync_events` | `id`, `batch_id`, `event_type`, `record_ref`, `status`, `attempt_count`, `error_code`, `created_at` | Jejak berhasil/gagal dan retry |

**Tahap pertama: sinkronisasi satu arah Manager.io → portal** untuk ringkasan dan laporan yang telah dipetakan. Jangan mengirim jurnal balik dari portal sampai proses rekonsiliasi, idempotensi, otorisasi posting, dan pengujian duplikasi selesai. Kunci API tidak pernah dikirim ke browser, log, atau file konfigurasi yang masuk Git. Koneksi ke Manager.io Desktop pada komputer lokal memerlukan konektor/bridge jaringan yang aman; endpoint localhost tidak dapat dianggap otomatis dapat diakses dari server Vercel.

---

## 6. Kontrak otorisasi pada API

Implementasi harus menyediakan satu layanan policy server-side dengan konteks setidaknya:

`principal`, `action`, `resourceType`, `resourceId`, `workspaceOwner`, `projectId`, `programId`, `partnerOrganizationId`, `dataClassification`, `purpose`.

Urutan pemeriksaan:

1. Validasi sesi dan status akun.
2. Muat principal dan workspace dari sisi server.
3. Tolak bila workspace resource berbeda.
4. Untuk internal, evaluasi role, ownership, dan penugasan program.
5. Untuk eksternal, muat grant aktif dari database dan validasi organisasi, audience, masa berlaku, tujuan, proyek, serta tingkat scope.
6. Terapkan field-level projection sebelum serialisasi respons.
7. Untuk berkas, lakukan pemeriksaan ulang pada setiap permintaan unduh; jangan mengandalkan URL publik permanen.
8. Tulis audit event untuk perubahan izin, pengungkapan data pribadi, ekspor, dan tindakan yang berdampak.
9. Saat grant dicabut/dikedaluwarsakan, akses berikutnya harus gagal tanpa menunggu sesi login dibuat ulang.

Setiap query privat mengikuti pola tenant-first: `workspace_owner = principal.workspaceOwner` dan kemudian filter relasi scope. Jangan mengambil banyak data lalu hanya menyaringnya di React.

### Pengamanan ekspor dan lampiran

- Ekspor memakai query dan projection yang sama dengan layar.
- Nama file, metadata EXIF, koordinat GPS, dan thumbnail foto juga dapat membocorkan data; sanitasi sesuai klasifikasi.
- File privat disajikan melalui route terotorisasi dengan nama objek yang tidak dapat ditebak.
- Batas ukuran, MIME, checksum, dan hak penggunaan/izin publikasi diperiksa saat unggah.
- Audit menyimpan siapa, kapan, alasan, jenis data, dan lingkup akses; jangan merekam nilai NIK atau token rahasia ke log.

---

## 7. Rute dan navigasi yang dituju

| Rute target | Pengalaman | Syarat |
|---|---|---|
| `/dashboard` | Resolver dashboard | Menentukan landing berdasarkan principal dan grant aktif |
| `/dashboard/organisasi` | Administrasi/pengurus | Role internal yang sesuai |
| `/dashboard/anggota` | Portal anggota | Akun anggota terverifikasi dan aktif |
| `/dashboard/pemerintah` | Portal pemerintah | Grant pemerintah aktif dengan scope yang cocok |
| `/dashboard/mitra` | Portal NGO/mitra | Grant mitra aktif dan assignment proyek |
| `/dashboard/akuntansi` | Akuntansi | Role internal dan kewenangan keuangan; bukan otomatis portal partner |

Rute di atas adalah tujuan navigasi. Jangan membuat halaman portal eksternal sebelum jalur autentikasi, policy API, dan scope query tersedia. Rute lama harus tetap kompatibel selama migrasi; alias baru tidak boleh menjadi jalan pintas melewati guard.

---

## 8. Manager.io dan tata kelola keuangan

- Tentukan secara formal sistem yang menjadi buku besar resmi. Jika Manager.io yang resmi, portal tidak boleh membuat jurnal kedua untuk transaksi yang sama.
- Portal menyimpan pagu, persetujuan, jadwal, penerima, milestone, bukti, dan hasil program.
- Manager.io menyimpan bagan akun, jurnal, buku besar, dan laporan akuntansi resmi.
- Setiap ringkasan yang ditampilkan harus mencantumkan business, periode, waktu sinkronisasi, status koneksi, dan sumber angka.
- Rekonsiliasi per periode membandingkan jumlah transaksi, saldo akun, nilai kontrol, dan daftar transaksi yang belum terpetakan.
- Kegagalan sinkronisasi tidak boleh menghapus data sebelumnya atau menampilkan angka seolah-olah mutakhir.
- Perubahan mapping membutuhkan approval dan audit trail.

---

## 9. Tahapan implementasi dan gerbang rilis

| Tahap | Pekerjaan | Gerbang selesai |
|---|---|---|
| 0. Fondasi | Kontrak role, scope, klasifikasi, model relasi, threat review | Matriks disetujui; API dan data yang terdampak terinventarisasi |
| 1. Identitas eksternal | Undangan instansi/NGO, grant, masa berlaku, pencabutan, audit | Uji lintas workspace, grant kedaluwarsa, grant dicabut, dan akun tanpa grant semuanya ditolak |
| 2. Data pertanian | Persil, siklus tanam, komoditas, hasil panen, verifikasi | Uji satuan luas/hasil, duplikasi, pemilik, verifikasi, dan agregasi |
| 3. Hibah dan program | Sumber dana, proyek, pagu, milestone, progres, evidence | NGO A tidak dapat membaca NGO B; lampiran privat tidak dapat diakses lewat URL langsung |
| 4. Bantuan | Skema, kelayakan, penerima, distribusi, bukti terima | Tidak ada duplikasi penerima/penyaluran tanpa jejak koreksi |
| 5. Dashboard | Portal anggota, pemerintah, mitra dan navigasi adaptif | API, halaman, pencarian, ringkasan, ekspor, dan notifikasi konsisten dengan policy |
| 6. Manager.io | Koneksi server-side, mapping, pull satu arah, rekonsiliasi | Idempotensi, retry, selisih, credential isolation, dan timestamp diuji |
| 7. Pelaporan | LPJ, PDF/Excel, indikator dampak, audit | Angka dapat ditelusuri ke sumber, periode, bukti, dan penanggung jawab |

### Pengujian keamanan wajib

- Anggota A tidak dapat membaca atau mengubah data Anggota B.
- Koordinator tidak dapat membaca program di luar assignment.
- NGO A tidak dapat membaca data NGO B, meskipun mengetahui ID proyek atau URL file.
- Pemerintah hanya dapat membaca skema/wilayah/proyek yang diberikan; tanpa grant, hasilnya harus ditolak.
- Grant yang kedaluwarsa atau dicabut langsung gagal pada permintaan berikutnya.
- Pengubahan `workspace_owner`, `project_id`, `partner_id`, atau `member_id` pada payload tidak memperluas akses.
- Endpoint export, pencarian, notifikasi, metrik agregat, preview dokumen, dan lampiran diuji terhadap kebocoran yang sama.
- Seluruh workflow approval memisahkan pemohon, pemberi persetujuan, dan pelaksana bila proses menuntut pemisahan tugas.
- Uji migrasi dilakukan pada database staging dengan snapshot/backup dan pemeriksaan data lama.

---

## 10. Hal yang sengaja belum dilakukan

Pada tahap fondasi ini **tidak** dilakukan perubahan pada constraint role produksi, login, database produksi, data anggota, transaksi, jurnal, koneksi Manager.io, domain, atau alias deployment. Tidak ada migrasi yang dijalankan.

Langkah coding pertama setelah kontrak ditinjau adalah membangun tabel grant dan jalur autentikasi eksternal secara terpisah, menulis policy server-side beserta integration tests, lalu menguji tenant isolation di staging. Setelah itu baru membangun dashboard pemerintah/mitra dan domain pertanian/hibah.

**Kriteria utama:** tidak ada dashboard baru yang boleh menampilkan data privat sebelum otorisasi server, pemisahan tenant, audit, dan pengujian lintas organisasi lulus.


---

## Tahap 2 — Domain pertanian dan ringkasan mitra (10 November 2026)

Tahap ini memperluas fondasi akses eksternal dengan data pertanian terstruktur. Migrasi baru adalah `migrations/006_agriculture_domain.sql`; migrasi tersebut **belum diterapkan** ke Neon atau lingkungan produksi.

### Entitas dan relasi

- `agriculture_commodities`: katalog komoditas dengan satuan dasar yang eksplisit.
- `farm_parcels`: register lahan per workspace, terhubung ke satu record `anggota` melalui foreign key komposit `(member_id, workspace_owner, member_kind)`. Luas disimpan sebagai meter persegi. Form tidak meminta NIK, alamat pribadi, atau koordinat GPS.
- `crop_cycles`: musim/siklus tanam, komoditas, luas tanam, tanggal tanam dan perkiraan panen. Siklus terkait ke lahan dan komoditas pada workspace yang sama.
- `harvest_records`: kuantitas hasil panen dengan satuan dasar yang tercatat; unit tidak dijumlahkan silang.
- `agriculture_audit`: catatan aktor, peran, tindakan, alasan, target dan waktu perubahan.

Foreign key komposit dan unique index digunakan untuk mencegah pencampuran anggota, lahan, komoditas, dan siklus dari workspace berbeda. Migrasi tidak membuat contoh/angka operasional.

### Alur kerja dan verifikasi

Menu **Pengelolaan Pertanian** berada di bagian Program dan Kegiatan serta menjadi bagian dari dashboard Organisasi. Data dapat dicatat oleh Administrator, Ketua, atau Koordinator yang ditugaskan pada program pertanian (program ID `3`). Hanya Administrator dan Ketua yang dapat mengesahkan atau mengembalikan catatan.

Hierarki verifikasi diterapkan di server:
1. Lahan hanya dapat dikaitkan dengan anggota aktif yang datanya telah terverifikasi.
2. Siklus tanam baru dapat diverifikasi setelah lahannya diverifikasi.
3. Hasil panen baru dapat diverifikasi setelah siklus tanam dan lahannya terverifikasi.
4. Penolakan memerlukan alasan; setiap pencatatan dan keputusan verifikasi ditulis ke audit.

### Data yang ditampilkan ke instansi dan mitra

Portal eksternal mengambil ringkasan server-side melalui `src/lib/external-agriculture-summary.ts`, dan hanya untuk grant aktif dengan scope yang cocok. Jenis agregat yang dapat diberikan sekarang dibatasi pada:

- `members`: hitungan anggota aktif dan terverifikasi; ditampilkan mulai lima anggota.
- `land`: luas lahan terverifikasi; dihitung hanya dari lahan aktif milik anggota yang masih aktif dan terverifikasi. Ringkasan memerlukan sedikitnya tiga anggota berbeda yang berkontribusi.
- `harvest`: hasil panen terverifikasi, dikelompokkan per komoditas dan satuan; ringkasan tiap kelompok memerlukan sedikitnya tiga anggota berbeda.

Kelompok yang tidak mencapai ambang privasi disamarkan; bukan ditampilkan sebagai nol. Data pribadi, kontak, koordinat presisi, catatan mentah dan transaksi akuntansi tidak masuk respons portal. Grant lama untuk `aid`, `project_progress`, dan `project_finance` tidak lagi dapat membuka akses. Data proyek, bantuan, hibah, serta integrasi Manager.io belum menjadi bagian dari tahap ini.

### Pemeriksaan dan rilis

Workflow CI menambahkan `npm run test:agriculture`. Suite ini menguji migrasi, foreign key lintas-workspace, validasi satuan, hak koordinator, hierarki verifikasi, batas scope dan ambang privasi, lalu workflow menjalankan kembali typecheck dan production build.

CI pada commit cabang tahap 2: **Run #1429 — SUCCESS**. Keberhasilan CI tidak sama dengan penerapan migrasi atau rilis produksi. Sebelum rilis, lakukan backup, terapkan migrasi 006 melalui jalur migrasi terkontrol, smoke test pada staging dengan data uji yang disetujui, dan baru kemudian review serta merge PR.
