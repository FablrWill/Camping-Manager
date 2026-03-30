## 2026-03-30 — Session 5b: Knowledge Base Architecture + Corpus

### Planned (parallel session)
- Full RAG architecture for NC camping knowledge base
- Hybrid retrieval: Vectra (vector/semantic) + SQLite FTS5 (keyword)
- 5 new Prisma models planned, PDF ingestion pipeline designed

### Created
- `data/research/` — 7 markdown files covering NC camping topics
- `data/pdfs/` — 4 PDF guides for ingestion

### Key Decisions
- **Vectra over sqlite-vec** — sqlite-vec is alpha; Vectra swaps to pgvector on Vercel
- **OpenAI for embeddings, Claude for chat** — entire corpus under $1
