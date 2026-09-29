import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("Books API allows progress, bookmarks, and notes persistence", async () => {
  const email = `reader_${Date.now()}@bookmind.app`;
  const reg = await apiRequest("/auth/register", {
    method: "POST",
    body: { email, password: "password123" },
  });
  const token = reg.data.token;

  // List books
  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(booksRes.status, 200);
  assert.ok(Array.isArray(booksRes.data));
  assert.ok(booksRes.data.length >= 1);

  const bookId = booksRes.data[0].id;

  // Update progress to page 49
  const progRes = await apiRequest(`/books/${bookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: { currentPage: 49 },
  });
  assert.equal(progRes.status, 200);
  assert.equal(progRes.data.currentPage, 49);

  // Create bookmark on page 49
  const bmRes = await apiRequest(`/books/${bookId}/bookmarks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { pageNumber: 49, title: "Capítulo 01" },
  });
  assert.equal(bmRes.status, 201);
  assert.equal(bmRes.data.pageNumber, 49);
  const bookmarkId = bmRes.data.id;

  // Create note on page 49
  const noteRes = await apiRequest(`/books/${bookId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: {
      pageNumber: 49,
      content: "La mirada es recíproca.",
      highlightText: "Soon after we can see...",
      color: "amber",
    },
  });
  assert.equal(noteRes.status, 201);
  assert.equal(noteRes.data.content, "La mirada es recíproca.");
  const noteId = noteRes.data.id;

  // Fetch book details to verify progress, bookmark, and note all exist
  const detailRes = await apiRequest(`/books/${bookId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.data.progress.currentPage, 49);
  assert.ok(detailRes.data.bookmarks.some((b) => b.id === bookmarkId));
  assert.ok(detailRes.data.notes.some((n) => n.id === noteId));

  // Clean up: delete note & bookmark
  const delNote = await apiRequest(`/books/${bookId}/notes/${noteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(delNote.status, 200);

  const delBm = await apiRequest(`/books/${bookId}/bookmarks/${bookmarkId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(delBm.status, 200);
});

test("Strict ownership checks prevent cross-user data leakage", async () => {
  // User 1
  const u1 = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `u1_${Date.now()}@bookmind.app`, password: "password123" },
  });
  const u1Token = u1.data.token;
  const u1Books = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${u1Token}` },
  });
  const u1BookId = u1Books.data[0].id;

  // User 2
  const u2 = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `u2_${Date.now()}@bookmind.app`, password: "password123" },
  });
  const u2Token = u2.data.token;

  // User 2 tries to access User 1's book
  const leakRes = await apiRequest(`/books/${u1BookId}`, {
    headers: { Authorization: `Bearer ${u2Token}` },
  });
  assert.equal(leakRes.status, 404);

  // User 2 tries to mutate User 1's progress
  const mutateRes = await apiRequest(`/books/${u1BookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${u2Token}` },
    body: { currentPage: 100 },
  });
  assert.equal(mutateRes.status, 404);
});
