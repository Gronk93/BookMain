import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest, getBaseUrl } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userTokenA = null;
let userTokenB = null;
let bookIdA = null;

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

  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `retrieval_a_${Date.now()}@bookmind.app`, password: "password123", displayName: "User A" },
  });
  userTokenA = regA.data.token;

  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `retrieval_b_${Date.now()}@bookmind.app`, password: "password123", displayName: "User B" },
  });
  userTokenB = regB.data.token;

  // User A imports reader-100-pages.pdf
  const pdfBuf = await fsp.readFile(path.join(fixturesDir, "reader-100-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([pdfBuf], { type: "application/pdf" }), "reader-100-pages.pdf");
  formData.append("title", "100 Pages Book For Retrieval Tests");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userTokenA}` },
    body: formData,
  });
  assert.equal(importRes.status, 201);
  bookIdA = importRes.data.book.id;

  await waitForJob(bookIdA, userTokenA);
});

after(() => {
  stopServer();
});

test("18.1 - CTQ-BM05-01: GET /books/:id/pages/48 returns page 48 with text and metadata", async () => {
  const pageRes = await apiRequest(`/books/${bookIdA}/pages/48`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(pageRes.status, 200);
  assert.equal(pageRes.data.pageNumber, 48);
  assert.ok(pageRes.data.normalizedText.includes("pagina numero 48"));
  assert.ok(Array.isArray(pageRes.data.textBlocks));
  assert.ok(pageRes.data.textBlocks.length > 0);
  assert.ok(pageRes.data.width > 0);
  assert.ok(pageRes.data.height > 0);
});

test("18.2 - CTQ-BM05-03: GET /books/:id/pages/48/preview returns valid PNG image stream", async () => {
  const previewRes = await fetch(`${getBaseUrl()}/api/books/${bookIdA}/pages/48/preview`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });

  assert.equal(previewRes.status, 200);
  assert.equal(previewRes.headers.get("content-type"), "image/png");
  const buf = await previewRes.arrayBuffer();
  assert.ok(buf.byteLength > 100);
});

test("18.3 - Requesting non-existent page numbers returns 404 or 400", async () => {
  const badPageHigh = await apiRequest(`/books/${bookIdA}/pages/999`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(badPageHigh.status, 404, "Page beyond totalPages returns 404");

  const badPageZero = await apiRequest(`/books/${bookIdA}/pages/0`, {
    headers: { Authorization: `Bearer ${userTokenA}` },
  });
  assert.equal(badPageZero.status, 400, "Non-positive page number returns 400");
});

test("18.4 - CTQ-BM05-07: Strict user isolation prevents User B from accessing User A pages and previews", async () => {
  const bPage = await apiRequest(`/books/${bookIdA}/pages/48`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(bPage.status, 404, "Cross-user page access must return 404");

  const bPreview = await fetch(`${getBaseUrl()}/api/books/${bookIdA}/pages/48/preview`, {
    headers: { Authorization: `Bearer ${userTokenB}` },
  });
  assert.equal(bPreview.status, 404, "Cross-user preview access must return 404");
});
