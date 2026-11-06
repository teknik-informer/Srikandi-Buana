export function moneyInteger(value, limit = 1_000_000_000_000) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= limit;
}

export function textField(value, max = 160) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;
}

export function sameOwner(user, owner) {
  return user?.userId === owner;
}

export function localHref(value) {
  return typeof value === "string" &&
    value.startsWith("/dashboard") &&
    !value.startsWith("//") &&
    !/[\\\\\\x00-\\x1f]/.test(value);
}
