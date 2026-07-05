const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function removeTempRoot(root) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await fs.rm(root, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "EPERM"].includes(error.code)) throw error;
      if (attempt === 11) {
        console.warn(`Temporary cleanup skipped because Windows still had a handle open: ${root}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

async function main() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "project-state-discovery-supporting-"));
  const storageRoot = path.join(tempRoot, "storage");
  const inputRoot = path.join(tempRoot, "input");
  try {
    await fs.mkdir(inputRoot, { recursive: true });
    const notesPath = path.join(inputRoot, "mixed-long-doc.md");
    const imagePath = path.join(inputRoot, "supporting-sketch.png");
    await fs.writeFile(notesPath, "# Platters of Food\n\nFood section notes.\n\n# Fitness of Command\n\nCommand section notes.", "utf8");
    await fs.writeFile(imagePath, Buffer.from("not-a-real-png-but-valid-import-by-extension"));

    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const actorId = "actor_supporting_files_check";
    const reason = "Regression check for metadata-only supporting files.";
    let discoveryCaseId = "";
    for (const filePath of [notesPath, imagePath]) {
      const staged = await bridge.discoveryStorage.stageTrustedFile({
        path: filePath,
        discoveryCaseId: discoveryCaseId || undefined,
        caseTitle: "Mixed supporting file case",
        actorId,
        externalSecurityAcknowledged: true,
        reason
      });
      discoveryCaseId = staged.discoveryCaseId;
      await bridge.discoveryStorage.extractFileVersion({
        discoveryCaseId,
        fileVersionId: staged.fileVersionId,
        actorId: "project_state_deterministic"
      });
    }

    const analysis = await bridge.discoveryStorage.analyzeCase({
      discoveryCaseId,
      actorId: "project_state_deterministic"
    });
    const units = analysis.documentUnits || [];
    assert(units.length === 2, "Heading detection should create two text-backed units.", analysis);
    const supportingEvidence = units.flatMap((unit) => unit.evidence || []).filter((item) => item.role === "supporting_file_without_text");
    assert(supportingEvidence.length === 1, "Metadata-only image should be attached as supporting evidence.", analysis);
    assert(units[0].fileVersionIds.length === 2, "First unit should include the supporting image file version.", units[0]);
    assert(supportingEvidence[0].fileName === "supporting-sketch.png", "Supporting evidence should preserve original image filename.", supportingEvidence[0]);

    const routes = units.map((unit) => ({
      ...unit,
      destination: "proposed_new_project",
      proposedProjectName: unit.title
    }));
    await bridge.discoveryStorage.confirmRouting({
      discoveryCaseId,
      actorId,
      routes,
      confirmedAt: "2026-06-26T21:00:00.000Z"
    });
    const promotion = await bridge.discoveryStorage.promoteToIntake({
      discoveryCaseId,
      actorId,
      promotedAt: "2026-06-26T21:01:00.000Z",
      reason
    });
    assert(promotion.intakeItemIds.length === 2, "Only text-backed units should become visible Intake proposals; supporting metadata-only files stay attached as evidence.", promotion);
    const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const items = db.prepare("SELECT record_json FROM intake_items ORDER BY rowid").all().map((row) => JSON.parse(row.record_json)).filter((item) => item.discoveryCaseId === discoveryCaseId);
    db.close();
    const supportingItem = items.find((item) => item.evidence?.supportRole === "supporting_file_without_text");
    assert(!supportingItem, "Supporting image should not become its own Intake approval.", items);
    const firstTextItem = items.find((item) => item.evidence?.discoveryUnit?.title === "Platters of Food");
    assert(firstTextItem?.evidence?.discoveryUnit?.evidence?.some((item) => item.fileName === "supporting-sketch.png" && item.role === "supporting_file_without_text"), "Supporting image should remain attached to the text-backed Discovery unit evidence.", firstTextItem);
    assert(items.filter((item) => item.title === "Add source unit: Platters of Food").length === 1, "Supporting image should not look like a duplicate copy of the first document unit.", items);

    console.log("Discovery Supporting Files Check");
    console.log(JSON.stringify({
      discoveryCaseId,
      documentUnits: units.length,
      supportingFilesAttached: supportingEvidence.length,
      intakeProposals: items.length,
      imageNoLongerOrphaned: true,
      supportingFileStaysEvidenceOnly: true
    }, null, 2));
    console.log("Discovery supporting files: ok");
  } finally {
    await removeTempRoot(tempRoot);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Discovery supporting files check failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
