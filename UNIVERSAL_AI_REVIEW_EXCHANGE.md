# Universal AI Review Exchange v1.0

Project State performs local extraction, chunking, provisional summaries/entities/matches, and evidence packaging. Any AI or human reviewer may reason over the exported package, but its result remains untrusted Discovery evidence until an owner deliberately routes a reviewed decision through Intake/Airlock.

## Export and package identity

Choose **Export Universal Review Pack** on an AI Work Order whose source is fully indexed. The ZIP contains:

- `review_instructions.md`
- `evidence.json`
- `evidence_readable.md`
- `schema/review_result.schema.json`

Each package has an immutable `package_id`, Work Order and Discovery Case IDs, numbered `pack_revision`, creation time, Project State version, format/protocol versions, and `evidence_sha256`. Project State stores this identity as an append-only export record. A later import must return the exact identity.

`evidence.json` contains every stored source chunk, including chunks that produced no local candidate. Chunk text is complete and ordered. Filenames/headings are provenance only. Local summaries, extracted entities, and local project matches are explicitly provisional. Source/chunk counts and truncation flags make incomplete coverage visible.

`evidence_readable.md` is rendered from the same evidence object, so package identity, the registry, completeness counts, and chunk content cannot follow an independent metadata path.

## Mandatory consolidation protocol

Every package carries one `review_protocol` object and every chunk carries a compact `review_directive`. The protocol is provider/model neutral and requires the reviewer to read the complete package before producing final decisions.

The returned result must first define `concept_clusters`. Clusters collapse exact and near duplicates, merge aliases and alternate names, preserve genuine contradictions, identify umbrella/project/subproject/product/theme/future-idea/reference hierarchy, assign maturity, and retain primary, duplicate, contextual, contradictory, and unresolved chunk IDs. Every final decision must reference a valid `cluster_id`; decisions may not be generated directly from isolated chunks.

`coverage_summary` accounts for the complete exported chunk set through clusters, duplicate groups, contradictions, rejected material, unresolved material, or `unaccounted_chunks`. Counts and IDs are validated against the immutable source package. Duplicate repetition is forbidden from increasing confidence, while every original chunk ID and provenance record remains preserved.

An accurately reported incomplete review may be imported as a non-authoritative pass so it can be corrected. When `unaccounted_chunks` is non-empty, Project State displays a warning and blocks every final human approval/routing action. Only a corrected pass with zero unaccounted chunks can proceed through the normal human-authoritative review path.

Every return must also include `final_self_check`, with seven required booleans confirming full-package concept reconstruction, duplicate-confidence discipline, complete chunk disposition, hierarchy distinctions, contradiction preservation, human-readable reasoning, and cluster-derived decisions. False values are preserved exactly and mark the pass incomplete; Project State never converts them to true. An incomplete self-check may be saved/imported for correction, but UI and bridge gates block final approval and project creation. A claim that `all_chunks_accounted_for` is true while `coverage_summary.unaccounted_chunks` is non-empty fails validation outright.

## Current Project Registry

The export includes `project_registry`. Every eligible project carries:

- stable `project_id`
- `canonical_name`
- aliases and former names
- short summary
- active, paused, or archived status
- optional parent and project-family relationships

Private, restricted, or explicitly excluded projects are omitted by default. The export bridge permits them only when `includePrivateProjects: true` is deliberately supplied by a trusted export configuration.

Reviewers must prefer a registry match, return the exact ID and canonical-name snapshot, and recognize that an alias or different wording is not a new project.

## Proposed new projects

When no registry entry adequately matches, a `project_candidate` must include the strict `proposed_new_project` structure: suggested name/aliases, summary, evidence chunks, distinctness reason, related existing IDs, optional parent/family, and confidence.

Importing or approving an External Review Pass never creates the project. The owner can rename it, change its parent/family, and route it to Intake as a proposed project. Normal Airlock approval is still required.

