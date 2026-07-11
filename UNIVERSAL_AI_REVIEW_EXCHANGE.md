# Universal AI Review Exchange v1.0

Project State can export complete pre-Airlock evidence for review by any AI or human reviewer and import the returned decisions without granting that reviewer authority over Intake or Core.

## Export

From an AI Work Order, choose **Export Universal Review Pack**. Project State writes a ZIP to the managed backup/export folder containing:

- `review_instructions.md` — model-neutral task and authority boundaries.
- `evidence.json` — stable Work Order, Discovery Case, file, extraction, chunk, and known-project IDs plus complete stored chunk text.
- `evidence_readable.md` — the same complete evidence in a readable form.
- `schema/review_result.schema.json` — the required v1.0 return contract.

The pack states that one document may contain multiple ideas, one chunk may support multiple decisions, one piece of evidence may support multiple projects, and headings/thread starts are provenance rather than project boundaries.

A ready-to-open example is included at `fixtures/universal-review-pack-v1.0-sample.zip`. Matching valid and intentionally invalid return examples are `fixtures/review-result-v1.0-valid-sample.json` and `fixtures/review-result-v1.0-invalid-sample.json`.

## External review result

The reviewer returns either a standalone JSON file or a ZIP containing a JSON object with:

- `format: project-state-review-result`
- `format_version: 1.0`
- the exact exported `work_order_id`
- reviewer metadata (provider/model names are optional)
- `source_complete`
- decisions, relationships, human questions, and rejected material

Every decision must use a stable decision ID, a permitted classification, real exported chunk IDs, permitted evidence roles, an explicit confidence value, and the commercial/personal boundary flags. Existing-project support must cite known project IDs. A new-project candidate must explicitly name the proposed new project and cannot disguise an existing project as new.

## Import and validation

Choose **Import External AI Review** on the same AI Work Order. Project State rejects malformed JSON, wrong versions or Work Order IDs, unknown chunk/project IDs, invalid classifications, missing decision fields, implicit new-project creation, and inconsistent references. A failed import writes nothing.

An accepted file becomes an immutable, append-only **External Review Pass**. The exact original file, SHA-256 hash, import actor, reason, time, reviewer metadata, and external-transmission status are preserved. Importing the same bytes again reuses the existing pass; a corrected file is stored as the next pass rather than overwriting history.

Import never changes source files, extracted text, chunks, local Candidate Map entries, Intake, or Core.

## Human review

Choose **Review Imported Decisions** to inspect decisions grouped by classification. The screen shows project matches, additional projects, evidence chunk IDs/spans, confidence, reasoning, personal-Aether/commercial boundaries, relationships, and questions.

A human can approve, reject, keep for revision, edit, reclassify, retitle, change primary/additional projects, split, merge, and optionally route an approved decision to Intake. Routing creates a normal pending Intake proposal with the External Review Pass, decision, chunks, and human-review action as provenance. The Intake/Airlock remains the only path to Core authority.

## Verification

Run `pnpm run check:universal-review`. The regression covers complete multi-chunk export, one chunk supporting multiple decisions/projects, mixed personal/commercial material, malformed and mismatched imports, duplicate import safety, corrected-result versioning, append-only storage, and proof that Core/local evidence counts do not change on import.
