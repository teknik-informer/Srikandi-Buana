import { PublicHeader, PublicFooter } from "@/components/public-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-canvas min-h-dvh">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
