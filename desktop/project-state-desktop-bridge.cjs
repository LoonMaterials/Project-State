const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { createProvisionalConceptProfile } = require("./review-provisional-profile.cjs");
const zlib = require("node:zlib");
const { Readable } = require("node:stream");
const { DatabaseSync } = require("node:sqlite");
const {
  QWEN3_8B_PROVIDER_ID,
  QWEN3_8B_ARM_ID,
  QWEN3_8B_MODEL_ID,
  describeLocalAiProviders,
  generateQwenIdeaCandidates,
  reviewQwenCoreProject
} = require("./local-ai-providers.cjs");

const ROOT = path.join(__dirname, "..");
const SCHEMA_FILE = path.join(__dirname, "spine-schema.sql");
const API_ARM_CONTRACT_FILE = path.join(ROOT, "fixtures", "api-arm-v0.1-contract.json");
const IDEA_CANDIDATE_CONTRACT_FILE = path.join(ROOT, "fixtures", "idea-candidate-v0.1-contract.json");
const AI_ANALYSIS_ARM_CONTRACT_FILE = path.join(ROOT, "fixtures", "ai-analysis-arm-v0.1-contract.json");
const REVIEW_RESULT_SCHEMA_FILE = path.join(ROOT, "fixtures", "review-result-v1.0.schema.json");
const REVIEW_PACK_SCHEMA_FILE = path.join(ROOT, "fixtures", "review-pack-v1.0.schema.json");
const EXTERNAL_REVIEW_CLASSIFICATIONS = ["project_candidate", "existing_project_support", "reference_note", "personal_context_note", "assistant_scaffolding_noise", "rejected_noise"];
const EXTERNAL_REVIEW_EVIDENCE_ROLES = ["primary_evidence", "background_reference", "duplicate_or_confirming_reference", "validation_or_test_support", "risk_or_contradiction", "patent_licensing_or_outreach_support", "cross_project_reference", "additional_project_reference", "context_only", "noise"];
const EXTERNAL_REVIEW_HIERARCHY_TYPES = ["umbrella", "project", "subproject", "product", "theme", "future_idea", "reference"];
const EXTERNAL_REVIEW_MATURITY = ["seed", "exploratory", "forming", "active", "mature", "paused", "archived", "unknown"];
const DEFAULT_STORAGE_ROOT = path.join(os.homedir(), "Project State Storage");
const DATABASE_FILE = "project-state.db";
const FOLDERS = ["sources", "extracts", "attachments", "quarantine", "discovery", "backups", "recovery", "manifests", "logs", "temp", "integrations"];
const SPLIT_TABLES = ["projects", "changes", "sources", "extracts", "attachments", "draft_projects"];
const BACKUP_MANAGED_FOLDERS = ["sources", "extracts", "attachments", "quarantine", "discovery", "manifests", "recovery"];
const DISCOVERY_FILE_TYPE_REGISTRY = [
  {
    extensions: [".pdf", ".docx"],
    key: "document",
    label: "Document / patent evidence",
    readMode: "text",
    projectRole: "primary_document",
    routingHint: "Use extracted text when available; keep supporting files with the same folder/project."
  },
  {
    extensions: [".doc", ".rtf", ".odt"],
    key: "document_legacy",
    label: "Legacy document evidence",
    readMode: "metadata_only",
    projectRole: "primary_document",
    routingHint: "Do not deep-read locally yet; route by filename, folder, and nearby readable documents."
  },
  {
    extensions: [".txt", ".md", ".csv", ".log", ".xml", ".xhtml", ".pat", ".bib", ".ris"],
    key: "notes",
    label: "Notes / text evidence",
    readMode: "text",
    projectRole: "primary_or_supporting_text",
    routingHint: "Read locally and use headings, filenames, and folder grouping for project candidates."
  },
  {
    extensions: [".ipynb"],
    key: "notebook",
    label: "Notebook / analysis evidence",
    readMode: "text",
    projectRole: "analysis_notebook",
    routingHint: "Read notebook cells locally and keep outputs with nearby code, data, and project context."
  },
  {
    extensions: [".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf"],
    key: "data_config",
    label: "Data / config evidence",
    readMode: "text",
    projectRole: "data_or_configuration",
    routingHint: "Read locally when safe; use top-level keys, filenames, and parent folder context."
  },
  {
    extensions: [".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".cpp", ".c", ".h", ".hpp", ".cs", ".java", ".rs", ".go", ".sql", ".sh", ".ps1", ".bat", ".cmd", ".lua", ".r", ".m", ".jl"],
    key: "code",
    label: "Code / test evidence",
    readMode: "text",
    projectRole: "source_code_or_test",
    routingHint: "Read as source text only; never execute. Keep with the nearest project folder."
  },
  {
    extensions: [".uproject", ".uplugin"],
    key: "unreal",
    label: "Unreal project descriptor",
    readMode: "text",
    projectRole: "project_descriptor",
    routingHint: "Strongly indicates the parent folder is an Unreal project."
  },
  {
    extensions: [".uasset", ".umap"],
    key: "unreal",
    label: "Unreal asset / map evidence",
    readMode: "metadata_only",
    projectRole: "project_asset",
    routingHint: "Do not deep-read; keep with the parent Unreal project or nearest project descriptor."
  },
  {
    extensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".svg", ".heic", ".psd", ".ai", ".eps"],
    key: "image_visual",
    label: "Image / sketch / visual evidence",
    readMode: "metadata_only",
    projectRole: "visual_supporting_evidence",
    routingHint: "Treat as visual support; route by filename, folder, and nearby readable documents."
  },
  {
    extensions: [".blend", ".fbx", ".obj", ".gltf", ".glb", ".stl", ".step", ".stp", ".iges", ".igs", ".dwg", ".dxf", ".3ds", ".dae"],
    key: "model_cad",
    label: "3D / CAD / model evidence",
    readMode: "metadata_only",
    projectRole: "model_or_design_asset",
    routingHint: "Do not deep-read; keep with design, patent, Unreal, or prototype folder context."
  },
  {
    extensions: [".zip", ".7z", ".rar", ".tar", ".gz", ".tgz", ".bz2", ".xz"],
    key: "archive_package",
    label: "Archive / package evidence",
    readMode: "metadata_only",
    projectRole: "packaged_supporting_material",
    routingHint: "Do not unpack automatically; keep as supporting evidence unless the user explicitly extracts it."
  },
  {
    extensions: [".sqlite", ".sqlite3", ".db", ".mdb", ".accdb"],
    key: "database",
    label: "Database evidence",
    readMode: "metadata_only",
    projectRole: "data_store",
    routingHint: "Do not query automatically; route by filename, folder, and related code/config files."
  },
  {
    extensions: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".mp3", ".wav", ".flac", ".m4a"],
    key: "media",
    label: "Audio / video evidence",
    readMode: "metadata_only",
    projectRole: "media_supporting_evidence",
    routingHint: "Do not transcribe automatically; keep with nearby project material."
  },
  {
    extensions: [".exe", ".msi", ".dll", ".scr", ".com", ".jar", ".apk", ".app", ".dmg", ".pkg", ".so", ".dylib"],
    key: "blocked_executable",
    label: "Executable / installer",
    readMode: "blocked",
    projectRole: "blocked_security_sensitive_file",
    routingHint: "Do not import or read. Record only as blocked if a future surface manifest is created."
  }
];
const DISCOVERY_FILE_TYPE_BY_EXTENSION = new Map(DISCOVERY_FILE_TYPE_REGISTRY.flatMap((entry) => entry.extensions.map((extension) => [extension, entry])));
const MAX_IMPORT_FILE_BYTES = 2147483648;
const MAX_TEXT_EXTRACTION_BYTES = 104857600;
const MAX_IMMEDIATE_DISCOVERY_WORDS = 250000;
const CORPUS_PREFLIGHT_SAMPLE_BYTES = 524288;
const MAX_IMPORT_FILES = 500;
const DISCOVERY_REVIEW_UNIT_LIMIT = 100;
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
  "recovery_records",
  "file_assets",
  "file_versions",
  "discovery_cases",
  "discovery_case_files",
  "discovery_interactions",
  "security_receipts",
  "discovery_events",
  "discovery_extractions",
  "discovery_chunks",
  "idea_analysis_runs",
  "idea_privacy_authorizations",
  "idea_transmission_receipts",
  "ai_analysis_jobs",
  "idea_candidates",
  "ai_analysis_result_receipts",
  "idea_review_decisions",
  "confirmed_idea_units",
  "external_review_passes",
  "review_export_packages",
  "external_review_actions"
];

function createProjectStateDesktopBridge(options = {}) {
  const storageRoot = path.resolve(options.storageRoot || process.env.PROJECT_STATE_STORAGE_ROOT || DEFAULT_STORAGE_ROOT);
  assertStorageRootOutsideApp(storageRoot);
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
    discoveryStorage: {
      async initialize() {
        return initializeDiscoveryStorage({ storageRoot, dbPath });
      },
      async registerFileVersion(payload = {}) {
        return registerDiscoveryFileVersion({ storageRoot, dbPath, payload });
      },
      async createCase(payload = {}) {
        return createDiscoveryCase({ storageRoot, dbPath, payload });
      },
      async attachFileVersion(payload = {}) {
        return attachDiscoveryFileVersion({ storageRoot, dbPath, payload });
      },
      async appendInteraction(payload = {}) {
        return appendDiscoveryInteraction({ storageRoot, dbPath, payload });
      },
      async appendSecurityReceipt(payload = {}) {
        return appendDiscoverySecurityReceipt({ storageRoot, dbPath, payload });
      },
      async appendEvent(payload = {}) {
        return appendDiscoveryEvent({ storageRoot, dbPath, payload });
      },
      async readFoundationState(payload = {}) {
        return readDiscoveryFoundationState({ storageRoot, dbPath, payload });
      },
      async stageTrustedFile(payload = {}) {
        return stageTrustedDiscoveryFile({ storageRoot, dbPath, payload });
      },
      async extractFileVersion(payload = {}) {
        return extractDiscoveryFileVersion({ storageRoot, dbPath, payload });
      },
      async indexCorpus(payload = {}) {
        return indexDiscoveryCorpus({ storageRoot, dbPath, payload });
      },
      async readExtractionText(payload = {}) {
        return readDiscoveryExtractionText({ storageRoot, dbPath, payload });
      },
      async readChunkText(payload = {}) {
        return readDiscoveryChunkText({ storageRoot, dbPath, payload });
      },
      async analyzeCase(payload = {}) {
        return analyzeDiscoveryCase({ storageRoot, dbPath, payload });
      },
      async recordAnswer(payload = {}) {
        return recordDiscoveryAnswer({ storageRoot, dbPath, payload });
      },
      async confirmRouting(payload = {}) {
        return confirmDiscoveryRouting({ storageRoot, dbPath, payload });
      },
      async getCase(payload = {}) {
        return getDiscoveryCase({ storageRoot, dbPath, payload });
      },
      async promoteToIntake(payload = {}) {
        return promoteDiscoveryToIntake({ storageRoot, dbPath, payload });
      }
    },
    analysisArms: {
      async describeCapabilities() {
        return describeAnalysisArmCapabilities();
      },
      async createRun(payload = {}) {
        return createIdeaAnalysisRun({ storageRoot, dbPath, payload });
      },
      async authorizeTransmission(payload = {}) {
        return authorizeIdeaTransmission({ storageRoot, dbPath, payload });
      },
      async submitAnalysisBatch(envelope = {}) {
        return submitFakeAnalysisBatch({ storageRoot, dbPath, envelope });
      },
      async getAnalysisStatus(requestId = "") {
        return getIdeaAnalysisJob({ storageRoot, dbPath, requestId });
      },
      async getResultPage(requestId = "", cursor = null) {
        return getIdeaAnalysisResultPage({ storageRoot, dbPath, requestId, cursor });
      },
      async cancelAnalysis(requestId = "") {
        return cancelIdeaAnalysisJob({ storageRoot, dbPath, requestId });
      },
      async getReceipt(requestId = "") {
        return getIdeaAnalysisReceipt({ storageRoot, dbPath, requestId });
      },
      async recordReviewDecision(payload = {}) {
        return recordIdeaReviewDecision({ storageRoot, dbPath, payload });
      },
      async readState(payload = {}) {
        return readIdeaAnalysisState({ storageRoot, dbPath, payload });
      },
      async reviewCoreProject(payload = {}) {
        return reviewQwenCoreProject(payload);
      }
    },
    reviewExchange: {
      async exportUniversalPack(payload = {}) {
        return createUniversalReviewPack({ storageRoot, dbPath, payload });
      },
      async exportProjectFinalReviewPack(payload = {}) {
        return createProjectFinalReviewPack({ storageRoot, payload });
      },
      async importExternalReview(payload = {}) {
        return importExternalReviewPass({ storageRoot, dbPath, payload });
      },
      async importPastedExternalReview(payload = {}) {
        return importPastedExternalReviewPass({ storageRoot, dbPath, payload });
      },
      async savePastedExternalReview(payload = {}) {
        return savePastedExternalReviewDraft({ storageRoot, dbPath, payload });
      },
      async listExternalReviews(payload = {}) {
        return listExternalReviewPasses({ storageRoot, dbPath, payload });
      },
      async recordHumanAction(payload = {}) {
        return recordExternalReviewAction({ storageRoot, dbPath, payload });
      },
      async listHumanActions(payload = {}) {
        return listExternalReviewActions({ storageRoot, dbPath, payload });
      }
    },
    securityArms: {
      async authorizeContentAccess(reference = {}) {
        return authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference });
      }
    },
    files: {
      metadata,
      localPath,
      async inspectImportSelection(payload = {}) {
        return inspectImportSelection(payload);
      },
      async stageManagedFiles(payload = {}) {
        return stageManagedFiles({ storageRoot, ...payload });
      },
      verifyLocalFile(reference = {}) {
        if (reference?.managedPath) {
          return verifyLocalFile({
            ...reference,
            path: resolveManagedPath(storageRoot, reference.managedPath)
          });
        }
        return verifyLocalFile(reference);
      },
      async readAsDataUrl(file) {
        await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: file });
        return readAsDataUrl(resolveDiscoveryReadReference(storageRoot, file));
      },
      async readAsText(file) {
        await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: file });
        return readAsText(resolveDiscoveryReadReference(storageRoot, file));
      },
      async readAsArrayBuffer(file) {
        await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: file });
        return readAsArrayBuffer(resolveDiscoveryReadReference(storageRoot, file));
      },
      async extractText(file) {
        await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: file });
        return extractText(resolveDiscoveryReadReference(storageRoot, file));
      },
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

async function inspectImportSelection({ paths = [] } = {}) {
  const candidates = [];
  const skipped = [];
  const seen = new Set();

  async function inspectPath(inputPath) {
    if (candidates.length >= MAX_IMPORT_FILES) {
      skipped.push({ localPath: String(inputPath || ""), reason: "File selection limit reached." });
      return;
    }
    const localPath = path.resolve(String(inputPath || ""));
    if (seen.has(localPath)) return;
    seen.add(localPath);
    let stat;
    try {
      stat = await fsp.lstat(localPath);
    } catch {
      skipped.push({ localPath, reason: "File or folder could not be read." });
      return;
    }
    if (stat.isSymbolicLink()) {
      skipped.push({ localPath, reason: "Symbolic links are not imported." });
      return;
    }
    if (stat.isDirectory()) {
      const entries = await fsp.readdir(localPath);
      for (const entry of entries.sort((a, b) => a.localeCompare(b))) await inspectPath(path.join(localPath, entry));
      return;
    }
    if (!stat.isFile()) return;
    const classification = classifyDiscoveryFile(localPath);
    if (!classification.importAllowed) {
      skipped.push({ localPath, reason: classification.blockReason || "File type is not supported.", fileType: classification });
      return;
    }
    if (!stat.size) {
      skipped.push({ localPath, reason: "Empty files are not imported." });
      return;
    }
    if (stat.size > MAX_IMPORT_FILE_BYTES) {
      skipped.push({ localPath, reason: `File exceeds the ${formatBytesForLog(MAX_IMPORT_FILE_BYTES)} local archive import limit.` });
      return;
    }
    candidates.push({
      localPath,
      name: path.basename(localPath),
      contentType: mimeFromFileName(localPath),
      size: stat.size,
      lastModified: stat.mtime.toISOString(),
      evidenceKind: classification.evidenceKind,
      fileType: classification,
      readMode: classification.readMode,
      projectRole: classification.projectRole,
      routingHint: classification.routingHint
    });
  }

  for (const inputPath of Array.isArray(paths) ? paths : []) await inspectPath(inputPath);
  return { candidates, skipped, limits: { maxFiles: MAX_IMPORT_FILES, maxFileBytes: MAX_IMPORT_FILE_BYTES } };
}

async function stageManagedFiles({ storageRoot, files = [] } = {}) {
  await ensureSpine(storageRoot);
  const staged = [];
  const errors = [];
  for (const file of Array.isArray(files) ? files.slice(0, MAX_IMPORT_FILES) : []) {
    const intakeId = String(file.intakeId || "").trim();
    const localPath = path.resolve(String(file.localPath || ""));
    try {
      if (!/^intake_[A-Za-z0-9_-]+$/.test(intakeId)) throw new Error("A valid Intake ID is required.");
      const stat = await fsp.lstat(localPath);
      const classification = classifyDiscoveryFile(localPath);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Only regular files can be imported.");
      if (!classification.importAllowed) throw new Error(classification.blockReason || "File type is not supported.");
      if (!stat.size || stat.size > MAX_IMPORT_FILE_BYTES) throw new Error("File size is outside the allowed archive range.");
      const fileName = safeFileName(path.basename(localPath));
      const targetPath = path.join(storageRoot, "sources", intakeId, fileName);
      const tempPath = path.join(storageRoot, "temp", `${intakeId}-${Date.now()}-${fileName}.import`);
      await fsp.mkdir(path.dirname(tempPath), { recursive: true });
      await fsp.copyFile(localPath, tempPath, fs.constants.COPYFILE_EXCL);
      const sha256 = await checksumFile(tempPath);
      const stagedStat = await fsp.stat(tempPath);
      await fsp.mkdir(path.dirname(targetPath), { recursive: true });
      await fsp.rename(tempPath, targetPath);
      staged.push({
        intakeId,
        fileName,
        contentType: mimeFromFileName(fileName),
        size: stagedStat.size,
        sha256,
        managedPath: relativeManagedPath(storageRoot, targetPath),
        originalPath: localPath,
        lastModified: stat.mtime.toISOString(),
        fileType: classification,
        readMode: classification.readMode
      });
    } catch (error) {
      errors.push({ intakeId, localPath, message: error.message });
    }
  }
  return { staged, errors };
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
  db.exec("PRAGMA busy_timeout = 5000;");
  const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
  db.exec(schema);
  migrateFileVersionsManagedPathConstraint(db);
  migrateDiscoveryExtractionStatusConstraint(db);
  db.exec(schema);
  return db;
}

function assertStorageRootOutsideApp(storageRoot) {
  const resolvedStorage = path.resolve(storageRoot);
  const resolvedAppRoot = path.resolve(ROOT);
  const relative = path.relative(resolvedAppRoot, resolvedStorage);
  const insideAppRoot = relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  if (!insideAppRoot) return;
  throw new Error(`Unsafe Project State storage root: ${resolvedStorage}. Choose a folder outside the Project State app/install folder so uninstall or reinstall cannot remove live data.`);
}

function migrateDiscoveryExtractionStatusConstraint(db) {
  const row = db.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'discovery_extractions'").get();
  const createSql = String(row?.sql || "");
  if (!createSql || createSql.includes("large_corpus_pending")) return;
  db.exec("PRAGMA foreign_keys = OFF;");
  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION;");
    db.exec(`
      DROP TRIGGER IF EXISTS discovery_extractions_append_only_update;
      DROP TRIGGER IF EXISTS discovery_extractions_append_only_delete;
      DROP TABLE IF EXISTS discovery_extractions_new;
      CREATE TABLE discovery_extractions_new (
        id TEXT PRIMARY KEY,
        discovery_case_id TEXT NOT NULL,
        file_asset_id TEXT NOT NULL,
        file_version_id TEXT NOT NULL,
        source_sha256 TEXT NOT NULL CHECK(length(source_sha256) = 64),
        status TEXT NOT NULL CHECK(status IN ('complete', 'partial', 'metadata_only', 'large_file_pending', 'large_corpus_pending', 'unsupported', 'failed')),
        extractor_id TEXT NOT NULL,
        text_path TEXT,
        text_sha256 TEXT,
        text_bytes INTEGER NOT NULL DEFAULT 0 CHECK(text_bytes >= 0),
        created_at TEXT NOT NULL,
        record_json TEXT NOT NULL,
        FOREIGN KEY(discovery_case_id) REFERENCES discovery_cases(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        FOREIGN KEY(file_version_id, file_asset_id, source_sha256) REFERENCES file_versions(id, file_asset_id, sha256) ON UPDATE RESTRICT ON DELETE RESTRICT
      );
      INSERT INTO discovery_extractions_new (id, discovery_case_id, file_asset_id, file_version_id, source_sha256, status, extractor_id, text_path, text_sha256, text_bytes, created_at, record_json)
      SELECT id, discovery_case_id, file_asset_id, file_version_id, source_sha256, status, extractor_id, text_path, text_sha256, text_bytes, created_at, record_json FROM discovery_extractions;
      DROP TABLE discovery_extractions;
      ALTER TABLE discovery_extractions_new RENAME TO discovery_extractions;
      INSERT OR REPLACE INTO meta (key, value_json, updated_at)
      VALUES ('discovery_extraction_status_constraint', '{"version":"0.1","statuses":["complete","partial","metadata_only","large_file_pending","large_corpus_pending","unsupported","failed"]}', '2026-07-02T00:00:00.000Z');
    `);
    db.exec("COMMIT;");
  } catch (error) {
    try { db.exec("ROLLBACK;"); } catch {}
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

function migrateFileVersionsManagedPathConstraint(db) {
  const row = db.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'file_versions'").get();
  const createSql = String(row?.sql || "");
  if (!createSql.includes("managed_path LIKE 'quarantine/%'") || createSql.includes("managed_path LIKE 'sources/%'")) return;
  db.exec("PRAGMA foreign_keys = OFF;");
  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION;");
    db.exec(`
      DROP TRIGGER IF EXISTS file_versions_append_only_update;
      DROP TRIGGER IF EXISTS file_versions_append_only_delete;
      DROP TABLE IF EXISTS file_versions_new;
      CREATE TABLE file_versions_new (
        id TEXT PRIMARY KEY,
        file_asset_id TEXT NOT NULL,
        sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
        byte_size INTEGER NOT NULL CHECK(byte_size >= 0),
        original_name TEXT NOT NULL,
        managed_path TEXT NOT NULL CHECK(managed_path LIKE 'quarantine/%' OR managed_path LIKE 'sources/%'),
        created_at TEXT NOT NULL,
        record_json TEXT NOT NULL,
        UNIQUE(file_asset_id, sha256),
        UNIQUE(id, file_asset_id),
        UNIQUE(id, file_asset_id, sha256),
        FOREIGN KEY(file_asset_id) REFERENCES file_assets(id) ON UPDATE RESTRICT ON DELETE RESTRICT
      );
      INSERT INTO file_versions_new (id, file_asset_id, sha256, byte_size, original_name, managed_path, created_at, record_json)
      SELECT id, file_asset_id, sha256, byte_size, original_name, managed_path, created_at, record_json FROM file_versions;
      DROP TABLE file_versions;
      ALTER TABLE file_versions_new RENAME TO file_versions;
      INSERT OR REPLACE INTO meta (key, value_json, updated_at)
      VALUES ('file_versions_managed_path_constraint', '{"version":"0.1","managedRoots":["quarantine","sources"]}', '2026-06-25T00:00:00.000Z');
    `);
    db.exec("COMMIT;");
  } catch (error) {
    try { db.exec("ROLLBACK;"); } catch {}
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON;");
  }
}

const DISCOVERY_CASE_STATUSES = new Set(["created", "security_pending", "security_blocked", "extracting", "questioning", "routing", "ready_for_intake", "promoted", "archived"]);
const DISCOVERY_STAGES = new Set(["add", "quarantine", "security", "extract", "discovery", "questions", "routing", "intake", "human_approval", "core"]);
const DISCOVERY_PRIVACY_CLASSES = new Set(["local_only", "personal", "confidential", "restricted", "provider_allowed"]);
const DISCOVERY_INTERACTION_TYPES = new Set(["system_question", "user_answer", "user_correction", "machine_suggestion", "routing_proposal", "routing_confirmation", "processing_event", "external_review_import"]);
const SECURITY_VERDICTS = new Set(["clean", "threat_detected", "suspicious", "unknown", "error"]);

async function initializeDiscoveryStorage({ storageRoot, dbPath }) {
  await ensureSpine(storageRoot);
  const db = openDatabase(dbPath);
  try {
    return {
      ok: true,
      source: "discovery-storage-foundation",
      schema: readMeta(db, "discovery_schema"),
      counts: discoveryTableCounts(db)
    };
  } finally {
    db.close();
  }
}

