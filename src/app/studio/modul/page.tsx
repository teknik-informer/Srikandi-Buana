import type { Metadata } from "next";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";

export default function ModulStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Module & Extension Manager"
        title="Modul aktif per bidang"
        description="Aktif/nonaktif modul secara terkendali. Menonaktifkan modul tidak menghapus data historis; modul inti siklus kerja tidak dapat dihapus tanpa pengganti setara."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {FIELDS.map((f) => (
          <Card key={f.fieldId}>
            <CardHeader
              title={f.shortName}
              subtitle={`${f.modules.length} modul domain`}
              action={<StatusBadge status={f.appStatus === "aktif" ? "Aktif" : f.appStatus} />}
            />
            <div className="grid gap-1.5 p-3 sm:grid-cols-2">
              {f.modules.map((m) => (
                <div key={m} className="flex items-center justify-between gap-2 rounded border border-line bg-white px-2.5 py-1.5">
                  <span className="text-[11px] text-ink2">{m}</span>
                  <span className="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full bg-primary-500 px-0.5" role="switch" aria-checked="true" aria-label={`Modul ${m} aktif`}>
                    <span className="ml-auto h-3 w-3 rounded-full bg-white" />
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Lifecycle modul">
          Modul memiliki status: tersedia → aktif → nonaktif sementara → arsip. Konfigurasi tersimpan
          dengan versi; rollback konfigurasi tidak menghapus data transaksional.
        </Notice>
        <Notice tone="warning" title="Ekstensi">
          “Install plugin” tidak berarti mengeksekusi paket internet tanpa review &amp; sandbox.
          Ekstensi masuk melalui registry terkurasi setelah review.
        </Notice>
      </div>
    </div>
  );
}