## Simple import

The AI Work Orders screen has one **Import Reviewed Evidence** action. First choose the Review Exchange folder where the returned result should be kept, then paste the complete returned JSON into the note-style import window. Project State reads `package_id`, recovers the original export base name, saves the paste as that export's `.review-result.json` file, automatically locates the source Work Order and Discovery Case, and validates against the stored export record. The chosen-folder copy remains human-controlled while an exact immutable internal copy preserves review history.

Validation failures remain editable in the same notebook window. The owner can continue editing, copy or paste with visible mouse controls, add an exact-evidence span template, save the current text without importing it, or close/cancel through the normal session-draft discard guard. **Save anyway** creates an explicitly unvalidated return file and never creates an External Review Pass.

First-run setup and Settings keep separate **Outgoing Review Packs** and **Incoming Reviewed Results** folders. In automatic mode, completed unknown-material AI Work Orders that are not fully accounted for by known-project matches create one Universal Review Pack in the outgoing folder. Import opens the JSON notebook-style paste window immediately and saves the return in the configured incoming folder. Ask-each-time and configure-later modes remain available.

Import rejects unsupported format/schema versions, identity/hash/revision mismatches, invented chunks/projects, canonical-name snapshot mismatches, inexact evidence excerpts, invalid roles/classifications/confidence, implicit new projects, unknown fields in strict protocol objects, and executable/direct-Core instruction fields. Failure displays one readable report and writes nothing.

Successful import preserves the exact original bytes, file hash/name, time, actor/reason, transmission status, reviewer metadata, source package identity, and validation result in an immutable External Review Pass. Exact duplicate bytes deduplicate; corrected bytes become another numbered pass.

## Discovery review and history

Imported decisions are grouped as Existing Project Support, Proposed New Projects, Cross-Project Evidence, Reference Material, Personal Context, Assistant Scaffolding/Noise, Rejected Material, relationships, and human questions.

Each decision shows its source cluster, canonical project name/ID, source filenames, chunk IDs, exact excerpts, summary, confidence, reasoning, and Candidate Map disagreement. The owner may approve/reject/revise, edit, reclassify, choose one known-project destination, split, or rename a proposed project. Merge and normal Airlock routing occur later at the project level.

Every human action is an append-only `external_review_actions` record with actor, reason, time, edits, operation, routing result, and final disposition. Export packages, imported passes, human actions, extraction evidence, local candidates, and Candidate Map records never overwrite one another.

## Examples and verification

- Sample package: `fixtures/universal-review-pack-v1.0-sample.zip`
- Valid reviewed result: `fixtures/review-result-v1.0-valid-sample.json`
- Invalid reviewed result: `fixtures/review-result-v1.0-invalid-sample.json`
- Schemas: `fixtures/review-pack-v1.0.schema.json` and `fixtures/review-result-v1.0.schema.json`

Run `pnpm run check:universal-review`. It covers registry JSON/Markdown synchronization, alias/canonical matching, privacy exclusion, complete evidence, package identity, automatic matching, mixed decisions, multi-project chunks, explicit non-authoritative project proposals, mismatch rejection, immutable pass/action history, and zero Core mutation.
## Provisional concept profiles

Every exported evidence chunk includes a conservative synthesized `provisional_concept_profile` in JSON and a matching compact block in readable Markdown. It combines chunk text, local summaries, entities, provisional project matches, and current registry context without replacing those raw arrays. The raw arrays remain visible immediately below the profile as supporting signals. The profile includes relationship and overall synthesis reasoning, but remains export guidance only: a starting hypothesis, never a final conclusion. Reviewers must compare the complete package, collapse duplicates, reconstruct concept clusters, and override any provisional field that package-wide evidence contradicts. Repeated chunks with the same provisional profile do not increase confidence. Unreliable local extraction exports explicit unresolved/null values with a human-readable reason instead of blocking the package or inventing precision.
