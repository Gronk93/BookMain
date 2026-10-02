import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;

before(async () => {
  await startServer();

  const emailA = `test-ai-idx-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User AI Index" },
  });
  tokenA = regA.data.token;

  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];
});

after(() => {
  stopServer();
});

test("26.1 - GET /books/:bookId/ai/index/status returns initial status", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/index/status`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.bookId, bookA.id);
  assert.ok(["not_indexed", "ready"].includes(res.data.status));
});

test("26.2 - POST /books/:bookId/ai/index indexes book and produces chunks", async () => {
  const indexRes = await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(indexRes.status, 200);
  const data = indexRes.data;
  assert.equal(data.bookId, bookA.id);
  assert.equal(data.status, "ready");
  assert.ok(data.chunkCount >= 0);
  assert.equal(data.progressPercent, 100);
  assert.ok(data.embeddingModel);

  // Status check should now report ready
  const statusRes = await apiRequest(`/books/${bookA.id}/ai/index/status`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.data.status, "ready");
  assert.equal(statusRes.data.chunkCount, data.chunkCount);
});

test("26.3 - Indexing is idempotent and does not create duplicate chunks", async () => {
  const firstRes = await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(firstRes.status, 200);

  const secondRes = await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(secondRes.status, 200);
  assert.equal(secondRes.data.chunkCount, firstRes.data.chunkCount);
});

test("26.4 - Unauthenticated indexing requests return 401", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
  });
  assert.equal(res.status, 401);
});
