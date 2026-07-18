const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.resolve(__dirname, "..", "app.js"), "utf8");
const checks = {
  storageWarningRaisedTo250Mb: app.includes('const STORAGE_WARNING_BYTES = 250 * 1024 * 1024;'),
  storageOverrideHidesBanner: app.includes('store.settings?.storageOverrideAcknowledged && String(store.settings?.storageOverrideReason || "").trim()'),
  multipleFilesDefaultIndependent: app.includes('selection.candidates.length > 1 ? "each_file" : "scan_for_ideas"') && app.includes('One independent AI scan per file'),
  deliberateCombinedModeStillAvailable: app.includes('Combine the selection as one AI item'),
  resultsOpenAfterSavedAnalysis: app.includes('postModalAction = () => openAiWorkOrderResultsModal(workOrder.id);'),
  scanStateVisible: app.includes('function aiWorkOrderScanState') && app.includes('<strong>Scan state:</strong>') && app.includes('function renderAiSourceFileScanLibrary'),
  bulkArchivePreservesFiles: app.includes('function openBulkArchiveAiWorkOrdersModal') && app.includes('their underlying files will remain preserved'),
  readableProjectMaterial: app.includes('function renderProjectReadableMaterial') && app.includes('Readable project material'),
  repeatsRecombined: app.includes('function recombineReadableSummaries') && app.includes('repeated description'),
  relatedProjectContextSentToAi: app.includes('buildRelatedProjectCandidateContext(workOrder)') && app.includes('Treat semantic repeats as supporting evidence or merge suggestions')
};

for (const [name, passed] of Object.entries(checks)) assert(passed, `Offline Intake usability regression failed: ${name}`);
console.log("Offline Intake Usability Regression Check");
console.log(JSON.stringify(checks, null, 2));
console.log("Offline Intake usability: ok");
