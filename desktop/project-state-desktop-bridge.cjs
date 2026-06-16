const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.join(__dirname, "..");
const SCHEMA_FILE = path.join(__dirname, "spine-schema.sql");
const DEFAULT_STORAGE_ROOT = path.join(os.homedir(), "Project State Storage");
const DATABASE_FILE = "project-state.db";
const FOLDERS = ["sources", "extracts", "attachments", "backups", "recovery", "manifests", "logs", "temp"];
const SPLIT_TABLES = ["projects", "changes", "sources", "extracts", "attachments", "draft_projects"];

function createProjectStateDesktopBridge(options = {}) {
  const storageRoot = path.resolve(options.storageRoot || process.env.PROJECT_STATE_STORAGE_ROOT || DEFAULT_STORAGE_ROOT);
  const dbPath = path.join(storageRoot, DATABASE_FILE);

  return {
    label: options.label || "Project State Desktop Bridge",
    storageRoot,
    storage: {
      async loadStore(context = {}) {
        return loadStore({ storageRoot, dbPath, context });
      },
      async saveStore(payload = {}) {
        return saveStore({ storageRoot, dbPath, payload });
      },
      async saveMeta(payload = {}) {
        return saveMeta({ storageRoot, dbPath, payload });
      },
      async preserveLegacyRaw(raw = "") {
        return preserveLegacyRaw({ storageRoot, dbPath, raw });
      },
      async preserveRecoveryRecord(issue = {}) {
        return preserveRecoveryRecord({ storageRoot, dbPath, issue });
      },
      async reset() {
        return resetSpine({ storageRoot, dbPath });
      }
    },
    files: {
      metadata,
      localPath,
      readAsDataUrl,
      readAsText,
      readAsArrayBuffer,
      extractText,
      async inflateRaw(bytes) {
        return new Uint8Array(zlib.inflateRawSync(Buffer.from(bytes)));
      }
    },
    downloads: {
      async saveTextFile({ fileName, text, type = "text/plain" } = {}) {
        return saveTextFile({ storageRoot, fileName, text, type });
      }
    }
  };
}

async function ensureSpine(storageRoot) {
  await fsp.mkdir(storageRoot, { recursive: true });
  await Promise.all(FOLDERS.map((folder) => fsp.mkdir(path.join(storageRoot, folder), { recursive: true })));
}

function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(fs.readFileSync(SCHEMA_FILE, "utf8"));
  return db;
}

async function loadStore({ storageRoot, dbPath }) {
  await ensureSpine(storageRoot);
  if (!fs.existsSync(dbPath)) return { source: "desktop-spine", store: null, raw: "", meta: null };
  const db = openDatabase(dbPath);
  try {
    const metaRecord = readMeta(db, "store");
    if (!metaRecord) return { source: "desktop-spine", store: null, raw: "", meta: null };
    const split = readSplitRecords(db);
    const store = await rebuildStoreFromSplitRecords(storageRoot, split);
    const manifest = readMeta(db, "manifest") || {};
    return {
      source: "desktop-spine",
      store,
      raw: JSON.stringify(store),
      meta: manifest
    };
  } catch (error) {
    const snapshot = readMeta(db, "snapshot");
    if (snapshot?.store) {
      return {
        source: "desktop-spine-snapshot-recovery",
        store: snapshot.store,
        raw: JSON.stringify(snapshot.store),
        meta: readMeta(db, "manifest") || null
      };
    }
    throw error;
  } finally {
    db.close();
  }
}