async function registerDiscoveryFileVersion({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const requestedAssetId = requiredDiscoveryId(payload.fileAssetId || payload.assetId, "File Asset ID");
  const requestedVersionId = requiredDiscoveryId(payload.fileVersionId || payload.versionId, "File Version ID");
  const sha256 = requiredSha256(payload.sha256);
  const byteSize = Number(payload.byteSize);
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) throw new Error("File Version byte size must be a non-negative integer.");
  const originalName = requiredDiscoveryText(payload.originalName, "File Version original name");
  const managedPath = requiredFileVersionManagedPath(payload.managedPath);
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "File Version createdAt");
  const privacyClass = String(payload.privacyClass || "local_only");
  if (!DISCOVERY_PRIVACY_CLASSES.has(privacyClass)) throw new Error("File Asset privacy class is not supported.");

  const physicalPath = resolveManagedPath(storageRoot, managedPath);
  if (!fs.existsSync(physicalPath) || !fs.statSync(physicalPath).isFile()) throw new Error("Quarantined File Version is missing.");
  const physicalSize = fs.statSync(physicalPath).size;
  if (physicalSize !== byteSize) throw new Error("Quarantined File Version byte size mismatch.");
  if (await checksumFile(physicalPath) !== sha256) throw new Error("Quarantined File Version checksum mismatch.");

  const db = openDatabase(dbPath);
  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    const assetMatch = db.prepare("SELECT id, record_json FROM file_assets WHERE sha256 = ?").get(sha256);
    const assetId = assetMatch?.id || requestedAssetId;
    if (!assetMatch) {
      const asset = {
        id: assetId,
        sha256,
        createdAt,
        privacyClass,
        retentionState: payload.retentionState || "active"
      };
      insertStrict(db, "file_assets", {
        id: asset.id,
        sha256,
        created_at: createdAt,
        privacy_class: privacyClass,
        retention_state: asset.retentionState,
        record_json: JSON.stringify(asset)
      });
    }

    const versionMatch = db.prepare("SELECT id, record_json FROM file_versions WHERE file_asset_id = ? AND sha256 = ?").get(assetId, sha256);
    if (versionMatch) {
      db.exec("COMMIT");
      return {
        ok: true,
        deduplicated: true,
        fileAsset: JSON.parse(assetMatch?.record_json || db.prepare("SELECT record_json FROM file_assets WHERE id = ?").get(assetId).record_json),
        fileVersion: JSON.parse(versionMatch.record_json)
      };
    }

    const version = {
      id: requestedVersionId,
      fileAssetId: assetId,
      sha256,
      byteSize,
      originalName,
      managedPath,
      createdAt,
      fileType: payload.fileType || classifyDiscoveryFile(originalName),
      securityState: payload.externalSecurityAcknowledged ? "external_responsibility_acknowledged" : "unacknowledged",
      externalSecurityAcknowledged: payload.externalSecurityAcknowledged === true,
      externalSecurityAcknowledgedBy: payload.externalSecurityAcknowledgedBy || "",
      externalSecurityAcknowledgedAt: payload.externalSecurityAcknowledgedAt || "",
      externalSecurityReason: String(payload.externalSecurityReason || "")
    };
    insertStrict(db, "file_versions", {
      id: version.id,
      file_asset_id: assetId,
      sha256,
      byte_size: byteSize,
      original_name: originalName,
      managed_path: managedPath,
      created_at: createdAt,
      record_json: JSON.stringify(version)
    });
    db.exec("COMMIT");
    return {
      ok: true,
      deduplicated: Boolean(assetMatch),
      fileAsset: assetMatch ? JSON.parse(assetMatch.record_json) : dbRecord(db, "file_assets", assetId),
      fileVersion: version
    };
  } catch (error) {
    try { db.exec("ROLLBACK"); } catch {}
    throw error;
  } finally {
    db.close();
  }
}

async function createDiscoveryCase({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id || payload.discoveryCaseId, "Discovery Case ID");
  const createdBy = requiredDiscoveryId(payload.createdBy || payload.actorId, "Discovery Case creator");
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Discovery Case createdAt");
  const stage = String(payload.stage || "quarantine");
  const status = String(payload.status || "created");
  if (!DISCOVERY_STAGES.has(stage)) throw new Error("Discovery Case stage is not supported.");
  if (!DISCOVERY_CASE_STATUSES.has(status)) throw new Error("Discovery Case status is not supported.");
  const record = {
    ...cloneJson(payload),
    id,
    createdBy,
    createdAt,
    updatedAt: createdAt,
    stage,
    status,
    confirmedProjectId: payload.confirmedProjectId || null
  };
  const db = openDatabase(dbPath);
  try {
    insertStrict(db, "discovery_cases", {
      id,
      created_by: createdBy,
      created_at: createdAt,
      updated_at: createdAt,
      stage,
      status,
      confirmed_project_id: record.confirmedProjectId,
      record_json: JSON.stringify(record)
    });
    return { ok: true, discoveryCase: record };
  } finally {
    db.close();
  }
}

async function attachDiscoveryFileVersion({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id || payload.membershipId, "Discovery file membership ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const fileAssetId = requiredDiscoveryId(payload.fileAssetId, "File Asset ID");
  const fileVersionId = requiredDiscoveryId(payload.fileVersionId, "File Version ID");
  const addedAt = requiredDiscoveryTimestamp(payload.addedAt || nowIso(), "Discovery file addedAt");
  const record = { id, discoveryCaseId, fileAssetId, fileVersionId, addedAt, groupingRationale: String(payload.groupingRationale || "") };
  const db = openDatabase(dbPath);
  try {
    insertStrict(db, "discovery_case_files", {
      id,
      discovery_case_id: discoveryCaseId,
      file_asset_id: fileAssetId,
      file_version_id: fileVersionId,
      added_at: addedAt,
      grouping_rationale: record.groupingRationale,
      record_json: JSON.stringify(record)
    });
    return { ok: true, membership: record };
  } finally {
    db.close();
  }
}

async function appendDiscoveryInteraction({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id, "Interaction ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Interaction actor ID");
  const actorType = requiredDiscoveryText(payload.actorType, "Interaction actor type");
  const interactionType = String(payload.interactionType || "");
  if (!DISCOVERY_INTERACTION_TYPES.has(interactionType)) throw new Error("Discovery interaction type is not supported.");
  if (actorType !== "human" && ["user_answer", "user_correction", "routing_confirmation"].includes(interactionType)) {
    throw new Error("Only a human actor may append a user answer, correction, or routing confirmation.");
  }
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Interaction createdAt");
  const record = { ...cloneJson(payload), id, discoveryCaseId, actorId, actorType, interactionType, createdAt };
  const db = openDatabase(dbPath);
  try {
    insertStrict(db, "discovery_interactions", {
      id,
      discovery_case_id: discoveryCaseId,
      actor_id: actorId,
      actor_type: actorType,
      interaction_type: interactionType,
      created_at: createdAt,
      supersedes_interaction_id: payload.supersedesInteractionId || null,
      record_json: JSON.stringify(record)
    });
    return { ok: true, interaction: record };
  } finally {
    db.close();
  }
}

async function appendDiscoverySecurityReceipt({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id, "Security Receipt ID");
  const scanJobId = requiredDiscoveryId(payload.scanJobId, "Security scan job ID");
  const fileAssetId = requiredDiscoveryId(payload.fileAssetId, "File Asset ID");
  const fileVersionId = requiredDiscoveryId(payload.fileVersionId, "File Version ID");
  const sha256 = requiredSha256(payload.sha256);
  const verdict = String(payload.verdict || "");
  if (!SECURITY_VERDICTS.has(verdict)) throw new Error("Security Receipt verdict is not supported.");
  const eligible = verdict === "clean";
  const providerId = requiredDiscoveryText(payload.providerId, "Security provider ID");
  const startedAt = requiredDiscoveryTimestamp(payload.startedAt, "Security Receipt startedAt");
  const completedAt = requiredDiscoveryTimestamp(payload.completedAt, "Security Receipt completedAt");
  const record = { ...cloneJson(payload), id, scanJobId, fileAssetId, fileVersionId, sha256, verdict, eligible, providerId, startedAt, completedAt };
  const db = openDatabase(dbPath);
  try {
    insertStrict(db, "security_receipts", {
      id,
      scan_job_id: scanJobId,
      file_asset_id: fileAssetId,
      file_version_id: fileVersionId,
      sha256,
      verdict,
      eligible: eligible ? 1 : 0,
      provider_id: providerId,
      started_at: startedAt,
      completed_at: completedAt,
      supersedes_receipt_id: payload.supersedesReceiptId || null,
      record_json: JSON.stringify(record)
    });
    return { ok: true, securityReceipt: record };
  } finally {
    db.close();
  }
}

async function appendDiscoveryEvent({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id, "Discovery Event ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const eventType = requiredDiscoveryText(payload.eventType, "Discovery Event type");
  const actorId = requiredDiscoveryId(payload.actorId, "Discovery Event actor ID");
  const actorType = requiredDiscoveryText(payload.actorType, "Discovery Event actor type");
  const occurredAt = requiredDiscoveryTimestamp(payload.occurredAt || nowIso(), "Discovery Event occurredAt");
  const record = { ...cloneJson(payload), id, discoveryCaseId, eventType, actorId, actorType, occurredAt };
  const db = openDatabase(dbPath);
  try {
    insertStrict(db, "discovery_events", {
      id,
      discovery_case_id: discoveryCaseId,
      event_type: eventType,
      actor_id: actorId,
      actor_type: actorType,
      occurred_at: occurredAt,
      record_json: JSON.stringify(record)
    });
    return { ok: true, discoveryEvent: record };
  } finally {
    db.close();
  }
}

async function readDiscoveryFoundationState({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const db = openDatabase(dbPath);
  try {
    const caseId = String(payload.discoveryCaseId || "").trim();
    const cases = caseId
      ? db.prepare("SELECT record_json FROM discovery_cases WHERE id = ?").all(caseId).map(parseRecordRow)
      : readRecordJson(db, "discovery_cases");
    const whereCase = (table) => caseId
      ? db.prepare(`SELECT record_json FROM ${table} WHERE discovery_case_id = ? ORDER BY rowid`).all(caseId).map(parseRecordRow)
      : readRecordJson(db, table);
    return {
      ok: true,
      schema: readMeta(db, "discovery_schema"),
      counts: discoveryTableCounts(db),
      fileAssets: readRecordJson(db, "file_assets"),
      fileVersions: readRecordJson(db, "file_versions"),
      discoveryCases: cases,
      caseFiles: whereCase("discovery_case_files"),
      interactions: whereCase("discovery_interactions"),
      securityReceipts: readRecordJson(db, "security_receipts"),
      events: whereCase("discovery_events"),
      extractions: whereCase("discovery_extractions"),
      chunks: readDiscoveryChunks(db, caseId)
    };
  } finally {
    db.close();
  }
}

function discoveryTableCounts(db) {
  return {
    fileAssets: countRows(db, "file_assets"),
    fileVersions: countRows(db, "file_versions"),
    discoveryCases: countRows(db, "discovery_cases"),
    caseFiles: countRows(db, "discovery_case_files"),
    interactions: countRows(db, "discovery_interactions"),
    securityReceipts: countRows(db, "security_receipts"),
    events: countRows(db, "discovery_events"),
    extractions: countRows(db, "discovery_extractions"),
    chunks: countRows(db, "discovery_chunks")
  };
}

function requiredDiscoveryId(value, label) {
  const text = String(value || "").trim();
  if (!text || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(text)) throw new Error(`${label} is required and must be a stable ID.`);
  return text;
}

function requiredDiscoveryText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function requiredDiscoveryTimestamp(value, label) {
  if (!validIsoTimestamp(value)) throw new Error(`${label} must be a valid ISO timestamp.`);
  return String(value);
}

function requiredSha256(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(text)) throw new Error("File Version SHA-256 must contain 64 hexadecimal characters.");
  return text;
}

function requiredFileVersionManagedPath(value) {
  const text = String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
  const allowedManagedRoot = text.startsWith("quarantine/") || text.startsWith("sources/");
  if (!allowedManagedRoot || text.includes("../") || path.isAbsolute(text)) throw new Error("File Version managed path must remain inside quarantine/ or sources/.");
  return text;
}

function insertStrict(db, table, row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => "?").join(", ");
  db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`).run(...keys.map((key) => row[key]));
}

function dbRecord(db, table, id) {
  const row = db.prepare(`SELECT record_json FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.record_json) : null;
}

function parseRecordRow(row) {
  return JSON.parse(row.record_json);
}

function readDiscoveryChunks(db, caseId = "") {
  if (!caseId) return readRecordJson(db, "discovery_chunks");
  return db.prepare(`SELECT chunk.record_json FROM discovery_chunks AS chunk JOIN discovery_extractions AS extraction ON extraction.id = chunk.discovery_extraction_id WHERE extraction.discovery_case_id = ? ORDER BY chunk.chunk_index`).all(caseId).map(parseRecordRow);
}

const IDEA_ANALYSIS_METHODS = new Set(["human", "deterministic", "ai", "hybrid"]);
const IDEA_ANALYSIS_STATUSES = new Set(["running", "complete", "partial", "failed", "cancelled"]);
const IDEA_REVIEW_ACTIONS = new Set(["accept", "reject", "defer", "rename", "correct_summary", "merge", "split", "mark_duplicate", "mark_uncertain"]);
const FAKE_ANALYSIS_ARM_ID = "project_state_fake_analysis";
const FAKE_ANALYSIS_PROVIDER_ID = "project_state_fake_local";
const LOCAL_ANALYSIS_PROVIDER_IDS = new Set([FAKE_ANALYSIS_PROVIDER_ID, QWEN3_8B_PROVIDER_ID]);

function analysisArmError(code, message, fieldPath = "") {
  const error = new Error(message);
  error.code = code;
  error.fieldPath = fieldPath;
  return error;
}

function describeFakeAnalysisArmCapabilities() {
  const contract = JSON.parse(fs.readFileSync(AI_ANALYSIS_ARM_CONTRACT_FILE, "utf8"));
  return {
    ok: true,
    contractVersion: contract.contractVersion,
    operations: contract.operations,
    arm: { armId: FAKE_ANALYSIS_ARM_ID, displayName: "Project State Fake Local Analysis Arm", armVersion: "0.1.0", providerId: FAKE_ANALYSIS_PROVIDER_ID, executionLocation: "local" },
    supportedCandidateTypes: contract.candidateTypes,
    supports: { structuredOutput: true, relationships: false, clarificationQuestions: true, continuation: true, cancellation: true, usageReporting: true },
    limits: { maximumRequestBytes: 1048576, maximumChunks: 100, candidatesPerResultPage: contract.maximums.candidatesPerResultPage },
    retention: { policyId: "local_fixture_no_external_transmission", declaredRetention: "Project State test storage only" },
    realProviderInstalled: false
  };
}

async function describeAnalysisArmCapabilities() {
  const fake = describeFakeAnalysisArmCapabilities();
  const providers = await describeLocalAiProviders();
  const qwen = providers.find((provider) => provider.providerId === QWEN3_8B_PROVIDER_ID);
  const selected = qwen?.available ? qwen : null;
  return {
    ...fake,
    arm: selected?.arm || fake.arm,
    supports: {
      ...fake.supports,
      structuredOutput: true,
      relationships: Boolean(selected),
      clarificationQuestions: true,
      usageReporting: true
    },
    retention: selected?.retention || fake.retention,
    localProviders: providers,
    defaultProviderId: selected?.providerId || FAKE_ANALYSIS_PROVIDER_ID,
    selectedProviderId: selected?.providerId || "",
    providerLinkState: selected ? "connected_for_ai_work_orders" : "not_connected",
    providerMode: selected ? "local_ai" : "local_fixture",
    realProviderInstalled: Boolean(selected),
    installSuggestions: [{
      providerId: QWEN3_8B_PROVIDER_ID,
      runtime: "ollama",
      modelId: QWEN3_8B_MODEL_ID,
      displayName: "Qwen3 8B",
      command: "ollama pull qwen3:8b"
    }]
  };
}

async function createIdeaAnalysisRun({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id || payload.analysisRunId, "Idea Analysis Run ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Analysis actor ID");
  const actorType = requiredDiscoveryText(payload.actorType || "tool", "Analysis actor type");
  const method = String(payload.method || "ai");
  const status = String(payload.status || "running");
  if (!IDEA_ANALYSIS_METHODS.has(method)) throw analysisArmError("INVALID_ENVELOPE", "Idea Analysis Run method is not supported.", "method");
  if (!IDEA_ANALYSIS_STATUSES.has(status)) throw analysisArmError("INVALID_ENVELOPE", "Idea Analysis Run status is not supported.", "status");
  const startedAt = requiredDiscoveryTimestamp(payload.startedAt || nowIso(), "Idea Analysis Run startedAt");
  const sourceScope = Array.isArray(payload.sourceScope) ? cloneJson(payload.sourceScope) : [];
  if (!sourceScope.length) throw analysisArmError("INVALID_ENVELOPE", "Idea Analysis Run requires exact source scope.", "sourceScope");
  const record = { id, schemaVersion: "0.1", discoveryCaseId, actorId, actorType, method, status, startedAt, completedAt: payload.completedAt || null, sourceScope, coverage: cloneJson(payload.coverage || { expectedChunkCount: sourceScope.flatMap((item) => item.expectedChunkIds || []).length, analyzedChunkIds: [], skippedChunkIds: [], blockedChunkIds: [], failedChunkIds: [], coverageRatio: 0 }), provenance: cloneJson(payload.provenance || {}), candidateIds: cloneJson(payload.candidateIds || []) };
  const db = openDatabase(dbPath);
  try {
    if (!dbRecord(db, "discovery_cases", discoveryCaseId)) throw analysisArmError("INVALID_ENVELOPE", "Discovery Case was not found.", "discoveryCaseId");
    const memberships = new Set(db.prepare("SELECT file_version_id AS id FROM discovery_case_files WHERE discovery_case_id = ?").all(discoveryCaseId).map((row) => row.id));
    for (const scope of sourceScope) {
      const fileVersionId = requiredDiscoveryId(scope.fileVersionId, "Source scope File Version ID");
      if (!memberships.has(fileVersionId)) throw analysisArmError("INVALID_EVIDENCE", "Source scope File Version is not attached to the Discovery Case.", "sourceScope.fileVersionId");
      const version = dbRecord(db, "file_versions", fileVersionId);
      if (!version || requiredSha256(scope.sourceSha256) !== version.sha256) throw analysisArmError("CHUNK_CHECKSUM_MISMATCH", "Source scope checksum does not match the immutable File Version.", "sourceScope.sourceSha256");
      for (const chunkId of scope.expectedChunkIds || []) {
        const chunk = db.prepare(`SELECT chunk.record_json FROM discovery_chunks AS chunk JOIN discovery_extractions AS extraction ON extraction.id = chunk.discovery_extraction_id WHERE chunk.id = ? AND extraction.discovery_case_id = ?`).get(chunkId, discoveryCaseId);
        if (!chunk) throw analysisArmError("CHUNK_NOT_FOUND", `Source scope chunk was not found: ${chunkId}`, "sourceScope.expectedChunkIds");
      }
    }
    insertStrict(db, "idea_analysis_runs", { id, discovery_case_id: discoveryCaseId, actor_id: actorId, actor_type: actorType, method, status, started_at: startedAt, completed_at: record.completedAt, record_json: JSON.stringify(record) });
    return { ok: true, analysisRun: record };
  } finally { db.close(); }
}

async function authorizeIdeaTransmission({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id || payload.authorizationRecordId, "Privacy Authorization ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const authorizedBy = requiredDiscoveryId(payload.authorizedBy || payload.actorId, "Authorizing actor ID");
  if (String(payload.actorType || "human") !== "human") throw analysisArmError("PRIVACY_AUTHORIZATION_REQUIRED", "Only a human may authorize provider transmission.", "actorType");
  const authorizedAt = requiredDiscoveryTimestamp(payload.authorizedAt || nowIso(), "Privacy Authorization authorizedAt");
  const providerId = requiredDiscoveryId(payload.providerId, "Privacy Authorization provider ID");
  const purpose = String(payload.purpose || "idea_candidate_discovery");
  const privacyClass = String(payload.privacyClass || "");
  if (purpose !== "idea_candidate_discovery") throw analysisArmError("INVALID_PURPOSE", "Privacy Authorization purpose is not supported.", "purpose");
  if (!DISCOVERY_PRIVACY_CLASSES.has(privacyClass)) throw analysisArmError("PRIVACY_SCOPE_MISMATCH", "Privacy Authorization class is not supported.", "privacyClass");
  if (!LOCAL_ANALYSIS_PROVIDER_IDS.has(providerId) && privacyClass !== "provider_allowed") throw analysisArmError("PRIVACY_SCOPE_MISMATCH", "Remote provider transmission requires the provider_allowed privacy class.", "privacyClass");
  const chunkScopes = Array.isArray(payload.chunkScopes) ? cloneJson(payload.chunkScopes) : [];
  if (!chunkScopes.length) throw analysisArmError("PRIVACY_SCOPE_MISMATCH", "Privacy Authorization requires at least one exact chunk scope.", "chunkScopes");
  const record = { id, schemaVersion: "0.1", discoveryCaseId, authorizedBy, actorType: "human", authorizedAt, providerId, purpose, privacyClass, chunkScopes, redactionMode: String(payload.redactionMode || "none"), expiresAt: payload.expiresAt || null, reason: requiredDiscoveryText(payload.reason, "Privacy Authorization reason") };
  const db = openDatabase(dbPath);
  try {
    if (!dbRecord(db, "discovery_cases", discoveryCaseId)) throw analysisArmError("INVALID_ENVELOPE", "Discovery Case was not found.", "discoveryCaseId");
    for (const scope of chunkScopes) {
      const chunkId = requiredDiscoveryId(scope.discoveryChunkId, "Authorized Discovery Chunk ID");
      const row = db.prepare(`SELECT chunk.record_json FROM discovery_chunks AS chunk JOIN discovery_extractions AS extraction ON extraction.id = chunk.discovery_extraction_id WHERE chunk.id = ? AND extraction.discovery_case_id = ?`).get(chunkId, discoveryCaseId);
      if (!row) throw analysisArmError("CHUNK_NOT_FOUND", `Authorized chunk was not found: ${chunkId}`, "chunkScopes");
      const chunk = parseRecordRow(row);
      if (requiredSha256(scope.chunkTextSha256) !== chunk.textSha256) throw analysisArmError("CHUNK_CHECKSUM_MISMATCH", `Authorized chunk checksum mismatch: ${chunkId}`, "chunkScopes");
      const extractionRow = db.prepare("SELECT record_json FROM discovery_extractions WHERE id = ?").get(chunk.discoveryExtractionId);
      const extraction = extractionRow ? parseRecordRow(extractionRow) : null;
      const asset = extraction ? dbRecord(db, "file_assets", extraction.fileAssetId) : null;
      if (!asset || asset.privacyClass !== privacyClass) throw analysisArmError("PRIVACY_SCOPE_MISMATCH", `Chunk source privacy class does not match the authorization: ${chunkId}`, "privacyClass");
    }
    insertStrict(db, "idea_privacy_authorizations", { id, discovery_case_id: discoveryCaseId, authorized_by: authorizedBy, authorized_at: authorizedAt, provider_id: providerId, purpose, privacy_class: privacyClass, record_json: JSON.stringify(record) });
    return { ok: true, authorization: record };
  } finally { db.close(); }
}

function collectObjectKeys(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) { output.push(key); collectObjectKeys(child, output); }
  return output;
}

const LEGAL_REFERENCE_PATTERNS = [
  ["license", /\blicen[cs](?:e|ing|ed|es)\b/i],
  ["agreement", /\bagreement\b/i],
  ["eula", /\bend\s+user\s+licen[cs]e\b|\beula\b/i],
  ["terms of service", /\bterms\s+(?:of\s+(?:service|use)|and\s+conditions)\b/i],
  ["privacy policy", /\bprivacy\s+policy\b/i],
  ["developer agreement", /\bdeveloper\s+(?:program\s+)?agreement\b/i],
  ["app store terms", /\bapp\s+store\b|\bgoogle\s+play\b|\bmicrosoft\s+store\b|\bsteamworks\b|\bepic\s+games\s+store\b/i],
  ["sdk/api terms", /\b(?:sdk|api)\s+(?:agreement|terms|license)\b/i],
  ["third party notices", /\bthird[-\s]party\s+notices\b|\bopen\s+source\s+notices\b/i],
  ["copyright/trademark", /\bcopyright\b|\btrademark\b|\ball\s+rights\s+reserved\b/i]
];

function legalReferenceSignals(text = "", fileName = "") {
  const name = String(fileName || "");
  const compactText = String(text || "").slice(0, 30000);
  const haystack = `${name}\n${compactText}`;
  const found = LEGAL_REFERENCE_PATTERNS.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
  const fileNameSignal = /\b(?:license|licensing|eula|terms|privacy|notices|third[-\s]?party|copyright|trademark)\b/i.test(name)
    || /\b(?:developer|app|store|sdk|api|software|end\s+user)\b.{0,40}\bagreement\b/i.test(name)
    || /\bagreement\b.{0,40}\b(?:developer|app|store|sdk|api|software|end\s+user)\b/i.test(name);
  const contentSignalCount = found.length;
  return {
    isLegalReference: fileNameSignal || contentSignalCount >= 2,
    terms: [...new Set(found)].slice(0, 8)
  };
}

