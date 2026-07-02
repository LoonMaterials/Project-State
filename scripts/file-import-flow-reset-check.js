const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert(app.includes("let fileImportDialogInProgress = false;"), "File import dialog guard is missing.");
  assert(app.includes("if (fileImportDialogInProgress)") && app.includes("File picker is already waiting for Windows to respond."), "File import can be reopened while a native dialog is still pending.");
  assert(app.includes("finally {\n    fileImportDialogInProgress = false;"), "File import guard is not reset in a finally block.");
  assert(app.includes("forceReplace: true"), "Add-to-Discovery modal does not force-replace stale modal shells.");
  assert(app.includes("pendingFileImportReviewSelection"), "File import selection is not preserved when the review modal handoff fails.");
  assert(app.includes("reopen-pending-file-import-review"), "File import flow has no fallback button for reopening a pending review.");
  assert(app.includes("postModalAction = null;"), "Force-replacing stale modals does not clear queued modal actions.");
  assert(app.includes("Discovery review was closed. Use Open pending Discovery review"), "Closing the Discovery review does not leave a visible recovery path.");
  assert(app.includes("pendingFileImportReviewSelection = null;") && app.includes("Discarded Discovery review for"), "Discarding the Discovery review does not clear the pending folder/file selection.");
  assert(app.includes("Discovery review open:") && app.includes("[data-import-path]:checked"), "Discovery review selection changes do not update visible status.");
  assert(app.includes("lastImportFolders") && app.includes("rememberedImportFolder") && app.includes("defaultPath: rememberedImportFolder(kind)"), "File import flow does not remember the last selected folder.");
  assert(/const closeModal = \(\{ discard = false, keepDraft = false \} = \{\}\) => \{[\s\S]+?postModalAction = null;[\s\S]+?modal\.remove\(\);/.test(app), "Closing or discarding a modal does not clear queued modal actions before rendering.");
  assert(/if \(action === "import-files"\) \{[\s\S]+?beginFileImport\("files"\);[\s\S]+?return;[\s\S]+?\}/.test(app), "Import-files action does not return immediately.");
  assert(/if \(action === "import-folder"\) \{[\s\S]+?beginFileImport\("folder"\);[\s\S]+?return;[\s\S]+?\}/.test(app), "Import-folder action does not return immediately.");
  console.log("File Import Flow Reset Check");
  console.log(JSON.stringify({
    dialogGuard: true,
    guardFinallyReset: true,
    staleModalForceReplace: true,
    discardClearsQueuedActions: true,
    discardRecoveryVisible: true,
    discardClearsPendingSelection: true,
    reviewSelectionStatusVisible: true,
    remembersLastFolder: true,
    importActionsReturn: true
  }, null, 2));
  console.log("File import flow reset: ok");
}

try {
  main();
} catch (error) {
  console.error("File import flow reset failed:");
  console.error(error.message);
  process.exitCode = 1;
}