async function saveStore({ storageRoot, dbPath, payload }) {
  await ensureSpine(storageRoot);
  const store = payload.store || {};
  const manifest = payload.manifest || {};
  const split = payload.split || splitStoreRecordsForBridge(store, manifest);
  const splitMeta = Array.isArray(split.meta) ? split.meta[0] : split.meta;
  const snapshot = payload.snapshot || JSON.stringify(store);
  const db = openDatabase(dbPath);

  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    clearWritableTables(db);
    writeMeta(db, "manifest", manifest);
    writeMeta(db, "store", splitMeta || {});
    writeMeta(db, "snapshot", { store, snapshotBytes: Buffer.byteLength(snapshot, "utf8") });

    writeActors(db, splitMeta?.actors || store.actors || []);
    writeIntakeItems(db, splitMeta?.intakeItems || store.intakeItems || []);
    writeProjects(db, split.projects || []);
    writeProjectChildren(db, split.projects || []);
    writeHistory(db, split.history || []);
    writeSources(db, split.sources || []);
    await writeExtracts(db, storageRoot, split.extracts || []);
    await writeAttachments(db, storageRoot, split.attachments || []);
    writeDrafts(db, split.drafts || []);
    writeSourceLinks(db, store);

    const manifestPath = await writeManifestFile(storageRoot, manifest, store);
    writeMeta(db, "latest_manifest_file", { path: manifestPath });
    db.exec("COMMIT");
    return { ok: true, source: "desktop-spine", manifestPath };
  } catch (error) {
    db.exec("ROLLBACK");
    await preserveRecoveryRecord({
      storageRoot,
      dbPath,
      issue: {
        stage: "desktop-save",
        message: error.message,
        stack: error.stack || "",
        raw: snapshot
      }
    });
    throw error;
  } finally {
    db.close();
  }
}

async function saveMeta({ storageRoot, dbPath, payload }) {
  await ensureSpine(storageRoot);
  const db = openDatabase(dbPath);
  try {
    writeMeta(db, "manifest", payload.manifest || payload);
    return { ok: true };
  } finally {
    db.close();
  }
}

async function preserveLegacyRaw({ storageRoot, dbPath, raw }) {
  await ensureSpine(storageRoot);
  const filePath = path.join(storageRoot, "recovery", `legacy-json-${safeStamp()}.json`);
  await fsp.writeFile(filePath, String(raw || ""), "utf8");
  await preserveRecoveryRecord({
    storageRoot,
    dbPath,
    issue: {
      stage: "legacy-json-backup",
      message: "Legacy JSON preserved during desktop spine migration.",
      managedPath: relativeManagedPath(storageRoot, filePath)
    }
  });
  return { ok: true, path: filePath };
}

async function preserveRecoveryRecord({ storageRoot, dbPath, issue }) {
  await ensureSpine(storageRoot);
  const id = issue.id || makeId("recovery");
  const raw = issue.raw || issue.store || "";
  let managedPath = issue.managedPath || "";
  if (raw) {
    const filePath = path.join(storageRoot, "recovery", `${id}.json`);
    await fsp.writeFile(filePath, typeof raw === "string" ? raw : JSON.stringify(raw, null, 2), "utf8");
    managedPath = relativeManagedPath(storageRoot, filePath);
  }
  const record = {
    id,
    date: issue.date || nowIso(),
    ...issue,
    managedPath
  };
  const db = openDatabase(dbPath);
  try {
    insertJson(db, "recovery_records", {
      id: record.id,
      date: record.date,
      stage: record.stage || "",
      message: record.message || "",
      managed_path: record.managedPath || "",
      record_json: JSON.stringify(record)
    });
  } finally {
    db.close();
  }
  return { ok: true, id, managedPath };
}

async function resetSpine({ storageRoot, dbPath }) {
  await ensureSpine(storageRoot);
  if (fs.existsSync(dbPath)) await fsp.rm(dbPath, { force: true });
  for (const folder of FOLDERS) {
    const target = path.join(storageRoot, folder);
    await fsp.rm(target, { recursive: true, force: true });
  }
  await ensureSpine(storageRoot);
  return { ok: true };
}

