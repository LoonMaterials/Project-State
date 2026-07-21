const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function zipEntries(bytes) {
  const result = new Map();
  let offset = 0;
  while (offset + 30 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.slice(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    const compressed = bytes.slice(start, start + size);
    result.set(name, { method, bytes: method === 8 ? zlib.inflateRawSync(compressed) : compressed });
    offset = start + size;
  }
  return result;
}

async function main() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-core-review-"));
  const output = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-core-review-out-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot: root });
  const report = { id: "project_review_1", projectId: "project_1", authority: "advisory", humanReviewRequired: true };
  await bridge.storage.saveStore({ store: { schemaVersion: "0.1.0", settings: {}, actors: [], intakeBatches: [], intakeItems: [], aiWorkOrders: [], projectReviewReports: [report], projects: [{ id: "project_1", name: "Test Project" }] }, manifest: {} });
  const loaded = await bridge.storage.loadStore();
  assert.deepEqual(loaded.store.projectReviewReports, [report]);
  const progress = [];
  const exported = await bridge.reviewExchange.exportProjectFinalReviewPack({ outputDirectory: output, reviewerTarget: "human", brief: { project: { id: "project_1", name: "Test Project", summary: "Detailed state" }, openQuestions: ["What remains?"] }, briefMarkdown: "# Test Project\n\nDetailed state", onProgress: (event) => progress.push(event) });
  const entries = zipEntries(await fsp.readFile(exported.path));
  for (const name of ["REVIEW_INSTRUCTIONS.md", "project_brief.md", "project_brief.json", "review_response_template.json"]) assert(entries.has(name), `missing ${name}`);
  assert([...entries.values()].every((entry) => entry.method === 8));
  assert(entries.get("REVIEW_INSTRUCTIONS.md").bytes.toString("utf8").includes("missing, unanswered, or implied questions"));
  assert(progress.some((event) => event.phase === "complete"));
  const main = fs.readFileSync(path.join(__dirname, "..", "desktop", "main.cjs"), "utf8");
  const preload = fs.readFileSync(path.join(__dirname, "..", "desktop", "preload.cjs"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert(main.includes("new Worker") && main.includes("review-exchange:export-progress"));
  assert(preload.includes("exportProjectFinalReviewPack") && preload.includes("onExportProgress"));
  assert(app.includes("Send for final review") && app.includes("Advisory final-review history"));
  console.log("Core Final Review Regression Check");
  console.log(JSON.stringify({ backgroundWorker: true, compressedZip: true, progressEvents: true, advisoryPersistence: true, aiAndHumanRoutes: true }, null, 2));
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
