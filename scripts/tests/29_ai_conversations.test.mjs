import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let bookA = null;

before(async () => {
  await startServer();

  const emailA = `test-ai-conv-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User AI Conv" },
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
});

after(() => {
  stopServer();
});

test("29.1 - Multi-turn conversation persists messages and citations", async () => {
  // First turn: start conversation
  const turn1 = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "¿Cuál es la premisa inicial del libro?",
      scope: "book",
    },
  });

  assert.equal(turn1.status, 200);
  const conversationId = turn1.data.conversationId;
  assert.ok(conversationId);
  assert.ok(turn1.data.messageId);

  // Second turn: follow-up in the same conversation
  const turn2 = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "¿Y qué relación tiene esto con la mirada del otro?",
      scope: "book",
      conversationId,
    },
  });

  assert.equal(turn2.status, 200);
  assert.equal(turn2.data.conversationId, conversationId);

  // List conversations
  const listRes = await apiRequest(`/books/${bookA.id}/ai/conversations`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.data));
  const found = listRes.data.find((c) => c.id === conversationId);
  assert.ok(found);

  // Get conversation details and message history
  const detailRes = await apiRequest(
    `/books/${bookA.id}/ai/conversations/${conversationId}`,
    {
      headers: { Authorization: `Bearer ${tokenA}` },
    },
  );
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.conversation.id, conversationId);
  // Should have at least 4 messages (2 user + 2 assistant)
  assert.ok(detailRes.data.messages.length >= 4);

  const assistantMsgs = detailRes.data.messages.filter((m) => m.role === "assistant");
  assert.ok(assistantMsgs.length >= 2);
  assert.ok(assistantMsgs[0].citations);
});

test("29.2 - Delete conversation soft-deletes and subsequent lookup returns 404", async () => {
  // Create a quick conversation
  const askRes = await apiRequest(`/books/${bookA.id}/ai/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      question: "Pregunta temporal para borrar",
      scope: "book",
    },
  });
  const convId = askRes.data.conversationId;

  // Delete it
  const delRes = await apiRequest(`/books/${bookA.id}/ai/conversations/${convId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delRes.status, 200);

  // Verify it no longer exists
  const getRes = await apiRequest(`/books/${bookA.id}/ai/conversations/${convId}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(getRes.status, 404);
});
