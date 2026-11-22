import type { Metadata } from "next";
import { GALLERY } from "@/data/content";
import { formatDateID } from "@/lib/format";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Potret kegiatan dan lapangan dari KWT Srikandi Buana.",
};

export default function GaleriPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Galeri</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Potret dari lapangan.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Foto ditampilkan hanya dengan persetujuan publikasi anggota. Tidak ada foto yang menyertakan
        data pribadi sensitif.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERY.map((g, i) => (
          <Card key={g.id} className="overflow-hidden">
            <div className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={[
                  "/images/galeri-petik.jpg",
                  "/images/galeri-fermentasi.jpg",
                  "/images/galeri-pelatihan.jpg",
                  "/images/galeri-pendampingan.jpg",
                  "/images/galeri-bazar.jpg",
                  "/images/galeri-rapat.jpg",
                ][i % 6]}
                alt={g.title}
                className="aspect-[4/3] w-full object-cover transition duration-500 hover:scale-[1.03]"
                width={640}
                height={480}
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <div className="text-[13px] font-semibold text-ink">{g.title}</div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted">
                <span>{g.field}</span>
                <span>{formatDateID(g.date)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