function fakeIdeaCandidateFromChunk({ chunk, extraction, envelope, index, text }) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  const heading = String(text || "").split(/\r?\n/).map((line) => line.trim()).find((line) => /^#{1,6}\s+/.test(line));
  const legalSignals = legalReferenceSignals(text, extraction?.fileName || extraction?.originalName || "");
  const sourceName = extraction?.fileName || extraction?.originalName || `chunk ${index + 1}`;
  const workingLabel = legalSignals.isLegalReference
    ? `Licensing/reference material: ${titleFromTokens(path.basename(sourceName, path.extname(sourceName)) || sourceName)}`
    : (heading ? heading.replace(/^#{1,6}\s+/, "") : compact.split(/[.!?]/)[0] || `Idea from chunk ${index + 1}`).slice(0, 200);
  return {
    clientCandidateId: `fake_candidate_${String(index + 1).padStart(4, "0")}`,
    workingLabel,
    neutralSummary: legalSignals.isLegalReference
      ? `This chunk looks like licensing, app agreement, terms, privacy, or other reference material. Keep it as supporting context unless a human confirms it describes a standalone project. Signals: ${(legalSignals.terms || []).join(", ") || "filename/content legal reference"}. ${compact.slice(0, 1500)}`
      : compact.slice(0, 2000),
    candidateType: legalSignals.isLegalReference ? "reference" : "other",
    scope: legalSignals.isLegalReference ? "supporting" : "unknown",
    keyTerms: [...new Set(workingLabel.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((term) => term.length > 3))].slice(0, 32),
    evidence: [{ discoveryChunkId: chunk.id, discoveryExtractionId: extraction.id, fileVersionId: extraction.fileVersionId, sourceSha256: extraction.sourceSha256, chunkTextSha256: chunk.textSha256, relationship: legalSignals.isLegalReference ? "context_only" : "supports", excerpt: compact.slice(0, 500) }],
    confidence: legalSignals.isLegalReference
      ? { score: 0.72, basis: "Deterministic local arm detected licensing/app-agreement reference signals and marked the chunk as supporting context.", uncertaintyNotes: "Human review can override this if the legal material is itself the project." }
      : { score: 0.5, basis: "Fake local arm produced one deterministic candidate from one exact chunk for contract testing.", uncertaintyNotes: "No semantic AI provider was used." },
    relationships: [],
    clarificationQuestions: [{ clientQuestionId: `fake_question_${String(index + 1).padStart(4, "0")}`, text: "Should this candidate remain separate, merge with another idea, or be deferred?", affects: "grouping", allowNotSure: true }],
    provenance: { providerId: FAKE_ANALYSIS_PROVIDER_ID, modelId: "deterministic_fake_v0.1", externalJobId: `fake_job_${envelope.requestId}` }
  };
}

async function submitFakeAnalysisBatch({ storageRoot, dbPath, envelope = {} }) {
  await ensureSpine(storageRoot);
  const contract = JSON.parse(fs.readFileSync(AI_ANALYSIS_ARM_CONTRACT_FILE, "utf8"));
  const ideaContract = JSON.parse(fs.readFileSync(IDEA_CANDIDATE_CONTRACT_FILE, "utf8"));
  for (const field of contract.submissionRequired) if (!Object.prototype.hasOwnProperty.call(envelope, field)) throw analysisArmError("INVALID_ENVELOPE", `Analysis envelope is missing: ${field}`, field);
  if (envelope.contractVersion !== contract.contractVersion) throw analysisArmError("UNSUPPORTED_CONTRACT_VERSION", "AI Analysis Arm contract version is not supported.", "contractVersion");
  const requestId = requiredDiscoveryId(envelope.requestId, "Analysis request ID");
  const idempotencyKey = requiredDiscoveryId(envelope.idempotencyKey, "Analysis idempotency key");
  requiredDiscoveryTimestamp(envelope.submittedAt, "Analysis submittedAt");
  const analysisRunId = requiredDiscoveryId(envelope.analysisRunId, "Idea Analysis Run ID");
  const discoveryCaseId = requiredDiscoveryId(envelope.discoveryCaseId, "Discovery Case ID");
  if (envelope.purpose !== contract.purpose) throw analysisArmError("INVALID_PURPOSE", "Analysis purpose is not supported.", "purpose");
  const armId = requiredDiscoveryId(envelope.arm?.armId, "Analysis Arm ID");
  const providerId = requiredDiscoveryId(envelope.arm?.providerId, "Analysis provider ID");
  const fakeArmSelected = armId === FAKE_ANALYSIS_ARM_ID && providerId === FAKE_ANALYSIS_PROVIDER_ID;
  const qwenArmSelected = armId === QWEN3_8B_ARM_ID && providerId === QWEN3_8B_PROVIDER_ID;
  if (!fakeArmSelected && !qwenArmSelected) throw analysisArmError("INVALID_ARM", "Only the fake local fixture arm and Qwen3 8B local arm are implemented.", "arm");
  const forbiddenKeys = new Set(contract.forbiddenSubmissionAndResultFields);
  const forbidden = collectObjectKeys(envelope).filter((key) => forbiddenKeys.has(key));
  if (forbidden.length) throw analysisArmError("FORBIDDEN_FIELD", `Analysis envelope contains forbidden fields: ${[...new Set(forbidden)].join(", ")}`, forbidden[0]);
  const chunks = Array.isArray(envelope.input?.chunks) ? envelope.input.chunks : [];
  if (!chunks.length) throw analysisArmError("INVALID_ENVELOPE", "Analysis envelope requires chunks.", "input.chunks");
  if (chunks.length > 100 || Buffer.byteLength(JSON.stringify(envelope), "utf8") > 1048576) throw analysisArmError("PAYLOAD_TOO_LARGE", "Fake analysis batch exceeds local fixture limits.", "input.chunks");
  const canonicalChecksum = crypto.createHash("sha256").update(stableStringify(envelope)).digest("hex");
  const db = openDatabase(dbPath);
  try {
    const existingByKey = db.prepare("SELECT record_json, payload_checksum FROM ai_analysis_jobs WHERE idempotency_key = ?").get(idempotencyKey);
    if (existingByKey) {
      if (existingByKey.payload_checksum !== canonicalChecksum) throw analysisArmError("IDEMPOTENCY_CONFLICT", "Analysis idempotency key was reused with different content.", "idempotencyKey");
      const existingJob = parseRecordRow(existingByKey);
      const existingReceipt = db.prepare("SELECT record_json FROM ai_analysis_result_receipts WHERE request_id = ? AND result_page = 0").get(existingJob.id);
      return { ok: true, deduplicated: true, job: existingJob, result: existingJob.result, receipt: existingReceipt ? parseRecordRow(existingReceipt) : null };
    }
    const run = dbRecord(db, "idea_analysis_runs", analysisRunId);
    if (!run || run.discoveryCaseId !== discoveryCaseId) throw analysisArmError("INVALID_ENVELOPE", "Idea Analysis Run does not match the Discovery Case.", "analysisRunId");
    const authorizationId = requiredDiscoveryId(envelope.privacyAuthorization?.authorizationRecordId, "Privacy Authorization ID");
    const authorization = dbRecord(db, "idea_privacy_authorizations", authorizationId);
    if (!authorization || authorization.discoveryCaseId !== discoveryCaseId || authorization.providerId !== providerId || authorization.purpose !== envelope.purpose) throw analysisArmError("PRIVACY_SCOPE_MISMATCH", "Privacy Authorization does not match this provider, purpose, or Discovery Case.", "privacyAuthorization");
    const authorizedScopes = new Map((authorization.chunkScopes || []).map((scope) => [scope.discoveryChunkId, scope.chunkTextSha256]));
    const validated = [];
    for (const [index, supplied] of chunks.entries()) {
      for (const field of contract.chunkRequired) if (!Object.prototype.hasOwnProperty.call(supplied, field)) throw analysisArmError("INVALID_ENVELOPE", `Analysis chunk is missing: ${field}`, `input.chunks.${index}.${field}`);
      const chunkId = requiredDiscoveryId(supplied.discoveryChunkId, "Discovery Chunk ID");
      if (authorizedScopes.get(chunkId) !== supplied.chunkTextSha256) throw analysisArmError("PRIVACY_SCOPE_MISMATCH", `Chunk is not authorized for transmission: ${chunkId}`, `input.chunks.${index}`);
      const row = db.prepare(`SELECT chunk.record_json AS chunk_json, extraction.record_json AS extraction_json FROM discovery_chunks AS chunk JOIN discovery_extractions AS extraction ON extraction.id = chunk.discovery_extraction_id WHERE chunk.id = ? AND extraction.discovery_case_id = ?`).get(chunkId, discoveryCaseId);
      if (!row) throw analysisArmError("CHUNK_NOT_FOUND", `Analysis chunk was not found: ${chunkId}`, `input.chunks.${index}`);
      const chunk = JSON.parse(row.chunk_json);
      const extraction = JSON.parse(row.extraction_json);
      if (supplied.discoveryExtractionId !== extraction.id || supplied.fileVersionId !== extraction.fileVersionId || supplied.sourceSha256 !== extraction.sourceSha256 || supplied.chunkTextSha256 !== chunk.textSha256) throw analysisArmError("CHUNK_CHECKSUM_MISMATCH", `Analysis chunk evidence mismatch: ${chunkId}`, `input.chunks.${index}`);
      const physicalText = fs.readFileSync(resolveManagedPath(storageRoot, chunk.textPath), "utf8");
      if (checksumText(physicalText) !== chunk.textSha256 || checksumText(String(supplied.content?.text || "")) !== chunk.textSha256) throw analysisArmError("CHUNK_CHECKSUM_MISMATCH", `Analysis chunk content mismatch: ${chunkId}`, `input.chunks.${index}.content`);
      validated.push({ chunk, extraction, text: physicalText });
    }
    const maxCandidates = Math.min(Number(envelope.analysisOptions?.maxCandidates) || 100, contract.maximums.candidatesPerResultPage);
    const rawCandidates = qwenArmSelected
      ? await generateQwenIdeaCandidates({ validated, envelope, ideaContract, maxCandidates })
      : validated.slice(0, maxCandidates).map((item, index) => fakeIdeaCandidateFromChunk({ ...item, envelope, index }));
    for (const candidate of rawCandidates) {
      if (!ideaContract.objects.IdeaCandidate.candidateTypes.includes(candidate.candidateType) || !candidate.evidence.length) throw analysisArmError("PROVIDER_RESPONSE_INVALID", "Fake provider generated an invalid candidate.");
    }
    const completedAt = nowIso();
    const candidateRecords = rawCandidates.map((candidate) => ({ ...candidate, id: makeId("idea_candidate"), schemaVersion: "0.1", analysisRunId, discoveryCaseId, createdBy: armId, createdByType: "tool", createdAt: completedAt, method: "ai" }));
    const modelId = qwenArmSelected ? QWEN3_8B_MODEL_ID : "deterministic_fake_v0.1";
    const retention = qwenArmSelected
      ? { policyId: "local_ollama_machine_only", declaredRetention: "Local model runtime on this machine; no cloud transmission by Project State.", deletionAt: null }
      : { policyId: "local_fixture_no_external_transmission", declaredRetention: "Project State test storage only", deletionAt: null };
    const result = { contractVersion: "0.1", requestId, idempotencyKey, externalJobId: qwenArmSelected ? `local_ollama_${requestId}` : `fake_job_${requestId}`, status: "complete", completedAt, resolvedProvider: { providerId, modelId, resolvedModelVersion: modelId }, coverage: { receivedChunks: validated.map(({ chunk }) => ({ discoveryChunkId: chunk.id, chunkTextSha256: chunk.textSha256 })), analyzedChunkIds: validated.map(({ chunk }) => chunk.id), skippedChunks: [], failedChunks: [], coverageStatus: "complete", continuationCursor: null }, candidates: rawCandidates, usage: { inputTokens: Math.ceil(validated.reduce((sum, item) => sum + item.text.length, 0) / 4), outputTokens: Math.ceil(JSON.stringify(rawCandidates).length / 4), providerRequestCount: qwenArmSelected ? 1 : 0, durationMs: 0, cost: { amount: 0, currency: "USD", estimated: false } }, retention };
    const receipt = { contractVersion: "0.1", requestId, idempotencyKey, analysisRunId, resultPage: 0, candidateMappings: candidateRecords.map((candidate) => ({ clientCandidateId: candidate.clientCandidateId, ideaCandidateId: candidate.id })), receivedAt: completedAt, boundary: contract.receiptBoundary };
    const transmissionReceipt = { id: makeId("idea_transmission"), discoveryCaseId, analysisRunId, authorizationId, providerId, purpose: envelope.purpose, transmittedAt: completedAt, executionLocation: "local", externalTransmission: false, chunkScopes: validated.map(({ chunk }) => ({ discoveryChunkId: chunk.id, chunkTextSha256: chunk.textSha256, redactionState: "original" })) };
    const job = { id: requestId, analysisRunId, discoveryCaseId, armId, providerId, idempotencyKey, payloadChecksum: canonicalChecksum, status: "complete", submittedAt: envelope.submittedAt, updatedAt: completedAt, batch: cloneJson(envelope.batch), privacyAuthorizationId: authorizationId, transmissionReceiptId: transmissionReceipt.id, result };
    const nextCoverage = { expectedChunkCount: validated.length, analyzedChunkIds: validated.map(({ chunk }) => chunk.id), skippedChunkIds: [], blockedChunkIds: [], failedChunkIds: [], coverageRatio: 1 };
    const nextRun = { ...run, status: "complete", completedAt, coverage: nextCoverage, candidateIds: candidateRecords.map((candidate) => candidate.id), provenance: { ...run.provenance, providerId, modelId, requestId } };
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    try {
      insertStrict(db, "ai_analysis_jobs", { id: requestId, analysis_run_id: analysisRunId, discovery_case_id: discoveryCaseId, arm_id: armId, provider_id: providerId, idempotency_key: idempotencyKey, payload_checksum: canonicalChecksum, status: "complete", submitted_at: envelope.submittedAt, updated_at: completedAt, record_json: JSON.stringify(job) });
      insertStrict(db, "idea_transmission_receipts", { id: transmissionReceipt.id, discovery_case_id: discoveryCaseId, analysis_run_id: analysisRunId, authorization_id: authorizationId, provider_id: providerId, transmitted_at: completedAt, record_json: JSON.stringify(transmissionReceipt) });
      for (const candidate of candidateRecords) insertStrict(db, "idea_candidates", { id: candidate.id, analysis_run_id: analysisRunId, discovery_case_id: discoveryCaseId, client_candidate_id: candidate.clientCandidateId, created_by: armId, created_by_type: "tool", created_at: completedAt, candidate_type: candidate.candidateType, working_label: candidate.workingLabel, record_json: JSON.stringify(candidate) });
      insertStrict(db, "ai_analysis_result_receipts", { id: makeId("analysis_receipt"), request_id: requestId, analysis_run_id: analysisRunId, result_page: 0, received_at: completedAt, boundary: contract.receiptBoundary, record_json: JSON.stringify(receipt) });
      db.prepare("UPDATE idea_analysis_runs SET status = ?, completed_at = ?, record_json = ? WHERE id = ?").run("complete", completedAt, JSON.stringify(nextRun), analysisRunId);
      db.exec("COMMIT");
    } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
    return { ok: true, deduplicated: false, job, result, receipt, candidates: candidateRecords, transmissionReceipt };
  } finally { db.close(); }
}

async function getIdeaAnalysisJob({ storageRoot, dbPath, requestId }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(requestId, "Analysis request ID");
  const db = openDatabase(dbPath);
  try { return dbRecord(db, "ai_analysis_jobs", id); } finally { db.close(); }
}

async function getIdeaAnalysisResultPage({ storageRoot, dbPath, requestId, cursor }) {
  await ensureSpine(storageRoot);
  if (cursor !== null && cursor !== undefined && cursor !== "0" && cursor !== 0) throw analysisArmError("INVALID_ENVELOPE", "Fake local analysis arm has only result page 0.", "cursor");
  const job = await getIdeaAnalysisJob({ storageRoot, dbPath, requestId });
  return job ? { resultPage: 0, result: job.result, continuationCursor: null } : null;
}

async function getIdeaAnalysisReceipt({ storageRoot, dbPath, requestId }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(requestId, "Analysis request ID");
  const db = openDatabase(dbPath);
  try {
    const row = db.prepare("SELECT record_json FROM ai_analysis_result_receipts WHERE request_id = ? ORDER BY result_page").get(id);
    return row ? parseRecordRow(row) : null;
  } finally { db.close(); }
}

async function cancelIdeaAnalysisJob({ storageRoot, dbPath, requestId }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(requestId, "Analysis request ID");
  const db = openDatabase(dbPath);
  try {
    const current = dbRecord(db, "ai_analysis_jobs", id);
    if (!current) return null;
    if (["complete", "failed", "cancelled"].includes(current.status)) return { ok: true, changed: false, status: current.status };
    const updatedAt = nowIso();
    const next = { ...current, status: "cancelled", updatedAt, cancelledAt: updatedAt };
    db.prepare("UPDATE ai_analysis_jobs SET status = ?, updated_at = ?, record_json = ? WHERE id = ?").run("cancelled", updatedAt, JSON.stringify(next), id);
    return { ok: true, changed: true, status: "cancelled" };
  } finally { db.close(); }
}

async function recordIdeaReviewDecision({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const id = requiredDiscoveryId(payload.id || payload.reviewDecisionId, "Idea Review Decision ID");
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  if (String(payload.actorType || "human") !== "human") throw analysisArmError("FORBIDDEN_FIELD", "Only a human may create an Idea Review Decision.", "actorType");
  const action = String(payload.action || "");
  if (!IDEA_REVIEW_ACTIONS.has(action)) throw analysisArmError("INVALID_ENVELOPE", "Idea Review action is not supported.", "action");
  const candidateIds = [...new Set((payload.candidateIds || []).map((value) => requiredDiscoveryId(value, "Idea Candidate ID")))];
  if (!candidateIds.length) throw analysisArmError("INVALID_ENVELOPE", "Idea Review Decision requires candidates.", "candidateIds");
  const decidedBy = requiredDiscoveryId(payload.decidedBy || payload.actorId, "Review actor ID");
  const decidedAt = requiredDiscoveryTimestamp(payload.decidedAt || nowIso(), "Review decidedAt");
  const reason = requiredDiscoveryText(payload.reason, "Idea Review reason");
  const resultingUnits = Array.isArray(payload.resultingUnits) ? cloneJson(payload.resultingUnits) : [];
  const actionsRequiringUnits = new Set(["accept", "rename", "correct_summary", "merge", "split"]);
  if (actionsRequiringUnits.has(action) && !resultingUnits.length) throw analysisArmError("INVALID_ENVELOPE", "This Idea Review action requires at least one resulting Confirmed Idea Unit.", "resultingUnits");
  const db = openDatabase(dbPath);
  try {
    const candidates = candidateIds.map((candidateId) => dbRecord(db, "idea_candidates", candidateId));
    if (candidates.some((candidate) => !candidate || candidate.discoveryCaseId !== discoveryCaseId)) throw analysisArmError("INVALID_EVIDENCE", "Review candidates must exist in the same Discovery Case.", "candidateIds");
    const availableEvidence = new Map(candidates.flatMap((candidate) => (candidate.evidence || []).map((evidence) => [`${evidence.discoveryChunkId}:${evidence.chunkTextSha256}`, evidence])));
    const unitRecords = resultingUnits.map((unit, index) => {
      const unitId = requiredDiscoveryId(unit.id || unit.ideaUnitId, "Confirmed Idea Unit ID");
      const title = requiredDiscoveryText(unit.title, "Confirmed Idea Unit title").slice(0, 200);
      const summary = requiredDiscoveryText(unit.summary, "Confirmed Idea Unit summary").slice(0, 2000);
      const sourceCandidateIds = [...new Set((unit.sourceCandidateIds || candidateIds).map((value) => requiredDiscoveryId(value, "Source Candidate ID")))];
      if (sourceCandidateIds.some((candidateId) => !candidateIds.includes(candidateId))) throw analysisArmError("INVALID_EVIDENCE", "Confirmed Idea Unit cites a candidate outside the review decision.", `resultingUnits.${index}.sourceCandidateIds`);
      const requestedEvidence = Array.isArray(unit.evidence) && unit.evidence.length ? unit.evidence : [...availableEvidence.values()];
      for (const evidence of requestedEvidence) if (!availableEvidence.has(`${evidence.discoveryChunkId}:${evidence.chunkTextSha256}`)) throw analysisArmError("INVALID_EVIDENCE", "Confirmed Idea Unit evidence was not retained from its candidates.", `resultingUnits.${index}.evidence`);
      return { id: unitId, discoveryCaseId, reviewDecisionId: id, title, summary, sourceCandidateIds, evidence: requestedEvidence, confirmedBy: decidedBy, confirmedAt: decidedAt, reason, unresolvedUncertainty: cloneJson(unit.unresolvedUncertainty || []), coreAuthority: false, routingAuthority: false };
    });
    const decision = { id, schemaVersion: "0.1", discoveryCaseId, action, candidateIds, decidedBy, actorType: "human", decidedAt, reason, resultingIdeaUnitIds: unitRecords.map((unit) => unit.id), supersedesDecisionId: payload.supersedesDecisionId || null };
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    try {
      insertStrict(db, "idea_review_decisions", { id, discovery_case_id: discoveryCaseId, action, decided_by: decidedBy, decided_at: decidedAt, supersedes_decision_id: decision.supersedesDecisionId, record_json: JSON.stringify(decision) });
      for (const unit of unitRecords) insertStrict(db, "confirmed_idea_units", { id: unit.id, discovery_case_id: discoveryCaseId, review_decision_id: id, title: unit.title, confirmed_by: decidedBy, confirmed_at: decidedAt, record_json: JSON.stringify(unit) });
      db.exec("COMMIT");
    } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
    return { ok: true, reviewDecision: decision, confirmedIdeaUnits: unitRecords, coreChanged: false };
  } finally { db.close(); }
}

async function readIdeaAnalysisState({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const discoveryCaseId = String(payload.discoveryCaseId || "").trim();
  const db = openDatabase(dbPath);
  try {
    const read = (table) => discoveryCaseId ? db.prepare(`SELECT record_json FROM ${table} WHERE discovery_case_id = ? ORDER BY rowid`).all(discoveryCaseId).map(parseRecordRow) : readRecordJson(db, table);
    return { ok: true, schema: readMeta(db, "idea_analysis_schema"), analysisRuns: read("idea_analysis_runs"), privacyAuthorizations: read("idea_privacy_authorizations"), transmissionReceipts: read("idea_transmission_receipts"), jobs: read("ai_analysis_jobs"), candidates: read("idea_candidates"), resultReceipts: readRecordJson(db, "ai_analysis_result_receipts"), reviewDecisions: read("idea_review_decisions"), confirmedIdeaUnits: read("confirmed_idea_units") };
  } finally { db.close(); }
}

async function stageTrustedDiscoveryFile({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  if (payload.externalSecurityAcknowledged !== true) throw securityGateError("EXTERNAL_SECURITY_ACKNOWLEDGMENT_REQUIRED", "Confirm that security checking is handled outside Project State before adding files.");
  const actorId = requiredDiscoveryId(payload.actorId, "Staging actor ID");
  const reason = requiredDiscoveryText(payload.reason, "External security acknowledgment reason");
  const sourcePath = path.resolve(requiredDiscoveryText(payload.path || payload.localPath, "Selected file path"));
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) throw new Error("Selected file does not exist or is not a file.");
  const stat = fs.statSync(sourcePath);
  if (stat.size > MAX_IMPORT_FILE_BYTES) throw new Error(`Selected file exceeds the configured ${formatBytesForLog(MAX_IMPORT_FILE_BYTES)} archive import size limit.`);
  const classification = classifyDiscoveryFile(sourcePath);
  if (!classification.importAllowed) throw new Error(classification.blockReason || "Selected file type is not supported for Discovery.");
  const extension = classification.extension;
  const timestamp = requiredDiscoveryTimestamp(payload.timestamp || nowIso(), "Staging timestamp");
  const discoveryCaseId = payload.discoveryCaseId || makeId("discovery_case");
  const assetId = makeId("file_asset");
  const versionId = makeId("file_version");
  const stagedPath = path.join(storageRoot, "quarantine", assetId, versionId, safeFileName(path.basename(sourcePath)));
  await fsp.mkdir(path.dirname(stagedPath), { recursive: true });
  await fsp.copyFile(sourcePath, stagedPath, fs.constants.COPYFILE_EXCL);
  const stagedStat = fs.statSync(stagedPath);
  const sha256 = await checksumFile(stagedPath);
  const managedPath = relativeManagedPath(storageRoot, stagedPath);

  let caseCreated = false;
  const lookupDb = openDatabase(dbPath);
  try { caseCreated = !lookupDb.prepare("SELECT 1 AS found FROM discovery_cases WHERE id = ?").get(discoveryCaseId); }
  finally { lookupDb.close(); }
  if (caseCreated) await createDiscoveryCase({ storageRoot, dbPath, payload: { id: discoveryCaseId, createdBy: actorId, createdAt: timestamp, stage: "quarantine", status: "created", title: payload.caseTitle || path.basename(sourcePath) } });
  const registration = await registerDiscoveryFileVersion({ storageRoot, dbPath, payload: { fileAssetId: assetId, fileVersionId: versionId, sha256, byteSize: stagedStat.size, originalName: path.basename(sourcePath), managedPath, createdAt: timestamp, privacyClass: payload.privacyClass || "local_only", externalSecurityAcknowledged: true, externalSecurityAcknowledgedBy: actorId, externalSecurityAcknowledgedAt: timestamp, externalSecurityReason: reason, fileType: classification } });
  const actualAsset = registration.fileAsset;
  const actualVersion = registration.fileVersion;
  if (registration.deduplicated && actualVersion.managedPath !== managedPath) await fsp.rm(path.dirname(stagedPath), { recursive: true, force: true });
  const membershipDb = openDatabase(dbPath);
  let membershipExists = false;
  try { membershipExists = Boolean(membershipDb.prepare("SELECT 1 AS found FROM discovery_case_files WHERE discovery_case_id = ? AND file_version_id = ?").get(discoveryCaseId, actualVersion.id)); }
  finally { membershipDb.close(); }
  if (!membershipExists) await attachDiscoveryFileVersion({ storageRoot, dbPath, payload: { id: makeId("discovery_file"), discoveryCaseId, fileAssetId: actualAsset.id, fileVersionId: actualVersion.id, addedAt: timestamp, groupingRationale: "User-selected trusted file staged for Discovery." } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "external_security_responsibility_acknowledged", actorId, actorType: "human", occurredAt: timestamp, fileVersionId: actualVersion.id, reason } });
  return { ok: true, discoveryCaseId, caseCreated, fileAssetId: actualAsset.id, fileVersionId: actualVersion.id, sha256: actualVersion.sha256, deduplicated: registration.deduplicated, securityMode: "external_user_responsibility" };
}

function immediateTextExtractionExtension(extension) {
  return classifyDiscoveryFile(`file${extension}`).readMode === "text";
}

function sampleableCorpusExtension(extension) {
  return classifyDiscoveryFile(`file${extension}`).readMode === "text";
}

function textLooksBinaryOrGibberish(text = "") {
  const sample = String(text || "").slice(0, 6000);
  if (!sample.trim()) return true;
  const replacementCount = (sample.match(/\uFFFD/g) || []).length;
  const controlCount = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const printableCount = (sample.match(/[A-Za-z0-9\s.,;:'"!?()[\]{}#/_-]/g) || []).length;
  const printableRatio = printableCount / Math.max(1, sample.length);
  const wordCount = (sample.match(/[A-Za-z][A-Za-z0-9_'-]{2,}/g) || []).length;
  const zipContainerNoise = /^\s*PK[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/.test(sample) || /\[Content_Types\]\.xml|_rels\/\.rels/.test(sample);
  return zipContainerNoise || replacementCount > 12 || controlCount > 20 || printableRatio < 0.58 || (sample.length > 500 && wordCount < 8);
}

async function extractReadableDiscoveryText(filePath) {
  const text = cleanExtractedText(await extractText(filePath) || "");
  if (!text || textLooksBinaryOrGibberish(text)) return "";
  return text;
}

async function readDiscoveryFileSample(filePath, byteSize, sampleBytes = CORPUS_PREFLIGHT_SAMPLE_BYTES) {
  const bytesToRead = Math.min(Math.max(4096, sampleBytes), Math.max(0, Number(byteSize) || 0));
  if (!bytesToRead) return { text: "", sampledBytes: 0, headBytes: 0, tailBytes: 0 };
  const handle = await fsp.open(filePath, "r");
  try {
    const headBuffer = Buffer.alloc(bytesToRead);
    const headRead = await handle.read(headBuffer, 0, bytesToRead, 0);
    let tailBuffer = Buffer.alloc(0);
    let tailRead = { bytesRead: 0 };
    if (byteSize > bytesToRead * 2) {
      tailBuffer = Buffer.alloc(bytesToRead);
      tailRead = await handle.read(tailBuffer, 0, bytesToRead, Math.max(0, byteSize - bytesToRead));
    }
    const sampledBytes = headRead.bytesRead + tailRead.bytesRead;
    return {
      text: `${headBuffer.subarray(0, headRead.bytesRead).toString("utf8")}\n${tailBuffer.subarray(0, tailRead.bytesRead).toString("utf8")}`,
      sampledBytes,
      headBytes: headRead.bytesRead,
      tailBytes: tailRead.bytesRead
    };
  } finally {
    await handle.close();
  }
}

function countApproxWords(text = "") {
  const matches = String(text || "").match(/[A-Za-z0-9_’'-]+/g);
  return matches ? matches.length : 0;
}

function estimateWordsFromSample(text, sampledBytes, totalBytes) {
  const sampleWords = countApproxWords(text);
  if (!sampleWords || !sampledBytes || !totalBytes) return sampleWords;
  return Math.max(sampleWords, Math.round(sampleWords * (Number(totalBytes) / Number(sampledBytes))));
}

function detectCorpusKind(sampleText = "", originalName = "") {
  const text = String(sampleText || "").slice(0, 200000);
  const lower = `${String(originalName || "").toLowerCase()}\n${text.toLowerCase()}`;
  const jsonChatMarkers = /"role"\s*:\s*"(user|assistant|system)"/i.test(text) || /"mapping"\s*:/.test(text) || /"conversations?"\s*:/.test(text);
  const transcriptMarkers = /\b(user|assistant|chatgpt|system)\s*:/i.test(text) || /\bprompt\b[\s\S]{0,200}\bresponse\b/i.test(text);
  if (lower.includes("chatgpt") || jsonChatMarkers || transcriptMarkers) return "raw_chatgpt_archive";
  if (/\bmeeting\b|\btranscript\b|\bconversation\b/i.test(text)) return "transcript_archive";
  return "large_document_corpus";
}

async function buildDiscoveryPreflight({ filePath, version, extension }) {
  const byteSize = Number(version.byteSize || 0);
  const sample = sampleableCorpusExtension(extension) ? await readDiscoveryFileSample(filePath, byteSize) : { text: "", sampledBytes: 0, headBytes: 0, tailBytes: 0 };
  const estimatedWords = sample.text ? estimateWordsFromSample(sample.text, sample.sampledBytes, byteSize) : 0;
  const corpusKind = sample.text ? detectCorpusKind(sample.text, version.originalName || "") : "";
  const reasons = [];
  if (byteSize > MAX_TEXT_EXTRACTION_BYTES) reasons.push(`File is above the ${formatBytesForLog(MAX_TEXT_EXTRACTION_BYTES)} immediate extraction threshold.`);
  if (estimatedWords > MAX_IMMEDIATE_DISCOVERY_WORDS) reasons.push(`Estimated word count is above the ${MAX_IMMEDIATE_DISCOVERY_WORDS.toLocaleString()} word immediate Discovery threshold.`);
  if (corpusKind === "raw_chatgpt_archive") reasons.push("Preflight sample looks like a raw ChatGPT/chat archive.");
  const mode = reasons.length ? "large_corpus" : "standard_document";
  return {
    mode,
    corpusKind: mode === "large_corpus" ? corpusKind || "large_document_corpus" : corpusKind || "",
    byteSize,
    byteLimit: MAX_TEXT_EXTRACTION_BYTES,
    estimatedWords,
    wordLimit: MAX_IMMEDIATE_DISCOVERY_WORDS,
    sampledBytes: sample.sampledBytes,
    sampleStrategy: sample.tailBytes ? "head_and_tail" : sample.headBytes ? "head" : "metadata_only",
    immediateExtractionAllowed: mode !== "large_corpus",
    recommendedLane: mode === "large_corpus" ? "corpus_intake" : "standard_discovery",
    reasons,
    nextStep: mode === "large_corpus"
      ? "Stage and index this as a large corpus before asking the user to promote project candidates."
      : "Proceed with standard local extraction and Discovery review."
  };
}

async function extractDiscoveryFileVersion({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const fileVersionId = requiredDiscoveryId(payload.fileVersionId, "File Version ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Extraction actor ID");
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Extraction createdAt");
  const db = openDatabase(dbPath);
  let version;
  try {
    if (!db.prepare("SELECT 1 AS found FROM discovery_case_files WHERE discovery_case_id = ? AND file_version_id = ?").get(discoveryCaseId, fileVersionId)) throw new Error("File Version is not attached to the Discovery Case.");
    version = dbRecord(db, "file_versions", fileVersionId);
    if (!version) throw new Error("File Version was not found.");
  } finally { db.close(); }
  await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: { managedPath: version.managedPath } });
  const classification = version.fileType || classifyDiscoveryFile(version.originalName || "");
  const extension = classification.extension || path.extname(version.originalName || "").toLowerCase();
  const physicalPath = resolveManagedPath(storageRoot, version.managedPath);
  const extractionId = payload.id || makeId("discovery_extraction");
  let status = "unsupported";
  let text = "";
  let error = null;
  let preflight = null;
  try {
    if (immediateTextExtractionExtension(extension)) {
      preflight = await buildDiscoveryPreflight({ filePath: physicalPath, version, extension });
      if (preflight.mode === "large_corpus") {
        status = "large_corpus_pending";
        error = {
          name: "LargeCorpusDeferred",
          message: `File was staged safely as a large corpus. ${preflight.reasons.join(" ")}`
        };
      } else if ((version.byteSize || 0) > MAX_TEXT_EXTRACTION_BYTES) {
        status = "large_file_pending";
        error = { name: "LargeFileDeferred", message: `File was staged safely, but immediate text extraction is deferred above ${formatBytesForLog(MAX_TEXT_EXTRACTION_BYTES)}.` };
      } else {
        text = await extractReadableDiscoveryText(physicalPath);
        status = text ? "complete" : "partial";
      }
    } else if (classification.readMode === "metadata_only") status = "metadata_only";
    else if (classification.readMode === "blocked") {
      status = "unsupported";
      error = { name: "BlockedFileType", message: classification.blockReason || "File type is blocked from Discovery extraction." };
    }
  } catch (caught) {
    status = "failed";
    error = { name: caught.name || "Error", message: caught.message || "Extraction failed." };
  }
  let textPath = "";
  let textSha256 = "";
  let textBytes = 0;
  const chunks = [];
  if (text) {
    const extractionRoot = path.join(storageRoot, "discovery", discoveryCaseId, fileVersionId, extractionId);
    const fullTextPath = path.join(extractionRoot, "full-text.txt");
    await fsp.mkdir(extractionRoot, { recursive: true });
    await fsp.writeFile(fullTextPath, text, "utf8");
    textPath = relativeManagedPath(storageRoot, fullTextPath);
    textSha256 = checksumText(text);
    textBytes = Buffer.byteLength(text, "utf8");
    const pieces = chunkDeterministicText(text, Number(payload.chunkCharacters) || 4000);
    for (let index = 0; index < pieces.length; index += 1) {
      const chunkText = pieces[index];
      const chunkId = `${extractionId}_chunk_${String(index).padStart(4, "0")}`;
      const chunkPath = path.join(extractionRoot, "chunks", `${String(index).padStart(4, "0")}.txt`);
      await fsp.mkdir(path.dirname(chunkPath), { recursive: true });
      await fsp.writeFile(chunkPath, chunkText, "utf8");
      chunks.push({ id: chunkId, discoveryExtractionId: extractionId, chunkIndex: index, textPath: relativeManagedPath(storageRoot, chunkPath), textSha256: checksumText(chunkText), textBytes: Buffer.byteLength(chunkText, "utf8") });
    }
  }
  const record = { id: extractionId, discoveryCaseId, fileAssetId: version.fileAssetId, fileVersionId, sourceSha256: version.sha256, status, extractorId: "project_state_deterministic_v0.1", textPath, textSha256, textBytes, chunkCount: chunks.length, createdAt, error, preflight, fileType: classification };
  const writeDb = openDatabase(dbPath);
  try {
    writeDb.exec("BEGIN IMMEDIATE TRANSACTION");
    insertStrict(writeDb, "discovery_extractions", { id: extractionId, discovery_case_id: discoveryCaseId, file_asset_id: version.fileAssetId, file_version_id: fileVersionId, source_sha256: version.sha256, status, extractor_id: record.extractorId, text_path: textPath || null, text_sha256: textSha256 || null, text_bytes: textBytes, created_at: createdAt, record_json: JSON.stringify(record) });
    for (const chunk of chunks) insertStrict(writeDb, "discovery_chunks", { id: chunk.id, discovery_extraction_id: extractionId, chunk_index: chunk.chunkIndex, text_path: chunk.textPath, text_sha256: chunk.textSha256, text_bytes: chunk.textBytes, record_json: JSON.stringify(chunk) });
    writeDb.exec("COMMIT");
  } catch (caught) { try { writeDb.exec("ROLLBACK"); } catch {} throw caught; }
  finally { writeDb.close(); }
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "deterministic_extraction_completed", actorId, actorType: "tool", occurredAt: createdAt, fileVersionId, extractionId, status, chunkCount: chunks.length } });
  return { ok: status !== "failed", extraction: record, chunks };
}

async function readDiscoveryExtractionText({ storageRoot, dbPath, payload = {} }) {
  const extractionId = requiredDiscoveryId(payload.extractionId || payload.id, "Discovery Extraction ID");
  const db = openDatabase(dbPath);
  let extraction;
  let version;
  try { extraction = dbRecord(db, "discovery_extractions", extractionId); if (!extraction) throw new Error("Discovery Extraction was not found."); version = dbRecord(db, "file_versions", extraction.fileVersionId); }
  finally { db.close(); }
  await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: { managedPath: version.managedPath } });
  if (!extraction.textPath) return { ok: true, status: extraction.status, text: "" };
  const text = await fsp.readFile(resolveManagedPath(storageRoot, extraction.textPath), "utf8");
  if (Buffer.byteLength(text, "utf8") !== extraction.textBytes || checksumText(text) !== extraction.textSha256) throw new Error("Discovery Extraction derivative integrity failed.");
  return { ok: true, status: extraction.status, text };
}

async function indexDiscoveryCorpus({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const extractionId = requiredDiscoveryId(payload.extractionId, "Discovery Extraction ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Corpus indexing actor ID");
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Corpus indexing timestamp");
  const chunkCharacters = Math.max(2000, Math.min(20000, Number(payload.chunkCharacters) || 12000));
  const maxChunks = Math.max(1, Math.min(500, Number(payload.maxChunks) || 120));
  const continueIndex = payload.continueIndex === true || payload.mode === "continue";
  const db = openDatabase(dbPath);
  let extraction;
  let version;
  let existingChunkCount = 0;
  try {
    extraction = dbRecord(db, "discovery_extractions", extractionId);
    if (!extraction || extraction.discoveryCaseId !== discoveryCaseId) throw new Error("Large corpus extraction was not found for this Discovery Case.");
    if (extraction.status !== "large_corpus_pending") throw new Error("Only pending large-corpus extractions can be indexed by this operation.");
    version = dbRecord(db, "file_versions", extraction.fileVersionId);
    if (!version) throw new Error("Discovery File Version was not found.");
    existingChunkCount = db.prepare("SELECT COUNT(*) AS count FROM discovery_chunks WHERE discovery_extraction_id = ?").get(extractionId).count;
    if (existingChunkCount > 0 && !continueIndex) {
      const chunks = db.prepare("SELECT record_json FROM discovery_chunks WHERE discovery_extraction_id = ? ORDER BY chunk_index").all(extractionId).map(parseRecordRow);
      return { ok: true, deduplicated: true, discoveryCaseId, extraction, chunks, indexed: { chunkCount: 0, totalIndexedChunks: chunks.length, alreadyIndexed: true } };
    }
  } finally { db.close(); }
  await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: { managedPath: version.managedPath } });
  const extension = path.extname(version.originalName || "").toLowerCase();
  if (!sampleableCorpusExtension(extension)) throw new Error("Corpus indexing currently supports text, markdown, CSV, JSON, notebooks, and source-code archives.");
  const physicalPath = resolveManagedPath(storageRoot, version.managedPath);
  const startChunkIndex = continueIndex ? existingChunkCount : 0;
  const windowed = extension === ".docx"
    ? await extractDocxTextWindow(await fsp.readFile(physicalPath), { chunkCharacters, startChunkIndex, maxChunks })
    : null;
  const rawText = windowed ? "" : await extractReadableDiscoveryText(physicalPath);
  if (!windowed && !rawText) throw new Error("Corpus indexing found no readable text.");
  const allPieces = windowed ? [] : chunkDeterministicText(rawText, chunkCharacters);
  const pieces = windowed ? windowed.pieces : allPieces.slice(startChunkIndex, startChunkIndex + maxChunks);
  const extractionRoot = path.join(storageRoot, "discovery", discoveryCaseId, extraction.fileVersionId, extractionId, "corpus-index");
  const chunks = [];
  await fsp.mkdir(path.join(extractionRoot, "chunks"), { recursive: true });
  for (let index = 0; index < pieces.length; index += 1) {
    const chunkIndex = startChunkIndex + index;
    const chunkText = pieces[index];
    const chunkId = `${extractionId}_corpus_chunk_${String(chunkIndex).padStart(6, "0")}`;
    const chunkPath = path.join(extractionRoot, "chunks", `${String(chunkIndex).padStart(6, "0")}.txt`);
    await fsp.writeFile(chunkPath, chunkText, "utf8");
    chunks.push({
      id: chunkId,
      discoveryExtractionId: extractionId,
      chunkIndex,
      textPath: relativeManagedPath(storageRoot, chunkPath),
      textSha256: checksumText(chunkText),
      textBytes: Buffer.byteLength(chunkText, "utf8"),
      corpusIndex: true,
      sourceStatus: extraction.status,
      indexedAt: createdAt
    });
  }
  const writeDb = openDatabase(dbPath);
  try {
    writeDb.exec("BEGIN IMMEDIATE TRANSACTION");
    for (const chunk of chunks) insertStrict(writeDb, "discovery_chunks", { id: chunk.id, discovery_extraction_id: extractionId, chunk_index: chunk.chunkIndex, text_path: chunk.textPath, text_sha256: chunk.textSha256, text_bytes: chunk.textBytes, record_json: JSON.stringify(chunk) });
    writeDb.exec("COMMIT");
  } catch (caught) { try { writeDb.exec("ROLLBACK"); } catch {} throw caught; }
  finally { writeDb.close(); }
  const readDb = openDatabase(dbPath);
  let allChunks;
  try {
    allChunks = readDb.prepare("SELECT record_json FROM discovery_chunks WHERE discovery_extraction_id = ? ORDER BY chunk_index").all(extractionId).map(parseRecordRow);
  } finally { readDb.close(); }
  const totalIndexedChunks = allChunks.length;
  const truncated = windowed ? windowed.truncated : totalIndexedChunks < allPieces.length;
  const complete = windowed ? windowed.complete : !truncated;
  const totalDetectedChunks = windowed ? windowed.totalDetectedChunks : allPieces.length;
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "large_corpus_indexed", actorId, actorType: "tool", occurredAt: createdAt, fileVersionId: extraction.fileVersionId, extractionId, chunkCount: chunks.length, totalIndexedChunks, totalDetectedChunks, nextChunkIndex: totalIndexedChunks, chunkCharacters, maxChunks, startChunkIndex, truncated, complete, streamingWindow: Boolean(windowed) } });
  return { ok: true, discoveryCaseId, extraction, chunks: allChunks, indexed: { chunkCount: chunks.length, totalIndexedChunks, startChunkIndex, nextChunkIndex: totalIndexedChunks, chunkCharacters, maxChunks, truncated, complete, totalDetectedChunks, streamingWindow: Boolean(windowed) } };
}

async function readDiscoveryChunkText({ storageRoot, dbPath, payload = {} }) {
  const chunkId = requiredDiscoveryId(payload.discoveryChunkId || payload.chunkId || payload.id, "Discovery Chunk ID");
  const db = openDatabase(dbPath);
  let chunk;
  let extraction;
  let version;
  try {
    chunk = dbRecord(db, "discovery_chunks", chunkId);
    if (!chunk) throw new Error("Discovery Chunk was not found.");
    extraction = dbRecord(db, "discovery_extractions", chunk.discoveryExtractionId);
    if (!extraction) throw new Error("Discovery Extraction was not found.");
    version = dbRecord(db, "file_versions", extraction.fileVersionId);
    if (!version) throw new Error("Discovery File Version was not found.");
  } finally { db.close(); }
  await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: { managedPath: version.managedPath } });
  const text = await fsp.readFile(resolveManagedPath(storageRoot, chunk.textPath), "utf8");
  if (Buffer.byteLength(text, "utf8") !== chunk.textBytes || checksumText(text) !== chunk.textSha256) throw new Error("Discovery Chunk derivative integrity failed.");
  return { ok: true, chunk, extraction, fileVersion: version, text };
}

