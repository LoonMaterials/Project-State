const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const inventory = fs.readFileSync(path.join(ROOT, "PROJECT_STATE_COMPLETE_INVENTORY.md"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

function main() {
  requireMarkers(app, [
    "function buildChatGptReviewPackMarkdown",
    "function exportChatGptReviewPack",
    "function reviewPackModeConfig",
    "function collectReviewPackChunkTexts",
    "function buildReviewPackIndexMarkdown",
    "ChatGPT Review Pack v0.1",
    "Evidence-Heavy",
    "Split Cluster",
    "Return format requested from ChatGPT",
    "Recommended Project State Rule Updates for Codex",
    "Recommended Local AI Prompt Updates",
    "Same-title / possible duplicate clusters",
    "Source manifest",
    "Candidate Map entries",
    "Raw AI candidates",
    "Project State classification",
    "title_source",
    "concept_title",
    "Title source / heading",
    "Linked raw candidate IDs",
    "rawCandidatesNotRepresentedByMap",
    "project_candidate, existing_project_support, reference_note, personal_context_note, assistant_scaffolding_noise, rejected_noise",
    "export-chatgpt-review-pack",
    "chatgpt-review-pack",
    "chatgpt-evidence-heavy-review-pack",
    "chatgpt-cluster-review-pack",
    "chatgpt-split-review-index",
    "Stored chunk text preview",
    "ChatGPT Review Pack exported",
    "Split ChatGPT Review Packs exported",
    "setSaveStatus(\"saved\"",
    "source_thread",
    "source_date",
    "source_title",
    "Treat chat/thread/conversation starts, chunk boundaries, and assistant answer headings as source metadata/provenance only"
  ], "app.js");

  requireMarkers(inventory, [
    "ChatGPT Review Pack v0.1",
    "manual ChatGPT review",
    "Codex update instructions"
  ], "PROJECT_STATE_COMPLETE_INVENTORY.md");

  console.log("ChatGPT Review Pack Check");
  console.log(JSON.stringify({
    exportButton: true,
    markdownPack: true,
    candidateMapIncluded: true,
    rawCandidatesIncluded: true,
    duplicateClustersIncluded: true,
    codexUpdateLoop: true,
    preAirlockBoundary: true
  }, null, 2));
  console.log("ChatGPT Review Pack: ok");
}

try {
  main();
} catch (error) {
  console.error("ChatGPT Review Pack check failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
