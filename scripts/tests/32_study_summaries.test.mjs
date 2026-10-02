import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;
let separatorA = null;

before(async () => {
  await startServer();

  const emailA = `test-study-sum-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User Study Summaries" },
  });
  tokenA = regA.data.token;

  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];

  // Index book for AI RAG
  await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  // Create a separator for scope testing
  const sepRes = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Sección Inicial",
      startPage: 1,
      endPage: 48,
      color: "amber",
    },
  });
  separatorA = sepRes.data;

  // Create a user note for personal study test
  await apiRequest(`/books/${bookA.id}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      content: "Mi nota personal: relacionar con la teoría de semiótica visual.",
    },
  });
});

after(() => {
  stopServer();
});

test("32.1 - Generate brief summary grounded with citations", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page", pageNumber: 1 },
      summaryType: "brief",
    },
  });

  assert.equal(res.status, 201);
  assert.ok(res.data.summary);
  assert.equal(res.data.summary.summaryType, "brief");
  assert.ok(res.data.summary.content.includes("Idea central"));
  assert.ok(res.data.sources.length > 0);
  assert.equal(res.data.sources[0].pageNumber, 1);
});

test("32.2 - Generate standard summary grounded with citations", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "separator", separatorId: separatorA.id },
      summaryType: "standard",
    },
  });

  assert.equal(res.status, 201);
  assert.ok(res.data.summary);
  assert.equal(res.data.summary.summaryType, "standard");
  assert.ok(res.data.summary.content.includes("Resumen general"));
  assert.ok(res.data.sources.length > 0);
  // Citations must be inside separator range (1-48)
  for (const s of res.data.sources) {
    assert.ok(s.pageNumber >= 1 && s.pageNumber <= 48);
  }
});

test("32.3 - Generate deep summary with essential concepts and arguments", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "book" },
      summaryType: "deep",
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.summary.summaryType, "deep");
  assert.ok(res.data.summary.content.includes("Visión general"));
  assert.ok(res.data.summary.content.includes("Argumentos"));
  assert.ok(res.data.sources.length > 0);
});

test("32.4 - Generate personal summary including notes, clearly labeled as user notes", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page", pageNumber: 1 },
      summaryType: "standard",
      includeNotes: true,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.summary.isPersonal, true);
  // CTQ BM-08-03: Personal notes must never be presented as book text
  assert.ok(res.data.summary.content.includes("Tus notas personales"));
});

test("32.5 - Scope page_range boundary validation", async () => {
  // Invalid range: startPage > endPage
  const resInvalid = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page_range", startPage: 50, endPage: 20 },
      summaryType: "standard",
    },
  });
  assert.equal(resInvalid.status, 400);

  // Valid range: 1 to 2
  const resValid = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page_range", startPage: 1, endPage: 2 },
      summaryType: "standard",
    },
  });
  assert.equal(resValid.status, 201);
});

test("32.6 - Get summary detail with sources and delete summary", async () => {
  const listRes = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.items.length > 0);

  const summaryId = listRes.data.items[0].id;
  const detailRes = await apiRequest(`/books/${bookA.id}/study/summaries/${summaryId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.summary.id, summaryId);
  assert.ok(Array.isArray(detailRes.data.sources));

  const delRes = await apiRequest(`/books/${bookA.id}/study/summaries/${summaryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  const afterDel = await apiRequest(`/books/${bookA.id}/study/summaries/${summaryId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(afterDel.status, 404);
});
