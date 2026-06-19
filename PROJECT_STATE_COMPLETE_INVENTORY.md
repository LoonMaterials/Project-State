# Project State v0.1 Complete Implementation Inventory

Generated: 2026-06-18

This inventory describes the implementation currently present in this repository. It distinguishes completed behavior from future or deliberately excluded work.

## 1. Governing Product Rules

- Project State is the source of truth.
- Conversations, files, extracts, AI suggestions, APIs, email, chat, notes, calendars, meetings, Codex, and other outside arms are inputs rather than authority.
- Outside inputs enter through the Intake Airlock.
- Human approval is required before Airlock proposals enter Core Project State.
- Current State and Change History are separate views and separate concepts.
- Approved changes record actor, timestamp, reason, changed object, how the change entered Core, and active UI language.
- AI and tools cannot approve changes, delete history, become the source of truth, or write directly to Core or the Storage Spine.
- Local recovery and continuity take priority over returning an empty store after a failure.

## 2. Runtime Architecture

- App-first Electron desktop runtime.
- Electron main process, preload bridge, and desktop bridge implementation.
- Desktop bridge required for authoritative Project State operation.
- Browser mode retained only as a read-only development, inspection, export, and legacy-migration harness.
- Startup gate warns when the desktop bridge is unavailable.
- No silent fallback from desktop storage to browser storage for authoritative work.
- Web testing is externally isolated: HTTP/HTTPS cannot activate an injected desktop bridge, and Content Security Policy blocks outbound connections, objects, frames, and workers.
- Platform adapter boundary separates UI behavior from desktop storage, file access, extraction, and downloads.
- API arms are designed to connect through the desktop Intake Airlock rather than Core or storage directly.

## 3. Core and Supporting Objects

All persisted objects use stable unique IDs. Existing records without IDs are migrated without deleting or renaming their visible content.

### Project

- ID, name, creation and update metadata.
- Current status and current summary.
- Health flag: Active, Blocked, At Risk, Complete, or On Hold.
- Archive state and pending deletion-approval state.
- Review state, assignments, comments, project roles, source links, and image links.
- Collections for decisions, facts, conflicts, sources, draft projects, relationships, open questions, next actions, and changes.

### Actor

- Stable ID, visible name, human/tool type, role, and active/archive status.
- Optional email address and chat handle.
- Consistent actor display throughout current state and history.
- Primary/default actor stored in Settings.

### Decision

- Stable ID, project ID, decision text, reason, actor, timestamp, confidence, review metadata, sources, images, assignments, and comments.
- Edit, Archive, View History, Attach Source, Attach Image, Assign, Review Thread, Detail View, and Propose Correction controls.
- Explicit Supersedes or Replaces link to an earlier decision by stable ID.
- Forward and reverse decision-continuity labels.
- Missing decision references reported by Integrity checks.

### Fact

- Stable ID, project ID, statement, source description, confidence, actor, timestamp, status, review metadata, source links, images, assignments, and comments.
- Shared object controls and Airlock correction path.

### Open Question

- Stable ID, project ID, question, context, actor, timestamp, open/archive state, review metadata, sources, images, assignments, and comments.
- Shared object controls and Airlock correction path.

### Next Action

- Stable ID, project ID, action, owner, actor, created date, due date, completed date, and Open/Completed/Archived status.
- Mark Complete requires actor and reason and records history.
- Overdue and due-soon detection.
- Shared object controls and Airlock correction path.

### Relationship

- Stable ID, source project ID, target text, target project ID where applicable, relationship type, notes, actor, timestamp, status, review metadata, sources, images, assignments, and comments.
- Uses project IDs internally while preserving visible project names.
- Incoming and outgoing project relationships.
- Direct opening of linked projects.
- Missing target IDs reported by Integrity checks.

### Source

- Stable ID and project ID.
- Title, type, date added, actor, project, location, summary, tags, and linked Project State users.
- Local file metadata and local path/reference support.
- Source trust levels: Primary, Supporting, Unverified, Superseded, and Conflicting.
- Trust-level changes recorded in history.
- Freshness states: Current, Review Due, Stale, and Not Reviewed.
- Human-recorded last-reviewed date, next-review date, reviewer, and reason.
- Trust-boundary labels derived from workflow state rather than editable authority fields.
- File verification status: Verified, Changed, Missing, or Unverifiable.
- Extract collection, assignments, comments, and shared object controls.

