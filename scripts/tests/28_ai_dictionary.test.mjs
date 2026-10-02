import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;

before(async () => {
  await startServer();

  const emailA = `test-ai-dict-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User AI Dict" },
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

test("28.1 - POST /books/:bookId/ai/define returns 4-block contextual definition", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/define`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      term: "perspectiva",
      pageNumber: 48,
      blockId: "b-1",
      offset: 12,
      contextSentence: "La perspectiva visual condiciona nuestra percepción del mundo.",
    },
  });

  assert.equal(res.status, 200);
  const data = res.data;
  assert.equal(data.term, "perspectiva");
  assert.ok(data.definition, "Must have formal definition");
  assert.ok(data.simpleExplanation, "Must have simple explanation");
  assert.ok(data.contextExplanation, "Must have contextual explanation");
  assert.ok(data.example, "Must have example");
  assert.equal(data.pageNumber, 48);
  assert.ok(data.citation);
  assert.equal(data.citation.pageNumber, 48);
  assert.ok(data.citation.quote.includes("perspectiva"));
});

test("28.2 - POST /books/:bookId/ai/define returns 400 when missing term or pageNumber", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/define`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      term: "",
      pageNumber: 1,
    },
  });

  assert.equal(res.status, 400);
});

test("28.3 - POST /books/:bookId/ai/explain explains selected text with citation", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/explain`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      text: "Seeing comes before words. The child looks and recognizes before it can speak.",
      pageNumber: 1,
      startBlockId: "b-0",
      startOffset: 0,
      endBlockId: "b-0",
      endOffset: 75,
    },
  });

  assert.equal(res.status, 200);
  const data = res.data;
  assert.ok(data.explanation);
  assert.ok(Array.isArray(data.keyConcepts));
  assert.ok(data.citation);
  assert.equal(data.citation.pageNumber, 1);
  assert.ok(data.citation.quote.includes("Seeing comes before words"));
});

test("28.4 - POST /books/:bookId/ai/explain returns 400 when text is missing", async () => {
  const res = await apiRequest(`/books/${bookA.id}/ai/explain`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      text: "",
      pageNumber: 1,
    },
  });

  assert.equal(res.status, 400);
});
