const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const providerSource = fs.readFileSync(path.join(ROOT, "desktop", "local-ai-providers.cjs"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) assert(source.includes(marker), `${label} missing marker: ${marker}`);
}

try {
  requireMarkers(appSource, [
    "function buildKnownProjectEnrichmentContext",
    "Known Project Enrichment lane is active.",
    "projectKnownMatchText(project)",
    "projectSourceTitleMatch(project, candidateText)",
    "function projectEvidenceRoleForCandidate",
    "enrichmentTargetProjectIds",
    "projectEvidenceRole",
    "Existing project enrichment:",
    "candidateMapContext: [buildKnownProjectEnrichmentContext(), buildCandidateMapContext(workOrder)]"
  ], "app existing-project enrichment");

  requireMarkers(providerSource, [
    "Known Project Enrichment",
    "compare every substantive chunk against the listed active projects before creating new project candidates",
    "duplicate_or_confirming_reference",
    "validation_or_test_support",
    "risk_or_contradiction",
    "patent_licensing_or_outreach_support",
    "pre-Airlock"
  ], "provider existing-project enrichment prompt");

  assert(appSource.indexOf("buildKnownProjectEnrichmentContext()") < appSource.indexOf("buildCandidateMapContext(workOrder)"), "Known project enrichment context must be presented before Candidate Map context.");
  assert(appSource.includes("projectEvidenceRoleForCandidate(candidate, projectMatches)") && appSource.includes("projectMatches.length ? \"possible_existing_project_match\""), "Candidate Map entries must keep existing-project support review status.");

  console.log("Existing Project Enrichment Regression Check");
  console.log(JSON.stringify({
    knownProjectsProvidedBeforeCandidateMap: true,
    projectMemoryMatching: true,
    sourceTitleMatching: true,
    enrichmentTargetStored: true,
    evidenceRoleStored: true,
    preAirlockBoundaryPrompted: true
  }, null, 2));
  console.log("Existing project enrichment regression: ok");
} catch (error) {
  console.error("Existing project enrichment regression failed:");
  console.error(error.message);
  process.exitCode = 1;
}