### Extract

- Stable ID, project ID, and source ID.
- Extract text, summary, tags, actor, date, mode, suggestion status, review state, sources, images, assignments, and comments.
- Manual, With Approval, and AI-Suggested modes.
- Pending AI suggestions require human approval.
- Create Draft Project from an extract.
- Large extract content is separated from lightweight project metadata in storage.

### Conflict

- Stable ID and project ID.
- Title, description, linked items, status, resolution, actor, and noticed date.
- Statuses: Unresolved, Under Review, Resolved, and Archived.
- Review state, sources, images, assignments, comments, shared controls, search, context-pack, handoff, and intake integration.
- Unresolved conflicts appear in handoff blockers and Needs Attention.

### Change

- Stable ID and project ID.
- Actor ID and readable actor name.
- Timestamp, reason, summary, changed object type, changed object ID, readable object title/text, changed fields, entry origin, language, review metadata, assignments, comments, and optional images.
- Object-specific history filtering and event-type filtering.
- Direct links from history to referenced objects.
- History remains separate from current records.

### Draft Project

- Stable ID, project ID, name, created date, source ID, extract ID, draft text, status, review flags, approval metadata, sources, images, assignments, and comments.
- Review flags for facts, decisions, questions, actions, relationships, and readiness.
- Cannot pass the Airlock while required checks are incomplete.
- Approved projects inherit source and extract links.
- Approval records approver, date, and reason.

### Image Attachment

- Stable ID, project ID, attached object type and ID, file name, file type, date added, actor, caption/notes, local path, and local data reference.
- Supported types: PNG, JPG/JPEG, WEBP, and GIF.
- Available on Projects, Decisions, Facts, Conflicts, Open Questions, Next Actions, Relationships, Draft Projects, and Change History entries.
- Thumbnail display and larger image viewer.
- Attachment changes recorded in history.

### Intake Item

- Stable ID, outside-arm type, target project ID, proposed object type, proposed content, evidence, source label, queue state, completeness flags, review metadata, approval metadata, comments, assignments, and archive state.
- Queue states: New, Needs Review, Ready, and Blocked.
- Statuses: Pending, Approved, Rejected, and Archived.

### Collaboration Metadata

- Object assignments: Owner, Reviewer, Approver, or Watcher.
- Object review threads and review states.
- Project-specific roles.
- Comments are explicitly part of the project record and are not private.
- AI work orders with bounded task, context preset, output type, status, actor, reason, and optional Intake output authority.

## 4. Project and Workspace Views

- Active project list as the first normal screen.
- Archived Projects section separate from active projects.
- Project Dashboard showing name, status, last update, updated by, summary, next actions, questions, decisions, facts, conflicts, sources, drafts, relationships, and activity.
- Project Map with incoming/outgoing relationships, evidence, unresolved work, and recent decisions.
- Handoff Mode with current context, recent changes, approvals, blockers, ownership, trusted sources, AI boundaries, and do-not-touch rules.
- Change History with object and event-type filters.
- What Changed Since date-based read-only history view.
- One-page Project Overview generated on request.
- Global search across projects, decisions, facts, conflicts, sources, extracts, drafts, relationships, questions, actions, history, image captions, and linked users.
- Search results open the exact referenced object.
- Focused object detail drawer.
- Unified project Add menu.
- Compact secondary-action menus.
- Continue Working section with recent projects, last project tab, and stored scroll positions.
- UI navigation preferences stored as local Settings metadata, not project history.
- Direct object-reference navigation from decision continuity, relationships, attached sources, search, and history.

## 5. Needs Attention and Workflow Flow

- Dedicated Needs Attention view built on the Work Inbox.
- Includes incomplete projects, blocked/at-risk projects, overdue actions, due-soon actions, unresolved conflicts, stale or missing sources, open questions without actions, ready drafts, pending Intake, assignments, integrity warnings, and active AI work orders.
- Intake queue automatically advances after review.
- Intake queue automatically advances to the next ready item after approval.
- Batch triage can change queue state and notes for selected Intake items.
- Batch approval is deliberately unavailable; every approval remains individual.
- Empty states guide users toward the next valid action.
- Saved/unsaved indicator reports persistence state.
- Duplicate modal submission is blocked while an action is processing.
- Confirmation and mandatory-reason flows for archive, delete, complete, restore, and other governed actions.

## 6. Correction and Approval Behavior

