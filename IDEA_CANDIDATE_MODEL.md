# Idea Candidate Model v0.1

Date: 2026-06-20  
Status: model storage, fake local validation, and human review UI implemented and verified

## Purpose

An Idea Candidate is an evidence-backed, non-authoritative proposal that a portion of Discovery material expresses a distinct idea worth human review. It is not a project, fact, decision, route, or Core record.

The model is designed for documents hundreds of pages long. File names and document titles may be retained as metadata, but they cannot be the primary basis for identifying or naming ideas.

The governing progression is:

`Exact source → Stable chunks → Analysis coverage → Idea Candidates → Human review → Confirmed Idea Units → Project/routing suggestions → Intake → Individual approval → Core`

## Four separate objects

### 1. Idea Analysis Run

Records what material was actually examined. This prevents a partial API request from being represented as analysis of an entire document.

Required concepts:

- stable run ID, Discovery Case ID, actor/tool identity, method, and timestamps;
- exact File Versions and source SHA-256 values in scope;
- expected, analyzed, skipped, blocked, and failed chunk IDs/counts;
- coverage status: `complete`, `partial`, `failed`, or `cancelled`;
- continuation cursor and parent run when work is paged or resumed;
- deterministic tool or AI provider/model provenance;
- privacy/transmission receipt references when content left the device;
- candidate IDs produced by the run.

Coverage is a statement about processing, not truth. A run may be complete even if it reports no candidates.

### 2. Idea Candidate

An immutable suggestion produced by a human, deterministic tool, AI provider, or hybrid process.

Required fields:

- `id`, `schemaVersion`, `analysisRunId`, and `discoveryCaseId`;
- creator actor ID/type and creation timestamp;
- `method`: `human`, `deterministic`, `ai`, or `hybrid`;
- working label and neutral summary;
- candidate type and scope;
- one or more exact Evidence References;
- confidence score, confidence basis, and uncertainty notes;
- optional key terms, candidate relationships, and clarification questions;
- provenance identifying the tool, provider, model, request, and prompt/template version where applicable.

The working label describes the idea. It is not a project name. Project matching and project-name suggestions occur only after human review produces Confirmed Idea Units.

Candidate types:

- `project_concept`
- `design_concept`
- `requirement`
- `decision_candidate`
- `question`
- `risk`
- `task`
- `reference`
- `observation`
- `claim_candidate`
- `relationship_candidate`
- `other`
- `unknown`

Candidate scope:

- `standalone`
- `supporting`
- `cross_cutting`
- `unknown`

### 3. Idea Review Decision

An append-only human record describing what happened to one or more candidates.

Review actions:

- `accept`
- `reject`
- `defer`
- `rename`
- `correct_summary`
- `merge`
- `split`
- `mark_duplicate`
- `mark_uncertain`

Every decision records the human actor, timestamp, reason, source candidate IDs, resulting Confirmed Idea Unit IDs where applicable, and the decision it supersedes when correcting an earlier review.

AI and tools may propose review actions but cannot create an Idea Review Decision.

### 4. Confirmed Idea Unit

A human-confirmed Discovery object produced from review. It is still not Core and carries no automatic project authority.

Required concepts:

- stable unit ID and Discovery Case ID;
- human-confirmed title and summary;
- source candidate IDs;
- the union of retained Evidence References;
- confirmation actor, timestamp, and reason;
- unresolved uncertainty and open clarification questions;
- optional relationships to other Confirmed Idea Units.

Only Confirmed Idea Units become eligible for project matching, project-name suggestions, and routing review.

## Evidence Reference

Every Idea Candidate must contain at least one Evidence Reference. An evidence reference identifies exact source material without embedding a large document copy.

Required:

- File Asset ID;
- immutable File Version ID;
- source SHA-256;
- Discovery Extraction ID;
- Discovery Chunk ID and chunk text SHA-256 when text chunks exist;
- relationship to the candidate: `supports`, `mentions`, `contrasts`, `limits`, `depends_on`, or `context_only`.

