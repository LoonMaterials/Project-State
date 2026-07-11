const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge, DATABASE_FILE } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) { const error = new Error(message); error.details = details; throw error; }
}

async function expectRejected(operation, marker) {
  let caught = null;
  try { await operation(); } catch (error) { caught = error; }
  assert(caught && caught.message.includes(marker), `Expected rejection containing: ${marker}`, { actual: caught?.message });
}

function coreCounts(dbPath) {
  const db = new DatabaseSync(dbPath);
  try {
    return Object.fromEntries(["projects", "decisions", "facts", "open_questions", "next_actions", "relationships", "sources", "intake_items", "idea_candidates", "confirmed_idea_units"].map((table) => [table, Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count)]));
  } finally { db.close(); }
}

async function writeResult(filePath, value) {
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
  return filePath;
}

async function main() {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const resultSchemaSource = fs.readFileSync(path.join(__dirname, "..", "fixtures", "review-result-v1.0.schema.json"), "utf8");
  for (const marker of ["Export Universal Review Pack", "Import External AI Review", "Review Imported Decisions", "externalReviewActions", "reviewOperation", "split_secondary", "mergedDecisionIds", "Route this approved decision to Intake"]) assert(appSource.includes(marker), `Human review UI missing marker: ${marker}`);
  assert(!appSource.includes('data-action="export-chatgpt-review-pack"'), "Provider-specific review export remains in the active UI.");
  assert(!/chatgpt|qwen|ollama/i.test(resultSchemaSource), "Universal result schema contains a provider-specific dependency.");
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-universal-review-"));
  const inputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-universal-review-input-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const sourcePath = path.join(inputRoot, "multi-project-evidence.md");
  const sourceText = Array.from({ length: 18 }, (_, index) => [
    `## Shared validation pass ${index + 1}`,
    "Alpha Project and Beta Project use the same repeatable sensor validation procedure.",
    "The result is primary evidence for Alpha and an additional confirming reference for Beta.",
    "A private household continuity note belongs in personal context and is not a commercial default."
  ].join("\n")).join("\n\n");
  await fsp.writeFile(sourcePath, sourceText, "utf8");

  await bridge.storage.saveStore({
    store: {
      schemaVersion: "0.1.0", settings: {}, actors: [{ id: "actor_owner", name: "Owner", type: "Human", role: "owner", status: "active" }], intakeItems: [], aiWorkOrders: [],
      projects: [
        { id: "project_alpha", name: "Alpha Project", currentSummary: "Primary sensor system", currentStatus: "active", archived: false },
        { id: "project_beta", name: "Beta Project", currentSummary: "Related validation platform", currentStatus: "active", archived: false }
      ]
    }, manifest: {}
  });
  const staged = await bridge.discoveryStorage.stageTrustedFile({ path: sourcePath, actorId: "actor_owner", reason: "Universal exchange fixture", externalSecurityAcknowledged: true });
  const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: staged.discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "deterministic_extractor", chunkCharacters: 700 });
  assert(extracted.chunks.length > 2, "Fixture did not create multiple stable chunks.", extracted);
  const workOrder = { id: "ai_work_order_universal_001", title: "Universal review fixture", task: "Classify all evidence", source: { discoveryCaseId: staged.discoveryCaseId }, candidateMap: { entries: [] } };
  const knownProjects = [
    { id: "project_alpha", name: "Alpha Project", aliases: ["Alpha"], currentSummary: "Primary sensor system" },
    { id: "project_beta", name: "Beta Project", aliases: ["Beta"], currentSummary: "Related validation platform" }
  ];

  const exported = await bridge.reviewExchange.exportUniversalPack({ workOrder, knownProjects, exportedAt: "2026-07-11T12:00:00.000Z" });
  const zipBytes = await fsp.readFile(exported.path);
  const zipText = zipBytes.toString("utf8");
  for (const name of ["review_instructions.md", "evidence.json", "evidence_readable.md", "schema/review_result.schema.json"]) assert(zipText.includes(name), `Export ZIP is missing ${name}.`);
  assert(exported.chunkCount === extracted.chunks.length, "Export did not preserve every extracted chunk.", exported);

  const chunkA = extracted.chunks[0].id;
  const chunkB = extracted.chunks[1].id;
  const baseResult = {
    format: "project-state-review-result", format_version: "1.0", work_order_id: workOrder.id,
    reviewer: { reviewer_type: "ai", provider: "optional", model: "optional", reviewed_at: "2026-07-11T12:10:00.000Z" }, source_complete: true,
    decisions: [
      {
        decision_id: "decision_shared_support", concept_title: "Shared sensor validation", classification: "existing_project_support",
        primary_project_id: "project_alpha", additional_project_ids: ["project_beta"], summary: "One evidence chunk supports two projects.",
        supporting_chunk_ids: [chunkA], evidence_spans: [{ chunk_id: chunkA, start: 0, end: 40, excerpt: "Shared validation pass" }], confidence: 0.91,
        reasoning_summary: "Both named projects and a repeated validation procedure appear in the same evidence.", evidence_role: "validation_or_test_support",
        personal_aether_support: false, commercial_default_allowed: true, requires_separate_design_review: false, human_review_required: true
      },
      {
        decision_id: "decision_personal_boundary", concept_title: "Private continuity context", classification: "personal_context_note",
        primary_project_id: null, additional_project_ids: [], summary: "Personal context remains separate from commercial defaults.",
        supporting_chunk_ids: [chunkA, chunkB], evidence_spans: [{ chunk_id: chunkB, start: 0, end: 25 }], confidence: 0.82,
        reasoning_summary: "The material explicitly describes private continuity context.", evidence_role: "context_only",
        personal_aether_support: true, commercial_default_allowed: false, requires_separate_design_review: true, human_review_required: true
      }
    ],
    relationships: [{ from_decision_id: "decision_shared_support", to_project_id: "project_beta", relationship: "additional support" }],
    human_questions: [{ question_id: "question_1", text: "Attach the shared evidence to both projects?", supporting_chunk_ids: [chunkA] }], rejected_material: []
  };
  const resultPath = await writeResult(path.join(inputRoot, "review-result.json"), baseResult);
  const beforeCore = coreCounts(path.join(storageRoot, DATABASE_FILE));
  const beforeCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: staged.discoveryCaseId });
  const imported = await bridge.reviewExchange.importExternalReview({ workOrder, filePath: resultPath, actorId: "actor_owner", reason: "Valid external review", externalTransmissionStatus: "external" });
  assert(imported.externalReviewPass.versionNumber === 1 && imported.coreChanged === false, "Valid review did not import as a non-authoritative pass.", imported);
  const storedOriginal = await fsp.readFile(path.join(storageRoot, ...imported.externalReviewPass.managedOriginalPath.split("/")));
  assert(storedOriginal.equals(await fsp.readFile(resultPath)) && imported.externalReviewPass.schemaValidation?.valid === true, "Imported original bytes or validation provenance were not preserved.");
  assert(JSON.stringify(beforeCore) === JSON.stringify(coreCounts(path.join(storageRoot, DATABASE_FILE))), "Import changed Core counts.");
  const afterCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: staged.discoveryCaseId });
  assert(afterCase.chunks.length === beforeCase.chunks.length && afterCase.extractions.length === beforeCase.extractions.length, "Import changed local evidence or extraction records.");

  const duplicate = await bridge.reviewExchange.importExternalReview({ workOrder, filePath: resultPath, actorId: "actor_owner", reason: "Duplicate" });
  assert(duplicate.deduplicated && duplicate.externalReviewPass.id === imported.externalReviewPass.id, "Exact duplicate import was not idempotent.");

  const unknownChunk = structuredClone(baseResult); unknownChunk.decisions[0].supporting_chunk_ids = ["chunk_unknown"];
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: path.join(inputRoot, "unknown-chunk.json"), actorId: "actor_owner" }), "Choose an external review");
  const unknownChunkPath = await writeResult(path.join(inputRoot, "unknown-chunk.json"), unknownChunk);
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: unknownChunkPath, actorId: "actor_owner" }), "unknown chunk ID");
  const unknownProject = structuredClone(baseResult); unknownProject.decisions[0].primary_project_id = "project_unknown";
  const unknownProjectPath = await writeResult(path.join(inputRoot, "unknown-project.json"), unknownProject);
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: unknownProjectPath, actorId: "actor_owner" }), "not a known project");
  const implicitNew = structuredClone(baseResult); implicitNew.decisions[0].classification = "project_candidate"; implicitNew.decisions[0].primary_project_id = null; implicitNew.decisions[0].additional_project_ids = [];
  const implicitNewPath = await writeResult(path.join(inputRoot, "implicit-new.json"), implicitNew);
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: implicitNewPath, actorId: "actor_owner" }), "proposed_new_project.name");
  await fsp.writeFile(path.join(inputRoot, "malformed.json"), "{broken", "utf8");
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: path.join(inputRoot, "malformed.json"), actorId: "actor_owner" }), "malformed JSON");
  const wrongVersion = structuredClone(baseResult); wrongVersion.format_version = "2.0";
  const wrongVersionPath = await writeResult(path.join(inputRoot, "wrong-version.json"), wrongVersion);
  await expectRejected(() => bridge.reviewExchange.importExternalReview({ workOrder, filePath: wrongVersionPath, actorId: "actor_owner" }), "format_version must be 1.0");

  const explicitNew = structuredClone(baseResult);
  explicitNew.decisions[0].decision_id = "decision_explicit_new";
  explicitNew.decisions[0].classification = "project_candidate";
  explicitNew.decisions[0].primary_project_id = null;
  explicitNew.decisions[0].additional_project_ids = ["project_beta"];
  explicitNew.decisions[0].proposed_new_project = { name: "New Sensor Review Project", summary: "Explicitly proposed; not silently created." };
  explicitNew.relationships = [];
  const explicitNewPath = await writeResult(path.join(inputRoot, "explicit-new.json"), explicitNew);
  const acceptedNew = await bridge.reviewExchange.importExternalReview({ workOrder, filePath: explicitNewPath, actorId: "actor_owner", reason: "Explicit new project proposal" });
  assert(acceptedNew.externalReviewPass.versionNumber === 2 && acceptedNew.coreChanged === false, "Explicit new-project proposal was not accepted as a non-authoritative review pass.", acceptedNew);

  const corrected = structuredClone(baseResult); corrected.decisions[0].summary = "Corrected external reasoning, preserved as a second version.";
  const correctedPath = await writeResult(path.join(inputRoot, "corrected.json"), corrected);
  const second = await bridge.reviewExchange.importExternalReview({ workOrder, filePath: correctedPath, actorId: "actor_owner", reason: "Corrected pass" });
  assert(second.externalReviewPass.versionNumber === 3 && second.externalReviewPass.id !== imported.externalReviewPass.id, "Corrected result was not preserved as a separate pass.");
  const listed = await bridge.reviewExchange.listExternalReviews({ workOrderId: workOrder.id });
  assert(listed.externalReviewPasses.length === 3, "External review version history is incomplete.", listed);

  const db = new DatabaseSync(path.join(storageRoot, DATABASE_FILE));
  let appendOnly = false;
  try { db.prepare("UPDATE external_review_passes SET imported_at = ? WHERE id = ?").run("changed", imported.externalReviewPass.id); } catch { appendOnly = true; }
  db.close();
  assert(appendOnly, "External Review Pass records are not append-only.");

  await bridge.storage.reset();
  await fsp.rm(storageRoot, { recursive: true, force: true });
  await fsp.rm(inputRoot, { recursive: true, force: true });
  console.log("Universal Review Exchange Check");
  console.log(JSON.stringify({ completeEvidenceExport: true, modelNeutralSchema: true, providerSpecificUiRemoved: true, humanDecisionControls: true, splitMergeControls: true, multiProjectEvidence: true, personalCommercialBoundary: true, explicitNewProjectProposalAccepted: true, strictImport: true, duplicateSafe: true, versionedCorrection: true, appendOnly: true, noCoreMutation: true }, null, 2));
  console.log("Universal review exchange: ok");
}

if (require.main === module) main().catch((error) => { console.error("Universal review exchange failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
