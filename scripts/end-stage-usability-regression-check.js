const fs = require("fs");

const app = fs.readFileSync("app.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(app.includes("localAiSetupPreference"), "Local AI setup preference is not persisted.");
assert(app.includes("function refreshLocalAiSetupStatus"), "Local AI setup detection helper is missing.");
assert(app.includes('data-action="refresh-local-ai-setup"'), "Local AI setup refresh action is not exposed in setup/settings UI.");
assert(app.includes("analysisInstallSuggestion(capabilities || {})"), "Missing local AI install guidance fallback.");
assert(app.includes("Check and connect local AI"), "Local AI setup does not expose an explicit connect action.");
assert(app.includes("connected and selected for AI Work Orders"), "Local AI status does not confirm its Work Order link.");
assert(app.includes('localAiSetupError: String(settings.localAiSetupError || "")'), "Local AI detection errors are not preserved for diagnosis.");

assert(/let auditWorkSession = \{ actorName: "", updatedAt: "" \};/.test(app), "Audit session still appears to persist reasons.");
assert(/const defaultReason = "";\s+const options = activeActorOptions/.test(app), "Audit reason should start blank for each action.");
assert(!app.includes("reason: String(data.reason || auditWorkSession.reason"), "Modal submit still stores the last reason globally.");

assert(app.includes("function wireDraggableModal"), "Draggable modal wiring is missing.");
assert(app.includes('wireDraggableModal(modal.querySelector(".modal"))'), "Modal is not wired for dragging after render.");
assert(css.includes(".modal.dragging"), "Draggable modal visual state is missing.");
assert(/\.modal-head\s*\{[\s\S]*cursor: move;/.test(css), "Modal header is not marked draggable.");

assert(/<div class="project-card" data-action="open-project"/.test(app), "Project card background is not directly clickable.");
assert(app.includes('button.classList?.contains("project-card") && event.target.closest("button, details, summary, input, select, textarea, a")'), "Clickable project card does not protect nested controls.");
assert(app.includes('data-action="rename-project"'), "Rename project action is not surfaced.");
assert(app.includes('if (action === "rename-project")'), "Rename project action handler is missing.");

assert(app.includes('candidates.length === 1 ? candidate.name || "Selected file" : "Selected file collection"'), "Single-file Discovery grouping still uses folder labeling.");
assert(app.includes('name="fileReviewMode"'), "Selected-file Discovery is missing its review-mode choice.");
assert(app.includes('value="scan_for_ideas" selected'), "Selected-file Discovery must default to scanning across content for ideas.");
assert(app.includes('value="each_file"'), "Per-file Discovery review must remain an explicit option.");
assert(app.includes("selection.skipped?.length"), "Unsupported single-file selection does not expose skipped-file reason.");

console.log("End-stage usability regression check passed.");
