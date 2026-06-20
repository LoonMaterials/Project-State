const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-state-file-library-"));
  const storageRoot = path.join(tempRoot, "storage");
  const incoming = path.join(tempRoot, "incoming");
  fs.mkdirSync(path.join(incoming, "nested"), { recursive: true });
  const firstPath = path.join(incoming, "evidence.txt");
  const secondPath = path.join(incoming, "nested", "drawing.md");
  const skippedPath = path.join(incoming, "program.exe");
  fs.writeFileSync(firstPath, "Project State evidence\n");
  fs.writeFileSync(secondPath, "# Drawing notes\n");
  fs.writeFileSync(skippedPath, "not allowed\n");

  try {
    const bridge = createProjectStateDesktopBridge({ storageRoot, label: "File Library Test" });
    const inspected = await bridge.files.inspectImportSelection({ paths: [incoming] });
    assert.equal(inspected.candidates.length, 2);
    assert.equal(inspected.skipped.length, 1);
    assert(inspected.candidates.some((file) => file.name === "evidence.txt"));
    assert(inspected.candidates.some((file) => file.name === "drawing.md"));

    const files = inspected.candidates.map((file, index) => ({ ...file, intakeId: `intake_test_${index + 1}` }));
    const result = await bridge.files.stageManagedFiles({ files });
    assert.equal(result.errors.length, 0);
    assert.equal(result.staged.length, 2);
    assert(fs.existsSync(firstPath), "Original file was moved or deleted.");
    assert(fs.existsSync(secondPath), "Nested original file was moved or deleted.");

    for (const staged of result.staged) {
      const managedPath = path.join(storageRoot, ...staged.managedPath.split("/"));
      assert(fs.existsSync(managedPath), `Managed copy missing: ${staged.managedPath}`);
      const checksum = crypto.createHash("sha256").update(fs.readFileSync(managedPath)).digest("hex");
      assert.equal(checksum, staged.sha256);
      const verified = await bridge.files.verifyLocalFile({
        managedPath: staged.managedPath,
        expected: { size: staged.size, sha256: staged.sha256 }
      });
      assert.equal(verified.status, "verified");
    }

    const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    for (const required of [
      "function renderFilesLibrary()",
      "function beginFileImport",
      "function openFileImportReviewModal",
      'activeRootView === "files"',
      'data-action="import-files"',
      'data-action="import-folder"',
      "platformAdapter.discovery.stageTrustedFile",
      "platformAdapter.discovery.analyzeCase",
      "platformAdapter.discovery.promoteToIntake",
      "You do not need to choose a project yet",
      "originalFilePreserved"
    ]) assert(app.includes(required), `File library UI missing: ${required}`);

    console.log("Desktop File Library Check");
    console.log(JSON.stringify({ candidates: inspected.candidates.length, skipped: inspected.skipped.length, staged: result.staged.length, originalsPreserved: true, checksumsVerified: true }, null, 2));
    console.log("Desktop file library: ok");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Desktop file library check failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
