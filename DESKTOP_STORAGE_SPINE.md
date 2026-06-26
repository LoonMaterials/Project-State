Project State Desktop Storage Spine v0.1

Purpose

The desktop storage spine is the future local-first storage layer for Project State. It replaces browser storage with a purpose-built local database and managed file folders while preserving the same Project State rules:

- Project State is the source of truth.
- Outside arms write to Intake first.
- Humans approve changes before they enter the core.
- Current State and History remain separate.
- Every change records actor, timestamp, reason, changed object, language, and origin.

Recommended Structure

```text
Project State Storage/
├─ project-state.db
├─ sources/
├─ extracts/
├─ attachments/
├─ quarantine/
├─ discovery/
├─ backups/
├─ recovery/
├─ manifests/
├─ logs/
└─ temp/
```

Database

Use SQLite for structured records:

- `meta`
- `actors`
- `projects`
- `decisions`
- `facts`
- `open_questions`
- `next_actions`
- `relationships`
- `changes`
- `sources`
- `extracts`
- `extract_chunks`
- `attachments`
- `source_links`
- `intake_batches`
- `intake_items`
- `proposed_projects`
- `proposal_items`
- `draft_projects`
- `approval_records`
- `recovery_records`
- `file_assets`
- `file_versions`
- `discovery_cases`
- `discovery_case_files`
- `discovery_interactions`
- `security_receipts`
- `discovery_events`
- `discovery_extractions`
- `discovery_chunks`
- `idea_analysis_runs`
- `idea_privacy_authorizations`
- `idea_transmission_receipts`
- `ai_analysis_jobs`
- `idea_candidates`
- `ai_analysis_result_receipts`
- `idea_review_decisions`
- `confirmed_idea_units`

Managed Folders

Use folders for large evidence and source material:

- `sources/`: original imported files, copied source documents, chat exports, notes, and evidence files.
- `extracts/`: long extract text, chunk text, parsed chat segments, OCR/transcription output later.
- `attachments/`: screenshots, images, and attached media.
- `quarantine/`: managed staging copies of files the user has already chosen to trust. Project State performs no malware scan. Staging requires an external-security responsibility acknowledgment, and later reads require the bytes to keep matching the registered size and SHA-256.
- `sources/`: managed retained source files from approved imports and File Arm/API uploads. API-uploaded source files may be linked into Discovery as immutable File Versions without requiring the outside original path again.
- `discovery/`: Discovery metadata artifacts and future deterministic derivatives kept outside approved Core sources.
- `backups/`: user-controlled backup packages.
- `recovery/`: failed loads, failed migrations, corrupt raw data exports.
- `manifests/`: file checksums, table counts, backup manifests, integrity reports.
- `logs/`: readable diagnostics.
- `temp/`: temporary import/extraction workspace.

Large Content Rule

SQLite should store truth, identity, metadata, and references.

Folders should store large content.

Examples:

```text
sources/source_123/original.pdf
extracts/extract_456/full-text.txt
extracts/extract_456/chunks/chunk_001.txt
attachments/image_789/screenshot.webp
manifests/2026-06-15-integrity.json
quarantine/file_asset_123/file_version_456/original.pdf
```

Discovery Foundation Rule

Discovery storage is additive and project-independent:

```text
FileAsset
  -> FileVersion
  -> External-security responsibility acknowledgment
  -> DiscoveryCase membership
  -> Interaction and DiscoveryEvent history
```

A DiscoveryCase does not require a project. File Versions, Discovery Interactions, and Discovery Events are append-only. The acknowledgment is recorded on the exact File Version and checksum; it means only that the user accepts responsibility for checking the source externally. It is not a clean-file verdict. Exact-byte verification blocks extraction or promotion if the managed copy changes. These records do not grant an outside arm human confirmation, Intake approval, or Core authority. The legacy `security_receipts` table remains only for schema compatibility and optional future provider-neutral receipts; no security provider ships with Project State.

Intake Airlock Rule

Large files, folders, chats, notes, email exports, API output, AI output, and Codex output must not write directly to Project State Core.

They should become:

```text
IntakeBatch
  -> Source
  -> Extract
  -> ExtractChunk
  -> ProposedProject
  -> ProposalItem
  -> Human Review
  -> ApprovalRecord
  -> Core Project State
```

This is the path that lets Project State scan huge mixed data and propose projects without making AI or file parsing authoritative.

API Arm Rule

API arms are desktop app inputs, not alternate storage systems.

They must:

- enter through the desktop bridge
- create intake batches, source records, extracts, proposed projects, or proposal items
- wait for human review and approval before anything reaches Core Project State
- use the storage spine for local persistence

They must not:

- write directly to approved core tables
- write directly to the spine outside the approved bridge contract
- use browser mode as an equal production runtime
- bypass the Intake Airlock because an external system looks trustworthy

API Arm Contract v0.1

The inbound proposal contract lives at:

```text
API_ARM_CONTRACT.md
fixtures/api-arm-v0.1-contract.json
```

It defines the submission envelope, strict validation before legacy normalization, idempotent whole-batch acceptance, Airlock receipts, server-owned Intake fields, and the fields an arm may never set. The desktop bridge implements the logical adapter under `intakeArms`; the separately governed local loopback transport carries requests without adding provider-specific authority.

Local transport and File Arm records use the `integrations/` and `sources/` folders respectively. Encrypted connector secrets and machine-local listener configuration in `integrations/` are deliberately excluded from backup/export packages. Approved managed source files remain in `sources/` and are included in backup and integrity verification.

Run:

```text
node scripts/api-arm-contract-check.js
node scripts/api-arm-implementation-check.js
```

Migration Rule

When migrating from the current prototype:

- Preserve all IDs.
- Preserve all history.
- Preserve source, extract, draft, attachment, and relationship links.
- Keep the current browser main record or backup export until the desktop spine verifies cleanly.
- If migration fails, write the failed raw data to `recovery/` and enter recovery mode.

Backup Rule

Backup cannot silently be the same location as primary storage.

A desktop backup package should include:

- SQLite database snapshot
- managed source/extract/attachment, quarantine, and Discovery files
- manifest with counts and checksums
- actor
- timestamp
- required backup/export reason

Contract

The machine-readable contract lives at:

```text
fixtures/desktop-spine-v0.1-contract.json
```

Run:

```text
node scripts/desktop-spine-contract-check.js
```

The check confirms the expected folders, tables, bridge methods, and core safety rules remain documented before implementation moves forward.

Implementation

The first desktop bridge implementation lives in:

```text
desktop/project-state-desktop-bridge.cjs
desktop/preload.cjs
desktop/spine-schema.sql
```

It creates the managed folders, creates `project-state.db`, writes structured records into SQLite tables, moves long extract text into `extracts/`, moves attachment data into `attachments/`, writes manifests, preserves recovery records, and exposes the bridge shape expected by `app.js`.

Run:

```text
node scripts/desktop-bridge-implementation-check.js
```

The implementation check writes to a temporary storage root, verifies database counts, verifies managed extract and attachment files, reloads the store, checks recovery/export behavior, and resets the temporary spine.
