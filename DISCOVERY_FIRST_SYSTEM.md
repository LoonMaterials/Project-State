# Project State Discovery-First System

Status: approved implementation direction; Stage 2 storage foundation implemented and verified 2026-06-19; Stage 3 Security gate started with exact-checksum quarantine read authorization.

This document is the durable implementation plan for the next Project State stage. It supersedes the pre-Discovery assumption that every incoming file already has a target project.

## Governing sequence

`Add → Quarantine → Security → Read/Extract → Discovery → Questions → Routing → Intake → Human Approval → Core`

Internal architecture may expose the detailed stages. The default end-user interface should normally present the simpler sequence `Add → Review → Confirm` with technical evidence available under Details and History.

## Non-negotiable boundaries

- Security decides whether bytes may be accessed.
- Discovery records what outside material may mean; it is not authority.
- AI and tools may parse, compare, summarize, and suggest questions or routing.
- The user may answer `Not sure`, revise suggestions, split or merge cases, or leave material unassigned.
- Intake contains explicit proposals with a known destination or approved new-project proposal.
- Human approval is required before Core changes.
- Original evidence, user-confirmed information, approved Core state, machine hypotheses, and temporary context remain separate.
- ChatGPT, Codex, Windows Defender, Aether, local models, and future providers remain replaceable actors or arms rather than storage or authority dependencies.

## First-run sequence

1. Configure the owner identity and local storage spine.
2. Configure and verify a Security Arm.
3. Configure backup and recovery.
4. Enable file addition and Discovery.

File content access remains disabled until the configured Security Arm reports healthy. A file may be copied into quarantine while scanning is unavailable, but it must not be previewed, extracted, indexed, summarized, or sent to AI.

## End-user flow

1. The user selects Add Intake, Add Files, or Add Folder.
2. Project State creates a resumable Discovery Case without requiring a project.
3. Selected files receive immutable identity metadata and are copied into managed quarantine.
4. The Security Arm scans the exact quarantined version.
5. Clean files become eligible for deterministic extraction. All other verdicts remain blocked.
6. Supported content is extracted and indexed; unreadable content becomes `metadata_only` rather than being misrepresented as read.
7. Project State groups related files when useful and shows the evidence for the grouping suggestion.
8. Deterministic matching suggests existing projects and possible names.
9. An optional AI Analysis Arm may improve parsing, summaries, questions, and routing suggestions subject to privacy policy.
10. Project State asks only questions whose answers affect meaning, grouping, privacy, or routing.
11. The user chooses an existing project, several projects, a proposed new project, general reference, orphaned idea, unassigned, or reject/discard.
12. A complete preview shows proposed records, links, trust state, and unresolved uncertainty.
13. Confirmation promotes the Discovery Case into one or more Intake proposals.
14. Intake review and human approval write the accepted changes into Core and Change History.

## Foundation objects

### File Asset

A project-independent identity for immutable file bytes.

Required concepts:

- Stable asset and version IDs.
- SHA-256 content identity and duplicate detection.
- Original metadata and managed quarantine/discovery path.
- Security receipt for the exact checksum.
- Extraction state and derivative links.
- Privacy classification.
- Retention and archive state.
- Links to zero, one, or many projects without duplicating the managed bytes.

### Discovery Case

A resumable group of one or more File Assets or other outside inputs under examination before project routing.

Required concepts:

- Stable ID, creator, timestamps, current stage, and trust boundary.
- File membership and grouping rationale.
- Extraction and analysis state.
- Existing-project candidates and proposed names with evidence and confidence.
- Questions, answers, unresolved unknowns, and user corrections.
- Routing destinations and confirmation state.
- Links to generated Intake items and resulting Core objects.
- Append-only Discovery events.

### Interaction

A provider-neutral record of a question, answer, suggestion, correction, or tool contribution.

Required concepts:

- Stable ID, case ID, actor ID/type, timestamp, interaction type, and content.
- Provider/model/tool provenance when applicable.
- Evidence references and confidence.
- Privacy handling and transmission record.
- Supersedes/corrects relationships.
- Explicit distinction between user-confirmed content and machine suggestion.

### Security Receipt

An immutable result tied to one exact File Asset version and scanner state. Full rules live in `SECURITY_ARM_CONTRACT.md` and `fixtures/security-arm-v0.1-contract.json`.

## Destination model

Discovery must not force every file into one project. Allowed outcomes are:

- Existing project as primary destination.
- Additional project links.
- Proposed new project.
- General reference/library.
- Orphaned idea.
- Unassigned Discovery.
- Rejected or discarded material.

