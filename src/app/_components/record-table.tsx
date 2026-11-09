"use client";
import { useId, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dateID, rupiah, type Field, type Row } from "@/lib/srikandi";
import { validDate } from "@/lib/management-insights";
import type { WorkspaceFile } from "@/lib/workspace-types";
import { StatusBadge } from "./workspace-ui";

export function recordFieldText(
  row: Row,
  field: Field,
  files: WorkspaceFile[] = [],
) {
  const value = row.data[field.key];
  if (value === undefined || value === null || value === "") return "—";
  if (field.key === "assignedMemberId")
    return String(row.data.assignedMemberName || "Anggota terhubung");
  if (field.key === "memberOwnerId")
    return String(row.data.memberOwnerName || "Pemilik anggota belum tercatat");
  if (field.key === "custodianMemberId")
    return String(row.data.custodianMemberName || "Anggota pemegang belum tercatat");
  if (field.key === "counterAccountId")
    return String(row.data.counterAccountName || "Akun lawan belum tercatat");
  if (field.key === "fileId")
    return (
      files.find((file) => file.id === value && !file.deleted_at)?.name ||
      "Berkas tidak tersedia"
    );
  if (field.type === "date")
    return validDate(value) ? dateID(value) : "Tanggal perlu diperiksa";
  if (["amount", "cost"].includes(field.key))
    return Number.isFinite(Number(value))
      ? rupiah(Number(value))
      : "Nominal perlu diperiksa";
  return String(value);
}
export default function RecordTable({
  label,
  rows,
  fields,
  files = [],
  onView,
  actions,
}: {
  label: string;
  rows: Row[];
  fields: Field[];
  files?: WorkspaceFile[];
  onView: (row: Row) => void;
  actions: (row: Row) => ReactNode;
}) {
  const hint = useId();
  const statusInColumns = fields.some((field) =>
    ["status", "type"].includes(field.key),
  );
  return (
    <div className="space-y-2">
      <p id={hint} className="text-xs text-muted-foreground">
        Pilih nama catatan untuk membuka rincian. Geser tabel bila seluruh kolom
        belum terlihat.
      </p>
      <div
        className="records-table-region rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        role="region"
        aria-label={"Tabel " + label}
        aria-describedby={hint}
        tabIndex={0}
      >
        <Table className="min-w-[640px]">
          <TableCaption className="sr-only">
            {label} · {rows.length} catatan pada halaman ini
          </TableCaption>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {fields.map((field, index) => (
                <TableHead
                  key={field.key}
                  className={
                    index === 0 ? "records-first-column min-w-48" : "min-w-28"
                  }
                >
                  {field.key === "fileId" ? "Berkas" : field.label}
                </TableHead>
              ))}
              <TableHead className="w-0 text-right">Tindakan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {fields.map((field, index) => (
                  <TableCell
                    key={field.key}
                    className={
                      index === 0 ? "records-first-column" : "align-middle"
                    }
                  >
                    {index === 0 ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          className="record-title text-left underline-offset-4 hover:underline focus-visible:underline"
                          onClick={() => onView(row)}
                        >
                          {recordFieldText(row, field, files)}
                        </button>
                        {!statusInColumns && row.data.status && (
                          <div>
                            <StatusBadge value={row.data.status} />
                          </div>
                        )}
                      </div>
                    ) : ["status", "priority"].includes(field.key) ? (
                      <StatusBadge value={row.data[field.key]} />
                    ) : (
                      <span
                        className={
                          "block max-w-64 whitespace-normal break-words " +
                          (["amount", "cost"].includes(field.key)
                            ? "tabular-nums font-medium"
                            : "")
                        }
                      >
                        {recordFieldText(row, field, files)}
                      </span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="align-middle">
                  <div className="record-actions flex items-center justify-end gap-1.5">
                    {actions(row)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
