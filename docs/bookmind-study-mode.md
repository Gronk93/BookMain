# BookMind — Study Mode, Grounded Summaries & Flashcards (BM-PRD-08)

BookMind Study Mode transforms passive reading into an active learning system with strict source grounding, verified citations, concept extraction, editable flashcards, and deterministic spaced repetition.

---

## 1. Architecture Overview

```text
READER (Pages, Highlights, Notes, Separators)
      │
      ▼
STUDY MODE HUB (/study, /study/:bookId)
      ├── 1. Grounded Summaries (Brief, Standard, Deep, Personal)
      ├── 2. Core Concepts (Essential, High, Medium + Definitions)
      ├── 3. Flashcards (Concept, Question, Cloze + Origin tracking)
      └── 4. Review Sessions (Spaced Repetition: Again, Hard, Good, Easy)
```

---

## 2. Study Scopes

Every study artifact (Summary, Concepts, Flashcard Deck) operates on a canonical scope:

| Scope | Specification | Validation |
|---|---|---|
| `page` | Specific single page | `1 <= pageNumber <= totalPages` |
| `page_range` | Contiguous range of pages | `1 <= startPage <= endPage <= totalPages` |
| `separator` | Chapter or reading milestone section | User-owned separator bounding `startPage..endPage` |
| `book` | Entire book | Processed via RAG retrieval or hierarchical map-reduce |
| `highlights` | User-curated highlights | Active highlights only (`deleted_at IS NULL`) |

### Personal Study Summaries
- **Book-only summary:** Synthesizes solely text from author pages.
- **Personal study summary:** Integrates user highlights and notes alongside author content. User notes are strictly separated and labeled (`Tu nota`) so they are never misrepresented as author text (CTQ BM-08-03).

---

## 3. Strict Source Grounding & Citations

1. **RAG-Backed Retrieval:** Study services retrieve relevant chunks through the verified retriever and citation validator.
2. **Citation Deep Links:** All claims and AI-generated flashcards cite specific pages in the format `[p. X]`.
3. **Interactive Navigation:** Clicking any citation badge opens the reader at `/read/:bookId?page=X&source=:sourceId`. Browser Back seamlessly returns to the study hub.
4. **Validation Guardrail:** Any AI flashcard returned without a verifiable source chunk in the active scope is immediately rejected and discarded (CTQ BM-08-04).

---

## 4. Flashcards & Deck Management

- **Card Types:**
  - `concept`: "What does X mean?" → Definition & context.
  - `question`: Conceptual question → Verified answer.
  - `cloze`: Fill-in-the-blank prompt (e.g., "Vision precedes _____") → Omitted term.
- **Card Origins:**
  - `ai`: Generated with citations and verified chunks.
  - `manual`: Created by reader without mandatory AI grounding.
- **Card Actions:** Create, edit front/back/explanation, delete, duplicate.
- **Generation Quantities:** 5, 10, or 20 cards per batch.
- **Deduplication:** Content normalization and SHA-256 hashing prevent duplicate cards within the same deck.

---

## 5. Spaced Repetition Engine

Reviews implement a deterministic spaced repetition algorithm encapsulated in `SpacedRepetitionEngine`:

```typescript
export class SpacedRepetitionEngine {
  calculateNextReview(rating: FlashcardReviewRating, previousIntervalDays: number): {
    nextIntervalDays: number;
    dueAt: Date;
  };
}
```

### Invariant & Intervals:
$$\text{Again} < \text{Hard} < \text{Good} < \text{Easy}$$

| Rating | Interval Increment | Next Due |
|---|---|---|
| `again` | Reset to 0 days | Today (now) |
| `hard` | +1 day (or $1.2\times$ previous) | Tomorrow |
| `good` | +3 days (or $2.0\times$ previous) | In 3 days |
| `easy` | +7 days (or $3.0\times$ previous) | In 7 days |

---

## 6. Review Sessions & Persistence

- Starting a review initializes a `study_sessions` record (`cards_seen`, `cards_again`, `cards_hard`, `cards_good`, `cards_easy`).
- Cards are served ordered by `due_at <= now`.
- Keyboard shortcuts:
  - `Space`: Reveal answer
  - `1`: Again
  - `2`: Hard
  - `3`: Good
  - `4`: Easy
- When all due cards are answered, session metrics are persisted and a summary screen displays the breakdown.
- Progress and due dates survive logout and re-login across any device.

---

## 7. Outdated Artifact Detection (Stale Content)

- Every summary, concept, and card tracks `source_hash` and `generation_version`.
- If a book is reprocessed or page contents change, existing artifacts are marked with `status = 'outdated'`.
- Outdated artifacts are **never deleted silently**; the UI informs the reader with an alert banner:
  > *"El contenido fuente cambió desde que se creó este material."*

---

## 8. Multi-User Isolation & Privacy

- All study tables enforce `user_id` ownership:
  - `study_summaries`, `study_summary_sources`
  - `study_concepts`, `study_concept_sources`
  - `flashcard_decks`, `flashcards`, `flashcard_reviews`
  - `study_sessions`
- Queries from User B attempting to view, review, or delete User A's study artifacts return `404 Not Found`.
- Logging explicitly excludes card fronts, card backs, notes, and summary text (CTQ BM-08-09).
