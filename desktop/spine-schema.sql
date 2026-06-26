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

-- Discovery foundation v0.1. These tables are additive and project-independent.
CREATE TABLE IF NOT EXISTS file_assets (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE CHECK(length(sha256) = 64),
  created_at TEXT NOT NULL,
  privacy_class TEXT NOT NULL DEFAULT 'local_only',
  retention_state TEXT NOT NULL DEFAULT 'active',
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_versions (
  id TEXT PRIMARY KEY,
  file_asset_id TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  byte_size INTEGER NOT NULL CHECK(byte_size >= 0),
  original_name TEXT NOT NULL,
  managed_path TEXT NOT NULL CHECK(managed_path LIKE 'quarantine/%' OR managed_path LIKE 'sources/%'),
  created_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  UNIQUE(file_asset_id, sha256),
  UNIQUE(id, file_asset_id),
  UNIQUE(id, file_asset_id, sha256),
  FOREIGN KEY(file_asset_id) REFERENCES file_assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS discovery_cases (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  confirmed_project_id TEXT,
  record_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discovery_case_files (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  file_asset_id TEXT NOT NULL,
  file_version_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  grouping_rationale TEXT NOT NULL DEFAULT '',
  record_json TEXT NOT NULL,
  UNIQUE(discovery_case_id, file_version_id),
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(file_version_id, file_asset_id) REFERENCES file_versions(id, file_asset_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS discovery_interactions (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  supersedes_interaction_id TEXT,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(supersedes_interaction_id) REFERENCES discovery_interactions(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS security_receipts (
  id TEXT PRIMARY KEY,
  scan_job_id TEXT NOT NULL,
  file_asset_id TEXT NOT NULL,
  file_version_id TEXT NOT NULL,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  verdict TEXT NOT NULL CHECK(verdict IN ('clean', 'threat_detected', 'suspicious', 'unknown', 'error')),
  eligible INTEGER NOT NULL CHECK(eligible IN (0, 1)),
  provider_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  supersedes_receipt_id TEXT,
  record_json TEXT NOT NULL,
  UNIQUE(scan_job_id),
  FOREIGN KEY(file_version_id, file_asset_id, sha256) REFERENCES file_versions(id, file_asset_id, sha256) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(supersedes_receipt_id) REFERENCES security_receipts(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK((verdict = 'clean' AND eligible = 1) OR (verdict <> 'clean' AND eligible = 0))
);

CREATE TABLE IF NOT EXISTS discovery_events (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS discovery_extractions (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  file_asset_id TEXT NOT NULL,
  file_version_id TEXT NOT NULL,
  source_sha256 TEXT NOT NULL CHECK(length(source_sha256) = 64),
  status TEXT NOT NULL CHECK(status IN ('complete', 'partial', 'metadata_only', 'unsupported', 'failed')),
  extractor_id TEXT NOT NULL,
  text_path TEXT,
  text_sha256 TEXT,
  text_bytes INTEGER NOT NULL DEFAULT 0 CHECK(text_bytes >= 0),
  created_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(file_version_id, file_asset_id, source_sha256) REFERENCES file_versions(id, file_asset_id, sha256) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS discovery_chunks (
  id TEXT PRIMARY KEY,
  discovery_extraction_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL CHECK(chunk_index >= 0),
  text_path TEXT NOT NULL CHECK(text_path LIKE 'discovery/%'),
  text_sha256 TEXT NOT NULL CHECK(length(text_sha256) = 64),
  text_bytes INTEGER NOT NULL CHECK(text_bytes >= 0),
  record_json TEXT NOT NULL,
  UNIQUE(discovery_extraction_id, chunk_index),
  FOREIGN KEY(discovery_extraction_id) REFERENCES discovery_extractions(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS idea_analysis_runs (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('human', 'deterministic', 'ai', 'hybrid')),
  status TEXT NOT NULL CHECK(status IN ('complete', 'partial', 'failed', 'cancelled', 'running')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS idea_privacy_authorizations (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  authorized_by TEXT NOT NULL,
  authorized_at TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK(purpose = 'idea_candidate_discovery'),
  privacy_class TEXT NOT NULL CHECK(privacy_class IN ('local_only', 'personal', 'confidential', 'restricted', 'provider_allowed')),
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS idea_transmission_receipts (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  analysis_run_id TEXT NOT NULL,
  authorization_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  transmitted_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(analysis_run_id) REFERENCES idea_analysis_runs(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(authorization_id) REFERENCES idea_privacy_authorizations(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  discovery_case_id TEXT NOT NULL,
  arm_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_checksum TEXT NOT NULL CHECK(length(payload_checksum) = 64),
  status TEXT NOT NULL CHECK(status IN ('accepted', 'queued', 'running', 'partial', 'complete', 'failed', 'cancel_requested', 'cancelled')),
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(analysis_run_id) REFERENCES idea_analysis_runs(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS idea_candidates (
  id TEXT PRIMARY KEY,
  analysis_run_id TEXT NOT NULL,
  discovery_case_id TEXT NOT NULL,
  client_candidate_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_by_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  candidate_type TEXT NOT NULL,
  working_label TEXT NOT NULL,
  record_json TEXT NOT NULL,
  UNIQUE(analysis_run_id, client_candidate_id),
  FOREIGN KEY(analysis_run_id) REFERENCES idea_analysis_runs(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS ai_analysis_result_receipts (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  analysis_run_id TEXT NOT NULL,
  result_page INTEGER NOT NULL CHECK(result_page >= 0),
  received_at TEXT NOT NULL,
  boundary TEXT NOT NULL CHECK(boundary = 'discovery_suggestions_pending_human_review'),
  record_json TEXT NOT NULL,
  UNIQUE(request_id, result_page),
  FOREIGN KEY(request_id) REFERENCES ai_analysis_jobs(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(analysis_run_id) REFERENCES idea_analysis_runs(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS idea_review_decisions (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  supersedes_decision_id TEXT,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(supersedes_decision_id) REFERENCES idea_review_decisions(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS confirmed_idea_units (
  id TEXT PRIMARY KEY,
  discovery_case_id TEXT NOT NULL,
  review_decision_id TEXT NOT NULL,
  title TEXT NOT NULL,
  confirmed_by TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  record_json TEXT NOT NULL,
  FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(review_decision_id) REFERENCES idea_review_decisions(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS file_assets_sha256_immutable
BEFORE UPDATE OF sha256 ON file_assets
BEGIN
  SELECT RAISE(ABORT, 'file asset checksum is immutable');
END;

CREATE TRIGGER IF NOT EXISTS file_versions_append_only_update
BEFORE UPDATE ON file_versions
BEGIN
  SELECT RAISE(ABORT, 'file versions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS file_versions_append_only_delete
BEFORE DELETE ON file_versions
BEGIN
  SELECT RAISE(ABORT, 'file versions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS discovery_interactions_append_only_update
BEFORE UPDATE ON discovery_interactions
BEGIN
  SELECT RAISE(ABORT, 'discovery interactions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS discovery_interactions_append_only_delete
BEFORE DELETE ON discovery_interactions
BEGIN
  SELECT RAISE(ABORT, 'discovery interactions are append-only');
END;

CREATE TRIGGER IF NOT EXISTS security_receipts_append_only_update
BEFORE UPDATE ON security_receipts
BEGIN
  SELECT RAISE(ABORT, 'security receipts are append-only');
END;

CREATE TRIGGER IF NOT EXISTS security_receipts_append_only_delete
BEFORE DELETE ON security_receipts
BEGIN
  SELECT RAISE(ABORT, 'security receipts are append-only');
END;

CREATE TRIGGER IF NOT EXISTS discovery_events_append_only_update
BEFORE UPDATE ON discovery_events
BEGIN
  SELECT RAISE(ABORT, 'discovery events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS discovery_events_append_only_delete
BEFORE DELETE ON discovery_events
BEGIN
  SELECT RAISE(ABORT, 'discovery events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS discovery_extractions_append_only_update
BEFORE UPDATE ON discovery_extractions BEGIN SELECT RAISE(ABORT, 'discovery extractions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS discovery_extractions_append_only_delete
BEFORE DELETE ON discovery_extractions BEGIN SELECT RAISE(ABORT, 'discovery extractions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS discovery_chunks_append_only_update
BEFORE UPDATE ON discovery_chunks BEGIN SELECT RAISE(ABORT, 'discovery chunks are append-only'); END;
CREATE TRIGGER IF NOT EXISTS discovery_chunks_append_only_delete
BEFORE DELETE ON discovery_chunks BEGIN SELECT RAISE(ABORT, 'discovery chunks are append-only'); END;

CREATE TRIGGER IF NOT EXISTS idea_privacy_authorizations_append_only_update
BEFORE UPDATE ON idea_privacy_authorizations BEGIN SELECT RAISE(ABORT, 'idea privacy authorizations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_privacy_authorizations_append_only_delete
BEFORE DELETE ON idea_privacy_authorizations BEGIN SELECT RAISE(ABORT, 'idea privacy authorizations are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_transmission_receipts_append_only_update
BEFORE UPDATE ON idea_transmission_receipts BEGIN SELECT RAISE(ABORT, 'idea transmission receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_transmission_receipts_append_only_delete
BEFORE DELETE ON idea_transmission_receipts BEGIN SELECT RAISE(ABORT, 'idea transmission receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_candidates_append_only_update
BEFORE UPDATE ON idea_candidates BEGIN SELECT RAISE(ABORT, 'idea candidates are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_candidates_append_only_delete
BEFORE DELETE ON idea_candidates BEGIN SELECT RAISE(ABORT, 'idea candidates are append-only'); END;
CREATE TRIGGER IF NOT EXISTS ai_analysis_result_receipts_append_only_update
BEFORE UPDATE ON ai_analysis_result_receipts BEGIN SELECT RAISE(ABORT, 'AI analysis result receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS ai_analysis_result_receipts_append_only_delete
BEFORE DELETE ON ai_analysis_result_receipts BEGIN SELECT RAISE(ABORT, 'AI analysis result receipts are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_review_decisions_append_only_update
BEFORE UPDATE ON idea_review_decisions BEGIN SELECT RAISE(ABORT, 'idea review decisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS idea_review_decisions_append_only_delete
BEFORE DELETE ON idea_review_decisions BEGIN SELECT RAISE(ABORT, 'idea review decisions are append-only'); END;
CREATE TRIGGER IF NOT EXISTS confirmed_idea_units_append_only_update
BEFORE UPDATE ON confirmed_idea_units BEGIN SELECT RAISE(ABORT, 'confirmed idea units are append-only'); END;
CREATE TRIGGER IF NOT EXISTS confirmed_idea_units_append_only_delete
BEFORE DELETE ON confirmed_idea_units BEGIN SELECT RAISE(ABORT, 'confirmed idea units are append-only'); END;

INSERT OR IGNORE INTO meta (key, value_json, updated_at)
VALUES ('discovery_schema', '{"version":"0.1","migration":"additive"}', '2026-06-19T00:00:00.000Z');

INSERT OR IGNORE INTO meta (key, value_json, updated_at)
VALUES ('idea_analysis_schema', '{"version":"0.1","migration":"additive","providerInstalled":false}', '2026-06-20T00:00:00.000Z');
