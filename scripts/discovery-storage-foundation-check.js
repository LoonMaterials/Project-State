const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const {
  createProjectStateDesktopBridge,
  DATABASE_FILE,
  FOLDERS,
  BACKUP_MANAGED_FOLDERS
} = require("../desktop/project-state-desktop-bridge.cjs");
const { extractStore } = require("./storage-phase0-baseline-check");
const { buildManifest, splitStoreRecords } = require("./storage-phase2-split-check");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
const TIME = "2026-06-19T16:00:00.000Z";

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function expectRejected(operation, messageIncludes) {
  let error = null;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  assert(error, `Expected rejection containing: ${messageIncludes}`);
  assert(error.message.includes(messageIncludes), "Rejection message mismatch.", { actual: error.message, expected: messageIncludes });
}

function createLegacyDatabase(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      record_json TEXT NOT NULL
    );
  `);
  const record = { id: "project_legacy_preserved", name: "Legacy preserved project" };
  db.prepare("INSERT INTO projects (id, name, archived, updated_at, record_json) VALUES (?, ?, 0, ?, ?)")
    .run(record.id, record.name, TIME, JSON.stringify(record));
  db.close();
}

async function saveLegacyFixtureStore(bridge) {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const store = extractStore(payload);
  await bridge.storage.saveStore({
    store,
    manifest: buildManifest(store),
    split: splitStoreRecords(store),
    snapshot: JSON.stringify(store)
  });
  return store;
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-discovery-foundation-"));
  const dbPath = path.join(storageRoot, DATABASE_FILE);
  createLegacyDatabase(dbPath);
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "Discovery Foundation Test Bridge" });

  const initialized = await bridge.discoveryStorage.initialize();
  assert(initialized.schema?.version === "0.1", "Discovery schema migration marker is missing.", initialized);
  for (const folder of FOLDERS) assert(fs.existsSync(path.join(storageRoot, folder)), `Managed folder missing after additive migration: ${folder}`);

  const migratedDb = new DatabaseSync(dbPath);
  const legacyProject = migratedDb.prepare("SELECT record_json FROM projects WHERE id = ?").get("project_legacy_preserved");
  migratedDb.close();
  assert(legacyProject, "Additive schema migration removed an existing project row.");

  const fileBytes = Buffer.from("Discovery foundation exact bytes\n", "utf8");
  const checksum = sha256(fileBytes);
  const managedPath = "quarantine/asset_foundation/version_foundation/original.txt";
  const physicalPath = path.join(storageRoot, ...managedPath.split("/"));
  await fsp.mkdir(path.dirname(physicalPath), { recursive: true });
  await fsp.writeFile(physicalPath, fileBytes);
  await fsp.mkdir(path.join(storageRoot, "discovery", "case_foundation"), { recursive: true });
  await fsp.writeFile(path.join(storageRoot, "discovery", "case_foundation", "foundation-marker.json"), "{\"stage\":\"storage\"}\n", "utf8");

  const registered = await bridge.discoveryStorage.registerFileVersion({
    fileAssetId: "asset_foundation",
    fileVersionId: "version_foundation",
    sha256: checksum,
    byteSize: fileBytes.length,
    originalName: "original.txt",
    managedPath,
    createdAt: TIME,
    privacyClass: "local_only"
  });
  assert(!registered.deduplicated, "First File Version registration was incorrectly deduplicated.", registered);

  const duplicate = await bridge.discoveryStorage.registerFileVersion({
    fileAssetId: "asset_duplicate_request",
    fileVersionId: "version_duplicate_request",
    sha256: checksum,
    byteSize: fileBytes.length,
    originalName: "duplicate-name.txt",
    managedPath,
    createdAt: TIME,
    privacyClass: "local_only"
  });
  assert(duplicate.deduplicated, "Exact-byte duplicate was not deduplicated.", duplicate);
  assert(duplicate.fileAsset.id === "asset_foundation", "Duplicate did not resolve to the original File Asset.", duplicate);
  assert(duplicate.fileVersion.id === "version_foundation", "Duplicate created a second immutable File Version.", duplicate);

  await expectRejected(() => bridge.discoveryStorage.registerFileVersion({
    fileAssetId: "asset_bad_path",
    fileVersionId: "version_bad_path",
    sha256: checksum,
    byteSize: fileBytes.length,
    originalName: "original.txt",
    managedPath: "sources/original.txt",
    createdAt: TIME
  }), "inside quarantine");

  const createdCase = await bridge.discoveryStorage.createCase({
    id: "case_foundation",
    createdBy: "actor_owner",
    createdAt: TIME,
    stage: "quarantine",
    status: "created",
    title: "Unassigned Discovery case"
  });
  assert(createdCase.discoveryCase.confirmedProjectId === null, "Discovery Case unexpectedly requires a project.", createdCase);

  await bridge.discoveryStorage.attachFileVersion({
    id: "case_file_foundation",
    discoveryCaseId: "case_foundation",
    fileAssetId: "asset_foundation",
    fileVersionId: "version_foundation",
    addedAt: TIME,
    groupingRationale: "Single selected file."
  });

  await expectRejected(() => bridge.discoveryStorage.appendInteraction({
    id: "interaction_machine_forbidden",
    discoveryCaseId: "case_foundation",
    actorId: "tool_parser",
    actorType: "tool",
    interactionType: "user_answer",
    createdAt: TIME,
    content: "A tool must not impersonate the user."
  }), "Only a human actor");

  await bridge.discoveryStorage.appendInteraction({
    id: "interaction_machine_suggestion",
    discoveryCaseId: "case_foundation",
    actorId: "tool_parser",
    actorType: "tool",
    interactionType: "machine_suggestion",
    createdAt: TIME,
    content: "Possible project name",
    confidence: 0.5
  });
  await bridge.discoveryStorage.appendInteraction({
    id: "interaction_human_answer",
    discoveryCaseId: "case_foundation",
    actorId: "actor_owner",
    actorType: "human",
    interactionType: "user_answer",
    createdAt: "2026-06-19T16:01:00.000Z",
    content: "Not sure"
  });

  await expectRejected(
    () => bridge.files.readAsText({ managedPath }),
    "No Security Receipt exists"
  );

  const wrongChecksum = "f".repeat(64) === checksum ? "e".repeat(64) : "f".repeat(64);
  await expectRejected(() => bridge.discoveryStorage.appendSecurityReceipt({
    id: "receipt_wrong_checksum",
    scanJobId: "scan_wrong_checksum",
    fileAssetId: "asset_foundation",
    fileVersionId: "version_foundation",
    sha256: wrongChecksum,
    verdict: "clean",
    providerId: "test_provider",
    startedAt: TIME,
    completedAt: "2026-06-19T16:00:30.000Z"
  }), "FOREIGN KEY");

  const receipt = await bridge.discoveryStorage.appendSecurityReceipt({
    id: "receipt_foundation",
    scanJobId: "scan_foundation",
    fileAssetId: "asset_foundation",
    fileVersionId: "version_foundation",
    sha256: checksum,
    verdict: "clean",
    providerId: "test_provider",
    startedAt: TIME,
    completedAt: "2026-06-19T16:00:30.000Z"
  });
  assert(receipt.securityReceipt.eligible === true, "Clean exact-checksum receipt was not marked eligible in storage.", receipt);
  const authorized = await bridge.securityArms.authorizeContentAccess({ managedPath });
  assert(authorized.ok && authorized.governed && authorized.receiptId === "receipt_foundation", "Exact-checksum authorization failed.", authorized);
  assert(await bridge.files.readAsText({ managedPath }) === fileBytes.toString("utf8"), "Authorized quarantine read returned incorrect content.");

  await fsp.writeFile(physicalPath, Buffer.from("tampered bytes\n", "utf8"));
  await expectRejected(
    () => bridge.files.readAsText({ managedPath }),
    "no longer matches"
  );
  await fsp.writeFile(physicalPath, fileBytes);

  await bridge.discoveryStorage.appendEvent({
    id: "event_case_created",
    discoveryCaseId: "case_foundation",
    eventType: "case_created",
    actorId: "actor_owner",
    actorType: "human",
    occurredAt: TIME
  });

  const stateBeforeSave = await bridge.discoveryStorage.readFoundationState({ discoveryCaseId: "case_foundation" });
  assert(stateBeforeSave.counts.fileAssets === 1, "Unexpected File Asset count.", stateBeforeSave.counts);
  assert(stateBeforeSave.counts.fileVersions === 1, "Unexpected File Version count.", stateBeforeSave.counts);
  assert(stateBeforeSave.counts.discoveryCases === 1, "Unexpected Discovery Case count.", stateBeforeSave.counts);
  assert(stateBeforeSave.counts.interactions === 2, "Unexpected Interaction count.", stateBeforeSave.counts);
  assert(stateBeforeSave.counts.securityReceipts === 1, "Unexpected Security Receipt count.", stateBeforeSave.counts);

  const immutableDb = new DatabaseSync(dbPath);
  for (const sql of [
    "UPDATE file_versions SET original_name = 'changed.txt' WHERE id = 'version_foundation'",
    "DELETE FROM security_receipts WHERE id = 'receipt_foundation'",
    "UPDATE discovery_interactions SET actor_type = 'human' WHERE id = 'interaction_machine_suggestion'",
    "DELETE FROM discovery_events WHERE id = 'event_case_created'"
  ]) {
    let blocked = false;
    try { immutableDb.exec(sql); } catch { blocked = true; }
    assert(blocked, "Append-only database trigger did not block mutation.", { sql });
  }
  immutableDb.close();

  const legacyStore = await saveLegacyFixtureStore(bridge);
  const stateAfterLegacySave = await bridge.discoveryStorage.readFoundationState({ discoveryCaseId: "case_foundation" });
  assert(stateAfterLegacySave.counts.discoveryCases === 1, "Legacy saveStore erased Discovery records.", stateAfterLegacySave.counts);

  const integrity = await bridge.storage.verifyIntegrity();
  assert(integrity.ok, "Discovery foundation failed desktop integrity.", integrity);
  assert(integrity.checkedFiles.quarantine === 1, "Integrity did not verify the quarantined File Version.", integrity.checkedFiles);

  const backup = await bridge.storage.createBackupPackage({
    actorId: legacyStore.actors[0].id,
    actorName: legacyStore.actors[0].name,
    timestamp: "2026-06-19T16:10:00.000Z",
    reason: "Discovery storage foundation backup test."
  });
  for (const folder of ["quarantine", "discovery"]) {
    assert(BACKUP_MANAGED_FOLDERS.includes(folder), `Backup policy excludes ${folder}.`);
    assert(fs.existsSync(path.join(backup.packagePath, "managed", folder)), `Backup package is missing ${folder}.`);
  }

  await bridge.discoveryStorage.createCase({
    id: "case_after_backup",
    createdBy: "actor_owner",
    createdAt: "2026-06-19T16:11:00.000Z",
    stage: "quarantine",
    status: "created"
  });
  await bridge.storage.restoreBackupPackage({
    packagePath: backup.packagePath,
    actorId: legacyStore.actors[0].id,
    actorName: legacyStore.actors[0].name,
    timestamp: "2026-06-19T16:20:00.000Z",
    reason: "Discovery storage foundation restore test."
  });

  const restored = await bridge.discoveryStorage.readFoundationState();
  assert(restored.discoveryCases.some((item) => item.id === "case_foundation"), "Restore lost the backed-up Discovery Case.", restored);
  assert(!restored.discoveryCases.some((item) => item.id === "case_after_backup"), "Restore retained post-backup Discovery data.", restored);
  assert(restored.securityReceipts.some((item) => item.id === "receipt_foundation"), "Restore lost the Security Receipt.", restored);
  assert(fs.existsSync(physicalPath), "Restore lost quarantined immutable bytes.");

  await bridge.storage.reset();
  const afterReset = await bridge.discoveryStorage.initialize();
  assert(Object.values(afterReset.counts).every((count) => count === 0), "Reset did not clear Discovery foundation records.", afterReset.counts);
  for (const folder of FOLDERS) assert(fs.existsSync(path.join(storageRoot, folder)), `Reset did not recreate managed folder: ${folder}`);

  await bridge.storage.reset();
  await fsp.rm(storageRoot, { recursive: true, force: true });

  console.log("Discovery Storage Foundation Check");
  console.log(JSON.stringify({
    additiveMigrationPreservedLegacyRow: true,
    managedFolders: FOLDERS.length,
    discoveryTables: Object.keys(initialized.counts).length,
    exactByteDeduplication: true,
    projectOptional: true,
    machineAuthorityBlocked: true,
    appendOnlyTriggers: 4,
    exactChecksumReceipt: true,
    quarantineReadGate: true,
    changedBytesFailClosed: true,
    legacySavePreservedDiscovery: true,
    backupRestoreRoundTrip: true,
    resetVerified: true
  }, null, 2));
  console.log("Discovery storage foundation: ok");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Discovery storage foundation failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
