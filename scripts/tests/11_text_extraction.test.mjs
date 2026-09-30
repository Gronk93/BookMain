import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("11.1 - PdfTextExtractor loads and extracts all pages correctly", async () => {
  const { PdfTextExtractor } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/pdf-text-extractor.ts", import.meta.url).href
  );

  const extractor = new PdfTextExtractor();
  const pdfPath = path.resolve(__dirname, "../fixtures/digital-5-pages.pdf");

  const result = await extractor.extractAllPages(pdfPath);
  assert.equal(result.totalPages, 5, "Must extract 5 pages");
  assert.equal(result.pages.length, 5, "Must have 5 page records");

  for (let i = 0; i < 5; i++) {
    const page = result.pages[i];
    assert.equal(page.pageNumber, i + 1, `Page number must be 1-based (${i + 1})`);
    assert.ok(page.rawText.length > 50, "Raw text should have substantial length");
    assert.ok(page.characterCount > 50, "Character count should be > 50");
    assert.ok(page.wordCount > 10, "Word count should be > 10");
    assert.ok(page.width > 0, "Width must be positive");
    assert.ok(page.height > 0, "Height must be positive");
    assert.ok(Array.isArray(page.textBlocks), "textBlocks must be an array");
    assert.ok(page.textBlocks.length > 0, "Should have textBlocks with coordinates");
    assert.equal(typeof page.textBlocks[0].x, "number", "TextBlock x must be number");
    assert.equal(typeof page.textBlocks[0].y, "number", "TextBlock y must be number");
  }
});

test("11.2 - TextNormalizer normalizes unicode, removes hyphens, and cleans spacing", async () => {
  const { TextNormalizer } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/text-normalizer.ts", import.meta.url).href
  );

  const normalizer = new TextNormalizer();

  // Test hyphen reconnect across newline
  const inputHyphen = "Esta es una informa-\nción de prueba que divide pala-\r\nbras.";
  const resHyphen = normalizer.normalize(inputHyphen);
  assert.ok(resHyphen.normalizedText.includes("información"), "Must rejoin informa-\\nción to información");
  assert.ok(resHyphen.normalizedText.includes("palabras"), "Must rejoin pala-\\r\\nbras to palabras");

  // Test non-breaking space and irregular whitespace
  const inputNBSP = "Texto\u00A0con\u2000espacios\u200Bespeciales.";
  const resNBSP = normalizer.normalize(inputNBSP);
  assert.ok(!resNBSP.normalizedText.includes("\u00A0"), "Must replace non-breaking space");
  assert.ok(!resNBSP.normalizedText.includes("\u2000"), "Must replace en-quad space");

  // Test control characters removal
  const inputControl = "Texto\x00limpio\x07de\x1Fcontrol.";
  const resControl = normalizer.normalize(inputControl);
  assert.equal(resControl.normalizedText, "Textolimpiodecontrol.");

  // Test character and word counts
  const inputCount = "Uno dos tres cuatro cinco.";
  const resCount = normalizer.normalize(inputCount);
  assert.equal(resCount.wordCount, 5);
  assert.equal(resCount.characterCount, inputCount.length);
});
