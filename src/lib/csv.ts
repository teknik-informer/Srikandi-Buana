export function csvCell(value: unknown) {
  let text = String(value ?? "");
  const numeric = typeof value === "number" && Number.isFinite(value);
  if (!numeric && /^[\t\r\n]|^\s*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function createCSV(rows: readonly (readonly unknown[])[]) {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
