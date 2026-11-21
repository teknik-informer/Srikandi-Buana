export function normalizeHppCostRows(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    throw new Error("Tambahkan 1–20 komponen biaya yang valid.");
  }
  let totalCost = 0;
  const items = input.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Baris komponen biaya tidak valid.");
    }
    const component = String(raw.component || "").trim().slice(0, 80);
    const unit = String(raw.unit || "").trim().slice(0, 16);
    const quantity = Number(raw.quantity);
    const unitPrice = Number(raw.unitPrice);
    if (!component || !unit || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1e9 ||
        !Number.isSafeInteger(unitPrice) || unitPrice < 0 || unitPrice > 1e12) {
      throw new Error("Lengkapi komponen, volume, satuan, dan harga satuan dengan benar.");
    }
    const subtotal = Math.round(quantity * unitPrice);
    if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
      throw new Error("Subtotal komponen melebihi batas perhitungan.");
    }
    totalCost += subtotal;
    if (!Number.isSafeInteger(totalCost) || totalCost > 1e14) {
      throw new Error("Total biaya melebihi batas perhitungan.");
    }
    return { component, quantity, unit, unitPrice, subtotal };
  });
  return { items, totalCost };
}

export function calculateHpp({ totalCost, outputQuantity, targetMargin = 0 }) {
  const cost = Number(totalCost);
  const output = Number(outputQuantity);
  const margin = Number(targetMargin);
  if (!Number.isSafeInteger(cost) || cost < 0 || cost > 1e14) {
    throw new Error("Total biaya tidak valid.");
  }
  if (!Number.isFinite(output) || output <= 0 || output > 1e9) {
    throw new Error("Jumlah hasil akhir harus lebih dari nol.");
  }
  if (!Number.isFinite(margin) || margin < 0 || margin > 90) {
    throw new Error("Target margin harus berada pada rentang 0–90 persen.");
  }
  const unitCost = Math.round(cost / output);
  const suggestedPrice = Math.round(unitCost / (1 - margin / 100));
  if (!Number.isSafeInteger(unitCost) || !Number.isSafeInteger(suggestedPrice)) {
    throw new Error("Hasil perhitungan melebihi batas nominal yang aman.");
  }
  return { totalCost: cost, outputQuantity: output, targetMargin: margin, unitCost, suggestedPrice };
}

export function calculateActualMargin(unitCost, sellingPrice) {
  const cost = Number(unitCost);
  const price = Number(sellingPrice);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(price) || price <= 0) return null;
  return ((price - cost) / price) * 100;
}
