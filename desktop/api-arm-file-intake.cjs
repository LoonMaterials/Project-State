const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".csv", ".json", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MAX_FILE_BYTES = 26214400;

function createApiArmFileIntake({ storageRoot, intakeArms, storage, discoveryStorage = null }) {
  return {
    async submitFile({ metadata, bytes }) {
      const validation = validateFileSubmission(metadata, bytes);
      if (metadata?.discovery?.enabled === true && !discoveryStorage) {
        validation.errors.push({ code: "DISCOVERY_UNAVAILABLE", message: "Discovery storage is unavailable for this file submission.", path: "discovery" });
      }
      if (validation.errors.length) return { status: "rejected", errors: validation.errors };
      const checksum = checksumBytes(bytes);
      if (checksum !== metadata.file.sha256.toLowerCase()) return { status: "rejected", errors: [{ code: "CHECKSUM_MISMATCH", message: "Uploaded bytes do not match the declared SHA-256 checksum.", path: "file.sha256" }] };

      const envelope = fileEnvelope(metadata, checksum, bytes.length);
      const receipt = await intakeArms.submitEnvelope(envelope);
      if (receipt.status === "rejected") return receipt;
      if (receipt.status === "duplicate") {
        const loaded = await storage.loadStore();
        const batch = (loaded.store?.intakeBatches || []).find((item) => item.submissionId === metadata.submissionId);
        if (batch?.fileReceipt) return { ...receipt, file: batch.fileReceipt };
        return { status: "rejected", errors: [{ code: "FILE_RECEIPT_MISSING", message: "The duplicate submission has no retained file receipt.", path: "submissionId" }] };
      }

      const intakeId = receipt.itemMappings[0].intakeId;
      const safeName = safeFileName(metadata.file.fileName);
      const finalPath = path.join(storageRoot, "sources", intakeId, safeName);
      const tempPath = path.join(storageRoot, "temp", `${intakeId}-${Date.now()}.upload`);
      try {
        await fsp.mkdir(path.dirname(tempPath), { recursive: true });
        await fsp.writeFile(tempPath, bytes, { flag: "wx" });
        await fsp.mkdir(path.dirname(finalPath), { recursive: true });
        await fsp.rename(tempPath, finalPath);
        const managedPath = relativeManagedPath(storageRoot, finalPath);
        const loaded = await storage.loadStore();
        const store = loaded.store;
        const batch = (store.intakeBatches || []).find((item) => item.id === receipt.batchId);
        const intake = (store.intakeItems || []).find((item) => item.id === intakeId);
        if (!batch || !intake) throw new Error("Accepted file Intake records could not be reloaded.");
        const managedFile = {
          fileName: safeName,
          contentType: metadata.file.contentType,
          size: bytes.length,
          sha256: checksum,
          managedPath
        };
        intake.evidence = { ...(intake.evidence || {}), managedFile };
        const discoveryInput = normalizeDiscoveryInput(metadata.discovery, { metadata, managedFile, checksum, intakeId });
        if (discoveryInput) intake.evidence.apiFolderDiscovery = publicDiscoveryEvidence(discoveryInput);
        batch.fileReceipt = {
          fileName: safeName,
          contentType: metadata.file.contentType,
          size: bytes.length,
          sha256: checksum,
          intakeId
        };
        await storage.saveStore({ store, manifest: loaded.meta || {} });
        if (discoveryInput) {
          batch.fileReceipt.discovery = await retainFileForDiscovery({ discoveryStorage, input: discoveryInput, managedFile, checksum, size: bytes.length, intakeId });
          const afterDiscovery = await storage.loadStore();
          const afterBatch = (afterDiscovery.store?.intakeBatches || []).find((item) => item.id === receipt.batchId);
          if (afterBatch) {
            afterBatch.fileReceipt = batch.fileReceipt;
            await storage.saveStore({ store: afterDiscovery.store, manifest: afterDiscovery.meta || {} });
          }
        }
        return { ...receipt, file: { ...batch.fileReceipt } };
      } catch (error) {
        await fsp.rm(tempPath, { force: true }).catch(() => {});
        await storage.preserveRecoveryRecord({ stage: "api-arm-file-finalize", message: error.message, submissionId: metadata.submissionId, intakeId });
        return { status: "rejected", errors: [{ code: "FILE_PERSISTENCE_FAILED", message: "Project State could not retain the managed source file.", path: "file" }] };
      }
    }
  };
}