function clearWritableTables(db) {
  for (const table of [
    "actors",
    "projects",
    "decisions",
    "facts",
    "open_questions",
    "next_actions",
    "relationships",
    "changes",
    "sources",
    "extracts",
    "extract_chunks",
    "attachments",
    "source_links",
    "intake_batches",
    "intake_items",
    "proposed_projects",
    "proposal_items",
    "draft_projects",
    "approval_records"
  ]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

function writeMeta(db, key, value) {
  db.prepare(`
    INSERT INTO meta (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value || {}), nowIso());
}

function readMeta(db, key) {
  const row = db.prepare("SELECT value_json FROM meta WHERE key = ?").get(key);
  return row?.value_json ? JSON.parse(row.value_json) : null;
}

function insertJson(db, table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => "?").join(", ");
  db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`).run(...keys.map((key) => row[key]));
}

function writeActors(db, actors) {
  for (const actor of actors || []) {
    insertJson(db, "actors", {
      id: actor.id,
      name: actor.name || "",
      role: actor.role || "",
      status: actor.status || "",
      record_json: JSON.stringify(actor)
    });
  }
}

function writeIntakeItems(db, items) {
  for (const item of items || []) {
    insertJson(db, "intake_items", {
      id: item.id,
      project_id: item.projectId || "",
      status: item.status || "",
      arm_type: item.armType || "",
      proposed_object_type: item.proposedObjectType || "",
      record_json: JSON.stringify(item)
    });
  }
}

function writeProjects(db, projects) {
  for (const project of projects || []) {
    insertJson(db, "projects", {
      id: project.id,
      name: project.name || "",
      archived: project.archived ? 1 : 0,
      updated_at: project.updatedAt || "",
      record_json: JSON.stringify(project)
    });
  }
}

function writeProjectChildren(db, projects) {
  for (const project of projects || []) {
    for (const decision of project.decisions || []) {
      insertJson(db, "decisions", { id: decision.id, project_id: project.id, record_json: JSON.stringify(decision) });
    }
    for (const fact of project.facts || []) {
      insertJson(db, "facts", { id: fact.id, project_id: project.id, record_json: JSON.stringify(fact) });
    }
    for (const question of project.openQuestions || []) {
      insertJson(db, "open_questions", { id: question.id, project_id: project.id, status: question.status || "", record_json: JSON.stringify(question) });
    }
    for (const action of project.nextActions || []) {
      insertJson(db, "next_actions", {
        id: action.id,
        project_id: project.id,
        status: action.status || "",
        due_date: action.dueDate || "",
        completed_at: action.completedAt || "",
        record_json: JSON.stringify(action)
      });
    }
    for (const relationship of project.relationships || []) {
      insertJson(db, "relationships", {
        id: relationship.id,
        project_id: project.id,
        target_project_id: relationship.targetProjectId || "",
        record_json: JSON.stringify(relationship)
      });
    }
  }
}

function writeHistory(db, changes) {
  for (const change of changes || []) {
    insertJson(db, "changes", {
      id: change.id,
      project_id: change.projectId || "",
      actor_id: change.actorId || "",
      timestamp: change.timestamp || "",
      reason: change.reason || "",
      object_type: change.details?.objectType || "",
      object_id: change.details?.objectId || "",
      object_title: change.details?.objectTitle || change.details?.objectText || "",
      record_json: JSON.stringify(change)
    });
  }
}

function writeSources(db, sources) {
  for (const source of sources || []) {
    insertJson(db, "sources", {
      id: source.id,
      project_id: source.projectId || "",
      title: source.title || "",
      source_type: source.sourceType || source.type || "",
      managed_path: source.managedPath || "",
      checksum: source.checksum || "",
      record_json: JSON.stringify(source)
    });
  }
}

async function writeExtracts(db, storageRoot, extracts) {
  for (const extract of extracts || []) {
    const record = { ...extract };
    let textPath = record.textPath || "";
    let checksum = record.checksum || "";
    let bytes = record.textBytes || 0;
    if (record.text) {
      const filePath = path.join(storageRoot, "extracts", record.id, "full-text.txt");
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, record.text, "utf8");
      textPath = relativeManagedPath(storageRoot, filePath);
      checksum = checksumText(record.text);
      bytes = Buffer.byteLength(record.text, "utf8");
      delete record.text;
    }
    record.textPath = textPath;
    record.checksum = checksum;
    record.textBytes = bytes;
    insertJson(db, "extracts", {
      id: record.id,
      project_id: record.projectId || "",
      source_id: record.sourceId || "",
      text_path: textPath,
      checksum,
      text_bytes: bytes,
      record_json: JSON.stringify(record)
    });
  }
}

async function writeAttachments(db, storageRoot, attachments) {
  for (const attachment of attachments || []) {
    const record = { ...attachment };
    let managedPath = record.managedPath || "";
    let checksum = record.checksum || "";
    if (record.dataUrl) {
      const filePath = path.join(storageRoot, "attachments", record.id, "data-url.txt");
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, record.dataUrl, "utf8");
      managedPath = relativeManagedPath(storageRoot, filePath);
      checksum = checksumText(record.dataUrl);
      delete record.dataUrl;
    }
    record.managedPath = managedPath;
    record.checksum = checksum;
    insertJson(db, "attachments", {
      id: record.id,
      project_id: record.projectId || "",
      attached_to_type: record.attachedToType || "",
      attached_to_id: record.attachedToId || "",
      file_name: record.fileName || "",
      managed_path: managedPath,
      checksum,
      record_json: JSON.stringify(record)
    });
  }
}

