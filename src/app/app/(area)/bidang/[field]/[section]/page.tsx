import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { FIELDS_BY_SLUG } from "@/config/fields";
import { FIELD_SECTION_KEYS } from "@/config/field-nav";
import { FieldSectionView } from "@/components/field-section";

export const metadata: Metadata = { title: "Aplikasi Bidang" };

export function generateStaticParams() {
  return Object.keys(FIELDS_BY_SLUG).flatMap((field) =>
    FIELD_SECTION_KEYS.map((section) => ({ field, section })),
  );
}

export default async function BidangSection({
  params,
}: {
  params: Promise<{ field: string; section: string }>;
}) {
  const { field: slug, section } = await params;
  const field = FIELDS_BY_SLUG[slug];
  if (!field || !FIELD_SECTION_KEYS.includes(section)) notFound();
  return <FieldSectionView field={field} section={section} />;
}
