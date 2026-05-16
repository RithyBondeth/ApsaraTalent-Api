-- Migration: Enable pgvector and add semantic embedding column to career_scope
-- Replaces the pg_trgm approach with true semantic similarity via OpenAI embeddings.
--
-- text-embedding-3-small produces 1536-dimensional vectors.
-- Run this once; all statements are idempotent (IF NOT EXISTS).

-- 1. Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add the embedding column (nullable — populated asynchronously after creation)
ALTER TABLE career_scope
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. HNSW index for fast approximate cosine-distance nearest-neighbour search.
--    HNSW builds incrementally so it works correctly even with few rows,
--    unlike IVFFlat which requires a minimum number of rows to train.
CREATE INDEX IF NOT EXISTS idx_career_scope_embedding_hnsw
  ON career_scope
  USING hnsw (embedding vector_cosine_ops);
