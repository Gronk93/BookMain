import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";
import { startServer, stopServer, apiRequest } from "./test-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");
const projectRootDir = path.resolve(__dirname, "../..");

before(async () => {
  await startServer();
});

after(() => {
  stopServer();
});

test("GATE BM-03 E2E: Complete PDF Ingestion, Storage, Integrity, Deduplication, and Streaming Lifecycle", async () => {
  const userAEmail = `gate03_a_${Date.now()}@bookmind.app`;
  const userBEmail = `gate03_b_${Date.now()}@bookmind.app`;
  const password = "PasswordGate03!";

  // 1. User A Register & Authenticate
  const regARes = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: userAEmail, password, displayName: "Gate User A" },
  });
  assert.equal(regARes.status, 201);
  const userAToken = regARes.data.token;
  const userAId = regARes.data.user.id;

  // 2. User A imports real 5-page PDF
  const pdf5Buffer = await fsp.readFile(path.join(fixturesDir, "valid-5-pages.pdf"));
  const formDataA = new FormData();
  formDataA.append("file", new Blob([pdf5Buffer], { type: "application/pdf" }), "Metodologia_Estudio.pdf");

  const importRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userAToken}` },
    body: formDataA,
  });

  assert.equal(importRes.status, 201);
  const bookA = importRes.data.book;
  const fileA = importRes.data.file;
  const jobA = importRes.data.job;

  // 3. Verify Real 5-page count (NOT hardcoded 128)
  assert.equal(bookA.totalPages, 5, "Total pages MUST be 5 extracted from the real PDF");
  assert.equal(bookA.title, "Metodologia de Estudio");
  assert.equal(bookA.author, "Investigador");
  assert.equal(bookA.sourceType, "pdf");
  assert.equal(bookA.processingStatus, "ready_for_processing");

  // 4. Verify Cryptographic Integrity (SHA-256)
  assert.ok(fileA.checksumSha256, "Checksum SHA-256 must be present");
  assert.equal(fileA.checksumSha256.length, 64, "SHA-256 hex string must be 64 characters");
  assert.equal(fileA.fileSizeBytes, pdf5Buffer.length);
  assert.equal(fileA.originalFilename, "Metodologia_Estudio.pdf");

  // 5. Verify Private Storage Structure
  const expectedLogicalSuffix = `users/${userAId}/books/${bookA.id}/original/original.pdf`;
  assert.ok(
    fileA.filePath.endsWith(expectedLogicalSuffix),
    `File path ${fileA.filePath} must end with ${expectedLogicalSuffix}`,
  );

  const physicalStoragePath = path.resolve(projectRootDir, "data/storage", fileA.filePath);
  const fileExistsOnDisk = await fsp
    .access(physicalStoragePath)
    .then(() => true)
    .catch(() => false);
  assert.equal(fileExistsOnDisk, true, "Physical file must exist in private local storage directory");

  // 6. Test Deduplication: User A re-uploads the exact same PDF
  const duplicateFormData = new FormData();
  duplicateFormData.append("file", new Blob([pdf5Buffer], { type: "application/pdf" }), "Metodologia_Estudio.pdf");

  const duplicateRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userAToken}` },
    body: duplicateFormData,
  });

  assert.equal(duplicateRes.status, 409, "Must return HTTP 409 Conflict for duplicate PDF");
  assert.equal(duplicateRes.data?.error?.code, "PDF_DUPLICATE");
  assert.equal(duplicateRes.data?.error?.details?.existingBookId, bookA.id);

  // 7. User B Isolation Verification
  const regBRes = await apiRequest("/auth/register", {
    method: "POST",
    body: { email: userBEmail, password, displayName: "Gate User B" },
  });
  assert.equal(regBRes.status, 201);
  const userBToken = regBRes.data.token;

  // User B tries to read User A's file metadata -> 404
  const leakMetaRes = await apiRequest(`/books/${bookA.id}/file`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(leakMetaRes.status, 404, "User B must receive 404 when querying User A's file metadata");

  // User B tries to download User A's original PDF -> 404
  const leakStreamRes = await apiRequest(`/books/${bookA.id}/original`, {
    headers: { Authorization: `Bearer ${userBToken}` },
  });
  assert.equal(leakStreamRes.status, 404, "User B must receive 404 when trying to stream User A's original PDF");

  // User B uploads the same PDF -> Succeeds (deduplication is strictly per-user)
  const formDataB = new FormData();
  formDataB.append("file", new Blob([pdf5Buffer], { type: "application/pdf" }), "UserB_Copy.pdf");

  const importBRes = await apiRequest("/books/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${userBToken}` },
    body: formDataB,
  });
  assert.equal(importBRes.status, 201, "User B must be able to import the same PDF to their own library");
  assert.notEqual(importBRes.data.book.id, bookA.id);

  // 8. Session Persistence & Range Streaming
  // User A logs out
  const logoutARes = await apiRequest("/auth/logout", {
    method: "POST",
    headers: { Authorization: `Bearer ${userAToken}` },
  });
  assert.equal(logoutARes.status, 200);

  // User A logs back in
  const loginARes = await apiRequest("/auth/login", {
    method: "POST",
    body: { email: userAEmail, password },
  });
  assert.equal(loginARes.status, 200);
  const refreshedTokenA = loginARes.data.token;

  // Verify book exists in library after server restart
  const bookDetailsRes = await apiRequest(`/books/${bookA.id}`, {
    headers: { Authorization: `Bearer ${refreshedTokenA}` },
  });
  assert.equal(bookDetailsRes.status, 200);
  assert.equal(bookDetailsRes.data.book.totalPages, 5);

  // Verify PDF streaming with Range request after restart
  const streamRangeRes = await apiRequest(`/books/${bookA.id}/original`, {
    headers: {
      Authorization: `Bearer ${refreshedTokenA}`,
      Range: "bytes=0-99",
    },
  });
  assert.equal(streamRangeRes.status, 206);
  assert.equal(streamRangeRes.headers.get("content-type"), "application/pdf");
  assert.equal(Number(streamRangeRes.headers.get("content-length")), 100);
  assert.equal(streamRangeRes.data.length, 100);

  // 9. Deletion & Storage Cleanup
  const deleteRes = await apiRequest(`/books/${bookA.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${refreshedTokenA}` },
  });
  assert.equal(deleteRes.status, 200);

  // Verify physical storage file is deleted
  const fileExistsAfterDelete = await fsp
    .access(physicalStoragePath)
    .then(() => true)
    .catch(() => false);
  assert.equal(fileExistsAfterDelete, false, "Physical storage file must be deleted upon book deletion");
});
