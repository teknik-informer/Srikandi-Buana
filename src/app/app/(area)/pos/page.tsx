import type { Metadata } from "next";
import { PosTerminal } from "@/components/pos-terminal";
import { PRODUCTS } from "@/data/operations";

export const metadata: Metadata = { title: "POS Penjualan" };

export default function PosPage() {
  const products = PRODUCTS.filter((p) => p.published).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    unit: p.unit,
    category: p.category,
    stock: p.stock,
  }));

  return <PosTerminal products={products} />;
}
