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
  FOLDERS,
  DATABASE_FILE
} = require("../desktop/project-state-desktop-bridge.cjs");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function readFixtureStore() {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const store = extractStore(payload);
  const project = store.projects?.[0];
  if (project) {
    project.imageLinks = Array.isArray(project.imageLinks) ? project.imageLinks : [];
    project.imageLinks.unshift({
      id: "image_desktop_bridge_fixture",
      projectId: project.id,
      attachedToType: "Project",
      attachedToId: project.id,
      fileName: "desktop-bridge-fixture.png",
      fileType: "image/png",
      dateAdded: "2026-06-15T00:00:00.000Z",
      addedBy: store.actors?.[0]?.id || "",
      caption: "Desktop bridge fixture image",
      localPath: "desktop-bridge-fixture.png",
      dataUrl: "data:image/png;base64,ZGVza3RvcC1icmlkZ2UtZml4dHVyZQ=="
    });
  }
  return store;
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function tableCount(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-desktop-spine-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "Project State Desktop Test Bridge" });
  const store = readFixtureStore();
  const manifest = buildManifest(store);
  const split = splitStoreRecords(store);
  const snapshot = JSON.stringify(store);
  const expectedCounts = countStoreParts(store);

  await bridge.storage.saveStore({ store, manifest, split, snapshot });

  const dbPath = path.join(storageRoot, DATABASE_FILE);
  assert(fs.existsSync(dbPath), "Desktop bridge did not create project-state.db.");
  for (const folder of FOLDERS) assert(fs.existsSync(path.join(storageRoot, folder)), `Desktop bridge missing folder ${folder}.`);

  const db = new DatabaseSync(dbPath);
  const tableCounts = {
    projects: tableCount(db, "projects"),
    history: tableCount(db, "changes"),
    sources: tableCount(db, "sources"),
    extracts: tableCount(db, "extracts"),
    attachments: tableCount(db, "attachments"),
    drafts: tableCount(db, "draft_projects")
  };
  db.close();

  assert(tableCounts.projects === expectedCounts.projects, "Project table count mismatch.", tableCounts);
  assert(tableCounts.extracts === expectedCounts.extracts, "Extract table count mismatch.", tableCounts);
  assert(tableCounts.attachments === expectedCounts.attachments, "Attachment table count mismatch.", tableCounts);

  const extractFiles = fs.readdirSync(path.join(storageRoot, "extracts"), { recursive: true });
  const attachmentFiles = fs.readdirSync(path.join(storageRoot, "attachments"), { recursive: true });
  assert(extractFiles.some((file) => String(file).endsWith("full-text.txt")), "Desktop bridge did not move extract text to managed files.");
  assert(attachmentFiles.some((file) => String(file).endsWith("data-url.txt")), "Desktop bridge did not move attachment data to managed files.");

  const loaded = await bridge.storage.loadStore();
  const loadedCounts = countStoreParts(loaded.store);
  assert(!verifyStoreIntegrity(loaded.store).length, "Loaded desktop store failed integrity.", { errors: verifyStoreIntegrity(loaded.store) });
  assert(JSON.stringify(loadedCounts) === JSON.stringify(expectedCounts), "Loaded desktop store counts changed.", { loadedCounts, expectedCounts });

  const textFile = path.join(storageRoot, "temp", "sample.txt");
  await fsp.writeFile(textFile, "Desktop bridge text extraction sample.", "utf8");
  const extracted = await bridge.files.extractText(textFile);
  assert(extracted.includes("Desktop bridge text extraction sample"), "Desktop file extractText failed.");

  await bridge.storage.preserveRecoveryRecord({
    stage: "desktop-bridge-test",
    message: "Recovery record test.",
    raw: JSON.stringify({ ok: true })
  });
  assert(fs.readdirSync(path.join(storageRoot, "recovery")).length > 0, "Recovery record was not preserved.");

  await bridge.downloads.saveTextFile({ fileName: "desktop-bridge-backup.json", text: "{\"ok\":true}", type: "application/json" });
  assert(fs.existsSync(path.join(storageRoot, "backups", "desktop-bridge-backup.json")), "Backup/export file was not written.");

  await bridge.storage.reset();
  assert(!fs.existsSync(dbPath), "Desktop bridge reset did not remove database file.");

  console.log("Desktop Bridge Implementation Check");
  console.log(JSON.stringify({
    storageRoot,
    tableCounts,
    loadedCounts,
    folders: FOLDERS.length
  }, null, 2));
  console.log("Desktop bridge implementation: ok");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Desktop bridge implementation failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
