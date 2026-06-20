const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function connect(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find((item) => item.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("Project State debug page was not found.");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params?.exceptionDetails?.text || "Runtime exception");
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  await send("Runtime.enable");
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Page evaluation failed.");
    return result.result?.value;
  };
  return { socket, evaluate, exceptions };
}

async function waitFor(evaluate, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function main() {
  const port = Number(process.argv[2] || 9226);
  const sourcePath = path.resolve(process.argv[3] || path.join(__dirname, "..", "fixtures", "multi-idea-live-test.md"));
  const stat = fs.statSync(sourcePath);
  const client = await connect(port);
  try {
    const needsSetup = await client.evaluate(`Boolean(document.querySelector('[data-first-run-setup]'))`);
    if (needsSetup) {
      await client.evaluate(`(() => { const form=document.querySelector('[data-first-run-setup]'); form.querySelector('[name="actorName"]').value='Flow Test Owner'; form.querySelector('[name="confirmLocalMode"]').checked=true; form.requestSubmit(); return true; })()`);
      await waitFor(client.evaluate, `!document.querySelector('[data-first-run-setup]') && document.body.innerText.includes('Projects')`);
    }
    await client.evaluate(`openFileImportReviewModal(${JSON.stringify({ candidates: [{ localPath: sourcePath, name: path.basename(sourcePath), size: stat.size }], skipped: [] })}); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Add to Discovery'`);
    await client.evaluate(`(() => { const form=document.querySelector('.modal form'); form.querySelector('[name="externalSecurityAcknowledged"]').checked=true; const actor=form.querySelector('[name="actorName"]'); if(actor && !actor.value) actor.selectedIndex=1; const preset=form.querySelector('[name="reasonPreset"]'); if(preset){preset.value='Added supporting evidence';preset.dispatchEvent(new Event('change',{bubbles:true}));} const reason=form.querySelector('[name="reason"]'); if(reason && !reason.value) reason.value='Added supporting evidence'; form.requestSubmit(); return true; })()`);
    try {
      await waitFor(client.evaluate, `document.querySelector('[data-final-review]')?.hidden === false`);
    } catch (error) {
      error.details = await client.evaluate(`(() => ({title:document.querySelector('.modal-title')?.textContent,modal:document.querySelector('.modal')?.innerText,values:Object.fromEntries(new FormData(document.querySelector('.modal form')||document.createElement('form')).entries()),exceptions:${JSON.stringify(client.exceptions)}}))()`);
      throw error;
    }
    await client.evaluate(`document.querySelector('.modal button[type="submit"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Review Discovery'`, 30000);
    const review = await client.evaluate(`(() => ({mode:document.querySelector('#unitReviewMode')?.value,titles:[...document.querySelectorAll('[id^="unit_title_"]')].map(x=>x.value).filter(Boolean),units:document.querySelectorAll('.discovery-unit-editor').length,multipleHidden:document.querySelector('[data-multiple-discovery-routes]')?.hidden,submit:document.querySelector('.modal button[type="submit"]')?.textContent}))()`);
    assert(review.mode === "multiple_units", "Multi-unit review was not suggested for the two-heading document.", review);
    assert(review.titles.includes("Flow Reliability Work") && review.titles.includes("Personal Research Notebook"), "Rendered document map lost detected headings.", review);
    assert(review.multipleHidden === false, "Multi-unit editor was hidden.", review);
    assert(review.submit === "Confirm", "Discovery confirmation received a redundant second review step.", review);
    await client.evaluate(`(() => { const first=document.querySelector('[name="unit_destination_0"]'); const second=document.querySelector('[name="unit_destination_1"]'); first.value='proposed_new_project'; second.value='proposed_new_project'; document.querySelector('[name="unit_title_0"]').value='Flow Reliability Project'; document.querySelector('[name="unit_title_1"]').value='Personal Research Project'; document.querySelector('.modal form').requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `!document.querySelector('.modal') && activeRootView === 'intake'`, 30000);
    const result = await client.evaluate(`(() => { const items=(store.intakeItems||[]).filter(x=>Boolean(x.discoveryCaseId)); return {activeRootView,count:items.length,units:items.map(x=>({id:x.discoveryUnitId,title:x.discoveryUnitTitle,destination:x.destination,projectName:x.proposedProjectName,fileVersionId:x.fileVersionId,sha256:x.sourceSha256,managedPath:x.evidence?.managedFile?.managedPath})),body:document.body.innerText}; })()`);
    assert(result.count === 2, "Live UI did not create two pending Intake proposals.", result);
    assert(new Set(result.units.map((item) => item.fileVersionId)).size === 1, "Live units do not share one immutable File Version.", result.units);
    assert(new Set(result.units.map((item) => item.sha256)).size === 1, "Live units do not share one exact source checksum.", result.units);
    assert(new Set(result.units.map((item) => item.managedPath)).size === 1, "Live unit flow duplicated the managed source file.", result.units);
    assert(result.body.includes("Flow Reliability Project") && result.body.includes("Personal Research Project"), "Intake did not render both routed unit proposals.", result);
    assert(client.exceptions.length === 0, "The live renderer reported an exception.", client.exceptions);
    console.log("Multi-Idea Live UI Check");
    console.log(JSON.stringify({ reviewMode: review.mode, detectedTitles: review.titles.slice(0, 2), intakeProposals: result.count, independentDestinations: result.units.map((item) => item.destination), sharedFileVersion: true, sharedChecksum: true, managedBytesNotDuplicated: true, rendererExceptions: 0 }, null, 2));
    console.log("Multi-idea live UI: ok");
  } finally {
    client.socket.close();
  }
}

if (require.main === module) main().catch((error) => { console.error("Multi-idea live UI failed:"); console.error(error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });

module.exports = { connect, waitFor };
