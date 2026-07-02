const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function removeTempRoot(root) {
  await fsp.rm(root, { recursive: true, force: true }).catch(() => {});
}

function testStore({ projects = [], intakeItems = [], intakeBatches = [] } = {}) {
  return {
    schemaVersion: "0.1.0",
    settings: {
      setupCompletedAt: "2026-07-02T10:00:00.000Z",
      primaryActorId: "actor_owner",
      backupLocationHint: "",
      backupReminder: "manual",
      language: "en",
      localMode: "single_user_local",
      recoveryWarnings: true,
      storageSystem: "platform_storage_spine",
      storageOverrideAcknowledged: false,
      storageOverrideReason: "",
      backupSystem: "user_controlled_backup",
      backupOverrideAcknowledged: false,
      backupOverrideReason: "",
      archivedDeletionLog: [],
      uiState: { recentProjectIds: [], lastProjectId: "", lastProjectView: "dashboard", projectScrollPositions: {}, lastImportFolders: {} },
      historyPolicyVersion: "0.1",
      mandatoryHistory: true,
      mandatoryHistoryFields: ["who", "when", "why"]
    },
    actors: [{ id: "actor_owner", name: "Owner", type: "Human", role: "owner", status: "active", createdAt: "2026-07-02T10:00:00.000Z" }],
    intakeBatches,
    intakeItems,
    aiWorkOrders: [],
    projects
  };
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-archive-merge-"));
  try {
    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const archivedProject = {
      id: "project_archived",
      name: "Archived Fixture",
      archived: true,
      currentStatus: "Archived",
      currentSummary: "Archived test project",
      healthFlag: "active",
      createdAt: "2026-07-02T10:00:00.000Z",
      updatedAt: "2026-07-02T10:00:00.000Z",
      updatedBy: "actor_owner",
      decisions: [],
      facts: [],
      conflicts: [],
      sources: [],
      draftProjects: [],
      relationships: [],
      openQuestions: [],
      nextActions: [],
      changes: []
    };
    const archivedIntake = {
      id: "intake_archived",
      intakeBatchId: "batch_archived",
      projectId: "project_archived",
      status: "pending",
      archived: true,
      title: "Archived intake fixture",
      createdAt: "2026-07-02T10:00:00.000Z",
      createdBy: "actor_owner",
      armType: "discovery",
      proposedObjectType: "Source",
      proposedChange: { text: "Archived", summary: "Archived" }
    };

    await bridge.storage.saveStore({ store: testStore({ projects: [archivedProject], intakeItems: [archivedIntake], intakeBatches: [{ id: "batch_archived", status: "open" }] }) });
    const firstLoad = await bridge.storage.loadStore();
    assert(firstLoad.store.intakeItems.length === 1, "Fixture archived intake was not persisted.", firstLoad.store);

    await bridge.storage.saveStore({ store: testStore(), preserveConcurrentApiIntake: false });
    const afterDelete = await bridge.storage.loadStore();
    assert(afterDelete.store.projects.length === 0, "Archived project was not deleted.", afterDelete.store.projects);
    assert(afterDelete.store.intakeItems.length === 0, "Archived intake was re-merged after delete-all archived.", afterDelete.store.intakeItems);

    const appSource = await fsp.readFile(path.join(__dirname, "..", "app.js"), "utf8");
    assert(appSource.includes("preserveConcurrentApiIntake: false"), "Archive delete UI does not disable persisted intake re-merge.");

    console.log("Archive Deletion Intake Merge Check");
    console.log(JSON.stringify({ deletedProjects: true, deletedArchivedIntake: true, preserveMergeDisabledForArchiveDelete: true }, null, 2));
    console.log("Archive deletion intake merge: ok");
  } finally {
    await removeTempRoot(storageRoot);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Archive deletion intake merge failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
