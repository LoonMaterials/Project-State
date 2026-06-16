PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  name TEXT,
  role TEXT,
  status TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS open_questions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS next_actions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT,
  due_date TEXT,
  completed_at TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  target_project_id TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS changes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  actor_id TEXT,
  timestamp TEXT,
  reason TEXT,
  object_type TEXT,
  object_id TEXT,
  object_title TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT,
  source_type TEXT,
  managed_path TEXT,
  checksum TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extracts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  text_path TEXT,
  checksum TEXT,
  text_bytes INTEGER NOT NULL DEFAULT 0,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS extract_chunks (
  id TEXT PRIMARY KEY,
  extract_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  text_path TEXT,
  checksum TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  attached_to_type TEXT NOT NULL,
  attached_to_id TEXT NOT NULL,
  file_name TEXT,
  managed_path TEXT,
  checksum TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_links (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  source_id TEXT,
  attached_to_type TEXT,
  attached_to_id TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_batches (
  id TEXT PRIMARY KEY,
  status TEXT,
  created_at TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake_items (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  status TEXT,
  arm_type TEXT,
  proposed_object_type TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposed_projects (
  id TEXT PRIMARY KEY,
  intake_batch_id TEXT,
  status TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposal_items (
  id TEXT PRIMARY KEY,
  proposed_project_id TEXT,
  item_type TEXT,
  status TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS draft_projects (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_id TEXT,
  extract_id TEXT,
  status TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_records (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  actor_id TEXT,
  approved_at TEXT,
  scope TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  stage TEXT,
  message TEXT,
  managed_path TEXT,
  record_json TEXT NOT NULL
);
