export function skuValid(value) {
  return typeof value === "string" && /^[A-Z0-9][A-Z0-9-]{1,31}$/.test(value);
}
