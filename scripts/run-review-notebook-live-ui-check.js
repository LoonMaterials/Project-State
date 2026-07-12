const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { connect, waitFor } = require("./run-multi-idea-live-ui-check.js");

function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const port = Number(process.argv[2] || 9233);
  const incoming = fs.mkdtempSync(path.join(os.tmpdir(), "project-state-review-notebook-"));
  const client = await connect(port);
  try {
    const needsSetup = await client.evaluate(`Boolean(document.querySelector('[data-first-run-setup]'))`);
    if (needsSetup) throw new Error("Complete the isolated first-run setup before running the review notebook live check.");
    await client.evaluate(`(() => { store.settings.reviewExchangeMode='automatic'; store.settings.reviewExchangeIncomingFolder=${JSON.stringify(incoming)}; openExternalReviewImportModal(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('.modal-title')?.textContent === 'Paste Reviewed Evidence JSON'`);
    const buttonCount = await client.evaluate(`document.querySelectorAll('[data-review-json-tool]').length`);
    assert(buttonCount === 5, "The review notebook did not render all five editing tools.", { buttonCount });

    await client.evaluate(`(() => { const note=document.querySelector('[name="reviewJson"]'); note.value='{broken'; note.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-review-json-tool="continue"]').click(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-review-json-status]')?.textContent.includes('Editing remains open')`);

    await client.evaluate(`document.querySelector('[data-review-json-tool="exact-evidence"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('[name="reviewJson"]')?.value.includes('PASTE_EXACT_CHUNK_ID')`);

    await client.evaluate(`document.querySelector('[data-review-json-tool="copy"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('[data-review-json-status]')?.textContent.toLowerCase().includes('copied')`);

    await client.evaluate(`document.querySelector('[data-review-json-tool="paste"]').click(); true`);
    await waitFor(client.evaluate, `/pasted|clipboard reading/.test(document.querySelector('[data-review-json-status]')?.textContent.toLowerCase()||'')`);

    await client.evaluate(`document.querySelector('[data-review-json-tool="save-anyway"]').click(); true`);
    await waitFor(client.evaluate, `document.querySelector('[data-review-json-status]')?.textContent.includes('Saved without importing')`, 20000);
    assert(fs.readdirSync(incoming).some((name) => name.startsWith("unvalidated-external-review-") && name.endsWith(".json")), "Save anyway did not create an unvalidated JSON file.");

    await client.evaluate(`(() => { const form=document.querySelector('.modal form'); const note=form.querySelector('[name="reviewJson"]'); note.value='{still-broken'; const preset=form.querySelector('[name="reasonPreset"]'); preset.value='Import corrected review result'; preset.dispatchEvent(new Event('change',{bubbles:true})); form.requestSubmit(); return true; })()`);
    await waitFor(client.evaluate, `document.querySelector('[data-review-json-status]')?.textContent.includes('Validation needs attention')`, 20000);
    const result = await client.evaluate(`(() => ({title:document.querySelector('.modal-title')?.textContent,editable:!document.querySelector('[name="reviewJson"]')?.disabled,status:document.querySelector('[data-review-json-status]')?.textContent,buttons:[...document.querySelectorAll('[data-review-json-tool]')].map((button)=>button.textContent.trim())}))()`);
    assert(result.title === "Paste Reviewed Evidence JSON" && result.editable, "Validation failure did not return to an editable notebook.", result);
    assert(client.exceptions.length === 0, "The live renderer reported an exception.", client.exceptions);
    console.log("Review Notebook Live UI Check");
    console.log(JSON.stringify({ controls: result.buttons, continueEditing: true, copyResponded: true, pasteResponded: true, exactEvidenceInserted: true, saveAnywayCreatedFile: true, validationReturnedToEditing: true, rendererExceptions: 0 }, null, 2));
    console.log("Review notebook live UI: ok");
  } finally {
    client.socket.close();
    fs.rmSync(incoming, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch((error) => { console.error("Review notebook live UI failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
