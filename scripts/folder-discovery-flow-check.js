const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-folder-flow-"));
  const inputRoot = path.join(tempRoot, "incoming");
  const storageRoot = path.join(tempRoot, "storage");
  try {
    await fsp.mkdir(path.join(inputRoot, "Alpha"), { recursive: true });
    await fsp.mkdir(path.join(inputRoot, "Beta"), { recursive: true });
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha.md"), "# Alpha\n", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-test.py"), "print('alpha')\n", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-notebook.ipynb"), JSON.stringify({ cells: [{ cell_type: "markdown", source: ["# Alpha notebook"] }] }), "utf8");
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha.uproject"), JSON.stringify({ FileVersion: 3, EngineAssociation: "test" }), "utf8");
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-sketch.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-scene.uasset"), Buffer.from("unreal asset placeholder"));
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-model.stl"), "solid alpha\nendsolid alpha\n", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Alpha", "alpha-weird.customidea"), "custom opaque material", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Beta", "beta.md"), "# Beta\n", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Beta", "blocked.exe"), "blocked", "utf8");
    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const inspected = await bridge.files.inspectImportSelection({ paths: [inputRoot] });
    assert(inspected.candidates.length === 9, "Recursive folder inspection lost supported mixed-evidence files.", inspected);
    assert(inspected.skipped.length === 1, "Unsupported folder item was not reported.", inspected);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "code"), "Source-code evidence was not classified.", inspected.candidates);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "notebook"), "Notebook evidence was not classified.", inspected.candidates);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "unreal"), "Unreal evidence was not classified.", inspected.candidates);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "image_visual"), "Visual evidence was not classified.", inspected.candidates);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "model_cad" && item.readMode === "metadata_only"), "CAD/model evidence was not classified as metadata-only.", inspected.candidates);
    assert(inspected.candidates.some((item) => item.evidenceKind?.key === "unknown_file" && item.readMode === "metadata_only"), "Unknown file evidence was not preserved as metadata-only.", inspected.candidates);
    assert(inspected.skipped.some((item) => item.fileType?.key === "blocked_executable"), "Executable file was not explicitly blocked.", inspected.skipped);
    const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    const required = [
      "function folderRelativeGroup",
      "function partitionDiscoveryCandidates",
      "function openDiscoveryReviewSequence",
      "How should this unknown folder be reviewed?",
      "Use unknown-folder flow: subfolders to AI follow-up, loose files through Discovery",
      "Folder candidate",
      "Project folder candidate:",
      "Emergency: review every file separately",
      "Loose files in selected folder",
      "Subfolders are packaged for AI follow-up.",
      "Loose files continue through Discovery",
      "subfolder_ai_followup",
      "loose_files_discovery",
      "Subfolder moved to AI follow-up so its contents can be cataloged before project decisions.",
      "subfolder_catalog_source",
      "activeStatuses.has(discoveryCase.status || \"\")",
      "Project folder candidate:\\s*Folder root",
      "data.folderGroupingMode || \"folder_groups\"",
      "function existingProjectMatchForFolderName",
      "Known project folder to check:",
      "const folderCollectionIntent = [\"one_project_folder\", \"folder_groups\"].includes(folderIntent)",
      "const folderDiscoveryIntent = [\"one_project_folder\", \"folder_groups\", \"each_file\", \"loose_files_discovery\", \"subfolder_ai_followup\"].includes(folderIntent)",
      "const folderContainerFirst = folderIntent === \"folder_groups\"",
      "const suggestedUnits = folderContainerFirst ? []",
      "const suggestedMode = folderDiscoveryIntent || reviewMode === \"one_item\" || reviewMode === \"each_file\"",
      "const defaultSingleDestination = unknownFileAiDefault ? defaultAiDestination : folderDiscoveryIntent ? \"unassigned\"",
      "const defaultUnitDestination = unknownFileAiDefault ? defaultAiDestination : folderDiscoveryIntent ? \"unassigned\"",
      "discoveryDestinationOptions(defaultSingleDestination)",
      "project/container candidate first",
      "Container-first review:",
      "Needs Attention is created only if you deliberately choose an Intake route.",
      "Folder intent:",
      "Known folder check:",
      "Suggested group:",
      "sequencePosition"
    ];
    for (const text of required) assert(app.includes(text), `Folder Discovery UI is missing: ${text}`);
    const bridgeSource = fs.readFileSync(path.join(__dirname, "..", "desktop", "project-state-desktop-bridge.cjs"), "utf8");
    for (const text of ["splitMeta.aiWorkOrders = store.aiWorkOrders || []", "aiWorkOrders: store.aiWorkOrders || []"]) assert(bridgeSource.includes(text), `Folder Discovery bridge persistence is missing: ${text}`);
    assert(!app.includes('<option value="one_project_folder">Treat entire folder as one Discovery evidence collection</option>'), "Unknown-folder Discovery still exposes the parent-folder project/blob option.");
    assert(app.includes('caseTitle: candidateGroup.label'), "Folder grouping rationale is not passed into Discovery Case creation.");
    assert(app.includes('externalSecurityAcknowledged: data.externalSecurityAcknowledged === "on"'), "Folder grouping bypasses the external-security boundary.");
    console.log("Folder Discovery Flow Check");
    console.log(JSON.stringify({ recursivelyInspected: inspected.candidates.length, unsupportedReported: inspected.skipped.length, groupingChoices: 2, unknownFolderDefaultsToGroups: true, parentFolderBlobRouteRemoved: true, subfoldersCatalogToAiFollowUp: true, looseFilesContinueDiscovery: true, aiWorkOrdersPersisted: true, mixedEvidenceClassified: true, sequentialReview: true, externalSecurityBoundaryPreserved: true }, null, 2));
    console.log("Folder Discovery flow: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("Folder Discovery flow failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
