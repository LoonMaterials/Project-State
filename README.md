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
Backup storage: a user-controlled Project State backup JSON file exported from the app.

The backup file should live somewhere outside the primary storage location, such as a separate local folder or an external drive. Without a server, primary storage and backup must not be treated as the same location.

The planned desktop storage spine is SQLite plus managed local folders. The current contract lives in `DESKTOP_STORAGE_SPINE.md` and `fixtures/desktop-spine-v0.1-contract.json`.

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

The matrix is currently policy/reference for the future multi-user model. It is not yet enforced as login or collaboration permissions.

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
Arms: future inputs such as AI, Codex, notes, email, meetings, calendars, and files

Arms do not write directly to the core. They create intake items. A human must approve intake before it becomes a Decision, Fact, Open Question, Next Action, Source, Relationship, or Project Status change. Rejected and archived intake remains outside the core.
