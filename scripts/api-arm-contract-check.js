const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTRACT_FILE = path.join(ROOT, "fixtures", "api-arm-v0.1-contract.json");
const CONTRACT_DOC = path.join(ROOT, "API_ARM_CONTRACT.md");
const BRIDGE_DOC = path.join(ROOT, "DESKTOP_BRIDGE.md");
const SPINE_DOC = path.join(ROOT, "DESKTOP_STORAGE_SPINE.md");
const README = path.join(ROOT, "README.md");
const APP = path.join(ROOT, "app.js");
const BRIDGE_IMPL = path.join(ROOT, "desktop", "project-state-desktop-bridge.cjs");

const REQUIRED_OPERATIONS = ["describeCapabilities", "submitEnvelope", "getReceipt"];
const REQUIRED_ARM_TYPES = ["calendar", "meeting", "api", "ai", "codex", "notes", "chat", "email", "file", "manual", "other"];
const REQUIRED_PROPOSAL_TYPES = ["ProjectStatus", "Decision", "Fact", "Conflict", "OpenQuestion", "NextAction", "Source", "Relationship"];
const REQUIRED_DEFAULTS = {
  status: "pending",
  reviewState: "needs_review",
  queueState: "new",
  queueNotes: "",
  approval: null,
  archived: false
};
const REQUIRED_FORBIDDEN_FIELDS = ["status", "reviewState", "queueState", "approval", "approvedBy", "archived", "changeHistory", "trustLevel", "managedPath", "fileBytes", "credentials", "secrets"];
const REQUIRED_ERRORS = ["UNSUPPORTED_CONTRACT_VERSION", "INVALID_ENVELOPE", "INVALID_TARGET_PROJECT", "INVALID_PROPOSAL_TYPE", "FORBIDDEN_FIELD", "IDEMPOTENCY_CONFLICT", "DESKTOP_RUNTIME_REQUIRED", "PERSISTENCE_FAILED"];
const REQUIRED_AUTHORITY_PHRASES = ["desktop Intake Airlock only", "not approval or truth", "must not write directly to Core Project State", "approve each item individually", "Browser/dev mode is not a production ingestion path"];

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function missing(required, actual = []) {
  return required.filter((value) => !actual.includes(value));
}

function arrayLiteralValues(source, constantName) {
  const match = source.match(new RegExp(`const ${constantName} = \\[([^;]+)\\];`));
  assert(match, `Could not find ${constantName} in app.js.`);
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((entry) => entry[1]);
}