function chunkDeterministicText(text, targetCharacters) {
  const limit = Math.max(500, Math.min(16000, Number(targetCharacters) || 4000));
  const chunks = [];
  let remaining = String(text || "");
  while (remaining.length > limit) {
    let splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt < Math.floor(limit * 0.5)) splitAt = remaining.lastIndexOf(" ", limit);
    if (splitAt < Math.floor(limit * 0.5)) splitAt = limit;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.trim()) chunks.push(remaining.trim());
  if (chunks.length > 1 && chunks[chunks.length - 1].length < 500 && looksLikeContinuationText(chunks[chunks.length - 1], chunks[chunks.length - 2])) {
    chunks[chunks.length - 2] = `${chunks[chunks.length - 2]}\n${chunks.pop()}`;
  }
  return chunks;
}

function looksLikeContinuationText(text = "", previousText = "", minimumCharacters = 500) {
  const value = String(text || "").trim();
  if (!value || value.length >= Math.max(64, Number(minimumCharacters) || 500)) return false;
  const prior = String(previousText || "").trim();
  const startsAsContinuation = /^(?:[-*•]\s*|\d+[.)]\s*|(?:open|remaining|follow-up|unresolved) questions?\b)/i.test(value);
  const continuationMarks = (value.match(/[?•]|(?:^|\n)\s*(?:[-*]|\d+[.)])\s+/g) || []).length;
  const priorInvitesContinuation = /(?:open|remaining|follow-up|unresolved) questions?\s*:?[ \t]*$/i.test(prior);
  const mostlyShortPrompts = value.split(/(?:\n|•)/).filter((part) => part.trim()).every((part) => part.trim().length <= 180);
  return mostlyShortPrompts && (priorInvitesContinuation || startsAsContinuation || continuationMarks >= 2);
}

const DISCOVERY_DESTINATIONS = new Set(["existing_project", "additional_project_link", "proposed_new_project", "general_reference", "orphaned_idea", "ai_work_order", "large_ai_work_order", "unassigned", "rejected", "multiple_routes"]);
const DISCOVERY_NON_INTAKE_DESTINATIONS = new Set(["unassigned", "rejected", "ai_work_order", "large_ai_work_order"]);

async function analyzeDiscoveryCase({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId || "project_state_deterministic", "Discovery analysis actor ID");
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Discovery analysis createdAt");
  const reviewMode = ["automatic", "scan_for_ideas", "one_item", "each_file"].includes(payload.reviewMode) ? payload.reviewMode : "automatic";
  const db = openDatabase(dbPath);
  let discoveryCase;
  let versions;
  let projects;
  let extractions;
  try {
    discoveryCase = dbRecord(db, "discovery_cases", discoveryCaseId);
    if (!discoveryCase) throw new Error("Discovery Case was not found.");
    versions = db.prepare(`SELECT version.record_json FROM file_versions AS version JOIN discovery_case_files AS membership ON membership.file_version_id = version.id WHERE membership.discovery_case_id = ? ORDER BY membership.rowid`).all(discoveryCaseId).map(parseRecordRow);
    projects = readRecordJson(db, "projects");
    extractions = db.prepare("SELECT record_json FROM discovery_extractions WHERE discovery_case_id = ? ORDER BY rowid").all(discoveryCaseId).map(parseRecordRow);
  } finally { db.close(); }
  if (!versions.length) throw new Error("Discovery Case has no File Versions to analyze.");
  const baseNames = versions.map((version) => path.basename(version.originalName || "", path.extname(version.originalName || ""))).filter(Boolean);
  const caseTitleName = String(discoveryCase.title || "").replace(/^(?:Project folder|Project folder candidate|Known project folder to check|Loose files in selected folder):\s*/i, "").trim();
  const genericCaseTitle = !caseTitleName || ["selected folder", "folder root", "selected file", "selected files", "discovery case", "loose files in selected folder"].includes(caseTitleName.toLowerCase());
  const suggestedName = !genericCaseTitle && caseTitleName ? titleFromTokens(caseTitleName) : suggestDiscoveryName(baseNames) || "Unassigned material";
  const suggestionTokens = tokenSet(suggestedName);
  const projectCandidates = projects.map((project) => {
    const projectTokens = tokenSet(project.name || "");
    const overlap = [...suggestionTokens].filter((token) => projectTokens.has(token));
    return { projectId: project.id, name: project.name || "", confidence: suggestionTokens.size ? Number((overlap.length / suggestionTokens.size).toFixed(2)) : 0, evidence: overlap };
  }).filter((candidate) => candidate.confidence > 0).sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name)).slice(0, 5);
  const questions = [];
  if (projectCandidates.length) questions.push({ id: "routing_existing_project", text: `Does this belong to ${projectCandidates[0].name}?`, affects: "routing", allowNotSure: true });
  else questions.push({ id: "routing_new_or_unassigned", text: "Should this become a new project, general reference, an orphaned idea, or remain unassigned?", affects: "routing", allowNotSure: true });
  if (versions.length > 1) questions.push({ id: "grouping_confirmation", text: "Do these files belong together as one Discovery case?", affects: "grouping", allowNotSure: true });
  questions.push({ id: "privacy_confirmation", text: "Should this material remain local-only, or may a configured provider receive selected content later?", affects: "privacy", allowNotSure: true });
  const extractionTexts = [];
  for (const extraction of extractions.filter((item) => item.textPath)) {
    try {
      const readResult = await readDiscoveryExtractionText({ storageRoot, dbPath, payload: { extractionId: extraction.id } });
      extractionTexts.push({ extraction, text: readResult.text || "" });
    } catch {
      extractionTexts.push({ extraction, text: "" });
    }
  }
  const corpusExtractions = extractions.filter((item) => item.status === "large_corpus_pending");
  if (corpusExtractions.length) questions.unshift({ id: "large_corpus_intake_mode", text: "This looks like a large corpus. Should Project State index it first before creating project candidates?", affects: "processing", allowNotSure: true });
  const documentUnits = reviewMode === "one_item"
    ? []
    : detectDiscoveryDocumentUnits({ versions, extractionTexts, extractions });
  const corpusIntake = corpusExtractions.length
    ? {
      recommended: true,
      pendingFiles: corpusExtractions.length,
      totalEstimatedWords: corpusExtractions.reduce((total, extraction) => total + Number(extraction.preflight?.estimatedWords || 0), 0),
      corpusKinds: [...new Set(corpusExtractions.map((extraction) => extraction.preflight?.corpusKind).filter(Boolean))],
      nextStep: "Index the large file in resumable passes before promoting project candidates."
    }
    : { recommended: false };
  const unitModeSuggestion = reviewMode === "scan_for_ideas"
    ? "multiple_units"
    : reviewMode === "one_item" || reviewMode === "each_file"
      ? "one_item"
      : documentUnits.length > 1 ? "multiple_units" : "one_item";
  const suggestion = { suggestedProjectNames: [{ name: suggestedName, confidence: baseNames.length === 1 ? 0.65 : 0.55, evidence: baseNames }], projectCandidates, questions, documentUnits, unitModeSuggestion, requestedReviewMode: reviewMode, corpusIntake, deterministic: true, provider: "project_state_local_rules_v0.1" };
  await appendDiscoveryInteraction({ storageRoot, dbPath, payload: { id: makeId("interaction"), discoveryCaseId, actorId, actorType: "tool", interactionType: "machine_suggestion", createdAt, content: suggestion, evidence: versions.map((version) => ({ fileVersionId: version.id, sha256: version.sha256 })) } });
  for (const question of questions) await appendDiscoveryInteraction({ storageRoot, dbPath, payload: { id: makeId("interaction"), discoveryCaseId, actorId, actorType: "tool", interactionType: "system_question", createdAt, content: question } });
  await updateDiscoveryCaseRecord({ dbPath, discoveryCaseId, changes: { stage: "questions", status: "questioning", updatedAt: createdAt, suggestedName } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "deterministic_discovery_completed", actorId, actorType: "tool", occurredAt: createdAt, suggestedName, projectCandidateCount: projectCandidates.length, questionCount: questions.length } });
  return { ok: true, discoveryCaseId, ...suggestion };
}

async function recordDiscoveryAnswer({ storageRoot, dbPath, payload = {} }) {
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Answering actor ID");
  const createdAt = requiredDiscoveryTimestamp(payload.createdAt || nowIso(), "Discovery answer createdAt");
  const questionId = requiredDiscoveryId(payload.questionId, "Discovery question ID");
  const answer = payload.answer === null || payload.answer === undefined || String(payload.answer).trim() === "" ? "Not sure" : payload.answer;
  const interaction = await appendDiscoveryInteraction({ storageRoot, dbPath, payload: { id: payload.id || makeId("interaction"), discoveryCaseId, actorId, actorType: "human", interactionType: payload.correction ? "user_correction" : "user_answer", createdAt, questionId, content: answer, supersedesInteractionId: payload.supersedesInteractionId || null } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: payload.correction ? "answer_corrected" : "answer_recorded", actorId, actorType: "human", occurredAt: createdAt, interactionId: interaction.interaction.id, questionId } });
  return interaction;
}

async function confirmDiscoveryRouting({ storageRoot, dbPath, payload = {} }) {
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Routing actor ID");
  const confirmedAt = requiredDiscoveryTimestamp(payload.confirmedAt || nowIso(), "Routing confirmedAt");
  const routeInputs = Array.isArray(payload.routes) && payload.routes.length
    ? payload.routes
    : [{ id: "unit_1", title: payload.proposedProjectName || "Whole document", destination: payload.destination, projectId: payload.projectId, additionalProjectIds: payload.additionalProjectIds, proposedProjectName: payload.proposedProjectName, summary: payload.summary || "", reviewReason: payload.reviewReason || payload.routingReason || "", fileVersionIds: payload.fileVersionIds, evidence: payload.evidence }];
  if (routeInputs.length > DISCOVERY_REVIEW_UNIT_LIMIT) throw new Error(`A Discovery routing confirmation may contain at most ${DISCOVERY_REVIEW_UNIT_LIMIT} document units.`);
  const routes = routeInputs.map((input, index) => {
    const id = requiredDiscoveryId(input.id || `unit_${index + 1}`, "Document unit ID");
    const destination = String(input.destination || "");
    if (!DISCOVERY_DESTINATIONS.has(destination) || destination === "multiple_routes") throw new Error("Document unit routing destination is not supported.");
    const projectId = input.projectId ? requiredDiscoveryId(input.projectId, "Routing project ID") : null;
    if (destination === "existing_project" && !projectId) throw new Error("Existing-project routing requires a project ID.");
    const additionalProjectIds = Array.isArray(input.additionalProjectIds) ? [...new Set(input.additionalProjectIds.map((value) => requiredDiscoveryId(value, "Additional project ID")))] : [];
    const proposedProjectName = String(input.proposedProjectName || input.title || "").trim();
    if (destination === "proposed_new_project" && !proposedProjectName) throw new Error("New-project routing requires a proposed project name.");
    const title = String(input.title || proposedProjectName || `Document unit ${index + 1}`).trim();
    if (!title) throw new Error("Every document unit requires a title.");
    return { id, title, summary: String(input.summary || "").trim(), destination, projectId, additionalProjectIds, proposedProjectName, reviewReason: String(input.reviewReason || input.routingReason || "").trim(), fileVersionIds: Array.isArray(input.fileVersionIds) ? [...new Set(input.fileVersionIds.map((value) => requiredDiscoveryId(value, "File Version ID")))] : [], evidence: Array.isArray(input.evidence) ? cloneJson(input.evidence) : [], confirmedBy: actorId, confirmedAt };
  });
  if (new Set(routes.map((route) => route.id)).size !== routes.length) throw new Error("Document unit IDs must be unique within a routing confirmation.");
  const db = openDatabase(dbPath);
  try {
    if (!dbRecord(db, "discovery_cases", discoveryCaseId)) throw new Error("Discovery Case was not found.");
    for (const id of routes.flatMap((route) => [route.projectId, ...route.additionalProjectIds]).filter(Boolean)) if (!db.prepare("SELECT 1 AS found FROM projects WHERE id = ?").get(id)) throw new Error(`Routing project was not found: ${id}`);
    const memberVersionIds = new Set(db.prepare("SELECT file_version_id AS id FROM discovery_case_files WHERE discovery_case_id = ?").all(discoveryCaseId).map((row) => row.id));
    for (const fileVersionId of routes.flatMap((route) => route.fileVersionIds)) if (!memberVersionIds.has(fileVersionId)) throw new Error(`Document unit File Version is not attached to this Discovery Case: ${fileVersionId}`);
  } finally { db.close(); }
  const routing = routes.length === 1
    ? { ...routes[0], routes, confirmedBy: actorId, confirmedAt }
    : { destination: "multiple_routes", routes, confirmedBy: actorId, confirmedAt };
  const interaction = await appendDiscoveryInteraction({ storageRoot, dbPath, payload: { id: payload.id || makeId("interaction"), discoveryCaseId, actorId, actorType: "human", interactionType: "routing_confirmation", createdAt: confirmedAt, content: routing } });
  await updateDiscoveryCaseRecord({ dbPath, discoveryCaseId, changes: { stage: "routing", status: "ready_for_intake", updatedAt: confirmedAt, confirmedProjectId: routes.length === 1 ? routes[0].projectId : null, confirmedRouting: routing, routingInteractionId: interaction.interaction.id } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "routing_confirmed", actorId, actorType: "human", occurredAt: confirmedAt, destination: routing.destination, projectId: routes.length === 1 ? routes[0].projectId : null, routeCount: routes.length, routeIds: routes.map((route) => route.id), interactionId: interaction.interaction.id } });
  return { ok: true, discoveryCaseId, routing, interactionId: interaction.interaction.id };
}

