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

    console.log("Intake Fast Lane Flow Check");
    console.log(JSON.stringify({
      proposedNewProjectWithoutExistingTarget: true,
      readyByDefaultWhenComplete: true,
      conditionalTargetFields: true,
      approvalPermissionUsesLane: true,
      addIntakeUsesFileLauncher: true,
      duplicateManualAddHidden: true
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
