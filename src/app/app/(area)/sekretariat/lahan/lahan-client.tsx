"use client";

/**
 * Data lahan — rute yang sebelumnya tidak ada.
 *
 * `LandCrud` sudah ditulis tetapi tidak pernah dipasang di menu mana pun,
 * sehingga petak lahan hanya bisa dilihat sebagai angka di dasbor, tidak
 * pernah bisa dicatat atau diperbaiki. Halaman ini memasangnya, sekaligus
 * menampilkan rekap yang dipakai bersama oleh Meja Kerja dan laporan.
 */
import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { LandCrud } from "@/components/master-crud";
import { Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";

export function LahanClient() {
  const { state } = useStore();
  const { lands } = state;

  const rekap = useMemo(() => {
    const total = lands.reduce((s, l) => s + (Number(l.areaHa) || 0), 0);
    const produktif = lands.filter((l) => l.status === "produktif");
    const haProduktif = produktif.reduce((s, l) => s + (Number(l.areaHa) || 0), 0);
    const komoditas = new Set(lands.map((l) => l.commodity.trim().toLowerCase()).filter(Boolean));
    const perluKunjungan = lands.filter((l) => !l.lastVisit || l.lastVisit < "2026-11-01").length;
    return { total, produktif: produktif.length, haProduktif, komoditas: komoditas.size, perluKunjungan };
  }, [lands]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat · produksi"
        title="Data lahan"
        description="Petak yang digarap anggota: pemilik, komoditas, luas, dan status. Angka hektar di Meja Kerja dan peta bidang dibaca dari tabel ini."
        actions={<Link href="/app/kerja" className="sb-btn sb-btn-outline">Meja kerja</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total luas" value={`${rekap.total.toFixed(2)} ha`} note={`${lands.length} petak tercatat`} tone="info" />
        <StatCard label="Produktif" value={rekap.produktif} note={`${rekap.haProduktif.toFixed(2)} ha sedang digarap`} tone="success" />
        <StatCard label="Komoditas" value={rekap.komoditas} note="Jenis berbeda" tone="neutral" />
        <StatCard
          label="Perlu kunjungan"
          value={rekap.perluKunjungan}
          note={rekap.perluKunjungan ? "Belum dikunjungi bulan ini" : "Semua terpantau"}
          tone={rekap.perluKunjungan ? "warning" : "success"}
        />
      </div>

      <div className="mt-4">
        <Notice tone="info" title="Mengapa ini penting">
          Luas lahan menentukan banyak hal lain: usulan saprodi, jadwal kunjungan, dan laporan produksi. Karena itu setiap
          perubahan di tabel bawah langsung mengubah rekap di atas — dan rekap yang sama dipakai di Meja Kerja.
        </Notice>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Daftar petak" subtitle="Tambah, ubah, atau hapus — tercatat di jejak audit" />
          <div className="px-4 pb-4">
            <LandCrud />
          </div>
        </Card>
      </div>
    </div>
  );
}