Locators may include:

- page start/end;
- line start/end;
- character start/end within the chunk;
- heading path;
- table, row, column, sheet, slide, image, or timestamp coordinates;
- a bounded display excerpt and its hash.

The system must verify that referenced File Versions belong to the Discovery Case and that chunk/extraction checksums still match before displaying evidence as exact.

## Relationships

Candidate relationships remain suggestions until human review. Supported relationship types are:

- `related_to`
- `overlaps`
- `duplicate_of`
- `parent_of`
- `child_of`
- `supports`
- `contradicts`
- `depends_on`
- `limits`

Every relationship identifies its target candidate, confidence, evidence references, and provenance. A relationship cannot silently merge candidates.

## Confidence and uncertainty

Confidence is about the analysis claim that the candidate is distinct and accurately summarized. It is not confidence that the idea is true, feasible, approved, or a project.

- Score range: `0.0` through `1.0`.
- Basis: short explanation of the signals used.
- Uncertainty notes: ambiguity, missing context, partial coverage, conflicting evidence, or boundary uncertainty.
- Human review may disagree without rewriting the original candidate.

## Large-document behavior

- Analysis runs operate on stable chunks and may be paged or resumed.
- Every run reports exact coverage and omissions.
- Candidate discovery may happen in passes: local chunk candidates, cross-chunk consolidation, then human review.
- Cross-document consolidation must retain every source Evidence Reference.
- Candidate limits cause continuation, never silent truncation.
- Re-running analysis creates another run and candidates; it does not overwrite earlier suggestions.
- Duplicate/overlap suggestions may reduce review burden but never remove evidence or decide a merge.

## AI Analysis Arm boundary

An AI arm may:

- receive only content allowed by the case privacy policy;
- analyze bounded chunks;
- propose candidates, relationships, clarification questions, and confidence;
- return provider-generated client IDs for idempotent ingestion;
- report partial processing and continuation.

An AI arm may not:

- claim it analyzed chunks it did not receive;
- create or alter File Assets, File Versions, extractions, or chunks;
- create human review decisions or Confirmed Idea Units;
- choose or confirm projects, routes, Intake approval, or Core state;
- set human actor IDs, confirmation timestamps, or approval fields;
- omit evidence for a candidate;
- place credentials, hidden prompts, or unrestricted source text into stored candidate records.

Project State assigns durable IDs, validates evidence membership/checksums, records transmission scope, and appends the provider response as non-authoritative provenance.

## Initial limits

- working label: 200 characters;
- neutral summary: 2,000 characters;
- uncertainty notes: 2,000 characters;
- key terms: 32;
- evidence references per candidate: 50;
- relationships per candidate: 50;
- clarification questions per candidate: 20;
- bounded evidence excerpt: 500 characters;
- candidates per response page: 100, with continuation required beyond the limit.

These are transport and review limits, not document-size limits.

## Acceptance gate

The model is ready for AI Analysis Arm design when the machine-readable contract and example prove:

1. candidates cannot exist without exact evidence;
2. analysis coverage cannot imply unprocessed chunks were examined;
3. candidate labels are not project names;
4. human review is a separate append-only object;
5. Confirmed Idea Units remain Discovery objects until later routing and Intake approval;
6. provider/model replacement does not change the durable Project State format.

## Foundation verification — 2026-06-20

- Exact-chunk fake analysis produced evidence-backed candidates without external transmission.
- The user-facing review displays working label, neutral summary, confidence, uncertainty, evidence, and provider/model provenance.
- Human review supports separate acceptance, merge, rejection, deferral, and unresolved status.
- Confirmed Idea Units replace file-title suggestions as the input to project naming and routing after review.
- The isolated live flow created a candidate, human review, Confirmed Idea Unit, and pending Intake proposal with zero renderer exceptions and no Core authority.
- All 38 non-live regression checks and renderer/desktop syntax checks passed.
