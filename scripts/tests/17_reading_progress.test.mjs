import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userToken = null;
let bookId = null;

async function waitForJob(bId, token) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const res = await apiRequest(`/books/${bId}/processing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if ((res.data?.status === "completed" && res.data?.summary) || res.data?.status === "failed") {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Job timed out");
}

before(async () => {
  await startServer();

  const reg = await apiRequest("/auth/register", {
    method: "POST",
    body: {
      email: `progress_user_${Date.now()}@bookmind.app`,
      password: "password123",
      displayName: "Progress User",
    },
  });
  userToken = reg.data.token;

  // Import reader-100-pages.pdf
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "reader-100-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "reader-100-pages.pdf");
  formData.append("title", "100 Pages Book For Progress Tests");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });
  assert.equal(importRes.status, 201);
  bookId = importRes.data.book.id;

  await waitForJob(bookId, userToken);
});

after(() => {
  stopServer();
});

test("17.1 - CTQ-BM05-02: Updating reading progress to page 48 persists and computes progressPercent", async () => {
  const progressRes = await apiRequest(`/books/${bookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      currentPage: 48,
    },
  });

  assert.equal(progressRes.status, 200);
  assert.equal(progressRes.data.currentPage, 48);
  assert.equal(progressRes.data.progressPercent, 48);
  assert.equal(progressRes.data.completed, false);
  assert.ok(progressRes.data.lastReadAt);

  // Verify book details reflect currentPage 48
  const bookRes = await apiRequest(`/books/${bookId}`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(bookRes.status, 200);
  assert.equal(bookRes.data.book.currentPage, 48);
});

test("17.2 - Section 26: Navigating to last page does NOT automatically mark book completed", async () => {
  const lastPageRes = await apiRequest(`/books/${bookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      currentPage: 100, // Total pages is 100
    },
  });

  assert.equal(lastPageRes.status, 200);
  assert.equal(lastPageRes.data.currentPage, 100);
  assert.equal(lastPageRes.data.progressPercent, 100);
  assert.equal(
    lastPageRes.data.completed,
    false,
    "Visiting last page must NOT automatically mark completed without explicit user intent",
  );

  // Now explicitly mark as completed
  const completeRes = await apiRequest(`/books/${bookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userToken}` },
    body: {
      currentPage: 100,
      completed: true,
    },
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.completed, true);
});
