const fs = require("node:fs");
const path = require("node:path");
const { connect, waitFor } = require("./run-multi-idea-live-ui-check");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const port = Number(process.argv[2] || 9227);
  const sourcePath = path.resolve(process.argv[3] || path.join(__dirname, "..", "fixtures", "multi-idea-live-test.md"));
  const client = await connect(port);
  try {
    if (await client.evaluate(`Boolean(document.querySelector('[data-first-run-setup]'))`)) {
      await client.evaluate(`(() => { const form=document.querySelector('[data-first-run-setup]'); form.querySelector('[name="actorName"]').value='Idea Review Test Owner'; form.querySelector('[name="confirmLocalMode"]').checked=true; form.requestSubmit(); return true; })()`);
      await waitFor(client.evaluate, `!document.querySelector('[data-first-run-setup]') && document.body.innerText.includes('Projects')`);
    }
    const stat = fs.statSync(sourcePath);
    await client.evaluate(`openFileImportReviewModal(${JSON.stringify({ candidates: [{ localPath: sourcePath, name: path.basename(sourcePath), size: stat.size }], skipped: [], importKind: "files", rootPath: "" })}); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Add to Discovery'`);
    await client.evaluate(`(() => { const form=document.querySelector('.modal form'); form.querySelector('[name="externalSecurityAcknowledged"]').checked=true; const preset=form.querySelector('[name="reasonPreset"]'); preset.value='Added supporting evidence';preset.dispatchEvent(new Event('change',{bubbles:true})); form.querySelector('[name="reason"]').value='Added supporting evidence'; form.requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-final-review]')?.hidden === false`);
    await client.evaluate(`document.querySelector('.modal button[type="submit"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Review Discovery'`, 30000);
    const before = await client.evaluate(`(() => ({button:document.querySelector('[data-run-idea-analysis]')?.textContent,notice:document.querySelector('[data-idea-analysis-panel]')?.innerText,workingLabel:document.querySelector('[name="proposedProjectName"]')?.previousElementSibling?.textContent}))()`);
    assert(before.button === "Run local test idea analysis" && before.notice.includes("sends nothing outside Project State"), "Idea analysis boundary was not visible before running.", before);
    assert(before.workingLabel.includes("Working file-based name"), "File-derived name was not demoted from project authority.", before);
    await client.evaluate(`document.querySelector('[data-run-idea-analysis]').click(); true`);
    await waitFor(client.evaluate, `document.querySelectorAll('[data-idea-candidate-index]').length > 0`, 30000);
    const candidates = await client.evaluate(`(() => [...document.querySelectorAll('[data-idea-candidate-index]')].map(row=>({title:row.querySelector('[data-idea-candidate-title]').value,evidence:row.innerText.includes('Evidence and provenance'),confidence:row.innerText.includes('Confidence:')})))()`);
    assert(candidates.length > 0 && candidates.every((candidate) => candidate.evidence && candidate.confidence), "Candidate review did not expose evidence and confidence.", candidates);
    await client.evaluate(`(() => { document.querySelector('#ideaReviewAction').value='accept'; document.querySelector('#ideaReviewReason').value='Confirmed evidence-backed ideas for routing review.'; document.querySelector('[data-confirm-idea-review]').click(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-idea-analysis-output]')?.innerText.includes('Idea review confirmed')`, 30000);
    const reviewed = await client.evaluate(`(() => ({mode:document.querySelector('#unitReviewMode').value,units:[...document.querySelectorAll('[data-multiple-discovery-routes] [data-discovery-unit-index]')].map(row=>row.querySelector('[name^="unit_title_"]').value),notice:document.querySelector('[data-idea-analysis-output]').innerText}))()`);
    assert(reviewed.mode === "multiple_units" && reviewed.units.length === candidates.length && reviewed.notice.includes("still not Core"), "Confirmed ideas did not become non-Core routing units.", reviewed);
    await client.evaluate(`document.querySelector('.modal form').requestSubmit(); true`);
    await waitFor(client.evaluate, `!document.querySelector('.modal') && activeRootView === 'intake'`, 30000);
    const result = await client.evaluate(`(async()=>{const items=(store.intakeItems||[]).filter(x=>Boolean(x.discoveryCaseId));const state=await platformAdapter.analysis.readState({discoveryCaseId:items[0]?.discoveryCaseId});return {intake:items.length,runs:state.analysisRuns.length,authorizations:state.privacyAuthorizations.length,transmissions:state.transmissionReceipts.length,candidates:state.candidates.length,reviews:state.reviewDecisions.length,units:state.confirmedIdeaUnits.length,external:state.transmissionReceipts.some(x=>x.externalTransmission===true),coreAuthority:state.confirmedIdeaUnits.some(x=>x.coreAuthority!==false)};})()`);
    assert(result.intake === candidates.length && result.runs === 1 && result.authorizations === 1 && result.transmissions === 1 && result.candidates === candidates.length && result.reviews === 1 && result.units === candidates.length, "Live Idea Review persistence is incomplete.", result);
    assert(result.external === false && result.coreAuthority === false && client.exceptions.length === 0, "Live Idea Review crossed an external or Core boundary.", { result, exceptions: client.exceptions });
    console.log("Idea Review Live UI Check");
    console.log(JSON.stringify({ candidates: candidates.length, evidenceVisible: true, humanReviewRecorded: true, confirmedUnits: result.units, pendingIntake: result.intake, externalTransmission: false, coreAuthority: false, rendererExceptions: 0 }, null, 2));
    console.log("Idea Review live UI: ok");
  } finally { client.socket.close(); }
}

if (require.main === module) main().catch((error) => { console.error("Idea Review live UI failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
