const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const {
  countStoreParts,
  extractStore,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");
const {
  buildManifest,
  splitStoreRecords
} = require("./storage-phase2-split-check");
const {
  createProjectStateDesktopBridge,
  DATABASE_FILE
} = require("../desktop/project-state-desktop-bridge.cjs");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function readFixtureStore(namePrefix = "") {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const store = extractStore(payload);
  if (namePrefix && store.projects?.[0]) {
    store.projects[0].name = `${namePrefix} ${store.projects[0].name}`;
    store.projects[0].updatedAt = "2026-06-16T13:00:00.000Z";
  }
  const project = store.projects?.[0];
  if (project) {
    project.imageLinks = Array.isArray(project.imageLinks) ? project.imageLinks : [];
    project.imageLinks.unshift({
      id: `image_restore_${namePrefix || "base"}`.replace(/\s+/g, "_").toLowerCase(),
      projectId: project.id,
      attachedToType: "Project",
      attachedToId: project.id,
      fileName: `${namePrefix || "base"}-restore-fixture.png`,
      fileType: "image/png",
      dateAdded: "2026-06-16T13:00:00.000Z",
      addedBy: store.actors?.[0]?.id || "",
      caption: `${namePrefix || "Base"} restore fixture image`,
      localPath: `${namePrefix || "base"}-restore-fixture.png`,
      dataUrl: `data:image/png;base64,${Buffer.from(`${namePrefix || "base"}-restore-fixture`).toString("base64")}`
    });
  }
  return store;
}

async function saveStore(bridge, store) {
  await bridge.storage.saveStore({
    store,
    manifest: buildManifest(store),
    split: splitStoreRecords(store),
    snapshot: JSON.stringify(store)
  });
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-restore-package-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "Project State Restore Package Test Bridge" });
  const originalStore = readFixtureStore("Original");
  await saveStore(bridge, originalStore);
  const backup = await bridge.storage.createBackupPackage({
    actorId: originalStore.actors?.[0]?.id || "actor_test",
    actorName: originalStore.actors?.[0]?.name || "Test Actor",
    timestamp: "2026-06-16T13:10:00.000Z",
    reason: "Create package before restore test."
  });

  const changedStore = readFixtureStore("Changed Live");
  changedStore.projects.push({
    id: "project_restore_extra_live",
    name: "Changed Live Extra Project",
    createdAt: "2026-06-16T13:20:00.000Z",
    updatedAt: "2026-06-16T13:20:00.000Z",
    updatedBy: changedStore.actors?.[0]?.id || "",
    currentStatus: "active",
    currentSummary: "This project should disappear after restore.",
    nextAction: "",
    decisions: [],
    facts: [],
    relationships: [],
    openQuestions: [],
    nextActions: [],
    sources: [],
    draftProjects: [],
    changes: [],
    imageLinks: []
  });
  await saveStore(bridge, changedStore);
  const changedCounts = countStoreParts(changedStore);

  let missingReasonRejected = false;
  try {
    await bridge.storage.restoreBackupPackage({
      packagePath: backup.packagePath,
      actorId: originalStore.actors?.[0]?.id || "actor_test",
      timestamp: "2026-06-16T13:30:00.000Z"
    });
  } catch {
    missingReasonRejected = true;
  }
  assert(missingReasonRejected, "Restore package did not require reason.");

  let invalidPackageRejected = false;
  try {
    await bridge.storage.restoreBackupPackage({
      packagePath: path.join(storageRoot, "missing-package"),
      actorId: originalStore.actors?.[0]?.id || "actor_test",
      timestamp: "2026-06-16T13:31:00.000Z",
      reason: "Missing package should fail."
    });
  } catch {
    invalidPackageRejected = true;
  }
  assert(invalidPackageRejected, "Restore package did not validate package path.");

  const recoveryBefore = fs.readdirSync(path.join(storageRoot, "recovery")).length;
  const restore = await bridge.storage.restoreBackupPackage({
    packagePath: backup.packagePath,
    actorId: originalStore.actors?.[0]?.id || "actor_test",
    actorName: originalStore.actors?.[0]?.name || "Test Actor",
    timestamp: "2026-06-16T13:40:00.000Z",
    reason: "Restore package test."
  });
  assert(restore.ok, "Restore package did not report success.", restore);
  assert(fs.existsSync(restore.recoverySnapshot.path), "Restore did not preserve current spine to recovery.");
  assert(fs.existsSync(path.join(restore.recoverySnapshot.path, DATABASE_FILE)), "Restore recovery snapshot missing DB.");
  assert(fs.readdirSync(path.join(storageRoot, "recovery")).length > recoveryBefore, "Restore did not add recovery records.");

  const loaded = await bridge.storage.loadStore();
  const loadedCounts = countStoreParts(loaded.store);
  assert(!verifyStoreIntegrity(loaded.store).length, "Restored store failed logical integrity.", { errors: verifyStoreIntegrity(loaded.store) });
  assert(JSON.stringify(loadedCounts) === JSON.stringify(countStoreParts(originalStore)), "Restored store counts do not match backup source.", {
    loadedCounts,
    expected: countStoreParts(originalStore)
  });
  assert(loaded.store.projects[0].name === originalStore.projects[0].name, "Restore did not bring back original project name.");
  assert(!loaded.store.projects.some((project) => project.id === "project_restore_extra_live"), "Restore did not remove changed live project.");

  const recoveryDb = new DatabaseSync(path.join(restore.recoverySnapshot.path, DATABASE_FILE));
  const recoveryProjectCount = recoveryDb.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
  recoveryDb.close();
  assert(recoveryProjectCount === changedCounts.projects, "Pre-restore recovery snapshot did not preserve changed live project count.", {
    recoveryProjectCount,
    expected: changedCounts.projects
  });

  const integrity = await bridge.storage.verifyIntegrity();
  assert(integrity.ok, "Restored spine failed desktop integrity check.", integrity);

  await bridge.storage.reset();
  await fsp.rm(storageRoot, { recursive: true, force: true });

  console.log("Desktop Restore Package Check");
  console.log(JSON.stringify({
    restoredCounts: loadedCounts,
    recoveryProjectCount,
    recoverySnapshot: true,
    reasonRequired: true,
    packageValidated: true
  }, null, 2));
  console.log("Desktop restore package: ok");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Desktop restore package failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
