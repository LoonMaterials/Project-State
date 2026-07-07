const fs = require("node:fs");
const path = require("node:path");
const { connect, waitFor } = require("./run-multi-idea-live-ui-check");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function main() {
  const port = Number(process.argv[2] || 9227);
  const sourcePath = path.resolve(process.argv[3] || path.join(__dirname, "..", "fixtures", "multi-idea-live-test.md"));
  const client = await connect(port);
  try {
    if (await client.evaluate(`Boolean(document.querySelector('[data-first-run-setup]'))`)) {
      await client.evaluate(`(() => { const form=document.querySelector('[data-first-run-setup]'); form.querySelector('[name="actorName"]').value='AI Work Order Test Owner'; form.querySelector('[name="confirmLocalMode"]').checked=true; form.requestSubmit(); return true; })()`);
      await waitFor(client.evaluate, `!document.querySelector('[data-first-run-setup]') && document.body.innerText.includes('Projects')`);
    }
    const stat = fs.statSync(sourcePath);
    await client.evaluate(`openFileImportReviewModal(${JSON.stringify({ candidates: [{ localPath: sourcePath, name: path.basename(sourcePath), size: stat.size }], skipped: [], importKind: "files", rootPath: "" })}); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Add to Discovery'`);
    await client.evaluate(`(() => { const form=document.querySelector('.modal form'); form.querySelector('[name="externalSecurityAcknowledged"]').checked=true; const preset=form.querySelector('[name="reasonPreset"]'); if(preset){preset.value='Added supporting evidence';preset.dispatchEvent(new Event('change',{bubbles:true}));} const reason=form.querySelector('[name="reason"]'); if(reason && !reason.value) reason.value='Added supporting evidence'; form.requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-final-review]')?.hidden === false`);
    await client.evaluate(`document.querySelector('.modal button[type="submit"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Review Discovery'`, 30000);

    const boundary = await client.evaluate(`(() => ({
      runButton: Boolean(document.querySelector('[data-run-idea-analysis]')),
      confirmIdeaReview: Boolean(document.querySelector('[data-confirm-idea-review]')),
      panelText: document.querySelector('[data-idea-analysis-panel]')?.innerText || '',
      workingLabel: document.querySelector('[name="proposedProjectName"]')?.previousElementSibling?.textContent || ''
    }))()`);
    assert(boundary.runButton === false && boundary.confirmIdeaReview === false, "Discovery still exposes inline AI idea-analysis controls.", boundary);
    assert(boundary.panelText.includes("AI Work Orders") && boundary.panelText.includes("No AI is called from this Discovery screen."), "Discovery does not show the AI Work Order boundary.", boundary);
    assert(boundary.workingLabel.includes("Working file-based name"), "File-derived name was not demoted from project authority.", boundary);

    await client.evaluate(`(() => { const mode=document.querySelector('[name="unitReviewMode"]'); if(mode){ mode.value='one_item'; mode.dispatchEvent(new Event('change',{bubbles:true})); } const destination=document.querySelector('[name="destination"]'); destination.value='ai_work_order'; destination.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('.modal form').requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `!document.querySelector('.modal')`, 30000);
    const result = await client.evaluate(`(() => ({ workOrders:(store.aiWorkOrders||[]).length, intake:(store.intakeItems||[]).filter(x=>Boolean(x.discoveryCaseId)).length, inlineRunControls:Boolean(document.querySelector('[data-run-idea-analysis]')) }))()`);
    assert(result.workOrders > 0 && result.intake === 0 && result.inlineRunControls === false, "AI follow-up did not route cleanly to Work Orders.", result);

    console.log("Idea Review Live UI Check");
    console.log(JSON.stringify({ inlineAiRemoved: true, aiWorkOrders: result.workOrders, pendingIntake: result.intake, rendererExceptions: client.exceptions.length }, null, 2));
    console.log("Idea Review live UI: ok");
  } finally {
    client.socket.close();
  }
}

if (require.main === module) main().catch((error) => {
  console.error("Idea Review live UI failed:");
  console.error(error.message);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
});
