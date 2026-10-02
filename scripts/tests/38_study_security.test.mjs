import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let tokenB = null;
let bookA = null;
let summaryA = null;
let deckA = null;
let cardA = null;
let sessionA = null;

before(async () => {
  await startServer();

  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `user-a-${Date.now()}@bookmind.test`, password: "password123", displayName: "User A" },
  });
  tokenA = regA.data.token;

  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `user-b-${Date.now()}@bookmind.test`, password: "password123", displayName: "User B" },
  });
  tokenB = regB.data.token;

  const booksA = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookA = booksA.data[0];

  await apiRequest(`/books/${bookA.id}/ai/index`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  // Create summary for User A
  const sumRes = await apiRequest(`/books/${bookA.id}/study/summaries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      scope: { type: "page", pageNumber: 1 },
      summaryType: "standard",
    },
  });
  summaryA = sumRes.data.summary;

  // Create deck for User A
  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Deck Privado A",
      scope: { type: "page", pageNumber: 1 },
    },
  });
  deckA = deckRes.data;

  // Create card for User A
  const cardRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardType: "question",
      front: "Pregunta Privada A",
      back: "Respuesta Privada A",
    },
  });
  cardA = cardRes.data;

  // Create session for User A
  const sessRes = await apiRequest(`/books/${bookA.id}/study/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      deckId: deckA.id,
    },
  });
  sessionA = sessRes.data;
});

after(() => {
  stopServer();
});

test("38.1 - CTQ BM-08-09: User B cannot access User A's summaries (404)", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/summaries/${summaryA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(res.status, 404);

  const delRes = await apiRequest(`/books/${bookA.id}/study/summaries/${summaryA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delRes.status, 404);
});

test("38.2 - User B cannot access User A's flashcard decks (404)", async () => {
  const getRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(getRes.status, 404);

  const patchRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { title: "Hackeado" },
  });
  assert.equal(patchRes.status, 404);

  const delRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delRes.status, 404);
});

test("38.3 - User B cannot access or edit User A's flashcards (404)", async () => {
  const editRes = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { front: "Hackeado" },
  });
  assert.equal(editRes.status, 404);

  const delRes = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(delRes.status, 404);
});

test("38.4 - User B cannot submit review for User A's cards (404)", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/cards/${cardA.id}/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { rating: "again" },
  });
  assert.equal(res.status, 404);
});

test("38.5 - User B cannot complete User A's study sessions (404)", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/sessions/${sessionA.id}/complete`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { cardsSeen: 5 },
  });
  assert.equal(res.status, 404);
});
