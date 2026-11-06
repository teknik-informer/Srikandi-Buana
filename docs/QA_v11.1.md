# QA Report — v11.1 Staging (6 November 2026)

| Pemeriksaan | Hasil | Bukti / batasan |
|---|---|---|
| ZIP input `testzip()` | LULUS | Semua entri dapat dibaca. |
| Jumlah source Vercel | LULUS | 306/306 file terdaftar dalam laporan ekspor, dan 306 entri aktual. |
| Kode v11 asli dipertahankan | LULUS | Perbandingan SHA-256; tidak ada berkas asli yang dihapus. |
| Pembacaan multipart valid tanpa header ukuran | LULUS | Tes `tests/integration-security.mjs`. |
| Penolakan unggahan berukuran besar tanpa header | LULUS | Tes stream membatasi maksimum byte. |
| Penolakan header ukuran besar | LULUS | Tes batas `Content-Length`. |
| Penolakan media non-multipart | LULUS | Tes tipe request. |
| Koneksi helper di 3 endpoint | LULUS (kontrak kode) | Tes pemeriksaan source. |
| Filter berkas soft-delete & CSP | LULUS (kontrak kode) | Tes pemeriksaan source. |
| Proteksi akses route cetak notulen | LULUS (kontrak kode) | Pemeriksaan identitas, owner, izin dan jalur. |
| Parsing TypeScript/TSX | LULUS | 240 file, 0 diagnostics parser. |
| Typecheck helper multipart | LULUS | `tsc --noEmit --target ES2022 --lib ES2022,DOM --module ESNext --skipLibCheck src/lib/multipart-limit.ts`. |
| npm ci | GAGAL (kendala lingkungan) | npm melaporkan `Exit handler never called!`. |
| Build Next.js, typecheck seluruh proyek | BELUM DIUJI | Dependensi belum terpasang lengkap. |
| Pengujian browser, PostgreSQL, dan integrasi v0.4 | BELUM DIUJI | Memerlukan staging terisolasi. |

Penanda **LULUS (kontrak kode)** tidak sama dengan tes endpoint yang berjalan nyata. Tidak ada klaim production-ready.
