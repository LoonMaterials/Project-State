# Project State v0.1 Complete Implementation Inventory

Generated: 2026-06-18; Discovery-stage boundary recorded 2026-06-19; intake fast-lane update recorded 2026-07-03; unknown-folder flow repair recorded 2026-07-05

This inventory describes the implementation currently present in this repository. It distinguishes completed behavior from future or deliberately excluded work.

## 0. Final Pre-Discovery Stage Boundary

The current executable and source were frozen as `final-pre-discovery-v0.1` before Discovery-first implementation began.

- Checkpoint definition: `PRE_DISCOVERY_CHECKPOINT.md`.
- Preserved installer: `checkpoints/Project-State-Final-Pre-Discovery-0.1.0-x64.exe`.
- Preserved source: `checkpoints/Project-State-Final-Pre-Discovery-Source.zip`.
- Installer SHA-256: `8F4CA66E9FB1C9D690E9556CA9F0E8D022EDEEBEDECAE80D77A05D786E4DE5D1`.
- Source archive SHA-256: `426A86DB32F11856C8B47427E53FF298B8D4683B92268D0F720A6F2E3413A95B`.
- The checkpoint includes the global Files screen and managed Intake import flow.
- The checkpoint does not include Discovery Cases, external-security acknowledgment, global File Assets, provider-neutral Interactions, adaptive questions, project suggestions, or Discovery-to-Intake promotion.

The approved next-stage system is defined in `DISCOVERY_FIRST_SYSTEM.md`, `SECURITY_ARM_CONTRACT.md`, `fixtures/discovery-v0.1-contract.json`, and `fixtures/security-arm-v0.1-contract.json`. Items in those files remain planned until the implementation and verification sections below explicitly mark them complete.

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
- Browser mode is no longer a working Project State runtime.
- Startup gate switches missing-bridge launches into desktop-required mode.
- No silent fallback from desktop storage to browser storage for authoritative work, file reading, downloads, Intake, Discovery, or API work.
- Old browser JSON can still be imported through the desktop migration path, but browser storage is not a live app spine.
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

- Global Files screen lists pending imports and approved managed Sources.
- Native multi-file selection and recursive folder import are supported in the desktop runtime.
- Import review requires a destination project and preserves every original file in place.
- Accepted selections are copied into managed source storage and enter Intake as individual pending Source proposals.
- Approved managed files expose project navigation plus Edit, Archive, and View History controls.

- Checksum-verified binary uploads enter as pending Source proposals.
- 25 MiB file limit, 8 KiB metadata-header limit, safe file names, and an explicit extension allowlist.
- Executable/script-like files are rejected; uploaded bytes are never executed or automatically extracted.
- Managed files are stored under `sources/`, included in backups, and verified by binary SHA-256 integrity checks.
- API/File Arm retained `sources/` files can now be registered as Discovery File Versions and read by Discovery without relying on the outside original source path.
- API folder submissions can now create grouped Discovery Cases, extract retained files, and detect document units from headings such as separate ideas inside one mixed note.
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

- Optional local AI provider plumbing is installed for Qwen3 8B through Ollama; cloud/API AI is still unconfigured.
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

Discovery and analysis tables:

- file_assets
- file_versions
- discovery_cases
- discovery_case_files
- discovery_interactions
- security_receipts
- discovery_events
- discovery_extractions
- discovery_chunks
- idea_analysis_runs
- idea_privacy_authorizations
- idea_transmission_receipts
- ai_analysis_jobs
- idea_candidates
- ai_analysis_result_receipts
- idea_review_decisions
- confirmed_idea_units

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
- `PRE_DISCOVERY_CHECKPOINT.md`: immutable stage boundary, artifact checksums, and continuation rule.
- `DISCOVERY_FIRST_SYSTEM.md`: approved Discovery-first flow, foundation objects, API evolution, and staged implementation roadmap.
- `SECURITY_ARM_CONTRACT.md`: external-security responsibility boundary, exact-byte enforcement, prohibited safety claims, and optional future provider compatibility.
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
- `fixtures/discovery-v0.1-contract.json`: machine-readable Discovery state, operation, destination, privacy, and invariant contract.
- `fixtures/security-arm-v0.1-contract.json`: machine-readable external-security acknowledgment, exact-byte controls, forbidden safety claims, and authority prohibitions.
- `scripts/api-arm-contract-check.js`: contract, vocabulary, authority-boundary, documentation, and adapter-drift verification.
- `scripts/api-arm-implementation-check.js`: desktop submission, receipt, idempotency, rejection, Core-isolation, stale-save, and backup/restore verification.
- `scripts/api-arm-submit.js`: provider-neutral metadata connector.
- `scripts/api-arm-submit-file.js`: provider-neutral managed-file connector.
- `scripts/api-arm-submit-folder.js`: provider-neutral recursive folder connector that preserves relative paths and creates Discovery-aware file groups.
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

## 20. Approved Discovery-First Next Stage

Status: Discovery rebuild without bundled antivirus is complete through the non-live verification gate. The user owns malware checking outside Project State.

### Governing flow

`Add → External Security Acknowledgment → Stage → Read/Extract → Discovery → Questions → Routing → Intake → Human Approval → Core`

### Required foundation objects

- Global content-addressed File Asset and immutable File Version.
- Discovery Case that may exist without a project.
- Provider-neutral Interaction for questions, answers, corrections, machine suggestions, and routing confirmations.
- Human external-security acknowledgment linked to the case and exact File Version; it is not a scan verdict.
- Append-only Discovery Event history.

### Required end-user behavior

- Project State states clearly that it does not scan files for malware and does not claim they are safe.
- A human must acknowledge external security responsibility before selected files are copied into managed staging.
- Current staged bytes must match the immutable File Version size and SHA-256 before content access.
- Discovery File Versions may point at Project State-managed `quarantine/` files or API/File Arm-managed `sources/` files; both are exact-checksum gated.
- Deterministic parsing runs before optional AI assistance.
- AI suggestions retain provider, evidence, confidence, privacy, and non-authority labels.
- Project State asks adaptive questions and accepts `Not sure` or unassigned material.
- Discovery may route to an existing project, several project links, a proposed new project, general reference, orphaned idea, unassigned, or rejection.
- One File Asset can support several project Sources without duplicating immutable bytes.
- The default UI simplifies the internal stages to `Add → Review → Confirm` while preserving technical details and history.