async function getDiscoveryCase({ storageRoot, dbPath, payload = {} }) {
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId || payload.id, "Discovery Case ID");
  const state = await readDiscoveryFoundationState({ storageRoot, dbPath, payload: { discoveryCaseId } });
  if (!state.discoveryCases.length) throw new Error("Discovery Case was not found.");
  const memberVersionIds = new Set(state.caseFiles.map((item) => item.fileVersionId));
  return { ok: true, discoveryCase: state.discoveryCases[0], fileAssets: state.fileAssets.filter((asset) => state.fileVersions.some((version) => memberVersionIds.has(version.id) && version.fileAssetId === asset.id)), fileVersions: state.fileVersions.filter((version) => memberVersionIds.has(version.id)), memberships: state.caseFiles, extractions: state.extractions, chunks: state.chunks, interactions: state.interactions, events: state.events };
}

async function updateDiscoveryCaseRecord({ dbPath, discoveryCaseId, changes = {} }) {
  const db = openDatabase(dbPath);
  try {
    const current = dbRecord(db, "discovery_cases", discoveryCaseId);
    if (!current) throw new Error("Discovery Case was not found.");
    const next = { ...current, ...cloneJson(changes) };
    if (!DISCOVERY_STAGES.has(next.stage) || !DISCOVERY_CASE_STATUSES.has(next.status)) throw new Error("Discovery Case state is not supported.");
    db.prepare("UPDATE discovery_cases SET updated_at = ?, stage = ?, status = ?, confirmed_project_id = ?, record_json = ? WHERE id = ?").run(next.updatedAt || nowIso(), next.stage, next.status, next.confirmedProjectId || null, JSON.stringify(next), discoveryCaseId);
    return next;
  } finally { db.close(); }
}

function suggestDiscoveryName(baseNames) {
  if (!baseNames.length) return "";
  if (baseNames.length === 1) return titleFromTokens(baseNames[0]);
  const tokenLists = baseNames.map((name) => [...tokenSet(name)]);
  const common = tokenLists[0].filter((token) => tokenLists.every((list) => list.includes(token)));
  return titleFromTokens(common.length ? common.join(" ") : baseNames[0]);
}

function detectDiscoveryDocumentUnits({ versions = [], extractionTexts = [], extractions = [] } = {}) {
  const units = [];
  const versionById = new Map(versions.map((version) => [version.id, version]));
  for (const { extraction, text } of extractionTexts) {
    const version = versionById.get(extraction.fileVersionId) || {};
    const fileName = version.originalName || "Discovery source";
    const legalSignals = legalReferenceSignals(text, fileName);
    if (legalSignals.isLegalReference) {
      const sourceTitle = path.basename(fileName, path.extname(fileName)) || fileName;
      const signalText = (legalSignals.terms || []).join(", ") || "filename/content legal reference";
      units.push({
        id: `unit_${units.length + 1}`,
        title: titleFromTokens(sourceTitle),
        summary: `Licensing, app agreement, terms, privacy, or other reference material. Treat as supporting context, not a standalone project idea unless a human says otherwise. Signals: ${signalText}.`,
        fileVersionIds: [extraction.fileVersionId],
        evidence: [{
          fileVersionId: extraction.fileVersionId,
          extractionId: extraction.id,
          fileName,
          role: "legal_reference_support",
          evidenceKind: "legal_reference",
          note: "Licensing/app agreement material is routed as reference/supporting evidence by default."
        }],
        suggestedDestination: "general_reference",
        reviewReason: "Licensing/app agreement material; keep as reference/supporting evidence, not a standalone project.",
        suggested: true
      });
      continue;
    }
    const lines = String(text || "").replaceAll("\r\n", "\n").split("\n");
    const headings = [];
    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index].trim();
      if (!raw || raw.length > 140) continue;
      const markdown = raw.match(/^#{1,6}\s+(.{3,120})$/);
      const numbered = raw.match(/^(?:\d{1,3}[.)]|[A-Z][.)])\s+(.{3,120})$/);
      const upper = raw.length >= 4 && raw.length <= 80 && /[A-Z]/.test(raw) && raw === raw.toUpperCase() && !/[.!?]$/.test(raw);
      const title = markdown?.[1] || numbered?.[1] || (upper ? raw : "");
      if (title) headings.push({ lineIndex: index, title: title.trim() });
    }
    if (headings.length >= 2) {
      for (let index = 0; index < Math.min(headings.length, DISCOVERY_REVIEW_UNIT_LIMIT); index += 1) {
        const heading = headings[index];
        const endLine = headings[index + 1]?.lineIndex ?? lines.length;
        const summary = lines.slice(heading.lineIndex + 1, endLine).join(" ").replace(/\s+/g, " ").trim().slice(0, 600);
        units.push({ id: `unit_${units.length + 1}`, title: heading.title, summary, fileVersionIds: [extraction.fileVersionId], evidence: [{ fileVersionId: extraction.fileVersionId, extractionId: extraction.id, fileName, heading: heading.title, line: heading.lineIndex + 1 }], suggested: true });
      }
    }
  }
  for (const extraction of extractions.filter((item) => item.status === "large_corpus_pending")) {
    if (units.some((unit) => (unit.fileVersionIds || []).includes(extraction.fileVersionId))) continue;
    const version = versionById.get(extraction.fileVersionId) || {};
    const fileName = version.originalName || "Large corpus";
    const sourceTitle = path.basename(fileName, path.extname(fileName)) || fileName;
    const preflight = extraction.preflight || {};
    units.push({
      id: `unit_${units.length + 1}`,
      title: titleFromTokens(sourceTitle),
      summary: [
        "Large corpus staged safely for indexed Discovery.",
        preflight.estimatedWords ? `Estimated words: ${Number(preflight.estimatedWords).toLocaleString()}.` : "",
        preflight.corpusKind ? `Detected type: ${preflight.corpusKind}.` : "",
        preflight.nextStep || ""
      ].filter(Boolean).join(" ").slice(0, 800),
      fileVersionIds: [extraction.fileVersionId],
      evidence: [{
        fileVersionId: extraction.fileVersionId,
        extractionId: extraction.id,
        fileName,
        role: "large_corpus_pending",
        corpusKind: preflight.corpusKind || "large_document_corpus",
        estimatedWords: preflight.estimatedWords || 0,
        note: "Large corpus is staged and needs indexed processing before confident project splitting."
      }],
      corpusPreflight: cloneJson(preflight),
      suggested: true
    });
  }
  const assignedVersionIds = new Set(units.flatMap((unit) => unit.fileVersionIds || []));
  const corpusVersionIds = new Set(extractions.filter((item) => item.status === "large_corpus_pending").map((item) => item.fileVersionId));
  const supportingVersions = versions.filter((version) => !assignedVersionIds.has(version.id) && !corpusVersionIds.has(version.id));
  if (units.length && supportingVersions.length) {
    const firstUnit = units[0];
    firstUnit.fileVersionIds = [...new Set([...(firstUnit.fileVersionIds || []), ...supportingVersions.map((version) => version.id)])];
    firstUnit.evidence = [
      ...(firstUnit.evidence || []),
      ...supportingVersions.map((version) => ({
        fileVersionId: version.id,
        fileName: version.originalName || "Supporting file",
        role: "supporting_file_without_text",
        evidenceKind: version.fileType?.key || evidenceKindFromFileName(version.originalName).key,
        evidenceLabel: version.fileType?.label || evidenceKindFromFileName(version.originalName).label,
        readMode: version.fileType?.readMode || "metadata_only",
        projectRole: version.fileType?.projectRole || "supporting_file",
        routingHint: version.fileType?.routingHint || "Use filename, folder location, and nearby readable files for routing.",
        note: "Metadata-only file from the same Discovery folder attached so it is not left unassigned."
      }))
    ];
    firstUnit.supportingFileCount = supportingVersions.length;
  }
  return units.slice(0, DISCOVERY_REVIEW_UNIT_LIMIT);
}

function tokenSet(value) {
  return new Set(String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 1 && !["the", "and", "for", "with", "from", "file", "document"].includes(token)));
}

function titleFromTokens(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function promoteDiscoveryToIntake({ storageRoot, dbPath, payload = {} }) {
  const discoveryCaseId = requiredDiscoveryId(payload.discoveryCaseId, "Discovery Case ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Promoting actor ID");
  const promotedAt = requiredDiscoveryTimestamp(payload.promotedAt || nowIso(), "Discovery promotion timestamp");
  const reason = requiredDiscoveryText(payload.reason, "Discovery promotion reason");
  const caseView = await getDiscoveryCase({ storageRoot, dbPath, payload: { discoveryCaseId } });
  const discoveryCase = caseView.discoveryCase;
  if (discoveryCase.status === "promoted" && discoveryCase.promotedIntakeBatchId) return { ok: true, deduplicated: true, discoveryCaseId, intakeBatchId: discoveryCase.promotedIntakeBatchId, intakeItemIds: discoveryCase.promotedIntakeItemIds || [] };
  if (discoveryCase.status !== "ready_for_intake" || !discoveryCase.confirmedRouting || !discoveryCase.routingInteractionId) throw new Error("Discovery Case is not ready for Intake promotion.");
  const routing = discoveryCase.confirmedRouting;
  const routes = Array.isArray(routing.routes) && routing.routes.length ? routing.routes : [routing];
  const promotableRoutes = routes.filter((route) => !DISCOVERY_NON_INTAKE_DESTINATIONS.has(route.destination));
  if (!promotableRoutes.length) throw new Error("Discovery routing contains no document units eligible for Intake promotion.");
  for (const version of caseView.fileVersions) await authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference: { managedPath: version.managedPath } });
  const intakeBatchId = payload.intakeBatchId || makeId("intake_batch");
  const intakeItems = [];
  for (const route of promotableRoutes) {
    const routeVersionIds = new Set(Array.isArray(route.fileVersionIds) && route.fileVersionIds.length ? route.fileVersionIds : caseView.fileVersions.map((version) => version.id));
    const routeVersions = caseView.fileVersions.filter((version) => routeVersionIds.has(version.id));
    const targetProjectIds = [...new Set([route.projectId, ...(route.additionalProjectIds || [])].filter(Boolean))];
    for (const version of routeVersions) {
      const extraction = (caseView.extractions || []).find((item) => item.fileVersionId === version.id) || null;
      const routeEvidenceForVersion = (route.evidence || []).filter((item) => item.fileVersionId === version.id);
      const supportingFileEvidence = routeEvidenceForVersion.find((item) => item.role === "supporting_file_without_text") || null;
      const isSupportingFile = Boolean(supportingFileEvidence);
      let extractedText = "";
      if (extraction?.textPath) extractedText = (await readDiscoveryExtractionText({ storageRoot, dbPath, payload: { extractionId: extraction.id } })).text || "";
      const extractionStatus = extraction?.status || "metadata_only";
      const textBacked = Boolean(String(extractedText || "").trim()) || ["complete", "partial"].includes(extractionStatus);
      if (isSupportingFile || !textBacked) continue;
      const sourceTitle = path.basename(version.originalName || "Discovery source", path.extname(version.originalName || "")) || version.originalName || "Discovery source";
      const itemTitle = routes.length > 1
          ? `Add source unit: ${route.title}`
          : `Add source: ${version.originalName || sourceTitle}`;
      const proposedText = routes.length > 1
          ? route.title
          : sourceTitle;
      const routeReviewReason = String(route.reviewReason || "").trim();
      const routeHasCoreTarget = targetProjectIds.length > 0 || (route.destination === "proposed_new_project" && String(route.proposedProjectName || "").trim());
      const proposedObjectType = "Source";
      const proposalReady = routeHasCoreTarget && proposedText && proposedObjectType;
      for (const projectId of (targetProjectIds.length ? targetProjectIds : [null])) intakeItems.push({
      id: makeId("intake_item"),
      intakeBatchId,
      projectId: projectId || "",
      status: "pending",
      reviewState: "needs_review",
      queueState: proposalReady ? "ready" : "needs_review",
      queueNotes: routeReviewReason || (proposalReady ? "Ready for Core approval after human review." : "Needs routing or proposal cleanup before Core approval."),
      title: itemTitle,
      createdAt: promotedAt,
      createdBy: actorId,
      sourceLabel: `Discovery: ${version.originalName || sourceTitle}`,
      armType: "discovery",
      proposedObjectType,
      proposedChange: {
        text: proposedText,
        summary: String(route.summary || extractedText).slice(0, 2000),
        extractionStatus
      },
      evidence: {
        discoveryCaseId,
        fileAssetId: version.fileAssetId,
        fileVersionId: version.id,
        sourceSha256: version.sha256,
        extractionId: extraction?.id || "",
        supportRole: "primary_source",
        supportsDiscoveryUnitId: route.id || "unit_1",
        supportsDiscoveryUnitTitle: route.title || sourceTitle,
        discoveryUnit: { id: route.id || "unit_1", title: route.title || sourceTitle, summary: route.summary || "", reviewReason: routeReviewReason, evidence: cloneJson(route.evidence || []) },
        managedFile: {
          fileName: version.originalName || sourceTitle,
          managedPath: version.managedPath,
          sha256: version.sha256,
          size: version.byteSize || 0,
          contentType: ""
        }
      },
      discoveryCaseId,
      fileAssetId: version.fileAssetId,
      fileVersionId: version.id,
      sourceSha256: version.sha256,
      originalName: version.originalName,
      destination: route.destination,
      proposedProjectName: route.proposedProjectName || "",
      discoveryUnitId: route.id || "unit_1",
      discoveryUnitTitle: route.title || sourceTitle,
      routingInteractionId: discoveryCase.routingInteractionId,
      proposedBy: actorId,
      proposedAt: promotedAt,
      reason,
      routingReviewReason: routeReviewReason,
      approval: null,
      assignments: [],
      comments: [],
      archived: false
    });
    }
  }
  if (!intakeItems.length) throw new Error("Discovery routing contains no text-backed document units eligible for Intake promotion.");
  const batch = { id: intakeBatchId, status: "pending", createdAt: promotedAt, createdBy: actorId, reason, origin: "discovery", discoveryCaseId, routingInteractionId: discoveryCase.routingInteractionId, destination: routing.destination, itemIds: intakeItems.map((item) => item.id) };
  const db = openDatabase(dbPath);
  try {
    db.exec("BEGIN IMMEDIATE TRANSACTION");
    insertStrict(db, "intake_batches", { id: batch.id, status: batch.status, created_at: batch.createdAt, record_json: JSON.stringify(batch) });
    for (const item of intakeItems) insertStrict(db, "intake_items", { id: item.id, project_id: item.projectId, status: item.status, arm_type: item.armType, proposed_object_type: item.proposedObjectType, record_json: JSON.stringify(item) });
    const proposedProjectIds = [];
    for (const route of promotableRoutes.filter((item) => item.destination === "proposed_new_project")) {
      const proposedProjectId = makeId("proposed_project");
      const proposed = { id: proposedProjectId, intakeBatchId, name: route.proposedProjectName, status: "pending", discoveryCaseId, discoveryUnitId: route.id || "unit_1", proposedBy: actorId, proposedAt: promotedAt, sourceIntakeItemIds: intakeItems.filter((item) => item.discoveryUnitId === (route.id || "unit_1")).map((item) => item.id) };
      insertStrict(db, "proposed_projects", { id: proposed.id, intake_batch_id: intakeBatchId, status: proposed.status, record_json: JSON.stringify(proposed) });
      proposedProjectIds.push(proposedProjectId);
    }
    if (proposedProjectIds.length) {
      batch.proposedProjectIds = proposedProjectIds;
      if (proposedProjectIds.length === 1) batch.proposedProjectId = proposedProjectIds[0];
      db.prepare("UPDATE intake_batches SET record_json = ? WHERE id = ?").run(JSON.stringify(batch), intakeBatchId);
    }
    db.exec("COMMIT");
  } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
  finally { db.close(); }
  await updateDiscoveryCaseRecord({ dbPath, discoveryCaseId, changes: { stage: "intake", status: "promoted", updatedAt: promotedAt, promotedIntakeBatchId: intakeBatchId, promotedIntakeItemIds: intakeItems.map((item) => item.id) } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "promoted_to_intake", actorId, actorType: "human", occurredAt: promotedAt, intakeBatchId, intakeItemIds: intakeItems.map((item) => item.id), reason } });
  return { ok: true, deduplicated: false, discoveryCaseId, intakeBatchId, intakeItemIds: intakeItems.map((item) => item.id), destination: routing.destination, coreChanged: false };
}

async function authorizeDiscoveryContentAccess({ storageRoot, dbPath, reference = {} }) {
  await ensureSpine(storageRoot);
  const suppliedPath = reference?.managedPath
    ? resolveManagedPath(storageRoot, reference.managedPath)
    : pathFromFileLike(reference?.path || reference?.localPath || reference);
  if (!suppliedPath) return { ok: true, governed: false, reason: "non-path file reference" };

  const governedRoots = [path.resolve(storageRoot, "quarantine"), path.resolve(storageRoot, "sources")];
  const resolvedPath = path.resolve(suppliedPath);
  const governed = governedRoots.some((root) => resolvedPath === root || resolvedPath.startsWith(`${root}${path.sep}`));
  if (!governed) {
    return { ok: true, governed: false, reason: "outside Discovery managed source roots" };
  }

  const managedPath = relativeManagedPath(storageRoot, resolvedPath);
  const db = openDatabase(dbPath);
  try {
    const versionRow = db.prepare("SELECT id, file_asset_id, sha256, byte_size, record_json FROM file_versions WHERE managed_path = ?").get(managedPath);
    if (!versionRow) throw securityGateError("FILE_VERSION_MISMATCH", "Managed content is not registered as a File Version.");
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw securityGateError("FILE_VERSION_MISMATCH", "Registered managed content is missing.");
    }
    const stat = fs.statSync(resolvedPath);
    if (stat.size !== versionRow.byte_size || await checksumFile(resolvedPath) !== versionRow.sha256) {
      throw securityGateError("FILE_VERSION_MISMATCH", "Managed content no longer matches its immutable File Version.");
    }
    const version = JSON.parse(versionRow.record_json);
    if (version.externalSecurityAcknowledged === true && version.externalSecurityAcknowledgedBy && version.externalSecurityAcknowledgedAt) {
      return { ok: true, governed: true, fileAssetId: versionRow.file_asset_id, fileVersionId: versionRow.id, sha256: versionRow.sha256, securityMode: "external_user_responsibility", acknowledgedBy: version.externalSecurityAcknowledgedBy, acknowledgedAt: version.externalSecurityAcknowledgedAt };
    }
    const receipt = db.prepare(`
      SELECT id, sha256, verdict, eligible, provider_id, completed_at
      FROM security_receipts
      WHERE file_version_id = ? AND file_asset_id = ?
      ORDER BY rowid DESC
      LIMIT 1
    `).get(versionRow.id, versionRow.file_asset_id);
    if (!receipt) throw securityGateError("SECURITY_RECEIPT_STALE", "No Security Receipt exists for this File Version.");
    if (receipt.sha256 !== versionRow.sha256) throw securityGateError("FILE_VERSION_MISMATCH", "Security Receipt checksum does not match the File Version.");
    if (receipt.verdict !== "clean" || receipt.eligible !== 1) {
      const errorCode = receipt.verdict === "threat_detected"
        ? "THREAT_DETECTED"
        : receipt.verdict === "suspicious"
          ? "VERDICT_SUSPICIOUS"
          : receipt.verdict === "unknown"
            ? "VERDICT_UNKNOWN"
            : "SCAN_FAILED";
      throw securityGateError(errorCode, `Security Receipt verdict does not permit content access: ${receipt.verdict}.`);
    }
    return {
      ok: true,
      governed: true,
      fileAssetId: versionRow.file_asset_id,
      fileVersionId: versionRow.id,
      sha256: versionRow.sha256,
      receiptId: receipt.id,
      providerId: receipt.provider_id,
      completedAt: receipt.completed_at
    };
  } finally {
    db.close();
  }
}

function securityGateError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function resolveDiscoveryReadReference(storageRoot, reference) {
  if (reference?.managedPath) return resolveManagedPath(storageRoot, reference.managedPath);
  return reference;
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
  splitMeta.aiWorkOrders = store.aiWorkOrders || [];
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
      quarantine: 0,
      discoveryExtractions: 0,
      discoveryChunks: 0,
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
      drafts: countRows(db, "draft_projects"),
      ...discoveryTableCounts(db)
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
    verifyManagedBinaryRows(report, db, storageRoot, {
      table: "file_versions",
      idColumn: "id",
      pathColumn: "managed_path",
      checksumColumn: "sha256",
      label: "quarantine"
    });
    verifyManagedTextRows(report, db, storageRoot, { table: "discovery_extractions", idColumn: "id", pathColumn: "text_path", checksumColumn: "text_sha256", bytesColumn: "text_bytes", label: "discoveryExtractions" });
    verifyManagedTextRows(report, db, storageRoot, { table: "discovery_chunks", idColumn: "id", pathColumn: "text_path", checksumColumn: "text_sha256", bytesColumn: "text_bytes", label: "discoveryChunks" });

    for (const issue of db.prepare("PRAGMA foreign_key_check").all()) {
      report.errors.push(`SQLite foreign key violation: ${issue.table} row ${issue.rowid}.`);
    }

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
    aiWorkOrders: Array.isArray(meta.aiWorkOrders) ? meta.aiWorkOrders : [],
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
      intakeItems: store.intakeItems || [],
      aiWorkOrders: store.aiWorkOrders || []
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
  const expectedChecksum = String(expected.sha256 || "").toLowerCase();
  const actualChecksum = expectedChecksum ? crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex") : "";
  const changed = (expectedSize > 0 && expectedSize !== actual.size) || (expectedChecksum && expectedChecksum !== actualChecksum);

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
      lastModified: expected.lastModified || "",
      sha256: expectedChecksum
    },
    actualChecksum,
    reason: changed ? "The file exists, but it differs from the recorded managed file metadata." : "The file exists and matches recorded managed file metadata."
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
  if ([
    "txt", "md", "csv", "log", "xml", "xhtml", "jsonl",
    "py", "js", "ts", "jsx", "tsx", "html", "css", "scss",
    "cpp", "c", "h", "hpp", "cs", "java", "rs", "go", "sql", "sh", "ps1", "bat", "cmd", "lua", "r", "m", "jl",
    "uproject", "uplugin", "ini", "yaml", "yml", "toml", "cfg", "conf"
  ].includes(extension)) return textFileToDiscoveryText(await readAsText(file), fileName, extension);
  if (extension === "json") return jsonToDiscoveryText(await readAsText(file), fileName);
  if (extension === "ipynb") return notebookToDiscoveryText(await readAsText(file), fileName);
  const bytes = new Uint8Array(await readAsArrayBuffer(file));
  if (extension === "docx") return extractDocxText(bytes);
  if (extension === "pdf") return extractPdfText(bytes);
  return null;
}

function textFileToDiscoveryText(raw = "", fileName = "", extension = "") {
  if (["txt", "md", "csv"].includes(extension)) return cleanExtractedText(raw);
  const label = path.basename(String(fileName || "Text file"));
  const kind = evidenceKindFromFileName(fileName);
  return cleanExtractedText([
    `${kind.label}: ${label}`,
    extension ? `Extension: .${extension}` : "",
    "",
    raw
  ].join("\n"));
}

function jsonToDiscoveryText(raw = "", fileName = "") {
  const sourceLabel = path.basename(String(fileName || "JSON file"));
  try {
    const parsed = JSON.parse(raw);
    const topLevel = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.keys(parsed).slice(0, 100)
      : [];
    return cleanExtractedText([
      `JSON file: ${sourceLabel}`,
      topLevel.length ? `Top-level keys: ${topLevel.join(", ")}` : "",
      "",
      stableStringify(parsed)
    ].join("\n"));
  } catch {
    return cleanExtractedText([
      `JSON-like text file: ${sourceLabel}`,
      "",
      raw
    ].join("\n"));
  }
}

function notebookToDiscoveryText(raw = "", fileName = "") {
  const sourceLabel = path.basename(String(fileName || "Jupyter notebook"));
  try {
    const parsed = JSON.parse(raw);
    const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
    const parts = [`Jupyter notebook: ${sourceLabel}`, `Cells: ${cells.length}`, ""];
    cells.slice(0, 2000).forEach((cell, index) => {
      const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
      const outputs = Array.isArray(cell.outputs)
        ? cell.outputs.map((output) => {
          if (Array.isArray(output.text)) return output.text.join("");
          if (output.data && typeof output.data === "object") return Object.keys(output.data).join(", ");
          return output.output_type || "";
        }).filter(Boolean).join("\n").slice(0, 2000)
        : "";
      parts.push(`Notebook cell ${index + 1} (${cell.cell_type || "unknown"})`);
      if (source.trim()) parts.push(source.trim());
      if (outputs.trim()) parts.push(`Output summary:\n${outputs.trim()}`);
      parts.push("");
    });
    return cleanExtractedText(parts.join("\n"));
  } catch {
    return cleanExtractedText([`Jupyter notebook-like file: ${sourceLabel}`, "", raw].join("\n"));
  }
}

