const { connect } = require("./run-multi-idea-live-ui-check.js");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }

async function main() {
  const port = Number(process.argv[2] || 9233);
  const client = await connect(port);
  const views = ["projects", "inbox", "work-orders", "files", "archived", "intake", "settings"];
  const results = [];
  try {
    for (const view of views) {
      const result = await client.evaluate(`(() => {
        activeRootView=${JSON.stringify(view)}; activeProjectId=null; render();
        const ids=[...document.querySelectorAll('#app [id]')].map((element)=>element.id);
        const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
        const buttons=[...document.querySelectorAll('#app button')];
        const unwired=buttons.filter((button)=>!button.disabled && button.type!=='submit' && !button.dataset.action && !button.matches('[data-review-json-tool],[data-native-folder-picker],[data-choose-folder],[data-use-remembered-folder],[data-idea-review-action],[data-remove-file-import-candidate]')).map((button)=>button.textContent.trim()||button.outerHTML.slice(0,120));
        const emptySelects=[...document.querySelectorAll('#app select')].filter((select)=>select.options.length===0).map((select)=>select.name||select.id||select.outerHTML.slice(0,120));
        const unnamedFields=[...document.querySelectorAll('#app input:not([type="hidden"]),#app select,#app textarea')].filter((field)=>!field.name&&!field.id&&!field.hasAttribute('data-search-input')).map((field)=>field.outerHTML.slice(0,160));
        return {view:${JSON.stringify(view)},buttons:buttons.length,selects:document.querySelectorAll('#app select').length,forms:document.querySelectorAll('#app form').length,duplicates,unwired,emptySelects,unnamedFields};
      })()`);
      assert(!result.duplicates.length, `Duplicate rendered IDs in ${view}.`, result);
      assert(!result.unwired.length, `Visible buttons without a recognized wiring path in ${view}.`, result);
      assert(!result.emptySelects.length, `Empty dropdowns in ${view}.`, result);
      assert(!result.unnamedFields.length, `Rendered form fields without names or IDs in ${view}.`, result);
      results.push(result);
    }
    assert(client.exceptions.length === 0, "Renderer exceptions occurred during the rendered-control sweep.", client.exceptions);
    console.log("Rendered Control Sweep");
    console.log(JSON.stringify({ views: results, totalButtons: results.reduce((sum, item) => sum + item.buttons, 0), totalSelects: results.reduce((sum, item) => sum + item.selects, 0), totalForms: results.reduce((sum, item) => sum + item.forms, 0), rendererExceptions: 0 }, null, 2));
    console.log("Rendered controls: ok");
  } finally { client.socket.close(); }
}

if (require.main === module) main().catch((error) => { console.error("Rendered control sweep failed:"); console.error(error.stack || error.message); if (error.details) console.error(JSON.stringify(error.details, null, 2)); process.exitCode = 1; });