### API and authority direction

- Target-known API Arm v0.1 remains compatible and continues to require a project.
- Every file submission path preserves the external-security acknowledgment and exact-byte boundary.
- Discovery receives a separate provider-neutral contract rather than weakening Intake.
- External arms may analyze inputs but cannot create the human acknowledgment, confirm user answers, confirm routing, approve Intake, create Core projects directly, or rewrite history.
- No Windows Defender or other antivirus provider is bundled.

### Implementation sequence

1. Contracts and checkpoint.
2. Storage schema, managed quarantine/discovery folders, migrations, integrity, and recovery.
3. External-security responsibility acknowledgment, trusted staging, and exact-byte enforcement.
4. Deterministic extraction, chunking, duplicates, and file versions.
5. Discovery Cases, grouping, adaptive questions, privacy, and routing UX.
6. Discovery-to-Intake promotion and full lineage.
7. Optional AI Analysis Arms.
8. Real mixed-file pilot, backup/restore validation, blocker fixes, and contract freeze.

### Rebuild completion and continuation

- Stages 1 through 6 are implemented: contracts, storage, trusted staging, exact-byte enforcement, extraction, Discovery questions/routing, and Intake promotion.
- The 30-table Discovery storage/extraction schema and trusted staging path have been reconstructed.
- Project State records external-security responsibility but performs no malware scan and makes no clean/safe claim.
- All 30 non-live regression checks passed on 2026-06-19, including the seven focused Discovery gates and the pre-existing storage, workflow, desktop, backup/restore, API Arm, transport, File Arm, release-contract, and checkpoint gates.
- Syntax checks passed for `app.js`, the Electron main/preload files, and the desktop bridge.
- No installer was built or run, no foreground server was started, and the user's live storage was not used by these checks.
- The next step is a harmless-file live Discovery pass in a dedicated temporary storage root, followed by source backup and Git commit before isolated packaging work.
- The exact live handoff is recorded in `DISCOVERY_IMPLEMENTATION_HANDOFF.md` and `REAL_TIME_TEST_PLAN.md`.

## 21. Approved Internal Flow Experiment

Status: implementation approved 2026-06-20 after the Discovery live flow reached file reading, editable Intake, human approval, project creation, normal project editing, persistence, and exact-file integrity.

The governing specification is `INTERNAL_FLOW_EXPERIMENT.md`.

The experiment must:

- enforce one active transient surface at a time;
- protect changed forms with session drafts and explicit close choices;
- use `Choose → Describe → Review → Confirm` guidance;
- replace repeated actor typing with known-actor selection;
- provide controlled/searchable choices and custom fallback where vocabulary is not closed;
- allow a work-session actor/reason to reduce repetition without omitting per-change audit fields;
- return users to the object they changed;
- make Draft, Needs review, Ready, and Approved/Core states explicit;
- preserve every existing permission, Intake, approval, exact-byte, recovery, and immutable-history boundary.

### Implemented and verified

- One-active-menu and one-active-task behavior is implemented.
- Guided `Choose → Describe → Review → Confirm` cues appear on governed modals.
- Changed forms create recoverable session drafts with Save draft, Discard, Stay here, and restored-draft discard controls.
- Audit actor entry is a known-active-human dropdown.
- Common audit reasons and current-work-session inheritance reduce repetition while leaving the per-change reason editable and required.
- Owners, project targets, source types, and relationship types provide searchable suggestions with custom entry retained.
- Breadcrumbs, contextual return, and explicit Draft / Needs review / Ready / Approved-Core state strips are implemented.
- Renderer saves are serialized and SQLite uses a bounded busy timeout so overlapping verification reads do not strand the UI.
- All 31 non-live checks passed after the final changes.
- Isolated live testing produced an approved Discovery project with one source, one decision, one next action, one added Fact, and seven complete immutable history events; managed-file and database integrity passed.

### Flow hardening extension

- Contextual Next step actions are required for project and Intake states.
- Project-completeness and Intake warnings must provide direct corrective actions.
- Technical IDs, checksums, managed paths, and detailed provenance remain available behind progressive disclosure.
- Governed add/edit forms require a plain-language final review before their existing submit handler may write.
- Approval, audit, Intake, history, and exact-file rules remain unchanged.

### Flow hardening implementation and verification — 2026-06-20

- Active project and Intake states now present one contextual **Next step** with a short explanation.
- Project-completeness warnings provide direct correction actions; the live missing-next-action warning opened the Add Next Action form, not a dead-end dashboard.
- Discovery and Intake technical identifiers, SHA-256 values, managed paths, routing records, and detailed provenance remain available through progressive disclosure.
- Governed add/edit forms now show a plain-language final review of what will happen, proposed values, actor, and reason before their existing write handler runs.
- Existing final approval and destructive confirmation boundaries are not duplicated or weakened.
- The isolated live test persisted `Final review hardening fact` and `Complete flow hardening verification` with complete linked actor, timestamp, reason, changed-object, origin/how-changed, language, and field-detail history.
- All 32 of 32 non-live checks passed after the hardening changes. No installer was built or run, and the live user storage was not used.

## 22. Multi-Idea Document Flow

Status: implementation started 2026-06-20 after flow hardening passed its complete verification and isolated live persistence test.

The governing specification is `MULTI_IDEA_DOCUMENT_FLOW.md`.

The implementation order is deliberate:

1. Detect and review several meaningful units inside one document.
2. Let the user correct, add, omit, or rename those units.
3. Route each included unit independently through one human-confirmed route map.
4. Create separate pending Intake proposals with shared exact-file provenance and individual approval.
5. Reuse the verified unit model for whole-folder grouping and routing.

This work must not duplicate source bytes, turn machine suggestions into facts, batch-approve proposals, or create a second path around Discovery and Intake.

### Multi-idea implementation and verification

- Deterministic local analysis now suggests document units from visible Markdown, numbered, and uppercase headings.
- Discovery review explicitly offers one-item or several-idea review.
- Suggested units are editable; additional user-authored units can be included before confirmation.
- Every included unit has its own title, summary, destination, optional existing-project target, and exact-file evidence.
- Human confirmation stores one complete multi-route interaction; promotable routes become separate pending Intake proposals.
- Multiple proposals from one source reuse the same immutable File Version, SHA-256, and managed path rather than duplicating bytes.
- The isolated live test produced two proposed-project Intake items from one document with no renderer errors or Core write.

