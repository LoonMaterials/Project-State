const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "file-arm-v0.1-contract.json"), "utf8"));
const doc = fs.readFileSync(path.join(ROOT, "FILE_ARM_CONTRACT.md"), "utf8");
const fileIntake = fs.readFileSync(path.join(ROOT, "desktop", "api-arm-file-intake.cjs"), "utf8");
const transport = fs.readFileSync(path.join(ROOT, "desktop", "api-arm-transport.cjs"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
const bridge = fs.readFileSync(path.join(ROOT, "desktop", "project-state-desktop-bridge.cjs"), "utf8");
const connector = fs.readFileSync(path.join(ROOT, "scripts", "api-arm-submit-file.js"), "utf8");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function main() {
  assert(contract.contractType === "file-arm-intake", "File Arm contract type mismatch.");
  assert(contract.contractVersion === "0.1", "File Arm contract version mismatch.");
  assert(contract.endpoint.path === "/v0.1/files", "File Arm endpoint mismatch.");
  assert(contract.limits.maxFileBytes === 26214400, "File size limit mismatch.");
  assert(contract.approvalRequired === true, "File approval requirement is missing.");
  assert(contract.extractAutomatically === false, "File uploads must not auto-extract.");
  assert(contract.responseExposesManagedPath === false, "File responses must not expose managed paths.");
  assert(contract.allowedExtensions.length === 11, "Allowed file extension set mismatch.");
  assert(fileIntake.includes("checksumBytes(bytes)"), "File Intake does not compute a checksum.");
  assert(fileIntake.includes('path.join(storageRoot, "sources", intakeId'), "File Intake does not choose a managed sources path.");
  assert(fileIntake.includes("storage.preserveRecoveryRecord"), "File finalization failure does not preserve recovery evidence.");
  assert(transport.includes('url.pathname === "/v0.1/files"'), "Local transport does not expose File Arm endpoint.");
  assert(transport.includes("maxFileBytes"), "Local transport does not enforce the file size limit.");
  assert(app.includes("const managedFile = intake.evidence?.managedFile || null"), "Source approval does not read server-owned managed file evidence.");
  assert(app.includes("managedPath: managedFile?.managedPath"), "Approved Source does not retain the managed file path.");
  assert(app.includes("trustLevel: \"unverified\""), "Approved uploaded Source must default to unverified trust.");
  assert(bridge.includes("verifyManagedBinaryRows"), "Desktop integrity does not verify managed source bytes.");
  assert(connector.includes("PROJECT_STATE_API_ARM_TOKEN"), "Generic file connector does not use token environment handoff.");
  assert(connector.includes("crypto.createHash(\"sha256\")"), "Generic file connector does not calculate SHA-256.");
  assert(connector.includes("Token arguments are forbidden"), "Generic file connector accepts unsafe token arguments.");

  const requiredDoc = ["25 MiB", "checksum-verified", "never executed", "pending `Source` Intake proposal", "does not become an approved Source"];
  const missingDoc = requiredDoc.filter((phrase) => !doc.includes(phrase));
  assert(!missingDoc.length, "File Arm documentation is incomplete.", { missing: missingDoc });

  console.log("File Arm Contract Check");
  console.log(JSON.stringify({
    contractVersion: contract.contractVersion,
    allowedExtensions: contract.allowedExtensions.length,
    maxFileBytes: contract.limits.maxFileBytes,
    checksum: "sha256",
    humanApprovalRequired: true,
    automaticExtraction: false,
    managedPathHidden: true
  }, null, 2));
  console.log("File Arm contract: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("File Arm contract failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
