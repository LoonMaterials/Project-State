const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { createApiArmFileIntake } = require("../desktop/api-arm-file-intake.cjs");
const { createApiArmTransport } = require("../desktop/api-arm-transport.cjs");

const ROOT = path.join(__dirname, "..");
const TOKEN = "api-file-discovery-check-token-000000";

function coreCounts(store) {
  return {
    projects: (store.projects || []).length,
    decisions: (store.projects || []).reduce((total, project) => total + (project.decisions || []).length, 0),
    facts: (store.projects || []).reduce((total, project) => total + (project.facts || []).length, 0),
    conflicts: (store.projects || []).reduce((total, project) => total + (project.conflicts || []).length, 0),
    history: (store.projects || []).reduce((total, project) => total + (project.changes || []).length, 0)
  };
}

function fileMetadata(projectId, bytes) {
  return {
    contractVersion: "0.1",
    submissionId: "api_file_discovery_readability_001",
    idempotencyKey: "api_file_discovery_readability_key_001",
    submittedAt: "2026-06-25T20:00:00.000Z",
    arm: {
      armId: "api_file_discovery_readability_check",
      displayName: "API File Discovery Readability Check",
      type: "file",
      armVersion: "0.1.0"
    },
    target: { projectId },
    provenance: {
      sourceLabel: "API file readability fixture",
      capturedAt: "2026-06-25T19:59:00.000Z"
    },
    file: {
      fileName: "api-discovery-readable.md",
      contentType: "text/markdown",
      sha256: crypto.createHash("sha256").update(bytes).digest("hex")
    }
  };
}

async function jsonRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { status: response.status, body: await response.json() };
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-api-file-discovery-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const fileIntake = createApiArmFileIntake({ storageRoot, intakeArms: bridge.intakeArms, storage: bridge.storage });
  const transport = createApiArmTransport({ intakeArms: bridge.intakeArms, fileIntake, getToken: async () => TOKEN });
  try {
    const fixturePackage = JSON.parse(await fsp.readFile(path.join(ROOT, "fixtures", "storage-spine-v0.1-baseline.json"), "utf8"));
    await bridge.storage.saveStore({ store: fixturePackage.store, manifest: {} });
    const beforeCore = coreCounts((await bridge.storage.loadStore()).store);
    const projectId = fixturePackage.store.projects[0].id;
    const sourceText = [
      "# API Discovery Readability",
      "",
      "This source entered Project State through the local API file endpoint.",
      "Discovery must read the retained managed source, not an outside original path.",
      "",
      "# Second API Idea",
      "",
      "This second heading proves deterministic Discovery analysis can see API-uploaded content as document units."
    ].join("\n");
    const bytes = Buffer.from(sourceText, "utf8");
    const metadata = fileMetadata(projectId, bytes);

    const started = await transport.start({ port: 0 });
    const encodedMetadata = Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url");
    const uploaded = await jsonRequest(started.baseUrl, "/v0.1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/octet-stream",
        "X-Project-State-File-Metadata": encodedMetadata
      },
      body: bytes
    });
    assert.equal(uploaded.status, 202);
    assert.equal(uploaded.body.status, "accepted");
    assert(!JSON.stringify(uploaded.body).includes("managedPath"), "API file receipt exposed the managed path.");

    const loadedAfterUpload = (await bridge.storage.loadStore()).store;
    const intake = loadedAfterUpload.intakeItems.find((item) => item.id === uploaded.body.file.intakeId);
    assert(intake, "API file upload did not create an Intake item.");
    assert.equal(intake.status, "pending");
    assert.equal(intake.reviewState, "needs_review");
    assert.equal(intake.evidence?.managedFile?.managedPath?.startsWith("sources/"), true);
    const managedSourcePath = path.join(storageRoot, ...intake.evidence.managedFile.managedPath.split("/"));
    assert(fs.existsSync(managedSourcePath), "Managed API source file is missing.");
    assert.equal(fs.readFileSync(managedSourcePath, "utf8"), sourceText);

    const discoveryCaseId = "discovery_case_api_file_readability";
    const fileAssetId = "file_asset_api_file_readability";
    const fileVersionId = "file_version_api_file_readability";
    await bridge.discoveryStorage.createCase({
      id: discoveryCaseId,
      createdBy: "actor_owner",
      createdAt: "2026-06-25T20:01:00.000Z",
      stage: "quarantine",
      status: "created",
      title: "API-uploaded readable source"
    });
    const registered = await bridge.discoveryStorage.registerFileVersion({
      fileAssetId,
      fileVersionId,
      sha256: intake.evidence.managedFile.sha256,
      byteSize: intake.evidence.managedFile.size,
      originalName: intake.evidence.managedFile.fileName,
      managedPath: intake.evidence.managedFile.managedPath,
      createdAt: "2026-06-25T20:01:30.000Z",
      privacyClass: "local_only",
      externalSecurityAcknowledged: true,
      externalSecurityAcknowledgedBy: "actor_owner",
      externalSecurityAcknowledgedAt: "2026-06-25T20:01:30.000Z",
      externalSecurityReason: "API source was accepted into managed Project State storage after external user security responsibility."
    });
    await bridge.discoveryStorage.attachFileVersion({
      id: "discovery_file_api_file_readability",
      discoveryCaseId,
      fileAssetId: registered.fileAsset.id,
      fileVersionId: registered.fileVersion.id,
      addedAt: "2026-06-25T20:02:00.000Z",
      groupingRationale: "API-uploaded managed source is being reviewed in Discovery."
    });

    const extracted = await bridge.discoveryStorage.extractFileVersion({
      discoveryCaseId,
      fileVersionId: registered.fileVersion.id,
      actorId: "deterministic_extractor",
      createdAt: "2026-06-25T20:03:00.000Z",
      chunkCharacters: 500
    });
    assert.equal(extracted.extraction.status, "complete");
    assert.equal(extracted.extraction.sourceSha256, intake.evidence.managedFile.sha256);
    assert(extracted.chunks.length >= 1, "API-managed source did not create Discovery chunks.");

    const readback = await bridge.discoveryStorage.readExtractionText({ extractionId: extracted.extraction.id });
    assert.equal(readback.text, sourceText);
    const chunkReadback = await bridge.discoveryStorage.readChunkText({ discoveryChunkId: extracted.chunks[0].id });
    assert(chunkReadback.text.includes("local API file endpoint"), "Discovery chunk readback missed the API-uploaded content.");

    const analysis = await bridge.discoveryStorage.analyzeCase({
      discoveryCaseId,
      actorId: "deterministic_discovery",
      createdAt: "2026-06-25T20:04:00.000Z"
    });
    assert.equal(analysis.ok, true);
    assert(analysis.documentUnits.length >= 1, "Discovery analysis did not see the API-uploaded readable content.");

    const afterCore = coreCounts((await bridge.storage.loadStore()).store);
    assert.deepEqual(afterCore, beforeCore, "API file readability test changed Core records.");

    console.log("API File Discovery Readability Check");
    console.log(JSON.stringify({
      apiFileAccepted: true,
      managedPathHiddenFromReceipt: true,
      retainedManagedSourceReadable: true,
      discoveryFileVersionFromApiSource: true,
      extractionComplete: true,
      chunkReadback: true,
      discoveryAnalysisSawContent: true,
      coreUnchanged: true
    }, null, 2));
    console.log("API file discovery readability: ok");
  } finally {
    await transport.stop().catch(() => {});
    await bridge.storage.reset().catch(() => {});
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("API file discovery readability failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
