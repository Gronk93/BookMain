import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let tokenB = null;
let bookAId = null;

before(async () => {
  await startServer();

  // Create User A
  const emailA = `test-ha-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User HA" },
  });
  tokenA = regA.data.token;

  // Create User B
  const emailB = `test-hb-${Date.now()}@bookmind.test`;
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailB, password: "password123", displayName: "User HB" },
  });
  tokenB = regB.data.token;

  // Get a book for User A
  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(booksRes.status, 200);
  assert.ok(booksRes.data.length > 0, "User A should have at least one book seeded");
  bookAId = booksRes.data[0].id;
});

after(() => {
  stopServer();
});

test("21.1 - Create and Retrieve Highlights (with defaults and textHash)", async () => {
  const createRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 0,
      endBlockId: "b-1",
      endOffset: 25,
      exactText: "Seeing comes before words",
      prefixText: "",
      suffixText: ". The child looks",
    },
  });

  assert.equal(createRes.status, 201);
  const h1 = createRes.data;
  assert.ok(h1.id);
  assert.equal(h1.color, "yellow"); // Default semantic color
  assert.equal(h1.anchorStatus, "resolved");
  assert.equal(h1.exactText, "Seeing comes before words");
  assert.ok(h1.textHash);
  assert.equal(h1.noteCount, 0);

  // Retrieve highlights for book
  const listRes = await apiRequest(`/books/${bookAId}/highlights`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.some((h) => h.id === h1.id));
});

test("21.2 - Highlight filtering by pageNumber", async () => {
  // Create highlight on page 2
  const p2Res = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 2,
      startBlockId: "b-2",
      startOffset: 5,
      endBlockId: "b-2",
      endOffset: 30,
      exactText: "The way we see things is affected",
      color: "blue",
      category: "important",
    },
  });
  assert.equal(p2Res.status, 201);
  const h2 = p2Res.data;
  assert.equal(h2.color, "blue");
  assert.equal(h2.category, "important");

  // Query only page 2
  const p2ListRes = await apiRequest(`/books/${bookAId}/highlights?pageNumber=2`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(p2ListRes.status, 200);
  assert.ok(p2ListRes.data.length >= 1);
  assert.ok(p2ListRes.data.every((h) => h.pageNumber === 2));
});

test("21.3 - Update Highlight color and category", async () => {
  // Create highlight
  const createRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 10,
      endBlockId: "b-1",
      endOffset: 20,
      exactText: "comes before",
      color: "yellow",
    },
  });
  const h = createRes.data;

  // Patch color and category
  const patchRes = await apiRequest(`/books/${bookAId}/highlights/${h.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      color: "violet",
      category: "review",
    },
  });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.data.color, "violet");
  assert.equal(patchRes.data.category, "review");
});

test("21.4 - Soft Delete and Restore Highlight", async () => {
  // Create highlight
  const createRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 0,
      endBlockId: "b-1",
      endOffset: 6,
      exactText: "Seeing",
    },
  });
  const h = createRes.data;

  // Delete
  const delRes = await apiRequest(`/books/${bookAId}/highlights/${h.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  // List should no longer contain it
  const listRes = await apiRequest(`/books/${bookAId}/highlights`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(!listRes.data.some((item) => item.id === h.id));

  // Restore (Undo toast flow)
  const restoreRes = await apiRequest(`/books/${bookAId}/highlights/${h.id}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(restoreRes.status, 200);
  assert.equal(restoreRes.data.id, h.id);

  // Should now be back in the list
  const listAfter = await apiRequest(`/books/${bookAId}/highlights`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(listAfter.data.some((item) => item.id === h.id));
});

test("21.5 - Highlight Input Validation", async () => {
  // Missing required fields
  const missingRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pageNumber: 1 },
  });
  assert.equal(missingRes.status, 400);

  // Selection exceeding 10,000 chars limit
  const hugeText = "A".repeat(10001);
  const hugeRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 0,
      endBlockId: "b-1",
      endOffset: 10001,
      exactText: hugeText,
    },
  });
  assert.equal(hugeRes.status, 400);
});

test("21.6 - Strict User Isolation for Highlights", async () => {
  // Create highlight as User A
  const hRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 0,
      endBlockId: "b-1",
      endOffset: 10,
      exactText: "Confidential",
    },
  });
  const h = hRes.data;

  // User B tries to view User A's book highlights -> 404
  const userBListRes = await apiRequest(`/books/${bookAId}/highlights`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(userBListRes.status, 404);

  // User B tries to update User A's highlight -> 404
  const patchRes = await apiRequest(`/books/${bookAId}/highlights/${h.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { color: "red" },
  });
  assert.equal(patchRes.status, 404);

  // User B tries to delete User A's highlight -> 404
  const delRes = await apiRequest(`/books/${bookAId}/highlights/${h.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delRes.status, 404);
});
