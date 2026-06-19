const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

const ROOT = path.join(__dirname, "..");
const FIXTURE = path.join(ROOT, "fixtures", "storage-spine-v0.1-baseline.json");

function coreCounts(store) {
  return {
    projects: (store.projects || []).length,
    decisions: (store.projects || []).reduce((total, project) => total + (project.decisions || []).length, 0),
    facts: (store.projects || []).reduce((total, project) => total + (project.facts || []).length, 0),
    conflicts: (store.projects || []).reduce((total, project) => total + (project.conflicts || []).length, 0),
    history: (store.projects || []).reduce((total, project) => total + (project.changes || []).length, 0)
  };
}

function makeEnvelope(projectId) {
  return {
    contractVersion: "0.1",
    submissionId: "submission_fixture_001",
    idempotencyKey: "idempotency_fixture_001",
    submittedAt: "2026-06-18T12:00:00.000Z",
    arm: {
      armId: "api_arm_fixture",
      displayName: "Fixture API Arm",
      type: "api",
      armVersion: "1.0.0",
      instanceId: "fixture_instance"
    },
    target: { projectId },
    items: [
      {
        clientItemId: "client_item_1",
        title: "Proposed fixture fact",
        proposedObjectType: "Fact",
        proposedChange: {
          text: "Outside API fixture content",
          summary: "Must remain pending in the Airlock."
        },
        sourceLabel: "Fixture API",
        evidence: { externalRecord: "record-1" }
      },
      {
        clientItemId: "client_item_2",
        title: "Proposed fixture action",
        proposedObjectType: "NextAction",
        proposedChange: {
          text: "Review fixture API proposal",
          dueDate: "2026-07-01"
        }
      }
    ],
    provenance: {
      sourceLabel: "Fixture API dataset",
      externalReference: "fixture://dataset/1",
      capturedAt: "2026-06-18T11:59:00.000Z"
    }
  };
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-api-arm-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "API Arm Check" });
  try {
    const fixturePackage = JSON.parse(await fsp.readFile(FIXTURE, "utf8"));
    const fixture = fixturePackage.store;
    await bridge.storage.saveStore({ store: fixture, manifest: { counts: coreCounts(fixture) } });
    const before = (await bridge.storage.loadStore()).store;
    const beforeCore = coreCounts(before);
    const projectId = before.projects[0].id;

    const capabilities = await bridge.intakeArms.describeCapabilities();
    assert.equal(capabilities.contractVersion, "0.1");
    assert.equal(capabilities.implementationStatus, "desktop-adapter");
    assert(capabilities.operations.includes("submitEnvelope"));

    const envelope = makeEnvelope(projectId);
    const accepted = await bridge.intakeArms.submitEnvelope(envelope);
    assert.equal(accepted.status, "accepted");
    assert.equal(accepted.boundary, "airlock_pending_human_review");
    assert.equal(accepted.itemMappings.length, 2);

    const afterAcceptance = (await bridge.storage.loadStore()).store;
    assert.deepEqual(coreCounts(afterAcceptance), beforeCore, "API acceptance changed Core or Change History.");
    assert.equal(afterAcceptance.intakeBatches.length, 1);
    assert.equal(afterAcceptance.intakeItems.length, before.intakeItems.length + 2);
    const acceptedItems = afterAcceptance.intakeItems.filter((item) => item.intakeBatchId === accepted.batchId);
    assert.equal(acceptedItems.length, 2);
    for (const item of acceptedItems) {
      assert.equal(item.status, "pending");
      assert.equal(item.reviewState, "needs_review");
      assert.equal(item.queueState, "new");
      assert.equal(item.approval, null);
      assert.equal(item.archived, false);
      assert.equal(item.apiArmSubmissionId, envelope.submissionId);
    }

    const duplicate = await bridge.intakeArms.submitEnvelope(JSON.parse(JSON.stringify(envelope)));
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.batchId, accepted.batchId);
    const afterDuplicate = (await bridge.storage.loadStore()).store;
    assert.equal(afterDuplicate.intakeBatches.length, 1);
    assert.equal(afterDuplicate.intakeItems.length, afterAcceptance.intakeItems.length);

    const conflicting = makeEnvelope(projectId);
    conflicting.items[0].proposedChange.text = "Changed content with reused idempotency key";
    const conflict = await bridge.intakeArms.submitEnvelope(conflicting);
    assert.equal(conflict.status, "rejected");
    assert(conflict.errors.some((error) => error.code === "IDEMPOTENCY_CONFLICT"));

    const forbidden = makeEnvelope(projectId);
    forbidden.submissionId = "submission_fixture_forbidden";
    forbidden.idempotencyKey = "idempotency_fixture_forbidden";
    forbidden.items[0].status = "approved";
    const forbiddenResult = await bridge.intakeArms.submitEnvelope(forbidden);
    assert.equal(forbiddenResult.status, "rejected");
    assert(forbiddenResult.errors.some((error) => error.code === "FORBIDDEN_FIELD"));

    const missingTarget = makeEnvelope("project_missing");
    missingTarget.submissionId = "submission_fixture_missing";
    missingTarget.idempotencyKey = "idempotency_fixture_missing";
    const missingTargetResult = await bridge.intakeArms.submitEnvelope(missingTarget);
    assert.equal(missingTargetResult.status, "rejected");
    assert(missingTargetResult.errors.some((error) => error.code === "INVALID_TARGET_PROJECT"));

    const receipt = await bridge.intakeArms.getReceipt(envelope.submissionId);
    assert.equal(receipt.status, "accepted");
    assert.equal(receipt.batchId, accepted.batchId);
    assert.equal(await bridge.intakeArms.getReceipt("unknown_submission"), null);

    await bridge.storage.saveStore({ store: before, manifest: { counts: coreCounts(before) } });
    const afterStaleSave = (await bridge.storage.loadStore()).store;
    assert.equal(afterStaleSave.intakeBatches.length, 1, "Stale app save erased API Intake batch.");
    assert.equal(afterStaleSave.intakeItems.filter((item) => item.intakeBatchId === accepted.batchId).length, 2, "Stale app save erased API Intake items.");

    await bridge.storage.saveStore({ store: afterAcceptance, manifest: { counts: coreCounts(afterAcceptance) } });
    const afterNormalSave = (await bridge.storage.loadStore()).store;
    assert.equal(afterNormalSave.intakeBatches.length, 1, "Normal save erased API Intake batch.");
    assert.equal(afterNormalSave.intakeItems.filter((item) => item.intakeBatchId === accepted.batchId).length, 2, "Normal save erased API Intake items.");
    assert.deepEqual(coreCounts(afterNormalSave), beforeCore, "Normal save after API acceptance changed Core.");

    const backup = await bridge.storage.createBackupPackage({
      actorId: "actor_owner",
      actorName: "Owner Person",
      timestamp: "2026-06-18T12:30:00.000Z",
      reason: "Verify API arm receipt backup round trip"
    });
    const secondEnvelope = makeEnvelope(projectId);
    secondEnvelope.submissionId = "submission_fixture_002";
    secondEnvelope.idempotencyKey = "idempotency_fixture_002";
    const secondAccepted = await bridge.intakeArms.submitEnvelope(secondEnvelope);
    assert.equal(secondAccepted.status, "accepted");
    await bridge.storage.restoreBackupPackage({
      packagePath: backup.packagePath,
      actorId: "actor_owner",
      actorName: "Owner Person",
      timestamp: "2026-06-18T12:35:00.000Z",
      reason: "Verify API arm receipt restore round trip"
    });
    const afterRestore = (await bridge.storage.loadStore()).store;
    assert.equal(afterRestore.intakeBatches.length, 1, "Backup restore did not restore API Intake batches.");
    assert.equal((await bridge.intakeArms.getReceipt(envelope.submissionId)).batchId, accepted.batchId);
    assert.equal(await bridge.intakeArms.getReceipt(secondEnvelope.submissionId), null, "Restore retained API receipt created after backup.");

    console.log("API Arm Implementation Check");
    console.log(JSON.stringify({
      operations: capabilities.operations.length,
      acceptedItems: accepted.itemMappings.length,
      durableBatches: afterNormalSave.intakeBatches.length,
      exactRetryDeduplicated: true,
      idempotencyConflictRejected: true,
      forbiddenAuthorityRejected: true,
      missingTargetRejected: true,
      coreUnchanged: true,
      staleSaveMerged: true,
      normalSaveRoundTrip: true,
      backupRestoreRoundTrip: true
    }, null, 2));
    console.log("API arm implementation: ok");
  } finally {
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("API arm implementation failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
