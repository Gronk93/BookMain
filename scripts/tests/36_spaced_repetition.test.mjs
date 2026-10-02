import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";
import { SpacedRepetitionEngine } from "../../artifacts/api-server/src/services/study/spaced-repetition.engine.ts";


let tokenA = null;
let bookA = null;
let deckA = null;
let cardA = null;

before(async () => {
  await startServer();

  const emailA = `test-srs-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User SRS" },
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
      title: "Mazo SRS Test",
      scope: { type: "page", pageNumber: 1 },
    },
  });
  deckA = deckRes.data;

  const cardRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardType: "question",
      front: "¿Pregunta de prueba SRS?",
      back: "Respuesta de prueba SRS",
    },
  });
  cardA = cardRes.data;
});

after(() => {
  stopServer();
});

test("36.1 - CTQ BM-08-07: Invariant Again < Hard < Good < Easy intervals", () => {
  const engine = new SpacedRepetitionEngine();
  const base = new Date("2026-10-01T12:00:00Z");

  const again = engine.calculateNextReview("again", 0, base);
  const hard = engine.calculateNextReview("hard", 0, base);
  const good = engine.calculateNextReview("good", 0, base);
  const easy = engine.calculateNextReview("easy", 0, base);

  assert.equal(again.nextIntervalDays, 0);
  assert.equal(hard.nextIntervalDays, 1);
  assert.equal(good.nextIntervalDays, 3);
  assert.equal(easy.nextIntervalDays, 7);

  assert.ok(again.nextIntervalDays < hard.nextIntervalDays);
  assert.ok(hard.nextIntervalDays < good.nextIntervalDays);
  assert.ok(good.nextIntervalDays < easy.nextIntervalDays);

  assert.ok(again.dueAt.getTime() < hard.dueAt.getTime());
  assert.ok(hard.dueAt.getTime() < good.dueAt.getTime());
  assert.ok(good.dueAt.getTime() < easy.dueAt.getTime());
});

test("36.2 - Submitting 'again' review rating via API", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "again" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.review.rating, "again");
  assert.equal(res.data.nextIntervalDays, 0);
  assert.ok(res.data.nextDueAt);
});

test("36.3 - Submitting 'hard' review rating via API", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "hard" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.review.rating, "hard");
  assert.equal(res.data.nextIntervalDays, 1);
});

test("36.4 - Submitting 'good' review rating via API", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "good" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.review.rating, "good");
  assert.ok(res.data.nextIntervalDays >= 3);
});

test("36.5 - Submitting 'easy' review rating via API", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "easy" },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.review.rating, "easy");
  assert.ok(res.data.nextIntervalDays >= 7);
});

test("36.6 - Invalid rating returns 400", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { rating: "super_easy" },
  });

  assert.equal(res.status, 400);
});
