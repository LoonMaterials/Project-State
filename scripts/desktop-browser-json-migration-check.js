const fs = require("fs");
const fsp = require("fs/promises");
const os = require("os");
const path = require("path");

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
  createProjectStateDesktopBridge
} = require("../desktop/project-state-desktop-bridge.cjs");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readFixtureStore() {
  const payload = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const store = extractStore(payload);
  const project = store.projects?.[0];
  if (project) {
    project.imageLinks = Array.isArray(project.imageLinks) ? project.imageLinks : [];
    project.imageLinks.unshift({
      id: "image_browser_migration_fixture",
      projectId: project.id,
      attachedToType: "Project",
      attachedToId: project.id,
      fileName: "browser-migration-fixture.png",
      fileType: "image/png",
      dateAdded: "2026-06-16T00:00:00.000Z",
      addedBy: store.actors?.[0]?.id || "",
      caption: "Browser migration fixture image",
      localPath: "browser-migration-fixture.png",
      dataUrl: "data:image/png;base64,YnJvd3Nlci1taWdyYXRpb24tZml4dHVyZQ=="
    });
  }
  return store;
}

function makeBrowserBackup(store) {
  return {
    exportedAt: "2026-06-16T00:00:00.000Z",
    app: "Project State",
    backupType: "full-storage-spine",
    storage: {
      primary: "IndexedDB split stores",
      platformAdapter: "browser",
      backup: "User-controlled JSON file",
      storageMode: "indexeddb-split"
    },
    schemaVersion: store.schemaVersion,
    store
  };
}

function collectIds(store) {
  const ids = [];
  const add = (id) => {
    if (id) ids.push(id);
  };
  for (const actor of store.actors || []) add(actor.id);
  for (const intake of store.intakeItems || []) add(intake.id);
  for (const project of store.projects || []) {
    add(project.id);
    for (const list of [project.decisions, project.facts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes]) {
      for (const item of list || []) add(item.id);
    }
    for (const source of project.sources || []) {
      add(source.id);
      for (const extract of source.extracts || []) add(extract.id);
    }
    for (const image of collectProjectImages(project)) add(image.id);
  }
  return ids.sort();
}

function collectProjectImages(project) {
  const images = [];
  const collect = (ownerType, ownerId, links = []) => {
    for (const image of links || []) images.push({ ...image, attachedToType: image.attachedToType || ownerType, attachedToId: image.attachedToId || ownerId, projectId: image.projectId || project.id });
  };
  collect("Project", project.id, project.imageLinks);
  for (const decision of project.decisions || []) collect("Decision", decision.id, decision.imageLinks);
  for (const fact of project.facts || []) collect("Fact", fact.id, fact.imageLinks);
  for (const relationship of project.relationships || []) collect("Relationship", relationship.id, relationship.imageLinks);
  for (const question of project.openQuestions || []) collect("OpenQuestion", question.id, question.imageLinks);
  for (const action of project.nextActions || []) collect("NextAction", action.id, action.imageLinks);
  for (const change of project.changes || []) collect("Change", change.id, change.imageLinks);
  for (const draft of project.draftProjects || []) collect("DraftProject", draft.id, draft.imageLinks);
  for (const source of project.sources || []) {
    collect("Source", source.id, source.imageLinks);
    for (const extract of source.extracts || []) collect("Extract", extract.id, extract.imageLinks);
  }
  return images;
}

