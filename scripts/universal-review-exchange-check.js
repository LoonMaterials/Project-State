const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge, DATABASE_FILE } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
async function expectRejected(operation, marker) { let caught = null; try { await operation(); } catch (error) { caught = error; } assert(caught && caught.message.includes(marker), `Expected rejection containing: ${marker}`, { actual: caught?.message }); }
async function writeJson(filePath, value) { await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf8"); return filePath; }
function coreCounts(dbPath) { const db = new DatabaseSync(dbPath); try { return Object.fromEntries(["projects", "decisions", "facts", "open_questions", "next_actions", "relationships", "sources", "intake_items", "idea_candidates", "confirmed_idea_units"].map((table) => [table, Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)])); } finally { db.close(); } }
function storedZipEntries(bytes) {
  const entries = new Map(); let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18); const nameLength = bytes.readUInt16LE(offset + 26); const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.slice(offset + 30, offset + 30 + nameLength).toString("utf8"); const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(start, start + size)); offset = start + size;
  }
  return entries;
}
function projectMatch(id, name) { return { project_id: id, canonical_name: name }; }

async function main() {
  const ROOT = path.join(__dirname, "..");
  const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const resultSchemaSource = fs.readFileSync(path.join(ROOT, "fixtures", "review-result-v1.0.schema.json"), "utf8");
  for (const marker of ["Export Universal Review Pack", "Import Reviewed Evidence", "Review Imported Decisions", "Loading human review", "targetProjectId", "split_secondary", "Choose Outgoing Review Packs Folder", "shouldRouteToIntake"]) assert(appSource.includes(marker), `Human review UI missing marker: ${marker}`);
  for (const marker of ["Choose Incoming Reviewed Results Folder", "Paste Reviewed Evidence JSON", "reviewJson", "importPastedExternalReview", ".review-result.json"]) assert(appSource.includes(marker), `Pasted-review import UI missing marker: ${marker}`);
  for (const marker of ["Continue editing", "Save anyway", "data-review-json-tool=\"copy\"", "data-review-json-tool=\"paste\"", "Add exact evidence", "PASTE_EXACT_CHUNK_ID", "Validation needs attention"]) assert(appSource.includes(marker), `Recoverable review notebook missing marker: ${marker}`);
  for (const marker of ["reviewExchangeOutgoingFolder", "reviewExchangeIncomingFolder", "data-settings-review-exchange", "workOrderNeedsAutomaticReviewPack", "automatic-universal-review-export"]) assert(appSource.includes(marker), `Automatic Review Exchange setup missing marker: ${marker}`);
  for (const removedMarker of ['name="additionalProjectIds"', 'value="merge">', 'name="routeToIntake"']) assert(!appSource.includes(removedMarker), `Removed review control is still active: ${removedMarker}`);
  assert(!appSource.includes('data-action="export-chatgpt-review-pack"'), "Provider-specific review export remains in the active UI.");
  assert((appSource.match(/data-action="import-reviewed-evidence"/g) || []).length === 1 && !appSource.includes('data-action="import-external-ai-review"'), "Import Reviewed Evidence is not a single automatic-matching Discovery action.");
  assert(!/chatgpt|qwen|ollama/i.test(resultSchemaSource), "Universal result schema contains a provider-specific dependency.");
  assert((resultSchemaSource.match(/"additionalProperties": false/g) || []).length >= 8, "Important result schema objects are not strict.");

  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-universal-review-"));
  const inputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-universal-review-input-"));
  const exchangeRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-universal-review-exchange-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const sourcePath = path.join(inputRoot, "mixed-project-evidence.md");
  const sourceText = Array.from({ length: 16 }, (_, index) => [`## Shared validation ${index + 1}`, "The Alpha Device alias and Beta Project use the same sensor validation procedure.", "A private household continuity note is personal context, not a commercial default.", "A distinct lunar calibration jig may be a separate buildable project."].join("\n")).join("\n\n");
  await fsp.writeFile(sourcePath, sourceText, "utf8");
  await bridge.storage.saveStore({ store: { schemaVersion: "0.1.0", settings: {}, actors: [{ id: "actor_owner", name: "Owner", type: "Human", role: "owner", status: "active" }], intakeItems: [], aiWorkOrders: [], projects: [
    { id: "project_alpha", name: "Alpha Project", aliases: ["Alpha Device"], formerNames: ["Alpha Prototype"], currentSummary: "Primary sensor system", healthFlag: "active", archived: false },
    { id: "project_beta", name: "Beta Project", aliases: ["Beta"], currentSummary: "Related validation platform", archived: true, parentProjectId: "project_alpha", projectFamily: "Sensor Family" },
    { id: "project_gibm", name: "GIBM", aliases: ["Generalized Inertial Boundary Model"], formerNames: ["G Model"], currentSummary: "Known physics framework and test program", status: "paused", archived: false, projectFamily: "Physics" },
    { id: "project_private", name: "Private Project", currentSummary: "Must not leave local registry", private: true, archived: false }
  ] }, manifest: {} });
  const staged = await bridge.discoveryStorage.stageTrustedFile({ path: sourcePath, actorId: "actor_owner", reason: "Universal exchange fixture", externalSecurityAcknowledged: true });
  const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: staged.discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "deterministic_extractor", chunkCharacters: 700 });
  assert(extracted.chunks.length > 2, "Fixture did not create multiple stable chunks.", extracted);
  const workOrder = { id: "ai_work_order_universal_001", title: "Universal review fixture", task: "Classify all evidence", status: "completed", source: { discoveryCaseId: staged.discoveryCaseId }, lastAnalysis: { sourceFullyAnalyzed: true, totalDetectedChunks: extracted.chunks.length }, candidateMap: { entries: [{ id: "candidate_registry_filter", title: "Alpha support", evidence: [{ discoveryChunkId: extracted.chunks[0].id }], knownProjectMatches: [{ projectId: "project_alpha", name: "Stale Alpha Label", confidence: 0.91 }, { projectId: "known_anchor_aether", name: "Aether", confidence: 0.82 }, { projectId: "known_anchor_patents_lmc", name: "Patents / LMC", confidence: 0.78 }] }] } };
  const knownProjects = [
    { id: "project_alpha", name: "Alpha Project", aliases: ["Alpha Device"], formerNames: ["Alpha Prototype"], currentSummary: "Primary sensor system", status: "active" },
    { id: "project_beta", name: "Beta Project", aliases: ["Beta"], currentSummary: "Related validation platform", archived: true, parentProjectId: "project_alpha", projectFamily: "Sensor Family" },
    { id: "project_private", name: "Private Project", currentSummary: "Must not be exported", private: true }
  ];
  const exported = await bridge.reviewExchange.exportUniversalPack({ workOrder, knownProjects: [], exportedAt: "2026-07-11T12:00:00.000Z", outputDirectory: exchangeRoot });
  assert(path.dirname(exported.path) === exchangeRoot, "Review pack was not stored in the chosen exchange folder.", exported);
  const zipEntries = storedZipEntries(await fsp.readFile(exported.path));
  for (const name of ["review_instructions.md", "evidence.json", "evidence_readable.md", "schema/review_result.schema.json"]) assert(zipEntries.has(name), `Export ZIP is missing ${name}.`);
  const evidence = JSON.parse(zipEntries.get("evidence.json").toString("utf8"));
  const readable = zipEntries.get("evidence_readable.md").toString("utf8");
  assert(evidence.project_registry.length === 3 && !evidence.project_registry.some((project) => project.project_id === "project_private"), "Current eligible DB projects were not exported or a private project leaked into the registry.", evidence.project_registry);
  const alphaSnapshot = evidence.project_registry.find((project) => project.project_id === "project_alpha");
  const betaSnapshot = evidence.project_registry.find((project) => project.project_id === "project_beta");
  const gibmSnapshot = evidence.project_registry.find((project) => project.project_id === "project_gibm");
  assert(alphaSnapshot.canonical_name === "Alpha Project" && alphaSnapshot.aliases.includes("Alpha Device") && alphaSnapshot.former_names.includes("Alpha Prototype"), "Canonical project registry lost names or aliases.", alphaSnapshot);
  assert(betaSnapshot.status === "archived" && betaSnapshot.parent_project_id === "project_alpha" && betaSnapshot.project_family === "Sensor Family", "Canonical project registry lost hierarchy/status.", betaSnapshot);
  assert(gibmSnapshot?.canonical_name === "GIBM" && gibmSnapshot.status === "paused" && gibmSnapshot.aliases.includes("Generalized Inertial Boundary Model"), "Known GIBM project was not recovered from the current Project State project list.", gibmSnapshot);
  assert(readable.includes("## Current Project Registry") && readable.includes(evidence.package_id) && readable.includes(evidence.evidence_sha256) && readable.includes("Alpha Project") && readable.includes("Beta Project"), "Readable Markdown drifted from evidence.json identity or registry.");
  assert(readable.includes(`\`${gibmSnapshot.project_id}\` — **${gibmSnapshot.canonical_name}**`), "GIBM ID and canonical name are not identical in JSON and Markdown exports.", { gibmSnapshot });
  assert(evidence.chunks.length === extracted.chunks.length && evidence.chunks.every((chunk) => chunk.complete_text && chunk.provisional_entities.every((entity) => entity.provisional === true)), "Complete chunks or provisional labels are missing.");
  const chunksMissingProfiles = evidence.chunks.filter((chunk) => !chunk.provisional_concept_profile || chunk.provisional_concept_profile.reviewer_may_override !== true || !Number.isInteger(chunk.provisional_concept_profile.estimated_concept_count) || typeof chunk.provisional_concept_profile.profile_confidence !== "number" || typeof chunk.provisional_concept_profile.synthesis_reasoning_summary !== "string" || !chunk.provisional_concept_profile.likely_relationships.every((item) => typeof item.reasoning_summary === "string"));
  assert(chunksMissingProfiles.length === 0, "Exported evidence.json omitted provisional_concept_profile from one or more chunks.", { missingChunkIds: chunksMissingProfiles.map((chunk) => chunk.chunk_id) });
  assert(evidence.chunks.every((chunk) => Array.isArray(chunk.provisional_local_summaries) && Array.isArray(chunk.provisional_entities) && Array.isArray(chunk.provisional_project_matches)), "Raw provisional extraction arrays were not preserved.");
  const exportedRegistryIds = new Set(evidence.project_registry.map((project) => project.project_id));
  assert(evidence.chunks.every((chunk) => chunk.provisional_project_matches.every((match) => exportedRegistryIds.has(match.project_id))), "A provisional project match references an ID absent from project_registry.", evidence.chunks.flatMap((chunk) => chunk.provisional_project_matches));
  const normalizedAlphaMatch = evidence.chunks.flatMap((chunk) => chunk.provisional_project_matches).find((match) => match.project_id === "project_alpha");
  assert(normalizedAlphaMatch?.canonical_name === "Alpha Project", "A valid provisional match did not use the exact registry canonical name.", normalizedAlphaMatch);
  assert(!JSON.stringify(evidence.chunks).includes("known_anchor_aether") && !JSON.stringify(evidence.chunks).includes("known_anchor_patents_lmc"), "Non-registry anchor IDs leaked into exported provisional matches.");
  const unresolvedAnchorTargets = evidence.chunks.flatMap((chunk) => chunk.provisional_concept_profile.likely_relationships).filter((item) => item.relationship_type === "unresolved").map((item) => item.target_name);
  assert(unresolvedAnchorTargets.includes("Aether") && unresolvedAnchorTargets.includes("Patents / LMC"), "Non-registry anchors were dropped instead of retained as unresolved textual relationships.", unresolvedAnchorTargets);
  for (const chunk of evidence.chunks) {
    const keys = Object.keys(chunk);
    assert(keys.indexOf("provisional_concept_profile") < keys.indexOf("provisional_local_summaries") && keys.indexOf("provisional_concept_profile") < keys.indexOf("provisional_entities") && keys.indexOf("provisional_concept_profile") < keys.indexOf("provisional_project_matches"), "Synthesized profile is not positioned above raw extraction arrays in evidence.json.");
  }
  const markdownProfileCount = (readable.match(/\*\*Provisional concept profile\*\*/g) || []).length;
  assert(markdownProfileCount === evidence.chunks.length, "Exported evidence_readable.md does not contain exactly one provisional concept profile block per chunk.", { expected: evidence.chunks.length, actual: markdownProfileCount });
  assert(readable.includes("Reviewer may override: yes") && readable.includes("Synthesis reasoning:") && readable.includes("Raw provisional extraction signals") && readable.indexOf("Provisional concept profile") < readable.indexOf("Raw provisional extraction signals"), "Readable Markdown is missing or misordering synthesized and raw provisional evidence.");
  assert(evidence.review_protocol.decision_source === "concept_clusters" && evidence.review_protocol.human_authoritative === true && evidence.review_protocol.duplicate_repetition_increases_confidence === false && evidence.review_protocol.final_self_check_required === true, "Mandatory package consolidation protocol is missing.", evidence.review_protocol);
  assert(evidence.chunks.every((chunk) => chunk.review_directive?.action === "cluster_before_decision" && chunk.review_directive.review_in_isolation === false && chunk.review_directive.compare_against_all_chunks === true && chunk.review_directive.cluster_before_decision === true && chunk.review_directive.may_be_duplicate === true && chunk.review_directive.may_support_multiple_concepts === true && chunk.review_directive.must_receive_final_disposition === true && chunk.review_directive.preserve_chunk_id_and_provenance === true && chunk.review_directive.duplicate_repetition_increases_confidence === false), "A chunk lost its compact consolidation directive.");
  assert(evidence.chunk_counts.exported === evidence.chunks.length && evidence.chunk_counts.omitted === 0 && evidence.source_counts.truncated === 0, "Completeness counts are inconsistent.", evidence);
  const instructions = zipEntries.get("review_instructions.md").toString("utf8");
  for (const marker of ["Read the complete package", "First create concept_clusters", "Generate decisions from concept_clusters only", "synthesized starting hypothesis", "supporting extraction signals only", "package-wide clustering", "package-wide concept reconstruction", "override every profile field", "Compare every chunk against every other chunk", "Collapse exact and near duplicates before using estimated concept counts", "must not increase confidence", "complete final_self_check", "Prefer matching evidence", "exact project_id and canonical_name", "alias", "never invent a chunk ID or existing project ID"]) assert(instructions.includes(marker), `Matching instruction missing: ${marker}`);

  const chunkA = extracted.chunks[0].id; const chunkB = extracted.chunks[1].id;
  const chunkAText = (await bridge.discoveryStorage.readChunkText({ discoveryChunkId: chunkA })).text;
  const chunkBText = (await bridge.discoveryStorage.readChunkText({ discoveryChunkId: chunkB })).text;
  const baseResult = {
    format: "project-state-review-result", format_version: "1.0", package_id: evidence.package_id, work_order_id: evidence.work_order_id, discovery_case_id: evidence.discovery_case_id, pack_revision: evidence.pack_revision, evidence_sha256: evidence.evidence_sha256,
    reviewer: { reviewer_type: "ai", provider: "optional", model: "optional", reviewed_at: "2026-07-11T12:10:00.000Z" }, source_complete: true,
    concept_clusters: [{ cluster_id: "cluster_shared_fixture", concept_title: "Consolidated fixture concepts", summary: "The complete package is consolidated before decisions.", aliases: ["Fixture cluster"], hierarchy_type: "umbrella", parent_cluster_id: null, maturity: "forming", primary_chunk_ids: extracted.chunks.map((chunk) => chunk.id), duplicate_chunk_ids: [], contextual_chunk_ids: [], contradictory_chunk_ids: [], unresolved_chunk_ids: [], confidence: 0.86, confidence_basis: "Confidence reflects substantive evidence, not repeated duplicate text." }],
    coverage_summary: { exported_chunk_count: extracted.chunks.length, accounted_chunk_count: extracted.chunks.length, complete_package_read: true, decisions_generated_from_clusters: true, duplicate_repetition_increased_confidence: false, duplicate_groups: [], contradiction_chunk_ids: [], rejected_chunk_ids: [], unresolved_chunk_ids: [], unaccounted_chunks: [] },
    final_self_check: { concepts_reconstructed: true, duplicates_did_not_inflate_confidence: true, all_chunks_accounted_for: true, hierarchy_distinguished: true, contradictions_preserved: true, recommendations_explained: true, decisions_generated_from_clusters: true },
    decisions: [
      { decision_id: "decision_alias_match", cluster_id: "cluster_shared_fixture", concept_title: "Alpha Device shared validation", classification: "existing_project_support", primary_project: projectMatch("project_alpha", "Alpha Project"), additional_projects: [projectMatch("project_beta", "Beta Project")], summary: "Alias resolves to Alpha Project and the same chunk supports Beta.", supporting_chunk_ids: [chunkA], evidence_spans: [{ chunk_id: chunkA, start: 0, end: 40, excerpt: chunkAText.slice(0, 40) }], confidence: 0.91, reasoning_summary: "The alias maps to the exported canonical Alpha Project snapshot.", evidence_role: "validation_or_test_support", personal_aether_support: false, commercial_default_allowed: true, requires_separate_design_review: false, human_review_required: true },
      { decision_id: "decision_personal", cluster_id: "cluster_shared_fixture", concept_title: "Private continuity context", classification: "personal_context_note", primary_project: null, additional_projects: [], summary: "Personal context remains separate from commercial defaults.", supporting_chunk_ids: [chunkA, chunkB], evidence_spans: [{ chunk_id: chunkB, start: 0, end: 25, excerpt: chunkBText.slice(0, 25) }], confidence: 0.82, reasoning_summary: "The material explicitly describes personal context.", evidence_role: "context_only", personal_aether_support: true, commercial_default_allowed: false, requires_separate_design_review: true, human_review_required: true },
      { decision_id: "decision_new", cluster_id: "cluster_shared_fixture", concept_title: "Lunar calibration jig", classification: "project_candidate", primary_project: null, additional_projects: [], proposed_new_project: { suggested_name: "Lunar Calibration Jig", suggested_aliases: ["LCJ"], short_summary: "A distinct calibration fixture.", supporting_chunk_ids: [chunkB], reason_distinct_from_existing_projects: "No exported project covers this standalone fixture.", related_existing_project_ids: ["project_alpha"], proposed_parent_project_id: "project_alpha", project_family: "Sensor Family", confidence: 0.74 }, summary: "A distinct buildable fixture is proposed for human review.", supporting_chunk_ids: [chunkB], evidence_spans: [{ chunk_id: chunkB, start: 0, end: 25, excerpt: chunkBText.slice(0, 25) }], confidence: 0.74, reasoning_summary: "It is concrete and distinct from listed projects.", evidence_role: "primary_evidence", personal_aether_support: false, commercial_default_allowed: true, requires_separate_design_review: false, human_review_required: true }
    ],
    relationships: [{ relationship_id: "relationship_1", relationship_type: "shared_validation", source_decision_id: "decision_alias_match", target_decision_id: null, source_project: projectMatch("project_alpha", "Alpha Project"), target_project: projectMatch("project_beta", "Beta Project"), supporting_chunk_ids: [chunkA], summary: "One validation chunk supports both projects." }],
    human_questions: [{ question_id: "question_1", text: "Attach the shared evidence to both projects?", supporting_chunk_ids: [chunkA], decision_ids: ["decision_alias_match"] }], rejected_material: []
  };
  const resultPath = await writeJson(path.join(inputRoot, "review-result.json"), baseResult);
  const beforeCore = coreCounts(path.join(storageRoot, DATABASE_FILE));
  const beforeCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: staged.discoveryCaseId });
  const imported = await bridge.reviewExchange.importPastedExternalReview({ jsonText: JSON.stringify(baseResult, null, 2), outputDirectory: exchangeRoot, actorId: "actor_owner", reason: "Valid pasted external review", externalTransmissionStatus: "external" });
  assert(imported.workOrderId === workOrder.id && imported.discoveryCaseId === staged.discoveryCaseId, "Importer did not automatically locate the source Work Order and Discovery Case.", imported);
  assert(path.dirname(imported.savedPath) === exchangeRoot && imported.savedFileName === exported.fileName.replace(/\.zip$/i, ".review-result.json"), "Pasted JSON did not use the original export base name in the chosen folder.", imported);
  assert(imported.externalReviewPass.versionNumber === 1 && imported.coreChanged === false, "Valid review did not import as a non-authoritative pass.", imported);
  assert(JSON.stringify(beforeCore) === JSON.stringify(coreCounts(path.join(storageRoot, DATABASE_FILE))), "Import or proposed project changed Core counts.");
  const afterCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: staged.discoveryCaseId });
  assert(afterCase.chunks.length === beforeCase.chunks.length && afterCase.extractions.length === beforeCase.extractions.length, "Import changed local evidence or extraction records.");
  const storedOriginal = await fsp.readFile(path.join(storageRoot, ...imported.externalReviewPass.managedOriginalPath.split("/")));
  assert(storedOriginal.equals(await fsp.readFile(imported.savedPath)) && imported.externalReviewPass.sourcePackRevision === evidence.pack_revision, "Imported pasted bytes or package provenance were not preserved.");
  const duplicate = await bridge.reviewExchange.importExternalReview({ filePath: resultPath, actorId: "actor_owner", reason: "Duplicate" });
  assert(duplicate.deduplicated && duplicate.externalReviewPass.id === imported.externalReviewPass.id, "Exact duplicate import was not idempotent.");

  const hashMismatch = structuredClone(baseResult); hashMismatch.evidence_sha256 = "f".repeat(64);
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "hash-mismatch.json"), hashMismatch), actorId: "actor_owner" }), "evidence_sha256 must match");
  const staleRevision = structuredClone(baseResult); staleRevision.pack_revision += 1;
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "stale-revision.json"), staleRevision), actorId: "actor_owner" }), "pack_revision must match");
  const unknownChunk = structuredClone(baseResult); unknownChunk.decisions[0].supporting_chunk_ids = ["chunk_unknown"];
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "unknown-chunk.json"), unknownChunk), actorId: "actor_owner" }), "unknown chunk ID");
  const unknownProject = structuredClone(baseResult); unknownProject.decisions[0].primary_project = projectMatch("project_unknown", "Unknown");
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "unknown-project.json"), unknownProject), actorId: "actor_owner" }), "not a known existing project");
  const wrongName = structuredClone(baseResult); wrongName.decisions[0].primary_project.canonical_name = "Alpha Device";
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "wrong-name.json"), wrongName), actorId: "actor_owner" }), "canonical_name does not match");
  await expectRejected(() => bridge.reviewExchange.importPastedExternalReview({ jsonText: "{broken", outputDirectory: exchangeRoot, actorId: "actor_owner" }), "malformed JSON");
  const unvalidatedDraft = await bridge.reviewExchange.savePastedExternalReview({ jsonText: "{broken", outputDirectory: exchangeRoot });
  assert(unvalidatedDraft.validationBypassed === true && fs.existsSync(unvalidatedDraft.savedPath) && unvalidatedDraft.savedFileName.startsWith("unvalidated-external-review-"), "Save-anyway did not preserve invalid pasted text without importing it.", unvalidatedDraft);
  await fsp.writeFile(path.join(inputRoot, "malformed.json"), "{broken", "utf8");
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ filePath: path.join(inputRoot, "malformed.json"), actorId: "actor_owner" }), "malformed JSON");
  const directCore = structuredClone(baseResult); directCore.decisions[0].execute = "write Core";
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "direct-core.json"), directCore), actorId: "actor_owner" }), "not supported");

  const corrected = structuredClone(baseResult); corrected.decisions[0].summary = "Corrected reasoning retained as another immutable pass.";
  const correctedImport = await bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "corrected.json"), corrected), actorId: "actor_owner", reason: "Corrected pass" });
  assert(correctedImport.externalReviewPass.versionNumber === 2, "Corrected result was not preserved as a separate pass.");
  const incompleteCoverage = structuredClone(baseResult);
  const uncoveredChunk = extracted.chunks.at(-1).id;
  incompleteCoverage.concept_clusters[0].primary_chunk_ids = incompleteCoverage.concept_clusters[0].primary_chunk_ids.filter((id) => id !== uncoveredChunk);
  incompleteCoverage.coverage_summary.accounted_chunk_count -= 1;
  incompleteCoverage.coverage_summary.unaccounted_chunks = [uncoveredChunk];
  incompleteCoverage.final_self_check.all_chunks_accounted_for = false;
  incompleteCoverage.decisions[0].summary = "Coverage remains incomplete for approval-gate testing.";
  const incompleteImport = await bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "incomplete-coverage.json"), incompleteCoverage), actorId: "actor_owner", reason: "Incomplete consolidation pass" });
  await expectRejected(() => bridge.reviewExchange.recordHumanAction({ externalReviewPassId: incompleteImport.externalReviewPass.id, decisionId: "decision_alias_match", actorId: "actor_owner", reason: "Approval must be blocked", disposition: "approved", classification: "existing_project_support", conceptTitle: "Blocked", primaryProjectId: "project_alpha" }), "Final approval is blocked");
  const falseAccountingClaim = structuredClone(incompleteCoverage); falseAccountingClaim.final_self_check.all_chunks_accounted_for = true;
  await expectRejected(async () => bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "false-accounting-claim.json"), falseAccountingClaim), actorId: "actor_owner" }), "cannot be true while coverage_summary.unaccounted_chunks is non-empty");
  const incompleteSelfCheck = structuredClone(baseResult); incompleteSelfCheck.final_self_check.recommendations_explained = false; incompleteSelfCheck.decisions[0].summary = "Self-check remains incomplete.";
  const incompleteSelfCheckImport = await bridge.reviewExchange.importExternalReview({ filePath: await writeJson(path.join(inputRoot, "incomplete-self-check.json"), incompleteSelfCheck), actorId: "actor_owner", reason: "Incomplete self-check pass" });
  await expectRejected(() => bridge.reviewExchange.recordHumanAction({ externalReviewPassId: incompleteSelfCheckImport.externalReviewPass.id, decisionId: "decision_alias_match", actorId: "actor_owner", reason: "Project creation must be blocked", disposition: "approved", classification: "existing_project_support", conceptTitle: "Blocked", primaryProjectId: "project_alpha" }), "final_self_check is incomplete");
  const action = await bridge.reviewExchange.recordHumanAction({ externalReviewPassId: imported.externalReviewPass.id, decisionId: "decision_new", actorId: "actor_owner", reason: "Approve renamed proposal for Intake review", disposition: "approved", classification: "project_candidate", conceptTitle: "Lunar Sensor Calibration Jig", summary: "Owner-renamed proposal", proposedNewProject: { suggestedName: "Lunar Sensor Calibration Jig", proposedParentProjectId: "project_alpha", projectFamily: "Sensor Family" }, operation: "standard" });
  assert(action.externalReviewAction.coreChanged !== true && action.coreChanged === false, "Human review action changed Core.");
  const listed = await bridge.reviewExchange.listExternalReviews({ workOrderId: workOrder.id });
  assert(listed.externalReviewPasses.length === 4 && listed.externalReviewPasses[0].humanActions.length === 1, "Immutable pass or human action history is incomplete.", listed);
  const db = new DatabaseSync(path.join(storageRoot, DATABASE_FILE)); let passesAppendOnly = false; let actionsAppendOnly = false; let packagesAppendOnly = false;
  try { db.prepare("UPDATE external_review_passes SET imported_at = 'changed' WHERE id = ?").run(imported.externalReviewPass.id); } catch { passesAppendOnly = true; }
  try { db.prepare("UPDATE external_review_actions SET recorded_at = 'changed' WHERE id = ?").run(action.externalReviewAction.id); } catch { actionsAppendOnly = true; }
  try { db.prepare("UPDATE review_export_packages SET created_at = 'changed' WHERE id = ?").run(evidence.package_id); } catch { packagesAppendOnly = true; }
  db.close(); assert(passesAppendOnly && actionsAppendOnly && packagesAppendOnly, "Review packages, passes, or human actions are not append-only.");

  const emptyRegistryDb = new DatabaseSync(path.join(storageRoot, DATABASE_FILE));
  emptyRegistryDb.exec("DELETE FROM projects");
  emptyRegistryDb.close();
  const emptyRegistryExport = await bridge.reviewExchange.exportUniversalPack({ workOrder: { ...workOrder, id: "ai_work_order_empty_registry", title: "Empty registry fixture" }, knownProjects: [], exportedAt: "2026-07-11T13:00:00.000Z", outputDirectory: exchangeRoot });
  const emptyRegistryEntries = storedZipEntries(await fsp.readFile(emptyRegistryExport.path));
  const emptyRegistryEvidence = JSON.parse(emptyRegistryEntries.get("evidence.json").toString("utf8"));
  const emptyRegistryMarkdown = emptyRegistryEntries.get("evidence_readable.md").toString("utf8");
  assert(emptyRegistryEvidence.project_registry.length === 0 && emptyRegistryMarkdown.includes("project registry is empty"), "Empty current registry was not stated explicitly in JSON and Markdown.");

  await bridge.storage.reset(); await fsp.rm(storageRoot, { recursive: true, force: true }); await fsp.rm(inputRoot, { recursive: true, force: true }); await fsp.rm(exchangeRoot, { recursive: true, force: true });
  console.log("Universal Review Exchange Check");
  console.log(JSON.stringify({ canonicalRegistryJsonAndMarkdown: true, mandatoryConsolidationProtocol: true, mandatoryFinalSelfCheck: true, falseSelfCheckPreservedAsIncomplete: true, falseSelfCheckApprovalBlocked: true, accountingClaimCrossChecked: true, perChunkReviewDirective: true, conceptClusterDecisionLinkage: true, completeCoverageValidated: true, incompleteCoverageApprovalBlocked: true, duplicateConfidenceInflationBlocked: true, gibmRegistryFromCurrentProjects: true, registryIdentitySynchronized: true, emptyRegistryExplicit: true, privateProjectsExcluded: true, aliasCanonicalMatch: true, packageIdentity: true, chosenExchangeFolder: true, pastedJsonSavedWithExportName: true, invalidPasteSaveAnyway: true, recoverableNotebookTools: true, simplifiedHumanRouting: true, completeEvidence: true, metadataSynchronized: true, automaticWorkOrderMatching: true, mixedDocumentDecisions: 3, multiProjectChunk: true, explicitNewProposalNonCore: true, strictSchema: true, mismatchRejections: true, immutablePassesAndHumanActions: true, noCoreMutation: true }, null, 2));
  console.log("Universal review exchange: ok");
}

if (require.main === module) main().catch((error) => { console.error("Universal review exchange failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
