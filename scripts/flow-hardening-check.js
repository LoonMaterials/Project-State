const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const contract = fs.readFileSync(path.join(root, "INTERNAL_FLOW_EXPERIMENT.md"), "utf8");
const inventory = fs.readFileSync(path.join(root, "PROJECT_STATE_COMPLETE_INVENTORY.md"), "utf8");

for (const required of [
  "function projectNextStep(project)",
  "function intakeNextStep(item",
  "function openDeleteArchivedAiWorkOrderModal",
  "function openDeleteAllArchivedAiWorkOrdersModal",
  "Next step:",
  "Details and provenance",
  "data-final-review",
  "renderFinalReviewSummary",
  "What will happen:",
  "setFlowGuideStep(modal, 4)",
  'requiresFinalReview = resolvedFlowStep < 4'
]) assert(app.includes(required), `Flow hardening implementation missing: ${required}`);
assert(!app.includes('id: `project-completeness-${project.id}`'), "Advisory project completeness must not create a global Needs Attention item.");
assert(!app.includes('category: t("openQuestionNeedsAction")'), "Open questions must remain project history instead of creating a global Needs Attention item.");
for (const required of [
  'data-action="delete-all-archived-ai-work-orders"',
  'data-action="delete-archived-ai-work-order"',
  "DELETE ARCHIVED AI WORK ORDERS",
  "DELETE AI WORK ORDER",
  "Huge-file and unknown-folder AI follow-up should appear here first",
  "Source files queued",
  "does not delete managed source files, Discovery cases, Intake items, or Core project history"
]) assert(app.includes(required), `AI Work Order cleanup/readiness missing: ${required}`);
assert(app.includes('"delete-archived-ai-work-order", "delete-all-archived-ai-work-orders"'), "Archived AI Work Order deletion must remain owner-only.");

for (const required of [".next-step-panel", ".next-step-inline", ".technical-details", ".modal-final-review", ".review-summary-list"]) assert(styles.includes(required), `Flow hardening style missing: ${required}`);
for (const required of ["contextual primary **Next step** action", "actionable warning links directly", "Details and provenance", "plain-language final review"]) assert(contract.includes(required), `Flow hardening contract missing: ${required}`);
assert(inventory.includes("### Flow hardening extension"), "Inventory does not record the flow-hardening extension.");
assert(app.includes('if (/\\b(add|create|attach|assign|import|read)\\b/.test(titleText)) return 2;'), "Add/create forms could skip the final review because their submit button says approve.");
assert(app.includes('if (/\\b(approve|confirm|reject|delete|archive|restore|reset)\\b/.test(titleText)) return 4;'), "Existing approval/confirm forms could receive a redundant review stage.");
assert(app.includes('if (!validateAuditFields(form, data)) return;'), "Final review could bypass actor/reason validation.");
assert(app.includes("const returnToEditableForm = () =>") && app.includes("if (reviewing) returnToEditableForm();"), "A failed final confirmation must return to editable fields.");

console.log("Flow Hardening Check");
console.log(JSON.stringify({ contextualNextStep: true, advisoryCompletenessKeptInsideProject: true, progressiveDisclosure: true, finalReview: true, approvalBoundaryPreserved: true, auditValidationPreserved: true }, null, 2));
console.log("Flow hardening: ok");
