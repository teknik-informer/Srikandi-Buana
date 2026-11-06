"use client";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { listPage } from "@/lib/list-page";
export default function ListPagination({ total, page, onPageChange, label, disabled = false }: {
  total: number; page: number; onPageChange: (page: number) => void; label: string; disabled?: boolean;
}) {
  const range = listPage(total, page);
  if (range.pages === 1) return null;
  return <Pagination aria-label={label} className="mt-4">
    <PaginationContent className="flex-wrap gap-2">
      <PaginationItem><Button variant="outline" disabled={disabled || range.page <= 1} onClick={() => onPageChange(range.page - 1)}>Sebelumnya</Button></PaginationItem>
      <PaginationItem><span className="px-2 text-sm text-muted-foreground" aria-live="polite">{range.start}–{range.end} dari {total} · {range.page}/{range.pages}</span></PaginationItem>
      <PaginationItem><Button variant="outline" disabled={disabled || range.page >= range.pages} onClick={() => onPageChange(range.page + 1)}>Berikutnya</Button></PaginationItem>
    </PaginationContent>
  </Pagination>;
}