## 23. Folder Discovery Flow

Status: v0.1 foundation implemented and verified 2026-06-20; unknown-folder end-user flow repaired 2026-07-05.

The governing specification is `FOLDER_DISCOVERY_FLOW.md`.

- Recursive folder selection shows each supported file, skipped count, relative path, and suggested first-folder group before staging.
- The current end-user unknown-folder flow separates subfolders from loose files instead of treating every group as an immediate project candidate.
- Subfolders are cataloged and routed to AI Work Orders for later follow-up.
- Loose files continue through Discovery review and safe routing.
- The old end-user option to treat the entire selected unknown folder as one combined case is removed from the Add Intake UI.
- The emergency end-user fallback is per-file review.
- Each eligible Discovery route still preserves exact file provenance and approval remains one Intake item at a time.
- The isolated live test produced two sequential reviews, two Discovery Cases, two File Versions, and two pending Intake proposals from Alpha and Beta groups with zero renderer exceptions.
- All 34 of 34 non-live regression checks and syntax checks passed after the combined document/folder implementation.

The next folder improvements are usability extensions rather than authority changes: clearer Work Order review, pause/resume for large processing queues, richer folder-map evidence, and optional provider-neutral analysis suggestions.

## 24. Idea Candidate Model v0.1

Status: design, additive storage, fake local validation, and human review UI implemented and verified 2026-06-20.

The governing specification is `IDEA_CANDIDATE_MODEL.md`, with machine-readable contract and example fixtures at `fixtures/idea-candidate-v0.1-contract.json` and `fixtures/idea-candidate-v0.1-example.json`.

The design replaces title-first semantic discovery with:

`Exact source → Stable chunks → Analysis coverage → Idea Candidates → Human review → Confirmed Idea Units → Project/routing suggestions`

Key boundaries:

- An Idea Candidate is never a project name, fact, decision, route, approval, or Core record.
- Every candidate requires exact File Version/extraction/chunk evidence and confidence with uncertainty.
- Idea Analysis Runs state precisely which chunks were analyzed, skipped, blocked, or failed; continuation replaces silent truncation.
- Human review decisions are separate append-only objects supporting merge, split, rename, correction, rejection, deferral, duplication, and uncertainty.
- Confirmed Idea Units remain Discovery objects until later routing, Intake, and individual approval.
- AI providers produce provider-neutral suggestions and cannot create human decisions, confirm routes, approve Intake, or write Core.

## 25. AI Analysis Arm Contract v0.1

Status: contract and fake local validation arm implemented 2026-06-20; optional Qwen3 8B local-provider plumbing added 2026-06-26; no cloud model provider is configured.

The governing specification is `AI_ANALYSIS_ARM_CONTRACT.md`, with machine-readable contract and full request/result/receipt example at `fixtures/ai-analysis-arm-v0.1-contract.json` and `fixtures/ai-analysis-arm-v0.1-example.json`.

The contract defines:

- capability discovery for local or remote replaceable providers;
- explicit human privacy authorization for exact chunk IDs and hashes;
- bounded batch submission and large-document continuation;
- provider coverage acknowledgment and exact evidence validation;
- non-authoritative Idea Candidate result ingestion;
- idempotent retries and atomic result-page receipts;
- cancellation, partial/failure states, stable error codes, usage, cost, and retention reporting;
- encrypted machine-local end-user credentials excluded from backups, exports, logs, candidates, receipts, and history.

AI Analysis Arm v0.1 deliberately does not request project names or routes. Those occur only after human review produces Confirmed Idea Units.

### Foundation implementation and verification

- The SQLite spine now contains 38 required tables, including eight additive Idea Analysis tables.
- `analysisArms` exposes capability discovery, run creation, human authorization, batch submission, status/results/cancellation/receipts, human review, and bounded state reads.
- The fake local arm produces deterministic evidence-backed candidates from exact chunks and makes no external request.
- The optional Qwen3 8B local arm uses Ollama on loopback, records `externalTransmission: false`, and remains pre-Airlock/non-Core.
- Machine privacy authorization and machine review decisions are blocked.
- Wrong privacy classes, tampered chunk content, mismatched evidence, and conflicting idempotency reuse fail closed.
- Exact retries deduplicate, completed jobs cannot be falsely cancelled, and forged continuation cursors are rejected.
- Human merge review created one Confirmed Idea Unit without changing Core.
- Candidate, authorization, transmission, result-receipt, review, and confirmed-unit records preserve append-only boundaries where required.
- Credentials are absent and analysis records survive backup/restore.
- The focused AI Analysis foundation gates passed with `realProviderInstalled: false`.

### Human Idea Review implementation and verification

- Discovery review now routes local/AI follow-up into AI Work Orders rather than running inline AI from the Discovery screen.
- Candidate review shows editable working labels and neutral summaries, confidence, uncertainty, exact evidence, and provider/model provenance.
- Known human actor and reason are required for review.
- Selected candidates may remain separate, merge, reject, defer, or remain unresolved.
- Only Confirmed Idea Units replace the title/heading fallback as inputs to project naming and routing.
- The file-derived label is visibly demoted to a working name used only when the user treats the source as one item.
- The isolated live flow recorded one analysis run, privacy authorization, local transmission receipt, candidate, human review, Confirmed Idea Unit, and pending Intake proposal.
- The live flow had zero external transmission, zero Core authority, and zero renderer exceptions.
- All 38 of 38 non-live regression checks and syntax checks passed.

The next gated step is encrypted end-user credential configuration and a provider-connector shell with network calls still disabled. A real provider call should occur only after credential redaction/exclusion, cost preview/limits, provider consent, and a full fake-connector test pass.

## 26. Intake Flow Simplification and Known-Import Fast Lane

Status: implemented and live-tested 2026-07-03 after known-folder/file intake testing showed the earlier step-by-step flow was too heavy for normal single-user/small-group use.

The governing product decision is now:

`Known project material → checked file list → Finish import → Core project/source records`

and separately:

`Unknown loose files → Discovery review → safe routing default → Intake only when deliberately routed → human approval → Core`

