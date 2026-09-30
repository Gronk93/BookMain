import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("12.1 - PageClassifier unit logic matches BM-PRD-04 classification rules", async () => {
  const { PageClassifier } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/page-classifier.ts", import.meta.url).href
  );

  const classifier = new PageClassifier();

  // Digital page: charCount >= 80, no images
  const digitalRes = classifier.classify({
    characterCount: 150,
    wordCount: 25,
    hasImages: false,
    imageCount: 0,
    width: 612,
    height: 792,
    rawText: "Este es un texto digital extenso que supera los ochenta caracteres y no contiene ninguna imagen incrustada.",
  });
  assert.equal(digitalRes.pageType, "digital");
  assert.equal(digitalRes.ocrRequired, false);

  // Scanned page: charCount < 30, has images
  const scannedRes = classifier.classify({
    characterCount: 5,
    wordCount: 1,
    hasImages: true,
    imageCount: 1,
    width: 612,
    height: 792,
    rawText: "12",
  });
  assert.equal(scannedRes.pageType, "scanned");
  assert.equal(scannedRes.ocrRequired, true);

  // Hybrid page: charCount >= 80, has images
  const hybridRes = classifier.classify({
    characterCount: 120,
    wordCount: 20,
    hasImages: true,
    imageCount: 1,
    width: 612,
    height: 792,
    rawText: "Este es un texto explicativo largo que acompana a una figura tecnica o diagrama ilustrado dentro del documento.",
  });
  assert.equal(hybridRes.pageType, "hybrid");
  assert.equal(hybridRes.ocrRequired, false);

  // Blank page: charCount == 0, no images
  const blankRes = classifier.classify({
    characterCount: 0,
    wordCount: 0,
    hasImages: false,
    imageCount: 0,
    width: 612,
    height: 792,
    rawText: "   \n\t  ",
  });
  assert.equal(blankRes.pageType, "blank");
  assert.equal(blankRes.ocrRequired, false);
});

test("12.2 - Classification on real generated PDF fixtures", async () => {
  const { PdfTextExtractor } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/pdf-text-extractor.ts", import.meta.url).href
  );
  const { PageClassifier } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/page-classifier.ts", import.meta.url).href
  );

  const extractor = new PdfTextExtractor();
  const classifier = new PageClassifier();

  // Test digital fixture
  const digitalDoc = await extractor.loadDocument(path.resolve(__dirname, "../fixtures/digital-5-pages.pdf"));
  const digitalPage1 = await extractor.extractPage(digitalDoc, 1);
  const cDigital = classifier.classify(digitalPage1);
  assert.equal(cDigital.pageType, "digital", "digital-5-pages.pdf page 1 must be classified as digital");
  assert.equal(cDigital.ocrRequired, false);
  await digitalDoc.cleanup?.();

  // Test scanned fixture
  const scannedDoc = await extractor.loadDocument(path.resolve(__dirname, "../fixtures/scanned-3-pages.pdf"));
  const scannedPage1 = await extractor.extractPage(scannedDoc, 1);
  const cScanned = classifier.classify(scannedPage1);
  assert.equal(cScanned.pageType, "scanned", "scanned-3-pages.pdf page 1 must be classified as scanned");
  assert.equal(cScanned.ocrRequired, true);
  await scannedDoc.cleanup?.();

  // Test hybrid fixture
  const hybridDoc = await extractor.loadDocument(path.resolve(__dirname, "../fixtures/hybrid-3-pages.pdf"));
  const hybridPage1 = await extractor.extractPage(hybridDoc, 1);
  const cHybrid = classifier.classify(hybridPage1);
  assert.equal(cHybrid.pageType, "hybrid", "hybrid-3-pages.pdf page 1 must be classified as hybrid");
  assert.equal(cHybrid.ocrRequired, false);
  await hybridDoc.cleanup?.();

  // Test blank fixture
  const blankDoc = await extractor.loadDocument(path.resolve(__dirname, "../fixtures/blank-page.pdf"));
  const blankPage1 = await extractor.extractPage(blankDoc, 1);
  const cBlank = classifier.classify(blankPage1);
  assert.equal(cBlank.pageType, "blank", "blank-page.pdf page 1 must be classified as blank");
  assert.equal(cBlank.ocrRequired, false);
  await blankDoc.cleanup?.();
});
