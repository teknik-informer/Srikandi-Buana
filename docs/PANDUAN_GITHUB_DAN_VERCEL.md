# Panduan Publikasi SRIKANDI BUANA

- GitHub: `teknik-informer/Srikandi-Buana`, branch `main` (terkonfirmasi kosong saat pemeriksaan awal).
- Vercel existing: `admin-dashboard` pada tim `teknik-informer`; domain produksi `srikandibuana.vercel.app`.
- GitHub CLI/git push langsung dari runtime ChatGPT tidak dapat mengakses github.com melalui DNS; GitHub connector memiliki akses akun, tetapi tidak mendukung unggah arsip lokal sekaligus secara langsung.
- Gunakan `Publikasikan_ke_GitHub.command` di Mac untuk mengirim source. Jangan hanya menambah README.
- Gunakan `Deploy_Preview_Vercel.command` sesudah membuktikan `npm ci`, typecheck, test, build lulus.
- Setelah Preview, lakukan smoke test login/role, keanggotaan, dokumen, unggahan, notulen, navigasi, dan transaksi dengan database staging.
- Jangan pernah menjalankan migrasi terhadap database produksi sebagai bagian pengujian Preview.
- Promosi ke produksi harus melalui persetujuan dan QA; kode ini masih staging.
