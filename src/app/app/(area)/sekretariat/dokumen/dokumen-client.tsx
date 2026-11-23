"use client";

import { useStore } from "@/lib/store";
import { StatCard } from "@/components/ui";
import { DocumentCrud } from "@/components/master-crud";

export function DocumentTableClient() {
  const { state } = useStore();
  const docs = state.documents;
  const publik = docs.filter((d) => d.visibility === "publik").length;
  const final = docs.filter((d) => d.status === "final").length;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total dokumen" value={docs.length} />
        <StatCard label="Publik" value={publik} tone="success" />
        <StatCard label="Final & siap rujuk" value={final} tone="info" />
      </div>
      <div className="mt-4">
        <DocumentCrud />
      </div>
    </div>
  );
}
