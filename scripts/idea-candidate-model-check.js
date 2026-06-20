const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "idea-candidate-v0.1-contract.json"), "utf8"));
const example = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "idea-candidate-v0.1-example.json"), "utf8"));
const documentation = fs.readFileSync(path.join(ROOT, "IDEA_CANDIDATE_MODEL.md"), "utf8");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
function requireFields(object, fields, label) { for (const field of fields) assert(Object.prototype.hasOwnProperty.call(object, field), `${label} is missing required field: ${field}`); }

function main() {
  assert(contract.contractVersion === "0.1" && contract.implementationStatus === "design_complete", "Idea Candidate contract identity is incorrect.", contract);
  for (const objectName of ["IdeaAnalysisRun", "IdeaCandidate", "EvidenceReference", "CandidateRelationship", "IdeaReviewDecision", "ConfirmedIdeaUnit"]) assert(contract.objects[objectName], `Contract object missing: ${objectName}`);
  requireFields(example.analysisRun, contract.objects.IdeaAnalysisRun.required, "Example IdeaAnalysisRun");
  const coverage = example.analysisRun.coverage;
  const accountedChunks = new Set([...coverage.analyzedChunkIds, ...coverage.skippedChunkIds, ...coverage.blockedChunkIds, ...coverage.failedChunkIds]);
  assert(accountedChunks.size === coverage.expectedChunkCount, "Example coverage does not account for every expected chunk.", coverage);
  assert(coverage.coverageRatio === coverage.analyzedChunkIds.length / coverage.expectedChunkCount, "Example coverage ratio is inaccurate.", coverage);
  assert(example.analysisRun.candidateIds.length === example.candidates.length, "Analysis run candidate index is incomplete.");
  for (const candidate of example.candidates) {
    requireFields(candidate, contract.objects.IdeaCandidate.required, `Candidate ${candidate.id}`);
    assert(contract.objects.IdeaCandidate.candidateTypes.includes(candidate.candidateType), "Candidate type is not supported.", candidate);
    assert(contract.objects.IdeaCandidate.scopes.includes(candidate.scope), "Candidate scope is not supported.", candidate);
    assert(candidate.evidence.length >= contract.objects.IdeaCandidate.minimumEvidenceReferences, "Candidate has no exact evidence.", candidate);
    assert(!Object.prototype.hasOwnProperty.call(candidate, "projectName") && !Object.prototype.hasOwnProperty.call(candidate, "projectId"), "Candidate improperly contains project authority fields.", candidate);
    assert(candidate.confidence.score >= contract.confidence.minimum && candidate.confidence.score <= contract.confidence.maximum, "Candidate confidence is out of range.", candidate.confidence);
    requireFields(candidate.confidence, contract.confidence.requiredFields, `Candidate ${candidate.id} confidence`);
    for (const evidence of candidate.evidence) {
      requireFields(evidence, contract.objects.EvidenceReference.required, `Evidence ${evidence.id}`);
      assert(evidence.fileVersionId === example.analysisRun.sourceScope[0].fileVersionId && evidence.sourceSha256 === example.analysisRun.sourceScope[0].sourceSha256, "Evidence does not match the exact analyzed File Version.", evidence);
      if (evidence.discoveryChunkId) requireFields(evidence, contract.objects.EvidenceReference.exactTextRequires, `Exact text evidence ${evidence.id}`);
    }
  }
  requireFields(example.reviewDecision, contract.objects.IdeaReviewDecision.required, "Example IdeaReviewDecision");
  assert(contract.reviewActions.includes(example.reviewDecision.action), "Review action is not supported.", example.reviewDecision);
  for (const unit of example.confirmedIdeaUnits) {
    requireFields(unit, contract.objects.ConfirmedIdeaUnit.required, `ConfirmedIdeaUnit ${unit.id}`);
    assert(unit.coreAuthority === false && unit.routingAuthority === false, "Confirmed Idea Unit incorrectly has authority.", unit);
    assert(unit.sourceCandidateIds.every((id) => example.candidates.some((candidate) => candidate.id === id)), "Confirmed Idea Unit lost candidate lineage.", unit);
  }
  for (const phrase of ["not a project", "Analysis coverage", "Idea Review Decision", "Confirmed Idea Unit", "Candidate limits cause continuation", "AI Analysis Arm boundary"]) assert(documentation.includes(phrase), `Idea Candidate documentation is missing: ${phrase}`);
  assert(contract.aiArmForbidden.includes("approve_intake") && contract.aiArmForbidden.includes("write_core") && contract.aiArmForbidden.includes("create_human_review_decisions"), "AI authority boundary is incomplete.", contract.aiArmForbidden);
  assert(contract.invariants.some((text) => text.includes("never silent truncation")), "Large-document continuation invariant is missing.");
  console.log("Idea Candidate Model Check");
  console.log(JSON.stringify({ contractVersion: contract.contractVersion, durableObjects: Object.keys(contract.objects).length, candidateTypes: contract.objects.IdeaCandidate.candidateTypes.length, evidenceRequired: true, exactCoverageRequired: true, projectNamingDeferred: true, humanReviewSeparate: true, confirmedUnitsNonCore: true, providerNeutral: true, continuationRequired: true }, null, 2));
  console.log("Idea Candidate model: ok");
}

try { main(); } catch (error) { console.error("Idea Candidate model failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; }
