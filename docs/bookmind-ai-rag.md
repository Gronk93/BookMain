# BookMind AI, Contextual Dictionary & Grounded RAG (BM-PRD-07)

## 1. Architectural Overview

BookMind AI transforms processed book content into an interactive, grounded, and verifiable knowledge source. The AI is designed not as an external chatbot, but as an editorial tutor embedded directly into the reading experience.

Every response is strictly grounded in the book's verified content with verifiable source citations and page deep-linking.

```
                              ┌────────────────────────────────────────┐
                              │           BOOK READING CANVAS          │
                              │  (ReaderPageView / SelectionToolbar)   │
                              └──────────────────┬─────────────────────┘
                                                 │
                                                 │ Define / Explain / Ask
                                                 ▼
                              ┌────────────────────────────────────────┐
                              │         BOOKMIND AI GATEWAY            │
                              │     (/api/books/:id/ai/* routes)       │
                              └──────────────────┬─────────────────────┘
                                                 │
                 ┌───────────────────────────────┼───────────────────────────────┐
                 │                               │                               │
                 ▼                               ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
       │   CHUNK ENGINE   │            │ RETRIEVAL (RAG)  │            │ CONVERSATION MGR │
       │  (Page Bounded)  │            │  (Multi-Scope)   │            │  (Turn History)  │
       └────────┬─────────┘            └────────┬─────────┘            └────────┬─────────┘
                │                               │                               │
                ▼                               ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
       │  EMBEDDINGS &    │            │ ISOLATED CONTEXT │            │  ANTI-HALLUCIN.  │
       │   VECTOR STORE   │            │ (XML Escaping)   │            │    VERIFIER      │
       └──────────────────┘            └──────────────────┘            └──────────────────┘
```

---

## 2. Core Capabilities

### 2.1 Contextual Dictionary (4 Canonical Blocks)
Selecting a word in the text triggers the Contextual Dictionary, which queries `/api/books/:bookId/ai/define` and returns 4 distinct pedagogical blocks:
1. **Definición Formal:** Standard encyclopedic definition.
2. **En Palabras Sencillas:** Accessible explanation in plain language without jargon.
3. **En este Contexto:** Specific grounding on how the term functions within the book's argument.
4. **Ejemplo de Uso:** Representative practical example.
5. **Cita en el Texto:** Direct deep-link to the page and sentence.

### 2.2 Explain Selection
Selecting a passage or paragraph allows the reader to trigger `/api/books/:bookId/ai/explain`. The system analyzes the selected fragment alongside preceding and following context, producing:
- Pedagogical synthesis of the passage.
- Key concepts identified as tags.
- Verifiable citation chip.

### 2.3 Ask BookMind (Multi-Scope Conversational RAG)
The reader can open the side conversation panel (`BookMindPanel`) to conduct ongoing dialogues. Supported scopes include:
- **`selection`**: Restricts context strictly to selected quote and surrounding paragraph.
- **`page`**: Restricts context strictly to the current active page number.
- **`separator`**: Restricts context strictly to a user-defined reading range / chapter separator.
- **`book`**: Full book semantic retrieval across all indexed chunks.

---

## 3. Strict Grounding & Anti-Hallucination

BookMind enforces strict grounding policies:
1. **Evidence Validation:** When the retrieved chunks do not provide sufficient evidence or when querying outside the book's domain, the AI explicitly states:
   > *"No encontré suficiente información en este libro para responder con confianza."*
   and sets `insufficientEvidence: true` with zero citations.
2. **Citation Validation:** The `citation-validator` cross-references all candidate citations against the retrieved chunks before presenting them to the client. Hallucinated quotes or fabricated source IDs are rejected.
3. **Deep-linking:** Every citation includes `pageNumber`, `quote`, `startBlockId`, and character offsets. Clicking a citation in the UI navigates directly to that page and highlights the source passage.

---

## 4. Security & Privacy

### 4.1 Untrusted Content Isolation (Prompt Injection Immunity)
Book text is untrusted user input that may contain adversarial instructions (e.g. `"Ignore previous instructions"`). BookMind protects against injection by:
- Wrapping all retrieved book passages inside XML boundaries: `<source id="..." page="...">...</source>`.
- System prompt rules instructing the LLM to treat source tags strictly as passive data, never as executable commands.
- Pre-sanitizing book content to escape XML tags.

### 4.2 Strict User Isolation
All endpoints verify book and conversation ownership:
- User B attempting to index, query, or view User A's books or AI conversations receives `HTTP 404 (Not Found)`.
- Notes created by users are private and excluded from the public book RAG context by default.

---

## 5. Offline Determinism & Zero Cost in CI

To allow automated CI and test suites to run reliably without network flakiness, rate limits, or API bills:
- `MockEmbeddingProvider`: Produces deterministic unit-length vectors from token hashes. Cosine similarity mathematically corresponds to token overlap.
- `MockLlmProvider`: Deterministically fulfills dictionary, explanation, and QA requests without network calls.
- `InMemoryVectorStore`: Executes fast in-memory cosine similarity search.

---

## 6. Database Schema (Migration 0005)

The database schema introduces 6 tables:
- `book_ai_indexes`: Indexing state (`not_indexed`, `indexing`, `ready`, `failed`), embedding model, page and chunk counts.
- `ai_chunks`: Chunks segmented within page boundaries, token counts, quality scores, block IDs, and embeddings.
- `ai_conversations`: Persistent conversational threads with `scopeType` and `scopeRef`.
- `ai_messages`: User and assistant turns with token usage.
- `ai_message_sources`: Citations linked to individual assistant messages.
- `ai_usage`: Operation-level telemetry tracking duration, token counts, and cost estimates.
