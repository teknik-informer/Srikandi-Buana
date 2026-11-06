# Rencana rilis GitHub dan Vercel

## Target yang telah diidentifikasi

- Vercel team: Teknik Informer (`team_kcnuw0SuwGaspjQJOHScJcim`)
- Vercel project: `admin-dashboard` (`prj_MfuJUUQQo4nlDtgOnUimyulsoPgN`)
- Domain produksi: `srikandibuana.vercel.app`
- Deployment produksi terakhir: `dpl_89CEwSmYguaqeync5U6MoyJCTbmn`
- Sumber git yang terhubung pada proyek Vercel: **tidak ditemukan**.
- GitHub yang terhubung saat audit: `nukedu`; repositori `Istana-Idaman` dan `NUKEDU` **bukan** repositori Srikandi dan tidak boleh ditimpa.

## Langkah aman setelah repositori privat disediakan

1. Buat repositori **PRIVATE** bernama `srikandi-buana` pada akun GitHub yang Anda kendalikan.
2. Ekstrak ZIP ini, periksa tidak ada `.env`, token, atau password; jangan mengunggah file environment.
3. Di folder source jalankan:

```bash
git init
git branch -M main
git add .
git commit -m "chore: baseline Srikandi Buana enterprise v11.3"
git remote add origin https://github.com/OWNER/srikandi-buana.git
git push -u origin main
```

Ganti `OWNER` dengan akun yang berwenang. Gunakan login GitHub/SSH pada komputer Anda; jangan memasukkan token ke dalam perintah atau file.

4. Verifikasi workflow `.github/workflows/quality.yml` hijau setelah instalasi dependency; perbaiki kegagalan sebelum merge/release.
5. Pada Vercel, hubungkan repositori privat ke proyek `admin-dashboard` melalui **Project Settings > Git**. Jangan membuat proyek paralel yang mengambil alih domain.
6. Isi environment variables staging dari sistem sumber yang dikelola aman (jangan ekspor ke GitHub/ZIP). Terapkan migrasi hanya pada DB staging.
7. Deploy ke **preview/staging**, uji autentikasi, semua role, CRUD, izin unggah, laporan kas, cetak notulen, responsivitas, dan audit log.
8. Setelah hasil pemeriksaan nyata lulus, lakukan promosi terkontrol ke production beserta prosedur rollback.

## Mengapa belum otomatis dipublikasikan?

Konektor GitHub yang tersedia tidak mempunyai aksi membuat repositori baru; yang dapat diakses bukan proyek Srikandi. Lingkungan pengujian tidak berhasil memasang seluruh dependensi, sehingga publikasi produksi akan membahayakan situs yang aktif. Konektor Vercel juga tidak menyediakan mekanisme langsung untuk menerima folder lokal ini sebagai deployment sumber yang terverifikasi.

**Tidak ada penghapusan, migrasi produksi, perubahan variabel environment, atau perubahan domain yang dilakukan dalam pekerjaan ini.**
