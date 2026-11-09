"use client";

import { useMemo } from "react";
import { Boxes, ClipboardList, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Row } from "@/lib/srikandi";

function countLabel(value: number, singular: string, plural: string) {
  return value + " " + (value === 1 ? singular : plural);
}

export default function MemberImpactOverview({ rows }: { rows: Row[] }) {
  const summary = useMemo(() => {
    const members = rows.filter((row) => row.kind === "anggota");
    const tasks = rows.filter((row) => row.kind === "tindaklanjut");
    const assets = rows.filter((row) => row.kind === "aset");
    const linkedTasks = tasks.filter((row) => members.some((member) => member.id === String(row.data.assignedMemberId || "")));
    const assignedAssets = assets.filter((row) =>
      row.data.assetOwnership === "Milik kelompok" &&
      row.data.custodyStatus === "Dipinjam" &&
      members.some((member) => member.id === String(row.data.custodianMemberId || "")),
    );
    const memberOwnedAssets = assets.filter((row) =>
      row.data.assetOwnership === "Milik anggota" &&
      members.some((member) => member.id === String(row.data.memberOwnerId || "")),
    );
    const activeTasks = linkedTasks.filter((row) => !["Selesai", "Ditunda"].includes(String(row.data.status || "")));
    const activeMembers = members.filter((row) => row.data.status === "Aktif");
    return { members, linkedTasks, assignedAssets, memberOwnedAssets, activeTasks, activeMembers };
  }, [rows]);

  const membersWithActivity = summary.members.map((member) => {
    const id = String(member.id);
    const tasks = summary.linkedTasks.filter((row) => String(row.data.assignedMemberId || "") === id);
    const activeTasks = tasks.filter((row) => !["Selesai", "Ditunda"].includes(String(row.data.status || "")));
    const heldAssets = summary.assignedAssets.filter((row) => String(row.data.custodianMemberId || "") === id);
    const ownedAssets = summary.memberOwnedAssets.filter((row) => String(row.data.memberOwnerId || "") === id);
    return { member, tasks, activeTasks, heldAssets, ownedAssets };
  }).filter((item) => item.tasks.length || item.heldAssets.length || item.ownedAssets.length)
    .sort((a, b) => (b.activeTasks.length + b.heldAssets.length + b.ownedAssets.length) - (a.activeTasks.length + a.heldAssets.length + a.ownedAssets.length));

  return (
    <section className="space-y-4" aria-labelledby="member-impact-title">
      <div className="space-y-1">
        <h2 id="member-impact-title" className="text-lg font-semibold tracking-tight">Hubungan anggota dengan kegiatan dan aset</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Ringkasan ini menghubungkan Buku Induk dengan penugasan dan inventaris melalui ID anggota. Gunakan untuk mengetahui pembagian pekerjaan, tanggung jawab sarana, dan kebutuhan tindak lanjut — bukan untuk menentukan hak keuangan atau kelayakan bantuan.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Anggota aktif</CardDescription><CardTitle className="text-2xl tabular-nums">{summary.activeMembers.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Dari {summary.members.length} catatan keanggotaan</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Tugas terhubung</CardDescription><CardTitle className="text-2xl tabular-nums">{summary.linkedTasks.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{summary.activeTasks.length} masih perlu tindak lanjut</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Aset kelompok dipegang</CardDescription><CardTitle className="text-2xl tabular-nums">{summary.assignedAssets.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Berdasarkan status peminjaman saat ini</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Sarana milik anggota</CardDescription><CardTitle className="text-2xl tabular-nums">{summary.memberOwnedAssets.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Tidak dihitung sebagai inventaris kelompok</CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anggota dengan relasi operasional</CardTitle>
          <CardDescription>Hanya relasi yang memiliki ID anggota valid yang ditampilkan. Catatan lama tanpa ID tetap tersimpan dan tidak ditebak berdasarkan nama.</CardDescription>
        </CardHeader>
        <CardContent>
          {membersWithActivity.length ? (
            <div className="divide-y">
              {membersWithActivity.map(({ member, tasks, activeTasks, heldAssets, ownedAssets }) => (
                <article key={member.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(8rem,auto))] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{String(member.data.name || "Anggota tanpa nama")}</p>
                    <p className="text-xs text-muted-foreground">{String(member.data.role || "Anggota")} · {String(member.data.status || "Status belum ditetapkan")}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm"><ClipboardList className="size-4 text-muted-foreground" aria-hidden="true" /><span>{countLabel(tasks.length, "tugas", "tugas")}<span className="text-muted-foreground"> · {activeTasks.length} aktif</span></span></div>
                  <div className="flex items-center gap-2 text-sm"><Boxes className="size-4 text-muted-foreground" aria-hidden="true" /><span>{countLabel(heldAssets.length, "aset dipegang", "aset dipegang")}</span></div>
                  <div className="flex flex-wrap items-center gap-2 text-sm"><Users className="size-4 text-muted-foreground" aria-hidden="true" /><span>{countLabel(ownedAssets.length, "sarana pribadi", "sarana pribadi")}</span>{heldAssets.length > 0 && <Badge variant="outline">Tanggung jawab aset</Badge>}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm font-medium">Belum ada relasi operasional anggota</p>
              <p className="mt-1 text-sm text-muted-foreground">Hubungkan tugas melalui kolom Anggota pelaksana atau catat pemegang aset kelompok pada Inventaris Aset. Jangan mengisi relasi berdasarkan perkiraan nama.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
