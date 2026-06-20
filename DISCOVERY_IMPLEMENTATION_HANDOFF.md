# Discovery Implementation Handoff

Date: 2026-06-19  
Current milestone: Discovery rebuilt under the external-security boundary; verification and live testing remain.

## Governing decision

Project State is not antivirus software. It does not bundle Windows Defender or any other security provider, scan files for malware, or claim that files are clean or safe.

Before staging, the user must acknowledge that they trust the selected file and are responsible for checking it with their own security tools. Project State then copies the original into managed staging, records the exact size and SHA-256, preserves the user's original, and refuses later content access if the staged bytes change.

## Implemented flow

`Add → External-security acknowledgment → Stage exact copy → Extract → Discovery → Questions → Human routing → Intake → Human approval → Core`

The user-facing shape is `Add → Review → Confirm`:

- Add selects files or a folder without requiring a project first.
- Review shows the security boundary, suggested name, possible project matches, and questions that always allow `Not sure`.
- Confirm records the human route and creates pending Intake proposals. Core remains unchanged until separate human approval.

## Rebuilt components

- Project-independent File Assets, immutable File Versions, Discovery Cases, case membership, Interactions, Events, Extractions, and Chunks.
- Trusted-file staging with required external-security acknowledgment, original-file preservation, exact-byte hashing, and duplicate-byte reuse.
- Deterministic extraction for TXT, Markdown, CSV, JSON, PDF, and DOCX; images remain metadata-only; unsupported or failed formats receive explicit statuses.
- Deterministic project-name suggestions, existing-project candidate matching, adaptive questions, and human-confirmed routing.
- Idempotent promotion to pending Intake for existing projects, proposed new projects, general reference, and orphaned ideas.
- Unassigned and rejected cases remain outside Intake.
- Integrity verification covers staged bytes, extraction artifacts, and chunks.
- Browser mode exposes no native Discovery bridge.

## Authority boundary

- External security acknowledgment is not a safety verdict.
- AI suggestions are proposals, not decisions.
- Machine actors cannot answer for the user or confirm routing.
- Discovery cannot approve Intake.
- Intake cannot change Core without a separate permitted human approval.
- No provider-specific scanner is part of the current release.

## Verification

The focused automated gates cover the contract, storage foundation, external-security boundary, extraction, case flow, Intake promotion, exact-byte tamper blocking, original preservation, and UI flow. Run the complete suite before live testing and record the result in the inventory.

## Next safe boundary

1. Finish the full non-live regression suite.
2. Create a source-only checkpoint with a distinct name.
3. Copy that checkpoint to the user's jump drive and commit the source before any packaging work.
4. Begin live Discovery testing with harmless, already-trusted fixtures in a dedicated temporary storage root.

Do not build or run an installer from the development source folder. Packaging and install/uninstall preservation must be handled as a later, isolated task.

## Required references

- `DISCOVERY_FIRST_SYSTEM.md`
- `SECURITY_ARM_CONTRACT.md`
- `fixtures/discovery-v0.1-contract.json`
- `fixtures/security-arm-v0.1-contract.json`
- `PROJECT_STATE_COMPLETE_INVENTORY.md`

The immutable pre-Discovery artifacts in `checkpoints/` must not be overwritten.
