const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge, REQUIRED_TABLES } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
async function expectCode(callback, code) { try { await callback(); } catch (error) { assert(error.code === code, `Expected ${code}, received ${error.code || error.message}.`, { code: error.code, message: error.message }); return; } throw new Error(`Expected error ${code}.`); }

async function main() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-ai-analysis-"));
  const storageRoot = path.join(tempRoot, "storage");
  const inputPath = path.join(tempRoot, "large-ideas.md");
  const externalBackup = path.join(tempRoot, "external-backup");
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  try {
    const sourceText = `# Recovery Architecture\n${"Preserve append-only local history and recovery evidence. ".repeat(95)}\n\n# Separate Interface Idea\n${"The interface should show evidence and uncertainty before routing. ".repeat(95)}`;
    await fsp.writeFile(inputPath, sourceText, "utf8");
    const staged = await bridge.discoveryStorage.stageTrustedFile({ path: inputPath, actorId: "actor_owner", reason: "Trusted local fixture checked outside Project State.", privacyClass: "provider_allowed", externalSecurityAcknowledged: true, timestamp: "2026-06-20T20:00:00.000Z" });
    const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: staged.discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-20T20:01:00.000Z", chunkCharacters: 4000 });
    assert(extracted.chunks.length >= 2, "Large fixture did not produce several stable chunks.", extracted);
    const chunkScopes = extracted.chunks.map((chunk) => ({ discoveryChunkId: chunk.id, chunkTextSha256: chunk.textSha256 }));
    const run = await bridge.analysisArms.createRun({ id: "idea_run_fake_001", discoveryCaseId: staged.discoveryCaseId, actorId: "fake_analysis_actor", actorType: "tool", method: "ai", status: "running", startedAt: "2026-06-20T20:02:00.000Z", sourceScope: [{ fileVersionId: staged.fileVersionId, sourceSha256: staged.sha256, expectedChunkIds: extracted.chunks.map((chunk) => chunk.id) }], provenance: { providerId: "project_state_fake_local" } });
    await expectCode(() => bridge.analysisArms.authorizeTransmission({ id: "privacy_machine_forbidden", discoveryCaseId: staged.discoveryCaseId, actorId: "fake_analysis_actor", actorType: "tool", providerId: "project_state_fake_local", privacyClass: "provider_allowed", purpose: "idea_candidate_discovery", chunkScopes, reason: "Machine attempt." }), "PRIVACY_AUTHORIZATION_REQUIRED");
    await expectCode(() => bridge.analysisArms.authorizeTransmission({ id: "privacy_wrong_class", discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", actorType: "human", providerId: "project_state_fake_local", privacyClass: "local_only", purpose: "idea_candidate_discovery", chunkScopes, reason: "Wrong privacy class." }), "PRIVACY_SCOPE_MISMATCH");
    const authorization = await bridge.analysisArms.authorizeTransmission({ id: "privacy_authorization_fake_001", discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", actorType: "human", authorizedAt: "2026-06-20T20:03:00.000Z", providerId: "project_state_fake_local", privacyClass: "provider_allowed", purpose: "idea_candidate_discovery", chunkScopes, redactionMode: "none", reason: "Authorize exact local fixture chunks for fake analysis." });
    const chunks = extracted.chunks.map((chunk) => ({ discoveryChunkId: chunk.id, discoveryExtractionId: extracted.extraction.id, fileVersionId: staged.fileVersionId, sourceSha256: staged.sha256, chunkTextSha256: chunk.textSha256, content: { type: "text", text: fs.readFileSync(path.join(storageRoot, ...chunk.textPath.split("/")), "utf8") }, redactionState: "original" }));
    const envelope = { contractVersion: "0.1", requestId: "analysis_request_fake_001", idempotencyKey: "analysis_idempotency_fake_001", submittedAt: "2026-06-20T20:04:00.000Z", arm: { armId: "project_state_fake_analysis", displayName: "Project State Fake Local Analysis Arm", armVersion: "0.1.0", providerId: "project_state_fake_local", executionLocation: "local" }, analysisRunId: run.analysisRun.id, discoveryCaseId: staged.discoveryCaseId, purpose: "idea_candidate_discovery", privacyAuthorization: { authorizationRecordId: authorization.authorization.id, authorizedBy: "actor_owner", authorizedAt: authorization.authorization.authorizedAt, providerId: "project_state_fake_local", purpose: "idea_candidate_discovery", privacyClass: "provider_allowed", chunkScopes, redactionMode: "none" }, batch: { batchId: "analysis_batch_fake_001", batchIndex: 0, isFinalBatch: true }, input: { chunks }, analysisOptions: { language: "en", candidateTypes: ["other"], maxCandidates: 100, includeRelationships: false, includeClarificationQuestions: true }, provenance: { projectStateContract: "ai-analysis-arm-v0.1", ideaCandidateSchema: "0.1", analysisStrategy: "fake_local_contract_test" } };
    const coreBeforeDb = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const coreBefore = coreBeforeDb.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    coreBeforeDb.close();
    const result = await bridge.analysisArms.submitAnalysisBatch(envelope);
    assert(result.result.status === "complete" && result.candidates.length === chunks.length, "Fake arm did not produce one evidenced candidate per chunk.", result);
    assert(result.transmissionReceipt.externalTransmission === false, "Fake local arm incorrectly claimed external transmission.", result.transmissionReceipt);
    assert(result.candidates.every((candidate) => candidate.evidence.length === 1 && candidate.evidence[0].chunkTextSha256), "Candidate evidence is incomplete.", result.candidates);
    const duplicate = await bridge.analysisArms.submitAnalysisBatch(envelope);
    assert(duplicate.deduplicated === true && duplicate.receipt.requestId === envelope.requestId, "Exact retry was not idempotent.", duplicate);
    await expectCode(() => bridge.analysisArms.submitAnalysisBatch({ ...envelope, analysisOptions: { ...envelope.analysisOptions, language: "fr" } }), "IDEMPOTENCY_CONFLICT");
    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.requestId = "analysis_request_fake_tampered";
    tampered.idempotencyKey = "analysis_idempotency_fake_tampered";
    tampered.input.chunks[0].content.text += "tampered";
    await expectCode(() => bridge.analysisArms.submitAnalysisBatch(tampered), "CHUNK_CHECKSUM_MISMATCH");
    await expectCode(() => bridge.analysisArms.recordReviewDecision({ id: "review_machine_forbidden", discoveryCaseId: staged.discoveryCaseId, actorId: "fake_analysis_actor", actorType: "tool", action: "accept", candidateIds: [result.candidates[0].id], reason: "Machine attempt.", resultingUnits: [{ id: "idea_unit_machine", title: "Machine unit", summary: "Forbidden." }] }), "FORBIDDEN_FIELD");
    const review = await bridge.analysisArms.recordReviewDecision({ id: "idea_review_fake_001", discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", actorType: "human", action: "merge", candidateIds: result.candidates.map((candidate) => candidate.id), decidedAt: "2026-06-20T20:05:00.000Z", reason: "The fixture chunks describe one recovery concept.", resultingUnits: [{ id: "idea_unit_fake_001", title: "Local history and recovery", summary: "Preserve append-only local history with evidence-backed recovery.", sourceCandidateIds: result.candidates.map((candidate) => candidate.id), unresolvedUncertainty: ["External attachment scope remains unknown."] }] });
    assert(review.confirmedIdeaUnits.length === 1 && review.coreChanged === false && review.confirmedIdeaUnits[0].coreAuthority === false, "Human review crossed the Core boundary.", review);
    const cancellation = await bridge.analysisArms.cancelAnalysis(envelope.requestId);
    assert(cancellation.changed === false && cancellation.status === "complete", "Completed fake job was incorrectly cancelled.", cancellation);
    await expectCode(() => bridge.analysisArms.getResultPage(envelope.requestId, "forged_cursor"), "INVALID_ENVELOPE");
    const state = await bridge.analysisArms.readState({ discoveryCaseId: staged.discoveryCaseId });
    assert(state.analysisRuns.length === 1 && state.privacyAuthorizations.length === 1 && state.transmissionReceipts.length === 1 && state.jobs.length === 1 && state.candidates.length === chunks.length && state.resultReceipts.length === 1 && state.reviewDecisions.length === 1 && state.confirmedIdeaUnits.length === 1, "Idea analysis storage counts are incomplete.", state);
    const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    assert(REQUIRED_TABLES.every((table) => db.prepare("SELECT 1 AS found FROM sqlite_master WHERE type='table' AND name=?").get(table)), "Required table registry is incomplete.");
    const coreAfter = db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    assert(coreAfter === coreBefore, "Idea analysis or review changed Core.", { coreBefore, coreAfter });
    let candidateImmutable = false;
    try { db.prepare("UPDATE idea_candidates SET working_label = 'changed' WHERE id = ?").run(result.candidates[0].id); } catch { candidateImmutable = true; }
    let authorizationImmutable = false;
    try { db.prepare("DELETE FROM idea_privacy_authorizations WHERE id = ?").run(authorization.authorization.id); } catch { authorizationImmutable = true; }
    assert(candidateImmutable && authorizationImmutable, "Append-only Idea Analysis records were mutable.");
    const rawRecords = ["idea_privacy_authorizations", "idea_transmission_receipts", "ai_analysis_jobs", "idea_candidates", "ai_analysis_result_receipts"].flatMap((table) => db.prepare(`SELECT record_json FROM ${table}`).all().map((row) => row.record_json)).join("\n");
    assert(!/api[_-]?key|credential|secret/i.test(rawRecords), "Analysis storage retained a credential-like field.");
    db.close();
    const backup = await bridge.storage.createBackupPackage({ actorId: "actor_owner", actorName: "Test Owner", reason: "Verify Idea Analysis backup and restore.", timestamp: "2026-06-20T20:06:00.000Z" });
    await fsp.cp(backup.packagePath, externalBackup, { recursive: true, force: true });
    await bridge.storage.reset();
    await bridge.storage.restoreBackupPackage({ packagePath: externalBackup, actorId: "actor_owner", actorName: "Test Owner", reason: "Restore Idea Analysis test package.", timestamp: "2026-06-20T20:07:00.000Z" });
    const restored = await bridge.analysisArms.readState({ discoveryCaseId: staged.discoveryCaseId });
    assert(restored.candidates.length === chunks.length && restored.reviewDecisions.length === 1 && restored.confirmedIdeaUnits.length === 1, "Backup/restore lost Idea Analysis records.", restored);
    const capabilities = await bridge.analysisArms.describeCapabilities();
    assert(capabilities.realProviderInstalled === false && capabilities.arm.executionLocation === "local", "Fake arm capabilities imply a real provider.", capabilities);
    console.log("AI Analysis Storage and Fake Arm Check");
    console.log(JSON.stringify({ newTables: 8, stableChunks: chunks.length, privacyMachineBlocked: true, privacyClassEnforced: true, exactEvidenceValidated: true, candidates: result.candidates.length, exactRetryDeduplicated: true, idempotencyConflictRejected: true, tamperedChunkRejected: true, machineReviewBlocked: true, humanReviewRecorded: true, confirmedUnitsNonCore: true, appendOnly: true, credentialsExcluded: true, backupRestoreRoundTrip: true, realProviderInstalled: false }, null, 2));
    console.log("AI Analysis storage/fake arm: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("AI Analysis storage/fake arm failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
