# Folder Discovery Flow v0.1

Date: 2026-06-20  
Status: implemented and verified foundation

## Purpose

A folder is a selection boundary, not a project decision. Project State must show what it found, suggest manageable groups, let the user correct the grouping strategy, and then apply the normal Discovery and Intake rules to each group.

## End-user flow

`Add folder → Inspect recursive selection → Review files and skipped items → Choose grouping strategy → Acknowledge external security responsibility → Stage exact files → Review each group → Route document units → Intake → Individual approval → Core`

The first grouping choices are:

- **Use suggested folder groups** — group files by their first relative folder.
- **Treat the selected folder as one case** — keep the selected material together.
- **Review every file separately** — create one Discovery Case per file.

Suggested folder groups are visible beside every selected file before staging. Groups larger than 24 files continue as numbered parts; selected files must never disappear behind a display or processing cap.

## Authority and provenance rules

- The selected folder path is context only. Project State registers and stages individual exact files.
- Original files remain untouched.
- Every staged file receives its own immutable File Version and SHA-256 identity.
- Each confirmed group becomes a separate Discovery Case with its grouping label preserved.
- Groups are reviewed sequentially so one confirmation cannot silently route unrelated groups.
- Every group reuses the multi-idea document map and independent unit routing.
- Unreadable and unsupported files remain explicitly skipped, blocked, or metadata-only.
- No folder, group, document unit, or Intake batch receives automatic approval.
- No bundled malware scanner or safety claim is introduced.

## Continuation after v0.1

Later folder work may add drag-and-drop movement between suggested groups, pause/resume for large processing queues, richer similarity evidence, and optional AI grouping suggestions. Those additions must extend this route-map model rather than create another authority path.

## Acceptance gate

The foundation is ready when an isolated folder test proves that two relative folders become two sequentially reviewed Discovery Cases and two independently routed Intake proposals, while each file retains exact provenance and no renderer or Core-authority error occurs.

## Verification result — 2026-06-20

- Recursive inspection retained both supported fixture files and explicitly reported the unsupported file.
- Alpha and Beta were shown as two suggested relative-folder groups with all three correction strategies available.
- The groups opened as Review 1 of 2 and Review 2 of 2 rather than one forced folder decision.
- The live flow created two Discovery Cases, two exact File Versions, and two pending Intake proposals.
- The live renderer reported no exception.
- All 34 non-live regression checks and renderer/bridge syntax checks passed after implementation.
