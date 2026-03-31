-- FTS5 virtual table for keyword search on KnowledgeChunk
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts
  USING fts5(
    id UNINDEXED,
    title,
    content,
    tokenize = 'porter unicode61'
  );

-- Sync triggers: keep FTS5 in sync with KnowledgeChunk table
CREATE TRIGGER IF NOT EXISTS knowledge_chunks_fts_insert
  AFTER INSERT ON KnowledgeChunk BEGIN
    INSERT INTO knowledge_chunks_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
  END;

CREATE TRIGGER IF NOT EXISTS knowledge_chunks_fts_update
  AFTER UPDATE ON KnowledgeChunk BEGIN
    UPDATE knowledge_chunks_fts
    SET title = new.title, content = new.content
    WHERE id = new.id;
  END;

CREATE TRIGGER IF NOT EXISTS knowledge_chunks_fts_delete
  AFTER DELETE ON KnowledgeChunk BEGIN
    DELETE FROM knowledge_chunks_fts WHERE id = old.id;
  END;

-- vec0 virtual table for vector similarity search (voyage-3-lite = 512 dims)
CREATE VIRTUAL TABLE IF NOT EXISTS vec_knowledge_chunks
  USING vec0(embedding float[512]);