- Propose Correction is available for approved core records.
- A correction creates an Intake Airlock proposal and does not immediately mutate the target.
- Correction proposals carry target object type, target stable ID, target field, previous text, proposed text, actor, and reason.
- A permitted human must review and approve the correction.
- Approval applies the corrected field and records previous/new content in Change History.
- Change History itself is not undoable or overwritten.
- Project deletion remains archive-first and pending a future deletion-approval process.
- Project unarchive requires confirmation, actor, and reason.

## 7. Roles and Local Permission Policy

Roles:

- Owner
- Admin
- Project Lead
- Approver
- Editor
- Contributor
- Reviewer
- Auditor
- Viewer
- AI / Tool

Permission columns:

- Create
- Edit
- Approve
- Audit
- Admin

Implemented behavior:

- The configured default actor and active project roles determine which actions are shown and accepted.
- Approval is checked below the UI for Intake, draft-project, and AI-extract approval paths.
- Owner retains full authority.
- Admin cannot approve or transfer ownership.
- Project Lead can approve within assigned projects.
- Approver can approve but cannot edit or administer.
- Viewer is read-only.
- AI / Tool can propose through Intake but cannot approve or directly create authoritative Core records.
- This is local single-user policy enforcement, not login security or multi-user authentication.

## 8. Intake Airlock and Future Arms

Recognized arm types:

- Calendar
- Meeting
- API
- AI
- Codex
- Notes
- Chat
- Email
- File
- Manual
- Other

Airlock safeguards:

- Target project required.
- Proposed title and text required.
- Proposed object type required.
- Queue must be marked Ready.
- Human must confirm proposal review, Core write consequences, and that outside inputs are not authority.
- Actor and reason required.
- Approval produces Core data and Change History together.
- Rejection and archive preserve the Intake record.

API Arm Contract v0.1 and desktop adapter:

- Inbound proposal boundary with desktop adapter; no provider-specific external integration is installed.
- Desktop runtime required; browser/dev mode is not a production ingestion path.
- Implemented bridge operations: describe capabilities, submit an envelope, and retrieve its receipt.
- Submission envelope requires arm identity, target Project ID, provenance, stable submission and idempotency IDs, and one or more proposal items.
- Whole-envelope validation occurs before legacy normalization; unsupported types are rejected rather than silently converted.
- First acceptance creates one Intake batch; exact retries create no duplicates; conflicting idempotency reuse is rejected.
- Workflow, approval, trust, actor, archive, comment, assignment, Change History, file-path, credential, and secret fields remain server-owned or forbidden.
- Acceptance receipt means Airlock retention pending human review, never approval, truth, or a Core write.
- Partial batch acceptance is unavailable in v0.1.
- Intake batches, item mappings, provenance, payload checksums, and receipts persist through normal desktop save/load cycles.

Local Arm Transport v0.1:

- Disabled by default and owned by the Electron main process.
- Binds only to `127.0.0.1`; browser-origin requests are rejected.
- Bearer token uses cryptographic randomness and Electron secure storage.
- Encrypted integration token and local transport configuration live under `integrations/` and are excluded from backups and exports.
- Settings provides enable, disable, rotate-token, and revoke controls with actor/reason audit logging.
- Metadata submissions are limited to 1 MiB and 100 proposal items; authenticated traffic is rate limited.
- Generic metadata connector reads its token only from `PROJECT_STATE_API_ARM_TOKEN`.

File Arm Contract v0.1:

- Checksum-verified binary uploads enter as pending Source proposals.
- 25 MiB file limit, 8 KiB metadata-header limit, safe file names, and an explicit extension allowlist.
- Executable/script-like files are rejected; uploaded bytes are never executed or automatically extracted.
- Managed files are stored under `sources/`, included in backups, and verified by binary SHA-256 integrity checks.
- Transport receipts do not expose managed paths.
- Human approval creates the Source record and Change History together, retaining Unverified trust and verified-file metadata.
- Generic file connector computes SHA-256 and uses the same environment-only token handoff.

## 9. Source, File, and Extraction Support

- Local file picker for Source records.
- Desktop local-path references.
- Source file metadata capture.
- Source file existence/integrity verification.
- File readers/extractors for PDF, DOCX, TXT, and Markdown.
- Manual extracts and approval-required extracts.
- AI-suggested extracts without an active external AI call.
- Source-to-extract-to-draft-project-to-review-to-approved-project flow.
- Source and extract links preserved when draft projects are approved.
- Source trust, freshness, file verification, and conflict signals remain separate concepts.
- Storage warnings for large extract text and attachment data.

