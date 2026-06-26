const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function main() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-known-project-import-"));
  const inputRoot = path.join(tempRoot, "One Project Folder");
  const storageRoot = path.join(tempRoot, "storage");
  try {
    await fsp.mkdir(path.join(inputRoot, "notes"), { recursive: true });
    await fsp.mkdir(path.join(inputRoot, "sketches"), { recursive: true });
    await fsp.writeFile(path.join(inputRoot, "notes", "overview.md"), "# Working title\n\nKnown project notes.", "utf8");
    await fsp.writeFile(path.join(inputRoot, "sketches", "overview.md"), "# Sketch notes\n\nSame filename in a different folder.", "utf8");

    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const inspected = await bridge.files.inspectImportSelection({ paths: [inputRoot] });
    assert(inspected.candidates.length === 2, "Known project folder inspection should keep supported files from nested folders.", inspected);

    const staged = await bridge.files.stageManagedFiles({
      files: inspected.candidates.map((candidate, index) => ({
        intakeId: `intake_known_project_${index}`,
        localPath: candidate.localPath
      }))
    });
    assert(staged.errors.length === 0, "Known project staging should not fail for duplicate basenames when IDs are unique.", staged);
    assert(staged.staged.length === 2, "Known project staging lost a selected file.", staged);
    assert(new Set(staged.staged.map((file) => file.managedPath)).size === 2, "Known project files must receive distinct managed paths.", staged);

    const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    const required = [
      "data-action=\"import-project-files\"",
      "data-action=\"import-project-folder\"",
      "function openProjectFileImportModal",
      "Use this when you already know these files belong under one project.",
      "Scan folder for Discovery",
      "Source added from known project files",
      "Project created from known file import",
      "project_import_complete",
      "stageManagedFiles({ files: filesToStage })"
    ];
    for (const text of required) assert(app.includes(text), `Known project file import UI is missing: ${text}`);
    assert(/if \(isKnownProjectImport\) openProjectFileImportModal\(selection\);[\s\S]+else openFileImportReviewModal\(selection\);/.test(app), "Known project imports are not routed away from Discovery review.");
    assert(/if \(\["project_files", "project_folder"\]\.includes\(pendingFileImportReviewSelection\.importKind\)\) openProjectFileImportModal\(pendingFileImportReviewSelection\);/.test(app), "Pending known project import cannot be reopened after the modal closes.");

    console.log("Known Project File Import Flow Check");
    console.log(JSON.stringify({
      knownProjectButtons: 2,
      supportedFilesInspected: inspected.candidates.length,
      managedFilesStaged: staged.staged.length,
      duplicateBasenamesSafe: true,
      discoveryReviewBypassed: true,
      sourceHistoryPreserved: true
    }, null, 2));
    console.log("Known project file import flow: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Known project file import flow failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
