# Animasi Opening & Loading — Srikandi Buana

Panduan singkat untuk animasi pembuka dan status muat yang diperbarui pada November 2026. Seluruh elemen visual berasal dari tiga berkas logo resmi yang diberikan—tidak ada ilustrasi tanaman buatan baru. Animasi terinspirasi ritme sinematik Netflix, tetapi tetap memakai identitas hijau–emas Srikandi Buana (bukan meniru warna atau logo Netflix).

## Perilaku

| Permukaan | Perilaku | Durasi |
|---|---|---:|
| Opening (kunjungan pertama per sesi) | Layar penuh hijau tua, logo vertikal resmi muncul dalam panel terang, tagline dan progress bar mengikuti, lalu curtain fade ke situs | ~2 detik |
| Loading rute/root | Versi ringkas dari rangkaian yang sama, tanpa skip button | Selama suspense fallback |
| Loading halaman publik | Versi ringkas di dalam layout publik (header/footer tetap terlihat) | Selama suspense fallback |
| `prefers-reduced-motion: reduce` | Opening tidak ditampilkan; animasi lain dimatikan; progress ditampilkan penuh | 0 |
| Kunjungan berikutnya dalam satu tab | Opening tidak diulang (penanda di `sessionStorage`) | 0 |

Pengguna dapat melewati opening dengan tombol **Lewati** atau tombol **Escape**.

## Berkas terkait

- `src/components/brand-startup.tsx` — pengatur sesi, timer, reduced-motion, dan tombol lewati.
- `src/components/brand-loading.tsx` — komponen visual bersama (mode `startup` dan inline).
- `src/app/loading.tsx` — fallback root dengan kelas `brand-stage--full`.
- `src/app/(public)/loading.tsx` — fallback halaman publik.
- `src/app/globals.css` — keyframes, atmosfer, dan override reduced-motion.
- `scripts/verify-brand-motion.mjs` — pemeriksaan kontrak animasi.

## Kronologi animasi

```text
0 ms     curtain hijau tua + glow/grid
80 ms    garis vertikal turun + logo vertikal resmi masuk
300 ms   halo logotype menguat
620 ms   sapuan cahaya melintasi logo
850 ms   tagline lokasi
1000 ms  progress bar emas terisi
1150 ms  label status
1250 ms  tombol Lewati
1520 ms  curtain mulai memudar
2000 ms  komponen di-unmount
```

Semua transisi memakai `transform` dan `opacity`; hanya progress bar yang menganimasikan lebar. Tidak ada animasi yang mengunci scroll atau menahan interaksi lebih dari durasi opening.

## Aksesibilitas & performa

- Fallback inline memakai `role="status"`, `aria-live="polite"`, dan `aria-busy="true"`.
- Elemen dekoratif (glow, grid, logo, progress) ditandai `aria-hidden`; mode inline tetap mengumumkan “Srikandi Buana” lewat `sr-only`.
- Tombol lewati memiliki `aria-label` dan focus ring yang terlihat.
- Logo vertikal resmi memakai WebP (62 KB) dengan `fetchPriority="high"`; dua varian resmi lain disimpan sebagai aset brand.
- Tidak ada audio, video, atau font tambahan yang dimuat khusus untuk animasi.

## Verifikasi

```bash
npm run test:brand-motion
npm run typecheck
npm test
```

Untuk mengubah durasi, sesuaikan `INTRO_DURATION` di `brand-startup.tsx` **dan** delay `brand-curtain-out` di `globals.css` agar keduanya tetap sinkron.
