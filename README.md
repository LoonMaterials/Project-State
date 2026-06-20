What is Project State?

Project State is a local-first project continuity system designed to preserve the current state, history, decisions, questions, actions, and relationships of a project in a single authoritative location.

The core idea is simple:

Most projects don't fail because information is missing. They fail because information becomes fragmented.

Project State attempts to solve the problem of context fragmentation by treating the project itself—not conversations, documents, emails, or AI chats—as the source of truth.

What Problem Does It Solve?

As projects grow, information becomes scattered across:

Emails
Chat conversations
AI conversations
Documents
Meeting notes
Source control
Human memory

Over time people stop asking:

"What's the current status?"

and start asking:

"Where did we talk about that?"

Project State is designed to answer:

"What is the current state of this project, and how did it get here?"

Current Core Objects

The current prototype tracks:

Projects
Decisions
Facts
Open Questions
Next Actions
Relationships
Sources
Extracts
Conflict Register
Change History
Actors

Every significant change records:

What changed
Who changed it
When it changed
Why it changed
Design Principles

Project State is:

Local-first
Human-readable
AI-compatible
Change-tracked
Decision-centered
Context-preserving

Project State is not:

Social media
Attention software
Productivity gamification
AI-controlled project management

Humans remain the authority.

AI acts as a contributor.

Approval Queue

The Intake Airlock includes an approval queue for outside inputs from files, notes, chat, email, AI, APIs, Codex, and other arms.

The desktop **Files** screen is the human file-import path. It can select multiple files or recursively inspect a selected folder without requiring a project first. Project State preserves originals, records the user's external-security responsibility, stages checksum-verified exact copies, reads supported content, and opens Discovery review before creating pending Source proposals in Intake. Files do not become authoritative project Sources until individually reviewed and approved.

A document can be treated as one item or reviewed as several editable ideas with independent routes. Several proposals from one document retain one immutable File Version and managed copy. Folder import shows deterministic relative-folder groups and lets the user use those groups, treat the folder as one case, or review every file separately. Resulting groups are reviewed sequentially; groups larger than 24 files continue as numbered parts rather than silently dropping files.

Queue review is separate from approval:

New
Needs Review
Ready
Blocked

Only items marked Ready can be approved into Project State. Approval still requires a human actor, timestamp, reason, and explicit confirmation that the proposal was reviewed and that outside inputs are not authority.

Source Trust Levels

Sources now carry a trust level so evidence can be reviewed without turning the source itself into authority:

Primary
Supporting
Unverified
Superseded
Conflicting

New sources default to Unverified. Changing a source trust level records actor, timestamp, reason, and the changed field in history.

Source Staleness Flags

Source freshness is tracked separately from trust level and file integrity:

- Current
- Review Due (within 30 days)
- Stale
- Not Reviewed

Freshness is calculated from a human-recorded review date and next-review date. Reviewing freshness requires an actor and reason and creates a source history entry. Existing sources migrate to Not Reviewed until a human reviews them. Verifying that a local file still exists or has not changed does not certify that its content is current.

Trust Boundary Labels

Workflow records display a derived trust-boundary label:

- Outside Input
- Airlock Proposal
- Project State Record
- Read-only Export

Boundary labels describe where information sits in the workflow; they do not assert truth or grant permissions. Outside input is visibly shown entering the Airlock, pending extracts remain Airlock proposals, approved records appear as Project State records, and context packs are labeled read-only exports. These labels are derived from workflow state and cannot be edited to bypass human approval.

Conflict Register

Projects now include a Conflict Register for contradictions, disputed facts, and mismatched source claims. A conflict records:

Title
Description
Linked items
Status
Resolution
Actor and timestamp
Reason for creation or update

Conflict statuses are:

Unresolved
Under Review
Resolved
Archived

Unresolved and Under Review conflicts appear in project context and handoff checks so they are visible before approval or outside-arm work continues. Conflicts can be proposed through the Intake Airlock, but they still require human approval before entering Project State.

