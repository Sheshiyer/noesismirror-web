-- api/schema.sql
-- Access grants table for email -> personId mapping

CREATE TABLE IF NOT EXISTS access_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  person_id TEXT NOT NULL,
  granted_at TEXT DEFAULT (datetime('now')),
  granted_by TEXT,
  UNIQUE(email, person_id)
);

CREATE INDEX IF NOT EXISTS idx_grants_email ON access_grants(email);
CREATE INDEX IF NOT EXISTS idx_grants_person ON access_grants(person_id);

-- Seed with initial grant for testing
INSERT OR IGNORE INTO access_grants (email, person_id, granted_by)
VALUES ('harshita@example.com', 'harshita', 'system');
