-- The job-search endpoint filters `company.location ILIKE '%...%'`. A leading
-- wildcard can't use a btree index, so this adds a pg_trgm GIN index — the same
-- treatment already given to employee.location and the job title/description.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_location_trgm
  ON company USING gin ("location" gin_trgm_ops);
