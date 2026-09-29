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
    body: { email: `validator_${Date.now()}@bookmind.app`, password: "password123" },
  });
  userToken = reg.data.token;
});

after(() => {
  stopServer();
});

test("PDF Validation rejects empty file (0 bytes)", async () => {
  const emptyBuf = await fsp.readFile(path.join(fixturesDir, "empty.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([emptyBuf], { type: "application/pdf" }), "empty.pdf");

  const res = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });

  assert.equal(res.status, 400);
  assert.equal(res.data?.error?.code, "PDF_EMPTY");
});

test("PDF Validation rejects file without %PDF- signature", async () => {
  const fakeBuf = await fsp.readFile(path.join(fixturesDir, "fake.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([fakeBuf], { type: "application/pdf" }), "fake.pdf");

  const res = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });

  assert.equal(res.status, 400);
  assert.equal(res.data?.error?.code, "PDF_INVALID_SIGNATURE");
});

test("PDF Validation rejects corrupted PDF structure with 422", async () => {
  const corruptBuf = await fsp.readFile(path.join(fixturesDir, "corrupt.pdf"));
  const formData = new FormData();
  formData.append("file", new Blob([corruptBuf], { type: "application/pdf" }), "corrupt.pdf");

  const res = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });

  assert.equal(res.status, 422);
  assert.equal(res.data?.error?.code, "PDF_CORRUPTED");
});
