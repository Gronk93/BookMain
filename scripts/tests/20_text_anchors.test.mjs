import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  computeTextHash,
  extractTextRange,
  extractContext,
  resolveAnchor,
} from "../../artifacts/api-server/src/lib/anchoring.ts";

test("20.1 - Normalization & Deterministic Text Hash", () => {
  const t1 = "  The quick\t\n  brown   fox   ";
  const t2 = "The quick brown fox";

  assert.equal(normalizeText(t1), "The quick brown fox");
  assert.equal(computeTextHash(t1), computeTextHash(t2));
  assert.equal(computeTextHash(t1).length, 64); // SHA-256 hex string
});

test("20.2 - Exact Range Extraction across single and multiple blocks", () => {
  const blocks = [
    { id: "b1", text: "Chapter 1: The Beginning." },
    { id: "b2", text: "It was the best of times, it was the worst of times." },
    { id: "b3", text: "In a hole in the ground there lived a hobbit." },
  ];

  // Single block substring
  const single = extractTextRange(blocks, "b2", 7, "b2", 24);
  assert.equal(single, "the best of times");

  // Multi-block span
  const multi = extractTextRange(blocks, "b1", 11, "b2", 6);
  assert.equal(multi, "The Beginning.\nIt was");

  // Invalid indices
  assert.equal(extractTextRange(blocks, "b2", 20, "b1", 5), null);
  assert.equal(extractTextRange(blocks, "b99", 0, "b1", 5), null);
  assert.equal(extractTextRange(blocks, "b1", -1, "b1", 5), null);
  assert.equal(extractTextRange(blocks, "b1", 5, "b1", 999), null);
});

test("20.3 - Context Extraction for disambiguation", () => {
  const blocks = [
    { id: "b1", text: "Introductory remarks before the passage." },
    { id: "b2", text: "Key statement to highlight here." },
    { id: "b3", text: "Concluding remarks following the passage." },
  ];

  const ctx = extractContext(blocks, "b2", 0, "b2", 13, 20);
  assert.ok(ctx.prefixText.includes("passage."));
  assert.ok(ctx.suffixText.includes("to highlight"));
});

test("20.4 - resolveAnchor: Direct exact match returns 'resolved'", () => {
  const blocks = [
    { id: "b1", text: "Art is a lie that makes us realize truth." },
  ];

  const res = resolveAnchor(blocks, {
    startBlockId: "b1",
    startOffset: 0,
    endBlockId: "b1",
    endOffset: 13,
    exactText: "Art is a lie ",
    textHash: computeTextHash("Art is a lie "),
  });

  assert.equal(res.status, "resolved");
  assert.equal(res.startBlockId, "b1");
  assert.equal(res.startOffset, 0);
  assert.equal(res.endBlockId, "b1");
  assert.equal(res.endOffset, 13);
  assert.equal(res.confidence, 1.0);
});

test("20.5 - resolveAnchor: Offset shift recovery after text re-extraction", () => {
  // Original quote shifted by 20 characters due to prepended header
  const blocks = [
    { id: "b1", text: "Page Header 2026 -- Art is a lie that makes us realize truth." },
  ];

  const res = resolveAnchor(blocks, {
    startBlockId: "b1",
    startOffset: 0, // was 0 before header was added
    endBlockId: "b1",
    endOffset: 13,
    exactText: "Art is a lie ",
    textHash: computeTextHash("Art is a lie "),
  });

  assert.equal(res.status, "recovered");
  assert.equal(res.startBlockId, "b1");
  assert.equal(res.startOffset, 20);
  assert.equal(res.endBlockId, "b1");
  assert.equal(res.endOffset, 33);
  assert.ok(res.confidence >= 0.85);
});

test("20.6 - resolveAnchor: Multiple occurrences disambiguated by prefix & suffix", () => {
  const blocks = [
    { id: "b1", text: "First instance: remember to breathe. Followed by exhale." },
    { id: "b2", text: "Second instance: remember to breathe. Followed by calm." },
  ];

  // We want to anchor the second occurrence: "remember to breathe" with suffix "calm"
  const res = resolveAnchor(blocks, {
    startBlockId: "b99", // old block id changed
    startOffset: 0,
    endBlockId: "b99",
    endOffset: 19,
    exactText: "remember to breathe",
    prefixText: "Second instance: ",
    suffixText: ". Followed by calm.",
  });

  assert.equal(res.status, "recovered");
  assert.equal(res.startBlockId, "b2");
  assert.equal(res.startOffset, 17);
  assert.equal(res.endBlockId, "b2");
  assert.equal(res.endOffset, 36);
});

test("20.7 - resolveAnchor: Ambiguous match without context triggers 'needs_review'", () => {
  const blocks = [
    { id: "b1", text: "Target word here." },
    { id: "b2", text: "Target word here." },
  ];

  // Both blocks have identical text and no distinguishing context
  const res = resolveAnchor(blocks, {
    startBlockId: "b99",
    startOffset: 0,
    endBlockId: "b99",
    endOffset: 11,
    exactText: "Target word",
    prefixText: null,
    suffixText: null,
  });

  assert.equal(res.status, "needs_review");
});

test("20.8 - resolveAnchor: Missing or empty page returns 'orphaned' or 'needs_review'", () => {
  const emptyRes = resolveAnchor([], {
    startBlockId: "b1",
    startOffset: 0,
    endBlockId: "b1",
    endOffset: 10,
    exactText: "Disappeared text",
  });
  assert.equal(emptyRes.status, "orphaned");

  const blocks = [{ id: "b1", text: "Completely unrelated content on this page." }];
  const missingRes = resolveAnchor(blocks, {
    startBlockId: "b1",
    startOffset: 0,
    endBlockId: "b1",
    endOffset: 10,
    exactText: "Disappeared text",
  });
  assert.equal(missingRes.status, "needs_review");
});
