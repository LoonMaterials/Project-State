const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "discovery-v0.1-contract.json"), "utf8"));
const design = fs.readFileSync(path.join(ROOT, "DISCOVERY_FIRST_SYSTEM.md"), "utf8");
const inventory = fs.readFileSync(path.join(ROOT, "PROJECT_STATE_COMPLETE_INVENTORY.md"), "utf8");

function includesAll(values, required) {
  return required.filter((value) => !values.includes(value));
}

function main() {
  assert.equal(contract.contractType, "Discovery");
  assert.equal(contract.contractVersion, "0.1");
  assert.equal(contract.implementationStatus, "rebuild_in_progress_external_security_boundary");

  const requiredSequence = ["add", "external_security_acknowledgment", "stage", "extract", "discovery", "questions", "routing", "intake", "human_approval", "core"];
  assert.deepEqual(contract.governingSequence, requiredSequence, "Discovery governing sequence drifted.");

  const missingOperations = includesAll(contract.operations, ["createCase", "attachFileAssets", "recordAnswers", "confirmRouting", "promoteToIntake"]);
  assert.deepEqual(missingOperations, [], "Discovery contract is missing operations.");

  const missingObjects = includesAll(contract.requiredFoundationObjects, ["FileAsset", "FileVersion", "DiscoveryCase", "Interaction", "ExternalSecurityAcknowledgment", "DiscoveryEvent"]);
  assert.deepEqual(missingObjects, [], "Discovery foundation objects drifted.");

  const missingDestinations = includesAll(contract.destinations, ["existing_project", "additional_project_link", "proposed_new_project", "general_reference", "orphaned_idea", "ai_work_order", "large_ai_work_order", "unassigned", "rejected"]);
  assert.deepEqual(missingDestinations, [], "Discovery destination model drifted.");

  for (const text of [
    "Project State does not scan files or claim they are safe.",
    "Discovery does not require a project.",
    "AI follow-up routes create AI Work Orders",
    "Human approval is required before Core changes.",
    "One File Asset may link to multiple projects"
  ]) assert(design.includes(text) || contract.invariants.some((item) => item.includes(text)), `Missing Discovery invariant: ${text}`);

  assert(inventory.includes("## 20. Approved Discovery-First Next Stage"));
  assert(inventory.includes("Discovery rebuild without bundled antivirus"));

  console.log("Discovery Contract Check");
  console.log(JSON.stringify({ version: contract.contractVersion, stages: contract.governingSequence.length, operations: contract.operations.length, objects: contract.requiredFoundationObjects.length, destinations: contract.destinations.length, invariants: contract.invariants.length }, null, 2));
  console.log("Discovery contract: ok");
}

try {
  main();
} catch (error) {
  console.error("Discovery contract check failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
