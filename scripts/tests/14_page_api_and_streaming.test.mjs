import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest, getBaseUrl } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userTokenA = null;
let userTokenB = null;
let bookIdA = null;

before(async () => {
  await startServer();

  // Create User A
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `page_user_a_${Date.now()}@bookmind.app`, password: "password123", displayName: "User A" },
  });
  userTokenA = regA.data.token;

  // Create User B (for isolation tests)
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `page_user_b_${Date.now()}@bookmind.app`, password: "password123", displayName: "User B" },
  });
  userTokenB = regB.data.token;

  // User A imports digital-5-pages.pdf
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "digital-5-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "digital-5-pages.pdf");
  formData.append("title", "Digital Test Book 5 Pages");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });

  assert.equal(importRes.status, 201);
  bookIdA = importRes.data.book.id;

  // Wait for processing job to complete
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    const statusRes = await apiRequest(`/books/${bookIdA}/processing`, {
      headers: { Authorization: `Bearer ${userTokenA}` },
    });
    if (statusRes.data?.status === "completed" && statusRes.data?.summary) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
});

after(() => {
  stopServer();
});

test("14.1 - GET /books/:id/pages returns full list of processed pages", async () => {
  const res = await apiRequest(`/books/${bookIdA}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.bookId, bookIdA);
  assert.equal(res.data.totalPages, 5);
  assert.equal(res.data.pages.length, 5);

  for (let i = 0; i < 5; i++) {
    const page = res.data.pages[i];
    assert.equal(page.pageNumber, i + 1, `Page must be 1-based (${i + 1})`);
    assert.equal(page.pageType, "digital");
    assert.ok(page.characterCount > 80);
    assert.equal(page.ocrRequired, false);
  }
});

test("14.2 - GET /books/:id/pages/:pageNumber returns single page with textBlocks", async () => {
  const res = await apiRequest(`/books/${bookIdA}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.bookId, bookIdA);
  assert.equal(res.data.pageNumber, 1);
  assert.ok(res.data.normalizedText.length > 50);
  assert.ok(Array.isArray(res.data.textBlocks));
  assert.ok(res.data.textBlocks.length > 0);
  assert.equal(typeof res.data.textBlocks[0].x, "number");
  assert.equal(typeof res.data.textBlocks[0].y, "number");
});

test("14.3 - GET /books/:id/pages/:pageNumber/preview streams rendered PNG image", async () => {
  const url = `${getBaseUrl()}/api/books/${bookIdA}/pages/1/preview`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "image/png");
  const buffer = await res.arrayBuffer();
  assert.ok(buffer.byteLength > 1000, "Preview image buffer must be non-empty");
});

test("14.4 - CTQ-07: Strict user isolation prevents User B from accessing User A pages or preview", async () => {
  // User B tries to list User A pages
  const listRes = await apiRequest(`/books/${bookIdA}/pages`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(listRes.status, 404, "User B must receive 404 for User A pages list");

  // User B tries to get User A single page
  const pageRes = await apiRequest(`/books/${bookIdA}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(pageRes.status, 404, "User B must receive 404 for User A page");

  // User B tries to stream User A page preview
  const previewRes = await fetch(`${getBaseUrl()}/api/books/${bookIdA}/pages/1/preview`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(previewRes.status, 404, "User B must receive 404 for User A page preview");
});

test("14.5 - CTQ-08: POST /books/:id/reprocess is idempotent and does not duplicate pages", async () => {
  const reprocessRes = await apiRequest(`/books/${bookIdA}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(reprocessRes.status, 202, "Reprocess must return 202 Accepted");
  const jobId = reprocessRes.data.id;
  assert.ok(jobId, "Reprocess must return jobId");

  // Wait for reprocess to finish
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    const statusRes = await apiRequest(`/books/${bookIdA}/processing/${jobId}`, {
      headers: { Authorization: `Bearer ${userTokenA}` },
    });
    if (statusRes.data?.status === "completed" && statusRes.data?.summary) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Verify page count is still strictly 5 (no duplicates!)
  const pagesRes = await apiRequest(`/books/${bookIdA}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pagesRes.status, 200);
  assert.equal(pagesRes.data.pages.length, 5, "Total pages must remain 5 after reprocessing");
});
