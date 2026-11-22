import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FieldDashboard } from "@/components/field-dashboard";
import { FIELDS_BY_SLUG } from "@/config/fields";

export async function generateStaticParams() {
  return Object.keys(FIELDS_BY_SLUG).map((field) => ({ field }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ field: string }>;
}): Promise<Metadata> {
  const { field } = await params;
  const def = FIELDS_BY_SLUG[field];
  return { title: def ? def.name : "Bidang" };
}

export default async function BidangHome({ params }: { params: Promise<{ field: string }> }) {
  const { field } = await params;
  const def = FIELDS_BY_SLUG[field];
  if (!def) notFound();
  return <FieldDashboard field={def} />;
}
