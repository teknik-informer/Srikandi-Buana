# Release Gate — SRIKANDI BUANA v14

**Target:** Vercel Preview untuk branch `feat/workspace-v14-nextadmin-architecture`.
**Production:** tetap pada versi aktif sampai persetujuan rilis terpisah.

## Gate 1 — Konsistensi kode

- [ ] `package.json`, lockfile, README, metadata dan dokumen menyebut versi yang sama.
- [ ] Tidak ada import yang hilang, route tidak valid, atau komponen yang belum terhubung.
- [ ] Semua dashboard dan menu memiliki pemilik data yang jelas.
- [ ] Help Center hanya memuat panduan/template; input operasional berada pada modul sumber.
- [ ] Template yang belum dipetakan secara eksplisit dinyatakan belum aktif.

## Gate 2 — Kualitas dan keamanan

Jalankan pada commit yang sama:

```bash
npm ci
npm run test:ecosystem
npm run test:navigation:compat
npm run test:terminology
npm run test:integration:staging
npm run typecheck
npm test
npm run build
```

- [ ] Semua status CI hijau pada SHA rilis yang persis sama.
- [ ] Uji enam role pada route yang diizinkan dan dilarang.
- [ ] API memvalidasi sesi, owner, record scope, input, CSRF/origin dan file access.
- [ ] Monitoring dan laporan tidak membocorkan data lintas owner/role.
- [ ] Ekspor CSV melindungi data pribadi dan formula injection.
- [ ] Error tidak menampilkan kredensial, query, stack trace atau data privat.

## Gate 3 — Data dan migrasi

- [ ] Preview memakai database staging, bukan production.
- [ ] Backup staging dibuat dan restore diuji.
- [ ] Migrasi diperiksa untuk idempotensi, constraint, index, relasi dan audit trail.
- [ ] Jumlah record sebelum/sesudah direkonsiliasi.
- [ ] Relasi orphan, duplikasi, file hilang dan data tanpa owner diperiksa.
- [ ] Jalur rollback dan pemulihan data diuji/didokumentasikan.
- [ ] Tidak ada penghapusan data lama sebelum pemilik data menyetujui hasil rekonsiliasi.

## Gate 4 — QA browser

- [ ] Login/logout, session expiry, refresh dan deep link.
- [ ] Semua tujuh dashboard dan seluruh menu role.
- [ ] Form create/edit/validation/submit/review/correction.
- [ ] Monitoring, laporan, filter tanggal, pagination dan ekspor.
- [ ] Help Center, semua link template dan pemetaan field.
- [ ] Empty/loading/error/retry/forbidden state.
- [ ] Desktop, tablet dan mobile; keyboard, focus, zoom dan screen reader.
- [ ] Tidak ada double header, layout overflow, tombol inert, link mati atau jarak workspace tidak konsisten.

## Gate 5 — Persetujuan dan promosi

Preview dapat dinyatakan QA-ready hanya setelah Gate 1–4 dibuktikan. Production promotion membutuhkan:
1. PR review dan persetujuan pemilik sistem.
2. CI hijau untuk commit yang akan dipromosikan.
3. Backup database production dan jadwal migrasi yang disetujui.
4. Rencana cutover, smoke test dan rollback.
5. Persetujuan eksplisit untuk mengganti production alias.

Jangan mempromosikan Preview hanya karena status Vercel `READY`.
