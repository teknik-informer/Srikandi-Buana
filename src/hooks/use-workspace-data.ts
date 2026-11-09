"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestJSON } from "@/lib/request-json";
import type { Row } from "@/lib/srikandi";
import type { WorkspaceData, WorkspaceFile, WorkspaceAudit, AssetMovement } from "@/lib/workspace-types";
export function useWorkspaceData() {
  const [rows, setRows] = useState<Row[]>([]),
    [files, setFiles] = useState<WorkspaceFile[]>([]),
    [audit, setAudit] = useState<WorkspaceAudit[]>([]),\n    [assetMovements, setAssetMovements] = useState<AssetMovement[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [unauthorized, setUnauthorized] = useState(false);
  const current = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    current.current?.abort();
    const request = new AbortController();
    current.current = request;
    setLoading(true);
    setError("");
    try {
      const { response, data } = await requestJSON<WorkspaceData & { error?: string }>("/api/records", { cache: "no-store", signal: request.signal });
      if (request.signal.aborted) return;
      if (!response.ok) {
        setUnauthorized(response.status === 401);
        setRows([]);
        setFiles([]);
        setAudit([]);\n        setAssetMovements([]);
        throw Error(
          response.status === 401
            ? "Sesi masuk telah berakhir. Masuk kembali untuk melanjutkan pekerjaan."
            : data?.error || "Data belum dapat dimuat. Coba kembali.",
        );
      }
      if (!data || !Array.isArray(data.records) || !Array.isArray(data.files))
        throw Error("Respons data belum lengkap. Silakan muat ulang.");
      if (request.signal.aborted) return;
      setRows(data.records);
      setFiles(data.files);
      setAudit(Array.isArray(data.audit) ? data.audit : []);\n      setAssetMovements(Array.isArray(data.assetMovements) ? data.assetMovements : []);
      setUnauthorized(false);
    } catch (e) {
      if (request.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Koneksi terputus. Periksa jaringan dan coba kembali.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return () => current.current?.abort();
  }, [load]);
  return { rows, files, audit, assetMovements, loading, error, unauthorized, load };
}
