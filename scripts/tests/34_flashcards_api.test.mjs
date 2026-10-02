import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;
let deckA = null;

before(async () => {
  await startServer();

  const emailA = `test-flashcards-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User Flashcards" },
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

test("34.1 - Create and retrieve flashcard deck with card counts", async () => {
  const createRes = await apiRequest(`/books/${bookA.id}/study/decks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Mazo Capítulo 1",
      scope: { type: "page", pageNumber: 1 },
    },
  });

  assert.equal(createRes.status, 201);
  deckA = createRes.data;
  assert.equal(deckA.title, "Mazo Capítulo 1");
  assert.equal(deckA.bookId, bookA.id);

  const getRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  assert.equal(getRes.status, 200);
  assert.equal(getRes.data.deck.id, deckA.id);
  assert.equal(getRes.data.cardsCount, 0);
  assert.equal(getRes.data.dueCount, 0);
});

test("34.2 - Update flashcard deck title", async () => {
  const updateRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      title: "Mazo Capítulo 1 (Revisado)",
    },
  });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.title, "Mazo Capítulo 1 (Revisado)");
});

test("34.3 - Create manual flashcard (origin: manual) and persist", async () => {
  const res = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardType: "concept",
      front: "¿Qué es la visión según Berger?",
      back: "La visión precede a las palabras y establece nuestro lugar en el mundo.",
      explanation: "Concepto inicial del ensayo.",
      sourcePage: 1,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.origin, "manual");
  assert.equal(res.data.cardType, "concept");
  assert.equal(res.data.sourcePage, 1);
  assert.ok(res.data.contentHash);

  // Check deck counts
  const deckRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(deckRes.data.cardsCount, 1);
  // Initial card is due
  assert.equal(deckRes.data.dueCount, 1);
});

test("34.4 - Edit flashcard front, back, explanation, difficulty", async () => {
  const cardsRes = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(cardsRes.status, 200);
  const cardId = cardsRes.data.items[0].id;

  const editRes = await apiRequest(`/books/${bookA.id}/study/cards/${cardId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      front: "¿Qué es la visión según John Berger?",
      difficulty: "hard",
    },
  });

  assert.equal(editRes.status, 200);
  assert.equal(editRes.data.front, "¿Qué es la visión según John Berger?");
  assert.equal(editRes.data.difficulty, "hard");
});

test("34.5 - Delete flashcard", async () => {
  const createTemp = await apiRequest(`/books/${bookA.id}/study/decks/${deckA.id}/cards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      cardType: "question",
      front: "Tarjeta temporal",
      back: "Respuesta temporal",
    },
  });
  assert.equal(createTemp.status, 201);
  const tempId = createTemp.data.id;

  const delRes = await apiRequest(`/books/${bookA.id}/study/cards/${tempId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  const editAfterDel = await apiRequest(`/books/${bookA.id}/study/cards/${tempId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { front: "Modificar borrada" },
  });
  assert.equal(editAfterDel.status, 404);
});
