const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { createApiArmFileIntake } = require("../desktop/api-arm-file-intake.cjs");
const { createApiArmTransport } = require("../desktop/api-arm-transport.cjs");

const ROOT = path.join(__dirname, "..");
const TOKEN = "file-arm-check-token-000000000000000000";
const CONNECTOR = path.join(ROOT, "scripts", "api-arm-submit-file.js");

function metadata(projectId, suffix, fileName, contentType, bytes) {
  return {
    contractVersion: "0.1",
    submissionId: `file_submission_${suffix}`,
    idempotencyKey: `file_idempotency_${suffix}`,
    submittedAt: "2026-06-18T12:00:00.000Z",
    arm: { armId: "file_check", displayName: "File Check", type: "file", armVersion: "0.1.0" },
    target: { projectId },
    provenance: { sourceLabel: "File Arm fixture" },
    file: { fileName, contentType, sha256: crypto.createHash("sha256").update(bytes).digest("hex") }
  };
}

function runConnector(baseUrl, metadataPath, filePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CONNECTOR, "--url", baseUrl, "--metadata", metadataPath, "--file", filePath], {
      cwd: ROOT,
      env: { ...process.env, PROJECT_STATE_API_ARM_TOKEN: TOKEN },
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
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-file-arm-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  const fileIntake = createApiArmFileIntake({ storageRoot, intakeArms: bridge.intakeArms, storage: bridge.storage });
  const transport = createApiArmTransport({ intakeArms: bridge.intakeArms, fileIntake, getToken: async () => TOKEN });
  try {
    const fixturePackage = JSON.parse(await fsp.readFile(path.join(ROOT, "fixtures", "storage-spine-v0.1-baseline.json"), "utf8"));
    await bridge.storage.saveStore({ store: fixturePackage.store, manifest: {} });
    const projectId = fixturePackage.store.projects[0].id;
    const bytes = Buffer.from("Project State File Arm fixture bytes\n", "utf8");
    const firstMetadata = metadata(projectId, "direct", "fixture.txt", "text/plain", bytes);
    const accepted = await fileIntake.submitFile({ metadata: firstMetadata, bytes });
    assert.equal(accepted.status, "accepted");
    assert.equal(accepted.file.sha256, firstMetadata.file.sha256);
    assert(!JSON.stringify(accepted).includes("managedPath"), "File response exposed managed path.");
    const loaded = (await bridge.storage.loadStore()).store;
    const intake = loaded.intakeItems.find((item) => item.id === accepted.file.intakeId);
    assert.equal(intake.status, "pending");
    assert.equal(intake.queueState, "new");
    assert(intake.evidence.managedFile.managedPath.startsWith("sources/"));
    const managedPath = path.join(storageRoot, ...intake.evidence.managedFile.managedPath.split("/"));
    assert(fs.existsSync(managedPath));
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(managedPath)).digest("hex"), firstMetadata.file.sha256);

    const duplicate = await fileIntake.submitFile({ metadata: JSON.parse(JSON.stringify(firstMetadata)), bytes });
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.file.intakeId, accepted.file.intakeId);
    const afterDuplicate = (await bridge.storage.loadStore()).store;
    assert.equal(afterDuplicate.intakeBatches.filter((batch) => batch.submissionId === firstMetadata.submissionId).length, 1);

    const mismatchMetadata = metadata(projectId, "mismatch", "mismatch.txt", "text/plain", bytes);
    mismatchMetadata.file.sha256 = "0".repeat(64);
    const mismatch = await fileIntake.submitFile({ metadata: mismatchMetadata, bytes });
    assert.equal(mismatch.status, "rejected");
    assert(mismatch.errors.some((error) => error.code === "CHECKSUM_MISMATCH"));
    const executable = await fileIntake.submitFile({ metadata: metadata(projectId, "exe", "unsafe.exe", "application/octet-stream", bytes), bytes });
    assert.equal(executable.status, "rejected");
    assert(executable.errors.some((error) => error.code === "FILE_TYPE_NOT_ALLOWED"));

    const started = await transport.start({ port: 0 });
    const connectorBytes = Buffer.from("Generic File Connector fixture\n", "utf8");
    const connectorFile = path.join(storageRoot, "connector-fixture.md");
    const connectorMetadataPath = path.join(storageRoot, "connector-metadata.json");
    await fsp.writeFile(connectorFile, connectorBytes);
    await fsp.writeFile(connectorMetadataPath, JSON.stringify(metadata(projectId, "connector", "connector-fixture.md", "text/markdown", connectorBytes)), "utf8");
    const connector = await runConnector(started.baseUrl, connectorMetadataPath, connectorFile);
    assert.equal(connector.code, 0, connector.stderr);
    const connectorReceipt = JSON.parse(connector.stdout);
    assert.equal(connectorReceipt.status, "accepted");
    assert(!connector.stdout.includes(TOKEN));

    const backup = await bridge.storage.createBackupPackage({ actorId: "actor_owner", actorName: "Owner Person", timestamp: "2026-06-18T13:00:00.000Z", reason: "Verify File Arm managed source backup" });
    assert(backup.manifest.managedFiles.some((file) => file.path.includes("managed/sources/") && file.checksum === firstMetadata.file.sha256));

    await transport.stop();
    console.log("File Arm Implementation Check");
    console.log(JSON.stringify({
      checksumVerified: true,
      managedSourceStored: true,
      airlockPending: true,
      managedPathHiddenFromReceipt: true,
      exactRetryDeduplicated: true,
      checksumMismatchRejected: true,
      executableRejected: true,
      genericFileConnectorAccepted: true,
      managedSourceIncludedInBackup: true,
      automaticExtraction: false
    }, null, 2));
    console.log("File Arm implementation: ok");
  } finally {
    await transport.stop().catch(() => {});
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("File Arm implementation failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