Decision Continuity

Decisions can explicitly Supersede or Replace an earlier decision using the earlier decision's stable ID. The earlier decision and its history remain intact; linking a newer decision never silently archives, deletes, or rewrites it. Both forward and reverse relationships are shown, exported in context packs, included in search, and checked by the Integrity Dashboard for missing references.

What Changed Since

Each project includes a read-only What Changed Since view. Choose a starting date to see the recorded change count, affected object types, actors, timestamps, reasons, and change details. The view reads from Change History and does not rebuild or overwrite Current State.

Workflow Usability

- Project headers use one Add menu and one secondary-actions menu to reduce crowding.
- Every core object can open in a focused detail drawer while retaining the same edit, archive, source, image, review, assignment, and history pathways.
- Stable object references in decisions, attached sources, relationships, search results, and history open the referenced object directly.
- Continue Working remembers recent project IDs, the last project tab, and project scroll positions as local UI preference metadata. These preferences are not Project State history.
- Needs Attention consolidates incomplete projects, overdue actions, stale or missing sources, unresolved conflicts, pending approvals, assignments, drafts, integrity warnings, and AI work orders.
- Intake review advances to the next pending item. Batch triage can update queue state for several items, but approval remains strictly one item at a time.
- Role-aware controls use the configured default actor and project roles. This is local policy enforcement, not account authentication.
- Propose Correction creates an Intake Airlock proposal. Approved records remain unchanged until a permitted human approves the correction, and the applied correction records previous and new content in history.
- Project and Intake screens present one contextual Next step; actionable warnings open the correcting form directly.
- Technical IDs, checksums, managed paths, and detailed provenance remain available behind Details and provenance.
- Governed add and edit forms show a plain-language final review before writing, while existing approval/confirmation actions are not given a redundant second review.

Long-Term Vision

The long-term goal is a system where:

Projects retain continuity across years
New team members can rapidly understand project history
AI systems can contribute without becoming the source of truth
Context survives personnel changes, software changes, and time

Think:

"Git for project knowledge and decisions."

rather than:

"Another task manager."

Storage and Backup

Project State separates primary storage from backup:

Primary storage: the desktop platform storage spine. Browser storage remains available only as a development and legacy migration harness; full Project State mode requires the desktop bridge.
Backup storage: a user-controlled Project State desktop backup package exported from the app.

The backup file should live somewhere outside the primary storage location, such as a separate local folder or an external drive. Without a server, primary storage and backup must not be treated as the same location.

The desktop storage spine is SQLite plus managed local folders. New storage, backup, restore, intake, file-reading, and API work should target the desktop bridge instead of expanding browser mode. The current contract lives in `DESKTOP_STORAGE_SPINE.md` and `fixtures/desktop-spine-v0.1-contract.json`.

Startup gate: when the desktop bridge is present, Project State opens normally. When the bridge is missing, the app opens Browser/dev mode for inspection and raw export only. Browser/dev mode must not silently save, migrate, back up, restore, intake, read files as authoritative sources, or edit Project State records.

First-Run Setup

On first open, Project State asks for:

Primary actor
Backup location guidance
Backup reminder preference
Language preference
Single-user local-mode confirmation

These setup values are stored in the local storage spine and can be used later by packaging or installer workflows.

Language Foundation

Project State has a small language registry in the app code. The current app defaults to English and supports English, French, German, and Spanish. The selected language is stored in local settings. Additional languages can be added by extending that registry without changing stored project records.

Settings

Project State includes a local Settings screen for:

Default language
Local actors and roles
Primary storage system status
Backup location guidance and reminder
Storage and backup override warnings
Recovery controls
Approval and airlock policy visibility
Basic diagnostics

Actor roles are local metadata only. They are not accounts, logins, cloud permissions, or collaboration controls yet.

Current local actor roles and definitions:

Owner

Purpose: Ultimate authority over Project State.

