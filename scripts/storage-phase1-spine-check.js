const fs = require("fs");
const path = require("path");

const {
  countStoreParts,
  extractStore,
  listProjectImages,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");

const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
const STORAGE_SPINE_VERSION = "0.2.0-phase1";
const STORAGE_LAYOUT_VERSION = "single-record-v1";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildManifest(store) {
  const snapshot = JSON.stringify(store);
  const counts = countStoreParts(store);
  const largeContent = {
    attachments: 0,
    attachmentDataCharacters: 0,
    extractTextCharacters: 0,
    largestAttachmentCharacters: 0,
    largestExtractCharacters: 0
  };

  for (const project of store.projects || []) {
    for (const image of listProjectImages(project)) {
      largeContent.attachments += 1;
      const dataLength = String(image.dataUrl || image.localReference || "").length;
      largeContent.attachmentDataCharacters += dataLength;
      largeContent.largestAttachmentCharacters = Math.max(largeContent.largestAttachmentCharacters, dataLength);
    }
    for (const source of project.sources || []) {
      for (const extract of source.extracts || []) {
        const textLength = String(extract.text || "").length;
        largeContent.extractTextCharacters += textLength;
        largeContent.largestExtractCharacters = Math.max(largeContent.largestExtractCharacters, textLength);
      }
    }
  }

  return {
    spineVersion: STORAGE_SPINE_VERSION,
    layoutVersion: STORAGE_LAYOUT_VERSION,
    snapshotBytes: Buffer.byteLength(snapshot, "utf8"),
    counts,
    largeContent,
    splitTargets: {
      meta: 1,
      projects: counts.projects,
      history: counts.changes,
      sources: counts.sources,
      extracts: counts.extracts,
      attachments: largeContent.attachments,
      drafts: counts.drafts,
      recovery: 0
    }
  };
}

function verifyManifest(manifest, counts) {
  const errors = [];
  if (manifest.spineVersion !== STORAGE_SPINE_VERSION) errors.push("Unexpected spine version.");
  if (manifest.layoutVersion !== STORAGE_LAYOUT_VERSION) errors.push("Unexpected layout version.");
  if (!manifest.snapshotBytes) errors.push("Manifest missing snapshot byte size.");
  if (manifest.counts.projects !== counts.projects) errors.push("Project count mismatch.");
  if (manifest.counts.changes !== counts.changes) errors.push("History count mismatch.");
  if (manifest.counts.sources !== counts.sources) errors.push("Source count mismatch.");
  if (manifest.counts.extracts !== counts.extracts) errors.push("Extract count mismatch.");
  if (manifest.largeContent.attachments !== counts.attachments) errors.push("Attachment count mismatch.");
  if (manifest.splitTargets.projects !== counts.projects) errors.push("Project split target mismatch.");
  if (manifest.splitTargets.history !== counts.changes) errors.push("History split target mismatch.");
  return errors;
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FIXTURE;
  const payload = readJson(filePath);
  const store = extractStore(payload);
  const counts = countStoreParts(store);
  const integrityErrors = verifyStoreIntegrity(store);
  const manifest = buildManifest(store);
  const manifestErrors = verifyManifest(manifest, counts);
  const errors = [...integrityErrors, ...manifestErrors];

  console.log("Storage Spine Phase 1 Manifest");
  console.log(`Input: ${filePath}`);
  console.log(JSON.stringify({
    spineVersion: manifest.spineVersion,
    layoutVersion: manifest.layoutVersion,
    snapshotBytes: manifest.snapshotBytes,
    counts: manifest.counts,
    largeContent: manifest.largeContent,
    splitTargets: manifest.splitTargets
  }, null, 2));

  if (errors.length) {
    console.error("Phase 1 errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Phase 1 manifest: ok");
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  verifyManifest
};
