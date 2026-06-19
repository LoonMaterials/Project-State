const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "local-arm-transport-v0.1-contract.json"), "utf8"));
const doc = fs.readFileSync(path.join(ROOT, "LOCAL_ARM_TRANSPORT_CONTRACT.md"), "utf8");
const transport = fs.readFileSync(path.join(ROOT, "desktop", "api-arm-transport.cjs"), "utf8");
const secrets = fs.readFileSync(path.join(ROOT, "desktop", "api-arm-secret-store.cjs"), "utf8");
const manager = fs.readFileSync(path.join(ROOT, "desktop", "api-arm-transport-manager.cjs"), "utf8");
const main = fs.readFileSync(path.join(ROOT, "desktop", "main.cjs"), "utf8");
const preload = fs.readFileSync(path.join(ROOT, "desktop", "preload.cjs"), "utf8");
const bridge = fs.readFileSync(path.join(ROOT, "desktop", "project-state-desktop-bridge.cjs"), "utf8");
const connector = fs.readFileSync(path.join(ROOT, "scripts", "api-arm-submit.js"), "utf8");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function mainCheck() {
  assert(contract.contractType === "local-api-arm-transport", "Transport contract type mismatch.");
  assert(contract.contractVersion === "0.1", "Transport contract version mismatch.");
  assert(contract.defaultEnabled === false, "Transport must be disabled by default.");
  assert(contract.bindHost === "127.0.0.1", "Transport must bind to IPv4 loopback only.");
  assert(contract.authentication.encryptedAtRest === true, "Transport token must be encrypted at rest.");
  assert(contract.authentication.electronSafeStorageRequired === true, "Electron safeStorage requirement is missing.");
  assert(contract.authentication.tokenInCommandLineArguments === false, "Token must not be accepted in command-line arguments.");
  assert(contract.secretStorage.includedInBackup === false, "Integration secrets must be excluded from backup.");
  assert(contract.limits.maxBodyBytes === 1048576, "Transport body limit mismatch.");
  assert(contract.limits.maxItemsPerEnvelope === 100, "Transport item limit mismatch.");
  assert(contract.endpoints.length === 4, "Transport must expose exactly four contract endpoints.");

  const requiredTransportPieces = ["127.0.0.1", "BROWSER_ORIGIN_REJECTED", "validBearerToken", "timingSafeEqual", "maxBodyBytes", "requestsPerMinutePerAddress", "submitEnvelope", "getReceipt"];
  const missingTransport = requiredTransportPieces.filter((piece) => !transport.includes(piece));
  assert(!missingTransport.length, "Transport implementation is missing controls.", { missing: missingTransport });
  assert(secrets.includes("safeStorage.encryptString"), "Secret store does not encrypt tokens.");
  assert(secrets.includes("crypto.randomBytes(32)"), "Secret store token entropy requirement is missing.");
  assert(manager.includes("token-rotated") && manager.includes("revoked"), "Transport lifecycle audit events are missing.");
  assert(main.includes("registerApiArmTransportIpc"), "Desktop main process does not own transport lifecycle.");
  assert(preload.includes("api-arm-transport:enable") && preload.includes("api-arm-transport:revoke"), "Preload lifecycle bridge is incomplete.");
  assert(bridge.includes('"integrations"'), "Desktop storage spine does not create the integrations folder.");
  const backupFoldersMatch = bridge.match(/const BACKUP_MANAGED_FOLDERS = \[([^\]]+)\]/);
  assert(backupFoldersMatch && !backupFoldersMatch[1].includes("integrations"), "Integration secrets must not enter backup managed folders.");
  assert(connector.includes("PROJECT_STATE_API_ARM_TOKEN"), "Generic connector does not use the token environment variable.");
  assert(connector.includes("Token arguments are forbidden"), "Generic connector does not reject token command-line arguments.");

  const requiredDoc = ["disabled by default", "127.0.0.1", "safeStorage", "excluded from Project State backup packages", "Manual real-time testing"];
  const missingDoc = requiredDoc.filter((phrase) => !doc.includes(phrase));
  assert(!missingDoc.length, "Transport documentation is incomplete.", { missing: missingDoc });

  console.log("Local Arm Transport Contract Check");
  console.log(JSON.stringify({
    contractVersion: contract.contractVersion,
    endpoints: contract.endpoints.length,
    lifecycleOperations: contract.lifecycleOperations.length,
    safetyRules: contract.safetyRules.length,
    loopbackOnly: true,
    encryptedToken: true,
    secretsExcludedFromBackup: true
  }, null, 2));
  console.log("Local arm transport contract: ok");
}

if (require.main === module) {
  try {
    mainCheck();
  } catch (error) {
    console.error("Local arm transport contract failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
