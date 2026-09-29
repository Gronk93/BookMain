import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("GATE BM-02 E2E: Full user lifecycle with persistence and language switch", async () => {
  const email = `gate02_${Date.now()}@bookmind.app`;
  const password = "gate02_SecretPassword123";

  // Step 1: User registers
  const regRes = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      displayName: "Lector Gate BM-02",
    },
  });
  assert.equal(regRes.status, 201, "Registration must return 201 Created");
  const firstToken = regRes.data.token;
  assert.equal(regRes.data.preferences.language, "es-MX", "Default language must be es-MX");

  // Step 2: User switches language to en-US
  const prefRes = await apiRequest("/me/preferences", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${firstToken}` },
    body: { language: "en-US" },
  });
  assert.equal(prefRes.status, 200, "Language switch must return 200");
  assert.equal(prefRes.data.language, "en-US");

  // Step 3: Opens library (seeded data from API)
  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${firstToken}` },
  });
  assert.equal(booksRes.status, 200);
  assert.ok(booksRes.data.length >= 1, "User must have initial seeded library");
  const book = booksRes.data.find((b) => b.title === "Ways of Seeing") || booksRes.data[0];
  const bookId = book.id;

  // Step 4: User navigates to page 49
  const progressRes = await apiRequest(`/books/${bookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${firstToken}` },
    body: { currentPage: 49 },
  });
  assert.equal(progressRes.status, 200);
  assert.equal(progressRes.data.currentPage, 49, "Progress must be page 49");

  // Step 5: User creates bookmark on page 49
  const bmRes = await apiRequest(`/books/${bookId}/bookmarks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firstToken}` },
    body: { pageNumber: 49, title: "Bookmark Page 49" },
  });
  assert.equal(bmRes.status, 201);
  assert.equal(bmRes.data.pageNumber, 49);

  // Step 6: User creates note on page 49
  const noteContent = "Gate BM-02: Persisted note on page 49 across sessions.";
  const noteRes = await apiRequest(`/books/${bookId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${firstToken}` },
    body: {
      pageNumber: 49,
      content: noteContent,
      color: "amber",
    },
  });
  assert.equal(noteRes.status, 201);
  assert.equal(noteRes.data.content, noteContent);

  // Step 7: User logs out
  const logoutRes = await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${firstToken}` },
  });
  assert.equal(logoutRes.status, 200);

  // Step 8: User logs back in
  const loginRes = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(loginRes.status, 200, "Login must succeed with 200 OK");
  const secondToken = loginRes.data.token;
  assert.ok(secondToken, "Login must issue a new session token");

  // Step 9: Verify language preference persisted across sessions
  const meRes = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${secondToken}` },
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.preferences.language, "en-US", "Language preference 'en-US' must persist");

  // Step 10: Verify book details, progress (page 49), bookmark, and note persisted
  const detailsRes = await apiRequest(`/books/${bookId}`, {
    headers: { Authorization: `Bearer ${secondToken}` },
  });
  assert.equal(detailsRes.status, 200);
  assert.equal(detailsRes.data.progress.currentPage, 49, "Reading progress must remain page 49");
  assert.ok(
    detailsRes.data.bookmarks.some((b) => b.pageNumber === 49),
    "Bookmark on page 49 must persist across sessions",
  );
  assert.ok(
    detailsRes.data.notes.some((n) => n.pageNumber === 49 && n.content === noteContent),
    "Note on page 49 must persist across sessions",
  );
});
