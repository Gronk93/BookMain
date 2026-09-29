import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userAToken = null;
let userBToken = null;
let userABookId = null;
let originalFileSize = 0;

before(async () => {
  await startServer();

  // Register User A
  const regA = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `stream_a_${Date.now()}@bookmind.app`, password: "password123" },
  });
  userAToken = regA.data.token;

  // Register User B
  const regB = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `stream_b_${Date.now()}@bookmind.app`, password: "password123" },
  });
  userBToken = regB.data.token;

  // User A uploads 5-page PDF
  const buf = await fsp.readFile(path.join(fixturesDir, "valid-5-pages.pdf"));
  originalFileSize = buf.length;
  const formData = new FormData();
  formData.append("file", new Blob([buf], { type: "application/pdf" }), "valid-5-pages.pdf");

  const uploadRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userAToken}` },
    body: formData,
  });

  assert.equal(uploadRes.status, 201);
  userABookId = uploadRes.data.book.id;
});

after(() => {
  stopServer();
});

test("GET /books/:id/file returns file metadata with SHA-256 and logical path", async () => {
  const res = await apiRequest(`/books/${userABookId}/file`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.data.bookId, userABookId);
  assert.equal(res.data.originalFilename, "valid-5-pages.pdf");
  assert.equal(res.data.fileSizeBytes, originalFileSize);
  assert.ok(res.data.checksumSha256);
  assert.equal(res.data.storageProvider, "local");
  assert.ok(res.data.filePath.includes("original/original.pdf"));
});

test("GET /books/:id/original streams full PDF (HTTP 200)", async () => {
  const res = await apiRequest(`/books/${userABookId}/original`, {
    headers: { Authorization: `Bearer ${userAToken}` },
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.equal(Number(res.headers.get("content-length")), originalFileSize);
  assert.ok(Buffer.isBuffer(res.data));
  assert.equal(res.data.length, originalFileSize);
});

test("GET /books/:id/original streams partial content with Range request (HTTP 206)", async () => {
  const res = await apiRequest(`/books/${userABookId}/original`, {
    headers: {
      Authorization: `Bearer ${userAToken}` },
    headers: {
      Authorization: `Bearer ${userAToken}`,
      Range: "bytes=0-199",
    },
  });

  assert.equal(res.status, 206);
  assert.equal(res.headers.get("content-type"), "application/pdf");
  assert.equal(res.headers.get("content-range"), `bytes 0-199/${originalFileSize}`);
  assert.equal(Number(res.headers.get("content-length")), 200);
  assert.ok(Buffer.isBuffer(res.data));
  assert.equal(res.data.length, 200);
});

test("GET /books/:id/original rejects cross-user access with 404", async () => {
  const res = await apiRequest(`/books/${userABookId}/original`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });

  assert.equal(res.status, 404);
});

test("GET /books/:id/file rejects cross-user access with 404", async () => {
  const res = await apiRequest(`/books/${userABookId}/file`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });

  assert.equal(res.status, 404);
});
