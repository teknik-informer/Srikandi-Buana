function requestKey(productId, quantity) {
  const product = typeof productId === "string" ? productId.trim() : "";
  if (!product || !Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new TypeError("A valid product and positive whole-number quantity are required.");
  }
  return product + ":" + quantity;
}

export function getOrCreateOrderRequestId(requests, productId, quantity, createId) {
  if (!(requests instanceof Map)) throw new TypeError("Order request storage must be a Map.");
  const key = requestKey(productId, quantity);
  const existing = requests.get(key);
  if (typeof existing === "string" && existing) return existing;
  if (typeof createId !== "function") throw new TypeError("An ID factory is required.");
  const id = createId();
  if (typeof id !== "string" || !id.trim()) throw new TypeError("The ID factory must return a non-empty string.");
  requests.set(key, id);
  return id;
}

export function completeOrderRequest(requests, productId, quantity) {
  if (!(requests instanceof Map)) throw new TypeError("Order request storage must be a Map.");
  requests.delete(requestKey(productId, quantity));
}