Project-specific Source records may hold different summaries, tags, trust judgments, and relevance while pointing to the same global File Asset.

## Parsing and analysis

Deterministic local processing runs before optional AI analysis. Initial target formats are PDF, DOCX, TXT, Markdown, CSV, JSON, and supported images where safe local metadata or OCR is available.

Every extraction reports one of:

- `complete`
- `partial`
- `metadata_only`
- `unsupported`
- `failed`

No extraction state may imply that content was read when it was not. Large content should be chunked with stable references to the source asset and version.

## Privacy before AI

Discovery classifies or asks about transmission policy before an external AI Arm receives material:

- `local_only`
- `personal`
- `confidential`
- `restricted`
- `provider_allowed`

An AI Arm may receive full text, redacted text, selected chunks, metadata only, or nothing according to policy. Every transmission records provider, purpose, content scope, time, and resulting Interaction IDs.

## API evolution

Target-known API Arm v0.1 remains compatible and authoritative only for creating Intake proposals with a valid project. It must still pass all files through the Security gate.

Discovery adds a separate provider-neutral contract rather than weakening Intake:

- Describe Discovery capabilities.
- Create and retrieve a Discovery Case.
- Attach or stage File Assets.
- Read processing status.
- Submit non-authoritative analysis suggestions.
- Record user answers and corrections.
- Confirm routing.
- Promote a ready case into Intake.

External arms cannot mark Security clean, confirm user answers, approve routing, approve Intake, create Core projects directly, or delete evidence/history.

## Background operation

Scanning, extraction, indexing, and analysis must be resumable and idempotent. The interface needs per-file progress, pause, cancel, retry, blocked/error states, and restart recovery without duplicate copies or events.

## Implementation stages

### Stage 1: Contracts and checkpoint

- Preserve the final pre-Discovery source and installer.
- Add File Asset, Discovery Case, Interaction, and Security Receipt contract fixtures.
- Document state machines, permissions, migrations, and invariants.

### Stage 2: Storage foundation

- Completed 2026-06-19.
- Added quarantine and discovery managed folders.
- Added additive SQLite records for File Assets, immutable File Versions, project-optional Discovery Cases, case membership, append-only Interactions, exact-checksum Security Receipts, and append-only Discovery Events.
- Added database constraints and triggers for checksum lineage, deduplication, foreign-key integrity, append-only records, and machine-authority rejection.
- Extended integrity, backup, restore, reset, migration, and recovery behavior and verified that legacy saves preserve Discovery records.
- The new storage layer does not yet scan or expose file content; global Security enforcement begins in Stage 3.

### Stage 3: Security gate

- Started 2026-06-19: reads from registered `quarantine/` paths now fail closed until an eligible clean receipt exists for the exact File Asset, File Version, and current bytes. Changed bytes invalidate access.
- Provider configuration, provider health, scan execution, staging orchestration, first-run setup, and Windows Defender integration remain pending.
- Add first-run Security Arm setup and health verification.
- Stage every file into quarantine before access.
- Enforce clean-receipt requirements across UI, File Arm, API, and future Aether ingestion.
- Add a provider-neutral adapter and a Windows Defender adapter profile for Aether.

### Stage 4: Deterministic extraction

- Build safe local extraction and chunking.
- Record explicit extraction state, errors, and evidence links.
- Add duplicate and file-version handling.

### Stage 5: Discovery experience

- Replace project-first file import with resumable Discovery Cases.
- Add grouping, project matching, suggested names, adaptive questions, answers, privacy, and routing review.

### Stage 6: Intake promotion

- Generate target-known Intake proposals only after user confirmation.
- Support existing projects, several project links, and proposed new projects.
- Preserve Discovery → Intake → Core lineage in history and search.

### Stage 7: Optional analysis arms

- Add capability-negotiated AI parsing and question/routing suggestions.
- Enforce privacy, provenance, evidence references, and non-authority rules.
- Keep Project State functional without an AI provider.

### Stage 8: Pilot and lock

- Run migration and real mixed-file testing.
- Validate clean-install backup/restore and provider replacement.
- Fix blockers, freeze the data/API contracts, and designate Project State v0.1 Discovery-ready.

## Acceptance statement

The system is Discovery-ready when unassigned outside material can be safely scanned, read where supported, questioned, routed, promoted through Intake, and traced into Core without requiring AI, inventing facts, duplicating evidence, or bypassing human authority.