function writeDrafts(db, drafts) {
  for (const draft of drafts || []) {
    insertJson(db, "draft_projects", {
      id: draft.id,
      project_id: draft.projectId || "",
      source_id: draft.sourceId || "",
      extract_id: draft.extractId || "",
      status: draft.status || "",
      record_json: JSON.stringify(draft)
    });
  }
}

function writeSourceLinks(db, store) {
  for (const project of store.projects || []) {
    collectSourceLinks(project, "Project", project.id, project.sourceLinks, (link) => {
      insertSourceLink(db, project.id, "Project", project.id, link);
    });
    const lists = [
      ["Decision", project.decisions || []],
      ["Fact", project.facts || []],
      ["OpenQuestion", project.openQuestions || []],
      ["NextAction", project.nextActions || []],
      ["Relationship", project.relationships || []],
      ["DraftProject", project.draftProjects || []],
      ["Change", project.changes || []]
    ];
    for (const [objectType, records] of lists) {
      for (const record of records) collectSourceLinks(project, objectType, record.id, record.sourceLinks, (link) => insertSourceLink(db, project.id, objectType, record.id, link));
    }
  }
}

function collectSourceLinks(project, attachedToType, attachedToId, links = [], callback) {
  for (const link of links || []) callback({ ...link, projectId: link.projectId || project.id, attachedToType, attachedToId });
}

function insertSourceLink(db, projectId, attachedToType, attachedToId, link) {
  insertJson(db, "source_links", {
    id: link.id || makeId("source_link"),
    project_id: projectId,
    source_id: link.sourceId || "",
    attached_to_type: attachedToType,
    attached_to_id: attachedToId,
    record_json: JSON.stringify(link)
  });
}

function readSplitRecords(db) {
  return {
    meta: [readMeta(db, "store")].filter(Boolean),
    projects: readRecordJson(db, "projects"),
    history: readRecordJson(db, "changes"),
    sources: readRecordJson(db, "sources"),
    extracts: readRecordJson(db, "extracts"),
    attachments: readRecordJson(db, "attachments"),
    drafts: readRecordJson(db, "draft_projects"),
    recovery: readRecordJson(db, "recovery_records")
  };
}

function readRecordJson(db, table) {
  return db.prepare(`SELECT record_json FROM ${table}`).all().map((row) => JSON.parse(row.record_json));
}

