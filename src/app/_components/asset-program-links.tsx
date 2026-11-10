"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { recordHref } from "@/lib/management-insights";
import type { Row } from "@/lib/srikandi";

type LinkedAsset = {
  asset: Row;
  member: Row | undefined;
  tasks: Row[];
  programNames: string[];
};

function buildLinks(rows: Row[]): LinkedAsset[] {
  const members = new Map(rows.filter((row) => row.kind === "anggota").map((row) => [row.id, row]));
  const programs = new Map(rows.filter((row) => row.kind === "program").map((row) => [String(row.data.programId || ""), String(row.data.name || "Program tanpa nama")]));
  const tasks = rows.filter((row) => row.kind === "tindaklanjut");
  return rows
    .filter((row) => row.kind === "aset" && row.data.assetOwnership === "Milik kelompok" && row.data.custodyStatus === "Dipinjam" && Boolean(row.data.custodianMemberId))
    .map((asset) => {
      const memberId = String(asset.data.custodianMemberId);
      const linkedTasks = tasks.filter((task) => String(task.data.assignedMemberId || "") === memberId);
      const programNames = [...new Set(linkedTasks.map((task) => programs.get(String(task.data.programId || ""))).filter((name): name is string => Boolean(name)))];
      return { asset, member: members.get(memberId), tasks: linkedTasks, programNames };
    });
}

export default function AssetProgramLinks({ rows }: { rows: Row[] }) {
  const links = buildLinks(rows);
  return (
    <section className="space-y-3" aria-labelledby="asset-program-links-title">
      <div className="space-y-1">
        <h2 id="asset-program-links-title" className="text-base font-semibold">Keterkaitan aset, anggota, dan program</h2>
        <p className="text-sm text-muted-foreground">Ringkasan ini menghubungkan aset kelompok yang sedang dipinjam dengan anggota pemegang dan tugas yang ditugaskan kepadanya. Kepemilikan aset pribadi tidak ditampilkan sebagai aset kelompok.</p>
      </div>
      {links.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {links.map(({ asset, member, tasks: memberTasks, programNames }) => (
            <Card key={asset.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{String(asset.data.name || "Aset tanpa nama")}</CardTitle>
                  <Badge variant="outline">Sedang dipinjam</Badge>
                </div>
                <CardDescription>
                  Pemegang: {String(member?.data.name || asset.data.custodianMemberName || "Anggota tidak ditemukan pada cakupan data")}
                  {" · "}Serah-terima: {String(asset.data.issuedAt || "Tanggal belum tercatat")}
                  {" · "}Rencana kembali: {String(asset.data.expectedReturnAt || "Belum ditentukan")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tugas anggota</p>
                  {memberTasks.length ? (
                    <ul className="mt-1 space-y-1">
                      {memberTasks.slice(0, 5).map((task) => (
                        <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <Link className="underline-offset-4 hover:underline" href={recordHref(task)}>{String(task.data.name || "Tugas tanpa judul")}</Link>
                          <Badge variant="secondary">{String(task.data.status || "Belum dimulai")}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-1 text-sm text-muted-foreground">Belum ada tugas yang ditautkan kepada pemegang aset ini.</p>}
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Program yang terkait melalui tugas</p>
                  <p className="mt-1 text-sm">{programNames.length ? programNames.join(", ") : "Belum ada program yang terhubung."}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Belum ada aset milik kelompok dengan status Dipinjam dan anggota pemegang yang tercatat. Data aset anggota tetap dipisahkan dan tidak dihitung di sini.</CardContent></Card>
      )}
    </section>
  );
}