function proposalTypes(source) {
  const start = source.indexOf("function normalizeProposedObjectType");
  const end = source.indexOf("function extractModeLabel", start);
  assert(start >= 0 && end > start, "Could not find the current proposed-object type normalizer.");
  return [...source.slice(start, end).matchAll(/["']([A-Z][A-Za-z]+)["']/g)].map((entry) => entry[1]);
}

function validateContract(contract) {
  assert(contract.app === "Project State", "Contract app mismatch.");
  assert(contract.contractType === "api-arm-intake", "Contract type mismatch.");
  assert(contract.contractVersion === "0.1", "Contract version mismatch.");
  assert(contract.direction === "inbound-proposals-only", "API arm direction must be inbound proposals only.");
  assert(contract.runtime === "desktop-required", "API arm contract must require desktop runtime.");
  assert(contract.implementationStatus === "desktop-adapter", "v0.1 desktop adapter implementation status is missing.");

  for (const [label, required, actual] of [
    ["operations", REQUIRED_OPERATIONS, contract.operations],
    ["arm types", REQUIRED_ARM_TYPES, contract.allowedArmTypes],
    ["proposal types", REQUIRED_PROPOSAL_TYPES, contract.allowedProposalTypes],
    ["forbidden fields", REQUIRED_FORBIDDEN_FIELDS, contract.forbiddenSubmissionFields],
    ["error codes", REQUIRED_ERRORS, contract.errorCodes]
  ]) {
    const absent = missing(required, actual);
    assert(!absent.length, `API arm contract is missing ${label}.`, { missing: absent });
  }

  for (const [field, expected] of Object.entries(REQUIRED_DEFAULTS)) {
    assert(Object.hasOwn(contract.serverOwnedIntakeDefaults || {}, field), `API arm contract is missing server-owned default ${field}.`);
    assert(contract.serverOwnedIntakeDefaults[field] === expected, `Server-owned default ${field} does not match Intake.`, { expected, actual: contract.serverOwnedIntakeDefaults[field] });
  }
  assert(Array.isArray(contract.serverOwnedIntakeDefaults.assignments) && !contract.serverOwnedIntakeDefaults.assignments.length, "Assignments must start empty.");
  assert(Array.isArray(contract.serverOwnedIntakeDefaults.comments) && !contract.serverOwnedIntakeDefaults.comments.length, "Comments must start empty.");
  assert(contract.receiptBoundary === "airlock_pending_human_review", "Receipt boundary must state pending human review.");

  const authorityText = (contract.authorityRules || []).join("\n");
  const absentAuthority = REQUIRED_AUTHORITY_PHRASES.filter((phrase) => !authorityText.includes(phrase));
  assert(!absentAuthority.length, "API arm contract is missing authority rules.", { missing: absentAuthority });
  assert((contract.idempotencyRules || []).some((rule) => rule.includes("does not partially accept")), "Contract must reject partial batch acceptance.");
  assert((contract.idempotencyRules || []).some((rule) => rule.includes("transactional")), "Contract must make acceptance and receipt transactional.");

  return {
    operations: contract.operations.length,
    armTypes: contract.allowedArmTypes.length,
    proposalTypes: contract.allowedProposalTypes.length,
    forbiddenFields: contract.forbiddenSubmissionFields.length,
    errorCodes: contract.errorCodes.length
  };
}

function validateCurrentModel(contract, appSource) {
  const currentArmTypes = arrayLiteralValues(appSource, "ARM_TYPES");
  const currentProposalTypes = proposalTypes(appSource);
  assert(!missing(currentArmTypes, contract.allowedArmTypes).length && !missing(contract.allowedArmTypes, currentArmTypes).length, "Contract arm types drifted from app.js.", { contract: contract.allowedArmTypes, app: currentArmTypes });
  assert(!missing(currentProposalTypes, contract.allowedProposalTypes).length && !missing(contract.allowedProposalTypes, currentProposalTypes).length, "Contract proposal types drifted from app.js.", { contract: contract.allowedProposalTypes, app: currentProposalTypes });
  assert(appSource.includes('status: "pending"'), "Current Intake model no longer defaults status to pending.");
  assert(appSource.includes('reviewState: "needs_review"'), "Current Intake model no longer defaults review state to needs_review.");
  assert(appSource.includes('queueState: "new"'), "Current Intake model no longer defaults queue state to new.");
  assert(appSource.includes('saveStore({ allowWithoutCoreApproval: true, reason: "intake-only" })'), "Current Intake creation no longer uses the intake-only persistence path.");
  assert(appSource.includes("applyApprovedIntakeToCore"), "Current human-approved Intake-to-Core path is missing.");
  return { currentModelAligned: true };
}

function validateDocs(contractDoc, bridgeDoc, spineDoc, readme) {
  const contractTerms = [
    "inbound proposal contract",
    "must not silently convert",
    "does not partially accept",
    "airlock_pending_human_review",
    "No provider-specific external API integration is installed",
    "fixtures/api-arm-v0.1-contract.json"
  ];
  const missingTerms = contractTerms.filter((term) => !contractDoc.includes(term));
  assert(!missingTerms.length, "API arm contract documentation is incomplete.", { missing: missingTerms });
  assert(bridgeDoc.includes("API_ARM_CONTRACT.md"), "Desktop bridge doc does not point to the API arm contract.");
  assert(spineDoc.includes("API Arm Contract v0.1"), "Desktop spine doc does not point to API Arm Contract v0.1.");
  assert(readme.includes("API_ARM_CONTRACT.md"), "README does not point to the API arm contract.");
  assert(readme.includes("No provider-specific calendar, email, chat, or Codex connector is installed yet") && readme.includes("Local AI analysis can optionally use Qwen3 8B"), "README must distinguish local AI from provider-specific cloud/API integrations.");
  return { documentationAligned: true };
}

function validateDesktopAdapter(bridgeSource, appSource) {
  const requiredBridgePieces = [
    "intakeArms:",
    "describeApiArmCapabilities",
    "submitApiArmEnvelope",
    "getApiArmReceipt",
    "validateApiArmEnvelope",
    "IDEMPOTENCY_CONFLICT",
    "mergePersistedApiArmIntake"
  ];
  const missingBridgePieces = requiredBridgePieces.filter((piece) => !bridgeSource.includes(piece));
  assert(!missingBridgePieces.length, "Desktop API arm adapter implementation is incomplete.", { missing: missingBridgePieces });
  assert(appSource.includes("intakeBatches: []"), "App store does not retain Intake batches.");
  assert(appSource.includes("intakeBatches: cloneRecord(nextStore.intakeBatches || [])"), "App split-store path does not persist Intake batches.");
  return { desktopAdapterAligned: true };
}

function main() {
  const contract = JSON.parse(readText(CONTRACT_FILE));
  const summary = validateContract(contract);
  const model = validateCurrentModel(contract, readText(APP));
  const docs = validateDocs(readText(CONTRACT_DOC), readText(BRIDGE_DOC), readText(SPINE_DOC), readText(README));
  const adapter = validateDesktopAdapter(readText(BRIDGE_IMPL), readText(APP));
  console.log("API Arm Contract Check");
  console.log(JSON.stringify({ contractVersion: contract.contractVersion, ...summary, ...model, ...docs, ...adapter }, null, 2));
  console.log("API arm contract: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("API arm contract failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
