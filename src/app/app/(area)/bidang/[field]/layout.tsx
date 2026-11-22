import { redirect } from "next/navigation";
import Link from "next/link";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { FieldShellChrome } from "@/components/field-shell-chrome";

export default async function BidangLayout({
  children,

  params,
}: {
  children: React.ReactNode;
  params: Promise<{ field: string }>;
}) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  const { field } = await params;
  return <FieldShellChrome identity={identity} fieldSlug={field}>{children}</FieldShellChrome>;
}
