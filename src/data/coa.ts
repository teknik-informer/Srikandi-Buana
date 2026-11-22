/**
 * NATIVE FINANCE — Chart of Accounts (draft for review).
 * Blueprint §28/§27.18: this COA is a DRAFT presented for organisational
 * approval; it is explicitly not an enacted accounting policy.
 */

import type { Account } from "./types";

export const COA: Account[] = [
  // ASET
  { code: "1-1000", name: "Kas Tunal", type: "aset", normal: "debit", group: "Kas & Setara Kas" },
  { code: "1-1100", name: "Bank BRI — Rekening Organisasi", type: "aset", normal: "debit", group: "Kas & Setara Kas", protected: true },
  { code: "1-1200", name: "Piutang Usaha", type: "aset", normal: "debit", group: "Piutang" },
  { code: "1-1300", name: "Persediaan Produk Jadi", type: "aset", normal: "debit", group: "Persediaan" },
  { code: "1-1400", name: "Persediaan Bahan Baku", type: "aset", normal: "debit", group: "Persediaan" },
  { code: "1-1500", name: "Peralatan Produksi", type: "aset", normal: "debit", group: "Aset Tetap" },
  { code: "1-1510", name: "Akumulasi Penyusutan Peralatan", type: "aset", normal: "kredit", group: "Aset Tetap" },
  // KEWAJIBAN
  { code: "2-1000", name: "Utang Usaha", type: "kewajiban", normal: "kredit", group: "Utang Jangka Pendek" },
  { code: "2-1100", name: "Uang Muka Pelanggan", type: "kewajiban", normal: "kredit", group: "Utang Jangka Pendek" },
  { code: "2-1200", name: "Utang Pajak (bila berlaku)", type: "kewajiban", normal: "kredit", group: "Utang Jangka Pendek", note: "Kebijakan pajak belum ditetapkan (§28)" },
  // EKUITAS
  { code: "3-1000", name: "Modal Organisasi", type: "ekuitas", normal: "kredit", group: "Ekuitas" },
  { code: "3-1100", name: "Saldo Dana Operasional", type: "ekuitas", normal: "kredit", group: "Ekuitas" },
  { code: "3-1200", name: "Saldo Dana Program Terbatas", type: "ekuitas", normal: "kredit", group: "Ekuitas" },
  // PENDAPATAN
  { code: "4-1000", name: "Pendapatan Penjualan Produk", type: "pendapatan", normal: "kredit", group: "Pendapatan Usaha" },
  { code: "4-1100", name: "Pendapatan Pelatihan", type: "pendapatan", normal: "kredit", group: "Pendapatan Usaha" },
  { code: "4-1200", name: "Kontribusi Anggota", type: "pendapatan", normal: "kredit", group: "Pendapatan Organisasi", note: "Besaran iuran belum ditetapkan (§28)" },
  { code: "4-1300", name: "Hibah & Bantuan Program", type: "pendapatan", normal: "kredit", group: "Pendapatan Organisasi" },
  // BEBAN
  { code: "5-1000", name: "Harga Pokok Penjualan", type: "beban", normal: "debit", group: "Beban Usaha" },
  { code: "5-1100", name: "Beban Saprodi & Benih", type: "beban", normal: "debit", group: "Beban Program" },
  { code: "5-1200", name: "Beban Pelatihan", type: "beban", normal: "debit", group: "Beban Program" },
  { code: "5-1300", name: "Beban Transportasi & Kunjungan", type: "beban", normal: "debit", group: "Beban Operasional" },
  { code: "5-1400", name: "Beban Alat Tulis & Administrasi", type: "beban", normal: "debit", group: "Beban Operasional" },
  { code: "5-1500", name: "Beban Listrik, Air & Internet", type: "beban", normal: "debit", group: "Beban Operasional" },
  { code: "5-1600", name: "Beban Honor Narasumber", type: "beban", normal: "debit", group: "Beban Program" },
  { code: "5-1700", name: "Beban Penyusutan", type: "beban", normal: "debit", group: "Beban Operasional" },
];

export const ACCOUNT_BY_CODE = Object.fromEntries(COA.map((a) => [a.code, a]));

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  aset: "Aset",
  kewajiban: "Kewajiban",
  ekuitas: "Ekuitas",
  pendapatan: "Pendapatan",
  beban: "Beban",
};
