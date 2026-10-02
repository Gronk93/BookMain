# BookMind

A focused reading workspace for a more intentional reading experience.

BookMind transforms the reading experience by pairing modern, warm editorial aesthetics with deep retention tools: multi-device synchronization, bookmarks, page notes, reading reflections, private PDF ingestion, and seamless bilingual support.

---

## Technical Foundation & Architecture (BM-PRD-02 / BM-PRD-07)

- **Frontend**: React 19, Vite, TailwindCSS, Wouter, TanStack Query v5, i18next (`es-MX` and `en-US`), Lucide Icons.
- **Backend**: Express 5, Pino Logger, Multer, CORS, Cookie Parser, Node.js native crypto.
- **Study Mode & Flashcards (BM-08)**: Verifiable grounded summaries (`brief`, `standard`, `deep`, and personal study summaries), key concept extraction with importance rankings, flashcard decks with AI (`concept`, `question`, `cloze`) and manual creation, deterministic spaced repetition (`Again < Hard < Good < Easy`), review sessions with persistence, stale artifact detection, and non-blocking reader operation.
- **AI & RAG Engine (BM-07)**: Page-bounded chunking, multi-scope semantic retrieval (`selection`, `page`, `separator`, `book`), contextual dictionary (4 blocks), explain selection, conversation persistence, strict grounding & anti-hallucination verification, untrusted source prompt injection defense, and offline deterministic unit vector token embeddings with 0 external API cost.
- **PDF Engine & Processing (BM-04/BM-05)**: `pdf-lib` document inspection, native text extraction, page classification, local OCR fallback with quality scoring, double spread layouts, and reflowable typography.
- **Highlights & Anchoring (BM-06)**: Stable text anchoring resilient to visual reflow, 5 canonical colors & categories, anchored notes, reading separators, and global notes search.
- **Private Storage**: Local filesystem private storage provider (`users/{userId}/books/{bookId}/original/original.pdf`) with path traversal defenses and HTTP Range byte-serving streaming (HTTP 206).
- **Persistence**: PostgreSQL + Drizzle ORM (with in-memory fallback store for offline development and testing).
- **Contracts**: OpenAPI 3.1 specification driving Orval code generation (`@workspace/api-client-react` & `@workspace/api-zod`).
- **Offline & PWA**: Web App Manifest and Service Worker with stale-while-revalidate caching.
- **CI/CD**: GitHub Actions workflow validating typecheck, builds, and 152 automated tests across 39 suites.

---

## Getting Started

### 1. Prerequisites
- Node.js 22+
- pnpm 10+ (`corepack enable pnpm`)

### 2. Installation
```bash
pnpm install
```

### 3. Local Development
Run the backend API server and frontend development server concurrently:

```bash
# Terminal 1: Backend Server (Port 5000)
pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend App (Port 5173)
pnpm --filter @workspace/bookmind run dev
```

Visit [http://localhost:5173](http://localhost:5173).

### 4. Running Tests & Quality Gates
```bash
# Typecheck entire workspace
pnpm run typecheck

# Run full test suite (152 tests across 39 suites: BM-01 to BM-08)
pnpm test

# Build production bundles
pnpm run build
```

---

## Documentation

- [BookMind AI & Grounded RAG](docs/bookmind-ai-rag.md)
- [Architecture & Design Decisions](docs/architecture.md)
- [Legacy Replit Notes](docs/legacy/replit.md)

---

## License

MIT