function evidenceKindFromFileName(fileName = "") {
  return classifyDiscoveryFile(fileName).evidenceKind;
}

function classifyDiscoveryFile(fileName = "") {
  const extension = path.extname(String(fileName || "")).toLowerCase();
  const registryEntry = DISCOVERY_FILE_TYPE_BY_EXTENSION.get(extension);
  const base = registryEntry || {
    key: "unknown_file",
    label: extension ? `Unknown ${extension} file` : "Unknown file",
    readMode: "metadata_only",
    projectRole: "unknown_supporting_material",
    routingHint: "Do not deep-read; use filename, folder location, size, and nearby readable files for routing."
  };
  const blocked = base.readMode === "blocked";
  return {
    key: base.key,
    label: base.label,
    extension,
    readMode: base.readMode,
    projectRole: base.projectRole,
    routingHint: base.routingHint,
    importAllowed: !blocked,
    blockReason: blocked ? `${base.label} is blocked from Project State import. Keep it outside Discovery unless a future external security workflow explicitly records it as surface-only.` : "",
    evidenceKind: { key: base.key, label: base.label }
  };
}


function reviewPackEntities(text = "") {
  const generic = new Set(["the", "this", "that", "these", "those", "internally", "which", "best", "final", "current", "bottom", "one", "none", "single", "small", "larger", "multiple", "initial", "integrated", "extensive", "discussed", "discussion", "advantages", "candidate", "concept", "summary", "overview", "purpose", "introduction", "conclusion", "important", "applications", "examples", "next steps", "open questions", "core concept", "key conclusions", "architecture", "coupling layer", "prototype roadmap", "bench testing", "patent strategy", "prior-art discussion", "uspto update"]);
  const values = [];
  const seen = new Set();
  for (const match of String(text || "").matchAll(/\b[A-Z][A-Za-z0-9]*(?:[ \t\/-]+[A-Z][A-Za-z0-9]*){0,5}\b/g)) {
    const value = match[0].trim();
    const key = value.toLowerCase();
    if (value.length < 3 || generic.has(key) || seen.has(key)) continue;
    seen.add(key);
    values.push(value);
    if (values.length >= 100) break;
  }
  return values;
}

function reviewPackHeadings(text = "") {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => {
    if (/^#{1,6}\s+\S/.test(line) || (/^[A-Z][A-Z0-9 '&/()_-]{3,100}$/.test(line) && line.length <= 120)) return true;
    if (!line || line.length > 100 || /[.!?;]$/.test(line) || /^(?:[-*•]|\d+[.)])\s+/.test(line)) return false;
    const words = line.replace(/:$/, "").split(/\s+/).filter(Boolean);
    if (!words.length || words.length > 10) return false;
    return /:$/.test(line) || words.every((word) => /^(?:[&/+-]|[A-Z][A-Za-z0-9'/-]*|[A-Z0-9]{2,})$/.test(word));
  }).slice(0, 100);
}

function reviewProjectIsPrivate(project = {}) {
  const privacy = String(project.privacyClass || project.privacy || "").toLowerCase();
  return project.private === true || project.exportExcluded === true || project.excludeFromAiReview === true || project.excludeFromReviewExport === true || ["personal", "confidential", "restricted", "private"].includes(privacy);
}

function reviewProjectIsDeleted(project = {}) {
  return project.deleted === true || project.isDeleted === true || ["deleted", "removed"].includes(String(project.status || "").toLowerCase());
}

function currentReviewRegistryProjects(dbPath, providedProjects = []) {
  const providedById = new Map((providedProjects || []).filter((project) => project?.id).map((project) => [String(project.id), project]));
  const db = openDatabase(dbPath);
  try {
    return readRecordJson(db, "projects")
      .filter((project) => project?.id && !reviewProjectIsDeleted(project))
      .map((project) => ({ ...project, ...(providedById.get(String(project.id)) || {}), id: String(project.id), name: String(project.name || providedById.get(String(project.id))?.name || "Untitled project") }));
  } finally {
    db.close();
  }
}

function reviewPackProjectRegistry(projects = [], { includePrivateProjects = false } = {}) {
  return (projects || []).filter((project) => project?.id && !reviewProjectIsDeleted(project) && (includePrivateProjects || !reviewProjectIsPrivate(project))).map((project) => {
    const rawStatus = String(project.status || project.healthFlag || "").toLowerCase();
    const status = project.archived ? "archived" : rawStatus === "paused" || rawStatus === "on_hold" ? "paused" : "active";
    return {
      project_id: String(project.id),
      canonical_name: String(project.name || project.canonicalName || "Untitled project"),
      aliases: [...new Set([...(project.aliases || []), ...(project.tags || [])].map(String).filter(Boolean))].slice(0, 50),
      former_names: [...new Set([...(project.formerNames || []), ...(project.previousNames || [])].map(String).filter(Boolean))].slice(0, 50),
      short_summary: String(project.currentSummary || project.shortSummary || project.currentStatus || "").slice(0, 2000),
      status,
      parent_project_id: project.parentProjectId ? String(project.parentProjectId) : null,
      ...(project.projectFamily ? { project_family: String(project.projectFamily) } : {})
    };
  });
}

function populateReviewPackConceptProfiles(chunks = [], projectRegistry = []) {
  const registryById = new Map(projectRegistry.map((project) => [String(project.project_id), project]));
  const normalized = chunks.map((chunk) => {
    const validProjectMatches = [];
    const unregisteredAnchors = [];
    for (const match of chunk.provisional_project_matches || []) {
      const registryProject = registryById.get(String(match.project_id || ""));
      if (!registryProject) {
        unregisteredAnchors.push(match);
        continue;
      }
      validProjectMatches.push({ project_id: registryProject.project_id, canonical_name: registryProject.canonical_name, confidence: Number(match.confidence) || 0, provisional: true });
    }
    return { ...chunk, validProjectMatches, unregisteredAnchors };
  });
  const sourceContexts = new Map();
  for (const chunk of normalized) {
    if (sourceContexts.has(chunk.file_version_id)) continue;
    const siblings = normalized.filter((item) => item.file_version_id === chunk.file_version_id);
    const totalCharacters = siblings.reduce((sum, item) => sum + item.complete_text.length, 0);
    const sampledText = totalCharacters <= 500000
      ? siblings.map((item) => item.complete_text).join("\n\n")
      : siblings.map((item) => item.complete_text.slice(0, 4000)).join("\n\n").slice(0, 500000);
    sourceContexts.set(chunk.file_version_id, {
      text: sampledText,
      sourceFilename: siblings.find((item) => item.provenance?.source_filename)?.provenance.source_filename || "",
      headings: [...new Set(siblings.flatMap((item) => item.provenance?.headings || []))],
      entities: [...new Set(siblings.flatMap((item) => item.provisional_entities.map((entity) => entity.value)))],
      localSummaries: siblings.flatMap((item) => item.provisional_local_summaries).slice(0, 500),
      projectMatches: siblings.flatMap((item) => item.validProjectMatches).slice(0, 500),
      unregisteredAnchors: siblings.flatMap((item) => item.unregisteredAnchors).slice(0, 500)
    });
  }
  return normalized.map((chunk) => {
    const sourceContext = sourceContexts.get(chunk.file_version_id);
    const profile = createProvisionalConceptProfile({
      text: chunk.complete_text,
      sourceFilename: chunk.provenance.source_filename,
      headings: chunk.provenance.headings,
      entities: chunk.provisional_entities.map((item) => item.value),
      localSummaries: chunk.provisional_local_summaries,
      projectMatches: chunk.validProjectMatches,
      unregisteredAnchors: chunk.unregisteredAnchors,
      sourceContext,
      registry: projectRegistry,
      generatedBy: chunk.provisional_local_summaries.length || chunk.provisional_project_matches.length ? "hybrid" : "rule_based"
    });
    return {
      chunk_id: chunk.chunk_id,
      sequence: chunk.sequence,
      source_id: chunk.source_id,
      file_version_id: chunk.file_version_id,
      provenance: chunk.provenance,
      text_sha256: chunk.text_sha256,
      complete_text: chunk.complete_text,
      ...(chunk.continuation_of_chunk_id ? { continuation_of_chunk_id: chunk.continuation_of_chunk_id } : {}),
      provisional_concept_profile: profile,
      provisional_local_summaries: chunk.provisional_local_summaries,
      provisional_entities: chunk.provisional_entities,
      provisional_project_matches: chunk.validProjectMatches,
      review_directive: chunk.review_directive
    };
  });
}

function annotateReviewPackContinuations(chunks = [], minimumCharacters = 500) {
  return chunks.map((chunk, index) => {
    const previous = chunks[index - 1];
    if (!previous || previous.file_version_id !== chunk.file_version_id || Number(previous.sequence) + 1 !== Number(chunk.sequence) || !looksLikeContinuationText(chunk.complete_text, previous.complete_text, minimumCharacters)) return chunk;
    return { ...chunk, continuation_of_chunk_id: previous.chunk_id };
  });
}

function inheritReviewPackContinuationProfiles(chunks = []) {
  const byId = new Map(chunks.map((chunk) => [chunk.chunk_id, chunk]));
  return chunks.map((chunk) => {
    if (!chunk.continuation_of_chunk_id) return chunk;
    const parent = byId.get(chunk.continuation_of_chunk_id);
    if (!parent?.provisional_concept_profile) return chunk;
    const inherited = cloneJson(parent.provisional_concept_profile);
    inherited.profile_confidence = Number(Math.max(0, inherited.profile_confidence * 0.75).toFixed(2));
    inherited.synthesis_reasoning_summary = `This small trailing section continues chunk ${parent.chunk_id}; its provisional concept profile is inherited with reduced confidence and remains fully overridable.`;
    return { ...chunk, provisional_concept_profile: inherited };
  });
}

function assertReviewPackConceptProfiles(chunks = []) {
  const missing = chunks.filter((chunk) => !chunk.provisional_concept_profile || typeof chunk.provisional_concept_profile.synthesis_reasoning_summary !== "string").map((chunk) => chunk.chunk_id);
  if (missing.length) throw new Error(`Universal review export stopped before serialization because provisional concept profiles were not populated for: ${missing.join(", ")}`);
}

function reviewPackInstructions(evidence) {
  return [
    "# Project State Universal AI Review Pack",
    "",
    "Review the complete evidence package and return JSON that validates against `schema/review_result.schema.json`.",
    "",
    "## Boundary rules",
    "",
    ...evidence.boundary_rules.map((rule) => `- ${rule}`),
    "",
    "## Required reasoning behavior",
    "",
    "- Read the complete package and account for every exported chunk before producing final decisions.",
    "- First create concept_clusters. Collapse exact/near duplicates and aliases, preserve contradictions, assign hierarchy and maturity, and retain every original chunk ID/provenance.",
    "- Generate decisions from concept_clusters only, never directly from isolated chunks.",
    "- The provisional_concept_profile is a synthesized starting hypothesis. Raw provisional_local_summaries, provisional_entities, and provisional_project_matches are supporting extraction signals only.",
    "- Do not create final decisions from the provisional profile alone. The reviewer must still perform package-wide clustering and final decisions must come from package-wide concept reconstruction.",
    "- Compare every chunk against every other chunk before using its provisional profile, and override any profile field when package-wide evidence disagrees. The reviewer may override every profile field.",
    "- Collapse exact and near duplicates before using estimated concept counts. Repeated chunks carrying the same provisional profile must not increase confidence.",
    "- Repeated duplicate text must not increase confidence merely because it appears more than once.",
    "- Return coverage_summary with complete_package_read=true, decisions_generated_from_clusters=true, duplicate_repetition_increased_confidence=false, and every exported chunk accounted for.",
    "- Before returning, complete final_self_check. Preserve every false value honestly; false means the review is incomplete and cannot be finally approved.",
    "- Prefer matching evidence to a project listed in `project_registry` before proposing a new project.",
    "- Return the exact project_id and canonical_name snapshot for every existing-project match.",
    "- Different wording, an alias, or a former name does not justify a new project.",
    "- One evidence item may support multiple projects and one chunk may support multiple decisions.",
    "- One document may contain several related or unrelated projects.",
    "- Filenames, assistant headings, thread names, and chunk boundaries are provenance only, not project boundaries.",
    "- Use stable IDs from `evidence.json`; never invent a chunk ID or existing project ID.",
    "- When no registry entry adequately matches, use the fully defined proposed_new_project object and explain why it is distinct.",
    "- External decisions are proposals, not Core truth.",
    "- Preserve uncertainty and set `human_review_required` to true.",
    "",
    `Package: \`${evidence.package_id}\` · revision ${evidence.pack_revision}`,
    `Work Order: \`${evidence.work_order_id}\``,
    `Discovery Case: \`${evidence.discovery_case_id}\``,
    `Evidence SHA-256: \`${evidence.evidence_sha256}\``
  ].join("\n");
}

function reviewPackReadableMarkdown(evidence) {
  const registryLines = evidence.project_registry.length
    ? evidence.project_registry.map((project) => `- \`${project.project_id}\` — **${project.canonical_name}** · ${project.status}${project.aliases.length ? ` · aliases: ${project.aliases.join(", ")}` : ""}${project.former_names.length ? ` · former names: ${project.former_names.join(", ")}` : ""}${project.parent_project_id ? ` · parent: ${project.parent_project_id}` : ""}${project.project_family ? ` · family: ${project.project_family}` : ""}${project.short_summary ? `\n  ${project.short_summary}` : ""}`)
    : ["_The current Project State project registry is empty; no known projects were available for matching at export time._"];
  const lines = [
    "# Project State Evidence",
    "",
    "> External review is non-authoritative. One document may contain multiple ideas; one chunk may support multiple decisions; evidence may support more than one project. Assistant headings and thread boundaries are provenance only. Every imported decision requires human review before Intake/Airlock and Core.",
    "",
    `- Package ID: \`${evidence.package_id}\``,
    `- Pack revision: ${evidence.pack_revision}`,
    `- Work Order ID: \`${evidence.work_order_id}\``,
    `- Discovery Case ID: \`${evidence.discovery_case_id}\``,
    `- Evidence SHA-256: \`${evidence.evidence_sha256}\``,
    `- Source complete: ${evidence.source_complete ? "yes" : "no"}`,
    `- Sources: ${evidence.source_counts.total} · complete: ${evidence.source_counts.complete} · truncated: ${evidence.source_counts.truncated}`,
    `- Chunks: ${evidence.chunk_counts.exported} of ${evidence.chunk_counts.detected} detected`,
    "",
    "## Mandatory Consolidation Protocol",
    "",
    `- Protocol: \`${evidence.review_protocol.id}\` v${evidence.review_protocol.version}`,
    `- Complete package required: ${evidence.review_protocol.complete_package_required ? "yes" : "no"}`,
    `- Decision source: ${evidence.review_protocol.decision_source}`,
    `- Duplicate confidence rule: ${evidence.review_protocol.duplicate_repetition_increases_confidence ? "duplicates may increase confidence" : "duplicate repetition must not increase confidence"}`,
    `- Human authority: ${evidence.review_protocol.human_authoritative ? "required" : "not recorded"}`,
    `- Final self-check required: ${evidence.review_protocol.final_self_check_required ? "yes" : "no"}`,
    "- Required sequence: read all chunks → build concept clusters → account for coverage → produce cluster-linked decisions → human review.",
    "",
    "## Current Project Registry",
    "",
    ...registryLines,
    "",
    "## Complete evidence chunks",
    ""
  ];
  for (const chunk of evidence.chunks) {
    lines.push(`### Chunk \`${chunk.chunk_id}\``);
    lines.push("");
    lines.push(`Source: \`${chunk.source_id}\` · File version: \`${chunk.file_version_id}\` · Sequence: ${chunk.sequence}`);
    if (chunk.provenance?.source_filename) lines.push(`Filename provenance: ${chunk.provenance.source_filename}`);
    if (chunk.provenance?.headings?.length) lines.push(`Heading provenance: ${chunk.provenance.headings.join(" | ")}`);
    if (chunk.continuation_of_chunk_id) lines.push(`Continuation of chunk: \`${chunk.continuation_of_chunk_id}\``);
    const profile = chunk.provisional_concept_profile;
    lines.push("");
    lines.push("**Provisional concept profile**");
    lines.push(`- Primary concept: ${profile.primary_concept || "unresolved"}`);
    lines.push(`- Secondary concepts: ${profile.secondary_concepts.length ? profile.secondary_concepts.join(", ") : "none identified"}`);
    lines.push(`- Estimated distinct concepts: ${profile.estimated_concept_count}`);
    lines.push(`- Likely hierarchy: ${profile.likely_hierarchy_level}`);
    lines.push(`- Likely maturity: ${profile.likely_maturity}`);
    lines.push(`- Likely relationships: ${profile.likely_relationships.length ? profile.likely_relationships.map((item) => `${item.relationship_type} ${item.target_name} (${Math.round(item.confidence * 100)}%) — ${item.reasoning_summary}`).join("; ") : "none identified"}`);
    lines.push(`- Confidence: ${Math.round(profile.profile_confidence * 100)}%`);
    lines.push(`- Generated by: ${profile.generated_by}`);
    lines.push(`- Reviewer may override: ${profile.reviewer_may_override ? "yes" : "no"}`);
    lines.push(`- Synthesis reasoning: ${profile.synthesis_reasoning_summary}`);
    lines.push("");
    lines.push("**Raw provisional extraction signals**");
    lines.push(`- Provisional local summaries: ${chunk.provisional_local_summaries?.length ? chunk.provisional_local_summaries.map((item) => item.summary || item.title).filter(Boolean).join(" | ") : "none"}`);
    lines.push(`- Provisional entities: ${chunk.provisional_entities?.length ? chunk.provisional_entities.map((item) => item.value).filter(Boolean).join(" | ") : "none"}`);
    lines.push(`- Provisional project matches: ${chunk.provisional_project_matches?.length ? chunk.provisional_project_matches.map((item) => `${item.canonical_name} (${item.project_id})`).join(" | ") : "none"}`);
    lines.push(`Review directive: compare against all chunks: ${chunk.review_directive.compare_against_all_chunks ? "yes" : "no"} · cluster before decision: ${chunk.review_directive.cluster_before_decision ? "yes" : "no"} · may support multiple concepts: ${chunk.review_directive.may_support_multiple_concepts ? "yes" : "no"}`);
    lines.push("");
    lines.push("```text");
    lines.push(chunk.complete_text);
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

function crc32Buffer(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCompressedZip(entries = []) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(String(entry.name || "entry.txt").replaceAll("\\", "/"), "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data || ""), "utf8");
    const crc = crc32Buffer(data);
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralOffset = offset;
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function listZipEntries(bytes) {
  const buffer = Buffer.from(bytes);
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i -= 1) {
    if (readUint32(buffer, i) !== 0x06054b50) continue;
    const entryCount = readUint16(buffer, i + 10);
    if (entryCount > 200) throw new Error("External review ZIP contains too many entries.");
    let offset = readUint32(buffer, i + 16);
    const entries = [];
    for (let index = 0; index < entryCount; index += 1) {
      if (readUint32(buffer, offset) !== 0x02014b50) throw new Error("External review ZIP directory is invalid.");
      const method = readUint16(buffer, offset + 10);
      const compressedSize = readUint32(buffer, offset + 20);
      const uncompressedSize = readUint32(buffer, offset + 24);
      const nameLength = readUint16(buffer, offset + 28);
      const extraLength = readUint16(buffer, offset + 30);
      const commentLength = readUint16(buffer, offset + 32);
      const localHeaderOffset = readUint32(buffer, offset + 42);
      const name = buffer.slice(offset + 46, offset + 46 + nameLength).toString("utf8");
      if (uncompressedSize > 100 * 1024 * 1024) throw new Error(`External review ZIP entry is too large: ${name}`);
      entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  }
  throw new Error("External review ZIP has no readable directory.");
}

function readNamedZipEntry(bytes, entry) {
  const data = inflateZipEntry(Buffer.from(bytes), entry);
  if (entry.uncompressedSize && data.length !== entry.uncompressedSize) throw new Error(`External review ZIP entry size mismatch: ${entry.name}`);
  return Buffer.from(data);
}

async function createUniversalReviewPack({ storageRoot, dbPath, payload = {} }) {
  const progress = (phase, completed, total, detail = "") => { try { payload.onProgress?.({ phase, completed, total, percent: total ? Math.round((completed / total) * 100) : 0, detail }); } catch {} };
  progress("preparing", 0, 1, "Loading Discovery evidence");
  await ensureSpine(storageRoot);
  const workOrder = cloneJson(payload.workOrder || {});
  const workOrderId = requiredDiscoveryId(workOrder.id || payload.workOrderId, "Work Order ID");
  const discoveryCaseId = requiredDiscoveryId(workOrder.source?.discoveryCaseId || payload.discoveryCaseId, "Discovery Case ID");
  const packageId = payload.packageId || makeId("review_package");
  const createdAt = payload.exportedAt || nowIso();
  const revisionDb = openDatabase(dbPath);
  let packRevision;
  try { packRevision = Number(revisionDb.prepare("SELECT COALESCE(MAX(pack_revision), 0) AS revision FROM review_export_packages WHERE work_order_id = ?").get(workOrderId).revision || 0) + 1; }
  finally { revisionDb.close(); }
  const caseView = await getDiscoveryCase({ storageRoot, dbPath, payload: { discoveryCaseId } });
  const extractionById = new Map(caseView.extractions.map((item) => [item.id, item]));
  const versionById = new Map(caseView.fileVersions.map((item) => [item.id, item]));
  let chunks = [];
  const orderedChunks = [...caseView.chunks].sort((a, b) => String(a.discoveryExtractionId).localeCompare(String(b.discoveryExtractionId)) || Number(a.chunkIndex) - Number(b.chunkIndex));
  let completedChunks = 0;
  for (const chunk of orderedChunks) {    const read = await readDiscoveryChunkText({ storageRoot, dbPath, payload: { discoveryChunkId: chunk.id } });
    const extraction = extractionById.get(chunk.discoveryExtractionId) || {};
    const version = versionById.get(extraction.fileVersionId) || {};
    chunks.push({
      chunk_id: chunk.id,
      sequence: Number(chunk.chunkIndex || 0),
      source_id: version.fileAssetId || extraction.fileAssetId || "",
      file_version_id: extraction.fileVersionId || "",
      provenance: { extraction_id: extraction.id || "", source_filename: version.originalName || "", headings: reviewPackHeadings(read.text) },
      text_sha256: chunk.textSha256,
      complete_text: read.text,
      provisional_local_summaries: (workOrder.candidateMap?.entries || []).filter((entry) => (entry.evidence || []).some((item) => item.discoveryChunkId === chunk.id)).map((entry) => ({ candidate_map_id: entry.id, title: entry.title, summary: entry.neutralSummary || entry.summary || "", classification: entry.projectStateClassification || "", provisional: true })).slice(0, 50),
      provisional_entities: reviewPackEntities(read.text).map((value) => ({ value, provisional: true })),
      provisional_project_matches: (workOrder.candidateMap?.entries || []).filter((entry) => (entry.evidence || []).some((item) => item.discoveryChunkId === chunk.id)).flatMap((entry) => entry.knownProjectMatches || []).map((match) => ({ project_id: match.projectId, canonical_name: match.name, confidence: match.confidence, provisional: true })).slice(0, 50),
      review_directive: {
        action: "cluster_before_decision",
        review_in_isolation: false,
        compare_against_all_chunks: true,
        cluster_before_decision: true,
        may_be_duplicate: true,
        may_support_multiple_concepts: true,
        must_receive_final_disposition: true,
        read_with_complete_package: true,
        collapse_exact_and_near_duplicates: true,
        merge_aliases_and_alternate_names: true,
        preserve_genuine_contradictions: true,
        assign_hierarchy_and_maturity: true,
        preserve_chunk_id_and_provenance: true,
        duplicate_repetition_increases_confidence: false
      }
    });
    completedChunks += 1;
    if (completedChunks === orderedChunks.length || completedChunks % 10 === 0) progress("reading", completedChunks, orderedChunks.length, `Reading evidence chunk ${completedChunks} of ${orderedChunks.length}`);
  }
  if (!chunks.length) throw new Error("Universal review export requires extracted or indexed Discovery chunks.");
  const sourceManifest = caseView.fileVersions.map((version) => {
    const extractions = caseView.extractions.filter((item) => item.fileVersionId === version.id);
    const truncated = extractions.some((item) => item.status === "large_corpus_pending") && workOrder.lastAnalysis?.sourceFullyAnalyzed !== true;
    return {
      source_id: version.fileAssetId, file_version_id: version.id, original_filename: version.originalName, sha256: version.sha256, byte_size: version.byteSize,
      extraction_ids: extractions.map((item) => item.id), extraction_statuses: extractions.map((item) => item.status), chunk_ids: chunks.filter((item) => item.file_version_id === version.id).map((item) => item.chunk_id),
      complete: !truncated, truncated
    };
  });
  const registryProjects = currentReviewRegistryProjects(dbPath, payload.knownProjects || []);
  const projectRegistry = reviewPackProjectRegistry(registryProjects, { includePrivateProjects: payload.includePrivateProjects === true });
  chunks = annotateReviewPackContinuations(chunks, payload.continuationMinimumCharacters);
  chunks = populateReviewPackConceptProfiles(chunks, projectRegistry);
  chunks = inheritReviewPackContinuationProfiles(chunks);
  assertReviewPackConceptProfiles(chunks);
  const sourceComplete = sourceManifest.every((source) => source.complete);
  const packageVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version || "unknown";
  const evidenceWithoutHash = {
    package_id: packageId,
    work_order_id: workOrderId,
    discovery_case_id: discoveryCaseId,
    pack_revision: packRevision,
    created_at: createdAt,
    project_state_version: packageVersion,
    format: "project-state-review-pack",
    format_version: "1.0",
    review_protocol: {
      id: "project-state-model-neutral-consolidated-review",
      version: "1.1",
      model_neutral: true,
      human_authoritative: true,
      complete_package_required: true,
      decision_source: "concept_clusters",
      coverage_required: true,
      preserve_original_chunk_ids_and_provenance: true,
      duplicate_repetition_increases_confidence: false,
      approval_requires_zero_unaccounted_chunks: true,
      final_self_check_required: true
    },
    review_protocol_version: "1.1",
    source_complete: sourceComplete,
    source_counts: { total: sourceManifest.length, complete: sourceManifest.filter((source) => source.complete).length, truncated: sourceManifest.filter((source) => source.truncated).length },
    source_manifest: sourceManifest,
    chunk_counts: { exported: chunks.length, detected: Number(workOrder.lastAnalysis?.totalDetectedChunks || chunks.length), omitted: 0, truncated_sources: sourceManifest.filter((source) => source.truncated).length },
    chunks,
    project_registry: projectRegistry,
    boundary_rules: ["External review decisions are non-authoritative proposals.", "No imported result may write directly to Core.", "Human Intake/Airlock approval is required.", "Chat/thread starts and assistant headings are provenance only.", "Stable IDs, not filenames or headings, control evidence linkage.", "One chunk may support multiple decisions and projects."],
    allowed_classifications: EXTERNAL_REVIEW_CLASSIFICATIONS,
    allowed_evidence_roles: EXTERNAL_REVIEW_EVIDENCE_ROLES,
    local_analysis: { candidate_map_preserved: true, candidate_map_entry_count: Number(workOrder.candidateMap?.entries?.length || 0), local_ai_runs_preserved: true }
  };
  const evidenceSha256 = crypto.createHash("sha256").update(JSON.stringify(evidenceWithoutHash)).digest("hex");
  const evidence = { ...evidenceWithoutHash, evidence_sha256: evidenceSha256 };
  assertReviewPackConceptProfiles(evidence.chunks);
  const resultSchema = fs.readFileSync(REVIEW_RESULT_SCHEMA_FILE, "utf8");
  const packName = safeFileName(`${workOrder.title || workOrderId}.universal-ai-review-pack-${safeStamp()}.zip`);
  const requestedOutputDirectory = String(payload.outputDirectory || "").trim();
  const outputDirectory = requestedOutputDirectory ? path.resolve(requestedOutputDirectory) : path.join(storageRoot, "backups");
  const outputDirectoryStat = await fsp.stat(outputDirectory).catch(() => null);
  if (!outputDirectoryStat?.isDirectory()) throw new Error("The selected Review Exchange output folder is unavailable.");
  const packPath = path.join(outputDirectory, packName);
  progress("compressing", 0, 1, "Compressing the review package");
  const zip = createCompressedZip([
    { name: "review_instructions.md", data: reviewPackInstructions(evidence) },
    { name: "evidence.json", data: JSON.stringify(evidence, null, 2) },
    { name: "evidence_readable.md", data: reviewPackReadableMarkdown(evidence) },
    { name: "schema/review_result.schema.json", data: resultSchema }
  ]);
  progress("writing", 0, 1, "Writing the ZIP file");
  await fsp.writeFile(packPath, zip);
  const managedRelativePath = relativeManagedPath(storageRoot, packPath);
  const insideManagedStorage = managedRelativePath !== ".." && !managedRelativePath.startsWith(`..${path.sep}`) && !managedRelativePath.startsWith("../");
  const record = { id: packageId, packageId, workOrderId, discoveryCaseId, packRevision, createdAt, projectStateVersion: packageVersion, format: evidence.format, formatVersion: evidence.format_version, reviewProtocol: evidence.review_protocol.id, reviewProtocolVersion: evidence.review_protocol.version, evidenceSha256, sourceComplete, projectRegistry: cloneJson(projectRegistry), chunkIds: chunks.map((chunk) => chunk.chunk_id), sourceIds: sourceManifest.map((source) => source.source_id), exportFileName: packName, exportPath: insideManagedStorage ? managedRelativePath : "", externalExportPath: insideManagedStorage ? "" : packPath, includePrivateProjects: payload.includePrivateProjects === true };
  const packageDb = openDatabase(dbPath);
  try { insertStrict(packageDb, "review_export_packages", { id: packageId, work_order_id: workOrderId, discovery_case_id: discoveryCaseId, pack_revision: packRevision, evidence_sha256: evidenceSha256, created_at: createdAt, record_json: JSON.stringify(record) }); }
  catch (error) { await fsp.rm(packPath, { force: true }); throw error; }
  finally { packageDb.close(); }
  progress("complete", 1, 1, "Review ZIP ready");
  return { ok: true, packageId, packRevision, evidenceSha256, format: evidence.format, formatVersion: evidence.format_version, workOrderId, discoveryCaseId, sourceComplete, path: packPath, fileName: packName, sha256: crypto.createHash("sha256").update(zip).digest("hex"), bytes: zip.length, chunkCount: chunks.length, sourceCount: sourceManifest.length };
}

function projectFinalReviewInstructions(target = "human") {
  return [
    "# Project State Core Final Review",
    "",
    `Reviewer route: **${target === "ai" ? "External AI" : "Human"}**`,
    "",
    "Read project_brief.md and project_brief.json completely. Produce a detailed advisory review; do not silently rewrite Core.",
    "",
    "Check specifically for:",
    "- exact and near-duplicate statements, decisions, work, and source claims;",
    "- contradictions or incompatible claims;",
    "- missing, unanswered, or implied questions;",
    "- missing facts, sources, provenance, owners, dates, or next actions;",
    "- stale, uncertain, or weakly supported material;",
    "- material that belongs in another project;",
    "- unclear status, completion criteria, or dependencies.",
    "",
    "Return a concise executive summary, then findings grouped by category. For every finding include severity, evidence, and a recommended human action. Mark the result advisory and human_review_required=true."
  ].join("\n");
}

async function createProjectFinalReviewPack({ storageRoot, payload = {} }) {
  const progress = (phase, completed, total, detail = "") => { try { payload.onProgress?.({ phase, completed, total, percent: total ? Math.round((completed / total) * 100) : 0, detail }); } catch {} };
  const brief = cloneJson(payload.brief || {});
  if (!brief.project?.id && !brief.projectId) throw new Error("Core project review export requires a project brief.");
  const projectName = brief.project?.name || brief.projectName || "Core Project";
  const outputDirectory = path.resolve(String(payload.outputDirectory || "").trim() || path.join(storageRoot, "backups"));
  const outputDirectoryStat = await fsp.stat(outputDirectory).catch(() => null);
  if (!outputDirectoryStat?.isDirectory()) throw new Error("The selected final-review output folder is unavailable.");
  progress("preparing", 0, 1, "Preparing the detailed Core project brief");
  const markdown = String(payload.briefMarkdown || "").trim() || `# ${projectName}\n\n${brief.project?.summary || "No summary recorded."}` ;
  const target = payload.reviewerTarget === "ai" ? "ai" : "human";
  const responseTemplate = { advisory: true, human_review_required: true, executive_summary: "", completeness_assessment: "", duplicates: [], contradictions: [], missing_questions: [], gaps: [], provenance_gaps: [], stale_or_uncertain: [], recommendations: [] };
  progress("compressing", 0, 1, "Compressing final-review package");
  const zip = createCompressedZip([
    { name: "REVIEW_INSTRUCTIONS.md", data: projectFinalReviewInstructions(target) },
    { name: "project_brief.md", data: markdown },
    { name: "project_brief.json", data: JSON.stringify(brief, null, 2) },
    { name: "review_response_template.json", data: JSON.stringify(responseTemplate, null, 2) }
  ]);
  const fileName = safeFileName(`${projectName}.core-final-review-${target}-${safeStamp()}.zip`);
  const packPath = path.join(outputDirectory, fileName);
  progress("writing", 0, 1, "Writing the final-review ZIP file");
  await fsp.writeFile(packPath, zip);
  progress("complete", 1, 1, "Final-review ZIP ready");
  return { ok: true, path: packPath, fileName, bytes: zip.length, sha256: crypto.createHash("sha256").update(zip).digest("hex"), reviewerTarget: target, projectId: brief.project?.id || brief.projectId };
}

function externalReviewChunkReferences(value = {}) {
  return [...new Set([...(value.supporting_chunk_ids || []), ...(value.evidence_spans || []).map((span) => span?.chunk_id), ...(value.supportingChunkIds || [])].map(String).filter(Boolean))];
}

function externalReviewUnexpectedKeys(value, allowed, prefix, errors) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value)) if (!allowed.has(key)) errors.push(`${prefix}.${key} is not supported by this review protocol.`);
}

function externalReviewHasDirectCoreInstruction(value, trail = "result") {
  if (!value || typeof value !== "object") return "";
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:execute|command|script|write_core|create_core|approve_core|direct_core_instruction|automatic_project_creation)$/i.test(key)) return `${trail}.${key}`;
    const found = externalReviewHasDirectCoreInstruction(child, `${trail}.${key}`);
    if (found) return found;
  }
  return "";
}

