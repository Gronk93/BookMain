import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import crypto from "node:crypto";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest, getBaseUrl } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userTokenA = null;
let userTokenB = null;

async function waitForJobCompletion(bookId, token, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await apiRequest(`/books/${bookId}/processing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data?.status === "completed" || res.data?.status === "failed") {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Processing job for book ${bookId} timed out`);
}

before(async () => {
  await startServer();

  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `gate_a_${Date.now()}@bookmind.app`, password: "password123", displayName: "Gate User A" },
  });
  userTokenA = regA.data.token;

  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `gate_b_${Date.now()}@bookmind.app`, password: "password123", displayName: "Gate User B" },
  });
  userTokenB = regB.data.token;
});

after(() => {
  stopServer();
});

test("CTQ-01 & CTQ-04: Digital PDF preserves original SHA-256 and does NOT trigger OCR", async () => {
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "digital-5-pages.pdf"));
  const expectedSha256 = crypto.createHash("sha256").update(pdfBuf).digest("hex");

  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "digital-5-pages.pdf");
  formData.append("title", "Digital 5 Pages CTQ Test");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  assert.equal(importRes.status, 201);
  const bookId = importRes.data.book.id;

  const job = await waitForJobCompletion(bookId, userTokenA);
  assert.equal(job.status, "completed");

  // CTQ-04: ocrPages must be 0 for digital PDF
  assert.equal(job.summary.ocrPages, 0, "Digital PDF must not receive unnecessary OCR");
  assert.equal(job.summary.digitalPages, 5);

  // CTQ-01: Verify original file metadata and sha256 remain strictly intact
  const fileRes = await apiRequest(`/books/${bookId}/file`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(fileRes.status, 200);
  assert.equal(fileRes.data.checksumSha256, expectedSha256, "Original checksum must match");
});

test("CTQ-02 & CTQ-03: Page count equality and 1-based page correspondence", async () => {
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "valid-5-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "valid-5-pages.pdf");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  const bookId = importRes.data.book.id;

  const job = await waitForJobCompletion(bookId, userTokenA);
  assert.equal(job.status, "completed");

  const pagesRes = await apiRequest(`/books/${bookId}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  // CTQ-02: COUNT(book_pages) === books.totalPages === job.processedPages
  assert.equal(pagesRes.data.pages.length, 5);
  assert.equal(job.processedPages, 5);
  assert.equal(job.totalPages, 5);

  // CTQ-03: 1-based page index, no off-by-one errors
  const page1 = await apiRequest(`/books/${bookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(page1.status, 200);
  assert.equal(page1.data.pageNumber, 1);
  assert.ok(page1.data.normalizedText.includes("Capitulo 1") || page1.data.normalizedText.includes("pagina 1"));

  const page5 = await apiRequest(`/books/${bookId}/pages/5`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(page5.status, 200);
  assert.equal(page5.data.pageNumber, 5);
  assert.ok(page5.data.normalizedText.includes("Capitulo 5") || page5.data.normalizedText.includes("pagina 5"));
});

test("CTQ-05 & CTQ-06: Scanned PDF triggers OCR and flags low confidence when appropriate", async () => {
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "scanned-3-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "scanned-3-pages.pdf");
  formData.append("title", "Scanned Document OCR Test");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  const bookId = importRes.data.book.id;

  const job = await waitForJobCompletion(bookId, userTokenA);
  assert.equal(job.status, "completed");

  // CTQ-05: Scanned PDF gets OCR
  assert.equal(job.summary.scannedPages, 3, "All 3 pages should be classified as scanned");
  assert.equal(job.summary.ocrPages, 3, "All 3 pages must undergo OCR");

  const pagesRes = await apiRequest(`/books/${bookId}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pagesRes.data.pages.length, 3);
  for (const page of pagesRes.data.pages) {
    assert.equal(page.pageType, "scanned");
    assert.equal(page.ocrRequired, true);
    assert.equal(page.textSource, "ocr");
    assert.ok(typeof page.ocrConfidence === "number");
    assert.ok(page.ocrConfidence >= 0 && page.ocrConfidence <= 100);
  }

  // CTQ-06: Reprocess with mockLowConfidence option to test flagging
  const reprocessRes = await apiRequest(`/books/${bookId}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: { mockOcrLowConfidence: true },
  });
  assert.equal(reprocessRes.status, 202);

  const reprocessJob = await waitForJobCompletion(bookId, userTokenA);
  assert.equal(reprocessJob.status, "completed");
  assert.ok(reprocessJob.summary.lowConfidencePages > 0, "Low confidence pages must be tracked in summary");

  const lowPageRes = await apiRequest(`/books/${bookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(lowPageRes.data.ocrStatus, "low_confidence", "OCR status must be flagged as low_confidence");
  assert.ok(lowPageRes.data.ocrConfidence < 70, "OCR confidence must be < 70");
});

test("CTQ-07: Strict User Isolation (User B cannot read User A pages or preview)", async () => {
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "valid-1-page.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "valid-1-page.pdf");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  const bookId = importRes.data.book.id;
  await waitForJobCompletion(bookId, userTokenA);

  // User B tries to read pages
  const bList = await apiRequest(`/books/${bookId}/pages`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(bList.status, 404);

  // User B tries to read single page
  const bPage = await apiRequest(`/books/${bookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(bPage.status, 404);

  // User B tries to read preview
  const bPreview = await fetch(`${getBaseUrl()}/api/books/${bookId}/pages/1/preview`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(bPreview.status, 404);
});

test("CTQ-08: Idempotent reprocessing with UNIQUE(book_id, page_number) constraint", async () => {
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "hybrid-3-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "hybrid-3-pages.pdf");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  const bookId = importRes.data.book.id;
  await waitForJobCompletion(bookId, userTokenA);

  // Initial pages count
  const pages1 = await apiRequest(`/books/${bookId}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pages1.data.pages.length, 3);

  // Reprocess 1st time
  await apiRequest(`/books/${bookId}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  await waitForJobCompletion(bookId, userTokenA);

  // Reprocess 2nd time
  await apiRequest(`/books/${bookId}/reprocess`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  await waitForJobCompletion(bookId, userTokenA);

  // Verified page count is still strictly 3 (no duplicate rows)
  const pagesFinal = await apiRequest(`/books/${bookId}/pages`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pagesFinal.data.pages.length, 3);
});

test("CTQ-09: Safe error reporting (no raw stack traces or internal secrets)", async () => {
  // Trigger processing cancel on non-existent book
  const badCancel = await apiRequest("/books/non-existent-id/processing/cancel", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(badCancel.status, 404);
  assert.ok(badCancel.data.error.code);
  assert.ok(badCancel.data.error.message);
  assert.equal(badCancel.data.error.stack, undefined, "Stack trace must not be exposed");
});
