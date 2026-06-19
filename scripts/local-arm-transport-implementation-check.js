const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { createApiArmTransport } = require("../desktop/api-arm-transport.cjs");
const { createApiArmSecretStore } = require("../desktop/api-arm-secret-store.cjs");

const ROOT = path.join(__dirname, "..");
const FIXTURE = path.join(ROOT, "fixtures", "storage-spine-v0.1-baseline.json");
const CONNECTOR = path.join(ROOT, "scripts", "api-arm-submit.js");
const TOKEN = "transport-check-token-00000000000000000000";

function envelope(projectId, suffix = "1") {
  return {
    contractVersion: "0.1",
    submissionId: `transport_submission_${suffix}`,
    idempotencyKey: `transport_idempotency_${suffix}`,
    submittedAt: "2026-06-18T12:00:00.000Z",
    arm: { armId: "transport_check", displayName: "Transport Check", type: "api", armVersion: "0.1.0" },
    target: { projectId },
    items: [{ clientItemId: `item_${suffix}`, title: "Transport proposal", proposedObjectType: "Fact", proposedChange: { text: "Transport fixture content" } }],
    provenance: { sourceLabel: "Transport fixture" }
  };
}

async function jsonRequest(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  return { status: response.status, body: await response.json() };
}

function runConnector(baseUrl, token, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CONNECTOR, "--url", baseUrl, "--file", filePath], {
      cwd: ROOT,
      env: { ...process.env, PROJECT_STATE_API_ARM_TOKEN: token },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-arm-transport-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const transport = createApiArmTransport({ intakeArms: bridge.intakeArms, getToken: async () => TOKEN });
  try {
    const fixturePackage = JSON.parse(await fsp.readFile(FIXTURE, "utf8"));
    await bridge.storage.saveStore({ store: fixturePackage.store, manifest: {} });
    const projectId = fixturePackage.store.projects[0].id;
    const started = await transport.start({ port: 0 });
    assert.equal(started.host, "127.0.0.1");
    assert(started.port > 0);

    const unauthorized = await jsonRequest(started.baseUrl, "/v0.1/capabilities");
    assert.equal(unauthorized.status, 401);
    const browserOrigin = await jsonRequest(started.baseUrl, "/v0.1/capabilities", { headers: { Authorization: `Bearer ${TOKEN}`, Origin: "https://example.com" } });
    assert.equal(browserOrigin.status, 403);
    assert.equal(browserOrigin.body.error.code, "BROWSER_ORIGIN_REJECTED");

    const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
    const capabilities = await jsonRequest(started.baseUrl, "/v0.1/capabilities", { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(capabilities.status, 200);
    assert.equal(capabilities.body.contractVersion, "0.1");

    const firstEnvelope = envelope(projectId, "1");
    const accepted = await jsonRequest(started.baseUrl, "/v0.1/submissions", { method: "POST", headers, body: JSON.stringify(firstEnvelope) });
    assert.equal(accepted.status, 202);
    assert.equal(accepted.body.status, "accepted");
    const duplicate = await jsonRequest(started.baseUrl, "/v0.1/submissions", { method: "POST", headers, body: JSON.stringify(firstEnvelope) });
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.body.status, "duplicate");
    const receipt = await jsonRequest(started.baseUrl, `/v0.1/receipts/${firstEnvelope.submissionId}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.batchId, accepted.body.batchId);

    const tooMany = envelope(projectId, "many");
    tooMany.items = Array.from({ length: 101 }, (_, index) => ({ clientItemId: `item_${index}`, title: "Too many", proposedObjectType: "Fact", proposedChange: { text: "x" } }));
    const tooManyResult = await jsonRequest(started.baseUrl, "/v0.1/submissions", { method: "POST", headers, body: JSON.stringify(tooMany) });
    assert.equal(tooManyResult.status, 413);
    assert.equal(tooManyResult.body.error.code, "TOO_MANY_ITEMS");

    const connectorEnvelope = envelope(projectId, "connector");
    const connectorFile = path.join(storageRoot, "connector-envelope.json");
    await fsp.writeFile(connectorFile, JSON.stringify(connectorEnvelope), "utf8");
    const connector = await runConnector(started.baseUrl, TOKEN, connectorFile);
    assert.equal(connector.code, 0, connector.stderr);
    assert.equal(JSON.parse(connector.stdout).status, "accepted");
    assert(!connector.stdout.includes(TOKEN), "Connector printed its bearer token.");

    const fakeSafeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
      decryptString: (value) => value.toString("utf8").replace(/^encrypted:/, "")
    };
    const secretStore = createApiArmSecretStore({ storageRoot, safeStorage: fakeSafeStorage });
    const created = await secretStore.ensureToken();
    assert.equal(created.created, true);
    const encryptedFile = path.join(storageRoot, "integrations", "api-arm-token.bin");
    assert(fs.existsSync(encryptedFile));
    assert(!fs.readFileSync(encryptedFile).toString("utf8").startsWith(created.token), "Token was stored as plaintext.");
    assert.equal(await secretStore.getToken(), created.token);
    const rotated = await secretStore.rotateToken();
    assert.notEqual(rotated.token, created.token);
    await secretStore.revoke();
    assert(!fs.existsSync(encryptedFile));

    await transport.stop();
    assert.equal(transport.status().running, false);
    const loaded = (await bridge.storage.loadStore()).store;
    assert.equal(loaded.intakeBatches.length, 2);
    assert(loaded.intakeItems.every((item) => item.status === "pending" || !item.intakeBatchId));

    console.log("Local Arm Transport Implementation Check");
    console.log(JSON.stringify({
      loopbackBound: true,
      unauthorizedRejected: true,
      browserOriginRejected: true,
      submissionAccepted: true,
      duplicateDeduplicated: true,
      receiptRetrieved: true,
      itemLimitEnforced: true,
      genericConnectorAccepted: true,
      tokenEncryptedAtRest: true,
      tokenRotationAndRevocation: true,
      coreApprovalBypass: false
    }, null, 2));
    console.log("Local arm transport implementation: ok");
  } finally {
    await transport.stop().catch(() => {});
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Local arm transport implementation failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
