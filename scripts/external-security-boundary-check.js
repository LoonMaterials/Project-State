const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
async function rejectCode(operation, code) { let caught; try { await operation(); } catch (error) { caught = error; } assert(caught?.code === code, `Expected ${code}.`, { actual: caught?.code, message: caught?.message }); }
async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-external-security-"));
  const inputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-trusted-input-"));
  const sourcePath = path.join(inputRoot, "trusted-notes.txt");
  await fsp.writeFile(sourcePath, "trusted fixture\n", "utf8");
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  await rejectCode(() => bridge.discoveryStorage.stageTrustedFile({ path: sourcePath, actorId: "actor_owner", reason: "Missing acknowledgment." }), "EXTERNAL_SECURITY_ACKNOWLEDGMENT_REQUIRED");
  const staged = await bridge.discoveryStorage.stageTrustedFile({ path: sourcePath, actorId: "actor_owner", reason: "Checked outside Project State.", externalSecurityAcknowledged: true, timestamp: "2026-06-19T17:00:00.000Z" });
  assert(staged.securityMode === "external_user_responsibility", "Staging claimed a scan result.", staged);
  assert(fs.existsSync(sourcePath), "Original file was moved or deleted.");
  const state = await bridge.discoveryStorage.getCase({ discoveryCaseId: staged.discoveryCaseId });
  const version = state.fileVersions[0];
  assert(version.externalSecurityAcknowledged && version.externalSecurityAcknowledgedBy === "actor_owner", "Acknowledgment was not bound to File Version.", version);
  assert(state.events.some((event) => event.eventType === "external_security_responsibility_acknowledged"), "Acknowledgment event missing.");
  assert(state.fileVersions.length === 1 && state.fileAssets.length === 1, "Staging identity was not created.");
  assert((await bridge.files.readAsText({ managedPath: version.managedPath })) === "trusted fixture\n", "Acknowledged exact bytes were not readable.");
  const duplicate = await bridge.discoveryStorage.stageTrustedFile({ path: sourcePath, actorId: "actor_owner", reason: "Second trusted selection.", externalSecurityAcknowledged: true, timestamp: "2026-06-19T17:01:00.000Z" });
  assert(duplicate.deduplicated && duplicate.fileVersionId === staged.fileVersionId, "Exact bytes were not deduplicated.", duplicate);
  const managedPath = path.join(storageRoot, ...version.managedPath.split("/"));
  await fsp.writeFile(managedPath, "changed bytes\n", "utf8");
  await rejectCode(() => bridge.files.readAsText({ managedPath: version.managedPath }), "FILE_VERSION_MISMATCH");
  const finalState = await bridge.discoveryStorage.readFoundationState();
  assert(finalState.securityReceipts.length === 0, "Project State fabricated a Security Receipt.");
  await bridge.storage.reset();
  await fsp.rm(storageRoot, { recursive: true, force: true });
  await fsp.rm(inputRoot, { recursive: true, force: true });
  console.log("External Security Boundary Implementation Check");
  console.log(JSON.stringify({ acknowledgmentRequired: true, noBundledScanner: true, originalPreserved: true, exactBytesEnforced: true, changedBytesBlocked: true, deduplicated: true, fabricatedReceipts: false }, null, 2));
  console.log("External security implementation: ok");
}
if (require.main === module) main().catch((error) => { console.error("External security implementation failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
