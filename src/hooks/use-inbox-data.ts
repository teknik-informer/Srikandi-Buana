"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { fetchMessagePage, type MessagePage } from "@/lib/message-data";
const empty = (): MessagePage => ({ messages: [], total: 0, page: 1, pages: 1, counts: {} });
export function useInboxData(page: number, status: string, query: string, onPageResolved?: (page: number) => void) {
  const [data, setData] = useState<MessagePage>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const current = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const load = useCallback(async () => {
    clearTimeout(timer.current);
    current.current?.abort();
    const request = new AbortController(); current.current = request;
    setLoading(true); setError("");
    try {
      const result = await fetchMessagePage({ page, limit: 20, status, query, signal: request.signal });
      if (!request.signal.aborted) { setData(result); onPageResolved?.(result.page); }
    } catch (e) {
      if (!request.signal.aborted) {
        setData(empty()); setError(e instanceof Error ? e.message : "Pesan belum dapat dimuat.");
      }
    } finally { if (!request.signal.aborted) setLoading(false); }
  }, [page, status, query, onPageResolved]);
  useEffect(() => {
    current.current?.abort();
    setLoading(true); setError(""); setData(empty());
    timer.current = setTimeout(() => { void load(); }, 200);
    return () => { clearTimeout(timer.current); current.current?.abort(); };
  }, [load]);
  return { ...data, loading, error, load };
}
