const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { DatabaseSync } = require("node:sqlite");

const ROOT = path.join(__dirname, "..");
const SCHEMA_FILE = path.join(__dirname, "spine-schema.sql");
const API_ARM_CONTRACT_FILE = path.join(ROOT, "fixtures", "api-arm-v0.1-contract.json");
const DEFAULT_STORAGE_ROOT = path.join(os.homedir(), "Project State Storage");
const DATABASE_FILE = "project-state.db";
const FOLDERS = ["sources", "extracts", "attachments", "backups", "recovery", "manifests", "logs", "temp", "integrations"];
const SPLIT_TABLES = ["projects", "changes", "sources", "extracts", "attachments", "draft_projects"];
const BACKUP_MANAGED_FOLDERS = ["sources", "extracts", "attachments", "manifests", "recovery"];
const REQUIRED_TABLES = [
  "meta",
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
  "approval_records",
  "recovery_records"
];

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
      async verifyIntegrity(options = {}) {
        return verifyIntegrity({ storageRoot, dbPath, ...options });
      },
      async importBrowserExport(payload = {}) {
        return importBrowserExport({ storageRoot, dbPath, payload });
      },
      async createBackupPackage(payload = {}) {
        return createBackupPackage({ storageRoot, dbPath, payload });
      },
      async restoreBackupPackage(payload = {}) {
        return restoreBackupPackage({ storageRoot, dbPath, payload });
      },
      async reset() {
        return resetSpine({ storageRoot, dbPath });
      }
    },
    intakeArms: {
      async describeCapabilities() {
        return describeApiArmCapabilities();
      },
      async submitEnvelope(envelope = {}) {
        return submitApiArmEnvelope({ storageRoot, dbPath, envelope });
      },
      async getReceipt(submissionId = "") {
        return getApiArmReceipt({ storageRoot, dbPath, submissionId });
      }
    },
    files: {
      metadata,
      localPath,
      verifyLocalFile,
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

function readApiArmContract() {
  return JSON.parse(fs.readFileSync(API_ARM_CONTRACT_FILE, "utf8"));
}

function describeApiArmCapabilities() {
  const contract = readApiArmContract();
  return {
    app: contract.app,
    contractType: contract.contractType,
    contractVersion: contract.contractVersion,
    runtime: contract.runtime,
    implementationStatus: contract.implementationStatus,
    operations: [...contract.operations],
    allowedArmTypes: [...contract.allowedArmTypes],
    allowedProposalTypes: [...contract.allowedProposalTypes],
    receiptBoundary: contract.receiptBoundary,
    unsupportedPayloads: [...contract.unsupportedPayloads]
  };
}

async function submitApiArmEnvelope({ storageRoot, dbPath, envelope }) {
  await ensureSpine(storageRoot);
  const db = openDatabase(dbPath);
  const contract = readApiArmContract();
  const submissionId = cleanText(envelope?.submissionId);
  const idempotencyKey = cleanText(envelope?.idempotencyKey);
  let transactionOpen = false;

  try {
    const errors = validateApiArmEnvelope(envelope, contract, db);
    if (errors.length) return rejectedApiArmReceipt(contract, submissionId, idempotencyKey, errors);

    const canonicalPayload = stableStringify(envelope);
    const payloadChecksum = checksumText(canonicalPayload);
    const priorBatch = findApiArmBatch(db, submissionId, idempotencyKey);
    if (priorBatch) {
      if (priorBatch.payloadChecksum !== payloadChecksum) {
        return rejectedApiArmReceipt(contract, submissionId, idempotencyKey, [{
          code: "IDEMPOTENCY_CONFLICT",
          message: "The submission ID or idempotency key was already used with different content.",
          path: "idempotencyKey"
        }]);
      }
      return { ...priorBatch.receipt, status: "duplicate" };
    }

    const receivedAt = nowIso();
    const batchId = makeId("intake_batch");
    const itemMappings = envelope.items.map((item) => ({
      clientItemId: cleanText(item.clientItemId),
      intakeId: makeId("intake")
    }));
    const receipt = {
      contractVersion: contract.contractVersion,
      submissionId,
      idempotencyKey,
      batchId,
      itemMappings,
      status: "accepted",
      receivedAt,
      boundary: contract.receiptBoundary
    };
    const batch = {
      id: batchId,
      status: "pending",
      createdAt: receivedAt,
      submissionId,
      idempotencyKey,
      payloadChecksum,
      projectId: cleanText(envelope.target.projectId),
      arm: cloneJson(envelope.arm),
      provenance: cloneJson(envelope.provenance),
      itemIds: itemMappings.map((mapping) => mapping.intakeId),
      receipt
    };
    const mappingByClientId = new Map(itemMappings.map((mapping) => [mapping.clientItemId, mapping.intakeId]));
    const intakeItems = envelope.items.map((item) => ({
      id: mappingByClientId.get(cleanText(item.clientItemId)),
      intakeBatchId: batchId,
      apiArmSubmissionId: submissionId,
      apiArmClientItemId: cleanText(item.clientItemId),
      apiArmIdempotencyKey: idempotencyKey,
      apiArm: cloneJson(envelope.arm),
      provenance: cloneJson(envelope.provenance),
      armType: envelope.arm.type,
      status: "pending",
      reviewState: "needs_review",
      queueState: "new",
      queueNotes: "",
      queueReviewedAt: "",
      queueReviewedBy: "",
      queueReviewReason: "",
      title: cleanText(item.title),
      projectId: cleanText(envelope.target.projectId),
      createdAt: receivedAt,
      createdBy: "",
      sourceLabel: cleanText(item.sourceLabel) || cleanText(envelope.provenance.sourceLabel),
      proposedObjectType: item.proposedObjectType,
      proposedChange: cloneJson(item.proposedChange),
      evidence: cloneJson(item.evidence || {}),
      approval: null,
      assignments: [],
      comments: [],
      archived: false
    }));

    db.exec("BEGIN IMMEDIATE TRANSACTION");
    transactionOpen = true;
    writeIntakeBatches(db, [batch]);
    writeIntakeItems(db, intakeItems);
    updateApiArmStoreMeta(db, batch, intakeItems);
    db.exec("COMMIT");
    transactionOpen = false;
    return receipt;
  } catch (error) {
    if (transactionOpen) {
      try {
        db.exec("ROLLBACK");
      } catch {}
    }
    await preserveRecoveryRecordWithOpenDb(db, storageRoot, {
      stage: "api-arm-submit",
      message: error.message,
      stack: error.stack || "",
      raw: safeJson(envelope)
    });
    return rejectedApiArmReceipt(contract, submissionId, idempotencyKey, [{
      code: "PERSISTENCE_FAILED",
      message: "Project State could not retain the API arm proposal.",
      path: ""
    }]);
  } finally {
    db.close();
  }
}

async function getApiArmReceipt({ storageRoot, dbPath, submissionId }) {
  await ensureSpine(storageRoot);
  if (!cleanText(submissionId) || !fs.existsSync(dbPath)) return null;
  const db = openDatabase(dbPath);
  try {
    const batch = readRecordJson(db, "intake_batches").find((record) => record.submissionId === cleanText(submissionId));
    return batch?.receipt ? cloneJson(batch.receipt) : null;
  } finally {
    db.close();
  }
}

function validateApiArmEnvelope(envelope, contract, db) {
  const errors = [];
  const add = (code, message, path = "") => errors.push({ code, message, path });
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    add("INVALID_ENVELOPE", "Submission envelope must be an object.");
    return errors;
  }
  if (envelope.contractVersion !== contract.contractVersion) add("UNSUPPORTED_CONTRACT_VERSION", `Contract version must be ${contract.contractVersion}.`, "contractVersion");
  for (const field of contract.envelope.required) if (isBlank(envelope[field])) add("INVALID_ENVELOPE", `${field} is required.`, field);
  if (!validIsoTimestamp(envelope.submittedAt)) add("INVALID_ENVELOPE", "submittedAt must be an ISO 8601 timestamp.", "submittedAt");

  const allowedTopLevel = new Set([...contract.envelope.required]);
  for (const key of Object.keys(envelope)) if (!allowedTopLevel.has(key)) add("INVALID_ENVELOPE", `Unsupported envelope field: ${key}.`, key);

  const forbidden = findForbiddenFields(envelope, new Set(contract.forbiddenSubmissionFields));
  for (const fieldPath of forbidden) add("FORBIDDEN_FIELD", "The arm cannot provide this server-owned or unsupported field.", fieldPath);

  const arm = envelope.arm;
  if (!arm || typeof arm !== "object" || Array.isArray(arm)) {
    add("INVALID_ARM", "arm must be an object.", "arm");
  } else {
    for (const field of contract.envelope.armRequired) if (isBlank(arm[field])) add("INVALID_ARM", `${field} is required.`, `arm.${field}`);
    if (!contract.allowedArmTypes.includes(arm.type)) add("INVALID_ARM", "Unsupported arm type.", "arm.type");
    const allowed = new Set([...contract.envelope.armRequired, "instanceId"]);
    for (const key of Object.keys(arm)) if (!allowed.has(key)) add("INVALID_ARM", `Unsupported arm field: ${key}.`, `arm.${key}`);
  }

  const target = envelope.target;
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    add("INVALID_TARGET_PROJECT", "target must be an object.", "target");
  } else {
    for (const field of contract.envelope.targetRequired) if (isBlank(target[field])) add("INVALID_TARGET_PROJECT", `${field} is required.`, `target.${field}`);
    const projectId = cleanText(target.projectId);
    if (projectId && !db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)) add("INVALID_TARGET_PROJECT", "Target Project ID does not exist.", "target.projectId");
    for (const key of Object.keys(target)) if (!contract.envelope.targetRequired.includes(key)) add("INVALID_TARGET_PROJECT", `Unsupported target field: ${key}.`, `target.${key}`);
  }

  const provenance = envelope.provenance;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    add("INVALID_ENVELOPE", "provenance must be an object.", "provenance");
  } else {
    for (const field of contract.envelope.provenanceRequired) if (isBlank(provenance[field])) add("INVALID_ENVELOPE", `${field} is required.`, `provenance.${field}`);
    const allowed = new Set([...contract.envelope.provenanceRequired, "externalReference", "capturedAt"]);
    for (const key of Object.keys(provenance)) if (!allowed.has(key)) add("INVALID_ENVELOPE", `Unsupported provenance field: ${key}.`, `provenance.${key}`);
    if (provenance.capturedAt && !validIsoTimestamp(provenance.capturedAt)) add("INVALID_ENVELOPE", "capturedAt must be an ISO 8601 timestamp.", "provenance.capturedAt");
  }

  if (!Array.isArray(envelope.items) || !envelope.items.length) {
    add("INVALID_ENVELOPE", "items must contain at least one proposal.", "items");
  } else {
    const clientIds = new Set();
    envelope.items.forEach((item, index) => {
      const base = `items[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        add("INVALID_ENVELOPE", "Proposal item must be an object.", base);
        return;
      }
      for (const field of contract.envelope.itemRequired) if (isBlank(item[field])) add("INVALID_ENVELOPE", `${field} is required.`, `${base}.${field}`);
      const clientItemId = cleanText(item.clientItemId);
      if (clientItemId && clientIds.has(clientItemId)) add("DUPLICATE_CLIENT_ITEM_ID", "clientItemId must be unique within the envelope.", `${base}.clientItemId`);
      clientIds.add(clientItemId);
      if (!contract.allowedProposalTypes.includes(item.proposedObjectType)) add("INVALID_PROPOSAL_TYPE", "Unsupported proposal type.", `${base}.proposedObjectType`);
      const allowedItem = new Set([...contract.envelope.itemRequired, "sourceLabel", "evidence"]);
      for (const key of Object.keys(item)) if (!allowedItem.has(key)) add("INVALID_ENVELOPE", `Unsupported proposal item field: ${key}.`, `${base}.${key}`);
      if (!item.proposedChange || typeof item.proposedChange !== "object" || Array.isArray(item.proposedChange)) {
        add("INVALID_ENVELOPE", "proposedChange must be an object.", `${base}.proposedChange`);
      } else {
        for (const field of contract.envelope.proposedChangeRequired) if (isBlank(item.proposedChange[field])) add("INVALID_ENVELOPE", `${field} is required.`, `${base}.proposedChange.${field}`);
        for (const key of Object.keys(item.proposedChange)) if (!contract.envelope.allowedProposedChangeFields.includes(key)) add("INVALID_ENVELOPE", `Unsupported proposedChange field: ${key}.`, `${base}.proposedChange.${key}`);
      }
    });
  }
  return dedupeErrors(errors);
}

function findApiArmBatch(db, submissionId, idempotencyKey) {
  return readRecordJson(db, "intake_batches").find((batch) => batch.submissionId === submissionId || batch.idempotencyKey === idempotencyKey) || null;
}

function updateApiArmStoreMeta(db, batch, intakeItems) {
  const storeMeta = readMeta(db, "store") || {};
  const currentBatches = readRecordJson(db, "intake_batches");
  const currentItems = readRecordJson(db, "intake_items");
  writeMeta(db, "store", { ...storeMeta, intakeBatches: currentBatches, intakeItems: currentItems });

  const snapshot = readMeta(db, "snapshot");
  if (snapshot?.store) {
    const nextStore = { ...snapshot.store, intakeBatches: currentBatches, intakeItems: currentItems };
    writeMeta(db, "snapshot", { store: nextStore, snapshotBytes: Buffer.byteLength(JSON.stringify(nextStore), "utf8") });
  }
  const manifest = readMeta(db, "manifest");
  if (manifest) writeMeta(db, "manifest", { ...manifest, counts: { ...(manifest.counts || {}), intakeBatches: currentBatches.length, intakeItems: currentItems.length } });
}

function rejectedApiArmReceipt(contract, submissionId, idempotencyKey, errors) {
  return {
    contractVersion: contract.contractVersion,
    submissionId,
    idempotencyKey,
    status: "rejected",
    boundary: contract.receiptBoundary,
    errors
  };
}

function findForbiddenFields(value, forbidden, pathParts = [], found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => findForbiddenFields(entry, forbidden, [...pathParts, `[${index}]`], found));
    return found;
  }
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = pathParts.length && pathParts[pathParts.length - 1].startsWith("[")
      ? `${pathParts.slice(0, -1).join(".")}${pathParts[pathParts.length - 1]}.${key}`
      : [...pathParts, key].join(".");
    if (forbidden.has(key)) found.push(nextPath);
    findForbiddenFields(entry, forbidden, [...pathParts, key], found);
  }
  return found;
}

function dedupeErrors(errors) {
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.code}|${error.path}|${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return !value.trim();
  return false;
}

function validIsoTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable API arm envelope]";
  }
}

function cleanText(value) {
  return String(value || "").trim();
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
    const integrity = await verifyIntegrity({ storageRoot, dbPath, preserveOnFailure: false });
    if (!integrity.ok) throw new Error(`Desktop spine integrity check failed: ${integrity.errors.join("; ")}`);
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
    await preserveRecoveryRecordWithOpenDb(db, storageRoot, {
      stage: "desktop-load",
      message: error.message,
      stack: error.stack || "",
      raw: snapshot?.store ? JSON.stringify(snapshot.store) : ""
    });
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
  let store = payload.store || {};
  let manifest = payload.manifest || {};
  const db = openDatabase(dbPath);
  if (payload.preserveConcurrentApiIntake !== false) store = mergePersistedApiArmIntake(db, store);
  manifest = {
    ...manifest,
    counts: {
      ...(manifest.counts || {}),
      intakeBatches: (store.intakeBatches || []).length,
      intakeItems: (store.intakeItems || []).length
    }
  };
  const split = payload.split || splitStoreRecordsForBridge(store, manifest);
  const splitMeta = Array.isArray(split.meta) ? split.meta[0] : split.meta;
  splitMeta.intakeBatches = store.intakeBatches || [];
  splitMeta.intakeItems = store.intakeItems || [];
  const snapshot = JSON.stringify(store);
  let committed = false;

  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    clearWritableTables(db);
    writeMeta(db, "manifest", manifest);
    writeMeta(db, "store", splitMeta || {});
    writeMeta(db, "snapshot", { store, snapshotBytes: Buffer.byteLength(snapshot, "utf8") });

    writeActors(db, splitMeta?.actors || store.actors || []);
    writeIntakeBatches(db, splitMeta?.intakeBatches || store.intakeBatches || []);
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
    committed = true;
    const integrity = await verifyIntegrity({ storageRoot, dbPath, preserveOnFailure: true });
    if (!integrity.ok) throw new Error(`Desktop spine integrity check failed after save: ${integrity.errors.join("; ")}`);
    return { ok: true, source: "desktop-spine", manifestPath, integrity };
  } catch (error) {
    if (!committed) {
      try {
        db.exec("ROLLBACK");
      } catch {}
    }
    const issue = {
      stage: "desktop-save",
      message: error.message,
      stack: error.stack || "",
      raw: snapshot
    };
    await preserveRecoveryRecordWithOpenDb(db, storageRoot, issue);
    throw error;
  } finally {
    db.close();
  }
}

function mergePersistedApiArmIntake(db, incomingStore = {}) {
  const incomingBatches = Array.isArray(incomingStore.intakeBatches) ? incomingStore.intakeBatches : [];
  const incomingItems = Array.isArray(incomingStore.intakeItems) ? incomingStore.intakeItems : [];
  const persistedBatches = readRecordJson(db, "intake_batches");
  const persistedApiItems = readRecordJson(db, "intake_items").filter((item) => item.apiArmSubmissionId || item.intakeBatchId);
  return {
    ...incomingStore,
    intakeBatches: mergeRecordsById(persistedBatches, incomingBatches),
    intakeItems: mergeRecordsById(persistedApiItems, incomingItems)
  };
}

function mergeRecordsById(persisted = [], incoming = []) {
  const incomingIds = new Set(incoming.map((record) => record?.id).filter(Boolean));
  return [...incoming, ...persisted.filter((record) => record?.id && !incomingIds.has(record.id))];
}

async function importBrowserExport({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const raw = browserExportRawText(payload);
  let parsed = null;
  let stagingRoot = "";

  try {
    parsed = browserExportParsedPayload(payload, raw);
    const store = extractStoreFromBrowserExport(parsed);
    const validation = validateMigrationStore(store);
    if (validation.errors.length) {
      await preserveRecoveryRecord({
        storageRoot,
        dbPath,
        issue: {
          stage: "browser-json-import-validation",
          message: "Browser export failed migration validation.",
          raw: JSON.stringify({ errors: validation.errors, exportSummary: describeBrowserExport(parsed) }, null, 2)
        }
      });
      throw new Error(`Browser export failed migration validation: ${validation.errors.join("; ")}`);
    }

    await preserveRecoveryRecord({
      storageRoot,
      dbPath,
      issue: {
        stage: "browser-json-import-source",
        message: "Browser JSON export preserved before desktop spine import.",
        raw
      }
    });

    const manifest = buildMigrationManifest(store, {
      source: describeBrowserExport(parsed),
      reason: payload.reason || "",
      actorId: payload.actorId || "",
      sourceFile: payload.sourceFile || ""
    });
    const split = splitStoreRecordsForBridge(store, manifest);
    const snapshot = JSON.stringify(store);

    stagingRoot = path.join(storageRoot, "temp", `browser-json-import-${safeStamp()}-${crypto.randomBytes(3).toString("hex")}`);
    const stagingDbPath = path.join(stagingRoot, DATABASE_FILE);
    const stagingSave = await saveStore({
      storageRoot: stagingRoot,
      dbPath: stagingDbPath,
      payload: { store, manifest, split, snapshot, preserveConcurrentApiIntake: false }
    });
    if (!stagingSave.integrity?.ok) throw new Error("Browser export failed staging integrity verification.");

    const liveSave = await saveStore({
      storageRoot,
      dbPath,
      payload: { store, manifest, split, snapshot, preserveConcurrentApiIntake: false }
    });
    const loaded = await loadStore({ storageRoot, dbPath });
    const afterValidation = validateMigrationStore(loaded.store);
    if (afterValidation.errors.length) {
      throw new Error(`Desktop spine import verification failed: ${afterValidation.errors.join("; ")}`);
    }

    return {
      ok: true,
      source: "browser-json-import",
      importedAt: manifest.importedAt,
      counts: manifest.counts,
      idCount: validation.idCount,
      historyCount: manifest.counts.changes,
      sourceLinksPreserved: validation.sourceLinks,
      liveIntegrity: liveSave.integrity || null
    };
  } catch (error) {
    await preserveRecoveryRecord({
      storageRoot,
      dbPath,
      issue: {
        stage: "browser-json-import",
        message: error.message,
        stack: error.stack || "",
        raw: raw || JSON.stringify(payload || {}, null, 2)
      }
    });
    throw error;
  } finally {
    if (stagingRoot) await fsp.rm(stagingRoot, { recursive: true, force: true });
  }
}

async function createBackupPackage({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const actor = String(payload.actorId || payload.actorName || payload.actor || "").trim();
  const reason = String(payload.reason || "").trim();
  const timestamp = String(payload.timestamp || nowIso()).trim();
  if (!actor) throw new Error("Backup package requires an actor.");
  if (!reason) throw new Error("Backup package requires a reason.");
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error("Backup package requires a valid timestamp.");

  const integrity = await verifyIntegrity({ storageRoot, dbPath, preserveOnFailure: true });
  if (!integrity.ok) throw new Error(`Backup package blocked by integrity errors: ${integrity.errors.join("; ")}`);

  const packageId = payload.id || makeId("backup");
  const packageName = safeFileName(`project-state-backup-package-${timestamp.replace(/[:.]/g, "-")}-${packageId}`);
  const packagePath = path.join(storageRoot, "backups", packageName);
  const managedPath = path.join(packagePath, "managed");
  await fsp.rm(packagePath, { recursive: true, force: true });
  await fsp.mkdir(managedPath, { recursive: true });

  const dbSnapshotPath = path.join(packagePath, DATABASE_FILE);
  await writeDatabaseSnapshot(dbPath, dbSnapshotPath);

  const managedFiles = [];
  for (const folder of BACKUP_MANAGED_FOLDERS) {
    const sourceFolder = path.join(storageRoot, folder);
    const targetFolder = path.join(managedPath, folder);
    if (!fs.existsSync(sourceFolder)) continue;
    await fsp.cp(sourceFolder, targetFolder, { recursive: true, force: true });
    const files = await listPackageFiles(targetFolder);
    for (const filePath of files) {
      managedFiles.push({
        role: folder,
        path: relativeManagedPath(packagePath, filePath),
        bytes: fs.statSync(filePath).size,
        checksum: await checksumFile(filePath)
      });
    }
  }

  const dbStat = fs.statSync(dbSnapshotPath);
  const manifest = {
    app: "Project State",
    packageType: "desktop-backup-package",
    packageVersion: "0.1",
    packageId,
    createdAt: timestamp,
    createdBy: actor,
    actorId: payload.actorId || "",
    actorName: payload.actorName || payload.actor || "",
    reason,
    storageEngine: "sqlite-plus-managed-folders",
    database: {
      fileName: DATABASE_FILE,
      path: DATABASE_FILE,
      bytes: dbStat.size,
      checksum: await checksumFile(dbSnapshotPath)
    },
    managedFolders: BACKUP_MANAGED_FOLDERS,
    managedFiles,
    sourceIntegrity: integrity,
    sourceStorageRoot: storageRoot
  };
  const manifestPath = path.join(packagePath, "manifest.json");
  await fsp.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  return {
    ok: true,
    source: "desktop-backup-package",
    packageId,
    packagePath,
    manifestPath,
    dbSnapshotPath,
    manifest
  };
}

async function restoreBackupPackage({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const actor = String(payload.actorId || payload.actorName || payload.actor || "").trim();
  const reason = String(payload.reason || "").trim();
  const timestamp = String(payload.timestamp || nowIso()).trim();
  if (!actor) throw new Error("Restore package requires an actor.");
  if (!reason) throw new Error("Restore package requires a reason.");
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) throw new Error("Restore package requires a valid timestamp.");

  const packagePath = path.resolve(String(payload.packagePath || payload.path || ""));
  if (!packagePath) throw new Error("Restore package requires a package path.");
  const validation = await validateBackupPackage({ packagePath });
  if (!validation.ok) throw new Error(`Restore package validation failed: ${validation.errors.join("; ")}`);

  const beforeIntegrity = await verifyIntegrity({ storageRoot, dbPath, preserveOnFailure: true });
  const recoverySnapshot = await preserveCurrentSpineForRestore({
    storageRoot,
    dbPath,
    actor,
    actorId: payload.actorId || "",
    actorName: payload.actorName || payload.actor || "",
    reason,
    timestamp,
    packagePath,
    beforeIntegrity
  });

  await replaceLiveSpineFromBackupPackage({ storageRoot, dbPath, packagePath, manifest: validation.manifest });
  const afterIntegrity = await verifyIntegrity({ storageRoot, dbPath, preserveOnFailure: true });
  if (!afterIntegrity.ok) {
    throw new Error(`Restored spine failed integrity: ${afterIntegrity.errors.join("; ")}`);
  }

  await preserveRecoveryRecord({
    storageRoot,
    dbPath,
    issue: {
      stage: "desktop-restore-complete",
      message: "Desktop backup package restored.",
      raw: JSON.stringify({
        restoredAt: timestamp,
        restoredBy: actor,
        actorId: payload.actorId || "",
        actorName: payload.actorName || payload.actor || "",
        reason,
        packagePath,
        packageId: validation.manifest.packageId || "",
        recoverySnapshot,
        afterIntegrity
      }, null, 2)
    }
  });

  return {
    ok: true,
    source: "desktop-backup-package-restore",
    restoredAt: timestamp,
    restoredBy: actor,
    reason,
    packagePath,
    packageId: validation.manifest.packageId || "",
    recoverySnapshot,
    integrity: afterIntegrity
  };
}

async function validateBackupPackage({ packagePath }) {
  const errors = [];
  if (!packagePath || !fs.existsSync(packagePath)) {
    return { ok: false, errors: ["Backup package folder does not exist."], manifest: null };
  }
  const manifestPath = path.join(packagePath, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: false, errors: ["Backup package manifest is missing."], manifest: null };
  }

  let manifest = null;
  try {
    manifest = JSON.parse(await fsp.readFile(manifestPath, "utf8"));
  } catch (error) {
    return { ok: false, errors: [`Backup package manifest is not readable JSON: ${error.message}`], manifest: null };
  }

  if (manifest.app !== "Project State") errors.push("Backup package app mismatch.");
  if (manifest.packageType !== "desktop-backup-package") errors.push("Backup package type mismatch.");
  if (!manifest.createdBy) errors.push("Backup package missing createdBy.");
  if (!manifest.createdAt) errors.push("Backup package missing createdAt.");
  if (!manifest.reason) errors.push("Backup package missing reason.");

  const dbRelativePath = manifest.database?.path || DATABASE_FILE;
  let dbPath = "";
  try {
    dbPath = resolvePackagePath(packagePath, dbRelativePath);
  } catch (error) {
    errors.push(`Backup DB path is unsafe: ${error.message}`);
  }
  if (dbPath && !fs.existsSync(dbPath)) errors.push("Backup package DB snapshot is missing.");
  if (dbPath && fs.existsSync(dbPath) && manifest.database?.checksum && await checksumFile(dbPath) !== manifest.database.checksum) errors.push("Backup package DB checksum mismatch.");

  for (const folder of BACKUP_MANAGED_FOLDERS) {
    const folderPath = path.join(packagePath, "managed", folder);
    if (!fs.existsSync(folderPath)) errors.push(`Backup package missing managed folder ${folder}.`);
  }
  for (const file of manifest.managedFiles || []) {
    let filePath = "";
    try {
      filePath = resolvePackagePath(packagePath, file.path);
    } catch (error) {
      errors.push(`Managed file path is unsafe: ${file.path}: ${error.message}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      errors.push(`Backup package missing managed file ${file.path}.`);
      continue;
    }
    if (file.checksum && await checksumFile(filePath) !== file.checksum) errors.push(`Managed file checksum mismatch: ${file.path}`);
  }

  if (dbPath && fs.existsSync(dbPath)) {
    let db = null;
    try {
      db = new DatabaseSync(dbPath, { readOnly: true });
      for (const table of REQUIRED_TABLES) {
        if (!tableExists(db, table)) errors.push(`Backup package DB missing table ${table}.`);
      }
    } catch (error) {
      errors.push(`Backup package DB is not readable: ${error.message}`);
    } finally {
      if (db) db.close();
    }
  }

  return { ok: errors.length === 0, errors, manifest, manifestPath, dbPath };
}

