const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const app = read("app.js");

function assert(condition, message, details = {}) {
  if (condition) return;
  console.error(message);
  console.error(JSON.stringify(details, null, 2));
  process.exit(1);
}

function functionText(name) {
  const start = app.indexOf(`function ${name}(`);
  assert(start >= 0, `Missing function ${name}.`);
  const open = app.indexOf(") {", start) + 2;
  let depth = 0;
  for (let index = open; index < app.length; index += 1) {
    if (app[index] === "{") depth += 1;
    if (app[index] === "}") depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`Unclosed function ${name}.`);
}

function workflowChecks() {
  const required = [
    "renderObjectDetailPanel(project)",
    "data-action=\"open-referenced-object\"",
    "data-action=\"propose-correction\"",
    "data-action=\"batch-triage\"",
    "nextPendingIntake(intake.id",
    "workspace-ui-state",
    "currentActorRole",
    "applyRoleAwareControls()"
  ];
  const missing = required.filter((piece) => !app.includes(piece));
  assert(!missing.length, "Workflow integration is incomplete.", { missing });

  const correctionStart = app.indexOf("function openProposeCorrectionModal");
  const correctionEnd = app.indexOf("function openApproveIntakeModal", correctionStart);
  const correctionProposal = app.slice(correctionStart, correctionEnd);
  assert(correctionProposal.includes("createIntakeItem"), "Correction proposal does not enter Intake.");
  assert(!correctionProposal.includes("object[field] ="), "Correction proposal mutates Core before approval.");

  const approvalStart = app.indexOf("function applyApprovedIntakeToCore");
  const approvalEnd = app.indexOf("function openCreateProjectModal", approvalStart);
  const approval = app.slice(approvalStart, approvalEnd);
  assert(approval.includes('proposed.proposalKind === "correction"'), "Correction approval branch is missing.");
  assert(approval.includes("recordChange"), "Approved correction does not record history.");

  const batchStart = app.indexOf("function openBatchTriageModal");
  const batchEnd = app.indexOf("function openRejectIntakeModal", batchStart);
  const batch = app.slice(batchStart, batchEnd);
  assert(!batch.includes("approveIntakeItem"), "Batch triage contains an approval path.");
  assert(batch.includes("intake-batch-triage"), "Batch triage is not persisted through the approved intake-only path.");

  return { requiredIntegrations: required.length, correctionAirlock: true, batchApprovalBlocked: true };
}

function uiStateChecks() {
  const normalizeUiState = new Function(
    "RECENT_PROJECT_LIMIT",
    `${functionText("normalizeLastImportFolders")}; ${functionText("normalizeUiState")}; return normalizeUiState;`
  )(5);
  const normalized = normalizeUiState({
    recentProjectIds: ["p1", "p1", "p2", "p3", "p4", "p5", "p6"],
    lastProjectId: "p1",
    lastProjectView: "map",
    projectScrollPositions: { p1: 42, p2: -9, invalid: "no" }
  });
  assert(normalized.recentProjectIds.join(",") === "p1,p2,p3,p4,p5", "Recent-project normalization failed.", normalized);
  assert(normalized.projectScrollPositions.p1 === 42, "Valid scroll position was lost.", normalized);
  assert(normalized.projectScrollPositions.p2 === 0, "Negative scroll position was not clamped.", normalized);
  assert(!Object.hasOwn(normalized.projectScrollPositions, "invalid"), "Invalid scroll position was retained.", normalized);
  assert(normalized.lastImportFolders && typeof normalized.lastImportFolders === "object", "Last import folder state was not normalized.", normalized);
  return normalized;
}

function permissionChecks() {
  const matrix = {
    owner: { create: true, edit: true, approve: true, audit: true, admin: true },
    admin: { create: true, edit: true, approve: false, audit: true, admin: true },
    project_lead: { create: true, edit: true, approve: true, audit: true, admin: false },
    approver: { create: false, edit: false, approve: true, audit: true, admin: false },
    viewer: { create: false, edit: false, approve: false, audit: false, admin: false },
    ai_tool: { create: true, edit: false, approve: false, audit: false, admin: false }
  };
  const normalizeActorRole = (role) => role || "viewer";
  const normalizeActorStatus = (status) => status || "active";
  const evaluator = new Function(
    "ROLE_PERMISSION_MATRIX",
    "normalizeActorRole",
    "normalizeActorStatus",
    `${functionText("actorPermissionRoles")}\n${functionText("actorHasPermission")}\nreturn { actorPermissionRoles, actorHasPermission };`
  )(matrix, normalizeActorRole, normalizeActorStatus);
  const owner = { id: "owner", role: "owner", status: "active" };
  const admin = { id: "admin", role: "admin", status: "active" };
  const viewer = { id: "viewer", role: "viewer", status: "active" };
  const ai = { id: "ai", role: "ai_tool", status: "active" };
  assert(evaluator.actorHasPermission(owner, "approve"), "Owner cannot approve.");
  assert(!evaluator.actorHasPermission(admin, "approve"), "Admin incorrectly gained approval authority.");
  assert(!evaluator.actorHasPermission(viewer, "edit"), "Viewer incorrectly gained edit authority.");
  assert(!evaluator.actorHasPermission(ai, "approve"), "AI/tool incorrectly gained approval authority.");
  return { ownerApproves: true, adminApproves: false, viewerEdits: false, aiApproves: false };
}

function characterAndFileChecks() {
  const requiredFiles = [
    "index.html",
    "app.js",
    "styles.css",
    "README.md",
    "PROJECT_STATE_COMPLETE_INVENTORY.md",
    "DESKTOP_BRIDGE.md",
    "DESKTOP_STORAGE_SPINE.md",
    "package.json",
    "desktop/main.cjs",
    "desktop/preload.cjs",
    "desktop/project-state-desktop-bridge.cjs",
    "desktop/spine-schema.sql",
    "fixtures/storage-spine-v0.1-baseline.json"
  ];
  const files = {};
  for (const relative of requiredFiles) {
    const absolute = path.join(root, relative);
    assert(fs.existsSync(absolute), `Required file is missing: ${relative}`);
    const bytes = fs.readFileSync(absolute);
    assert(bytes.length > 0, `Required file is empty: ${relative}`);
    files[relative] = {
      bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex")
    };
  }

  const lines = app.split(/\r?\n/);
  const longestLine = lines.reduce((best, line, index) => line.length > best.length ? { line: index + 1, length: line.length } : best, { line: 0, length: 0 });
  assert(app.includes("DISPLAY_TEXT_LIMIT") && app.includes("DISPLAY_META_LIMIT") && app.includes("INPUT_LIMITS"), "Character/display safeguards are missing.");
  assert(app.includes("if (submitting) return"), "Duplicate modal submission guard is missing.");
  return { files, appLines: lines.length, longestLine };
}

const result = {
  workflow: workflowChecks(),
  uiState: uiStateChecks(),
  permissions: permissionChecks(),
  integrity: characterAndFileChecks()
};

console.log("Deep Debug: Workflow and File Integrity");
console.log(JSON.stringify(result, null, 2));
console.log("Workflow/file integrity: ok");
