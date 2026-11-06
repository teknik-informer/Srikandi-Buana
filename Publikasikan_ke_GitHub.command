#!/bin/bash
set -Eeuo pipefail
cd "$(dirname "$0")"
REMOTE="https://github.com/teknik-informer/Srikandi-Buana.git"
echo "SRIKANDI BUANA v11.3 — Publikasi source ke GitHub"
echo "Repositori tujuan: $REMOTE"
echo "Peringatan: repositori GitHub saat ini PUBLIC. Periksa kembali berkas yang diunggah."
if ! command -v git >/dev/null 2>&1; then
  echo "Git belum terpasang. Pasang Xcode Command Line Tools: xcode-select --install"
  exit 1
fi
for name in .env .env.local .env.production .env.development; do
 if [[ -f "$name" ]]; then
  echo "File konfigurasi lokal $name ditemukan; .gitignore akan mengecualikannya."
 fi
done
if [[ ! -d .git ]]; then git init; fi
git branch -M main
if git remote get-url origin >/dev/null 2>&1; then
  ACTUAL=$(git remote get-url origin)
  if [[ "$ACTUAL" != "$REMOTE" ]]; then
    echo "Remote origin bukan Srikandi-Buana: $ACTUAL"; echo "Tidak mengganti remote secara otomatis."; exit 2
  fi
else
  git remote add origin "$REMOTE"
fi
# Refuse to overwrite a remote branch. This script is designed for the empty new repository.
if ! HEADS=$(git ls-remote --heads origin 2>&1); then
  echo "Gagal menghubungi GitHub atau autentikasi gagal. Periksa koneksi dan login GitHub."; exit 3
fi
if [[ -n "$HEADS" ]]; then
  echo "Repositori GitHub sudah memiliki branch. Publikasi otomatis dihentikan untuk melindungi riwayat.";
  echo "Gunakan git pull/merge atau sinkronkan dengan repositori tersebut sebelum push."; exit 4
fi
git add -A
# Validate the actually staged paths, including hidden files.
if git diff --cached --name-only | grep -E '(^|/)(\.env($|\.)|\.vercel/|\.git/|node_modules/|\.next/)|\.(pem|p12|pfx|keystore)$' >/dev/null; then
  echo "Berkas sensitif atau build terdeteksi dalam staging. Upload dibatalkan."; exit 5
fi
if git diff --cached --quiet && git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "Tidak ada perubahan baru untuk dikomit."
else
  if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
    echo "Identitas git belum disetel. Jalankan dahulu:"
    echo 'git config --global user.name "Nama Anda"'
    echo 'git config --global user.email "email-github-anda"'
    exit 6
  fi
  git commit -m "Initial Srikandi Buana Enterprise v11.3 source"
fi
echo "Mengirim seluruh source ke branch main..."
git push -u origin main
echo "BERHASIL. Periksa https://github.com/teknik-informer/Srikandi-Buana"
