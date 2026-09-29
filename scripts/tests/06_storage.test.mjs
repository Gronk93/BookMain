import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testStorageDir = path.resolve(__dirname, "../../data/storage/test-suite-06");

// Minimal direct implementation of LocalPrivateStorage logic to test isolated storage rules
class TestLocalStorage {
  constructor(rootDir) {
    this.rootDir = path.resolve(rootDir);
  }

  normalizeLogicalPath(logicalPath) {
    const cleaned = logicalPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = cleaned.split("/").filter((p) => p !== "" && p !== "." && p !== "..");
    return parts.join("/");
  }

  getPhysicalPath(logicalPath) {
    const normalized = this.normalizeLogicalPath(logicalPath);
    const resolved = path.resolve(this.rootDir, ...normalized.split("/"));
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Invalid path traversal detected for path: ${logicalPath}`);
    }
    return resolved;
  }

  async put(logicalPath, buffer) {
    const physicalPath = this.getPhysicalPath(logicalPath);
    await fsp.mkdir(path.dirname(physicalPath), { recursive: true });
    await fsp.writeFile(physicalPath, buffer);
    const stat = await fsp.stat(physicalPath);
    return {
      logicalPath: this.normalizeLogicalPath(logicalPath),
      physicalPath,
      sizeBytes: stat.size,
    };
  }

  async get(logicalPath, range) {
    const physicalPath = this.getPhysicalPath(logicalPath);
    const full = await fsp.readFile(physicalPath);
    if (range) {
      const end = range.end !== undefined ? range.end + 1 : full.length;
      return full.subarray(range.start, end);
    }
    return full;
  }

  async exists(logicalPath) {
    try {
      const physicalPath = this.getPhysicalPath(logicalPath);
      await fsp.access(physicalPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(logicalPath) {
    try {
      const physicalPath = this.getPhysicalPath(logicalPath);
      await fsp.unlink(physicalPath);
    } catch {}
  }
}

let storage;

before(async () => {
  await fsp.mkdir(testStorageDir, { recursive: true });
  storage = new TestLocalStorage(testStorageDir);
});

after(async () => {
  try {
    await fsp.rm(testStorageDir, { recursive: true, force: true });
  } catch {}
});

test("Storage normalizes logical paths and blocks path traversal attempts", () => {
  const norm1 = storage.normalizeLogicalPath("users/123/books/456/original.pdf");
  assert.equal(norm1, "users/123/books/456/original.pdf");

  const norm2 = storage.normalizeLogicalPath("..\\..\\etc\\passwd");
  assert.equal(norm2, "etc/passwd");

  const norm3 = storage.normalizeLogicalPath("///users/123/../../secret.txt");
  assert.equal(norm3, "users/123/secret.txt");
});

test("Storage puts, checks existence, reads, and deletes file with byte range", async () => {
  const logical = "users/u1/books/b1/original/original.pdf";
  const content = Buffer.from("Hello BookMind Storage Engine with Range Support!");

  const putRes = await storage.put(logical, content);
  assert.equal(putRes.sizeBytes, content.length);
  assert.equal(putRes.logicalPath, logical);

  const exists = await storage.exists(logical);
  assert.equal(exists, true);

  // Full get
  const readFull = await storage.get(logical);
  assert.deepEqual(readFull, content);

  // Byte range get (bytes 0 to 4 => 'Hello')
  const readRange = await storage.get(logical, { start: 0, end: 4 });
  assert.equal(readRange.toString(), "Hello");

  // Delete
  await storage.delete(logical);
  const existsAfter = await storage.exists(logical);
  assert.equal(existsAfter, false);
});