## 10. AI and Context Readiness

- No live AI provider integration is installed.
- AI suggestions and work products are modeled as proposals.
- Context Pack presets:
  - Current State
  - Recent Decisions
  - Full Handoff
  - Source Research
  - Codex Implementation
  - Custom
- Context packs can include bounded project state, related projects, decisions, facts, conflicts, open work, relationships, evidence, extract chunks, and recent history.
- Context packs carry read-only trust-boundary rules and a proposal schema.
- Handoff export and one-page overview reduce repeated context loading.
- Email and chat identifiers can be linked to actors and recorded source communications.
- Recorded communications are explicitly not private.

## 11. Language Foundation

- English
- French
- German
- Spanish
- Default language configured in first-run setup and Settings.
- UI labels, buttons, validation, workflow text, role labels, trust labels, staleness labels, and new interaction flows have language-table coverage.
- User-entered project names and content remain exactly as entered and are not automatically translated.
- Change records preserve the active UI language at the time of change.

## 12. Browser Storage Spine

IndexedDB-first browser/development storage remains available for migration and verification.

Split object stores:

- meta
- projects
- history
- sources
- extracts
- attachments
- drafts
- recovery

Safety behavior:

- Legacy localStorage JSON migration.
- Stable-ID migration.
- Legacy records/main backup retained until split migration verifies.
- Split-store manifest and count auditing.
- Rebuild verification.
- Recovery mode instead of a blank store after load/migration failure.
- Raw failed-data preservation and export.
- Reset requires confirmation.
- Browser runtime is gated from authoritative writes.

## 13. Desktop Storage Spine

Primary engine:

- SQLite database plus managed local folders.

SQLite tables:

- meta
- actors
- projects
- decisions
- facts
- open_questions
- next_actions
- relationships
- changes
- sources
- extracts
- extract_chunks
- attachments
- source_links
- intake_batches
- intake_items
- proposed_projects
- proposal_items
- draft_projects
- approval_records
- recovery_records

Managed folders:

- sources
- extracts
- attachments
- backups
- recovery
- manifests
- logs
- temp

Implemented storage behavior:

- Transactional saves.
- Lightweight metadata in SQLite.
- Long extract text in managed extract files.
- Attachment data in managed attachment files.
- Manifests, checksums, table counts, and managed-file checks.
- Post-save integrity verification.
- Recovery record on failed save or load.
- Snapshot fallback after failed desktop load where available.
- No server dependency.

## 14. Migration, Backup, Restore, and Recovery

### Browser JSON to Desktop

- Preserves the raw browser export before import.
- Validates package shape, IDs, links, and history.
- Stages import in a temporary spine.
- Verifies staged integrity before live write.
- Preserves Project, Source, Extract, Draft, Attachment, Relationship, and Change links.
- Never replaces the live spine with an unverified import.

### Desktop Backup Package

- Requires actor, timestamp, and reason.
- Contains database snapshot.
- Contains managed source, extract, attachment, manifest, and recovery files.
- Contains a manifest and checksums.
- Stored in the user-controlled backup location/package structure.

### Desktop Restore Package

- Requires actor, timestamp, and reason.
- Validates manifest, checksums, folder layout, database, and required tables before overwrite.
- Preserves the current live spine in recovery before restore.
- Restores only after validation and recovery preservation succeed.

### Recovery

- Corrupt or failed saved data does not silently become an empty store.
- Recovery screen displays readable error information.
- Failed raw data can be exported.
- Reset is available only after confirmation.
- Recovery records are retained in browser and desktop storage paths.

## 15. Export and Reporting

- Project JSON export.
- Full storage backup/export.
- Raw current-data export for recovery/migration.
- Failed-data export.
- Read-only Handoff Markdown export.
- Context Pack JSON export.
- One-page current overview in the app.
- History event filtering and What Changed Since reporting.

## 16. Safety and Integrity Controls

