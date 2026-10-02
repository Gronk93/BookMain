import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;
let deckA = null;
let sessionA = null;

before(async () => {
  await startServer();

  const emailA = `test-sessions-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User Study Sessions" },
  });
  tokenA = regA.data.token;

  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksRes.data[0];

  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Mazo para Sesión",
      scope: { type: "book" },
    },
  });
  deckA = deckRes.data;

  // Add 3 cards
  for (let i = 1; i <= 3; i++) {
    await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        cardType: "question",
        front: `Pregunta de sesión ${i}`,
        back: `Respuesta de sesión ${i}`,
      },
    });
  }
});

after(() => {
  stopServer();
});

test("37.1 - Start study session and verify initialization", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      deckId: deckA.id,
      sessionType: "flashcard_review",
    },
  });

  assert.equal(res.status, 201);
  sessionA = res.data;
  assert.equal(sessionA.bookId, bookA.id);
  assert.equal(sessionA.deckId, deckA.id);
  assert.equal(sessionA.cardsSeen, 0);
  assert.equal(sessionA.completedAt, null);
});

test("37.2 - Review queue retrieval returns due cards", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/review?deckId=${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.dueCount, 3);
  assert.equal(res.data.totalCards, 3);
  assert.equal(res.data.items.length, 3);
});

test("37.3 - Complete study session with counters", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/sessions/${sessionA.id}/complete`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardsSeen: 3,
      cardsAgain: 0,
      cardsHard: 1,
      cardsGood: 1,
      cardsEasy: 1,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.cardsSeen, 3);
  assert.equal(res.data.cardsHard, 1);
  assert.equal(res.data.cardsGood, 1);
  assert.equal(res.data.cardsEasy, 1);
  assert.ok(res.data.completedAt !== null);
});

test("37.4 - GET /study/overview returns overview and recent session", async () => {
  const res = await apiRequest("/study/overview", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(res.status, 200);
  assert.ok(typeof res.data.dueCardsToday === "number");
  assert.ok(Array.isArray(res.data.recentSessions));
  assert.ok(res.data.recentSessions.length >= 1);
  assert.ok(res.data.totalDecks >= 1);
  assert.ok(res.data.totalCards >= 3);
});