Permissions: create projects, edit projects, approve changes, manage users, manage roles, manage integrations, manage storage, export data, import data, archive projects, delete projects, reset system, transfer ownership.

Restrictions: none.

Admin

Purpose: system administrator.

Permissions: create projects, edit projects, manage users, assign roles, manage integrations, manage storage, export data, import data, archive projects.

Restrictions: cannot transfer ownership; cannot override Owner authority.

Project Lead

Purpose: responsible for one or more assigned projects.

Permissions: create project content, edit project content, approve changes within assigned projects, manage contributors within assigned projects, archive assigned projects.

Restrictions: cannot manage system-wide settings; cannot manage global roles.

Approver

Purpose: authority to approve proposed state changes.

Permissions: review drafts, approve drafts, approve facts, approve decisions, approve questions, approve actions, approve relationships.

Restrictions: cannot manage users, manage permissions, or manage system settings.

Editor

Purpose: maintain approved project content.

Permissions: create content, edit content, update approved records, attach sources, create extracts, generate draft projects.

Restrictions: cannot approve changes; cannot manage permissions.

Contributor

Purpose: submit information and proposals.

Permissions: create drafts, create facts, create questions, create actions, attach sources, create extracts, generate suggestions.

Restrictions: cannot approve changes; cannot edit approved records without permission.

Reviewer

Purpose: review proposed content before approval.

Permissions: review drafts, add comments, add feedback, request revisions.

Restrictions: cannot approve changes; cannot modify approved records.

Auditor

Purpose: independent oversight and traceability.

Permissions: view all projects, view history, view change logs, view approvals, export audit reports.

Restrictions: cannot create content, edit content, or approve changes.

Viewer

Purpose: read-only access.

Permissions: view projects, view current state, search content.

Restrictions: cannot create content, edit content, or approve changes.

AI / Tool

Purpose: non-human contributor.

Permissions: search content, summarize content, create extracts, generate facts, generate questions, generate actions, generate relationships, generate draft projects, generate reports, generate handoffs.

Restrictions: cannot approve changes, modify permissions, delete history, delete projects, or become source of truth.

Rule: AI and tools may propose changes. Humans must approve changes before they become Project State.

Permission Matrix v0.1

| Role | Create | Edit | Approve | Audit | Admin |
| --- | --- | --- | --- | --- | --- |
| Owner | Y | Y | Y | Y | Y |
| Admin | Y | Y | N | Y | Y |
| Project Lead | Y | Y | Y | Y | N |
| Approver | N | N | Y | Y | N |
| Editor | Y | Y | N | N | N |
| Contributor | Y | N | N | N | N |
| Reviewer | N | N | N | N | N |
| Auditor | N | N | N | Y | N |
| Viewer | N | N | N | N | N |
| AI / Tool | Y | N | N | N | N |

The matrix controls which actions are shown and accepted for the configured default actor, including project-specific roles. This is local single-user policy enforcement, not account authentication or multi-user authorization.

Mandatory History Policy v0.1

Every approved Project State change must record:

Actor
Timestamp
Reason
Changed object
How the change entered the core
Active UI language

Storage Spine v0.2 Phase 0 Baseline

Phase 0 adds a representative v0.1 storage fixture and a baseline checker before any storage migration work.

Fixture:

fixtures/storage-spine-v0.1-baseline.json

Checker:

scripts/storage-phase0-baseline-check.js

Run:

node scripts/storage-phase0-baseline-check.js

The checker counts actors, projects, sources, extracts, drafts, relationships, actions, history, attachments, and source links. It also verifies core references such as project IDs, source/extract links, relationship targets, attachment targets, and mandatory history fields.

Storage Spine v0.2 Phase 1 Manifest

Phase 1 keeps the current single `records/main` IndexedDB layout, but adds a storage-spine manifest and save verification before the larger multi-store split.

The app now writes:

