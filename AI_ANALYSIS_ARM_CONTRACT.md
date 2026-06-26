# AI Analysis Arm Contract v0.1

Date: 2026-06-20  
Status: contract and fake local validation arm implemented; optional Qwen3 8B local-provider plumbing added

## Purpose

This contract defines how a replaceable AI Analysis Arm may examine explicitly authorized Discovery chunks and return evidence-backed Idea Candidate suggestions.

It is an analysis-suggestion contract. It is not a file-access API, project-naming API, routing API, Intake API, approval API, Core write API, or permission to transmit arbitrary Project State content.

The durable output format is Project State's `IDEA_CANDIDATE_MODEL.md`. Provider-specific response shapes must be normalized and validated at this boundary.

## Position in the flow

`Exact source → Deterministic extraction → Stable chunks → Human privacy authorization → AI Analysis Arm → Validated Idea Candidates → Human idea review`

AI analysis occurs before project matching and project naming. Version 0.1 does not ask the provider to name projects or choose routes.

## Logical operations

```text
describeCapabilities()
submitAnalysisBatch(envelope)
getAnalysisStatus(requestId)
getResultPage(requestId, cursor)
cancelAnalysis(requestId)
getReceipt(requestId)
```

The logical contract does not require a particular network protocol. A future connector may call a cloud API, local model runtime, or Aether implementation while preserving the same Project State envelope, validation, and authority boundary.

## Capability discovery

An arm describes:

- arm ID, version, provider ID, and local or remote execution;
- supported contract versions, modalities, languages, and candidate types;
- whether structured output, candidate relationships, clarification questions, continuation, cancellation, and usage reporting are supported;
- maximum request bytes, chunks, context size, and candidates per result page;
- model choices and the resolved model identifier returned after execution;
- declared retention policy, data region where known, and whether provider training use is disabled or configurable;
- expected token/cost estimation support.

Capability declarations are provider claims recorded for user review. They are not Project State security guarantees.

## Submission envelope

Every batch contains:

- exact contract version;
- stable request ID and idempotency key;
- submission timestamp and arm identity;
- Project State Idea Analysis Run ID and Discovery Case ID;
- fixed purpose `idea_candidate_discovery`;
- human privacy authorization record ID and authorized transmission scope;
- batch ID, batch index, and final-batch indicator;
- one or more bounded chunks;
- requested candidate types, language, limits, relationship/question flags;
- provenance identifying the Project State contract and analysis strategy.

Every transmitted chunk contains:

- Discovery Chunk ID;
- Discovery Extraction ID;
- immutable File Version ID and source SHA-256;
- chunk text SHA-256;
- bounded text or supported modality payload;
- optional source locator metadata;
- redaction state.

Project State must verify the current extraction and chunk checksums before transmission. Arms never receive managed paths, original local paths, database paths, storage roots, user credentials, API secrets, unrelated actor records, or arbitrary Core data.

## Privacy and transmission

Transmission requires an explicit Project State authorization record compatible with the case privacy class.

- `local_only`, `personal`, `confidential`, and `restricted` content is not transmitted merely because an arm is configured.
- `provider_allowed` means eligible for a configured policy decision, not automatic consent for every provider or purpose.
- Authorization records identify human actor, provider/arm, purpose, exact chunk IDs/hashes, redaction mode, timestamp, and optional expiry.
- Project State records a transmission receipt containing what was sent—not API credentials or unrestricted content.
- Cancellation stops future transmission where possible but cannot claim that already transmitted content was never received.

## Response and coverage

The arm response contains:

- request/idempotency identity and external job ID;
- job status and completion timestamp;
- resolved provider and model identity;
- exact received, analyzed, skipped, and failed chunk IDs with hashes;
- partial/complete coverage and continuation cursor;
- zero or more provider candidate suggestions;
- usage and cost information when available;
- provider retention declaration/reference;
- stable error codes when unsuccessful.

Every candidate uses a provider-generated `clientCandidateId`. Project State assigns durable Idea Candidate IDs only after validation.

Evidence may reference only chunks included in the authorized request. Project State rejects the result page if it:

- cites an unknown or mismatched chunk/File Version/checksum;
- omits evidence for a candidate;
- claims coverage for a chunk that was not transmitted;
- includes forbidden authority fields;
- exceeds declared limits without continuation; or
- returns malformed confidence, type, scope, relationship, or question data.

Invalid results create no Idea Candidates. The raw failure and bounded diagnostic metadata may be recorded as a processing Interaction/Event without treating provider content as truth.

## Candidate result fields

Provider candidate suggestions may include:

- client candidate ID;
- working label and neutral summary;
- candidate type and scope;
- key terms;
- exact Evidence References;
- confidence score, basis, and uncertainty notes;
- suggested candidate relationships;
- clarification questions.

They may not include project names, project IDs, confirmed routes, review decisions, Confirmed Idea Unit IDs, Intake workflow state, approval fields, Core IDs, human authority, credentials, hidden prompts, or direct storage paths.

## Large-document continuation

- Project State divides large material into bounded, stable chunk batches.
- Every batch has its own exact scope and idempotency key under one Idea Analysis Run.
- Result pages are capped at 100 candidates and use opaque continuation cursors.
- The arm reports coverage for each response page and the overall external job where supported.
- Project State may run a later cross-batch consolidation pass using candidate summaries and exact evidence references.
- Consolidation may suggest overlap, duplication, or relationships but cannot merge, delete, accept, or reject candidates.
- Missing batches, rate limits, cancellation, and provider failures produce partial coverage, never a false complete state.

## Idempotency and retries

