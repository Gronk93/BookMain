import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkPage } from "../../artifacts/api-server/src/services/ai/rag/chunker.ts";

test("25.1 - Chunker isolates chunks strictly within a page boundary", () => {
  const page1 = {
    bookId: "book-1",
    pageNumber: 1,
    textContent:
      "Primer párrafo de la página uno. Explicación de la perspectiva y el arte visual.\n\n" +
      "Segundo párrafo con detalles sobre el punto de fuga y la percepción del observador.",
    qualityScore: 95,
    textSource: "native",
  };

  const chunks1 = chunkPage(page1);
  assert.ok(chunks1.length > 0);
  for (const c of chunks1) {
    assert.equal(c.bookId, "book-1");
    assert.equal(c.pageNumber, 1);
    assert.ok(c.textHash);
    assert.ok(c.tokenCount > 0);
    assert.equal(c.qualityScore, 95);
  }

  const page2 = {
    bookId: "book-1",
    pageNumber: 2,
    textContent: "Contenido completamente diferente en la página dos.",
    qualityScore: 90,
  };

  const chunks2 = chunkPage(page2);
  assert.ok(chunks2.length > 0);
  for (const c of chunks2) {
    assert.equal(c.pageNumber, 2);
  }
});

test("25.2 - Chunker preserves structured textBlocks and block IDs", () => {
  const page = {
    bookId: "book-test",
    pageNumber: 5,
    textBlocks: [
      { id: "blk-01", text: "El primer bloque de texto de la página cinco." },
      { id: "blk-02", text: "El segundo bloque que complementa el argumento principal." },
    ],
    qualityScore: 99,
  };

  const chunks = chunkPage(page);
  assert.ok(chunks.length >= 1);
  assert.equal(chunks[0].startBlockId, "blk-01");
  assert.equal(chunks[0].endBlockId, "blk-02");
  assert.ok(chunks[0].endOffset > 0);
});

test("25.3 - Chunker handles empty, blank or whitespace-only pages gracefully", () => {
  const blankPage = {
    bookId: "book-blank",
    pageNumber: 3,
    textContent: "    \n\n   \t  ",
  };
  const chunks = chunkPage(blankPage);
  assert.deepEqual(chunks, []);
});