async function rebuildStoreFromSplitRecords(storageRoot, split = {}) {
  const meta = (split.meta || [])[0] || {};
  const rebuilt = {
    schemaVersion: meta.schemaVersion || "0.1.0",
    settings: meta.settings || {},
    actors: Array.isArray(meta.actors) ? meta.actors : [],
    intakeItems: Array.isArray(meta.intakeItems) ? meta.intakeItems : [],
    projects: split.projects || []
  };

  for (const project of rebuilt.projects) {
    project.sources = [];
    project.changes = [];
    project.draftProjects = [];
    project.imageLinks = [];
  }

  const projectById = new Map(rebuilt.projects.map((project) => [project.id, project]));
  for (const source of split.sources || []) {
    const project = projectById.get(source.projectId);
    if (!project) continue;
    source.extracts = [];
    source.imageLinks = [];
    project.sources.push(source);
  }

  const sourceById = new Map();
  for (const project of rebuilt.projects) for (const source of project.sources) sourceById.set(source.id, source);

  for (const extract of split.extracts || []) {
    const source = sourceById.get(extract.sourceId);
    if (!source) continue;
    extract.text = await readManagedText(storageRoot, extract.textPath) || extract.text || "";
    extract.imageLinks = [];
    source.extracts.push(extract);
  }

  for (const change of split.history || []) {
    const project = projectById.get(change.projectId);
    if (!project) continue;
    change.imageLinks = [];
    project.changes.push(change);
  }

  for (const draft of split.drafts || []) {
    const project = projectById.get(draft.projectId);
    if (!project) continue;
    draft.imageLinks = [];
    project.draftProjects.push(draft);
  }

  for (const attachment of split.attachments || []) {
    const project = projectById.get(attachment.projectId);
    if (!project) continue;
    attachment.dataUrl = await readManagedText(storageRoot, attachment.managedPath) || attachment.dataUrl || "";
    const target = findAttachmentTarget(project, attachment.attachedToType, attachment.attachedToId);
    if (!target) continue;
    if (!Array.isArray(target.imageLinks)) target.imageLinks = [];
    target.imageLinks.push(attachment);
  }

  for (const project of rebuilt.projects) {
    delete project.sourceIds;
    delete project.historyIds;
    delete project.draftProjectIds;
    delete project.attachmentIds;
    for (const source of project.sources || []) {
      delete source.extractIds;
      delete source.attachmentIds;
      for (const extract of source.extracts || []) delete extract.attachmentIds;
    }
    for (const draft of project.draftProjects || []) delete draft.attachmentIds;
  }

  return rebuilt;
}

function findAttachmentTarget(project, objectType, objectId) {
  if (objectType === "Project" && project.id === objectId) return project;
  const lists = {
    Decision: project.decisions || [],
    Fact: project.facts || [],
    Relationship: project.relationships || [],
    OpenQuestion: project.openQuestions || [],
    NextAction: project.nextActions || [],
    DraftProject: project.draftProjects || [],
    Change: project.changes || []
  };
  if (lists[objectType]) return lists[objectType].find((item) => item.id === objectId) || null;
  if (objectType === "Source") return (project.sources || []).find((source) => source.id === objectId) || null;
  if (objectType === "Extract") {
    for (const source of project.sources || []) {
      const extract = (source.extracts || []).find((item) => item.id === objectId);
      if (extract) return extract;
    }
  }
  return null;
}

async function readManagedText(storageRoot, managedPath) {
  if (!managedPath) return "";
  const filePath = path.join(storageRoot, managedPath);
  if (!filePath.startsWith(storageRoot)) throw new Error("Managed path escaped storage root.");
  if (!fs.existsSync(filePath)) return "";
  return fsp.readFile(filePath, "utf8");
}

async function writeManifestFile(storageRoot, manifest, store) {
  const filePath = path.join(storageRoot, "manifests", `${safeStamp()}-manifest.json`);
  const payload = {
    app: "Project State",
    manifest,
    generatedAt: nowIso(),
    counts: manifest.counts || {},
    checksum: checksumText(JSON.stringify(store))
  };
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return relativeManagedPath(storageRoot, filePath);
}