function validateFileSubmission(metadata, bytes) {
  const errors = [];
  const add = (code, message, pathName = "") => errors.push({ code, message, path: pathName });
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) add("INVALID_FILE_METADATA", "File metadata must be an object.");
  if (!Buffer.isBuffer(bytes) || !bytes.length) add("EMPTY_FILE", "Uploaded file is empty.", "file");
  if (Buffer.isBuffer(bytes) && bytes.length > MAX_FILE_BYTES) add("FILE_TOO_LARGE", `Uploaded file exceeds ${MAX_FILE_BYTES} bytes.`, "file");
  if (metadata?.contractVersion !== "0.1") add("UNSUPPORTED_CONTRACT_VERSION", "File contractVersion must be 0.1.", "contractVersion");
  for (const field of ["submissionId", "idempotencyKey", "submittedAt", "arm", "target", "provenance", "file"]) if (!metadata?.[field]) add("INVALID_FILE_METADATA", `${field} is required.`, field);
  for (const field of ["fileName", "contentType", "sha256"]) if (!String(metadata?.file?.[field] || "").trim()) add("INVALID_FILE_METADATA", `${field} is required.`, `file.${field}`);
  const extension = path.extname(String(metadata?.file?.fileName || "")).toLowerCase();
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) add("FILE_TYPE_NOT_ALLOWED", "This file extension is not allowed by File Arm Contract v0.1.", "file.fileName");
  if (!extension) add("FILE_TYPE_NOT_ALLOWED", "An allowed file extension is required.", "file.fileName");
  if (!/^[a-f0-9]{64}$/i.test(String(metadata?.file?.sha256 || ""))) add("INVALID_FILE_METADATA", "sha256 must be a 64-character hexadecimal digest.", "file.sha256");
  if (metadata?.discovery?.enabled === true) {
    for (const field of ["discoveryCaseId", "actorId", "reason"]) if (!String(metadata.discovery[field] || "").trim()) add("INVALID_FILE_METADATA", `discovery.${field} is required when Discovery processing is enabled.`, `discovery.${field}`);
  }
  return { errors };
}

function fileEnvelope(metadata, checksum, size) {
  return {
    contractVersion: "0.1",
    submissionId: metadata.submissionId,
    idempotencyKey: metadata.idempotencyKey,
    submittedAt: metadata.submittedAt,
    arm: metadata.arm,
    target: metadata.target,
    items: [{
      clientItemId: "source-file",
      title: metadata.file.fileName,
      proposedObjectType: "Source",
      proposedChange: {
        text: metadata.file.fileName,
        summary: `Uploaded ${metadata.file.contentType} source file (${size} bytes) awaiting human review.`
      },
      sourceLabel: metadata.provenance.sourceLabel,
      evidence: { fileName: metadata.file.fileName, contentType: metadata.file.contentType, size, sha256: checksum }
    }],
    provenance: metadata.provenance
  };
}

function safeFileName(value) {
  const base = path.basename(String(value || "source-file")).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 180);
  return base || "source-file";
}

function checksumBytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function relativeManagedPath(storageRoot, filePath) {
  return path.relative(storageRoot, filePath).replace(/\\/g, "/");
}

function normalizeDiscoveryInput(discovery, { metadata, managedFile, checksum, intakeId }) {
  if (!discovery || discovery.enabled !== true) return null;
  const submittedAt = String(metadata.submittedAt || new Date().toISOString());
  return {
    discoveryCaseId: cleanId(discovery.discoveryCaseId),
    caseTitle: cleanText(discovery.caseTitle) || cleanText(metadata.provenance?.sourceLabel) || "API folder discovery",
    actorId: cleanId(discovery.actorId),
    reason: cleanText(discovery.reason),
    privacyClass: cleanText(discovery.privacyClass) || "local_only",
    relativePath: normalizeRelativePath(discovery.relativePath || metadata.file.fileName),
    groupingRationale: cleanText(discovery.groupingRationale) || "API folder discovery file.",
    createdAt: cleanTimestamp(discovery.createdAt || submittedAt),
    extract: discovery.extract !== false,
    analyzeWhenComplete: discovery.analyzeWhenComplete === true,
    folderBatchId: cleanId(discovery.folderBatchId || ""),
    intakeId,
    fileAssetId: cleanId(discovery.fileAssetId || `file_asset_${intakeId}`),
    fileVersionId: cleanId(discovery.fileVersionId || `file_version_${intakeId}`),
    membershipId: cleanId(discovery.membershipId || `discovery_file_${intakeId}`),
    originalName: cleanText(discovery.originalName) || managedFile.fileName,
    checksum
  };
}

