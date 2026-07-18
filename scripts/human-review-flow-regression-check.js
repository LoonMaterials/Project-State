const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

const checks = {
  completedRemovedFromActiveQueue:
    app.includes("const pendingDecisions = (pass.result.decisions || []).filter")
    && app.includes("const completedDecisions = (pass.result.decisions || []).filter")
    && app.includes("Completed choices leave the active list immediately"),
  completedHistoryPreserved:
    app.includes("Completed human decisions (${completedDecisions.length})")
    && app.includes('action ? "" : `<button class="btn compact" type="button" data-action="review-external-ai-decision"'),
  plainLanguageMaterialLabels:
    app.includes("Add supporting evidence to an existing project")
    && app.includes("Keep as unassigned source or reference material")
    && app.includes("What should happen to this material?"),
  evidenceRoleLabels:
    app.includes("Primary source material")
    && app.includes("Validation or test evidence")
    && app.includes("Risk, contradiction, or limiting evidence"),
  reviewWorkspaceCached:
    app.includes("const externalReviewWorkspaceCache = new Map()")
    && app.includes("loadExternalReviewWorkspace(workOrder")
    && app.includes("Promise.resolve({ externalReviewPasses: cachedWorkspace.passes })"),
  fallbackEvidenceReadsBounded:
    app.includes(".filter((decision) => !(decision.evidence_spans || []).some")
    && app.includes(".slice(0, 40)"),
  resumeMarkerCarriedThroughIntake:
    app.includes('resumeWork: { type: "external_review", workOrderId, passId }')
    && app.includes("function linkedAiWorkOrderIdForIntake")
    && app.includes("await reconcileAiWorkOrderLifecycle(linkedWorkOrderId, { save: false })"),
  intakeApprovalReturnsToAirlock:
    app.includes('activeRootView = "intake"')
    && app.includes("pendingWorkflowResumeContext = null")
    && app.includes("function openApproveIntakeModal"),  projectOffersReviewResume:
    app.includes("New project created from Human Review")
    && app.includes("This project is now available in the Human Review project list")
    && app.includes('data-action="continue-external-review"')
    && app.includes('if (action === "continue-external-review")'),
  completedReviewDoesNotReopen:
    app.includes("function pendingExternalReviewDecisionCount")
    && app.includes("await reconcileAiWorkOrderLifecycle(linkedWorkOrderId, { save: false })")
    && app.includes("pendingWorkflowResumeContext = null"),  refreshedAfterImport:
    app.includes("openExternalReviewPassesModal(imported.workOrderId, { refresh: true })"),
  manualClipboardBridge:
    app.includes('data-action="copy-external-review-material"')
    && app.includes('data-copy-mode="title"')
    && app.includes('data-copy-mode="full"')
    && app.includes('data-action="copy-project-object"')
    && app.includes('Provenance: External Review Pass'),
  projectFormsAcceptClipboard:
    app.includes('pasteClipboardButton("question", "Paste question")')
    && app.includes('pasteClipboardButton("context", "Paste context")')
    && app.includes('pasteClipboardButton("summary", "Paste summary")')
    && app.includes('[data-paste-clipboard-field]'),
  openQuestionsRemainHistoryNotInbox:
    app.includes('recordChange(project, actor, data.reason, "Open question added"')
    && !app.includes('id: `question-${question.id}`')
    && !app.includes('category: t("openQuestionNeedsAction")'),
  advisoryCompletenessNotGlobalAttention:
    !app.includes('id: `project-completeness-${project.id}`')
    && app.includes('const completenessFlags = projectCompletenessFlags(project)')
};

for (const [name, passed] of Object.entries(checks)) assert(passed, `Human Review flow regression failed: ${name}`);

console.log("Human Review Flow Regression Check");
console.log(JSON.stringify(checks, null, 2));
console.log("Human Review flow: ok");
