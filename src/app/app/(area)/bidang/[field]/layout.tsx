import { requireIdentity } from "@/lib/session";
import { FieldShellChrome } from "@/components/field-shell-chrome";

export default async function BidangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ field: string }>;
}) {
  const { field } = await params;
  const identity = await requireIdentity(`field:${field}:read`);

  return (
    <FieldShellChrome identity={identity} fieldSlug={field}>
      {children}
    </FieldShellChrome>
  );
}
