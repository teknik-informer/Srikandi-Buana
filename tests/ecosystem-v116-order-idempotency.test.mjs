import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  completeOrderRequest,
  getOrCreateOrderRequestId,
} from "../src/features/commerce/order-request.mjs";

const read = (path) => readFileSync(path, "utf8");

test("Order retry reuses the same idempotency key until success is confirmed", () => {
  const requests = new Map();
  let generated = 0;
  const createId = () => "request-" + (++generated);

  const firstAttempt = getOrCreateOrderRequestId(requests, "product-a", 2, createId);
  // An uncertain network response leaves the key in the map for the next attempt.
  const retry = getOrCreateOrderRequestId(requests, "product-a", 2, createId);
  assert.equal(retry, firstAttempt);
  assert.equal(generated, 1);

  const otherIntent = getOrCreateOrderRequestId(requests, "product-a", 3, createId);
  assert.notEqual(otherIntent, firstAttempt);
  assert.equal(generated, 2);

  completeOrderRequest(requests, "product-a", 2);
  const nextOrder = getOrCreateOrderRequestId(requests, "product-a", 2, createId);
  assert.notEqual(nextOrder, firstAttempt);
  assert.equal(generated, 3);
});

test("Order request identity validates product and quantity", () => {
  const requests = new Map();
  assert.throws(() => getOrCreateOrderRequestId(requests, "", 1, () => "id"), TypeError);
  assert.throws(() => getOrCreateOrderRequestId(requests, "product-a", 0, () => "id"), TypeError);
  assert.throws(() => getOrCreateOrderRequestId(requests, "product-a", 1.5, () => "id"), TypeError);
  assert.throws(() => getOrCreateOrderRequestId([], "product-a", 1, () => "id"), TypeError);
});

test("Commerce workspace keeps an idempotency key across failed attempts and clears it after success", () => {
  const ui = read("src/app/_components/ecosystem-workspace.tsx");
  assert.match(ui, /useRef\(new Map<string,string>\(\)\)/);
  assert.match(ui, /getOrCreateOrderRequestId\(orderRequestIds\.current,p\.id,n/);
  assert.match(ui, /completeOrderRequest\(orderRequestIds\.current,p\.id,n\)/);
  assert.match(ui, /clientRequestId\}\);/);
  assert.doesNotMatch(ui, /clientRequestId:crypto\.randomUUID\(\)/);
  assert.match(ui, /Pesanan belum dapat dipastikan/);
});
