const fs = require("node:fs");
const path = require("node:path");
const { connect, waitFor } = require("./run-multi-idea-live-ui-check");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const port = Number(process.argv[2] || 9226);
  const rootPath = path.resolve(process.argv[3] || path.join(__dirname, "..", "fixtures", "folder-live-test"));
  const paths = [path.join(rootPath, "Alpha", "alpha-plan.md"), path.join(rootPath, "Beta", "beta-notes.md")];
  const candidates = paths.map((localPath) => ({ localPath, name: path.basename(localPath), size: fs.statSync(localPath).size }));
  const client = await connect(port);
  try {
    const needsSetup = await client.evaluate(`Boolean(document.querySelector('[data-first-run-setup]'))`);
    if (needsSetup) {
      await client.evaluate(`(() => { const form=document.querySelector('[data-first-run-setup]'); form.querySelector('[name="actorName"]').value='Folder Test Owner'; form.querySelector('[name="confirmLocalMode"]').checked=true; form.requestSubmit(); return true; })()`);
      await waitFor(client.evaluate, `!document.querySelector('[data-first-run-setup]') && document.body.innerText.includes('Projects')`);
    }
    await client.evaluate(`openFileImportReviewModal(${JSON.stringify({ candidates, skipped: [], importKind: "folder", rootPath })}); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Add to Discovery'`);
    const groupingReview = await client.evaluate(`(() => ({mode:document.querySelector('#folderGroupingMode')?.value,options:[...document.querySelectorAll('#folderGroupingMode option')].map(x=>x.textContent),text:document.querySelector('.modal')?.innerText}))()`);
    assert(groupingReview.mode === "folder_groups", "Folder grouping was not the default review choice.", groupingReview);
    assert(groupingReview.options.length === 3 && groupingReview.text.includes("Suggested group: Alpha") && groupingReview.text.includes("Suggested group: Beta"), "Folder review did not show its grouping evidence and correction choices.", groupingReview);
    await client.evaluate(`(() => { const form=document.querySelector('.modal form'); form.querySelector('[name="externalSecurityAcknowledged"]').checked=true; const preset=form.querySelector('[name="reasonPreset"]'); if(preset){preset.value='Added supporting evidence';preset.dispatchEvent(new Event('change',{bubbles:true}));} const reason=form.querySelector('[name="reason"]'); if(reason && !reason.value) reason.value='Added supporting evidence'; form.requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-final-review]')?.hidden === false`);
    await client.evaluate(`document.querySelector('.modal button[type="submit"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Review Discovery (1 of 2)'`, 30000);
    const firstGroup = await client.evaluate(`document.querySelector('.modal')?.innerText`);
    assert(firstGroup.includes("Suggested group: Alpha"), "First suggested folder group was not preserved.", { firstGroup });
    await client.evaluate(`(() => { document.querySelector('[name="proposedProjectName"]').value='Alpha Folder Project'; document.querySelector('[name="destination"]').value='proposed_new_project'; document.querySelector('.modal form').requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Review Discovery (2 of 2)'`, 30000);
    const secondGroup = await client.evaluate(`document.querySelector('.modal')?.innerText`);
    assert(secondGroup.includes("Suggested group: Beta"), "Second suggested folder group was not preserved.", { secondGroup });
    await client.evaluate(`(() => { document.querySelector('[name="proposedProjectName"]').value='Beta Folder Project'; document.querySelector('[name="destination"]').value='proposed_new_project'; document.querySelector('.modal form').requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `!document.querySelector('.modal') && activeRootView === 'intake'`, 30000);
    const result = await client.evaluate(`(() => { const items=(store.intakeItems||[]).filter(x=>Boolean(x.discoveryCaseId)); return {count:items.length,cases:items.map(x=>x.discoveryCaseId),versions:items.map(x=>x.fileVersionId),projects:items.map(x=>x.proposedProjectName),body:document.body.innerText}; })()`);
    assert(result.count === 2, "Folder groups did not create two pending Intake proposals.", result);
    assert(new Set(result.cases).size === 2, "Separate folder groups collapsed into one Discovery Case.", result);
    assert(new Set(result.versions).size === 2, "Folder files lost independent exact-file lineage.", result);
    assert(result.projects.includes("Alpha Folder Project") && result.projects.includes("Beta Folder Project"), "Folder group routes were not preserved.", result);
    assert(client.exceptions.length === 0, "The folder live renderer reported an exception.", client.exceptions);
    console.log("Folder Discovery Live UI Check");
    console.log(JSON.stringify({ suggestedGroups: 2, correctionModes: groupingReview.options.length, sequentialReviews: 2, discoveryCases: new Set(result.cases).size, intakeProposals: result.count, exactFileVersions: new Set(result.versions).size, rendererExceptions: 0 }, null, 2));
    console.log("Folder Discovery live UI: ok");
  } finally {
    client.socket.close();
  }
}

if (require.main === module) main().catch((error) => { console.error("Folder Discovery live UI failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