function splitStoreRecordsForBridge(store, manifest = {}) {
  return {
    meta: {
      id: "store",
      ...manifest,
      schemaVersion: store.schemaVersion || "0.1.0",
      settings: store.settings || {},
      actors: store.actors || [],
      intakeItems: store.intakeItems || []
    },
    projects: (store.projects || []).map((project) => ({
      ...project,
      sourceIds: (project.sources || []).map((source) => source.id),
      historyIds: (project.changes || []).map((change) => change.id),
      draftProjectIds: (project.draftProjects || []).map((draft) => draft.id),
      attachmentIds: (project.imageLinks || []).map((image) => image.id),
      sources: undefined,
      changes: undefined,
      draftProjects: undefined,
      imageLinks: undefined
    })),
    history: (store.projects || []).flatMap((project) => project.changes || []),
    sources: (store.projects || []).flatMap((project) => (project.sources || []).map((source) => ({ ...source, extracts: undefined, imageLinks: undefined }))),
    extracts: (store.projects || []).flatMap((project) => (project.sources || []).flatMap((source) => source.extracts || [])),
    attachments: collectAttachments(store),
    drafts: (store.projects || []).flatMap((project) => project.draftProjects || []),
    recovery: []
  };
}

function collectAttachments(store) {
  const attachments = [];
  const collect = (project, ownerType, ownerId, links = []) => {
    for (const image of links || []) attachments.push({ ...image, projectId: image.projectId || project.id, attachedToType: image.attachedToType || ownerType, attachedToId: image.attachedToId || ownerId });
  };
  for (const project of store.projects || []) {
    collect(project, "Project", project.id, project.imageLinks);
    for (const decision of project.decisions || []) collect(project, "Decision", decision.id, decision.imageLinks);
    for (const fact of project.facts || []) collect(project, "Fact", fact.id, fact.imageLinks);
    for (const relationship of project.relationships || []) collect(project, "Relationship", relationship.id, relationship.imageLinks);
    for (const question of project.openQuestions || []) collect(project, "OpenQuestion", question.id, question.imageLinks);
    for (const action of project.nextActions || []) collect(project, "NextAction", action.id, action.imageLinks);
    for (const change of project.changes || []) collect(project, "Change", change.id, change.imageLinks);
    for (const draft of project.draftProjects || []) collect(project, "DraftProject", draft.id, draft.imageLinks);
    for (const source of project.sources || []) {
      collect(project, "Source", source.id, source.imageLinks);
      for (const extract of source.extracts || []) collect(project, "Extract", extract.id, extract.imageLinks);
    }
  }
  return attachments;
}

function metadata(file) {
  const filePath = pathFromFileLike(file);
  if (filePath && fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      type: mimeFromFileName(filePath),
      size: stat.size,
      lastModified: stat.mtime.toISOString()
    };
  }
  if (!file || typeof file.name !== "string" || !file.name) return null;
  return {
    name: file.name,
    type: file.type || "",
    size: file.size || 0,
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : ""
  };
}

function localPath(file) {
  return pathFromFileLike(file) || file?.webkitRelativePath || file?.name || "";
}

async function readAsText(file) {
  const filePath = pathFromFileLike(file);
  if (filePath) return fsp.readFile(filePath, "utf8");
  if (typeof file?.text === "function") return file.text();
  throw new Error("Desktop bridge could not read text from this file reference.");
}

