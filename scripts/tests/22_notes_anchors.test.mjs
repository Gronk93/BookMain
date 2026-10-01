import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

let tokenA = null;
let tokenB = null;
let bookAId = null;

before(async () => {
  await startServer();

  // Create User A
  const emailA = `test-na-${Date.now()}@bookmind.test`;
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailA, password: "password123", displayName: "User NA" },
  });
  tokenA = regA.data.token;

  // Create User B
  const emailB = `test-nb-${Date.now()}@bookmind.test`;
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: emailB, password: "password123", displayName: "User NB" },
  });
  tokenB = regB.data.token;

  // User A books
  const booksRes = await apiRequest("/books", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  bookAId = booksRes.data[0].id;
});

after(() => {
  stopServer();
});

test("22.1 - Create Anchored Note & link to Highlight", async () => {
  // 1. Create a highlight
  const hlRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-1",
      startOffset: 0,
      endBlockId: "b-1",
      endOffset: 25,
      exactText: "Seeing comes before words",
    },
  });
  assert.equal(hlRes.status, 201);
  const hl = hlRes.data;
  assert.equal(hl.noteCount, 0);

  // 2. Create note attached to this highlight
  const noteRes = await apiRequest(`/books/${bookAId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 1,
      content: "Crucial opening thesis of Berger's visual theory.",
      highlightId: hl.id,
      selectedText: "Seeing comes before words",
      anchorData: {
        startBlockId: "b-1",
        startOffset: 0,
        endBlockId: "b-1",
        endOffset: 25,
        exactText: "Seeing comes before words",
      },
      color: "amber",
    },
  });
  assert.equal(noteRes.status, 201);
  const note = noteRes.data;
  assert.ok(note.id);
  assert.equal(note.highlightId, hl.id);
  assert.equal(note.selectedText, "Seeing comes before words");

  // 3. Highlight's noteCount should now be 1
  const hlCheck = await apiRequest(`/books/${bookAId}/highlights?pageNumber=1`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const updatedHl = hlCheck.data.find((item) => item.id === hl.id);
  assert.ok(updatedHl);
  assert.equal(updatedHl.noteCount, 1);
});

test("22.2 - Global Notes listing, search, and pagination (GET /notes)", async () => {
  // Create another note with specific keyword
  await apiRequest(`/books/${bookAId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 2,
      content: "Epistemology of perception and historical context.",
      selectedText: "perspective creates an illusion",
      color: "emerald",
    },
  });

  // Query global notes
  const globalRes = await apiRequest("/notes", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(globalRes.status, 200);
  assert.ok(globalRes.data.notes.length >= 2);
  assert.ok(globalRes.data.total >= 2);
  assert.ok(globalRes.data.notes[0].bookTitle, "Global note must include bookTitle");

  // Search by keyword "Epistemology"
  const searchRes = await apiRequest("/notes?search=Epistemology", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.notes.length >= 1);
  assert.ok(searchRes.data.notes.some((n) => n.content.includes("Epistemology")));

  // Search by quote substring "perspective"
  const quoteSearchRes = await apiRequest("/notes?search=perspective", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(quoteSearchRes.status, 200);
  assert.ok(quoteSearchRes.data.notes.length >= 1);

  // Pagination limit
  const pagedRes = await apiRequest("/notes?limit=1&page=1", {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(pagedRes.status, 200);
  assert.equal(pagedRes.data.notes.length, 1);
  assert.ok(pagedRes.data.total >= 2);
});

test("22.3 - Soft Delete, Restore Note, and Preserve Note on Highlight Delete", async () => {
  // Create highlight and note
  const hlRes = await apiRequest(`/books/${bookAId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 3,
      startBlockId: "b-3",
      startOffset: 0,
      endBlockId: "b-3",
      endOffset: 15,
      exactText: "Oil painting era",
    },
  });
  const hl = hlRes.data;

  const noteRes = await apiRequest(`/books/${bookAId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
    body: {
      pageNumber: 3,
      content: "Renaissance perspective shifts.",
      highlightId: hl.id,
      selectedText: "Oil painting era",
    },
  });
  const note = noteRes.data;

  // Soft delete note
  const delNoteRes = await apiRequest(`/books/${bookAId}/notes/${note.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(delNoteRes.status, 200);

  // Note no longer in book notes
  const bookNotesRes = await apiRequest(`/books/${bookAId}/notes?pageNumber=3`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(!bookNotesRes.data.some((n) => n.id === note.id));

  // Highlight noteCount decreased back to 0
  const hlCheck = await apiRequest(`/books/${bookAId}/highlights?pageNumber=3`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const hlFound = hlCheck.data.find((item) => item.id === hl.id);
  assert.equal(hlFound.noteCount, 0);

  // Restore note (Undo toast flow)
  const restoreNoteRes = await apiRequest(`/books/${bookAId}/notes/${note.id}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(restoreNoteRes.status, 200);

  // Note is restored
  const restoredCheck = await apiRequest(`/books/${bookAId}/notes?pageNumber=3`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(restoredCheck.data.some((n) => n.id === note.id));

  // Invariant: Deleting highlight does NOT delete the note (remains as unanchored page note)
  await apiRequest(`/books/${bookAId}/highlights/${hl.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  const notesAfterHlDelete = await apiRequest(`/books/${bookAId}/notes?pageNumber=3`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.ok(
    notesAfterHlDelete.data.some((n) => n.id === note.id),
    "Note must be preserved when highlight is deleted",
  );
});

test("22.4 - Strict User Isolation for Notes & Global Notes", async () => {
  // User B queries global notes -> User A's notes are NOT returned
  const userBNotes = await apiRequest("/notes", {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(userBNotes.status, 200);
  assert.equal(userBNotes.data.total, 0);
  assert.equal(userBNotes.data.notes.length, 0);

  // User B tries to view User A's book notes -> 404
  const userBBookNotes = await apiRequest(`/books/${bookAId}/notes`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(userBBookNotes.status, 404);
});
