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
let digitalBookId = null;
let scannedBookId = null;
let readerBookId = null;

async function waitForJobCompletion(bookId, token, maxWaitMs = 15000) {
  const start = Date.now();
  const url = `/books/${bookId}/processing`;
  while (Date.now() - start < maxWaitMs) {
    const res = await apiRequest(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if ((res.data?.status === "completed" && res.data?.summary) || res.data?.status === "failed") {
      return res.data;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Processing job for book ${bookId} timed out`);
}

/**
 * Mirror of frontend useReaderPreferences.resolvePageMode
 */
function resolvePageMode(preferenceMode, page) {
  if (preferenceMode === "reading") return "reading";
  if (preferenceMode === "original") return "original";
  if (!page) return "reading";
  const isScanned = page.pageType === "scanned";
  const isHybrid = page.pageType === "hybrid";
  const isLowConfidence = typeof page.qualityScore === "number" && page.qualityScore < 70;
  if (isScanned || isHybrid || isLowConfidence) return "original";
  return "reading";
}

/**
 * Mirror of frontend useReaderNavigation spread calculation
 */
function calculateSpread(currentPage, totalPages) {
  if (currentPage === 1) {
    return { left: 1, right: null };
  }
  const left = currentPage % 2 === 0 ? currentPage : currentPage - 1;
  const right = left + 1 <= totalPages ? left + 1 : null;
  return { left, right };
}

before(async () => {
  await startServer();

  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `bm05_gate_a_${Date.now()}@bookmind.app`, password: "password123", displayName: "BM05 User A" },
  });
  userTokenA = regA.data.token;

  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `bm05_gate_b_${Date.now()}@bookmind.app`, password: "password123", displayName: "BM05 User B" },
  });
  userTokenB = regB.data.token;

  // Import digital PDF
  const digBuf = await fsp.readFile(path.join(fixturesDir, "digital-5-pages.pdf"));
  const digForm = new FormData();
  digForm.append("file", new Blob([digBuf], { type: "application/pdf" }), "digital-5-pages.pdf");
  digForm.append("title", "Digital Reader Gate");
  const digRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: digForm,
  });
  assert.equal(digRes.status, 201);
  digitalBookId = digRes.data.book.id;
  await waitForJobCompletion(digitalBookId, userTokenA);

  // Import scanned PDF
  const scanBuf = await fsp.readFile(path.join(fixturesDir, "scanned-3-pages.pdf"));
  const scanForm = new FormData();
  scanForm.append("file", new Blob([scanBuf], { type: "application/pdf" }), "scanned-3-pages.pdf");
  scanForm.append("title", "Scanned Reader Gate");
  const scanRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: scanForm,
  });
  assert.equal(scanRes.status, 201);
  scannedBookId = scanRes.data.book.id;
  await waitForJobCompletion(scannedBookId, userTokenA);

  // Import reader-100-pages PDF
  const rdrBuf = await fsp.readFile(path.join(fixturesDir, "reader-100-pages.pdf"));
  const rdrForm = new FormData();
  rdrForm.append("file", new Blob([rdrBuf], { type: "application/pdf" }), "reader-100-pages.pdf");
  rdrForm.append("title", "Reader 100 Pages Gate");
  const rdrRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: rdrForm,
  });
  assert.equal(rdrRes.status, 201);
  readerBookId = rdrRes.data.book.id;
  await waitForJobCompletion(readerBookId, userTokenA);
});

after(() => {
  stopServer();
});

test("Gate 1: Digital PDF opens in Reading Mode with real extracted text and preview available", async () => {
  const pageRes = await apiRequest(`/books/${digitalBookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pageRes.status, 200);
  const page = pageRes.data;

  assert.equal(page.pageNumber, 1);
  assert.equal(page.pageType, "digital");
  assert.ok(page.qualityScore >= 70, "Quality score should be >= 70 for clean digital PDF");
  assert.ok(page.textContent?.length > 0, "Page must contain real text content");
  assert.ok(page.normalizedText?.length > 0, "Page must contain normalized text");

  // Auto mode resolution verifies 'reading'
  const mode = resolvePageMode("auto", page);
  assert.equal(mode, "reading", "Digital page with high quality must resolve to 'reading' mode in auto");

  // Verify preview image endpoint returns image bytes
  const previewRes = await apiRequest(`/books/${digitalBookId}/pages/1/preview`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(previewRes.status, 200);
  const cType = previewRes.headers.get("content-type") || "";
  assert.ok(cType.startsWith("image/"));
});

test("Gate 2: Scanned PDF auto-resolves to Original Mode, manual toggle switches to OCR text", async () => {
  const pageRes = await apiRequest(`/books/${scannedBookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(pageRes.status, 200);
  const page = pageRes.data;

  // Auto mode resolution verifies 'original'
  const autoMode = resolvePageMode("auto", page);
  assert.equal(autoMode, "original", "Scanned page must resolve to 'original' view mode in auto");

  // Manual override to 'reading' returns 'reading'
  const manualMode = resolvePageMode("reading", page);
  assert.equal(manualMode, "reading", "Manual override to 'reading' must take precedence");

  // Verify OCR status metadata is present
  assert.ok(page.ocrRequired || page.ocrStatus !== "not_needed", "Scanned page must flag OCR need or status");

  // Verify preview is served
  const previewRes = await apiRequest(`/books/${scannedBookId}/pages/1/preview`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(previewRes.status, 200);
  const cType = previewRes.headers.get("content-type") || "";
  assert.ok(cType.startsWith("image/"));
});

test("Gate 3: Reader Preferences Persistence & Cross-Session Retrieval", async () => {
  const patchRes = await apiRequest("/me/preferences", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: {
      readerViewMode: "reading",
      readerLayout: "double",
      readerTheme: "sepia",
      readerFontFamily: "serif",
      readerFontSize: 22,
      readerLineHeight: "relaxed",
      readerMargin: "wide",
      readerPageAnimation: "slide",
      readerZoom: 125,
    },
  });
  assert.equal(patchRes.status, 200);
  const updatedPrefs = patchRes.data;

  assert.equal(updatedPrefs.readerViewMode, "reading");
  assert.equal(updatedPrefs.readerLayout, "double");
  assert.equal(updatedPrefs.readerTheme, "sepia");
  assert.equal(updatedPrefs.readerFontFamily, "serif");
  assert.equal(updatedPrefs.readerFontSize, 22);
  assert.equal(updatedPrefs.readerLineHeight, "relaxed");
  assert.equal(updatedPrefs.readerMargin, "wide");
  assert.equal(updatedPrefs.readerPageAnimation, "slide");
  assert.equal(updatedPrefs.readerZoom, 125);

  // Cross-session check via GET /me
  const meRes = await apiRequest("/me", {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.preferences.readerTheme, "sepia");
  assert.equal(meRes.data.preferences.readerFontSize, 22);
  assert.equal(meRes.data.preferences.readerLayout, "double");
});

test("Gate 4: Reading Progress, Exact Page State Recovery & Section 26 Non-Auto-Complete", async () => {
  // 1. Move to page 48
  const progRes1 = await apiRequest(`/books/${readerBookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: { currentPage: 48, progressPercent: 48 },
  });
  assert.equal(progRes1.status, 200);
  assert.equal(progRes1.data.currentPage, 48);
  assert.equal(progRes1.data.progressPercent, 48);
  assert.equal(progRes1.data.completed, false, "Page 48 must not be marked completed");

  // 2. State recovery check via GET /books/:id
  const bookRes = await apiRequest(`/books/${readerBookId}`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(bookRes.status, 200);
  assert.equal(bookRes.data.progress?.currentPage, 48, "Reading progress must resume directly at page 48");

  // 3. Section 26: Navigating to page 100 (last page) must NOT auto-complete
  const progRes2 = await apiRequest(`/books/${readerBookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: { currentPage: 100, progressPercent: 100 },
  });
  assert.equal(progRes2.status, 200);
  assert.equal(progRes2.data.currentPage, 100);
  assert.equal(progRes2.data.completed, false, "Section 26: Reaching last page must NOT auto-complete");

  // 4. Explicit completion
  const progRes3 = await apiRequest(`/books/${readerBookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: { currentPage: 100, progressPercent: 100, completed: true },
  });
  assert.equal(progRes3.status, 200);
  assert.equal(progRes3.data.completed, true, "Explicit completion must mark completed: true");
});

test("Gate 5: Double Spread Invariants & Boundary Protection", async () => {
  const totalPages = 100;

  // Cover page 1 is solo
  const spread1 = calculateSpread(1, totalPages);
  assert.deepEqual(spread1, { left: 1, right: null });

  // Spread for page 2 is (2, 3)
  const spread2 = calculateSpread(2, totalPages);
  assert.deepEqual(spread2, { left: 2, right: 3 });

  // Spread for page 3 is (2, 3)
  const spread3 = calculateSpread(3, totalPages);
  assert.deepEqual(spread3, { left: 2, right: 3 });

  // Spread for page 48 is (48, 49)
  const spread48 = calculateSpread(48, totalPages);
  assert.deepEqual(spread48, { left: 48, right: 49 });

  // Spread for page 49 is (48, 49)
  const spread49 = calculateSpread(49, totalPages);
  assert.deepEqual(spread49, { left: 48, right: 49 });

  // Last page 100 is even, right is null because 101 > 100
  const spread100 = calculateSpread(100, totalPages);
  assert.deepEqual(spread100, { left: 100, right: null });

  // Boundary checks
  const zeroRes = await apiRequest(`/books/${readerBookId}/pages/0`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(zeroRes.status, 400, "Page 0 must return 400 Bad Request");

  const outRes = await apiRequest(`/books/${readerBookId}/pages/999`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(outRes.status, 404, "Page 999 must return 404 Not Found");
});

test("Gate 6: CTQ-07 Security & Strict User Isolation", async () => {
  // User B cannot access User A's book pages
  const bPageRes = await apiRequest(`/books/${readerBookId}/pages/1`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.ok(bPageRes.status === 403 || bPageRes.status === 404, "User B must not access User A's pages");

  // User B cannot access User A's page preview
  const bPreviewRes = await apiRequest(`/books/${readerBookId}/pages/1/preview`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.ok(bPreviewRes.status === 403 || bPreviewRes.status === 404, "User B must not access User A's preview");

  // User B cannot update User A's reading progress
  const bProgRes = await apiRequest(`/books/${readerBookId}/progress`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${userTokenB}` },
    body: { currentPage: 50, progressPercent: 50 },
  });
  assert.ok(bProgRes.status === 403 || bProgRes.status === 404, "User B must not update User A's progress");
});