function validateExternalProjectMatch(match, prefix, projectSnapshotById, currentProjectIds, errors) {
  if (!match || typeof match !== "object" || Array.isArray(match)) { errors.push(`${prefix} must be a project match object or null.`); return; }
  externalReviewUnexpectedKeys(match, new Set(["project_id", "canonical_name"]), prefix, errors);
  const id = String(match.project_id || "");
  if (!id || !currentProjectIds.has(id)) errors.push(`${prefix}.project_id is not a known existing project.`);
  const snapshot = projectSnapshotById.get(id);
  if (!snapshot) errors.push(`${prefix}.project_id was not present in the exported project registry.`);
  else if (String(match.canonical_name || "") !== String(snapshot.canonical_name || "")) errors.push(`${prefix}.canonical_name does not match the exported project registry snapshot for ${id}.`);
}

function validateExternalReviewResult({ result, expectedPackage, chunkIds, chunkTextById, projectSnapshotById, currentProjectIds }) {
  const errors = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) errors.push("Result must be one JSON object.");
  externalReviewUnexpectedKeys(result, new Set(["format", "format_version", "package_id", "work_order_id", "discovery_case_id", "pack_revision", "evidence_sha256", "reviewer", "source_complete", "concept_clusters", "coverage_summary", "final_self_check", "decisions", "relationships", "human_questions", "rejected_material"]), "result", errors);
  if (result?.format !== "project-state-review-result") errors.push("format must be project-state-review-result.");
  if (result?.format_version !== "1.0") errors.push("format_version must be 1.0.");
  for (const [field, expected] of [["package_id", expectedPackage.packageId], ["work_order_id", expectedPackage.workOrderId], ["discovery_case_id", expectedPackage.discoveryCaseId], ["pack_revision", expectedPackage.packRevision], ["evidence_sha256", expectedPackage.evidenceSha256]]) if (result?.[field] !== expected) errors.push(`${field} must match the source export (${expected}).`);
  if (!result?.reviewer || typeof result.reviewer !== "object" || !["ai", "human", "hybrid"].includes(result.reviewer.reviewer_type)) errors.push("reviewer.reviewer_type must be ai, human, or hybrid.");
  externalReviewUnexpectedKeys(result?.reviewer, new Set(["reviewer_type", "provider", "model", "name", "reviewed_at"]), "reviewer", errors);
  if (typeof result?.source_complete !== "boolean") errors.push("source_complete must be true or false.");
  else if (result.source_complete !== expectedPackage.sourceComplete) errors.push(`source_complete must match the source export (${expectedPackage.sourceComplete}).`);
  for (const field of ["concept_clusters", "decisions", "relationships", "human_questions", "rejected_material"]) if (!Array.isArray(result?.[field])) errors.push(`${field} must be an array.`);
  const clusterIds = new Set();
  const clusterChunkIdsById = new Map();
  const clusterAccountedChunkIds = new Set();
  for (const [index, cluster] of (result?.concept_clusters || []).entries()) {
    const prefix = `concept_clusters[${index}]`;
    externalReviewUnexpectedKeys(cluster, new Set(["cluster_id", "concept_title", "summary", "aliases", "hierarchy_type", "parent_cluster_id", "maturity", "primary_chunk_ids", "duplicate_chunk_ids", "contextual_chunk_ids", "contradictory_chunk_ids", "unresolved_chunk_ids", "confidence", "confidence_basis"]), prefix, errors);
    if (!String(cluster?.cluster_id || "").trim() || clusterIds.has(cluster.cluster_id)) errors.push(`${prefix}.cluster_id must be present and unique.`); else clusterIds.add(cluster.cluster_id);
    for (const field of ["concept_title", "summary", "confidence_basis"]) if (typeof cluster?.[field] !== "string" || !cluster[field].trim()) errors.push(`${prefix}.${field} is required.`);
    if (!EXTERNAL_REVIEW_HIERARCHY_TYPES.includes(cluster?.hierarchy_type)) errors.push(`${prefix}.hierarchy_type is not allowed.`);
    if (!EXTERNAL_REVIEW_MATURITY.includes(cluster?.maturity)) errors.push(`${prefix}.maturity is not allowed.`);
    if (!("parent_cluster_id" in (cluster || {}))) errors.push(`${prefix}.parent_cluster_id must be present (null is allowed).`);
    if (!Array.isArray(cluster?.aliases)) errors.push(`${prefix}.aliases must be an array.`);
    for (const field of ["primary_chunk_ids", "duplicate_chunk_ids", "contextual_chunk_ids", "contradictory_chunk_ids", "unresolved_chunk_ids"]) {
      if (!Array.isArray(cluster?.[field])) errors.push(`${prefix}.${field} must be an array.`);
      for (const id of cluster?.[field] || []) {
        if (!chunkIds.has(id)) errors.push(`${prefix}.${field} references unknown chunk ID ${id}.`);
        else clusterAccountedChunkIds.add(id);
      }
    }
    if (cluster?.cluster_id) clusterChunkIdsById.set(cluster.cluster_id, new Set([...(cluster.primary_chunk_ids || []), ...(cluster.duplicate_chunk_ids || []), ...(cluster.contextual_chunk_ids || []), ...(cluster.contradictory_chunk_ids || []), ...(cluster.unresolved_chunk_ids || [])]));
    if (!(cluster?.primary_chunk_ids || []).length) errors.push(`${prefix}.primary_chunk_ids must contain at least one chunk.`);
    if (typeof cluster?.confidence !== "number" || cluster.confidence < 0 || cluster.confidence > 1) errors.push(`${prefix}.confidence must be between 0 and 1.`);
  }
  for (const [index, cluster] of (result?.concept_clusters || []).entries()) if (cluster?.parent_cluster_id && !clusterIds.has(cluster.parent_cluster_id)) errors.push(`concept_clusters[${index}].parent_cluster_id references unknown cluster ID ${cluster.parent_cluster_id}.`);
  const coverage = result?.coverage_summary;
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) errors.push("coverage_summary must be an object.");
  externalReviewUnexpectedKeys(coverage, new Set(["exported_chunk_count", "accounted_chunk_count", "complete_package_read", "decisions_generated_from_clusters", "duplicate_repetition_increased_confidence", "duplicate_groups", "contradiction_chunk_ids", "rejected_chunk_ids", "unresolved_chunk_ids", "unaccounted_chunks"]), "coverage_summary", errors);
  for (const field of ["duplicate_groups", "contradiction_chunk_ids", "rejected_chunk_ids", "unresolved_chunk_ids", "unaccounted_chunks"]) if (!Array.isArray(coverage?.[field])) errors.push(`coverage_summary.${field} must be an array.`);
  if (coverage?.complete_package_read !== true) errors.push("coverage_summary.complete_package_read must be true.");
  if (coverage?.decisions_generated_from_clusters !== true) errors.push("coverage_summary.decisions_generated_from_clusters must be true.");
  if (coverage?.duplicate_repetition_increased_confidence !== false) errors.push("coverage_summary.duplicate_repetition_increased_confidence must be false.");
  for (const [index, group] of (coverage?.duplicate_groups || []).entries()) {
    externalReviewUnexpectedKeys(group, new Set(["group_id", "canonical_chunk_id", "duplicate_chunk_ids", "near_duplicate", "rationale"]), `coverage_summary.duplicate_groups[${index}]`, errors);
    if (!String(group?.group_id || "").trim()) errors.push(`coverage_summary.duplicate_groups[${index}].group_id is required.`);
    if (!chunkIds.has(group?.canonical_chunk_id)) errors.push(`coverage_summary.duplicate_groups[${index}].canonical_chunk_id is unknown.`); else clusterAccountedChunkIds.add(group.canonical_chunk_id);
    if (!Array.isArray(group?.duplicate_chunk_ids) || !group.duplicate_chunk_ids.length) errors.push(`coverage_summary.duplicate_groups[${index}].duplicate_chunk_ids must contain duplicates.`);
    for (const id of group?.duplicate_chunk_ids || []) { if (!chunkIds.has(id)) errors.push(`coverage_summary.duplicate_groups[${index}] references unknown duplicate chunk ID ${id}.`); else clusterAccountedChunkIds.add(id); }
    if (typeof group?.near_duplicate !== "boolean" || typeof group?.rationale !== "string") errors.push(`coverage_summary.duplicate_groups[${index}] requires near_duplicate and rationale.`);
  }
  for (const field of ["contradiction_chunk_ids", "rejected_chunk_ids", "unresolved_chunk_ids"]) for (const id of coverage?.[field] || []) { if (!chunkIds.has(id)) errors.push(`coverage_summary.${field} references unknown chunk ID ${id}.`); else clusterAccountedChunkIds.add(id); }
  for (const rejected of result?.rejected_material || []) for (const id of rejected?.supporting_chunk_ids || []) if (chunkIds.has(id)) clusterAccountedChunkIds.add(id);
  const actualUnaccounted = [...chunkIds].filter((id) => !clusterAccountedChunkIds.has(id)).sort();
  const declaredUnaccounted = [...new Set((coverage?.unaccounted_chunks || []).map(String))].sort();
  if (JSON.stringify(actualUnaccounted) !== JSON.stringify(declaredUnaccounted)) errors.push(`coverage_summary.unaccounted_chunks must exactly list every unaccounted exported chunk (${actualUnaccounted.join(", ") || "none"}).`);
  if (coverage?.exported_chunk_count !== chunkIds.size) errors.push(`coverage_summary.exported_chunk_count must equal ${chunkIds.size}.`);
  if (coverage?.accounted_chunk_count !== chunkIds.size - actualUnaccounted.length) errors.push(`coverage_summary.accounted_chunk_count must equal ${chunkIds.size - actualUnaccounted.length}.`);
  const finalSelfCheck = result?.final_self_check;
  const finalSelfCheckFields = ["concepts_reconstructed", "duplicates_did_not_inflate_confidence", "all_chunks_accounted_for", "hierarchy_distinguished", "contradictions_preserved", "recommendations_explained", "decisions_generated_from_clusters"];
  if (!finalSelfCheck || typeof finalSelfCheck !== "object" || Array.isArray(finalSelfCheck)) errors.push("final_self_check must be an object.");
  externalReviewUnexpectedKeys(finalSelfCheck, new Set(finalSelfCheckFields), "final_self_check", errors);
  for (const field of finalSelfCheckFields) if (typeof finalSelfCheck?.[field] !== "boolean") errors.push(`final_self_check.${field} must be boolean.`);
  if (finalSelfCheck?.all_chunks_accounted_for === true && actualUnaccounted.length) errors.push("final_self_check.all_chunks_accounted_for cannot be true while coverage_summary.unaccounted_chunks is non-empty.");
  const decisionIds = new Set();
  for (const [index, decision] of (result?.decisions || []).entries()) {
    const prefix = `decisions[${index}]`;
    if (!decision?.decision_id || decisionIds.has(decision.decision_id)) errors.push(`${prefix}.decision_id must be present and unique.`); else decisionIds.add(decision.decision_id);
    if (!String(decision?.concept_title || "").trim()) errors.push(`${prefix}.concept_title is required.`);
    if (typeof decision?.summary !== "string") errors.push(`${prefix}.summary must be a string.`);
    if (typeof decision?.reasoning_summary !== "string") errors.push(`${prefix}.reasoning_summary must be a string.`);
    externalReviewUnexpectedKeys(decision, new Set(["decision_id", "cluster_id", "concept_title", "classification", "primary_project", "additional_projects", "proposed_new_project", "summary", "supporting_chunk_ids", "evidence_spans", "confidence", "reasoning_summary", "evidence_role", "personal_aether_support", "commercial_default_allowed", "requires_separate_design_review", "human_review_required"]), prefix, errors);
    if (!clusterIds.has(decision?.cluster_id)) errors.push(`${prefix}.cluster_id must reference a concept cluster.`);
    if (!EXTERNAL_REVIEW_CLASSIFICATIONS.includes(decision?.classification)) errors.push(`${prefix}.classification is not allowed.`);
    if (decision?.primary_project !== null) validateExternalProjectMatch(decision?.primary_project, `${prefix}.primary_project`, projectSnapshotById, currentProjectIds, errors);
    if (!Array.isArray(decision?.additional_projects)) errors.push(`${prefix}.additional_projects must be an array.`);
    for (const [matchIndex, match] of (decision?.additional_projects || []).entries()) validateExternalProjectMatch(match, `${prefix}.additional_projects[${matchIndex}]`, projectSnapshotById, currentProjectIds, errors);
    const matchedIds = [decision?.primary_project?.project_id, ...(decision?.additional_projects || []).map((match) => match?.project_id)].filter(Boolean);
    if (new Set(matchedIds).size !== matchedIds.length) errors.push(`${prefix} contains duplicate existing-project matches.`);
    if (decision?.classification === "project_candidate" && !decision?.proposed_new_project) errors.push(`${prefix} must explicitly include proposed_new_project.`);
    if (decision?.classification === "project_candidate" && decision?.primary_project) errors.push(`${prefix} cannot use an existing project as primary_project; use existing_project_support instead.`);
    if (decision?.classification === "existing_project_support" && !matchedIds.length) errors.push(`${prefix} requires at least one known project match.`);
    if (decision?.proposed_new_project) {
      const proposed = decision.proposed_new_project;
      externalReviewUnexpectedKeys(proposed, new Set(["suggested_name", "suggested_aliases", "short_summary", "supporting_chunk_ids", "reason_distinct_from_existing_projects", "related_existing_project_ids", "proposed_parent_project_id", "project_family", "confidence"]), `${prefix}.proposed_new_project`, errors);
      for (const field of ["suggested_name", "reason_distinct_from_existing_projects"]) if (!String(proposed[field] || "").trim()) errors.push(`${prefix}.proposed_new_project.${field} is required.`);
      for (const field of ["suggested_aliases", "supporting_chunk_ids", "related_existing_project_ids"]) if (!Array.isArray(proposed[field])) errors.push(`${prefix}.proposed_new_project.${field} must be an array.`);
      if (typeof proposed.short_summary !== "string") errors.push(`${prefix}.proposed_new_project.short_summary must be a string.`);
      if (!("proposed_parent_project_id" in proposed)) errors.push(`${prefix}.proposed_new_project.proposed_parent_project_id must be present (null is allowed).`);
      for (const id of proposed.supporting_chunk_ids || []) if (!chunkIds.has(id)) errors.push(`${prefix}.proposed_new_project references unknown chunk ID ${id}.`);
      for (const id of proposed.related_existing_project_ids || []) if (!currentProjectIds.has(id) || !projectSnapshotById.has(id)) errors.push(`${prefix}.proposed_new_project references unknown or unexported related project ID ${id}.`);
      if (proposed.proposed_parent_project_id && (!currentProjectIds.has(proposed.proposed_parent_project_id) || !projectSnapshotById.has(proposed.proposed_parent_project_id))) errors.push(`${prefix}.proposed_new_project.proposed_parent_project_id is unknown or was not exported.`);
      if (typeof proposed.confidence !== "number" || proposed.confidence < 0 || proposed.confidence > 1) errors.push(`${prefix}.proposed_new_project.confidence must be between 0 and 1.`);
    }
    if (!Array.isArray(decision?.supporting_chunk_ids) || !decision.supporting_chunk_ids.length) errors.push(`${prefix}.supporting_chunk_ids must contain evidence.`);
    for (const id of decision?.supporting_chunk_ids || []) if (clusterChunkIdsById.has(decision?.cluster_id) && !clusterChunkIdsById.get(decision.cluster_id).has(id)) errors.push(`${prefix}.supporting_chunk_ids includes ${id}, which is not part of its concept cluster.`);
    if (new Set(decision?.supporting_chunk_ids || []).size !== (decision?.supporting_chunk_ids || []).length) errors.push(`${prefix}.supporting_chunk_ids must not contain duplicates.`);
    for (const id of externalReviewChunkReferences(decision)) if (!chunkIds.has(id)) errors.push(`${prefix} references unknown chunk ID ${id}.`);
    if (!Array.isArray(decision?.evidence_spans)) errors.push(`${prefix}.evidence_spans must be an array.`);
    for (const [spanIndex, span] of (decision?.evidence_spans || []).entries()) {
      externalReviewUnexpectedKeys(span, new Set(["chunk_id", "start", "end", "excerpt"]), `${prefix}.evidence_spans[${spanIndex}]`, errors);
      if (!String(span?.chunk_id || "")) errors.push(`${prefix}.evidence_spans[${spanIndex}].chunk_id is required.`);
      if (typeof span?.excerpt !== "string") errors.push(`${prefix}.evidence_spans[${spanIndex}].excerpt must be a string.`);
      if (span?.start !== undefined && (!Number.isInteger(span.start) || span.start < 0)) errors.push(`${prefix}.evidence_spans[${spanIndex}].start is invalid.`);
      if (span?.end !== undefined && (!Number.isInteger(span.end) || span.end < 0 || (Number.isInteger(span.start) && span.end < span.start))) errors.push(`${prefix}.evidence_spans[${spanIndex}].end is invalid.`);
      const sourceText = chunkTextById.get(span?.chunk_id) || "";
      if (Number.isInteger(span?.start) && Number.isInteger(span?.end) && span.end > sourceText.length) errors.push(`${prefix}.evidence_spans[${spanIndex}].end exceeds the stored chunk text.`);
      if (sourceText && Number.isInteger(span?.start) && Number.isInteger(span?.end) && typeof span?.excerpt === "string" && sourceText.slice(span.start, span.end) !== span.excerpt) errors.push(`${prefix}.evidence_spans[${spanIndex}].excerpt does not exactly match the stored chunk text range.`);
    }
    if (typeof decision?.confidence !== "number" || decision.confidence < 0 || decision.confidence > 1) errors.push(`${prefix}.confidence must be between 0 and 1.`);
    if (!EXTERNAL_REVIEW_EVIDENCE_ROLES.includes(decision?.evidence_role)) errors.push(`${prefix}.evidence_role is not allowed.`);
    for (const field of ["personal_aether_support", "commercial_default_allowed", "requires_separate_design_review", "human_review_required"]) if (typeof decision?.[field] !== "boolean") errors.push(`${prefix}.${field} must be boolean.`);
  }
  for (const [index, relationship] of (result?.relationships || []).entries()) {
    externalReviewUnexpectedKeys(relationship, new Set(["relationship_id", "relationship_type", "source_decision_id", "target_decision_id", "source_project", "target_project", "supporting_chunk_ids", "summary"]), `relationships[${index}]`, errors);
    for (const field of ["relationship_id", "relationship_type"]) if (!String(relationship?.[field] || "").trim()) errors.push(`relationships[${index}].${field} is required.`);
    if (typeof relationship?.summary !== "string") errors.push(`relationships[${index}].summary must be a string.`);
    if (!Array.isArray(relationship?.supporting_chunk_ids)) errors.push(`relationships[${index}].supporting_chunk_ids must be an array.`);
    for (const field of ["source_decision_id", "target_decision_id", "source_project", "target_project"]) if (!(field in (relationship || {}))) errors.push(`relationships[${index}].${field} must be present (null is allowed).`);
    for (const key of ["source_decision_id", "target_decision_id"]) if (relationship?.[key] && !decisionIds.has(relationship[key])) errors.push(`relationships[${index}].${key} references unknown decision ID ${relationship[key]}.`);
    for (const key of ["source_project", "target_project"]) if (relationship?.[key] !== null) validateExternalProjectMatch(relationship?.[key], `relationships[${index}].${key}`, projectSnapshotById, currentProjectIds, errors);
    for (const id of externalReviewChunkReferences(relationship)) if (!chunkIds.has(id)) errors.push(`relationships[${index}] references unknown chunk ID ${id}.`);
  }
  for (const [index, question] of (result?.human_questions || []).entries()) {
    externalReviewUnexpectedKeys(question, new Set(["question_id", "text", "supporting_chunk_ids", "decision_ids"]), `human_questions[${index}]`, errors);
    for (const field of ["question_id", "text"]) if (!String(question?.[field] || "").trim()) errors.push(`human_questions[${index}].${field} is required.`);
    for (const field of ["supporting_chunk_ids", "decision_ids"]) if (!Array.isArray(question?.[field])) errors.push(`human_questions[${index}].${field} must be an array.`);
    for (const id of externalReviewChunkReferences(question)) if (!chunkIds.has(id)) errors.push(`human_questions[${index}] references unknown chunk ID ${id}.`);
    for (const id of question?.decision_ids || []) if (!decisionIds.has(id)) errors.push(`human_questions[${index}] references unknown decision ID ${id}.`);
  }
  for (const [index, rejected] of (result?.rejected_material || []).entries()) {
    externalReviewUnexpectedKeys(rejected, new Set(["rejected_id", "title", "reason", "supporting_chunk_ids"]), `rejected_material[${index}]`, errors);
    for (const field of ["rejected_id", "title", "reason"]) if (typeof rejected?.[field] !== "string") errors.push(`rejected_material[${index}].${field} must be a string.`);
    if (!Array.isArray(rejected?.supporting_chunk_ids)) errors.push(`rejected_material[${index}].supporting_chunk_ids must be an array.`);
    for (const id of externalReviewChunkReferences(rejected)) if (!chunkIds.has(id)) errors.push(`rejected_material[${index}] references unknown chunk ID ${id}.`);
  }
  const forbiddenInstruction = externalReviewHasDirectCoreInstruction(result);
  if (forbiddenInstruction) errors.push(`${forbiddenInstruction} is forbidden; external reviews cannot contain executable or direct-Core instruction fields.`);
  return errors;
}

