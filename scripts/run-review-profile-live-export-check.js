const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { connect } = require("./run-multi-idea-live-ui-check.js");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
function storedZipEntries(bytes) {
  const entries = new Map(); let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18); const nameLength = bytes.readUInt16LE(offset + 26); const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.slice(offset + 30, offset + 30 + nameLength).toString("utf8"); const start = offset + 30 + nameLength + extraLength;
    entries.set(name, bytes.slice(start, start + size)); offset = start + size;
  }
  return entries;
}

async function main() {
  const port = Number(process.argv[2] || 9233);
  const requestedOutputDirectory = process.argv[3] ? path.resolve(process.argv[3]) : "";
  const outputDirectory = requestedOutputDirectory || fs.mkdtempSync(path.join(os.tmpdir(), "project-state-live-profile-export-"));
  const client = await connect(port);
  try {
    const result = await client.evaluate(`(async () => {
      const workOrder = (store.aiWorkOrders || []).find((item) => /Pocket Aether Node/i.test(item.title || item.task || '')) || {
        id: 'ai_work_order_mridw4mg_weaz6l', title: 'AI follow-up: AN 1 Pocket Aether Node Project Summary', task: 'Verify renderer-to-bridge profile serialization', status: 'completed',
        source: { discoveryCaseId: 'discovery_case_mridw0oc_4fd2e85f' }, lastAnalysis: { sourceFullyAnalyzed: true, totalDetectedChunks: 2 }, candidateMap: { entries: [] }
      };
      return platformAdapter.reviewExchange.exportUniversalPack({ workOrder, knownProjects: universalReviewKnownProjects(), outputDirectory: ${JSON.stringify(outputDirectory)} });
    })()`);
    assert(!result?.error && result?.path, "The live renderer could not export the Pocket Aether review package.", result);
    const entries = storedZipEntries(fs.readFileSync(result.path));
    const evidence = JSON.parse(entries.get("evidence.json").toString("utf8"));
    const readable = entries.get("evidence_readable.md").toString("utf8");
    const missing = evidence.chunks.filter((chunk) => !chunk.provisional_concept_profile || typeof chunk.provisional_concept_profile.synthesis_reasoning_summary !== "string");
    assert(missing.length === 0, "Live exported evidence.json omitted provisional_concept_profile.", { missingChunkIds: missing.map((chunk) => chunk.chunk_id) });
    const markdownCount = (readable.match(/\*\*Provisional concept profile\*\*/g) || []).length;
    assert(markdownCount === evidence.chunks.length, "Live exported evidence_readable.md omitted provisional concept profile blocks.", { chunks: evidence.chunks.length, markdownCount });
    assert(client.exceptions.length === 0, "The live renderer reported an exception.", client.exceptions);
    console.log("Live Universal Review Profile Export Check");
    console.log(JSON.stringify({ rendererToBridgeExport: true, chunks: evidence.chunks.length, jsonProfiles: evidence.chunks.length - missing.length, markdownProfiles: markdownCount, serializerPath: result.path, rendererExceptions: 0 }, null, 2));
    console.log("Live Universal review profile export: ok");
  } finally {
    client.socket.close();
    if (!requestedOutputDirectory) fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("Live Universal review profile export failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
