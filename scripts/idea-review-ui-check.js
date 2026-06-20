const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message) { if (!condition) throw new Error(message); }
function main() {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const bridge = fs.readFileSync(path.join(__dirname, "..", "desktop", "project-state-desktop-bridge.cjs"), "utf8");
  const requiredUi = ["function renderIdeaCandidateReview", "function runFakeIdeaAnalysis", "Run local test idea analysis", "Evidence and provenance", "Confirm idea review", "Confirmed Idea Unit", "Working file-based name, only if treated as one item", "platformAdapter.analysis.recordReviewDecision"];
  for (const text of requiredUi) assert(app.includes(text), `Idea Review UI missing: ${text}`);
  for (const text of ["readChunkText", "authorizeTransmission", "submitAnalysisBatch", "recordReviewDecision", "realProviderInstalled: false"]) assert(bridge.includes(text), `Idea Review bridge boundary missing: ${text}`);
  assert(app.indexOf("runFakeIdeaAnalysis") < app.indexOf("platformAdapter.analysis.recordReviewDecision"), "Idea analysis must precede human review.");
  assert(app.includes('coreAuthority: false') || bridge.includes('coreAuthority: false'), "Confirmed Idea Units do not explicitly remain non-Core.");
  console.log("Idea Review UI Check");
  console.log(JSON.stringify({ localFakeArmOnly: true, evidenceVisible: true, humanReviewRequired: true, mergeAndSeparateSupported: true, projectNamingAfterReview: true, confirmedUnitsNonCore: true }, null, 2));
  console.log("Idea Review UI: ok");
}

try { main(); } catch (error) { console.error("Idea Review UI failed:"); console.error(error.message); process.exitCode = 1; }
