import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;

before(async () => {
  await startServer();

  const emailA = `test-concepts-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User Concepts" },
  });
  tokenA = regA.data.token;

  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];

  await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
});

after(() => {
  stopServer();
});

test("33.1 - Generate key concepts with definition and importance", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/concepts/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "book" },
      count: 3,
    },
  });

  assert.equal(res.status, 201);
  assert.ok(Array.isArray(res.data.items));
  assert.ok(res.data.items.length >= 1);

  const first = res.data.items[0];
  assert.ok(first.concept.term);
  assert.ok(first.concept.definition);
  assert.ok(["essential", "high", "medium"].includes(first.concept.importance));
});

test("33.2 - Concept sources are grounded with valid citations", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/concepts`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.items.length > 0);

  for (const item of res.data.items) {
    assert.ok(item.concept.id);
    assert.ok(Array.isArray(item.sources));
    if (item.sources.length > 0) {
      assert.ok(item.sources[0].pageNumber >= 1);
      assert.ok(item.sources[0].quote);
    }
  }
});

test("33.3 - Boundary validation for concepts generation", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/concepts/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page_range", startPage: 999, endPage: 1000 },
      count: 5,
    },
  });

  assert.equal(res.status, 400);
});