async function importExternalReviewPass({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const filePath = path.resolve(String(payload.filePath || payload.path || ""));
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error("Choose an external review JSON or ZIP file.");
  const originalBytes = await fsp.readFile(filePath);
  if (originalBytes.length > 150 * 1024 * 1024) throw new Error("External review file is above the 150 MB import limit.");
  const importHash = crypto.createHash("sha256").update(originalBytes).digest("hex");
  let resultBytes = originalBytes;
  let companionMarkdown = "";
  if (path.extname(filePath).toLowerCase() === ".zip") {
    const entries = listZipEntries(originalBytes);
    let resultEntry = null;
    for (const entry of entries.filter((item) => item.name.toLowerCase().endsWith(".json"))) {
      try {
        const parsed = JSON.parse(readNamedZipEntry(originalBytes, entry).toString("utf8"));
        if (parsed?.format === "project-state-review-result") { resultEntry = entry; resultBytes = readNamedZipEntry(originalBytes, entry); break; }
      } catch {}
    }
    if (!resultEntry) throw new Error("External review ZIP does not contain a project-state-review-result JSON file.");
    const markdownEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".md"));
    if (markdownEntry) companionMarkdown = readNamedZipEntry(originalBytes, markdownEntry).toString("utf8");
  }
  let result;
  try { result = JSON.parse(resultBytes.toString("utf8")); }
  catch { throw new Error("External review result contains malformed JSON. Nothing was imported."); }
  const packageDb = openDatabase(dbPath);
  let expectedPackage;
  try {
    const packageRow = result?.package_id ? packageDb.prepare("SELECT record_json FROM review_export_packages WHERE id = ?").get(String(result.package_id)) : null;
    if (packageRow) expectedPackage = JSON.parse(packageRow.record_json);
  } finally { packageDb.close(); }
  if (!expectedPackage) throw new Error("External review validation failed; nothing was imported:\n- package_id does not match a Review Pack exported by this Project State installation. Choose the matching source Work Order only if you need to locate or re-export the pack.");
  const workOrderId = expectedPackage.workOrderId;
  const discoveryCaseId = expectedPackage.discoveryCaseId;
  const duplicateDb = openDatabase(dbPath);
  try {
    const row = duplicateDb.prepare("SELECT record_json FROM external_review_passes WHERE work_order_id = ? AND import_hash = ?").get(workOrderId, importHash);
    if (row) return { ok: true, deduplicated: true, workOrderId, discoveryCaseId, externalReviewPass: JSON.parse(row.record_json), coreChanged: false };
  } finally { duplicateDb.close(); }
  const caseView = await getDiscoveryCase({ storageRoot, dbPath, payload: { discoveryCaseId } });
  const chunkIds = new Set(caseView.chunks.map((chunk) => chunk.id));
  const chunkTextById = new Map();
  for (const chunkId of [...new Set((result.decisions || []).flatMap((decision) => (decision.evidence_spans || []).map((span) => span?.chunk_id)).filter(Boolean))]) {
    if (!chunkIds.has(chunkId)) continue;
    const read = await readDiscoveryChunkText({ storageRoot, dbPath, payload: { discoveryChunkId: chunkId } });
    chunkTextById.set(chunkId, read.text || "");
  }
  const projectsDb = openDatabase(dbPath);
  let currentProjectIds;
  try { currentProjectIds = new Set(readRecordJson(projectsDb, "projects").map((project) => project.id)); }
  finally { projectsDb.close(); }
  const projectSnapshotById = new Map((expectedPackage.projectRegistry || []).map((project) => [project.project_id, project]));
  const validationErrors = validateExternalReviewResult({ result, expectedPackage, chunkIds, chunkTextById, projectSnapshotById, currentProjectIds });
  if (validationErrors.length) throw new Error(`External review validation failed; nothing was imported:\n- ${validationErrors.join("\n- ")}`);
  const importedAt = payload.importedAt || nowIso();
  const id = payload.id || makeId("external_review_pass");
  const priorDb = openDatabase(dbPath);
  let versionNumber;
  try { versionNumber = Number(priorDb.prepare("SELECT COUNT(*) AS count FROM external_review_passes WHERE work_order_id = ?").get(workOrderId).count || 0) + 1; }
  finally { priorDb.close(); }
  const extension = path.extname(filePath).toLowerCase() === ".zip" ? ".zip" : ".json";
  const reviewRoot = path.join(storageRoot, "discovery", discoveryCaseId, "external-reviews", id);
  await fsp.mkdir(reviewRoot, { recursive: true });
  const originalPath = path.join(reviewRoot, `original${extension}`);
  await fsp.writeFile(originalPath, originalBytes);
  if (companionMarkdown) await fsp.writeFile(path.join(reviewRoot, "companion-report.md"), companionMarkdown, "utf8");
  const record = {
    id, format: "project-state-external-review-pass", formatVersion: "1.0", versionNumber, workOrderId, discoveryCaseId,
    importedAt, importedBy: String(payload.actorId || ""), importReason: String(payload.reason || ""), originalFilename: path.basename(filePath), managedOriginalPath: relativeManagedPath(storageRoot, originalPath), importHash,
    sourcePackageId: expectedPackage.packageId, sourcePackRevision: expectedPackage.packRevision, sourceEvidenceSha256: expectedPackage.evidenceSha256,
    reviewer: cloneJson(result.reviewer), externalTransmissionStatus: String(payload.externalTransmissionStatus || "unknown"), schemaValidation: { valid: true, schema: "project-state-review-result/1.0", errors: [] },
    sourceComplete: result.source_complete,
    consolidationCoverage: { exportedChunkCount: result.coverage_summary.exported_chunk_count, accountedChunkCount: result.coverage_summary.accounted_chunk_count, unaccountedChunkIds: cloneJson(result.coverage_summary.unaccounted_chunks), coverageComplete: result.coverage_summary.unaccounted_chunks.length === 0, finalSelfCheckComplete: Object.values(result.final_self_check).every((value) => value === true), complete: result.coverage_summary.unaccounted_chunks.length === 0 && Object.values(result.final_self_check).every((value) => value === true) },
    result: cloneJson(result), companionMarkdownStored: Boolean(companionMarkdown), coreAuthority: false, coreChanged: false
  };
  const writeDb = openDatabase(dbPath);
  try { insertStrict(writeDb, "external_review_passes", { id, discovery_case_id: discoveryCaseId, work_order_id: workOrderId, import_hash: importHash, imported_at: importedAt, record_json: JSON.stringify(record) }); }
  catch (error) { await fsp.rm(reviewRoot, { recursive: true, force: true }); throw error; }
  finally { writeDb.close(); }
  await appendDiscoveryInteraction({ storageRoot, dbPath, payload: { id: makeId("interaction"), discoveryCaseId, actorId: payload.actorId || "external_review_importer", actorType: "human", interactionType: "external_review_import", createdAt: importedAt, content: { externalReviewPassId: id, workOrderId, reviewer: result.reviewer, decisionCount: result.decisions.length, sourceComplete: result.source_complete, coreAuthority: false }, evidence: result.decisions.flatMap((decision) => decision.supporting_chunk_ids || []).map((chunkId) => ({ discoveryChunkId: chunkId })) } });
  await appendDiscoveryEvent({ storageRoot, dbPath, payload: { id: makeId("discovery_event"), discoveryCaseId, eventType: "external_review_imported", actorId: payload.actorId || "external_review_importer", actorType: "human", occurredAt: importedAt, externalReviewPassId: id, workOrderId, importHash, decisionCount: result.decisions.length, coreChanged: false } });
  return { ok: true, deduplicated: false, workOrderId, discoveryCaseId, externalReviewPass: record, coreChanged: false, localEvidenceChanged: false, candidateMapChanged: false };
}

async function importPastedExternalReviewPass({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const jsonText = String(payload.jsonText || payload.text || "").trim();
  if (!jsonText) throw new Error("Paste the reviewed JSON before importing.");
  let parsed;
  try { parsed = JSON.parse(jsonText); }
  catch (error) { throw new Error(`The pasted review is malformed JSON: ${error.message}`); }
  const packageId = String(parsed.package_id || "").trim();
  if (!packageId) throw new Error("The pasted review must include package_id so Project State can recover the original export name.");
  const requestedOutputDirectory = String(payload.outputDirectory || "").trim();
  if (!requestedOutputDirectory) throw new Error("Choose where the pasted review JSON should be saved.");
  const outputDirectory = path.resolve(requestedOutputDirectory);
  const outputDirectoryStat = await fsp.stat(outputDirectory).catch(() => null);
  if (!outputDirectoryStat?.isDirectory()) throw new Error("The selected Review Exchange folder is unavailable.");
  const db = openDatabase(dbPath);
  let packageRecord;
  try {
    const row = db.prepare("SELECT record_json FROM review_export_packages WHERE id = ?").get(packageId);
    packageRecord = row ? JSON.parse(row.record_json) : null;
  } finally {
    db.close();
  }
  if (!packageRecord) throw new Error("No matching exported package was found for the pasted package_id.");
  const exportBaseName = String(packageRecord.exportFileName || `${packageId}.zip`).replace(/\.zip$/i, "");
  const preferredName = safeFileName(`${exportBaseName}.review-result.json`);
  let savedPath = path.join(outputDirectory, preferredName);
  const bytes = Buffer.from(jsonText, "utf8");
  for (let copy = 2; fs.existsSync(savedPath); copy += 1) {
    const existing = await fsp.readFile(savedPath);
    if (existing.equals(bytes)) break;
    savedPath = path.join(outputDirectory, safeFileName(`${exportBaseName}.review-result-${copy}.json`));
  }
  if (!fs.existsSync(savedPath)) await fsp.writeFile(savedPath, bytes, { flag: "wx" });
  const imported = await importExternalReviewPass({ storageRoot, dbPath, payload: { ...payload, filePath: savedPath } });
  return { ...imported, savedPath, savedFileName: path.basename(savedPath), sourceExportFileName: packageRecord.exportFileName || "" };
}

async function savePastedExternalReviewDraft({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const jsonText = String(payload.jsonText || payload.text || "");
  if (!jsonText.trim()) throw new Error("Paste review content before saving.");
  const requestedOutputDirectory = String(payload.outputDirectory || "").trim();
  if (!requestedOutputDirectory) throw new Error("Choose where the pasted review should be saved.");
  const outputDirectory = path.resolve(requestedOutputDirectory);
  const outputDirectoryStat = await fsp.stat(outputDirectory).catch(() => null);
  if (!outputDirectoryStat?.isDirectory()) throw new Error("The selected Review Exchange folder is unavailable.");
  let packageRecord = null;
  try {
    const parsed = JSON.parse(jsonText);
    const packageId = String(parsed.package_id || "").trim();
    if (packageId) {
      const db = openDatabase(dbPath);
      try {
        const row = db.prepare("SELECT record_json FROM review_export_packages WHERE id = ?").get(packageId);
        packageRecord = row ? JSON.parse(row.record_json) : null;
      } finally { db.close(); }
    }
  } catch {}
  const exportBaseName = packageRecord
    ? String(packageRecord.exportFileName || packageRecord.packageId || "review").replace(/\.zip$/i, "")
    : `unvalidated-external-review-${safeStamp()}`;
  const preferredName = safeFileName(`${exportBaseName}.review-result.json`);
  let savedPath = path.join(outputDirectory, preferredName);
  const bytes = Buffer.from(jsonText, "utf8");
  for (let copy = 2; fs.existsSync(savedPath); copy += 1) {
    const existing = await fsp.readFile(savedPath);
    if (existing.equals(bytes)) break;
    savedPath = path.join(outputDirectory, safeFileName(`${exportBaseName}.review-result-${copy}.json`));
  }
  if (!fs.existsSync(savedPath)) await fsp.writeFile(savedPath, bytes, { flag: "wx" });
  return { ok: true, savedPath, savedFileName: path.basename(savedPath), matchedExport: Boolean(packageRecord), imported: false, validationBypassed: true };
}

async function listExternalReviewPasses({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const workOrderId = String(payload.workOrderId || "").trim();
  const discoveryCaseId = String(payload.discoveryCaseId || "").trim();
  const db = openDatabase(dbPath);
  try {
    const rows = workOrderId
      ? db.prepare("SELECT record_json FROM external_review_passes WHERE work_order_id = ? ORDER BY rowid").all(workOrderId)
      : discoveryCaseId
        ? db.prepare("SELECT record_json FROM external_review_passes WHERE discovery_case_id = ? ORDER BY rowid").all(discoveryCaseId)
        : db.prepare("SELECT record_json FROM external_review_passes ORDER BY rowid").all();
    const passes = rows.map(parseRecordRow);
    const passIds = new Set(passes.map((pass) => pass.id));
    const actions = db.prepare("SELECT record_json FROM external_review_actions ORDER BY rowid").all().map(parseRecordRow).filter((action) => passIds.has(action.externalReviewPassId));
    return { ok: true, externalReviewPasses: passes.map((pass) => ({ ...pass, humanActions: actions.filter((action) => action.externalReviewPassId === pass.id) })) };
  } finally { db.close(); }
}

async function recordExternalReviewAction({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const externalReviewPassId = requiredDiscoveryId(payload.externalReviewPassId || payload.passId, "External Review Pass ID");
  const decisionId = requiredDiscoveryId(payload.decisionId, "External review decision ID");
  const actorId = requiredDiscoveryId(payload.actorId, "Human reviewer ID");
  const reason = requiredDiscoveryText(payload.reason, "Human review reason");
  const recordedAt = requiredDiscoveryTimestamp(payload.recordedAt || nowIso(), "Human review time");
  const db = openDatabase(dbPath);
  let pass;
  let currentProjectIds;
  try {
    const row = db.prepare("SELECT record_json FROM external_review_passes WHERE id = ?").get(externalReviewPassId);
    if (!row) throw new Error("External Review Pass was not found.");
    pass = JSON.parse(row.record_json);
    if (!(pass.result?.decisions || []).some((decision) => decision.decision_id === decisionId)) throw new Error("External review decision was not found in this immutable pass.");
    currentProjectIds = new Set(db.prepare("SELECT id FROM projects").all().map((row) => row.id));
  } finally { db.close(); }
  const disposition = String(payload.disposition || "needs_revision");
  if (!["approved", "rejected", "needs_revision"].includes(disposition)) throw new Error("Human review disposition is not supported.");
  const unaccountedChunks = pass.result?.coverage_summary?.unaccounted_chunks || [];
  if (disposition === "approved" && unaccountedChunks.length) throw new Error(`Final approval is blocked because ${unaccountedChunks.length} exported chunk${unaccountedChunks.length === 1 ? " is" : "s are"} unaccounted for.`);
  const failedSelfChecks = Object.entries(pass.result?.final_self_check || {}).filter(([, value]) => value !== true).map(([field]) => field);
  if (disposition === "approved" && failedSelfChecks.length) throw new Error(`Final approval and project creation are blocked because final_self_check is incomplete: ${failedSelfChecks.join(", ")}.`);
  const classification = String(payload.classification || "");
  if (!EXTERNAL_REVIEW_CLASSIFICATIONS.includes(classification)) throw new Error("Human review classification is not supported.");
  const primaryProjectId = String(payload.primaryProjectId || "");
  const additionalProjectIds = [...new Set((payload.additionalProjectIds || []).map(String).filter(Boolean))];
  for (const id of [primaryProjectId, ...additionalProjectIds].filter(Boolean)) if (!currentProjectIds.has(id)) throw new Error(`Human review references an unknown existing project: ${id}`);
  if (classification === "project_candidate" && (primaryProjectId || !String(payload.proposedNewProject?.suggestedName || "").trim())) throw new Error("A proposed-project decision requires a proposed name and no primary existing project.");
  if (classification === "existing_project_support" && !primaryProjectId && !additionalProjectIds.length) throw new Error("Existing-project support requires at least one existing project.");
  const id = payload.id || makeId("external_review_action");
  const record = {
    id, externalReviewPassId, workOrderId: pass.workOrderId, discoveryCaseId: pass.discoveryCaseId, decisionId,
    disposition, classification, conceptTitle: String(payload.conceptTitle || ""), summary: String(payload.summary || ""),
    primaryProjectId, additionalProjectIds,
    operation: String(payload.operation || "standard"), mergedDecisionIds: [...new Set((payload.mergedDecisionIds || []).map(String).filter(Boolean))],
    derivedFromActionId: String(payload.derivedFromActionId || ""), proposedNewProject: payload.proposedNewProject ? cloneJson(payload.proposedNewProject) : null,
    routedIntakeId: String(payload.routedIntakeId || ""), recordedAt, recordedBy: actorId, reason, finalDisposition: disposition
  };
  const writeDb = openDatabase(dbPath);
  try { insertStrict(writeDb, "external_review_actions", { id, external_review_pass_id: externalReviewPassId, work_order_id: pass.workOrderId, decision_id: decisionId, recorded_at: recordedAt, record_json: JSON.stringify(record) }); }
  finally { writeDb.close(); }
  return { ok: true, externalReviewAction: record, coreChanged: false };
}

async function listExternalReviewActions({ storageRoot, dbPath, payload = {} }) {
  await ensureSpine(storageRoot);
  const passId = String(payload.externalReviewPassId || payload.passId || "").trim();
  const workOrderId = String(payload.workOrderId || "").trim();
  const db = openDatabase(dbPath);
  try {
    const rows = passId
      ? db.prepare("SELECT record_json FROM external_review_actions WHERE external_review_pass_id = ? ORDER BY rowid").all(passId)
      : workOrderId
        ? db.prepare("SELECT record_json FROM external_review_actions WHERE work_order_id = ? ORDER BY rowid").all(workOrderId)
        : db.prepare("SELECT record_json FROM external_review_actions ORDER BY rowid").all();
    return { ok: true, externalReviewActions: rows.map(parseRecordRow) };
  } finally { db.close(); }
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

async function extractDocxTextWindow(bytes, { chunkCharacters = 12000, startChunkIndex = 0, maxChunks = 120 } = {}) {
  const entry = findZipEntry(bytes, "word/document.xml");
  if (!entry) throw new Error("Could not find document text in this DOCX.");
  const compressed = zipEntryCompressedData(bytes, entry);
  const source = entry.method === 0 ? Readable.from([compressed]) : Readable.from([compressed]).pipe(zlib.createInflateRaw());
  const limit = Math.max(500, Math.min(16000, Number(chunkCharacters) || 12000));
  const start = Math.max(0, Number(startChunkIndex) || 0);
  const target = Math.max(1, Math.min(500, Number(maxChunks) || 120));
  const pieces = [];
  let piece = "";
  let pieceIndex = 0;
  let inTag = false;
  let tag = "";
  let inEntity = false;
  let entity = "";
  let stopped = false;

  const addText = (value = "") => {
    if (!value || stopped) return;
    piece += value;
    while (piece.length >= limit && !stopped) {
      let splitAt = piece.lastIndexOf("\n", limit);
      if (splitAt < Math.floor(limit * 0.5)) splitAt = piece.lastIndexOf(" ", limit);
      if (splitAt < Math.floor(limit * 0.5)) splitAt = limit;
      const chunk = cleanExtractedText(piece.slice(0, splitAt));
      if (chunk && !textLooksBinaryOrGibberish(chunk) && pieceIndex >= start) pieces.push(chunk);
      pieceIndex += 1;
      piece = piece.slice(splitAt).trimStart();
      if (pieces.length >= target) stopped = true;
    }
  };

  const finishTag = () => {
    const normalized = tag.trim().toLowerCase();
    if (normalized === "w:tab/" || normalized === "w:tab") addText("\t");
    else if (normalized.startsWith("/w:p") || normalized.startsWith("/w:tr") || normalized.startsWith("w:br") || normalized.startsWith("w:cr")) addText("\n");
    else if (normalized.startsWith("/w:tc")) addText("\t");
    tag = "";
  };

  const finishEntity = () => {
    const value = `&${entity};`;
    addText(decodeXmlEntities(value));
    entity = "";
    inEntity = false;
  };

  await new Promise((resolve, reject) => {
    source.on("data", (buffer) => {
      if (stopped) {
        source.destroy();
        return;
      }
      const text = Buffer.from(buffer).toString("utf8");
      for (const ch of text) {
        if (stopped) break;
        if (inTag) {
          if (ch === ">") {
            inTag = false;
            finishTag();
          } else if (tag.length < 80) tag += ch;
          continue;
        }
        if (inEntity) {
          if (ch === ";") finishEntity();
          else if (entity.length > 20) {
            addText(`&${entity}${ch}`);
            entity = "";
            inEntity = false;
          } else entity += ch;
          continue;
        }
        if (ch === "<") {
          inTag = true;
          tag = "";
        } else if (ch === "&") {
          inEntity = true;
          entity = "";
        } else {
          addText(ch);
        }
      }
    });
    source.on("end", resolve);
    source.on("close", resolve);
    source.on("error", reject);
  });

  const finalPiece = cleanExtractedText(piece);
  if (finalPiece && !textLooksBinaryOrGibberish(finalPiece) && pieceIndex >= start && pieces.length < target) pieces.push(finalPiece);
  if (pieces.length > 1 && pieces[pieces.length - 1].length < 500 && looksLikeContinuationText(pieces[pieces.length - 1], pieces[pieces.length - 2])) {
    pieces[pieces.length - 2] = `${pieces[pieces.length - 2]}\n${pieces.pop()}`;
  }
  const complete = !stopped;
  return {
    pieces,
    complete,
    truncated: !complete,
    totalDetectedChunks: complete ? pieceIndex + (finalPiece ? 1 : 0) : start + pieces.length + 1
  };
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

function zipEntryCompressedData(bytes, entry) {
  const localOffset = entry.localHeaderOffset;
  if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid DOCX file.");
  const nameLength = readUint16(bytes, localOffset + 26);
  const extraLength = readUint16(bytes, localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  return Buffer.from(bytes.slice(dataStart, dataStart + entry.compressedSize));
}

function inflateZipEntry(bytes, entry) {
  const localOffset = entry.localHeaderOffset;
  if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid DOCX file.");
  const nameLength = readUint16(bytes, localOffset + 26);
  const extraLength = readUint16(bytes, localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = zipEntryCompressedData(bytes, entry);
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
  return decodeXmlEntities(String(xml || "")
    .replace(/<w:tab\s*\/>/gi, "\t")
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, "\n")
    .replace(/<\/w:tc>/gi, "\t")
    .replace(/<\/w:(?:p|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, ""));
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
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    rtf: "application/rtf",
    odt: "application/vnd.oasis.opendocument.text",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    log: "text/plain",
    xml: "application/xml",
    xhtml: "application/xhtml+xml",
    json: "application/json",
    jsonl: "application/x-ndjson",
    ipynb: "application/x-ipynb+json",
    py: "text/x-python",
    js: "text/javascript",
    ts: "text/typescript",
    jsx: "text/javascript",
    tsx: "text/typescript",
    html: "text/html",
    css: "text/css",
    scss: "text/x-scss",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
    h: "text/x-chdr",
    hpp: "text/x-c++hdr",
    cs: "text/x-csharp",
    java: "text/x-java-source",
    rs: "text/rust",
    go: "text/x-go",
    sql: "application/sql",
    sh: "application/x-sh",
    ps1: "text/x-powershell",
    bat: "application/x-msdos-program",
    cmd: "application/cmd",
    lua: "text/x-lua",
    r: "text/x-r",
    m: "text/x-matlab",
    jl: "text/x-julia",
    uproject: "application/json",
    uplugin: "application/json",
    ini: "text/plain",
    cfg: "text/plain",
    conf: "text/plain",
    yaml: "application/yaml",
    yml: "application/yaml",
    toml: "application/toml",
    uasset: "application/octet-stream",
    umap: "application/octet-stream",
    blend: "application/octet-stream",
    zip: "application/zip",
    "7z": "application/x-7z-compressed",
    rar: "application/vnd.rar",
    tar: "application/x-tar",
    gz: "application/gzip",
    sqlite: "application/vnd.sqlite3",
    sqlite3: "application/vnd.sqlite3",
    db: "application/octet-stream",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav"
  };
  return types[extension] || "application/octet-stream";
}

function checksumText(text = "") {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function formatBytesForLog(bytes = 0) {
  const units = ["bytes", "KB", "MB", "GB"];
  let size = Number(bytes) || 0;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
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
  DATABASE_FILE,
  __test: {
    annotateReviewPackContinuations,
    inheritReviewPackContinuationProfiles,
    looksLikeContinuationText,
    reviewPackEntities,
    xmlToText
  }
};
