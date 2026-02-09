CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  postcode TEXT NOT NULL,
  address_label TEXT NOT NULL,
  address_id TEXT,
  address_json TEXT,
  service TEXT NOT NULL,
  other_service TEXT,
  notes TEXT,
  source_path TEXT NOT NULL,
  referrer TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  turnstile_verified INTEGER NOT NULL DEFAULT 0
);
