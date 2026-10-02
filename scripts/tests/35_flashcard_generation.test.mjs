import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;
let deckA = null;

before(async () => {
  await startServer();

  const emailA = `test-fc-gen-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User Card Gen" },
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

  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Mazo para Generación AI",
      scope: { type: "book" },
    },
  });
  deckA = deckRes.data;
});

after(() => {
  stopServer();
});

test("35.1 - AI Flashcards generation produces grounded cards (5 cards requested)", async () => {
  const genRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { count: 5 },
  });

  assert.equal(genRes.status, 201);
  assert.ok(Array.isArray(genRes.data.items));
  assert.ok(genRes.data.items.length >= 1 && genRes.data.items.length <= 5);

  // Check card types and origin
  const card = genRes.data.items[0];
  assert.equal(card.origin, "ai");
  assert.ok(["concept", "question", "cloze"].includes(card.cardType));
  assert.ok(card.front);
  assert.ok(card.back);
});

test("35.2 - CTQ BM-08-04: Every AI flashcard has a valid source and citation", async () => {
  const listRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(listRes.status, 200);
  assert.ok(listRes.data.items.length > 0);

  for (const c of listRes.data.items) {
    if (c.origin === "ai") {
      assert.ok(c.sourcePage !== null && c.sourcePage >= 1);
      assert.ok(c.sourceAnchorData !== null);
      assert.ok(c.sourceAnchorData.chunkId);
    }
  }
});

test("35.3 - Duplicate suppression prevents duplicate cards on regenerate", async () => {
  const countBefore = (
    await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  ).data.items.length;

  // Generate again with same templates
  const genAgain = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { count: 5 },
  });

  assert.equal(genAgain.status, 201);

  // Duplicates are filtered out
  const cardsAfter = (
    await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
  ).data.items;

  const hashes = new Set();
  for (const c of cardsAfter) {
    assert.ok(!hashes.has(c.contentHash), "Duplicate content hash detected in deck");
    hashes.add(c.contentHash);
  }
});
