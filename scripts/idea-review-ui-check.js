const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message) { if (!condition) throw new Error(message); }
function main() {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "..", "desktop", "project-state-desktop-bridge.cjs"), "utf8");
  const requiredUi = ["AI follow-up now belongs in AI Work Orders", "Create AI Work Order", "Create Large-file/folder AI Work Order", "No AI is called from this Discovery screen.", "Working file-based name, only if treated as one item", "async function createDiscoveryAiWorkOrders"];
  for (const text of requiredUi) assert(app.includes(text), `Idea Review UI missing: ${text}`);
  for (const text of ["readChunkText", "authorizeTransmission", "submitAnalysisBatch", "recordReviewDecision", "describeLocalAiProviders", "generateQwenIdeaCandidates", "realProviderInstalled"]) assert(bridge.includes(text), `Idea Review bridge boundary missing: ${text}`);
  for (const removed of ["function runFakeIdeaAnalysis", "function renderIdeaCandidateReview", "data-run-idea-analysis", "Retry local AI idea analysis", "Analyzing exact chunks locally", "Confirm idea review"]) {
    assert(!app.includes(removed), `Discovery screen still exposes removed inline AI analysis path: ${removed}`);
  }
  assert(!app.includes("platformAdapter.analysis.recordReviewDecision"), "Discovery screen should not record AI idea-review decisions inline.");
  assert(app.includes("No AI is called from this Discovery screen.") && app.includes("Create Large-file/folder AI Work Order"), "Discovery should route AI follow-up to AI Work Orders instead of running it inline.");
  assert(app.includes('coreAuthority: false') || bridge.includes('coreAuthority: false'), "Confirmed Idea Units do not explicitly remain non-Core.");
  console.log("Idea Review UI Check");
  console.log(JSON.stringify({ localAiArmOptional: true, qwenProviderSlot: true, discoveryAiInlineRemoved: true, aiFollowUpRoutesToWorkOrders: true, confirmedUnitsNonCore: true }, null, 2));
  console.log("Idea Review UI: ok");
}

try { main(); } catch (error) { console.error("Idea Review UI failed:"); console.error(error.message); process.exitCode = 1; }
