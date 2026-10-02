import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;
let separatorA = null;

before(async () => {
  await startServer();

  const emailA = `test-ai-ret-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User AI Retrieval" },
  });
  tokenA = regA.data.token;

  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];

  // Index book
  await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  // Create a separator for testing separator scope
  const sepRes = await apiRequest(`/books/${bookA.id}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Capítulo Primero",
      startPage: 1,
      endPage: 48,
      color: "blue",
    },
  });
  separatorA = sepRes.data;
});

after(() => {
  stopServer();
});

test("27.1 - Retrieval with scope 'book' returns grounded answer and citations", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "¿Cómo influye el ver antes que las palabras?",
      scope: "book",
    },
  });

  assert.equal(res.status, 200);
  assert.ok(res.data.conversationId);
  assert.ok(res.data.messageId);
  assert.ok(res.data.answer);
  assert.equal(res.data.insufficientEvidence, false);
  assert.ok(Array.isArray(res.data.citations));
  assert.ok(res.data.citations.length > 0);
  assert.ok(res.data.citations[0].pageNumber >= 1);
  assert.ok(res.data.citations[0].quote);
});

test("27.2 - Retrieval with scope 'page' limits citations to that page", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "¿Qué ocurre en la primera página?",
      scope: "page",
      scopeRef: "1",
    },
  });

  assert.equal(res.status, 200);
  for (const c of res.data.citations) {
    assert.equal(c.pageNumber, 1);
  }
});

test("27.3 - Retrieval with scope 'separator' limits citations to separator range", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "¿Qué temas se discuten en este rango?",
      scope: "separator",
      scopeRef: separatorA.id,
    },
  });

  assert.equal(res.status, 200);
  for (const c of res.data.citations) {
    assert.ok(c.pageNumber >= separatorA.startPage);
    assert.ok(c.pageNumber <= separatorA.endPage);
  }
});

test("27.4 - Strict Grounding: ungrounded query returns insufficientEvidence", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "PREGUNTA_SIN_CONTEXTO_XYZ ¿Cuál es la receta de pasta al pesto?",
      scope: "book",
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.insufficientEvidence, true);
  assert.ok(
    res.data.answer.includes("No encontré suficiente información en este libro para responder"),
  );
  assert.equal(res.data.citations.length, 0);
});