async function retainFileForDiscovery({ discoveryStorage, input, managedFile, checksum, size }) {
  const existing = await discoveryStorage.readFoundationState({ discoveryCaseId: input.discoveryCaseId }).catch(() => ({ discoveryCases: [] }));
  if (!existing.discoveryCases?.length) {
    await discoveryStorage.createCase({
      id: input.discoveryCaseId,
      createdBy: input.actorId,
      createdAt: input.createdAt,
      stage: "quarantine",
      status: "created",
      title: input.caseTitle
    });
  }
  const registered = await discoveryStorage.registerFileVersion({
    fileAssetId: input.fileAssetId,
    fileVersionId: input.fileVersionId,
    sha256: checksum,
    byteSize: size,
    originalName: input.relativePath || input.originalName,
    managedPath: managedFile.managedPath,
    createdAt: input.createdAt,
    privacyClass: input.privacyClass,
    externalSecurityAcknowledged: true,
    externalSecurityAcknowledgedBy: input.actorId,
    externalSecurityAcknowledgedAt: input.createdAt,
    externalSecurityReason: input.reason
  });
  await discoveryStorage.attachFileVersion({
    id: input.membershipId,
    discoveryCaseId: input.discoveryCaseId,
    fileAssetId: registered.fileAsset.id,
    fileVersionId: registered.fileVersion.id,
    addedAt: input.createdAt,
    groupingRationale: input.groupingRationale
  }).catch((error) => {
    if (!/UNIQUE constraint failed/i.test(String(error?.message || ""))) throw error;
  });
  let extraction = null;
  let analysis = null;
  if (input.extract) {
    const extracted = await discoveryStorage.extractFileVersion({
      discoveryCaseId: input.discoveryCaseId,
      fileVersionId: registered.fileVersion.id,
      actorId: "project_state_api_discovery",
      createdAt: input.createdAt
    }).catch((error) => ({ ok: false, error: error.message || "Extraction failed." }));
    extraction = extracted.extraction ? {
      id: extracted.extraction.id,
      status: extracted.extraction.status,
      textBytes: extracted.extraction.textBytes,
      chunkCount: extracted.extraction.chunkCount
    } : { status: "failed", error: extracted.error || "Extraction failed." };
  }
  if (input.analyzeWhenComplete) {
    analysis = await discoveryStorage.analyzeCase({
      discoveryCaseId: input.discoveryCaseId,
      actorId: "project_state_api_discovery",
      createdAt: input.createdAt
    }).then((result) => ({
      suggestedProjectNames: result.suggestedProjectNames || [],
      documentUnits: result.documentUnits || [],
      questionCount: (result.questions || []).length,
      unitModeSuggestion: result.unitModeSuggestion || "one_item"
    })).catch((error) => ({ status: "failed", error: error.message || "Analysis failed." }));
  }
  return {
    discoveryCaseId: input.discoveryCaseId,
    fileAssetId: registered.fileAsset.id,
    fileVersionId: registered.fileVersion.id,
    relativePath: input.relativePath,
    folderBatchId: input.folderBatchId,
    extraction,
    analysis
  };
}

function publicDiscoveryEvidence(input) {
  return {
    discoveryCaseId: input.discoveryCaseId,
    folderBatchId: input.folderBatchId,
    relativePath: input.relativePath,
    groupingRationale: input.groupingRationale,
    fileVersionId: input.fileVersionId
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanId(value) {
  const text = cleanText(value);
  if (!text) return "";
  return text.replace(/[^A-Za-z0-9._:-]/g, "_").slice(0, 128);
}

function cleanTimestamp(value) {
  const text = cleanText(value);
  return Number.isFinite(Date.parse(text)) ? new Date(text).toISOString() : new Date().toISOString();
}

function normalizeRelativePath(value) {
  return cleanText(value).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\.(\/|$)/g, "").slice(0, 500);
}

module.exports = { createApiArmFileIntake, validateFileSubmission, ALLOWED_EXTENSIONS, MAX_FILE_BYTES };