- Stable unique IDs across core objects and references.
- Actor/reason validation.
- Mandatory Change History policy.
- Human approval checks.
- Intake completeness gate.
- Draft completeness gate.
- Trust-boundary labels derived from workflow state.
- Source freshness and file integrity kept separate.
- Missing source, extract, relationship, decision, image, actor, and attachment references detected.
- Large-content and storage-size warnings.
- Recovery signals and storage health shown in the Integrity Dashboard.
- Character limits on user-editable fields.
- Display truncation protects crowded pages while preserving stored content.
- Duplicate form submission protection.
- Confirmation prompts for destructive or status-changing actions.
- Current State is never reconstructed by overwriting Change History.

## 17. Main Repository Files

- `index.html`: minimal application entry document.
- `app.js`: UI, object model, migration, workflow, approval, history, search, settings, browser storage adapter, and desktop bridge integration.
- `styles.css`: responsive application styling, project layouts, menus, object detail drawer, forms, history, integrity, and recovery presentation.
- `package.json`: Electron entry and verification commands.
- `Project State Constitution.docx`: guiding constitution supplied for the build.
- `README.md`: product, workflow, role, storage-phase, and architecture documentation.
- `DESKTOP_BRIDGE.md`: desktop bridge contract and runtime rules.
- `DESKTOP_STORAGE_SPINE.md`: desktop storage layout, Airlock contract, migration, backup, and implementation notes.
- `API_ARM_CONTRACT.md`: API Arm Contract v0.1 submission envelope, validation, idempotency, receipt, and authority boundary.
- `LOCAL_ARM_TRANSPORT_CONTRACT.md`: loopback transport, encrypted token, lifecycle, request-limit, and endpoint contract.
- `FILE_ARM_CONTRACT.md`: checksum-verified managed-file Intake and Source approval contract.
- `RELEASE_CONTRACT.md`: Electron runtime, packaging, installer, user-data, signing, and release-gate contract.
- `REAL_TIME_TEST_PLAN.md`: remaining live desktop, connector, installer, upgrade, and uninstall test sequence.
- `desktop/main.cjs`: Electron application process.
- `desktop/preload.cjs`: isolated renderer-to-desktop bridge exposure.
- `desktop/project-state-desktop-bridge.cjs`: SQLite, managed-file, migration, backup, restore, integrity, extraction, and recovery implementation.
- `desktop/api-arm-transport.cjs`: authenticated loopback HTTP transport.
- `desktop/api-arm-transport-manager.cjs`: Settings-controlled lifecycle and audit manager.
- `desktop/api-arm-secret-store.cjs`: Electron-secured connector-token storage.
- `desktop/api-arm-file-intake.cjs`: checksum-verified managed source-file Intake.
- `desktop/spine-schema.sql`: desktop SQLite schema.
- `fixtures/storage-spine-v0.1-baseline.json`: representative persistence fixture.
- `fixtures/api-arm-v0.1-contract.json`: machine-readable inbound API arm proposal contract.
- `scripts/api-arm-contract-check.js`: contract, vocabulary, authority-boundary, documentation, and adapter-drift verification.
- `scripts/api-arm-implementation-check.js`: desktop submission, receipt, idempotency, rejection, Core-isolation, stale-save, and backup/restore verification.
- `scripts/api-arm-submit.js`: provider-neutral metadata connector.
- `scripts/api-arm-submit-file.js`: provider-neutral managed-file connector.
- `scripts/release-artifact-check.js`: unpacked ASAR, connector, secret-exclusion, and packaged-runtime verification.
- `scripts/release-installer-check.js`: installer checksum, signature status, and release-candidate manifest generation.
- `scripts/*.js`: maintained syntax, runtime, migration, storage, backup, restore, and interaction verification tools.

## 18. Deliberately Not Implemented

- Cloud storage.
- Server-hosted production mode.
- Login or account authentication.
- Real concurrent multi-user editing.
- Network sync or conflict-free replication.
- Provider-specific calendar, meeting, Teams, email, chat, notes, Codex, or AI connections.
- Automatic AI authority or direct AI writes to Core/Spine.
- Automatic translation of user-entered project content.
- Permanent project deletion; deletion remains archived and pending a future approval process.
- A signed public installer, final application icon/branding, and real-time desktop/install validation. The unsigned local test installer is built but is not a public release.

## 19. Deep Debug Status

Status: Pre-real-time implementation complete on 2026-06-18. The final non-live regression results and release artifacts are recorded below.

### Syntax

Passed syntax checks:

- `app.js`
- `desktop/main.cjs`
- `desktop/preload.cjs`
- `desktop/project-state-desktop-bridge.cjs`
- `scripts/deep-debug-workflow-integrity-check.js`

