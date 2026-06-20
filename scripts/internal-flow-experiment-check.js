const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const bridge = fs.readFileSync(path.join(root, "desktop", "project-state-desktop-bridge.cjs"), "utf8");
const contract = fs.readFileSync(path.join(root, "INTERNAL_FLOW_EXPERIMENT.md"), "utf8");
const inventory = fs.readFileSync(path.join(root, "PROJECT_STATE_COMPLETE_INVENTORY.md"), "utf8");

for (const required of [
  "Choose → Describe → Review → Confirm",
  "Only one action menu, detail drawer, modal, or guided task may be active at a time",
  "Save draft",
  "Discard",
  "Stay here",
  "Every confirmed change still stores its own actor, timestamp, reason, changed object, origin/how changed, and language",
  "Drafts and suggestions are never treated as truth"
]) assert(contract.includes(required), `Internal-flow contract missing: ${required}`);

for (const required of [
  "const flowDrafts = new Map()",
  "auditWorkSession",
  "data-draft-save",
  "data-draft-discard",
  "data-draft-stay",
  "data-discard-restored-draft",
  "renderFlowGuide",
  "modal-flow-guide",
  "workflowBreadcrumbHtml",
  "governed-state-strip",
  "reasonPreset",
  "activeActorOptions",
  "actorSuggestionDatalist",
  "projectSuggestionDatalist",
  "sourceTypeDatalist",
  "relationshipTypeDatalist",
  "pendingFlowReturnContext",
  "details.action-menu[open]",
  "let saveQueue = Promise.resolve()"
]) assert(app.includes(required), `Internal-flow implementation missing: ${required}`);
assert(bridge.includes("PRAGMA busy_timeout = 5000"), "Desktop SQLite bridge does not wait briefly for overlapping readers/writers.");

assert(app.includes('<select id="actorName" name="actorName" required>'), "Audit actor is still a free-typed field.");
assert(app.includes('<textarea id="reason" name="reason" required>'), "Per-change audit reason was removed.");
for (const required of [".workflow-breadcrumb", ".modal-flow-guide", ".modal-draft-guard", ".governed-state-strip"]) assert(styles.includes(required), `Internal-flow styling missing: ${required}`);
for (const required of ["actor", "timestamp", "reason", "changedObject", "howChanged", "language"]) assert(app.includes(`"${required}"`), `Mandatory history field disappeared: ${required}`);
assert(inventory.includes("## 21. Approved Internal Flow Experiment"), "Inventory does not record the internal-flow experiment.");

console.log("Internal Flow Experiment Check");
console.log(JSON.stringify({
  oneActiveSurface: true,
  sessionDraftGuard: true,
  guidedSteps: 4,
  controlledActors: true,
  controlledReasonPresets: true,
  searchableChoiceLists: 4,
  workSessionAuditInheritance: true,
  perChangeHistoryPreserved: true,
  contextualReturn: true
}, null, 2));
console.log("Internal flow experiment: ok");