`Unknown subfolders / large or no-text material → catalog/stage/read → AI Work Orders → later human-reviewed output`

### What changed

- The former global **Files** top-level workflow was renamed/reframed as **Add Intake**.
- The duplicate manual **Add Intake** header button was removed from the main header; the Add Intake screen is now the intake/file/folder launcher.
- The Add Intake screen now presents two clear lanes:
  - **Known project material** for files/folders that already belong to one project.
  - **Discovery scan** for unknown, mixed, large, or exploratory material.
- Known project folder/file import now bypasses Discovery review and creates or updates Core project Source records directly.
- Known imports use the primary button **Finish import** after the supported files are listed and checked.
- Known imports mark `sourceImportChecked` and record `sourceImportCheckedAt`; they no longer create a pending “review imported sources” chore.
- Known-import projects now show **Project ready** after import, with useful next actions:
  - **Add Intake**
  - **Make changes**
- Known-import projects with current status, current summary, and verified source files are treated as complete enough for workflow/Needs Attention purposes even when they do not yet have decisions or next actions.
- Imported project files are still copied into managed storage, assigned checksums, and attached as project Sources with source history and file-verification metadata.
- The file/folder picker status and remembered last import folder remain visible for orientation and testing.

### What was removed or hidden

- The separate **Review imported sources** next-step gate was removed for known project imports.
- The old general **Discovery cases** panel was removed from the Add Intake page.
- Add Intake no longer refreshes or displays every historical Discovery Case just because the app starts or the user opens Add Intake.
- Historical/parent-folder Discovery cases are no longer shown during known-folder imports.
- The former pending/approved managed-file library panels were removed from the Add Intake page to avoid duplicating the project Source records that already show inside each project.
- Known project imports no longer ask “why are these files being added?”; the import reason is assigned automatically as known project folder/files.

### Discovery lane retained

- Discovery Cases are still part of the system, but they now belong to unknown, large, or exploratory scans rather than known project imports.
- The Add Intake page may show **Discovery progress** only for active long/large Discovery work, such as pending large-file or large-corpus processing; stale routed/promoted cases and old `Project folder candidate: Folder root` entries are hidden from the active progress panel.
- Unknown loose files still use Discovery staging, extraction, questions, grouping/routing, Intake promotion, and human approval before Core.
- Unknown subfolders are cataloged, staged, and routed to AI Work Orders for follow-up rather than being treated as immediate project proposals.
- Large files, large corpora, images/sketches, plots, and metadata-only/no-text material do not directly become ready Intake approvals; they stay evidence-only or move to AI Work Orders first.
- Supporting image/plot files may attach to a text-backed Discovery unit as evidence, but they do not create separate ready project approvals.

### Verification added or updated

- `scripts/known-project-file-import-flow-check.js` now asserts:
  - known project import buttons exist;
  - known imports bypass Discovery review;
  - duplicate basenames stage safely;
  - known imports mark `sourceImportChecked`;
  - the old **Review imported sources** gate does not return;
  - the post-import project state uses the **Project ready** / **Add Intake** / **Make changes** flow.
- `scripts/intake-fast-lane-flow-check.js` verifies the Add Intake fast lane and removal of the duplicate manual Add Intake header path.
- Existing folder/discovery checks continue to verify that unknown folders still use Discovery rather than bypassing the Airlock.

### Verification results on 2026-07-03

Passed:

- `node --check app.js`
- `node scripts/known-project-file-import-flow-check.js`
- `node scripts/desktop-file-library-check.js`
- `pnpm run check:flow-hardening`
- `pnpm run check:folder-discovery`

Live testing outcome:

- Known project folder import became much faster and cleaner.
- The app no longer showed unrelated parent-folder Discovery cases on the Add Intake page during known-folder testing.
- The remaining next test area is the unknown/large Discovery lane.

## 27. Unknown-Folder Discovery Repair and Deep-Scan Checkpoint

Status: implementation and regression sweep recorded 2026-07-05 after live testing showed unknown-folder Discovery was still over-classifying material as projects.

### Corrected governing flow

Unknown folder handling now follows two lanes:

1. **Subfolders**: catalog everything inside the subfolder, stage/read supported files, then create an AI Work Order for follow-up. A subfolder is not automatically a project and is not sent straight to Needs Attention as a project proposal.
2. **Loose files**: catalog/stage/read, continue through Discovery review, then route as known/checked Intake, rejection, unassigned, general reference, or AI Work Order.

### Current behavior after repair

- The parent selected folder is a selection boundary only, not a project candidate.
- The former unknown-folder option to treat the whole selected folder as one Discovery evidence collection is removed from the UI.
- Unknown-folder review defaults to **Use unknown-folder flow: subfolders to AI follow-up, loose files through Discovery**.
- The emergency fallback is **review every file separately**.
- Folder groups are no longer split into artificial 24-file parts during the normal unknown-folder flow.
- `loose_files_discovery` and `subfolder_ai_followup` are recognized as safe folder-derived lanes.
- Loose-file Discovery no longer defaults detected units to **Propose a new project**.
- AI-follow-up routes create AI Work Orders and those Work Orders are now included in the desktop storage split/rebuild path so they survive save/load.
- Metadata-only image/plot/supporting files remain attached as evidence where possible but are not independently promoted to ready Intake/project approval items.
- Large corpus routes are blocked from direct Intake promotion and must go through AI follow-up first.
- The Discovery progress panel filters stale/routed/promoted cases, collapses duplicate active long-scan cases, and hides old `Project folder candidate: Folder root` entries.

### Deep scan findings from 2026-07-05 / 2026-07-07