async function preserveCurrentSpineForRestore({ storageRoot, dbPath, actor, actorId, actorName, reason, timestamp, packagePath, beforeIntegrity }) {
  const snapshotId = makeId("restore_recovery");
  const snapshotPath = path.join(storageRoot, "recovery", snapshotId);
  const tempSnapshotPath = path.join(storageRoot, "temp", snapshotId);
  await fsp.mkdir(snapshotPath, { recursive: true });
  await fsp.mkdir(tempSnapshotPath, { recursive: true });

  try {
    if (fs.existsSync(dbPath)) await writeDatabaseSnapshot(dbPath, path.join(tempSnapshotPath, DATABASE_FILE));
    const managedRoot = path.join(tempSnapshotPath, "managed");
    for (const folder of BACKUP_MANAGED_FOLDERS) {
      const sourceFolder = path.join(storageRoot, folder);
      const targetFolder = path.join(managedRoot, folder);
      if (fs.existsSync(sourceFolder)) await fsp.cp(sourceFolder, targetFolder, { recursive: true, force: true });
    }
    await fsp.cp(tempSnapshotPath, snapshotPath, { recursive: true, force: true });
  } finally {
    await fsp.rm(tempSnapshotPath, { recursive: true, force: true });
  }

  const manifest = {
    app: "Project State",
    packageType: "desktop-restore-recovery-snapshot",
    packageVersion: "0.1",
    snapshotId,
    createdAt: timestamp,
    createdBy: actor,
    actorId,
    actorName,
    reason,
    restoringPackagePath: packagePath,
    sourceIntegrity: beforeIntegrity,
    database: fs.existsSync(path.join(snapshotPath, DATABASE_FILE))
      ? {
        path: DATABASE_FILE,
        bytes: fs.statSync(path.join(snapshotPath, DATABASE_FILE)).size,
        checksum: await checksumFile(path.join(snapshotPath, DATABASE_FILE))
      }
      : null
  };
  await fsp.writeFile(path.join(snapshotPath, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  await preserveRecoveryRecord({
    storageRoot,
    dbPath,
    issue: {
      stage: "desktop-restore-preflight",
      message: "Current desktop spine preserved before restore.",
      managedPath: relativeManagedPath(storageRoot, snapshotPath),
      raw: JSON.stringify(manifest, null, 2)
    }
  });

  return {
    id: snapshotId,
    path: snapshotPath,
    managedPath: relativeManagedPath(storageRoot, snapshotPath)
  };
}

async function replaceLiveSpineFromBackupPackage({ storageRoot, dbPath, packagePath, manifest }) {
  const incomingDbPath = resolvePackagePath(packagePath, manifest.database?.path || DATABASE_FILE);
  const tempRestorePath = path.join(storageRoot, "temp", `restore-${safeStamp()}-${crypto.randomBytes(3).toString("hex")}`);
  await fsp.mkdir(tempRestorePath, { recursive: true });
  try {
    await fsp.copyFile(incomingDbPath, path.join(tempRestorePath, DATABASE_FILE));
    for (const folder of BACKUP_MANAGED_FOLDERS) {
      const sourceFolder = path.join(packagePath, "managed", folder);
      const targetFolder = path.join(tempRestorePath, folder);
      if (fs.existsSync(sourceFolder)) await fsp.cp(sourceFolder, targetFolder, { recursive: true, force: true });
      else await fsp.mkdir(targetFolder, { recursive: true });
    }

    if (fs.existsSync(dbPath)) await fsp.rm(dbPath, { force: true });
    await fsp.copyFile(path.join(tempRestorePath, DATABASE_FILE), dbPath);

    for (const folder of BACKUP_MANAGED_FOLDERS) {
      const liveFolder = path.join(storageRoot, folder);
      if (folder === "recovery") {
        await fsp.mkdir(liveFolder, { recursive: true });
        await fsp.cp(path.join(tempRestorePath, folder), liveFolder, { recursive: true, force: true });
        continue;
      }
      await fsp.rm(liveFolder, { recursive: true, force: true });
      await fsp.cp(path.join(tempRestorePath, folder), liveFolder, { recursive: true, force: true });
    }
  } finally {
    await fsp.rm(tempRestorePath, { recursive: true, force: true });
    await ensureSpine(storageRoot);
  }
}

function resolvePackagePath(packagePath, relativePath) {
  const root = path.resolve(packagePath);
  const target = path.resolve(root, relativePath || "");
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Package path escaped backup package root.");
  return target;
}

async function writeDatabaseSnapshot(dbPath, targetPath) {
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  const db = openDatabase(dbPath);
  try {
    db.exec("PRAGMA wal_checkpoint(FULL)");
    db.exec(`VACUUM INTO ${sqlString(targetPath)}`);
  } finally {
    db.close();
  }
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function listPackageFiles(root) {
  if (!fs.existsSync(root)) return [];
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listPackageFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
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

function browserExportRawText(payload = {}) {
  if (typeof payload === "string") return payload;
  if (typeof payload.raw === "string") return payload.raw;
  if (payload.data) return JSON.stringify(payload.data);
  if (payload.browserExport) return JSON.stringify(payload.browserExport);
  return JSON.stringify(payload);
}

function browserExportParsedPayload(payload = {}, raw = "") {
  if (payload && typeof payload === "object" && !payload.raw && !payload.data && !payload.browserExport && (payload.store || Array.isArray(payload.projects))) return payload;
  if (payload.data) return payload.data;
  if (payload.browserExport) return payload.browserExport;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Browser export is not readable JSON: ${error.message}`);
  }
}

function extractStoreFromBrowserExport(parsed) {
  if (parsed?.app === "Project State" && parsed?.backupType === "full-storage-spine" && parsed.store) return parsed.store;
  if (parsed?.app === "Project State" && parsed?.exportType === "raw-current-store" && parsed.store) return parsed.store;
  if (parsed?.app === "Project State" && parsed.project) throw new Error("Single-project exports cannot be migrated into the desktop spine.");
  if (parsed && Array.isArray(parsed.projects)) return parsed;
  throw new Error("Browser export does not contain a full Project State store.");
}

function describeBrowserExport(parsed) {
  return {
    app: parsed?.app || "",
    backupType: parsed?.backupType || "",
    exportType: parsed?.exportType || "",
    exportedAt: parsed?.exportedAt || "",
    schemaVersion: parsed?.schemaVersion || parsed?.store?.schemaVersion || "",
    storageMode: parsed?.storage?.storageMode || parsed?.storageMode || ""
  };
}

function buildMigrationManifest(store, context = {}) {
  const counts = countStorePartsForBridge(store);
  const snapshot = JSON.stringify(store);
  return {
    spineVersion: "0.2.0-desktop",
    layoutVersion: "desktop-sqlite-managed-files-v1",
    migrationType: "browser-json-to-desktop-spine",
    importedAt: nowIso(),
    importedBy: context.actorId || "",
    importReason: context.reason || "",
    sourceFile: context.sourceFile || "",
    source: context.source || {},
    snapshotBytes: Buffer.byteLength(snapshot, "utf8"),
    counts,
    largeContent: {
      attachments: counts.attachments,
      attachmentDataCharacters: collectAttachments(store).reduce((total, item) => total + String(item.dataUrl || "").length, 0),
      extractTextCharacters: (store.projects || []).reduce((total, project) => total + (project.sources || []).reduce((sourceTotal, source) => sourceTotal + (source.extracts || []).reduce((extractTotal, extract) => extractTotal + String(extract.text || "").length, 0), 0), 0)
    },
    splitTargets: {
      meta: 1,
      projects: counts.projects,
      history: counts.changes,
      sources: counts.sources,
      extracts: counts.extracts,
      attachments: counts.attachments,
      drafts: counts.drafts,
      recovery: 0
    }
  };
}

function countStorePartsForBridge(store = {}) {
  const counts = {
    actors: (store.actors || []).length,
    intakeItems: (store.intakeItems || []).length,
    projects: (store.projects || []).length,
    archivedProjects: 0,
    decisions: 0,
    facts: 0,
    sources: 0,
    extracts: 0,
    drafts: 0,
    relationships: 0,
    openQuestions: 0,
    nextActions: 0,
    changes: 0,
    attachments: 0,
    projectSourceLinks: 0,
    objectSourceLinks: 0
  };

  for (const project of store.projects || []) {
    if (project.archived) counts.archivedProjects += 1;
    counts.decisions += (project.decisions || []).length;
    counts.facts += (project.facts || []).length;
    counts.sources += (project.sources || []).length;
    counts.extracts += (project.sources || []).reduce((total, source) => total + (source.extracts || []).length, 0);
    counts.drafts += (project.draftProjects || []).length;
    counts.relationships += (project.relationships || []).length;
    counts.openQuestions += (project.openQuestions || []).length;
    counts.nextActions += (project.nextActions || []).length;
    counts.changes += (project.changes || []).length;
    counts.attachments += collectProjectAttachments(project).length;
    counts.projectSourceLinks += (project.sourceLinks || []).length;

    for (const list of [project.decisions, project.facts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes]) {
      for (const item of list || []) counts.objectSourceLinks += (item.sourceLinks || []).length;
    }
    for (const source of project.sources || []) {
      counts.objectSourceLinks += (source.sourceLinks || []).length;
      for (const extract of source.extracts || []) counts.objectSourceLinks += (extract.sourceLinks || []).length;
    }
  }

  return counts;
}

function validateMigrationStore(store = {}) {
  const errors = [];
  const ids = new Set();
  const projectIds = new Set((store.projects || []).map((project) => project.id).filter(Boolean));
  const actorIds = new Set((store.actors || []).map((actor) => actor.id).filter(Boolean));
  const sourceIds = new Set();
  const extractIds = new Set();
  let sourceLinks = 0;

  if (!store || !Array.isArray(store.projects)) errors.push("Store missing projects array.");
  const addId = (id, label) => {
    if (!id) {
      errors.push(`${label} missing id.`);
      return;
    }
    if (ids.has(id)) errors.push(`Duplicate id: ${label}:${id}`);
    ids.add(id);
  };

  for (const actor of store.actors || []) addId(actor.id, "Actor");
  for (const intake of store.intakeItems || []) addId(intake.id, "Intake item");

  for (const project of store.projects || []) {
    addId(project.id, "Project");
    if (!project.name) errors.push(`Project ${project.id || "(missing id)"} missing name.`);
    if (project.updatedBy && !actorIds.has(project.updatedBy)) errors.push(`Project ${project.id} updatedBy missing actor ${project.updatedBy}.`);
    sourceLinks += (project.sourceLinks || []).length;

    for (const decision of project.decisions || []) validateProjectObject(errors, ids, project, decision, "Decision", "decision");
    for (const fact of project.facts || []) validateProjectObject(errors, ids, project, fact, "Fact", "fact");
    for (const question of project.openQuestions || []) validateProjectObject(errors, ids, project, question, "OpenQuestion", "question");
    for (const action of project.nextActions || []) validateProjectObject(errors, ids, project, action, "NextAction", "action");
    for (const relationship of project.relationships || []) {
      validateProjectObject(errors, ids, project, relationship, "Relationship", "relationship");
      if (relationship.targetProjectId && !projectIds.has(relationship.targetProjectId)) errors.push(`Relationship ${relationship.id} missing target project ${relationship.targetProjectId}.`);
    }

    for (const source of project.sources || []) {
      validateProjectObject(errors, ids, project, source, "Source", "source");
      if (source.id) sourceIds.add(source.id);
      sourceLinks += (source.sourceLinks || []).length;
      for (const extract of source.extracts || []) {
        validateProjectObject(errors, ids, project, extract, "Extract", "extract");
        if (extract.sourceId !== source.id) errors.push(`Extract ${extract.id} sourceId mismatch.`);
        if (extract.id) extractIds.add(extract.id);
        sourceLinks += (extract.sourceLinks || []).length;
      }
    }

    for (const draft of project.draftProjects || []) {
      validateProjectObject(errors, ids, project, draft, "DraftProject", "draft");
      if (draft.sourceId && !sourceIds.has(draft.sourceId)) errors.push(`Draft ${draft.id} missing source ${draft.sourceId}.`);
      if (draft.extractId && !extractIds.has(draft.extractId)) errors.push(`Draft ${draft.id} missing extract ${draft.extractId}.`);
    }

    for (const change of project.changes || []) {
      validateProjectObject(errors, ids, project, change, "Change", "change");
      if (!change.actorId && !change.actorName) errors.push(`Change ${change.id} missing actor.`);
      if (!change.timestamp) errors.push(`Change ${change.id} missing timestamp.`);
      if (!change.reason) errors.push(`Change ${change.id} missing reason.`);
      if (!change.details?.objectType && !change.details?.objectId) errors.push(`Change ${change.id} missing changed object detail.`);
    }

    for (const attachment of collectProjectAttachments(project)) {
      addId(attachment.id, "Attachment");
      if (attachment.projectId !== project.id) errors.push(`Attachment ${attachment.id} projectId mismatch.`);
      if (!attachment.attachedToType || !attachment.attachedToId) errors.push(`Attachment ${attachment.id} missing attachment target.`);
    }
  }

  return { errors, idCount: ids.size, sourceLinks };
}

function validateProjectObject(errors, ids, project, record, label, duplicateLabel) {
  if (!record.id) errors.push(`${label} missing id.`);
  else if (ids.has(record.id)) errors.push(`Duplicate id: ${duplicateLabel}:${record.id}`);
  else ids.add(record.id);
  if (record.projectId && record.projectId !== project.id) errors.push(`${label} ${record.id} projectId mismatch.`);
}

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function countRows(db, table) {
  return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
}

function compareManifestCount(report, manifest, key, actual) {
  const expected = manifest?.counts?.[key];
  if (typeof expected === "number" && expected !== actual) {
    report.errors.push(`Manifest count mismatch for ${key}: expected ${expected}, found ${actual}`);
  }
}

function compareManifestLargeCount(report, manifest, key, actual) {
  const expected = manifest?.largeContent?.[key] ?? manifest?.splitTargets?.[key];
  if (typeof expected === "number" && expected !== actual) {
    report.errors.push(`Manifest large-content count mismatch for ${key}: expected ${expected}, found ${actual}`);
  }
}

function verifyManagedTextRows(report, db, storageRoot, options) {
  const { table, idColumn, pathColumn, checksumColumn, bytesColumn, label } = options;
  const rows = db.prepare(`
    SELECT ${idColumn} AS id, ${pathColumn} AS managedPath, ${checksumColumn} AS checksum${bytesColumn ? `, ${bytesColumn} AS expectedBytes` : ""}
    FROM ${table}
    WHERE ${pathColumn} IS NOT NULL AND ${pathColumn} != ''
  `).all();

  for (const row of rows) {
    let filePath = "";
    try {
      filePath = resolveManagedPath(storageRoot, row.managedPath);
    } catch (error) {
      report.errors.push(`${label} ${row.id} has unsafe managed path: ${error.message}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      report.errors.push(`${label} ${row.id} is missing managed file: ${row.managedPath}`);
      continue;
    }
    const text = fs.readFileSync(filePath, "utf8");
    if (row.checksum && checksumText(text) !== row.checksum) {
      report.errors.push(`${label} ${row.id} checksum mismatch.`);
    }
    if (bytesColumn && typeof row.expectedBytes === "number" && Buffer.byteLength(text, "utf8") !== row.expectedBytes) {
      report.errors.push(`${label} ${row.id} byte length mismatch.`);
    }
    report.checkedFiles[label] += 1;
  }
}

function verifyManagedBinaryRows(report, db, storageRoot, options) {
  const { table, idColumn, pathColumn, checksumColumn, label } = options;
  const rows = db.prepare(`
    SELECT ${idColumn} AS id, ${pathColumn} AS managedPath, ${checksumColumn} AS checksum
    FROM ${table}
    WHERE ${pathColumn} IS NOT NULL AND ${pathColumn} != ''
  `).all();
  for (const row of rows) {
    let filePath = "";
    try {
      filePath = resolveManagedPath(storageRoot, row.managedPath);
    } catch (error) {
      report.errors.push(`${label} ${row.id} has unsafe managed path: ${error.message}`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      report.errors.push(`${label} ${row.id} is missing managed file: ${row.managedPath}`);
      continue;
    }
    const checksum = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
    if (row.checksum && checksum !== row.checksum) report.errors.push(`${label} ${row.id} checksum mismatch.`);
    report.checkedFiles[label] = (report.checkedFiles[label] || 0) + 1;
  }
}

async function finalizeIntegrityReport(report, { storageRoot, dbPath, preserveOnFailure }) {
  report.ok = report.errors.length === 0;
  if (!report.ok && preserveOnFailure) {
    await preserveRecoveryRecord({
      storageRoot,
      dbPath,
      issue: {
        stage: "desktop-integrity",
        message: "Desktop spine integrity check failed.",
        raw: JSON.stringify(report, null, 2)
      }
    });
  }
  return report;
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

async function preserveRecoveryRecordWithOpenDb(db, storageRoot, issue = {}) {
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
  insertJson(db, "recovery_records", {
    id: record.id,
    date: record.date,
    stage: record.stage || "",
    message: record.message || "",
    managed_path: record.managedPath || "",
    record_json: JSON.stringify(record)
  });
  return { ok: true, id, managedPath };
}

async function verifyIntegrity({ storageRoot, dbPath, preserveOnFailure = true } = {}) {
  await ensureSpine(storageRoot);
  const report = {
    ok: true,
    checkedAt: nowIso(),
    storageRoot,
    databaseFile: dbPath,
    counts: {},
    checkedFiles: {
      extracts: 0,
      attachments: 0,
      manifests: 0
    },
    errors: []
  };

  let db = null;
  try {
    for (const folder of FOLDERS) {
      if (!fs.existsSync(path.join(storageRoot, folder))) report.errors.push(`Missing managed folder: ${folder}`);
    }
    if (!fs.existsSync(dbPath)) {
      report.errors.push("Missing project-state.db.");
      return finalizeIntegrityReport(report, { storageRoot, dbPath, preserveOnFailure });
    }

    db = openDatabase(dbPath);
    for (const table of REQUIRED_TABLES) {
      if (!tableExists(db, table)) report.errors.push(`Missing SQLite table: ${table}`);
    }
    if (report.errors.length) return finalizeIntegrityReport(report, { storageRoot, dbPath, preserveOnFailure });

    report.counts = {
      projects: countRows(db, "projects"),
      changes: countRows(db, "changes"),
      sources: countRows(db, "sources"),
      extracts: countRows(db, "extracts"),
      attachments: countRows(db, "attachments"),
      drafts: countRows(db, "draft_projects")
    };

    const manifest = readMeta(db, "manifest") || {};
    compareManifestCount(report, manifest, "projects", report.counts.projects);
    compareManifestCount(report, manifest, "changes", report.counts.changes);
    compareManifestCount(report, manifest, "sources", report.counts.sources);
    compareManifestCount(report, manifest, "extracts", report.counts.extracts);
    compareManifestCount(report, manifest, "drafts", report.counts.drafts);
    compareManifestLargeCount(report, manifest, "attachments", report.counts.attachments);

    verifyManagedTextRows(report, db, storageRoot, {
      table: "extracts",
      idColumn: "id",
      pathColumn: "text_path",
      checksumColumn: "checksum",
      bytesColumn: "text_bytes",
      label: "extracts"
    });
    verifyManagedTextRows(report, db, storageRoot, {
      table: "attachments",
      idColumn: "id",
      pathColumn: "managed_path",
      checksumColumn: "checksum",
      bytesColumn: "",
      label: "attachments"
    });
    verifyManagedBinaryRows(report, db, storageRoot, {
      table: "sources",
      idColumn: "id",
      pathColumn: "managed_path",
      checksumColumn: "checksum",
      label: "sources"
    });

    const latestManifest = readMeta(db, "latest_manifest_file");
    if (latestManifest?.path) {
      const manifestPath = resolveManagedPath(storageRoot, latestManifest.path);
      if (!fs.existsSync(manifestPath)) report.errors.push(`Latest manifest file is missing: ${latestManifest.path}`);
      else report.checkedFiles.manifests += 1;
    }
  } catch (error) {
    report.errors.push(error.message);
  } finally {
    if (db) db.close();
  }

  return finalizeIntegrityReport(report, { storageRoot, dbPath, preserveOnFailure });
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

function writeIntakeBatches(db, batches) {
  for (const batch of batches || []) {
    insertJson(db, "intake_batches", {
      id: batch.id,
      status: batch.status || "",
      created_at: batch.createdAt || "",
      record_json: JSON.stringify(batch)
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
    intakeBatches: readRecordJson(db, "intake_batches"),
    intakeItems: readRecordJson(db, "intake_items"),
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
    intakeBatches: Array.isArray(split.intakeBatches) ? split.intakeBatches : (Array.isArray(meta.intakeBatches) ? meta.intakeBatches : []),
    intakeItems: Array.isArray(split.intakeItems) ? split.intakeItems : (Array.isArray(meta.intakeItems) ? meta.intakeItems : []),
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
  const filePath = resolveManagedPath(storageRoot, managedPath);
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
      intakeBatches: store.intakeBatches || [],
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
  for (const project of store.projects || []) attachments.push(...collectProjectAttachments(project));
  return attachments;
}

function collectProjectAttachments(project) {
  const attachments = [];
  const collect = (project, ownerType, ownerId, links = []) => {
    for (const image of links || []) attachments.push({ ...image, projectId: image.projectId || project.id, attachedToType: image.attachedToType || ownerType, attachedToId: image.attachedToId || ownerId });
  };
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

function verifyLocalFile(reference = {}) {
  const filePath = pathFromFileLike(reference?.path || reference?.localPath || reference);
  const expected = reference?.expected || reference || {};
  const checkedAt = nowIso();

  if (!filePath) {
    return {
      status: "unverifiable",
      exists: false,
      checkedAt,
      reason: "No absolute local path is recorded for this source."
    };
  }

  if (!fs.existsSync(filePath)) {
    return {
      status: "missing",
      exists: false,
      path: filePath,
      checkedAt,
      reason: "The recorded local file path does not exist."
    };
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return {
      status: "unverifiable",
      exists: true,
      path: filePath,
      checkedAt,
      reason: "The recorded path exists but is not a file."
    };
  }

  const actual = {
    name: path.basename(filePath),
    type: mimeFromFileName(filePath),
    size: stat.size,
    lastModified: stat.mtime.toISOString()
  };
  const expectedSize = Number(expected.size || 0);
  const changed = expectedSize > 0 && expectedSize !== actual.size;

  return {
    status: changed ? "changed" : "verified",
    exists: true,
    path: filePath,
    checkedAt,
    actual,
    expected: {
      name: expected.name || "",
      type: expected.type || "",
      size: expectedSize || 0,
      lastModified: expected.lastModified || ""
    },
    reason: changed ? "The file exists, but its size differs from the recorded source metadata." : "The file exists and matches recorded size metadata."
  };
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

function resolveManagedPath(storageRoot, managedPath) {
  const root = path.resolve(storageRoot);
  const filePath = path.resolve(root, managedPath);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) throw new Error("Managed path escaped storage root.");
  return filePath;
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
  verifyIntegrity,
  FOLDERS,
  BACKUP_MANAGED_FOLDERS,
  REQUIRED_TABLES,
  DATABASE_FILE
};
