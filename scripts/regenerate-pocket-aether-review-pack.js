const fs = require("node:fs");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

async function main() {
  const oldEvidencePath = path.resolve(process.argv[2] || ".tmp-pocket-aether-old/evidence.json");
  const storageRoot = path.join(process.env.USERPROFILE, "Project State Storage");
  const oldEvidence = JSON.parse(fs.readFileSync(oldEvidencePath, "utf8"));
  const work = oldEvidence.work_order;
  if (!work?.work_order_id || !work?.discovery_case_id) throw new Error("The comparison package does not identify its Work Order and Discovery Case.");
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const sourceCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: work.discovery_case_id });
  const currentChunks = sourceCase.chunks.map((chunk) => ({ id: chunk.id, sha256: chunk.textSha256 })).sort((a, b) => a.id.localeCompare(b.id));
  const oldChunks = oldEvidence.chunks.map((chunk) => ({ id: chunk.chunk_id, sha256: chunk.text_sha256 })).sort((a, b) => a.id.localeCompare(b.id));
  if (JSON.stringify(currentChunks) !== JSON.stringify(oldChunks)) throw new Error("The preserved Discovery chunks do not exactly match the old Pocket Aether Node package.");
  const result = await bridge.reviewExchange.exportUniversalPack({
    workOrder: {
      id: work.work_order_id,
      title: work.title,
      task: work.task,
      status: "completed",
      source: { discoveryCaseId: work.discovery_case_id },
      lastAnalysis: { sourceFullyAnalyzed: work.source_complete === true, totalDetectedChunks: currentChunks.length },
      candidateMap: { entries: [] }
    },
    outputDirectory: path.join(storageRoot, "backups")
  });
  console.log(JSON.stringify({ oldEvidencePath, exactSourceVerified: true, sourceChunkCount: currentChunks.length, result }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
