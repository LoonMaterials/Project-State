# Folder Discovery Flow v0.1

Date: 2026-06-20  
Status: implemented foundation; unknown-folder end-user flow repaired 2026-07-05

## Purpose

A folder is a selection boundary, not a project decision. Project State must show what it found, catalog supported files, separate subfolders from loose files, and avoid turning folder structure into automatic project proposals.

## End-user flow

`Add unknown folder → Inspect recursive selection → Review files and skipped items → Acknowledge external security responsibility → Stage exact files → Catalog subfolders to AI Work Orders / review loose files through Discovery → Route deliberately → Intake only when selected → Individual approval → Core`

The current end-user unknown-folder choices are:

- **Use unknown-folder flow** — catalog every selected file, route first-level subfolders to AI follow-up, and continue loose files through Discovery.
- **Emergency: review every file separately** — create one Discovery Case per file when the folder map itself is unhelpful.

Suggested folder groups are visible beside every selected file before staging. The selected parent folder is never itself a project candidate.

## Authority and provenance rules

- The selected folder path is context only. Project State registers and stages individual exact files.
- Original files remain untouched.
- Every staged file receives its own immutable File Version and SHA-256 identity.
- Subfolders become cataloged Discovery Cases routed to visible AI Work Orders for follow-up.
- Loose files continue through Discovery review, where the user deliberately chooses Intake, AI follow-up, rejection, reference, or unassigned.
- Metadata-only image/plot/support files remain evidence-only unless a later human flow attaches them to a project.
- Unreadable and unsupported files remain explicitly skipped, blocked, or metadata-only.
- No folder, group, document unit, or Intake batch receives automatic approval.
- Large/no-text material must not promote directly to Intake; it belongs in AI follow-up first.
- No bundled malware scanner or safety claim is introduced.

## Continuation after v0.1

Later folder work may add a richer folder-map review, pause/resume for large processing queues, clearer Work Order review, and optional AI grouping suggestions. Those additions must extend this route-map model rather than create another authority path.

## Acceptance gate

The repaired flow is ready when an isolated folder test proves that subfolders become visible AI Work Orders, loose files remain the only items entering Discovery review, image/plot-only evidence does not become ready project approval, each file retains exact provenance, and no renderer or Core-authority error occurs.

## Verification result — 2026-06-20

- Recursive inspection retained both supported fixture files and explicitly reported the unsupported file.
- Alpha and Beta were shown as two suggested relative-folder groups with all three correction strategies available.
- The groups opened as Review 1 of 2 and Review 2 of 2 rather than one forced folder decision.
- The live flow created two Discovery Cases, two exact File Versions, and two pending Intake proposals.
- The live renderer reported no exception.
- All 34 non-live regression checks and renderer/bridge syntax checks passed after implementation.

## Repair result — 2026-07-05

- The selected parent folder is hidden from project-candidate promotion.
- The whole-folder one-case option is removed from the end-user unknown-folder flow.
- Subfolders route to AI Work Orders and Work Orders persist through desktop save/load.
- Loose files continue through Discovery with safe defaults rather than automatic project proposal.
- Metadata-only images/plots stay evidence-only and large corpus material is blocked from direct Intake promotion.
- The active Discovery progress panel filters stale/routed/promoted cases and old Folder Root entries.
