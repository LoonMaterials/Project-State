const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-extraction-"));
  const inputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-extraction-input-"));
  const paragraphs = Array.from({ length: 80 }, (_, index) => `Paragraph ${index + 1}: deterministic extraction preserves exact source lineage and explicit status.`).join("\n");
  const textPath = path.join(inputRoot, "long-notes.txt");
  const imagePath = path.join(inputRoot, "image.png");
  await fsp.writeFile(textPath, paragraphs, "utf8");
  await fsp.writeFile(imagePath, Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const stagedText = await bridge.discoveryStorage.stageTrustedFile({ path: textPath, actorId: "actor_owner", reason: "Trusted test fixture.", externalSecurityAcknowledged: true, timestamp: "2026-06-19T18:01:00.000Z" });
  const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: stagedText.discoveryCaseId, fileVersionId: stagedText.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-19T18:02:00.000Z", chunkCharacters: 700 });
  assert(extracted.extraction.status === "complete" && extracted.chunks.length > 1, "Text extraction/chunking failed.", extracted);
  assert((await bridge.discoveryStorage.readExtractionText({ extractionId: extracted.extraction.id })).text === paragraphs, "Extraction readback drifted.");
  const stagedImage = await bridge.discoveryStorage.stageTrustedFile({ path: imagePath, actorId: "actor_owner", reason: "Trusted image fixture.", externalSecurityAcknowledged: true, timestamp: "2026-06-19T18:03:00.000Z" });
  const image = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: stagedImage.discoveryCaseId, fileVersionId: stagedImage.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-19T18:04:00.000Z" });
  assert(image.extraction.status === "metadata_only" && image.chunks.length === 0, "Image extraction was dishonest.", image);
  const integrity = await bridge.storage.verifyIntegrity();
  assert(integrity.ok && integrity.checkedFiles.discoveryChunks === extracted.chunks.length, "Derivative integrity failed.", integrity);
  const db = new DatabaseSync(path.join(storageRoot, "project-state.db")); let blocked = false; try { db.exec(`UPDATE discovery_extractions SET status='failed' WHERE id='${extracted.extraction.id}'`); } catch { blocked = true; } db.close(); assert(blocked, "Extraction append-only trigger failed.");
  await bridge.storage.reset(); await fsp.rm(storageRoot,{recursive:true,force:true}); await fsp.rm(inputRoot,{recursive:true,force:true});
  console.log("Discovery Extraction Check"); console.log(JSON.stringify({ completeText:true, chunks:extracted.chunks.length, metadataOnlyImage:true, derivativeIntegrity:true, appendOnly:true },null,2)); console.log("Discovery extraction: ok");
}
if(require.main===module)main().catch((error)=>{console.error("Discovery extraction failed:");console.error(error.message);if(error.details)console.error(JSON.stringify(error.details,null,2));process.exitCode=1;});
