const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { createApiArmFileIntake } = require("../desktop/api-arm-file-intake.cjs");

function metadata({ projectId, fileName, relativePath, bytes, discoveryCaseId, group, index, isFinalFile }) {
  const submittedAt = "2026-06-25T22:00:00.000Z";
  return {
    contractVersion: "0.1",
    submissionId: `api_folder_discovery_${index}`,
    idempotencyKey: `api_folder_discovery_key_${index}`,
    submittedAt,
    arm: { armId: "api_folder_discovery_check", displayName: "API Folder Discovery Check", type: "file", armVersion: "0.1.0" },
    target: { projectId },
    provenance: { sourceLabel: `Folder discovery: ${group}`, externalReference: relativePath, capturedAt: submittedAt },
    file: { fileName, contentType: fileName.endsWith(".txt") ? "text/plain" : "text/markdown", sha256: crypto.createHash("sha256").update(bytes).digest("hex") },
    discovery: {
      enabled: true,
      folderBatchId: "folder_batch_api_discovery_check",
      discoveryCaseId,
      caseTitle: group,
      actorId: "actor_owner",
      reason: "Trusted API folder fixture checked outside Project State.",
      relativePath,
      groupingRationale: `Relative folder group: ${group}`,
      privacyClass: "local_only",
      extract: true,
      analyzeWhenComplete: isFinalFile
    }
  };
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-api-folder-discovery-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const fileIntake = createApiArmFileIntake({ storageRoot, intakeArms: bridge.intakeArms, storage: bridge.storage, discoveryStorage: bridge.discoveryStorage });
  try {
    const fixturePackage = JSON.parse(await fsp.readFile(path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json"), "utf8"));
    await bridge.storage.saveStore({ store: fixturePackage.store, manifest: {} });
    const projectId = fixturePackage.store.projects[0].id;
    const files = [
      { group: "Alpha", caseId: "discovery_case_api_folder_alpha", relativePath: "Alpha/alpha-plan.md", text: "# Alpha Plan\nAlpha project material.", final: false },
      { group: "Alpha", caseId: "discovery_case_api_folder_alpha", relativePath: "Alpha/alpha-notes.txt", text: "Alpha supporting notes.", final: true },
      { group: "Beta", caseId: "discovery_case_api_folder_beta", relativePath: "Beta/beta-idea.md", text: "# Beta Idea\nBeta material.", final: true },
      { group: "Mixed", caseId: "discovery_case_api_folder_mixed", relativePath: "Mixed/mixed-long-doc.md", text: "### Fitness of Command\nOne distinct idea.\n\n### Platters of Food\nA second distinct idea.", final: true }
    ];
    const receipts = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const bytes = Buffer.from(file.text, "utf8");
      const receipt = await fileIntake.submitFile({
        metadata: metadata({
          projectId,
          fileName: path.basename(file.relativePath),
          relativePath: file.relativePath,
          bytes,
          discoveryCaseId: file.caseId,
          group: file.group,
          index,
          isFinalFile: file.final
        }),
        bytes
      });
      assert.equal(receipt.status, "accepted");
      assert.equal(receipt.boundary, "airlock_pending_human_review");
      assert(receipt.file.discovery?.discoveryCaseId, "Discovery receipt missing.");
      receipts.push(receipt);
    }
    const state = await bridge.discoveryStorage.readFoundationState({});
    const cases = state.discoveryCases.filter((item) => item.id.startsWith("discovery_case_api_folder_"));
    assert.equal(cases.length, 3, "Folder groups did not create three Discovery Cases.");
    const mixed = await bridge.discoveryStorage.getCase({ discoveryCaseId: "discovery_case_api_folder_mixed" });
    const mixedSuggestion = mixed.interactions.find((item) => item.interactionType === "machine_suggestion")?.content || {};
    const titles = (mixedSuggestion.documentUnits || []).map((unit) => unit.title);
    assert(titles.includes("Fitness of Command"), "Mixed document missing first heading unit.");
    assert(titles.includes("Platters of Food"), "Mixed document missing second heading unit.");
    assert.equal(mixed.extractions[0].status, "complete");
    assert(mixed.chunks.length >= 1, "Mixed document did not produce readable chunks.");
    const loaded = (await bridge.storage.loadStore()).store;
    const apiItems = (loaded.intakeItems || []).filter((item) => item.evidence?.apiFolderDiscovery?.folderBatchId === "folder_batch_api_discovery_check");
    assert.equal(apiItems.length, 4, "API folder file evidence was not retained on Intake items.");
    assert(apiItems.every((item) => item.status === "pending"), "API folder file proposals should remain pending.");
    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    assert(appSource.includes("function isDiscoveryStagingIntake"), "App is missing the Discovery staging Intake classifier.");
    assert(appSource.includes("function isRawFileUploadStagingIntake"), "App is missing the legacy raw file-upload staging classifier.");
    assert(appSource.includes("Uploaded .+ source file"), "App does not recognize legacy file-upload staging summaries.");
    assert(appSource.includes("visibleIntakeItems(store.intakeItems || [])"), "App Intake queue does not filter Discovery staging records.");
    assert(appSource.includes("!isDiscoveryStagingIntake(item)"), "Managed file list does not hide Discovery staging records.");
    assert(appSource.includes("for (const intake of visibleIntakeItems(store.intakeItems || []))"), "Needs Attention and handoff views do not hide Discovery staging records.");
    assert(appSource.includes("const pending = visibleIntakeItems(store.intakeItems || []).filter"), "Batch triage does not hide Discovery staging records.");
    assert(appSource.includes("return visibleIntakeItems(store.intakeItems || [])\n    .filter"), "Next pending Intake navigation does not hide Discovery staging records.");

    console.log("API Folder Discovery Check");
    console.log(JSON.stringify({
      filesAccepted: receipts.length,
      discoveryCases: cases.length,
      mixedDocumentUnits: titles.length,
      headingUnitsDetected: titles,
      extractionComplete: true,
      pendingFileEvidenceRetained: true,
      stagingHiddenFromNormalIntake: true,
      stagingHiddenFromNeedsAttention: true,
      stagingHiddenFromBatchTriage: true,
      legacyRawFileUploadsHidden: true
    }, null, 2));
    console.log("API folder discovery: ok");
  } finally {
    await bridge.storage.reset().catch(() => {});
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("API folder discovery failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