async function readAsArrayBuffer(file) {
  const filePath = pathFromFileLike(file);
  if (filePath) {
    const buffer = await fsp.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
  if (typeof file?.arrayBuffer === "function") return file.arrayBuffer();
  throw new Error("Desktop bridge could not read bytes from this file reference.");
}

async function readAsDataUrl(file) {
  const filePath = pathFromFileLike(file);
  if (filePath) {
    const buffer = await fsp.readFile(filePath);
    return `data:${mimeFromFileName(filePath)};base64,${buffer.toString("base64")}`;
  }
  const buffer = Buffer.from(await readAsArrayBuffer(file));
  return `data:${file?.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

async function extractText(file) {
  const fileName = pathFromFileLike(file) || file?.name || "";
  const extension = path.extname(fileName).slice(1).toLowerCase();
  if (extension === "txt" || extension === "md") return cleanExtractedText(await readAsText(file));
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  if (extension === "docx") return extractDocxText(bytes);
  if (extension === "pdf") return extractPdfText(bytes);
  return null;
}

async function saveTextFile({ storageRoot, fileName = "project-state-export.txt", text = "", type = "text/plain" }) {
  await ensureSpine(storageRoot);
  const safeName = safeFileName(fileName);
  const filePath = path.join(storageRoot, "backups", safeName);
  await fsp.writeFile(filePath, String(text || ""), type.includes("json") ? "utf8" : "utf8");
  return { ok: true, path: filePath };
}

function extractDocxText(bytes) {
  const entry = findZipEntry(bytes, "word/document.xml");
  if (!entry) throw new Error("Could not find document text in this DOCX.");
  const xmlBytes = inflateZipEntry(bytes, entry);
  const xml = Buffer.from(xmlBytes).toString("utf8");
  return cleanExtractedText(xmlToText(xml));
}

function findZipEntry(bytes, fileName) {
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (readUint32(bytes, i) !== 0x06054b50) continue;
    const entryCount = readUint16(bytes, i + 10);
    const directoryOffset = readUint32(bytes, i + 16);
    let offset = directoryOffset;
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      if (readUint32(bytes, offset) !== 0x02014b50) return null;
      const method = readUint16(bytes, offset + 10);
      const compressedSize = readUint32(bytes, offset + 20);
      const fileNameLength = readUint16(bytes, offset + 28);
      const extraLength = readUint16(bytes, offset + 30);
      const commentLength = readUint16(bytes, offset + 32);
      const localHeaderOffset = readUint32(bytes, offset + 42);
      const name = Buffer.from(bytes.slice(offset + 46, offset + 46 + fileNameLength)).toString("utf8");
      if (name === fileName) return { method, compressedSize, localHeaderOffset };
      offset += 46 + fileNameLength + extraLength + commentLength;
    }
  }
  return null;
}

function inflateZipEntry(bytes, entry) {
  const localOffset = entry.localHeaderOffset;
  if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid DOCX file.");
  const nameLength = readUint16(bytes, localOffset + 26);
  const extraLength = readUint16(bytes, localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method !== 8) throw new Error("This DOCX compression method is not supported.");
  return zlib.inflateRawSync(Buffer.from(compressed));
}

function extractPdfText(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  const parts = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) parts.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "")));
  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    for (const literal of match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)) parts.push(decodePdfLiteral(literal[0]));
  }
  return cleanExtractedText(parts.join(" "));
}

function xmlToText(xml = "") {
  return decodeXmlEntities(xml.replace(/<w:tab\/>/g, "\t").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""));
}

function decodeXmlEntities(text = "") {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function decodePdfLiteral(value = "") {
  return value
    .replace(/^\(|\)$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function cleanExtractedText(text = "") {
  return String(text).replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

function pathFromFileLike(file) {
  if (typeof file === "string") return path.resolve(file);
  if (file?.path) return path.resolve(file.path);
  if (file?.localPath && path.isAbsolute(file.localPath)) return path.resolve(file.localPath);
  return "";
}

function mimeFromFileName(fileName = "") {
  const extension = path.extname(fileName).slice(1).toLowerCase();
  const types = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json"
  };
  return types[extension] || "application/octet-stream";
}

function checksumText(text = "") {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function relativeManagedPath(storageRoot, filePath) {
  return path.relative(storageRoot, filePath).replace(/\\/g, "/");
}

function nowIso() {
  return new Date().toISOString();
}

function safeStamp() {
  return nowIso().replace(/[:.]/g, "-");
}

function safeFileName(value = "") {
  return String(value || "project-state-export.txt").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 180);
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

module.exports = {
  createProjectStateDesktopBridge,
  ensureSpine,
  FOLDERS,
  DATABASE_FILE
};
