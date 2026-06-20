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
    await fsp.writeFile(path.join(inputRoot, "Beta", "beta.md"), "# Beta\n", "utf8");
    await fsp.writeFile(path.join(inputRoot, "Beta", "blocked.exe"), "blocked", "utf8");
    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const inspected = await bridge.files.inspectImportSelection({ paths: [inputRoot] });
    assert(inspected.candidates.length === 2, "Recursive folder inspection lost supported files.", inspected);
    assert(inspected.skipped.length === 1, "Unsupported folder item was not reported.", inspected);
    const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    const required = [
      "function folderRelativeGroup",
      "function partitionDiscoveryCandidates",
      "function openDiscoveryReviewSequence",
      "Use suggested folder groups",
      "Treat the selected folder as one case",
      "Review every file separately",
      "files.slice(index, index + 24)",
      "Suggested group:",
      "sequencePosition"
    ];
    for (const text of required) assert(app.includes(text), `Folder Discovery UI is missing: ${text}`);
    assert(app.includes('caseTitle: candidateGroup.label'), "Folder grouping rationale is not passed into Discovery Case creation.");
    assert(app.includes('externalSecurityAcknowledged: data.externalSecurityAcknowledged === "on"'), "Folder grouping bypasses the external-security boundary.");
    console.log("Folder Discovery Flow Check");
    console.log(JSON.stringify({ recursivelyInspected: inspected.candidates.length, unsupportedReported: inspected.skipped.length, groupingChoices: 3, boundedGroupSize: 24, noSilentOmission: true, sequentialReview: true, externalSecurityBoundaryPreserved: true }, null, 2));
    console.log("Folder Discovery flow: ok");
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("Folder Discovery flow failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
