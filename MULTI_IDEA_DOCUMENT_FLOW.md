# Multi-Idea Document Flow v0.1

Date: 2026-06-20  
Status: implemented and verified

## Purpose

Project State must not assume that one file equals one project or one idea. A long document may contain several independent projects, supporting ideas, references, or unresolved material. Discovery therefore reviews **document units** before project routing.

## End-user flow

`Add file → Read exact source → Review document map → Correct units → Route each unit → Confirm → Intake → Individual approval → Core`

The review offers two explicit choices:

- **Treat as one item** when the document belongs together.
- **Review several ideas separately** when sections need independent routing.

Project State may suggest units from visible headings and file boundaries. These are deterministic, non-authoritative suggestions. The user may rename, summarize, include, omit, combine, or add a unit before confirmation.

Each included unit can independently route to:

- an existing project;
- a proposed new project;
- general reference;
- orphaned idea;
- unassigned material; or
- rejection.

## Authority and provenance rules

- The original file remains one immutable File Version with one SHA-256 identity.
- Units do not duplicate or alter the source bytes.
- Every unit retains its source File Version, extraction, heading/line evidence where available, and Discovery Case.
- Suggested boundaries, titles, and summaries are not facts and are not Core.
- Human-confirmed unit routing is recorded as one routing interaction containing the complete route map.
- Each promotable unit creates its own pending Intake proposal so approval remains individual.
- One source file may support several projects without duplicating immutable bytes.
- Unassigned and rejected units remain in Discovery and do not enter Intake.
- AI is optional. Deterministic extraction and user-authored units must work without a provider.

## Folder continuation

Folder reading comes after this unit flow is verified. A folder becomes a collection of file and document units using the same review, grouping, correction, routing, Intake, and provenance rules rather than a separate authority path.

## Acceptance gate

The flow is ready for folder-scale work when an isolated test proves that one document can produce at least two independently routed Intake proposals, both retain the same exact source-file lineage, no source bytes are duplicated, and every resulting Core change still requires individual human approval.

## Verification result — 2026-06-20

- A two-heading document produced two editable document units and two independently named proposed-project routes.
- Both pending Intake proposals retained the same File Version, SHA-256, and managed source path.
- No source bytes were duplicated and Core remained unchanged before individual approval.
- The live desktop renderer reported no exception.
- The complete 34-check regression suite passed after the document and folder flow work.