function verifyLinksPreserved(before, after) {
  const afterProjects = new Map((after.projects || []).map((project) => [project.id, project]));
  for (const project of before.projects || []) {
    const afterProject = afterProjects.get(project.id);
    assert(afterProject, `Missing migrated project ${project.id}.`);
    assert((afterProject.changes || []).length === (project.changes || []).length, `History count changed for project ${project.id}.`);

    const afterSources = new Map((afterProject.sources || []).map((source) => [source.id, source]));
    for (const source of project.sources || []) {
      const afterSource = afterSources.get(source.id);
      assert(afterSource, `Missing migrated source ${source.id}.`);
      const afterExtracts = new Set((afterSource.extracts || []).map((extract) => extract.id));
      for (const extract of source.extracts || []) assert(afterExtracts.has(extract.id), `Missing migrated extract ${extract.id}.`);
    }

    const afterDrafts = new Map((afterProject.draftProjects || []).map((draft) => [draft.id, draft]));
    for (const draft of project.draftProjects || []) {
      const afterDraft = afterDrafts.get(draft.id);
      assert(afterDraft, `Missing migrated draft ${draft.id}.`);
      assert(afterDraft.sourceId === draft.sourceId, `Draft ${draft.id} source link changed.`);
      assert(afterDraft.extractId === draft.extractId, `Draft ${draft.id} extract link changed.`);
    }
  }
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-browser-migration-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot, label: "Project State Browser Migration Test Bridge" });

  const existingStore = readFixtureStore();
  existingStore.projects[0].name = "Existing Desktop Sentinel";
  await bridge.storage.saveStore({
    store: existingStore,
    manifest: buildManifest(existingStore),
    split: splitStoreRecords(existingStore),
    snapshot: JSON.stringify(existingStore)
  });
  const existingCounts = countStoreParts(existingStore);

  const badStore = clone(existingStore);
  badStore.projects[0].id = "";
  const recoveryBeforeBadImport = fs.readdirSync(path.join(storageRoot, "recovery")).length;
  let badImportFailed = false;
  try {
    await bridge.storage.importBrowserExport({
      raw: JSON.stringify(makeBrowserBackup(badStore)),
      reason: "Bad import should be rejected.",
      actorId: existingStore.actors?.[0]?.id || "",
      sourceFile: "bad-browser-export.json"
    });
  } catch {
    badImportFailed = true;
  }
  assert(badImportFailed, "Invalid browser export was not rejected.");
  const afterBadImport = await bridge.storage.loadStore();
  assert(afterBadImport.store.projects[0].name === "Existing Desktop Sentinel", "Failed migration changed existing desktop data.");
  assert(JSON.stringify(countStoreParts(afterBadImport.store)) === JSON.stringify(existingCounts), "Failed migration changed existing desktop counts.");
  assert(fs.readdirSync(path.join(storageRoot, "recovery")).length > recoveryBeforeBadImport, "Failed migration did not preserve recovery data.");

  const browserStore = readFixtureStore();
  const browserPayload = makeBrowserBackup(browserStore);
  const migrationResult = await bridge.storage.importBrowserExport({
    raw: JSON.stringify(browserPayload),
    reason: "Controlled browser export migration test.",
    actorId: browserStore.actors?.[0]?.id || "",
    sourceFile: "browser-project-state-backup.json"
  });
  assert(migrationResult.ok, "Browser migration did not report success.", migrationResult);

  const loaded = await bridge.storage.loadStore();
  const integrity = await bridge.storage.verifyIntegrity();
  assert(integrity.ok, "Migrated desktop spine failed integrity.", integrity);
  assert(!verifyStoreIntegrity(loaded.store).length, "Migrated store failed logical integrity.", { errors: verifyStoreIntegrity(loaded.store) });
  assert(JSON.stringify(countStoreParts(loaded.store)) === JSON.stringify(countStoreParts(browserStore)), "Migrated store counts changed.", {
    expected: countStoreParts(browserStore),
    loaded: countStoreParts(loaded.store)
  });
  assert(JSON.stringify(collectIds(loaded.store)) === JSON.stringify(collectIds(browserStore)), "Stable IDs were not preserved.");
  verifyLinksPreserved(browserStore, loaded.store);

  await bridge.storage.reset();

  console.log("Desktop Browser JSON Migration Check");
  console.log(JSON.stringify({
    importedCounts: countStoreParts(loaded.store),
    idCount: collectIds(loaded.store).length,
    historyCount: countStoreParts(loaded.store).changes,
    recoveryRecordsCreated: true,
    linksPreserved: true
  }, null, 2));
  console.log("Browser JSON migration: ok");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Desktop browser JSON migration failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
