const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { QWEN3_8B_PROVIDER_ID, QWEN3_8B_ARM_ID, QWEN3_8B_MODEL_ID, describeLocalAiProviders } = require("../desktop/local-ai-providers.cjs");

async function main() {
  const providers = await describeLocalAiProviders();
  const qwen = providers.find((provider) => provider.providerId === QWEN3_8B_PROVIDER_ID);
  if (!qwen?.available) {
    console.log("Local AI Qwen Smoke Check");
    console.log(JSON.stringify({ skipped: true, reason: qwen?.lastError || "Qwen3 8B is not available through Ollama." }, null, 2));
    console.log("Local AI Qwen smoke: skipped");
    return;
  }

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-qwen-smoke-"));
  const storageRoot = path.join(tempRoot, "storage");
  const inputPath = path.join(tempRoot, "qwen-smoke.md");
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  try {
    await fsp.writeFile(inputPath, [
      "# Local AI Branch Control",
      "Project State should use a local AI to identify idea branches before Intake.",
      "The AI may suggest candidates and questions, but humans decide routing and approval.",
      "",
      "# Cloud Deep Thinking",
      "Cloud AI should be optional and called only after explicit human authorization for selected chunks."
    ].join("\n"), "utf8");
    const staged = await bridge.discoveryStorage.stageTrustedFile({ path: inputPath, actorId: "actor_owner", reason: "Trusted local Qwen smoke fixture.", privacyClass: "local_only", externalSecurityAcknowledged: true, timestamp: "2026-06-26T12:00:00.000Z" });
    const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: staged.discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-26T12:01:00.000Z", chunkCharacters: 4000 });
    const dbBefore = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const coreBefore = dbBefore.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    dbBefore.close();

    const chunkScopes = extracted.chunks.map((chunk) => ({ discoveryChunkId: chunk.id, chunkTextSha256: chunk.textSha256 }));
    const run = await bridge.analysisArms.createRun({ id: "idea_run_qwen_smoke_001", discoveryCaseId: staged.discoveryCaseId, actorId: QWEN3_8B_ARM_ID, actorType: "tool", method: "ai", status: "running", startedAt: "2026-06-26T12:02:00.000Z", sourceScope: [{ fileVersionId: staged.fileVersionId, sourceSha256: staged.sha256, expectedChunkIds: extracted.chunks.map((chunk) => chunk.id) }], provenance: { providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID } });
    const authorization = await bridge.analysisArms.authorizeTransmission({ id: "privacy_authorization_qwen_smoke_001", discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", actorType: "human", authorizedAt: "2026-06-26T12:03:00.000Z", providerId: QWEN3_8B_PROVIDER_ID, privacyClass: "local_only", purpose: "idea_candidate_discovery", chunkScopes, redactionMode: "none", reason: "Authorize exact local-only chunks for local Qwen smoke test." });
    const chunks = extracted.chunks.map((chunk) => ({ discoveryChunkId: chunk.id, discoveryExtractionId: extracted.extraction.id, fileVersionId: staged.fileVersionId, sourceSha256: staged.sha256, chunkTextSha256: chunk.textSha256, content: { type: "text", text: fs.readFileSync(path.join(storageRoot, ...chunk.textPath.split("/")), "utf8") }, redactionState: "original" }));
    const result = await bridge.analysisArms.submitAnalysisBatch({
      contractVersion: "0.1",
      requestId: "analysis_request_qwen_smoke_001",
      idempotencyKey: "analysis_idempotency_qwen_smoke_001",
      submittedAt: "2026-06-26T12:04:00.000Z",
      arm: qwen.arm,
      analysisRunId: run.analysisRun.id,
      discoveryCaseId: staged.discoveryCaseId,
      purpose: "idea_candidate_discovery",
      privacyAuthorization: { authorizationRecordId: authorization.authorization.id, authorizedBy: "actor_owner", authorizedAt: authorization.authorization.authorizedAt, providerId: QWEN3_8B_PROVIDER_ID, purpose: "idea_candidate_discovery", privacyClass: "local_only", chunkScopes, redactionMode: "none" },
      batch: { batchId: "analysis_batch_qwen_smoke_001", batchIndex: 0, isFinalBatch: true },
      input: { chunks },
      analysisOptions: { language: "en", candidateTypes: ["project_concept", "design_concept", "requirement", "question", "risk", "task", "other"], maxCandidates: 8, includeRelationships: true, includeClarificationQuestions: true },
      provenance: { projectStateContract: "ai-analysis-arm-v0.1", ideaCandidateSchema: "0.1", analysisStrategy: "local_ai_qwen3_8b_smoke" }
    });
    assert.equal(result.result.status, "complete", "Qwen result did not complete.");
    assert(result.candidates.length > 0, "Qwen did not produce any candidates.");
    assert(result.candidates.every((candidate) => candidate.evidence.length > 0 && candidate.evidence.every((evidence) => evidence.chunkTextSha256)), "Qwen candidates are missing exact evidence.");
    assert.equal(result.transmissionReceipt.externalTransmission, false, "Local Qwen receipt must not claim external transmission.");
    const dbAfter = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const coreAfter = dbAfter.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    dbAfter.close();
    assert.equal(coreAfter, coreBefore, "Qwen analysis changed Core.");

    console.log("Local AI Qwen Smoke Check");
    console.log(JSON.stringify({
      provider: QWEN3_8B_PROVIDER_ID,
      model: QWEN3_8B_MODEL_ID,
      chunks: chunks.length,
      candidates: result.candidates.length,
      externalTransmission: result.transmissionReceipt.externalTransmission,
      coreChanged: false,
      preAirlock: true
    }, null, 2));
    console.log("Local AI Qwen smoke: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Local AI Qwen smoke failed:");
    console.error(error.stack || error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
