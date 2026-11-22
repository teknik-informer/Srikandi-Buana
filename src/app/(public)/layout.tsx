import { PublicHeader, PublicFooter } from "@/components/public-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-canvas min-h-dvh">
      <PublicHeader />
      {/* one named content region: the body shell is `main > .sb-shell` */}
      <main className="public-body">{children}</main>
      <PublicFooter />
    </div>
  );
}
