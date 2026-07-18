const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function main() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-intake-fast-lane-"));
  const storageRoot = path.join(tempRoot, "storage");
  const inputRoot = path.join(tempRoot, "input");
  try {
    await fsp.mkdir(inputRoot, { recursive: true });
    const filePath = path.join(inputRoot, "known-project-notes.md");
    await fsp.writeFile(filePath, "# Known Project\nThis should become a proposed new project without requiring an existing target project.\n", "utf8");

    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const staged = await bridge.discoveryStorage.stageTrustedFile({
      path: filePath,
      actorId: "actor_owner",
      reason: "Trusted fast-lane intake fixture.",
      externalSecurityAcknowledged: true,
      timestamp: "2026-07-03T10:00:00.000Z"
    });
    await bridge.discoveryStorage.extractFileVersion({
      discoveryCaseId: staged.discoveryCaseId,
      fileVersionId: staged.fileVersionId,
      actorId: "project_state_deterministic",
      createdAt: "2026-07-03T10:01:00.000Z"
    });
    await bridge.discoveryStorage.confirmRouting({
      discoveryCaseId: staged.discoveryCaseId,
      actorId: "actor_owner",
      destination: "proposed_new_project",
      proposedProjectName: "Known Project",
      confirmedAt: "2026-07-03T10:02:00.000Z"
    });
    const promotion = await bridge.discoveryStorage.promoteToIntake({
      discoveryCaseId: staged.discoveryCaseId,
      actorId: "actor_owner",
      promotedAt: "2026-07-03T10:03:00.000Z",
      reason: "Promote proposed new project fast-lane fixture."
    });
    assert(promotion.intakeItemIds.length === 1, "Expected one proposed-new-project intake item.", promotion);

    const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const intake = JSON.parse(db.prepare("SELECT record_json FROM intake_items LIMIT 1").get().record_json);
    db.close();
    assert(intake.projectId === "", "Proposed-new-project intake should not require an existing target project.", intake);
    assert(intake.destination === "proposed_new_project" && intake.proposedProjectName === "Known Project", "Proposed project routing was not preserved.", intake);
    assert(intake.queueState === "ready", "Complete proposed-new-project intake should land ready for final approval.", intake);
    assert(intake.proposedChange?.text && intake.proposedObjectType === "Source", "Fast-lane intake lost required proposal fields.", intake);

    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    assert(appSource.includes("function intakePermissionProject"), "Approval permission must not require an existing project for proposed-new-project intake.");
    assert(appSource.includes('data-action="show-files">${escapeHtml(t("addIntake"))}'), "The main Add Intake door should use the file/folder intake launcher.");
    assert(!appSource.includes('data-action="create-intake"'), "The duplicate manual Add Intake button should not be exposed in the UI.");
    assert(appSource.includes("Add files or folders. Known project material"), "The Add Intake launcher should explain file/folder intake.");
    assert(appSource.includes("Known project material") && appSource.includes("Discovery scan"), "The Add Intake launcher should separate known project material from Discovery scanning.");
    assert(appSource.includes("data-existing-target"), "Review form should hide/show existing-target fields conditionally.");
    assert(appSource.includes("data-new-target"), "Review form should hide/show proposed-new-project fields conditionally.");
    assert(appSource.includes('if (route === "rejected") completeRejectedIntake(intake, actor, data.reason);'), "Queue review rejection must use the governed completion path.");
    assert(appSource.includes('reason: route === "rejected" ? "intake-rejected-during-routing" : "intake-queue-reviewed"'), "Queue review rejection must be persisted as a completed rejection.");
    assert(appSource.includes('if (route === "rejected" && linkedWorkOrderId) await reconcileAiWorkOrderLifecycle(linkedWorkOrderId);'), "Queue review rejection must reconcile its linked AI Work Order.");
    assert(appSource.includes("Reject duplicate intra-folder project suggestion"), "Queue review needs rejection reason presets for Discovery cleanup.");
    assert(!appSource.includes("queuePostModalAction(() => openApproveIntakeModal(next.id))"), "Core approval must not auto-open the next approval item.");
    const singleApproval = appSource.slice(appSource.indexOf("function openApproveIntakeModal"), appSource.indexOf("function openReviewIntakeQueueModal"));
    const batchApproval = appSource.slice(appSource.indexOf("function openBatchTriageModal"), appSource.indexOf("function openRejectIntakeModal"));
    assert(singleApproval.includes('activeRootView = "intake"') && !singleApproval.includes("openProjectNow("), "Single Intake approval must return to the Intake Airlock.");
    assert(batchApproval.includes('value="bulk_approve"') && batchApproval.includes('data-bulk-ready'), "Batch Triage must expose bulk approval only for ready Intake items.");
    assert(batchApproval.includes('confirmationField("confirmProposalReviewed"') && batchApproval.includes('confirmationField("confirmApprovalWritesCore"') && batchApproval.includes('confirmationField("confirmInputsNotAuthority"'), "Bulk approval must preserve the human Core-write confirmations.");
    assert(batchApproval.includes("approveIntakeItem(") && batchApproval.includes("{ save: false }") && batchApproval.includes("beforeBulkApproval = cloneRecord(store)"), "Bulk approval must create per-item receipts and retain an atomic rollback boundary.");
    assert(appSource.includes('intake.archived = true;') && appSource.includes('outcome: "approved"'), "Approved Intake must automatically leave the active Airlock with a completion receipt.");
    assert(appSource.includes('outcome: "rejected"') && appSource.includes('Completed Intake history'), "Rejected Intake must move into collapsed completion history.");
    assert(appSource.includes("function renderIntakeReceipt") && appSource.includes("Receipt and provenance"), "Completed Intake history must render a compact audit receipt.");
    assert(appSource.includes('filter((item) => item.status === "pending" && !item.archived)'), "Only unfinished Intake proposals should remain in the active Airlock.");

    console.log("Intake Fast Lane Flow Check");
    console.log(JSON.stringify({
      proposedNewProjectWithoutExistingTarget: true,
      readyByDefaultWhenComplete: true,
      conditionalTargetFields: true,
      approvalPermissionUsesLane: true,
      addIntakeUsesFileLauncher: true,
      duplicateManualAddHidden: true,
      queueReviewRejectsPendingItem: true,
      queueReviewRejectionUsesCompletionReceipt: true,
      queueReviewRejectionReconcilesWorkOrder: true,
      rejectionReasonPresets: true,
      singleApprovalReturnsToIntake: true,
      bulkApprovalReadyOnly: true,
      bulkApprovalPerItemReceipts: true,
      bulkApprovalAtomicRollback: true,
      approvedAndRejectedAutoComplete: true,
      completedHistoryCollapsed: true,
      compactReceiptPreserved: true
    }, null, 2));
    console.log("Intake fast lane flow: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Intake fast lane flow failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