records/main: the current complete Project State store
records/spine-meta: a small manifest with spine version, layout version, counts, storage size, large-content counts, and future split targets
records/legacy-json-backup: preserved legacy localStorage data when migration from the old JSON blob occurs

The save path writes the main record, writes the manifest, then reads the main record back to verify key counts before marking the app saved.

Checker:

scripts/storage-phase1-spine-check.js

Run:

node scripts/storage-phase1-spine-check.js

Phase 1 does not split project data into separate stores yet. It prepares and verifies the bookkeeping needed for that split.

Storage Spine v0.2 Phase 2 Split Stores

Phase 2 makes the split IndexedDB stores the primary storage path while preserving `records/main` as a full backup copy.

Primary object stores:

meta
projects
history
sources
extracts
attachments
drafts
recovery

Compatibility backup:

records/main remains a complete Project State store backup.
records/spine-meta remains as a compatibility manifest record.
records/legacy-json-backup remains for old localStorage migration evidence.

On load, the app tries the split stores first. If the split manifest is missing or invalid, the app falls back to the preserved `records/main` store and writes the split stores again after normalization. If both paths fail, recovery mode preserves the raw failed data instead of opening a blank store.

Checker:

scripts/storage-phase2-split-check.js

Run:

node scripts/storage-phase2-split-check.js

The checker splits the Phase 0 fixture, rebuilds the full Project State store from the split records, and verifies the rebuilt store still passes the original integrity checks.

Storage Spine v0.2 Phase 3 Audit

Phase 3 keeps the Phase 2 split-store layout and adds stricter storage audits.

The app now audits split-store references before accepting a split-store load:

source records must point to existing projects
extract records must point to existing sources and projects
draft records must point to existing projects and any referenced source/extract
history records must point to existing projects and include actor, timestamp, reason, and changed-object details
attachments must point to an existing project object, source, or extract
split-store counts must match the manifest
IDs must remain unique across split records

The save path also verifies that `records/main` remains a readable full backup after the split stores are written.

Checker:

scripts/storage-phase3-audit-check.js

Run:

node scripts/storage-phase3-audit-check.js

Questions I'd Love Feedback On
Architecture
Should project state be directly editable or derived from change events?
JSON, SQLite, or hybrid storage?
What is the best local-first architecture?
Teams
What information do teams lose most often?
What project information is hardest to recover six months later?
What would make onboarding easier?
Project Management
Are Decisions, Facts, Questions, and Actions sufficient?
Are there missing first-class objects?
How should project relationships work?
Knowledge Management
How should large documents be handled?
Should source documents be stored directly or referenced?
How should information be extracted from documents into project state?
AI Integration
What would you trust AI to do?
What would you never trust AI to do?
How should AI suggestions be reviewed and approved?
Collaboration
What permissions and roles are actually useful?
How should multi-user editing work without losing accountability?
Current Development Status

Prototype exists and currently supports:

Project dashboards
Decisions
Facts
Questions
Actions
Relationships
Change history
Actor tracking
Stable object IDs
Local storage

Currently exploring:

Source documents
Search
Knowledge ingestion
Multi-user architecture
AI-assisted extraction

Current Architecture Note

Project State now uses an octopus-style architecture:

Core: approved Project State records
Spine: local storage and retrieval
Airlock: intake/proposed changes awaiting human review
Arms: future inputs such as APIs, AI, Codex, notes, email, meetings, calendars, and files

Arms do not write directly to the core. They create intake items. A human must approve intake before it becomes a Decision, Fact, Open Question, Next Action, Source, Relationship, or Project Status change. Rejected and archived intake remains outside the core.

API arms follow the same rule: they plug into the desktop app's Intake Airlock, not directly into Core or Spine. Browser/dev mode is not an equal production target for API work.

API Arm Contract v0.1 is documented in `API_ARM_CONTRACT.md` with its machine-readable companion at `fixtures/api-arm-v0.1-contract.json`. The desktop bridge implements capability discovery, envelope submission, and receipt lookup under `window.ProjectStateDesktop.intakeArms`, including validation, idempotent atomic batch acceptance, durable Airlock receipts, and server-owned workflow fields. A successful receipt means only that an outside proposal is retained in the Airlock pending human review.

