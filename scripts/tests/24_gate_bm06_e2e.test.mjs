import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userTokenA = null;
let userTokenB = null;
let bookId = null;

async function waitForJobCompletion(bId, token, maxWaitMs = 15000) {
  const start = Date.now();
  const url = `/books/${bId}/processing`;
  while (Date.now() - start < maxWaitMs) {
    const res = await apiRequest(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if ((res.data?.status === "completed" && res.data?.summary) || res.data?.status === "failed") {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Processing job for book ${bId} timed out`);
}

before(async () => {
  await startServer();

  // Register User A
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email: `bm06_gate_a_${Date.now()}@bookmind.app`,
      password: "password123",
      displayName: "BM06 User A",
    },
  });
  userTokenA = regA.data.token;

  // Register User B (for isolation tests)
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email: `bm06_gate_b_${Date.now()}@bookmind.app`,
      password: "password123",
      displayName: "BM06 User B",
    },
  });
  userTokenB = regB.data.token;

  // Import digital PDF (5 pages)
  const digBuf = await fsp.readFile(path.join(fixturesDir, "digital-5-pages.pdf"));
  const digForm = new FormData();
  digForm.append("file", new Blob([digBuf], { type: "application/pdf" }), "digital-5-pages.pdf");
  digForm.append("title", "BM-06 Invariant Gate Book");
  const digRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: digForm,
  });
  assert.equal(digRes.status, 201);
  bookId = digRes.data.book.id;
  await waitForJobCompletion(bookId, userTokenA);
});

after(async () => {
  await stopServer();
});

test("Gate 1: Exact text quote remains stable & anchored independently of visual typography preferences", async () => {
  // 1. Fetch page 1 text to get an exact quote
  const pageRes = await apiRequest(`/books/${bookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pageRes.status, 200);
  const text = pageRes.data.normalizedText || pageRes.data.textContent;
  assert.ok(text.length > 20, "Page should have extractable text");

  // Pick a distinct 25-character slice
  const exactQuote = text.slice(5, 30);
  const prefix = text.slice(0, 5);
  const suffix = text.slice(30, 45);

  // 2. Create highlight
  const hlRes = await apiRequest(`/books/${bookId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 1,
      startBlockId: "b-0",
      startOffset: 5,
      endBlockId: "b-0",
      endOffset: 30,
      exactText: exactQuote,
      prefixText: prefix,
      suffixText: suffix,
      color: "yellow",
      category: "important",
    },
  });
  assert.equal(hlRes.status, 201);
  const hl = hlRes.data;
  assert.equal(hl.exactText, exactQuote);
  assert.equal(hl.anchorStatus, "resolved");
  assert.ok(hl.textHash, "textHash should be generated");

  // 3. Simulate typography changes in user preferences (18px -> 24px, serif -> sans, margin wide)
  const prefRes = await apiRequest("/me/preferences", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      readerPreferences: {
        fontSize: 24,
        fontFamily: "serif",
        theme: "night",
        margin: "wide",
      },
    },
  });
  assert.equal(prefRes.status, 200);

  // 4. Re-fetch highlight and verify exact quote and anchor offsets remain completely untouched
  const fetchRes = await apiRequest(`/books/${bookId}/highlights?pageNumber=1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(fetchRes.status, 200);
  const found = fetchRes.data.find((h) => h.id === hl.id);
  assert.ok(found);
  assert.equal(found.exactText, exactQuote);
  assert.equal(found.startOffset, 5);
  assert.equal(found.endOffset, 30);
  assert.equal(found.anchorStatus, "resolved");
});

test("Gate 2: 5 Canonical Colors and Categories persistence & updates", async () => {
  const colors = [
    { color: "yellow", category: "important" },
    { color: "green", category: "learned" },
    { color: "blue", category: "example" },
    { color: "red", category: "not_understood" },
    { color: "violet", category: "review" },
  ];

  const createdIds = [];

  for (const item of colors) {
    const res = await apiRequest(`/books/${bookId}/highlights`, {
      method: "POST",
      headers: { Authorization: `Bearer ${userTokenA}` },
      body: {
        pageNumber: 2,
        startBlockId: "b-0",
        startOffset: 0,
        endBlockId: "b-0",
        endOffset: 15,
        exactText: `Sample text for ${item.color}`,
        color: item.color,
        category: item.category,
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.color, item.color);
    assert.equal(res.data.category, item.category);
    createdIds.push(res.data.id);
  }

  // Update one highlight to a different color and category
  const targetId = createdIds[0];
  const updateRes = await apiRequest(`/books/${bookId}/highlights/${targetId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      color: "violet",
      category: "review",
    },
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.color, "violet");
  assert.equal(updateRes.data.category, "review");
});

test("Gate 3: Anchored Notes & Page Notes lifecycle", async () => {
  // 1. Create a highlight on page 3
  const hlRes = await apiRequest(`/books/${bookId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 3,
      startBlockId: "b-0",
      startOffset: 10,
      endBlockId: "b-0",
      endOffset: 35,
      exactText: "A key theoretical insight from chapter 3",
      color: "blue",
      category: "example",
    },
  });
  assert.equal(hlRes.status, 201);
  const highlightId = hlRes.data.id;

  // 2. Create anchored note attached to this highlight
  const note1Res = await apiRequest(`/books/${bookId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 3,
      highlightId,
      highlightText: "A key theoretical insight from chapter 3",
      content: "This example explains the core thesis.",
      color: "blue",
    },
  });
  assert.equal(note1Res.status, 201);
  assert.equal(note1Res.data.highlightId, highlightId);
  assert.equal(note1Res.data.content, "This example explains the core thesis.");

  // 3. Create unanchored page note
  const note2Res = await apiRequest(`/books/${bookId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 3,
      content: "General thought on this entire page.",
      color: "amber",
    },
  });
  assert.equal(note2Res.status, 201);
  assert.equal(note2Res.data.highlightId, null);

  // 4. Verify notes listing for page 3
  const listRes = await apiRequest(`/books/${bookId}/notes?pageNumber=3`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(listRes.status, 200);
  const pageNotes = listRes.data;
  assert.ok(pageNotes.some((n) => n.id === note1Res.data.id && n.highlightId === highlightId));
  assert.ok(pageNotes.some((n) => n.id === note2Res.data.id && !n.highlightId));
});

test("Gate 4: Note preservation upon highlight deletion & undo recovery", async () => {
  // 1. Create highlight with attached note on page 4
  const hlRes = await apiRequest(`/books/${bookId}/highlights`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 4,
      startBlockId: "b-0",
      startOffset: 0,
      endBlockId: "b-0",
      endOffset: 20,
      exactText: "Important temporary quote",
      color: "yellow",
    },
  });
  const hlId = hlRes.data.id;

  const noteRes = await apiRequest(`/books/${bookId}/notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      pageNumber: 4,
      highlightId: hlId,
      content: "Attached note that must survive highlight deletion.",
    },
  });
  const noteId = noteRes.data.id;

  // 2. Soft-delete highlight
  const delHlRes = await apiRequest(`/books/${bookId}/highlights/${hlId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(delHlRes.status, 200);

  // 3. Highlight should not appear in active list
  const activeHls = await apiRequest(`/books/${bookId}/highlights?pageNumber=4`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.ok(!activeHls.data.some((h) => h.id === hlId));

  // 4. Attached note MUST STILL EXIST (Section 25 / CTQ: notes are preserved)
  const notesAfter = await apiRequest(`/books/${bookId}/notes?pageNumber=4`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  const preservedNote = notesAfter.data.find((n) => n.id === noteId);
  assert.ok(preservedNote, "Note must be preserved when highlight is deleted");
  assert.equal(preservedNote.content, "Attached note that must survive highlight deletion.");

  // 5. Restore highlight (Undo)
  const restoreRes = await apiRequest(`/books/${bookId}/highlights/${hlId}/restore`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(restoreRes.status, 200);

  // Verify highlight is back
  const restoredHls = await apiRequest(`/books/${bookId}/highlights?pageNumber=4`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.ok(restoredHls.data.some((h) => h.id === hlId));
});

test("Gate 5: Reprocess Invariance & Ambiguity Safe Degradation", async () => {
  // Trigger idempotent reprocessing
  const reprocRes = await apiRequest(`/books/${bookId}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: { forceOcr: false },
  });
  assert.equal(reprocRes.status, 202);

  // Wait for reprocess completion
  await waitForJobCompletion(bookId, userTokenA);

  // Fetch highlights: all prior valid highlights should still be active and resolved
  const hls = await apiRequest(`/books/${bookId}/highlights`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(hls.status, 200);
  assert.ok(hls.data.length >= 3, "Highlights must survive reprocess");
  for (const h of hls.data) {
    assert.notEqual(h.anchorStatus, "orphaned", "No valid highlight should be orphaned after reprocess");
  }
});

test("Gate 6: Global Notes Search & Filtering (GET /notes)", async () => {
  // 1. Search for unique keyword from Gate 4
  const searchRes = await apiRequest("/notes?search=theoretical", {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(searchRes.status, 200);
  assert.ok(searchRes.data.notes.length >= 1);
  const found = searchRes.data.notes[0];
  assert.ok(
    found.content.includes("thesis") || found.highlightText?.includes("theoretical"),
    "Global search should match note content or highlight text",
  );
  assert.equal(found.bookTitle, "BM-06 Invariant Gate Book");

  // 2. Filter by bookId
  const bookRes = await apiRequest(`/notes?bookId=${bookId}`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(bookRes.status, 200);
  assert.ok(bookRes.data.notes.length >= 2);
  assert.ok(bookRes.data.total >= 2);
  assert.equal(bookRes.data.page, 1);
});

test("Gate 7: Reading Range Separators & Boundary Protection", async () => {
  // 1. Create valid separator
  const sepRes = await apiRequest(`/books/${bookId}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      title: "Module 1: Foundations",
      startPage: 1,
      endPage: 3,
      color: "emerald",
    },
  });
  assert.equal(sepRes.status, 201);
  const sepId = sepRes.data.id;
  assert.equal(sepRes.data.startPage, 1);
  assert.equal(sepRes.data.endPage, 3);

  // 2. Attempt invalid separator: startPage > endPage
  const invRes1 = await apiRequest(`/books/${bookId}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      title: "Invalid range",
      startPage: 4,
      endPage: 2,
    },
  });
  assert.equal(invRes1.status, 400);

  // 3. Attempt invalid separator: endPage > totalPages (5)
  const invRes2 = await apiRequest(`/books/${bookId}/separators`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      title: "Exceeds total pages",
      startPage: 2,
      endPage: 99,
    },
  });
  assert.equal(invRes2.status, 400);

  // 4. Update separator
  const updateRes = await apiRequest(`/books/${bookId}/separators/${sepId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      title: "Module 1: Foundations (Updated)",
      endPage: 4,
    },
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.data.endPage, 4);

  // 5. Delete separator
  const delRes = await apiRequest(`/books/${bookId}/separators/${sepId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(delRes.status, 200);
});

test("Gate 8: CTQ-07 Security & Strict User Isolation", async () => {
  // User B cannot access User A's highlights
  const hlsB = await apiRequest(`/books/${bookId}/highlights`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(hlsB.status, 404);

  // User B cannot access User A's separators
  const sepsB = await apiRequest(`/books/${bookId}/separators`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(sepsB.status, 404);

  // User B cannot access User A's book notes
  const notesB = await apiRequest(`/books/${bookId}/notes`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(notesB.status, 404);

  // User B's global notes does not contain User A's notes
  const globalB = await apiRequest("/notes", {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(globalB.status, 200);
  assert.equal(globalB.data.notes.length, 0);
  assert.equal(globalB.data.total, 0);
});
