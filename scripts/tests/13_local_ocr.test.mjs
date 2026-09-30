import test from "node:test";
import assert from "node:assert/strict";

test("13.1 - LocalOcrProvider returns normalized confidence and supports mock low-confidence", async () => {
  const { LocalOcrProvider } = await import(
    new URL("../../artifacts/api-server/src/services/ocr/local-ocr.provider.ts", import.meta.url).href
  );

  const provider = new LocalOcrProvider({ mockMode: true });
  const dummyBuffer = Buffer.from("dummy-image-bytes");

  // Normal recognition
  const normalResult = await provider.recognize({
    imageBuffer: dummyBuffer,
    pageNumber: 1,
  });

  assert.ok(normalResult.confidence >= 0 && normalResult.confidence <= 100, "Confidence must be normalized between 0 and 100");
  assert.ok(normalResult.confidence >= 70, "Default mock confidence should be >= 70");
  assert.ok(normalResult.text.length > 0, "Recognized text must not be empty");
  assert.ok(Array.isArray(normalResult.blocks), "Blocks must be an array");

  // Low confidence recognition (< 70)
  const lowResult = await provider.recognize({
    imageBuffer: dummyBuffer,
    pageNumber: 2,
    options: { mockLowConfidence: true },
  });

  assert.ok(lowResult.confidence < 70, `Confidence must be < 70 (got ${lowResult.confidence})`);
  assert.ok(lowResult.confidence >= 0, "Confidence must be >= 0");
});

test("13.2 - QualityEvaluator computes quality scores and flags low confidence", async () => {
  const { QualityEvaluator } = await import(
    new URL("../../artifacts/api-server/src/services/pdf-processing/quality-evaluator.ts", import.meta.url).href
  );

  const evaluator = new QualityEvaluator();

  // 1. Blank page
  const qBlank = evaluator.evaluate({
    pageType: "blank",
    normalizedText: "",
    ocrRequired: false,
  });
  assert.equal(qBlank.qualityScore, 100, "Blank page must have 100 quality score");
  assert.equal(qBlank.ocrStatus, "skipped");
  assert.ok(qBlank.flags.includes("blank_page"));

  // 2. Clean digital text
  const qDigital = evaluator.evaluate({
    pageType: "digital",
    normalizedText: "Este es un texto perfectamente legible y estructurado sin anomalias.",
    ocrRequired: false,
  });
  assert.ok(qDigital.qualityScore >= 95, "Clean digital text must have high quality score");
  assert.equal(qDigital.ocrStatus, "skipped");

  // 3. OCR with high confidence (>= 70)
  const qOcrHigh = evaluator.evaluate({
    pageType: "scanned",
    normalizedText: "Texto extraido correctamente mediante OCR.",
    ocrRequired: true,
    ocrConfidence: 94.2,
  });
  assert.equal(qOcrHigh.ocrStatus, "completed");
  assert.equal(qOcrHigh.qualityScore, 94);

  // 4. OCR with low confidence (< 70)
  const qOcrLow = evaluator.evaluate({
    pageType: "scanned",
    normalizedText: "T3xt0 c0n ru1d0 y b4j4 c4l1d4d.",
    ocrRequired: true,
    ocrConfidence: 55.4,
  });
  assert.equal(qOcrLow.ocrStatus, "low_confidence", "Confidence < 70 must trigger low_confidence status");
  assert.equal(qOcrLow.qualityScore, 55);
  assert.ok(qOcrLow.flags.includes("low_ocr_confidence"));

  // 5. Corrupted text with encoding artifacts (\uFFFD)
  const qCorrupted = evaluator.evaluate({
    pageType: "digital",
    normalizedText: "Texto con artefactos de codificacion \uFFFD\uFFFD\uFFFD\uFFFD\uFFFD graves.",
    ocrRequired: false,
  });
  assert.ok(qCorrupted.qualityScore < qDigital.qualityScore, "Encoding artifacts must penalize quality score");
  assert.ok(qCorrupted.flags.includes("encoding_artifacts") || qCorrupted.flags.includes("minor_encoding_artifacts"));
});