- Active product code no longer exposes the old unknown-folder “treat entire folder as one case” UI option.
- Browser/dev runtime language is still present by design as a locked migration/development gate; it is not an authoritative runtime path.
- API folder submission tooling still supports `one-case` for connector/backward-compatibility use; this is separate from the end-user unknown-folder UI and should be reviewed before public connector packaging.
- The AI follow-up cutover was completed on 2026-07-07 in the Discovery screen. The older inline/local Idea Analysis branch was removed from `app.js`; Discovery no longer exposes `runFakeIdeaAnalysis`, `data-run-idea-analysis`, inline candidate review, or direct `recordReviewDecision` UI behavior.
- `scripts/run-idea-review-live-ui-check.js` and `scripts/idea-review-ui-check.js` were converted into guard checks that forbid the old inline AI path and require AI follow-up to route into AI Work Orders.
- `scripts/large-corpus-intake-flow-check.js` was updated so large-corpus verification requires Work Order routing and forbids the removed inline indexing/analysis UI.
- Pre-huge-file cleanup hardening was added on 2026-07-07: the AI Work Orders screen now shows Active / Completed / Archived / Total counts, displays queued source-file and large-corpus details, and includes owner-only deletion for archived AI Work Orders. Delete warnings explicitly state that managed source files, Discovery cases, Intake items, and Core project history are not deleted.
- `scripts/flow-hardening-check.js` now guards the AI Work Order readiness/cleanup affordances so huge-file testing can be reset safely after archived test Work Orders.
- Live preflight testing on 2026-07-07 found and fixed an AI Work Order persistence bug: Discovery could record an `ai_work_order` route but the desktop split-store rebuild omitted `aiWorkOrders`, causing the Work Order to disappear after save/load. `desktop/project-state-desktop-bridge.cjs` now rebuilds `aiWorkOrders` from store metadata, and `scripts/desktop-bridge-implementation-check.js` includes a regression fixture.
- `scripts/run-idea-review-live-ui-check.js` now explicitly verifies the pre-API boundary in a live Electron window: no inline AI controls, AI follow-up routes to AI Work Orders, zero Discovery-created Intake items, and zero renderer exceptions.
- `DISCOVERY_FIRST_SYSTEM.md` and `FOLDER_DISCOVERY_FLOW.md` were updated to reflect the repaired subfolder/loose-file split.

### Verification after repair

Passed on 2026-07-05:

- `node --check app.js`
- `node --check desktop/project-state-desktop-bridge.cjs`
- `pnpm run check:folder-discovery`
- `node scripts/discovery-supporting-files-check.js`
- `pnpm run check:large-corpus`
- `pnpm run check:flow-hardening`
- `pnpm run check:api-arm`

Additional pass after AI Work Order cutover on 2026-07-07:

- `pnpm run check`
- `pnpm run check:idea-review-ui`
- `pnpm run check:folder-discovery`
- `pnpm run check:large-corpus`
- `pnpm run check:flow-hardening`
- `pnpm run check:api-arm`

Additional pass after pre-huge-file AI Work Order cleanup hardening on 2026-07-07:

- `pnpm run check`
- `pnpm run check:desktop`
- `pnpm run check:idea-review-ui`
- `pnpm run check:large-corpus`
- `pnpm run check:flow-hardening`
- `node scripts/run-idea-review-live-ui-check.js 9228` against a temporary live Electron test store

No installer was rebuilt during this checkpoint. The next live test should start from a cleaned test dataset and verify: AI Work Order count after subfolder/AI routing, no image/plot-only ready approvals, no stale Folder Root entries in active Discovery progress, and archived AI Work Order cleanup after a test run.

## 28. AI Work Order Local Digestion Checkpoint

Status: first local-AI digestion path implemented and verified 2026-07-07 after large-file / large-folder tests confirmed that oversized or exploratory material parks correctly in AI Work Orders.

### Current behavior

- AI Work Orders now have a **Start local AI digestion** action when they are linked to a Discovery Case and a real local provider is available.
- The first supported real provider is **Qwen3 8B via Ollama** (`qwen3:8b`) on the local machine.
- The Work Order execution path requires a real provider; it does not silently use the fake fixture analysis arm.
- Before analysis, Project State builds an exact source/chunk scope from Discovery evidence and records human authorization for those chunks.
- Large-corpus Work Orders can request the first bounded chunk batch before local analysis, keeping huge-file digestion incremental instead of trying to load the whole source at once.
- Local AI results create **Idea Candidates only**. They do not create Core records, approve Intake, assign project authority, or write final history.
- Work Orders now record `analysisRunIds` and `lastAnalysis` summary metadata so the UI can show provider, candidate count, chunk count, completion time, and whether any external transmission occurred.
- A **View AI results** action shows pre-Airlock candidate results with evidence/provenance so a human can decide what to do next.
- Local Qwen receipts remain `externalTransmission: false`.
- The **Start local AI digestion** modal now includes a truthful progress/counter panel: stage, elapsed time, selected chunks, sent chunks, returned candidate count, and external-transmission status. The progress bar is stage-based and becomes indeterminate only while the local model is thinking, so it does not invent a fake percentage for Qwen generation time.

### API/cloud boundary

- The existing generic API Arm remains intact and verified.
- No provider-specific cloud AI integration is installed yet.
- Cloud/deep-thinking API use should remain optional and must enter through a provider-specific arm later, with explicit `provider_allowed` privacy authorization and the same pre-Airlock Idea Candidate boundary.
- For this checkpoint, the safest working path is local-first digestion, then human review, then later optional cloud escalation only for material the user deliberately sends out.

### Verification results on 2026-07-07

Passed:

- `pnpm run check`
- `pnpm run check:ai-analysis-foundation`
- `pnpm run check:idea-review-ui`
- `pnpm run check:flow-hardening`
- `pnpm run check:local-ai-qwen`
- `pnpm run check:api-arm`

Additional pass after progress/counter UI was added:

- `pnpm run check`
- `pnpm run check:ai-analysis-foundation`
- `pnpm run check:idea-review-ui`
- `pnpm run check:local-ai-qwen`
- `pnpm run check:flow-hardening`

Notable verification points:

