const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const {
  countStoreParts,
  extractStore
} = require("./storage-phase0-baseline-check");
const {
  buildManifest,
  splitStoreRecords
} = require("./storage-phase2-split-check");
const {
  createProjectStateDesktopBridge,
  DATABASE_FILE,
  BACKUP_MANAGED_FOLDERS
} = require("../desktop/project-state-desktop-bridge.cjs");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function readFixtureStore() {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const store = extractStore(payload);
  const project = store.projects?.[0];
  if (project) {
    project.imageLinks = Array.isArray(project.imageLinks) ? project.imageLinks : [];
    project.imageLinks.unshift({
      id: "image_backup_package_fixture",
      projectId: project.id,
      attachedToType: "Project",
      attachedToId: project.id,
      fileName: "backup-package-fixture.png",
      fileType: "image/png",
      dateAdded: "2026-06-16T00:00:00.000Z",
      addedBy: store.actors?.[0]?.id || "",
      caption: "Backup package fixture image",
      localPath: "backup-package-fixture.png",
      dataUrl: "data:image/png;base64,YmFja3VwLXBhY2thZ2UtZml4dHVyZQ=="
    });
  }
  return store;
}

async function checksumFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-backup-package-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "Project State Backup Package Test Bridge" });
  const store = readFixtureStore();
  await bridge.storage.saveStore({
    store,
    manifest: buildManifest(store),
    split: splitStoreRecords(store),
    snapshot: JSON.stringify(store)
  });

  let missingActorRejected = false;
  try {
    await bridge.storage.createBackupPackage({
      timestamp: "2026-06-16T12:00:00.000Z",
      reason: "Missing actor should fail."
    });
  } catch {
    missingActorRejected = true;
  }
  assert(missingActorRejected, "Backup package did not require actor.");

  let missingReasonRejected = false;
  try {
    await bridge.storage.createBackupPackage({
      actorId: store.actors?.[0]?.id || "actor_test",
      timestamp: "2026-06-16T12:00:00.000Z"
    });
  } catch {
    missingReasonRejected = true;
  }
  assert(missingReasonRejected, "Backup package did not require reason.");

  let invalidTimestampRejected = false;
  try {
    await bridge.storage.createBackupPackage({
      actorId: store.actors?.[0]?.id || "actor_test",
      timestamp: "not-a-date",
      reason: "Invalid timestamp should fail."
    });
  } catch {
    invalidTimestampRejected = true;
  }
  assert(invalidTimestampRejected, "Backup package did not require a valid timestamp.");

  const backup = await bridge.storage.createBackupPackage({
    actorId: store.actors?.[0]?.id || "actor_test",
    actorName: store.actors?.[0]?.name || "Test Actor",
    timestamp: "2026-06-16T12:00:00.000Z",
    reason: "Desktop backup package test."
  });
  assert(backup.ok, "Backup package did not report success.", backup);
  assert(fs.existsSync(backup.packagePath), "Backup package folder was not created.");
  assert(fs.existsSync(backup.dbSnapshotPath), "Backup package missing DB snapshot.");
  assert(fs.existsSync(backup.manifestPath), "Backup package missing manifest.");

  const manifest = JSON.parse(fs.readFileSync(backup.manifestPath, "utf8"));
  assert(manifest.packageType === "desktop-backup-package", "Backup manifest package type mismatch.", manifest);
  assert(manifest.createdBy, "Backup manifest missing createdBy.");
  assert(manifest.createdAt, "Backup manifest missing createdAt.");
  assert(manifest.reason === "Desktop backup package test.", "Backup manifest reason mismatch.", manifest);
  assert(manifest.database.checksum === await checksumFile(backup.dbSnapshotPath), "Backup DB checksum mismatch.", manifest.database);
  assert(manifest.sourceIntegrity?.ok, "Backup manifest did not include passing source integrity.", manifest.sourceIntegrity);

  for (const folder of BACKUP_MANAGED_FOLDERS) {
    assert(fs.existsSync(path.join(backup.packagePath, "managed", folder)), `Backup package missing managed folder ${folder}.`);
  }
  assert(manifest.managedFiles.some((file) => file.path.endsWith("full-text.txt")), "Backup package missing managed extract text entry.");
  assert(manifest.managedFiles.some((file) => file.path.endsWith("data-url.txt")), "Backup package missing managed attachment entry.");
  for (const file of manifest.managedFiles) {
    const filePath = path.join(backup.packagePath, file.path);
    assert(fs.existsSync(filePath), `Manifest references missing managed file ${file.path}.`);
    assert(file.checksum === await checksumFile(filePath), `Managed file checksum mismatch for ${file.path}.`);
  }

  const snapshotDb = new DatabaseSync(backup.dbSnapshotPath);
  const projectCount = snapshotDb.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
  const extractCount = snapshotDb.prepare("SELECT COUNT(*) AS count FROM extracts").get().count;
  snapshotDb.close();
  const counts = countStoreParts(store);
  assert(projectCount === counts.projects, "Backup DB project count mismatch.", { projectCount, expected: counts.projects });
  assert(extractCount === counts.extracts, "Backup DB extract count mismatch.", { extractCount, expected: counts.extracts });

  await bridge.storage.reset();
  await fsp.rm(storageRoot, { recursive: true, force: true });

  console.log("Desktop Backup Package Check");
  console.log(JSON.stringify({
    packageType: manifest.packageType,
    managedFiles: manifest.managedFiles.length,
    databaseBytes: manifest.database.bytes,
    projectCount,
    extractCount,
    auditFieldsRequired: true
  }, null, 2));
  console.log("Desktop backup package: ok");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Desktop backup package failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
