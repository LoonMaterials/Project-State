const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
function assert(condition, message, details = {}) { if (!condition) { const error = new Error(message); error.details = details; throw error; } }
function unique(regex) { return [...new Set([...source.matchAll(regex)].map((match) => match[1]))].sort(); }

const declaredActions = unique(/data-action="([a-z0-9-]+)"/g);
const handledActions = unique(/action === "([a-z0-9-]+)"/g);
const dynamicActions = new Set(["view-image", "open-search-result"]);
const missingActionHandlers = declaredActions.filter((action) => !handledActions.includes(action) && !dynamicActions.has(action));
const orphanActionHandlers = handledActions.filter((action) => !declaredActions.includes(action) && !dynamicActions.has(action));
assert(!missingActionHandlers.length, "Rendered data-action controls are missing handlers.", { missingActionHandlers });
assert(!orphanActionHandlers.length, "Action handlers have no reachable rendered control.", { orphanActionHandlers });

const declaredReviewTools = unique(/data-review-json-tool="([a-z0-9-]+)"/g);
const handledReviewTools = unique(/tool === "([a-z0-9-]+)"/g).filter((tool) => declaredReviewTools.includes(tool));
assert(JSON.stringify(declaredReviewTools) === JSON.stringify(handledReviewTools), "Review notebook tools and handlers drifted.", { declaredReviewTools, handledReviewTools });

const declaredFolderPickers = unique(/data-review-exchange-folder="([a-z0-9_-]+)"/g);
assert(declaredFolderPickers.every((value) => source.includes("data-review-exchange-folder") && source.includes("chooseFolder")), "A Review Exchange folder picker is not connected.", { declaredFolderPickers });

const renderedSubmitForms = unique(/<form[^>]+(data-(?:first-run-setup|settings-[a-z-]+))[^>]*>/g);
const submitRoutes = unique(/closest\("\[([^\]]+)\]"\)/g).filter((value) => value.startsWith("data-first-run-setup") || value.startsWith("data-settings-"));
const normalizedForms = renderedSubmitForms.map((value) => value.replace(/^data-/, "data-"));
const missingSubmitRoutes = normalizedForms.filter((value) => !submitRoutes.includes(value));
assert(!missingSubmitRoutes.length, "Rendered settings/setup forms are missing submit routes.", { renderedSubmitForms, submitRoutes, missingSubmitRoutes });

const modalToolAttributes = ["data-review-json-tool", "data-choose-folder", "data-use-remembered-folder", "data-idea-review-action", "data-remove-file-import-candidate"];
const missingToolListeners = modalToolAttributes.filter((attribute) => source.includes(attribute) && !new RegExp(`closest\\(.[^)]*${attribute}`).test(source) && !source.includes(`querySelectorAll(\"[${attribute}]\")`));
assert(!missingToolListeners.length, "Non-action modal controls are missing listeners.", { missingToolListeners });

console.log("Control Wiring and Orphan Check");
console.log(JSON.stringify({ declaredActions: declaredActions.length, handledActions: handledActions.length, reviewNotebookTools: declaredReviewTools, reviewExchangeFolderPickers: declaredFolderPickers, submitForms: renderedSubmitForms.length, submitRoutes: submitRoutes.length, modalToolFamilies: modalToolAttributes.length, missingActionHandlers: 0, orphanActionHandlers: 0, missingSubmitRoutes: 0, missingToolListeners: 0 }, null, 2));
console.log("Control wiring/orphan check: ok");