### Interactions and Languages

- 74 rendered actions checked.
- 75 handled actions checked, including two approved dynamic actions.
- No missing button handlers.
- No orphan click handlers.
- English, French, German, and Spanish each contain 721 language keys.
- 698 translated keys are actively referenced by the current application.
- Language dictionaries are in parity.
- Hardcoded-label regression scan passed.
- Character/display limits and duplicate-submit guards are present.

### Object and Workflow Integrity

- Every fixture project opened.
- Every fixture source opened.
- Every fixture extract opened.
- Every fixture draft opened.
- Every fixture attachment opened.
- Relationships resolved.
- Outside-source project creation preserved source and extract links.
- Stable IDs remained unique.
- History remained present.
- Search succeeded for project name, source title, extract text, and attachment caption.
- Correction proposals were verified to enter Intake without mutating Core.
- Approved-correction path was verified to record history.
- Batch triage was verified to contain no batch-approval path.
- Approval queue progression hooks were present.
- Recent-project IDs, last view, and scroll positions normalized correctly.
- Owner approval remained enabled.
- Admin approval remained denied.
- Viewer editing remained denied.
- AI/tool approval remained denied.

### Browser Storage Spine

- Phase 0 baseline integrity passed.
- Phase 1 manifest and count audit passed.
- Phase 2 split/rebuild counts matched before and after.
- Phase 3 audited split stores matched the retained main backup.
- Recovery screen, failed-data export, recovery store, and reset confirmation remained present.
- Persistence and backup-count comparisons passed.

### Desktop Runtime and Storage

- Desktop runtime gate passed.
- Electron wrapper contract passed.
- Desktop bridge contract passed.
- 17 bridge methods verified.
- 21 required SQLite tables verified.
- 9 managed folders verified, including machine-local integrations excluded from backups.
- Temporary desktop spine save, managed-file write, reload, and reset passed.
- Browser JSON to desktop migration preserved IDs, history, recovery records, and links.
- API Arm Contract v0.1 passed: 3 implemented desktop operations, 11 arm types, 8 proposal types, 27 forbidden fields, and 11 stable error codes verified against the current Intake model and documentation.
- API arm implementation passed: atomic acceptance, durable receipt mapping, exact-retry deduplication, idempotency conflict rejection, forbidden-authority rejection, missing-project rejection, Core isolation, stale-save merging, normal save/load, and backup/restore round trips.
- Local Arm Transport passed: loopback-only binding, authentication, browser-origin rejection, rate/item limits, encrypted token storage, rotation/revocation, and generic connector submission.
- File Arm passed: checksum verification, managed source storage, executable rejection, hidden managed paths, exact-retry deduplication, generic file connector submission, and backup inclusion.

### Desktop Release Candidate

- Electron 42.4.1 pinned with bundled Node 24.16.0 and SQLite 3.53.0.
- Electron runtime SQLite write/read smoke passed.
- Unpacked Windows x64 application built successfully.
- Packaged ASAR and resources contained required runtime contracts and connectors with no user database or integration token.
- Packaged executable SQLite write/read smoke passed.
- Per-user NSIS installer built at `release/Project-State-Setup-0.1.0-x64.exe`.
- Installer SHA-256 recorded in `release/release-candidate-manifest.json`.
- Installer is unsigned and labeled test-only; public distribution remains blocked on code signing and real-time tests.
- Real-time test sequence is ready in `REAL_TIME_TEST_PLAN.md`.

### Backup and Restore

- Desktop backup package passed.
- Database snapshot and six managed files were verified.
- Actor/timestamp/reason audit requirements were present.
- Restore package validation passed.
- Current spine recovery snapshot was created before restore.
- Restored record counts matched.
- Required restore reason remained enforced.

### File Integrity

- 13 required application, documentation, schema, fixture, and desktop files existed and were non-empty.
- SHA-256 hashes were generated for each required file during the run.
- `app.js` contained 13,431 lines at test time.
- Longest source line was 408 characters; stored/displayed user content remains protected by explicit input and display limits.

### Debug Warnings and Boundaries

- No test failed.
- Node emitted expected experimental warnings for its built-in SQLite implementation.
- Tests used fixtures and temporary desktop storage roots; the user’s live desktop spine was not modified.
- No server was started.
- No live visual/manual desktop UI pass was performed during this internal debug run.
