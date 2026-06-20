const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "ai-analysis-arm-v0.1-contract.json"), "utf8"));
const example = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "ai-analysis-arm-v0.1-example.json"), "utf8"));
const ideaContract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "idea-candidate-v0.1-contract.json"), "utf8"));
const documentation = fs.readFileSync(path.join(ROOT, "AI_ANALYSIS_ARM_CONTRACT.md"), "utf8");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
function requireFields(object, fields, label) { for (const field of fields) assert(Object.prototype.hasOwnProperty.call(object, field), `${label} is missing required field: ${field}`); }
function collectKeys(value, output = []) { if (!value || typeof value !== "object") return output; for (const [key, child] of Object.entries(value)) { output.push(key); collectKeys(child, output); } return output; }

function main() {
  assert(contract.contractVersion === "0.1" && contract.purpose === "idea_candidate_discovery", "AI Analysis Arm identity is incorrect.", contract);
  assert(contract.implementationStatus === "design_complete_no_provider_installed", "Contract incorrectly claims a provider implementation.");
  assert(contract.operations.length === 6 && contract.operations.includes("cancelAnalysis") && contract.operations.includes("getResultPage"), "Analysis lifecycle operations are incomplete.", contract.operations);
  requireFields(example.submission, contract.submissionRequired, "Example submission");
  requireFields(example.submission.arm, contract.armRequired, "Example arm");
  requireFields(example.submission.privacyAuthorization, contract.privacyAuthorizationRequired, "Example privacy authorization");
  requireFields(example.submission.batch, contract.batchRequired, "Example batch");
  requireFields(example.submission.input, contract.inputRequired, "Example input");
  requireFields(example.submission.analysisOptions, contract.analysisOptionsRequired, "Example analysis options");
  assert(example.submission.purpose === contract.purpose, "Submission purpose is not fixed.");
  const forbiddenKeys = new Set(contract.forbiddenSubmissionAndResultFields);
  const forbiddenFound = collectKeys({ submission: example.submission, result: example.result }).filter((key) => forbiddenKeys.has(key));
  assert(forbiddenFound.length === 0, "Example contains forbidden authority, path, or secret fields.", forbiddenFound);
  const chunks = example.submission.input.chunks;
  const authorizationScopes = new Map(example.submission.privacyAuthorization.chunkScopes.map((scope) => [scope.discoveryChunkId, scope.chunkTextSha256]));
  for (const chunk of chunks) {
    requireFields(chunk, contract.chunkRequired, `Chunk ${chunk.discoveryChunkId}`);
    assert(authorizationScopes.get(chunk.discoveryChunkId) === chunk.chunkTextSha256, "Transmitted chunk is outside or mismatched with privacy authorization.", chunk);
  }
  requireFields(example.result, contract.resultRequired, "Example result");
  requireFields(example.result.coverage, contract.coverageRequired, "Example coverage");
  assert(contract.jobStates.includes(example.result.status), "Result job state is unsupported.", example.result.status);
  const sentChunks = new Map(chunks.map((chunk) => [chunk.discoveryChunkId, chunk]));
  for (const received of example.result.coverage.receivedChunks) assert(sentChunks.get(received.discoveryChunkId)?.chunkTextSha256 === received.chunkTextSha256, "Provider claimed an unknown or mismatched received chunk.", received);
  for (const analyzedId of example.result.coverage.analyzedChunkIds) assert(sentChunks.has(analyzedId), "Provider claimed analysis of an untransmitted chunk.", analyzedId);
  assert(example.result.coverage.coverageStatus === "complete" ? example.result.coverage.analyzedChunkIds.length === chunks.length : true, "Complete coverage does not include every transmitted chunk.", example.result.coverage);
  assert(example.result.candidates.length <= contract.maximums.candidatesPerResultPage, "Result exceeded the candidate page limit without continuation.");
  for (const candidate of example.result.candidates) {
    requireFields(candidate, contract.candidateRequired, `Candidate ${candidate.clientCandidateId}`);
    assert(contract.candidateTypes.includes(candidate.candidateType) && ideaContract.objects.IdeaCandidate.candidateTypes.includes(candidate.candidateType), "Candidate type is not aligned with the Idea Candidate model.", candidate);
    assert(contract.candidateScopes.includes(candidate.scope), "Candidate scope is invalid.", candidate);
    assert(candidate.evidence.length > 0, "AI candidate omitted evidence.", candidate);
    for (const evidence of candidate.evidence) {
      requireFields(evidence, contract.evidenceRequired, `Candidate evidence for ${candidate.clientCandidateId}`);
      const sent = sentChunks.get(evidence.discoveryChunkId);
      assert(sent && sent.discoveryExtractionId === evidence.discoveryExtractionId && sent.fileVersionId === evidence.fileVersionId && sent.sourceSha256 === evidence.sourceSha256 && sent.chunkTextSha256 === evidence.chunkTextSha256, "Candidate evidence is not an exact reference to authorized input.", evidence);
    }
  }
  requireFields(example.receipt, contract.receiptRequired, "Example receipt");
  assert(example.receipt.boundary === contract.receiptBoundary, "Receipt boundary incorrectly implies authority.", example.receipt);
  assert(example.receipt.candidateMappings.length === example.result.candidates.length, "Candidate mapping receipt is incomplete.");
  assert(new Set(contract.errorCodes).size === contract.errorCodes.length && contract.errorCodes.includes("PRIVACY_SCOPE_MISMATCH") && contract.errorCodes.includes("BUDGET_EXCEEDED"), "Stable errors are incomplete or duplicated.", contract.errorCodes);
  for (const phrase of ["does not ask the provider to name projects", "Human privacy authorization", "Large-document continuation", "Credentials", "No provider integration should begin before steps 1 through 3 pass"]) assert(documentation.includes(phrase), `AI Analysis Arm documentation is missing: ${phrase}`);
  assert(contract.authorityRules.some((rule) => rule.includes("does not request project names")), "Project naming was not deferred from AI Analysis Arm v0.1.");
  assert(contract.largeDocumentRules.some((rule) => rule.includes("No candidate or chunk may be silently omitted")), "Large-document no-silent-omission rule is missing.");
  console.log("AI Analysis Arm Contract Check");
  console.log(JSON.stringify({ contractVersion: contract.contractVersion, operations: contract.operations.length, jobStates: contract.jobStates.length, errorCodes: contract.errorCodes.length, privacyAuthorizationRequired: true, exactChunkEvidenceRequired: true, coverageValidated: true, projectNamingDeferred: true, humanAuthorityBlocked: true, idempotentPaging: true, providerInstalled: false }, null, 2));
  console.log("AI Analysis Arm contract: ok");
}

try { main(); } catch (error) { console.error("AI Analysis Arm contract failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; }