Local Arm Transport v0.1 is documented in `LOCAL_ARM_TRANSPORT_CONTRACT.md`. It is disabled by default, binds only to `127.0.0.1`, requires an encrypted bearer token, rejects browser-origin requests, applies request and rate limits, and is controlled from Settings with actor/reason audit records. Integration secrets remain machine-local and are excluded from backup and export packages.

The first maintained connectors are provider-neutral: `scripts/api-arm-submit.js` submits proposal envelopes and `scripts/api-arm-submit-file.js` submits checksum-verified files under `FILE_ARM_CONTRACT.md`. Both read the token from `PROJECT_STATE_API_ARM_TOKEN` and refuse token command-line arguments. No provider-specific calendar, email, chat, Codex, or AI connector is installed yet.

Desktop Release Contract v0.1 is documented in `RELEASE_CONTRACT.md`. Electron 42.4.1 is pinned, the packaged Node 24 runtime passes SQLite write/read verification, the unpacked artifact excludes user data and secrets, and a per-user NSIS installer is available as an unsigned local test candidate. `REAL_TIME_TEST_PLAN.md` defines the remaining live desktop, connector, install, upgrade, and uninstall-preservation tests.

Context Pack Foundation

Each project can export a local Context Pack for future API or AI arms. A context pack is a bounded JSON packet containing the current project brief, selected scope, recent decisions, key facts, open work, relationships, evidence/source chunks, recent history, and a standard proposal schema. Context packs are read-only context. They do not change Project State and do not authorize an arm to write to Core or Spine.

Context Pack presets are available for common handoffs:

Current state only
Current state plus recent decisions
Full project handoff
Source-heavy research context
Codex implementation context
Custom

Presets control scope, context budget, and which sections are included so future arms receive only the context needed for the task.

Handoff Mode

Each project has a read-only Handoff Mode for humans or AI helpers joining the work. It summarizes what the project is, why it matters, recent changes, approval waits, blockers, ownership, trusted sources, AI boundaries, and what not to touch. Handoff Mode can also export a local Markdown handoff file. Handoffs are briefing material only; they do not authorize changes to Core or Spine.

Collaboration Workflow Foundation

Project State now includes local collaboration workflow primitives for future multi-human and AI-assisted use:

Assignments: objects can be assigned to an owner, reviewer, approver, or watcher.
Review threads: objects can hold comments and review-state notes. Comments are part of the project record and are not private.
Project roles: projects can record project-specific human roles without changing global system roles.
Proposal diffs: intake approvals show current value versus proposed value before human approval.
AI work orders: humans can create bounded AI work requests with a context-pack preset and output type. Creating a work order does not call AI and does not change Project State.
Notifications: assignments and open AI work orders appear in the Work Inbox.

These collaboration records support workflow and review. They do not let humans, AI, APIs, or other arms bypass the Intake Airlock or write directly to Core or Spine.

Recorded Communications

Recorded chats and emails are treated as Project State source records. They can be linked to Project State users through actor email addresses and chat handles. These records are not private; authorized Project State users should assume recorded project chats, emails, sources, and history are visible inside the app.

Integrity Dashboard

Settings now includes a read-only Integrity Dashboard. It reports storage warnings, broken internal source/extract/image/relationship links, weak source file references, linked-user references that no longer resolve, oversized extract/image content, recovery signals, and object counts. The dashboard does not repair or mutate data; it is an early warning surface for data safety checks before backup, restore, intake, and API work.

Source File Verification

Sources can now verify their recorded local file reference. In desktop mode, Project State checks whether the absolute local path still exists and whether the file size still matches the recorded source metadata. Verification requires actor and reason, saves the result on the source, and records history. Browser/dev mode cannot verify local paths and marks those checks as not verifiable.
