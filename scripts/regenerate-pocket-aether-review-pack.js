const fs = require("node:fs");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function storedZipEntries(bytes) {
  const entries = new Map(); let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18); const nameLength = bytes.readUInt16LE(offset + 26); const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.slice(offset + 30, offset + 30 + nameLength).toString("utf8"); const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(start, start + size)); offset = start + size;
  }
  return entries;
}

function latestPocketPackage(folder) {
  return fs.readdirSync(folder).filter((name) => /Pocket Aether Node.*universal-ai-review-pack.*\.zip$/i.test(name)).map((name) => ({ path: path.join(folder, name), time: fs.statSync(path.join(folder, name)).mtimeMs })).sort((a, b) => b.time - a.time)[0]?.path;
}

async function main() {
  const storageRoot = path.join(process.env.USERPROFILE, "Project State Storage");
  const comparisonPath = process.argv[2] ? path.resolve(process.argv[2]) : latestPocketPackage(path.join(storageRoot, "backups"));
  if (!comparisonPath) throw new Error("No earlier Pocket Aether Node review package was found.");
  const oldEvidence = comparisonPath.toLowerCase().endsWith(".zip")
    ? JSON.parse(storedZipEntries(fs.readFileSync(comparisonPath)).get("evidence.json").toString("utf8"))
    : JSON.parse(fs.readFileSync(comparisonPath, "utf8"));
  const work = oldEvidence.work_order || { work_order_id: oldEvidence.work_order_id, discovery_case_id: oldEvidence.discovery_case_id, title: "AI follow-up_ AN 1 Pocket Aether Node Project Summary", task: "Review the Pocket Aether Node source package.", source_complete: oldEvidence.source_complete };
  if (!work?.work_order_id || !work?.discovery_case_id) throw new Error("The comparison package does not identify its Work Order and Discovery Case.");
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const sourceCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: work.discovery_case_id });
  const sourceVersion = sourceCase.fileVersions.find((version) => oldEvidence.source_manifest.some((source) => source.file_version_id === version.id));
  if (!sourceVersion || !oldEvidence.source_manifest.some((source) => source.sha256 === sourceVersion.sha256)) throw new Error("The exact Pocket Aether Node source file could not be verified.");
  const stamp = Date.now().toString(36);
  const newCaseId = `discovery_case_pocket_regenerated_${stamp}`;
  await bridge.discoveryStorage.createCase({ id: newCaseId, createdBy: "project_state_regenerator", createdAt: new Date().toISOString(), stage: "discovery", status: "created", title: "Pocket Aether Node regenerated extraction" });
  await bridge.discoveryStorage.attachFileVersion({ id: `case_file_pocket_regenerated_${stamp}`, discoveryCaseId: newCaseId, fileAssetId: sourceVersion.fileAssetId, fileVersionId: sourceVersion.id, addedAt: new Date().toISOString(), groupingRationale: "Exact-source re-extraction after DOCX boundary and continuation fixes." });
  const extracted = await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: newCaseId, fileVersionId: sourceVersion.id, actorId: "project_state_regenerator", chunkCharacters: 4000 });
  const currentChunks = extracted.chunks.map((chunk) => ({ id: chunk.id, sha256: chunk.textSha256 })).sort((a, b) => a.id.localeCompare(b.id));
  const result = await bridge.reviewExchange.exportUniversalPack({
    workOrder: {
      id: `${work.work_order_id}_regenerated_${stamp}`,
      title: work.title,
      task: work.task,
      status: "completed",
      source: { discoveryCaseId: newCaseId },
      lastAnalysis: { sourceFullyAnalyzed: work.source_complete === true, totalDetectedChunks: currentChunks.length },
      candidateMap: { entries: [] }
    },
    outputDirectory: path.join(storageRoot, "backups")
  });
  console.log(JSON.stringify({ comparisonPath, exactSourceSha256: sourceVersion.sha256, exactSourceVerified: true, regeneratedDiscoveryCaseId: newCaseId, sourceChunkCount: currentChunks.length, result }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
