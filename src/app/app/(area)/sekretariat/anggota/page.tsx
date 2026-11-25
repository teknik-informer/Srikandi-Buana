import type { Metadata } from "next";
import { AnggotaClient } from "./anggota-client";

export const metadata: Metadata = { title: "Buku Induk Anggota" };

/**
 * Buku induk kini dirender dari state bersama. Daftar, verifikasi, dan
 * penambahan terjadi di klien; server hanya membaca parameter tab.
 */
export default async function BukuIndukPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <AnggotaClient status={status ?? "aktif"} />;
}
