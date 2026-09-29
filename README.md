# BookMind

A focused reading workspace for a more intentional reading experience.

BookMind transforms the reading experience by pairing modern, warm editorial aesthetics with deep retention tools: multi-device synchronization, bookmarks, page notes, reading reflections, and seamless bilingual support.

---

## Technical Foundation (BM-PRD-02)

- **Frontend**: React 19, Vite, TailwindCSS, Wouter, TanStack Query v5, i18next (`es-MX` and `en-US`), Lucide Icons.
- **Backend**: Express 5, Pino Logger, CORS, Cookie Parser, Node.js native crypto password hashing.
- **Persistence**: PostgreSQL + Drizzle ORM (with in-memory fallback store for offline development and testing).
- **Contracts**: OpenAPI 3.1 specification driving Orval code generation (`@workspace/api-client-react` & `@workspace/api-zod`).
- **Offline & PWA**: Web App Manifest and Service Worker with stale-while-revalidate caching.
- **CI/CD**: GitHub Actions workflow validating typecheck, builds, and automated tests.

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

# Run test suite
pnpm test

# Build production bundles
pnpm run build
```

---

## Documentation

- [Architecture & Design Decisions](docs/architecture.md)
- [Legacy Replit Notes](docs/legacy/replit.md)

---

## License

MIT