- An exact request retry returns the retained job/receipt and creates no duplicate durable candidates.
- Reusing an idempotency key with different canonical content is rejected.
- Retrying a failed or partial batch uses either the same exact envelope or a new request linked through `retryOfRequestId`.
- Project State deduplicates candidate ingestion by arm ID, request ID, result page, and client candidate ID.
- A result page is persisted atomically: either every valid candidate mapping and receipt is recorded or none are.

## Usage, spending, and retention

- Arms report token, request, duration, and provider-reported cost data when available.
- Estimates and final usage are labeled separately.
- Project State may enforce per-request, per-run, or user-configured spending limits before transmission.
- `BUDGET_EXCEEDED` stops new requests without changing already retained candidates.
- Provider retention policy IDs and deletion times are recorded when available; Project State does not claim provider deletion it cannot verify.

## Credentials

- End users supply provider credentials unless a future deployment explicitly supplies a managed provider.
- Credentials are encrypted in machine-local integration storage.
- Credentials are excluded from Project State backups, exports, Intake, candidates, prompts stored as provenance, logs, errors, receipts, and history.
- The arm receives credentials only through its connector at call time.
- Removing a provider revokes future use without deleting prior Project State provenance or candidates.

## Authority boundary

An AI Analysis Arm may:

- analyze explicitly authorized bounded chunks;
- propose Idea Candidates, evidence, relationships, questions, confidence, and uncertainty;
- report partial coverage, continuation, usage, cost, and errors.

It may not:

- read files, folders, SQLite, managed storage, or Core directly;
- stage files or create/change File Assets, File Versions, extractions, or chunks;
- create human privacy authorization;
- create Idea Review Decisions or Confirmed Idea Units;
- name projects or choose/confirm routing in v0.1;
- create Intake items directly;
- approve Intake or write Core/history;
- impersonate a human actor;
- silently omit unprocessed content or unsupported results.

## Job states

- `accepted`
- `queued`
- `running`
- `partial`
- `complete`
- `failed`
- `cancel_requested`
- `cancelled`

`accepted`, `queued`, or `running` does not mean content was analyzed. Only validated coverage records identify analyzed chunks.

## Error codes

- `UNSUPPORTED_CONTRACT_VERSION`
- `INVALID_ENVELOPE`
- `INVALID_ARM`
- `INVALID_PURPOSE`
- `PRIVACY_AUTHORIZATION_REQUIRED`
- `PRIVACY_SCOPE_MISMATCH`
- `CHUNK_NOT_FOUND`
- `CHUNK_CHECKSUM_MISMATCH`
- `PAYLOAD_TOO_LARGE`
- `CANDIDATE_LIMIT_EXCEEDED`
- `FORBIDDEN_FIELD`
- `INVALID_EVIDENCE`
- `INVALID_COVERAGE`
- `IDEMPOTENCY_CONFLICT`
- `BUDGET_EXCEEDED`
- `RATE_LIMITED`
- `PROVIDER_UNAVAILABLE`
- `PROVIDER_RESPONSE_INVALID`
- `CANCELLED`
- `PERSISTENCE_FAILED`

## Implementation order

1. Add additive storage for analysis runs, privacy authorizations, transmission receipts, candidate records, reviews, and confirmed units.
2. Implement local contract validation and result ingestion without calling a provider.
3. Build a fake/local fixture arm to exercise batching, continuation, evidence rejection, idempotency, and cancellation.
4. Add encrypted user-supplied credential configuration.
5. Integrate one real provider behind the same contract.
6. Pilot a large document with spending limits, backup/restore, provider replacement, and human idea review.

No provider integration should begin before steps 1 through 3 pass.

## Optional local provider plumbing — Qwen3 8B

Project State may use Qwen3 8B through a local Ollama runtime as an optional local AI provider. This provider remains inside the AI Analysis Arm boundary:

- it receives only exact Discovery chunks covered by a human authorization record;
- it runs as `executionLocation: local`;
- it records provider/model provenance and a local transmission receipt;
- it creates only non-authoritative Idea Candidates;
- it cannot create Confirmed Idea Units, routing confirmations, Intake approval, Core records, or Change History;
- it does not change the later human Idea Review, routing, Intake, or Core approval steps.

If Qwen3 8B is not installed, Project State keeps the deterministic fake local arm available for contract and UI testing. Cloud or API-based "deep thinking" providers must use the same authorization, receipt, evidence, and Airlock boundary, but will require a separate explicit provider-allowed transmission flow.

## Foundation implementation — 2026-06-20

Steps 1 through 3 are implemented and verified:

- eight additive SQLite tables retain runs, human privacy authorization, transmission receipts, jobs, candidates, result receipts, human review decisions, and confirmed units;
- the desktop bridge exposes the complete `analysisArms` logical surface;
- a deterministic fake local arm validates exact authorized chunks, evidence, coverage, idempotency, and result receipts without external transmission;
- machine privacy authorization and machine Idea Review Decisions fail closed;
- tampered chunks and conflicting idempotency reuse are rejected;
- human review can produce evidence-backed Confirmed Idea Units that remain non-Core;
- append-only records, credential exclusion, integrity, backup, and restore passed focused verification.

Cloud credential configuration remains intentionally unimplemented. The first real provider plumbing is local-only Qwen3 8B through Ollama and is optional; it is not an approval path and it does not bypass Airlock.

The human Idea Review surface is also implemented. It clearly labels the installed arm as a local deterministic test fixture, exposes evidence and uncertainty, requires a known human actor and reason, records append-only review decisions, and moves only Confirmed Idea Units into later naming and routing controls.

The complete 38-check regression suite and isolated live Idea Review flow passed. No credential was created and no external provider was contacted.
