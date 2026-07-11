const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { extractStore } = require("./storage-phase0-baseline-check");
const { buildManifest, splitStoreRecords } = require("./storage-phase2-split-check");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-multi-idea-"));
  const inputRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-multi-idea-input-"));
  const bridge = createProjectStateDesktopBridge({ storageRoot });
  try {
    const store = extractStore(JSON.parse(fs.readFileSync(FIXTURE, "utf8")));
    await bridge.storage.saveStore({ store, manifest: buildManifest(store), split: splitStoreRecords(store), snapshot: JSON.stringify(store) });
    const filePath = path.join(inputRoot, "shared-research-notes.md");
    await fsp.writeFile(filePath, "# Alpha Delivery Plan\nAlpha milestones and ownership.\n\n# Independent Sensor Idea\nA separate sensor concept needing its own project.\n", "utf8");
    const staged = await bridge.discoveryStorage.stageTrustedFile({ path: filePath, actorId: "actor_owner", reason: "Trusted fixture checked outside Project State.", externalSecurityAcknowledged: true, timestamp: "2026-06-20T13:00:00.000Z" });
    await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: staged.discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-20T13:01:00.000Z" });
    const analysis = await bridge.discoveryStorage.analyzeCase({ discoveryCaseId: staged.discoveryCaseId, actorId: "deterministic_discovery", createdAt: "2026-06-20T13:02:00.000Z" });
    assert(analysis.documentUnits.length === 2, "Deterministic document map did not find both headings.", analysis.documentUnits);
    assert(analysis.unitModeSuggestion === "multiple_units", "Several detected units did not suggest unit review.", analysis);
    const scanRequested = await bridge.discoveryStorage.analyzeCase({ discoveryCaseId: staged.discoveryCaseId, actorId: "deterministic_discovery", reviewMode: "scan_for_ideas", createdAt: "2026-06-20T13:02:30.000Z" });
    assert(scanRequested.unitModeSuggestion === "multiple_units", "Explicit small-file idea scanning must keep multi-idea review available.", scanRequested);
    assert(scanRequested.requestedReviewMode === "scan_for_ideas", "Requested file review mode was not preserved.", scanRequested);

    const firstPlainPath = path.join(inputRoot, "first-reference.txt");
    const secondPlainPath = path.join(inputRoot, "second-reference.txt");
    await fsp.writeFile(firstPlainPath, "Background reference material without a project heading.\n", "utf8");
    await fsp.writeFile(secondPlainPath, "Additional evidence that may support the same or another idea.\n", "utf8");
    const firstPlain = await bridge.discoveryStorage.stageTrustedFile({ path: firstPlainPath, caseTitle: "Selected file collection", actorId: "actor_owner", reason: "Trusted fixtures checked outside Project State.", externalSecurityAcknowledged: true, timestamp: "2026-06-20T13:10:00.000Z" });
    const secondPlain = await bridge.discoveryStorage.stageTrustedFile({ path: secondPlainPath, discoveryCaseId: firstPlain.discoveryCaseId, actorId: "actor_owner", reason: "Trusted fixtures checked outside Project State.", externalSecurityAcknowledged: true, timestamp: "2026-06-20T13:10:01.000Z" });
    await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: firstPlain.discoveryCaseId, fileVersionId: firstPlain.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-20T13:11:00.000Z" });
    await bridge.discoveryStorage.extractFileVersion({ discoveryCaseId: firstPlain.discoveryCaseId, fileVersionId: secondPlain.fileVersionId, actorId: "deterministic_extractor", createdAt: "2026-06-20T13:11:01.000Z" });
    const plainCollection = await bridge.discoveryStorage.analyzeCase({ discoveryCaseId: firstPlain.discoveryCaseId, actorId: "deterministic_discovery", reviewMode: "scan_for_ideas", createdAt: "2026-06-20T13:12:00.000Z" });
    assert(plainCollection.unitModeSuggestion === "multiple_units", "A selected collection must retain the requested multi-idea lane.", plainCollection);
    assert(plainCollection.documentUnits.length === 0, "Selected files were incorrectly converted into one project idea per file.", plainCollection.documentUnits);
    const routes = [
      { ...analysis.documentUnits[0], destination: "existing_project", projectId: "project_alpha", proposedProjectName: analysis.documentUnits[0].title },
      { ...analysis.documentUnits[1], destination: "proposed_new_project", projectId: null, proposedProjectName: "Independent Sensor Project" }
    ];
    const confirmation = await bridge.discoveryStorage.confirmRouting({ discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", routes, confirmedAt: "2026-06-20T13:03:00.000Z" });
    assert(confirmation.routing.destination === "multiple_routes" && confirmation.routing.routes.length === 2, "Human route map was not preserved.", confirmation.routing);
    const dbBefore = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const coreBefore = dbBefore.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    dbBefore.close();
    const promotion = await bridge.discoveryStorage.promoteToIntake({ discoveryCaseId: staged.discoveryCaseId, actorId: "actor_owner", promotedAt: "2026-06-20T13:04:00.000Z", reason: "Confirmed independent document-unit routing." });
    assert(promotion.intakeItemIds.length === 2, "Each routed unit did not become one pending Intake proposal.", promotion);
    const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const items = db.prepare("SELECT record_json FROM intake_items WHERE arm_type = 'discovery' ORDER BY rowid").all().map((row) => JSON.parse(row.record_json));
    const projectCount = db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    const proposedCount = db.prepare("SELECT COUNT(*) AS count FROM proposed_projects").get().count;
    db.close();
    assert(items.length === 2, "Unexpected multi-unit Intake count.", items);
    assert(new Set(items.map((item) => item.discoveryUnitId)).size === 2, "Document-unit identities collapsed during promotion.", items);
    assert(new Set(items.map((item) => item.fileVersionId)).size === 1 && items[0].fileVersionId === staged.fileVersionId, "Units lost shared immutable File Version lineage.", items);
    assert(new Set(items.map((item) => item.sourceSha256)).size === 1 && items[0].sourceSha256 === staged.sha256, "Units lost shared exact-byte identity.", items);
    assert(new Set(items.map((item) => item.evidence.managedFile.managedPath)).size === 1, "Multi-unit routing duplicated managed source bytes.", items);
    assert(items.some((item) => item.projectId === "project_alpha") && items.some((item) => item.destination === "proposed_new_project" && item.proposedProjectName === "Independent Sensor Project"), "Independent routes were not retained.", items);
    assert(proposedCount === 1, "Proposed-project record was not created per routed unit.", { proposedCount });
    assert(projectCount === coreBefore, "Multi-unit promotion changed Core before approval.", { coreBefore, projectCount });
    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    for (const required of ["Treat it as one item", "Review several ideas separately", "Scan the selection for multiple ideas", "Keep the selection together as one item", "Review each file separately", "data-multiple-discovery-routes", "unitReviewMode", "fileReviewMode"]) assert(appSource.includes(required), `Multi-idea review UI is missing: ${required}`);
    console.log("Multi-Idea Document Flow Check");
    console.log(JSON.stringify({ detectedUnits: analysis.documentUnits.length, independentRoutes: confirmation.routing.routes.length, intakeProposals: items.length, sharedFileVersion: true, sharedChecksum: true, managedBytesNotDuplicated: true, coreUnchanged: true, individualApprovalPreserved: true }, null, 2));
    console.log("Multi-idea document flow: ok");
  } finally {
    await bridge.storage.reset().catch(() => {});
    await fsp.rm(storageRoot, { recursive: true, force: true });
    await fsp.rm(inputRoot, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("Multi-idea document flow failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
