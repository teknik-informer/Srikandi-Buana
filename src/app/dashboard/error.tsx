"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import LogoutButton from "../_components/access/logout-button";
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="workspace-fallback max-w-xl mx-auto p-6 min-h-svh flex flex-col justify-center gap-5">
      <Alert variant="destructive">
        <AlertTitle>Ruang kerja belum dapat dibuka</AlertTitle>
        <AlertDescription>
          Terjadi kendala saat memuat halaman. Data yang sudah tersimpan tidak perlu dikirim ulang.
        </AlertDescription>
      </Alert>
      <div className="flex gap-3 flex-wrap">
        <Button onClick={reset}>Coba lagi</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Ke ringkasan</Link>
        </Button>
        <LogoutButton />
      </div>
      <Link href="/bantuan" className="underline">
        Buka pusat bantuan
      </Link>
    </main>
  );
}
