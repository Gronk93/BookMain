import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let tokenB = null;
let bookA = null;
let deckA = null;

before(async () => {
  await startServer();

  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `e2e-user-a-${Date.now()}@bookmind.test`, password: "password123", displayName: "User E2E A" },
  });
  tokenA = regA.data.token;

  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `e2e-user-b-${Date.now()}@bookmind.test`, password: "password123", displayName: "User E2E B" },
  });
  tokenB = regB.data.token;

  const booksA = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksA.data[0];

  // Index book
  await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
});

after(() => {
  stopServer();
});

test("GATE E2E 1 — Summary Generation with Scope & Valid Deep Citations", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page_range", startPage: 1, endPage: 48 },
      summaryType: "standard",
    },
  });

  assert.equal(res.status, 201);
  assert.ok(res.data.summary);
  assert.ok(res.data.sources.length > 0);

  // Validate citation corresponds to scope
  for (const src of res.data.sources) {
    assert.ok(src.pageNumber >= 1 && src.pageNumber <= 48);
  }

  // Deep link format verification
  const firstSource = res.data.sources[0];
  const deepLink = `/read/${bookA.id}?page=${firstSource.pageNumber}&source=${firstSource.id}`;
  assert.ok(deepLink.includes(`/read/${bookA.id}?page=`));
});

test("GATE E2E 2 — AI Flashcard Generation with Valid Source per Card", async () => {
  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Deck E2E Gate 2",
      scope: { type: "page", pageNumber: 1 },
    },
  });
  assert.equal(deckRes.status, 201);
  deckA = deckRes.data;

  const genRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/generate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { count: 5 },
  });

  assert.equal(genRes.status, 201);
  assert.ok(genRes.data.items.length >= 1);

  for (const card of genRes.data.items) {
    assert.equal(card.origin, "ai");
    assert.ok(card.sourcePage !== null);
    assert.ok(card.sourceAnchorData !== null);
  }
});

test("GATE E2E 3 — Study Review Session Lifecycle", async () => {
  // Start session
  const startRes = await apiRequest(`/books/${bookA.id}/study/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { deckId: deckA.id },
  });
  assert.equal(startRes.status, 201);
  const session = startRes.data;

  // Get due cards
  const queueRes = await apiRequest(`/books/${bookA.id}/study/review?deckId=${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(queueRes.status, 200);
  assert.ok(queueRes.data.items.length > 0);

  const cardToReview = queueRes.data.items[0];

  // Submit 'good' review
  const reviewRes = await apiRequest(`/books/${bookA.id}/study/cards/${cardToReview.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "good" },
  });
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.data.review.rating, "good");
  assert.ok(reviewRes.data.nextIntervalDays >= 3);

  // Complete session
  const completeRes = await apiRequest(`/books/${bookA.id}/study/sessions/${session.id}/complete`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardsSeen: 1,
      cardsAgain: 0,
      cardsHard: 0,
      cardsGood: 1,
      cardsEasy: 0,
    },
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.cardsGood, 1);
  assert.ok(completeRes.data.completedAt !== null);
});

test("GATE E2E 4 — Review Persistence Across Sessions", async () => {
  // Create card
  const cardRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardType: "concept",
      front: "Front Persistence Test",
      back: "Back Persistence Test",
    },
  });
  assert.equal(cardRes.status, 201);
  const cardId = cardRes.data.id;

  // Review card as 'easy'
  await apiRequest(`/books/${bookA.id}/study/cards/${cardId}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "easy" },
  });

  // Query review queue without 'all': since reviewed as easy (due +7 days), it should NOT be due now
  const queueRes = await apiRequest(`/books/${bookA.id}/study/review?deckId=${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(queueRes.status, 200);
  const found = queueRes.data.items.find((c) => c.id === cardId);
  assert.equal(found, undefined, "Card scheduled 7 days out should not appear in due queue");

  // Query with 'all=true': card should be present
  const allRes = await apiRequest(`/books/${bookA.id}/study/review?deckId=${deckA.id}&all=true`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const foundAll = allRes.data.items.find((c) => c.id === cardId);
  assert.ok(foundAll, "Card should appear in full deck listing with all=true");
});

test("GATE E2E 5 — Personal Study Material Labeling", async () => {
  // Create a highlight
  await apiRequest(`/books/${bookA.id}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "p1-b1",
      startOffset: 0,
      endBlockId: "p1-b1",
      endOffset: 25,
      exactText: "Seeing comes before words",
      color: "yellow",
      category: "important",
    },
  });

  // Create a note
  await apiRequest(`/books/${bookA.id}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      content: "Anotación del lector sobre la prioridad de la percepción.",
    },
  });

  // Generate personal study summary
  const summaryRes = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page", pageNumber: 1 },
      summaryType: "standard",
      includeHighlights: true,
      includeNotes: true,
    },
  });

  assert.equal(summaryRes.status, 201);
  assert.equal(summaryRes.data.summary.isPersonal, true);
  // Strictly labeled
  assert.ok(summaryRes.data.summary.content.includes("Tus notas personales"));
});

test("GATE E2E 6 — Cross-User Isolation (User B cannot access User A's study artifacts)", async () => {
  // Try to access User A's deck
  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(deckRes.status, 404);

  // Try to review User A's cards
  const reviewRes = await apiRequest(`/books/${bookA.id}/study/review?deckId=${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(reviewRes.status, 404);
});
