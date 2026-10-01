import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let tokenB = null;
let bookA = null;

before(async () => {
  await startServer();

  // Create User A
  const emailA = `test-sa-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User SA" },
  });
  tokenA = regA.data.token;

  // Create User B
  const emailB = `test-sb-${Date.now()}@bookmind.test`;
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailB, password: "password123", displayName: "User SB" },
  });
  tokenB = regB.data.token;

  // User A books
  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];
});

after(() => {
  stopServer();
});

test("23.1 - Create and List Separators (Reading Ranges)", async () => {
  const createRes = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Primera Parte: Análisis Visual",
      startPage: 1,
      endPage: Math.min(20, bookA.totalPages || 20),
      color: "emerald",
    },
  });

  assert.equal(createRes.status, 201);
  const sep = createRes.data;
  assert.ok(sep.id);
  assert.equal(sep.title, "Primera Parte: Análisis Visual");
  assert.equal(sep.startPage, 1);
  assert.equal(sep.color, "emerald");

  // List separators for book
  const listRes = await apiRequest(`/books/${bookA.id}/separators`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.length >= 1);
  assert.ok(listRes.data.some((s) => s.id === sep.id));
});

test("23.2 - Separator Page Range Boundary Protection", async () => {
  // Negative or zero start page
  const res1 = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Invalid start",
      startPage: 0,
      endPage: 10,
    },
  });
  assert.equal(res1.status, 400);

  // Inverted range (start > end)
  const res2 = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Inverted range",
      startPage: 25,
      endPage: 10,
    },
  });
  assert.equal(res2.status, 400);

  // Out of bounds (end > totalPages)
  const res3 = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Beyond book length",
      startPage: 1,
      endPage: (bookA.totalPages || 100) + 1000,
    },
  });
  assert.equal(res3.status, 400);
});

test("23.3 - Update and Delete Separator", async () => {
  const createRes = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Segunda Parte",
      startPage: 21,
      endPage: Math.min(40, bookA.totalPages || 40),
    },
  });
  const sep = createRes.data;

  // Update separator title and color
  const patchRes = await apiRequest(`/books/${bookA.id}/separators/${sep.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Segunda Parte: La Mirada Femenina",
      color: "rose",
    },
  });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.data.title, "Segunda Parte: La Mirada Femenina");
  assert.equal(patchRes.data.color, "rose");

  // Delete separator
  const delRes = await apiRequest(`/books/${bookA.id}/separators/${sep.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  // Should no longer appear in list
  const listRes = await apiRequest(`/books/${bookA.id}/separators`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(!listRes.data.some((s) => s.id === sep.id));
});

test("23.4 - Strict User Isolation for Separators", async () => {
  // Create separator as User A
  const createRes = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Private Section",
      startPage: 1,
      endPage: 5,
    },
  });
  const sep = createRes.data;

  // User B lists separators for User A's book -> 404
  const userBList = await apiRequest(`/books/${bookA.id}/separators`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(userBList.status, 404);

  // User B tries to update User A's separator -> 404
  const patchRes = await apiRequest(`/books/${bookA.id}/separators/${sep.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { title: "Hacked" },
  });
  assert.equal(patchRes.status, 404);

  // User B tries to delete User A's separator -> 404
  const delRes = await apiRequest(`/books/${bookA.id}/separators/${sep.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delRes.status, 404);
});
