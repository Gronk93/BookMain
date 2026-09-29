import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

let userToken = null;

before(async () => {
  await startServer();

  const reg = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: `inspector_${Date.now()}@bookmind.app`, password: "password123" },
  });
  userToken = reg.data.token;
});

after(() => {
  stopServer();
});

test("PDF Inspection extracts real page count and metadata from 1-page PDF", async () => {
  const buf = await fsp.readFile(path.join(fixturesDir, "valid-1-page.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([buf], { type: "application/pdf" }), "valid-1-page.pdf");

  const res = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.book.totalPages, 1);
  assert.equal(res.data.book.title, "Test Single Page");
  assert.equal(res.data.book.author, "Author One");
  assert.equal(res.data.book.sourceType, "pdf");
  assert.equal(res.data.book.processingStatus, "ready_for_processing");
});

test("PDF Inspection extracts exact 5 pages from 5-page PDF with user overrides", async () => {
  const buf = await fsp.readFile(path.join(fixturesDir, "valid-5-pages.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([buf], { type: "application/pdf" }), "valid-5-pages.pdf");
  formData.append("title", "Mi Titulo Personalizado");
  formData.append("author", "Autor Sobrescrito");

  const res = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });

  assert.equal(res.status, 201);
  assert.equal(res.data.book.totalPages, 5);
  assert.equal(res.data.book.title, "Mi Titulo Personalizado");
  assert.equal(res.data.book.author, "Autor Sobrescrito");
});
