const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

async function main() {
  const storageRoot = path.join(process.env.TEMP, "Project-State-Review-Polish-Live-Test");
  const priorPackageId = "review_package_mricylsv_3467250a";
  const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
  let prior;
  try { prior = db.prepare("SELECT record_json FROM review_export_packages WHERE id = ?").get(priorPackageId); }
  finally { db.close(); }
  if (!prior) throw new Error("The exact prior FTL export record is unavailable.");
  const record = JSON.parse(prior.record_json);
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const sourceCase = await bridge.discoveryStorage.getCase({ discoveryCaseId: record.discoveryCaseId });
  const currentChunkIds = sourceCase.chunks.map((chunk) => chunk.id).sort();
  const priorChunkIds = [...record.chunkIds].sort();
  if (JSON.stringify(currentChunkIds) !== JSON.stringify(priorChunkIds)) throw new Error("The preserved FTL Discovery chunks do not exactly match the prior FTL export record.");
  const outputDirectory = path.join(storageRoot, "backups");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const result = await bridge.reviewExchange.exportUniversalPack({
    workOrder: {
      id: record.workOrderId,
      title: "AI follow-up: FTL Thread Project Summary",
      task: "Regenerate the preserved FTL review evidence without changing its source chunks.",
      status: "completed",
      source: { discoveryCaseId: record.discoveryCaseId },
      lastAnalysis: { sourceFullyAnalyzed: record.sourceComplete === true, totalDetectedChunks: currentChunkIds.length },
      candidateMap: { entries: [] }
    },
    outputDirectory
  });
  console.log(JSON.stringify({ priorPackageId, exactSourceVerified: true, priorChunkIds, result }, null, 2));
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