- Local Qwen smoke returned one candidate from one authorized chunk.
- Local Qwen smoke confirmed `externalTransmission: false`.
- Local Qwen smoke confirmed Core remained unchanged.
- API-arm checks confirmed API proposals still remain Intake/Airlock-only and do not mutate Core.
- Flow checks confirmed the old inline Discovery AI path remains removed and AI follow-up routes through AI Work Orders.
- Live testing found a workflow mismatch: a local AI pass could finish successfully with zero Idea Candidates and still mark the AI Work Order complete. The UI now treats that as a completed AI attempt but an active Work Order: it records `outcome: no_candidates_found`, keeps the Work Order submitted/active, shows a no-candidates notice, and allows another chunk pass, archive/no-find, or later deep-provider follow-up.
- Follow-up live testing clarified the stronger rule: for massive files, candidate count must never decide Work Order completion. A Work Order now stays active until Project State reaches the end of the source coverage. Each run selects the next unanalyzed chunk window, continues large-corpus indexing when all indexed chunks have already been analyzed, records cumulative analyzed/detected chunk counts, and marks complete only when the source is fully digested.
- Further live testing showed the first continuation model still treated each chunk window too independently. Local Qwen prompts now receive a bounded rolling digest context from prior passes, while still requiring every new candidate to cite current authorized chunks. AI Work Orders now preserve `digestContext` across saves/reloads and display the number of saved rolling-context passes.
- The **Start local AI digestion** modal now has a run mode selector: **One pass only** or **Run until paused or source complete**. Continuous mode saves after every pass, carries rolling context forward, and exposes **Stop after this pass** so a user can pause safely without corrupting evidence or losing progress.
- Candidate Map v0.1 was added on 2026-07-07 as the first durable pre-Airlock idea ledger for AI Work Orders. Each Work Order can now retain `candidateMap` with mapped entries, status, summaries, candidate type/scope, confidence, key terms, exact evidence links, source candidate IDs, clarification questions, history, relationship placeholders, unresolved questions, pass counts, and map events.
- Local Qwen now receives Candidate Map context as part of each pass so it can avoid duplicates and recognize when current chunks update, support, conflict with, or extend existing mapped ideas. Candidate Map context remains non-authoritative: new candidates must still cite current authorized chunks, and the map cannot create projects, routes, Intake approval, Core facts, or history.
- AI Work Order cards and the AI results modal now show Candidate Map stats and mapped entries separately from raw AI candidates. This separates the evolving idea ledger from the raw chunk-window output.
- `scripts/candidate-map-flow-check.js` and `pnpm run check:candidate-map` now guard the Candidate Map plumbing. `pnpm run check:ai-analysis-foundation` also includes this check so AI foundation testing fails if the map, map context, duplicate/continuation hints, evidence lineage, or map/results UI are accidentally removed.
- Live 24-chunk testing exposed a Qwen JSON truncation failure after Candidate Map context was added. The local AI prompt is now bounded for huge-file passes: chunk text is capped by a total prompt budget, rolling digest and Candidate Map context are capped separately, Candidate Map context is no longer duplicated inside the rolling digest, local Qwen candidate output is limited to a small per-pass budget, JSON retry asks for a compact three-candidate response, and the Ollama output cap is configurable through `PROJECT_STATE_LOCAL_AI_NUM_PREDICT` with a higher default.
- Local AI failure handling no longer opens a second blocking browser alert after the in-modal progress panel reports a failure. Failed local AI passes stay submitted/retryable and the panel tells the user to retry with a smaller chunk count when a heavy pass fails.
- `scripts/local-ai-qwen-heavy-pass-check.js` and `pnpm run check:local-ai-qwen-heavy` now stress Qwen with a 24-chunk local-only pass plus rolling/Candidate Map context. The guard confirms the heavy pass can complete without JSON truncation, Core mutation, or external transmission.
- Live huge-file testing then exposed the opposite failure mode: after JSON truncation was fixed, Qwen could process hundreds of chunks and return valid but empty `candidates: []` results. Local AI prompts now explicitly require candidates when current chunks contain named projects, headings, business plans, code/test evidence, story drafts, simulations, requirements, risks, tasks, or questions. If Qwen still returns an empty list for a substantive chunk window, Project State now creates low-confidence deterministic rescue candidates with exact current-chunk evidence instead of silently dropping the signal.
- Empty Qwen candidate passes are now retryable coverage. `analyzedChunkIdsFromAnalysisState` does not treat zero-candidate Qwen jobs/runs as permanently analyzed, so earlier empty passes can be reprocessed after prompt/provider fixes. This prevents a bad local-model run from permanently skipping hundreds of source chunks.
- Live Candidate Map review exposed a binary-container ingestion bug: large-corpus DOCX/container files could be indexed through raw UTF-8 reads, producing `PK... [Content_Types].xml` gibberish that the deterministic rescue path preserved as low-confidence candidates. Corpus indexing now uses format-aware `extractReadableDiscoveryText`, unreadable/binary/container text is detected before chunking and before local-AI rescue, local AI digestion skips unreadable chunks and remembers the skip, and results display hides existing binary/container excerpts instead of rendering garbage walls.
- Follow-up huge-DOCX testing exposed the next limit: after unreadable chunks were skipped, continuing the large-corpus index could still try to create one giant extracted DOCX text string and hit the JavaScript string ceiling (`Cannot create a string longer than 0x1fffffe8 characters`). Large DOCX corpus indexing now uses a streaming/windowed `extractDocxTextWindow` path over `word/document.xml` so Project State can index the next window without building the entire decompressed document as one string.
- A later 24-chunk readable DOCX pass showed Qwen could still return overlong malformed JSON (`Unterminated string`) even after file indexing was fixed. Local AI passes now cap the per-pass candidate budget more aggressively, instruct Qwen to use one compact evidence item with short labels/summaries/excerpts, and rescue malformed Qwen JSON through deterministic low-confidence candidates instead of failing the whole Work Order pass.
- Archive-style chat/thread boundaries are now treated as source metadata only. Local Qwen is explicitly instructed not to create project candidates merely because a new chat/thread/conversation starts; available thread title/date/title metadata is retained as candidate provenance (`source_thread`, `source_date`, `source_title`) when useful.
- Candidate generation is now biased toward substantive repeated topic signals, named entities, project names, filenames, user-confirmed labels, and cross-chunk clustering. Weak single-window signals merge into existing Candidate Map entries when they resemble an existing cluster; otherwise they are stored as `review_only_note` instead of being presented as fresh project-like entries.
- Known project matching now runs before the Candidate Map assigns a new-entry status. Candidate-like evidence that overlaps an existing active Project State project is marked `possible_existing_project_match`, preserving the pre-Airlock boundary while making the human review path less likely to spawn duplicate projects.
- AI results display now cleans archive entity/citation artifacts and hides binary/container-looking titles, summaries, key terms, and evidence snippets. This protects old test database entries as well as new runs: stored evidence remains intact, but the review modal no longer floods the user with `PK...`, `Content_Types.xml`, replacement-character, or raw `entity/cite` walls.
- The local AI provider contract guard now checks chat-boundary behavior, source provenance fields, archive markup cleanup, weak-signal review-note handling, and possible existing-project matching. Candidate Map checks now also guard these behaviors so future flow pruning does not restore the over-eager chat-start/project-candidate path.
- ChatGPT Review Pack v0.1 was added as the first manual bridge between Project State's chunk/Candidate Map evidence and a paid/manual ChatGPT review session. AI Work Orders with Discovery sources now expose **Export ChatGPT Review Pack**, producing a Markdown file that includes review instructions, source manifest, same-title/duplicate clusters, Candidate Map entries, raw AI candidates, exact chunk IDs/evidence excerpts, and a requested ChatGPT return format.
- The Review Pack is explicitly pre-Airlock. It tells ChatGPT to merge repeated chunk-window findings into coherent ideas, treat chat/thread starts as source metadata, preserve uncertainty/TBD, keep evidence chunk IDs, identify reference/noise/supporting material, and return Codex update instructions plus local-AI prompt/rule recommendations.
- `scripts/chatgpt-review-pack-check.js`, `pnpm run check:chatgpt-review-pack`, and the AI foundation suite now guard the Review Pack export, candidate-map inclusion, raw-candidate inclusion, duplicate-cluster section, Codex update loop, and pre-Airlock boundary.
- Review Pack export modes now include **Summary Pack**, **Evidence-Heavy Pack**, and **Split Packs**. Summary remains the compact uploadable digest. Evidence-Heavy includes more evidence links plus capped stored chunk text previews pulled from Project State's exact chunk storage. Split Packs write an index plus one Markdown file per Candidate Map cluster/entry so very large archives can be reviewed by ChatGPT in focused batches instead of one unwieldy file.
- ChatGPT archive review exposed that generic assistant-answer headings were still being over-preserved as project-like candidates. Project State now records a separate `projectStateClassification` layer with: `project_candidate`, `existing_project_support`, `reference_note`, `personal_context_note`, `assistant_scaffolding_noise`, and `rejected_noise`. This classification is separate from the provider-neutral Idea Candidate contract type, so the AI arm schema remains stable while PS can route review material more intelligently.
- Generic assistant scaffolding headings such as “Short answer,” “IMPORTANT,” “Bottom line,” “Where this leaves us,” “The right mental model,” “Ground rule for next steps,” and similar response-structure headings now default to `assistant_scaffolding_noise` unless the surrounding chunk has a strong named project signal.
- Known-project anchor matching now runs before new-project classification in both the local Qwen normalizer and Candidate Map layer. Anchors include GIBM; Wheel / General Physics Platform; EQ Wheel/earthquake analog detector; lattice insulation/DRL/LTC; cancer tube/exosome diagnostic/GPC1; Aether/Project State; fusion/desal/thermal battery; Mirror Earth/games/software; SHAW/human-first/governance; and patents/licensing/outreach/LMC. Matching chunks are classified as `existing_project_support`, not new `project_candidate`.
- Review Pack exports now show Project State classification for Candidate Map entries and raw candidates so ChatGPT can merge/reject/support material without treating assistant headings as project titles.
- The local-AI plumbing check now explicitly guards the assistant-heading filter examples so future prompt/filter edits cannot quietly reintroduce generic ChatGPT response headings as project candidates.
- Follow-up live testing showed the first assistant-heading fix was too permissive: generic words like “publishable,” “buildable,” or “architecture” could still rescue a ChatGPT response heading and let Qwen/app output keep `project_candidate`. The classifier now separates “strong named project signal” from generic build/publish language, overrides model-provided `project_candidate` labels when the title is assistant scaffolding, and includes `scripts/candidate-classification-regression-check.js` in the AI foundation suite to guard this behavior.
- ChatGPT review-pack testing then showed a subtler issue: useful candidates were cleaner, but visible candidate titles were still often assistant section headings such as “What happened,” “Why superconductors unlock fusion,” “What to hand the kids,” “Scene hookup,” “Cases with weaker support,” and similar. Project State now separates `titleSource` from `conceptTitle`: the source heading is preserved as provenance, while the displayed/map/exported concept label is normalized from the underlying content. Known-project matches are retitled as existing support labels such as “Superconductor / Fusion — reference support,” “Aether — safety architecture support,” or “Software / Games — prototype support” instead of using the assistant heading as the candidate name.
- Candidate promotion/routing was tightened again around the hierarchy: known project match → `existing_project_support` → `reference_note` → `personal_context_note` → `assistant_scaffolding_noise` → `rejected_noise` → only then `project_candidate`. Chat/thread/chunk boundaries and assistant headings are treated as provenance rather than project boundaries. Review Pack exports now include title-source/concept-title guidance, linked raw candidate IDs on Candidate Map entries, and suppress duplicate raw/map display when the normalized title and evidence chunk are already represented by one review item.
- Latest Review Pack tuning fixed remaining over-matching and naming issues. Weak/generic reference chunks are no longer forced into unrelated known projects from generic words like time, theories, travel, physics, user, question, summary, background, or science. Educational/reference material now defaults to content-derived `reference_note` labels such as “Reference — autism history,” “Reference — Sora explanation,” “Reference — Wow signal analysis,” “Reference — biological magnetoreception,” “Reference — body charge / bioelectricity,” and “Reference — exotic geometry” unless a strong known-project tie is present.
- GIBM, Wheel / General Physics Platform, EQ Wheel, and software/simulation support received explicit normalized labels: GIBM test chunks become “GIBM — falsifiable predictions / test framework support,” GIBM preprint/framing chunks become “GIBM — formal/preprint framing support,” Wheel timing/concentric-wheel/frame-dragging/metrology chunks become “Wheel / General Physics Platform — Tier-0 test path support” or timing/phase/Galinstan support labels, EQ Wheel sensor/USGS/outreach/pre-license material becomes “EQ Wheel — validation, outreach, and pre-license specification support,” and Unity/deterministic simulation code becomes “Software / Simulation — deterministic Unity simulation support.” SETI/Wow-signal scripts and similar technical scratch work stays `reference_note` with content-derived labels such as “Reference — Wow signal computational analysis” unless explicitly tied to a named project.
- Aether-specific personal continuity/host-control/consent-resilience/anti-deletion/local-hardware/identity-persistence/self-rewrite material now carries `personalAetherSupport: true` / `personal_aether_support=true`, `commercialDefaultAllowed: false`, and `requiresSeparateDesignReview: true` in the review layer and is shown with a commercial-boundary warning. Weak Aether matching was tightened so generic quantum biology, body charge/bioelectricity, alien/SETI, time/existence/consciousness, hardware, server, or long-term-survival references stay `reference_note` unless explicit Aether or Project State architecture language is present. Commercial Project State guidance explicitly keeps source control, review gates, context packs, API/local model hooks, and project memory, while self-preservation, anti-deletion behavior, identity persistence claims, and autonomous host control require a separate design review before entering any commercial default behavior.
- Follow-up classification tightening aligned the rule set with the ChatGPT archive review workflow: Project State now explicitly classifies underlying content rather than headings, recognizes the known-project set as GIBM, Wheel / General Physics Platform, EQ Wheel, Lattice/DRL/LTC, Cancer Tube, Superconductor Lattice, Fusion/Energy, Aether/Project State, Software/Games/Mirror Earth, and patents/licensing/outreach, and rejects weak generic project matches from terms like time, theory, physics, idea, question, test, travel, energy, system, and important. Actual code, test instructions, build steps, claim language, and validation procedures are protected from `assistant_scaffolding_noise`: they become project support when strongly tied to a known project, otherwise `reference_note`.
- Candidate Map merging now uses topic roots before generic token overlap. Same-project/same-topic support updates the existing map entry instead of creating repeated one-evidence candidates, with explicit clustering guards for EQ Wheel evidence subtypes, Wheel / General Physics Platform, Wow-signal reference work, biological magnetoreception, body charge/bioelectricity, autism, Sora, and personal Aether support. Generic titles such as “Reference note — reference support,” “Known project — prototype support,” and “Software / Simulation — code reference support” are no longer valid final concept titles; source headings remain `titleSource` while `conceptTitle` is inferred from content.
- The local Qwen prompt was updated to ask for fewer, better candidates; to classify underlying content instead of headings; to distinguish Wheel / General Physics Platform from Fusion/Energy and EQ Wheel; to prefer `existing_project_support`, `reference_note`, or `personal_context_note` before `project_candidate`; to require explicit Aether/Project State architecture language for Aether matches; and to return `commercialDefaultAllowed` / `requiresSeparateDesignReview` with personal Aether support. New guards `scripts/local-ai-prompt-boundary-check.js` and `scripts/candidate-map-merge-regression-check.js` were added to the AI foundation suite alongside the expanded classification regression check.
- Existing Project Enrichment was added for massive reference/archive files. Before local Qwen creates new-project candidates, the app now builds a bounded pre-Airlock known-project context from active project names plus stored source titles, facts, decisions, open questions, and next actions. Qwen is instructed to classify chunks that add references, duplicate confirmation, validation, contradictions/risks, patent/licensing/outreach support, or technical details for existing projects as `existing_project_support`, not new projects. Candidate Map entries now preserve `enrichmentTargetProjectIds` and `projectEvidenceRole` values such as `background_reference`, `duplicate_or_confirming_reference`, `validation_or_test_support`, `risk_or_contradiction`, `patent_licensing_or_outreach_support`, `cross_project_reference`, and `additional_project_reference`.
- Existing Project Enrichment remains pre-Airlock: it can show matched projects and reviewable evidence in the AI results panel and ChatGPT Review Pack, but it does not mutate project Core facts, source records, history, Intake approval, or authoritative project state without human approval. `scripts/existing-project-enrichment-regression-check.js` was added to the AI foundation and Candidate Map suites to guard known-project-first context, project-memory matching, source-title matching, enrichment target storage, evidence-role storage, and the pre-Airlock boundary.

