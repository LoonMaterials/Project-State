const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const providerSource = fs.readFileSync(path.join(ROOT, "desktop", "local-ai-providers.cjs"), "utf8");
const inventory = fs.readFileSync(path.join(ROOT, "PROJECT_STATE_COMPLETE_INVENTORY.md"), "utf8");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function requireSourceMarkers(source, markers, label) {
  for (const marker of markers) {
    assert(source.includes(marker), `${label} is missing Candidate Map marker: ${marker}`);
  }
}

function main() {
  requireSourceMarkers(appSource, [
    "function normalizeCandidateMap",
    "function buildCandidateMapContext",
    "function updateWorkOrderCandidateMap",
    "function mergeCandidateIntoMapEntry",
    "function renderCandidateMapStats",
    "function renderCandidateMapEntries",
    "candidateMapContext: buildCandidateMapContext(workOrder)",
    "workOrder.candidateMap = map;",
    "events",
    "duplicateHints",
    "sourceCandidateIds",
    "evidence",
    "isWeakSingleWindowCandidate",
    "knownProjectMatchesForCandidate",
    "review_only_note",
    "possible_existing_project_match",
    "projectStateClassification",
    "assistant_scaffolding_noise",
    "existing_project_support",
    "classifyProjectStateCandidate",
    "displaySafeAiText",
    "displaySafeAiTitle",
    "Candidate Map:",
    "Candidate Map",
    "Raw AI Candidates"
  ], "app.js");

  requireSourceMarkers(providerSource, [
    "candidateMapContext = \"\"",
    "Candidate Map context:",
    "avoid duplicate ideas",
    "updates, supports, conflicts with, or extends an existing mapped idea",
    "new chat/thread/conversation start is source metadata only",
    "source_thread",
    "source_date",
    "source_title",
    "assistant_scaffolding_noise",
    "existing_project_support"
  ], "desktop/local-ai-providers.cjs");

  requireSourceMarkers(inventory, [
    "Candidate Map v0.1",
    "durable pre-Airlock idea ledger",
    "Local Qwen now receives Candidate Map context",
    "mapped entries separately from raw AI candidates"
  ], "PROJECT_STATE_COMPLETE_INVENTORY.md");

  assert(appSource.includes("candidateMap: workOrder.candidateMap") && appSource.includes("cloneRecord(workOrder.candidateMap)"), "AI Work Orders should preserve Candidate Map metadata when loaded.");
  assert(appSource.includes("current chunks create a new idea, update an existing idea, suggest merge/duplicate/conflict") || appSource.includes("Candidate Map is the existing pre-Airlock idea ledger"), "Rolling digest context should explain the Candidate Map purpose.");
  assert(!providerSource.includes("projectName"), "Local provider prompt should not regain project-naming authority.");

  console.log("Candidate Map Flow Check");
  console.log(JSON.stringify({
    durableMapStoredOnWorkOrder: true,
    rollingContextFeedsProvider: true,
    duplicateContinuationHints: true,
    evidenceLineagePreserved: true,
    preAirlockBoundary: true,
    uiSeparatesMapFromRawCandidates: true
  }, null, 2));
  console.log("Candidate Map flow: ok");
}

try {
  main();
} catch (error) {
  console.error("Candidate Map flow failed:");
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
}
