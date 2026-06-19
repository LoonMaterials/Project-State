const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "security-arm-v0.1-contract.json"), "utf8"));
const document = fs.readFileSync(path.join(ROOT, "SECURITY_ARM_CONTRACT.md"), "utf8");
const discovery = fs.readFileSync(path.join(ROOT, "fixtures", "discovery-v0.1-contract.json"), "utf8");

function main() {
  assert.equal(contract.contractType, "SecurityArm");
  assert.equal(contract.contractVersion, "0.1");
  assert.equal(contract.requiredAtFirstRun, true);
  assert.equal(contract.failClosed, true);
  assert.deepEqual(contract.contentEligibleVerdicts, ["clean"]);

  for (const operation of ["describeCapabilities", "healthCheck", "scanStagedFile", "getScanReceipt", "rescanStagedFile", "revokeProvider"]) {
    assert(contract.operations.includes(operation), `Security Arm operation missing: ${operation}`);
  }
  for (const verdict of ["clean", "threat_detected", "suspicious", "unknown", "error"]) {
    assert(contract.verdicts.includes(verdict), `Security verdict missing: ${verdict}`);
  }
  for (const errorCode of ["SECURITY_ARM_NOT_CONFIGURED", "SECURITY_ARM_UNAVAILABLE", "SCAN_FAILED", "THREAT_DETECTED", "SECURITY_RECEIPT_STALE", "SCAN_SCOPE_REJECTED"]) {
    assert(contract.stableErrors.includes(errorCode), `Security error missing: ${errorCode}`);
  }
  for (const forbidden of ["approveIntake", "writeCore", "deleteOriginalFile", "scanArbitraryPath", "rewriteReceiptHistory"]) {
    assert(contract.forbiddenAuthority.includes(forbidden), `Security authority prohibition missing: ${forbidden}`);
  }

  assert(document.includes("No preview, thumbnail generation, extraction, indexing, OCR, summarization, AI transmission"));
  assert(document.includes("Only `clean` may permit content access."));
  assert(document.includes("Aether initially targets a Windows Defender adapter."));
  assert(discovery.includes('"security"'));

  console.log("Security Arm Contract Check");
  console.log(JSON.stringify({ version: contract.contractVersion, operations: contract.operations.length, verdicts: contract.verdicts.length, stableErrors: contract.stableErrors.length, forbiddenAuthority: contract.forbiddenAuthority.length, failClosed: contract.failClosed }, null, 2));
  console.log("Security Arm contract: ok");
}

try {
  main();
} catch (error) {
  console.error("Security Arm contract check failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