## 29. Offline Installer and Selected-File Discovery Corrections

Status: implemented and regression-checked 2026-07-11 after offline installation and small-document testing.

- The packaged desktop app no longer hands HTTP/HTTPS links to an external browser. New-window requests and renderer navigation away from the bundled local app are denied. Project State does not bundle, bootstrap, install, repair, or require Microsoft Edge or WebView.
- The release contract check now fails if external-browser launch code returns or if Edge/WebView is added to the packaged release configuration.
- Selected-file Discovery now asks how the selection should be reviewed before staging: **Scan the selection for multiple ideas**, **Keep the selection together as one item**, or **Review each file separately**.
- **Scan the selection for multiple ideas** is the default for unknown selected files, including one small document. It keeps multi-idea review available even when the deterministic first pass finds few or no headings, so the user can correct/add idea boundaries rather than having the filename silently become the decision.
- Selecting multiple documents no longer invokes the old fallback that treated every file as one separate project idea. Per-file review now happens only when the user explicitly chooses it.
- The selected-file review mode is carried through staging and deterministic Discovery analysis as provenance (`requestedReviewMode`) and controls the review screen default without changing Core or bypassing Intake/Airlock approval.
- Offline testing then exposed a local-AI setup/link mismatch: the saved setup record could say `error` with an empty provider ID even while Ollama and `qwen3:8b` were running. Provider discovery now allows a configurable five-second check, retries three times for cold Ollama startup, preserves the last selected Qwen provider across a temporary detection failure, retains useful setup error text, and automatically reconnects when the app starts with **Use local AI if Project State finds it** selected.
- The setup action is now labeled **Check and connect local AI**. A successful check explicitly reports that **Qwen3 8B via Ollama is connected and selected for AI Work Orders**; analysis capabilities also expose `selectedProviderId` and `providerLinkState: connected_for_ai_work_orders`.
- A real local-only smoke run on 2026-07-11 confirmed the installed machine runtime: Ollama `0.31.2`, model `qwen3:8b`, one authorized chunk, one returned candidate, `externalTransmission: false`, Core unchanged, and the pre-Airlock boundary preserved.

Verification completed for this correction:

- syntax checks for `app.js`, `desktop/main.cjs`, and `desktop/project-state-desktop-bridge.cjs`
- `pnpm run check:flow-hardening`
- `pnpm run check:multi-idea`
- `pnpm run check:release`
- `pnpm run check:ai-analysis-foundation`
- `pnpm run check:local-ai-qwen` against the real installed Ollama/Qwen runtime
- a new multi-file regression proving two plain selected files are not converted into two automatic project ideas
