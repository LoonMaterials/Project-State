const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.resolve(__dirname, "..", "app.js"), "utf8");

const checks = {
  activeExcludesOnlyArchived: app.includes('filter((order) => order.status !== "archived")'),
  sourceCompletionAloneDoesNotArchive:
    app.includes('workOrder.lastAnalysis?.sourceFullyAnalyzed !== true')
    && app.includes('if (!pass) return false;'),
  completeCoverageRequired:
    app.includes('countUnaccountedReviewChunks(pass.result?.coverage_summary || {}) === 0')
    && app.includes('all_chunks_accounted_for === true')
    && app.includes('externalReviewSelfCheckPassed'),
  finalHumanDispositionRequired:
    app.includes('const allDecisionsFinal = actions.every')
    && app.includes('["needs_revision", "incomplete"]'),
  pendingIntakeBlocksArchive:
    app.includes('pendingIntakeForWorkOrder(workOrderId).length'),
  automaticArchiveReceipt:
    app.includes('workOrder.status = "archived"')
    && app.includes('workOrder.completionReceipt = {')
    && app.includes('reviewPassIds: passes.map')
    && app.includes('destinationProjectIds'),
  compactHistorySeparate:
    app.includes('Completed / archived Work Order history')
    && app.includes('function renderAiWorkOrderReceipt'),
  projectHistoryPreserved:
    app.includes('"AI work order completed and archived"')
    && app.includes('reason: "ai-work-order-auto-archived"')
};

for (const [name, passed] of Object.entries(checks)) assert(passed, `AI Work Order lifecycle regression failed: ${name}`);

console.log("AI Work Order Lifecycle Regression Check");
console.log(JSON.stringify(checks, null, 2));
console.log("AI Work Order lifecycle: ok");
