const fs = require("fs");
const path = require("path");
const vm = require("vm");

const {
  extractStore,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");
const {
  approvalFlowTest,
  collectIds,
  dataIntegrityTest,
  searchTest
} = require("./internal-phase2-flow-check");

const APP_FILE = path.join(__dirname, "..", "app.js");
const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function readApp() {
  return fs.readFileSync(APP_FILE, "utf8");
}

function loadLanguageMap(appText) {
  const end = appText.indexOf("const DRAFT_REVIEW_FLAGS");
  assert(end > -1, "Could not find language table boundary.");
  const sandbox = {};
  vm.runInNewContext(`${appText.slice(0, end)}\nthis.LANGUAGES = LANGUAGES;`, sandbox);
  return sandbox.LANGUAGES;
}

function uniqueMatches(text, regex) {
  return [...new Set([...text.matchAll(regex)].map((match) => match[1]))].sort();
}

function interactionWiringTest(appText) {
  const declaredActions = uniqueMatches(appText, /data-action="([a-z0-9-]+)"/g);
  const handledActions = uniqueMatches(appText, /action === "([a-z0-9-]+)"/g);
  const allowedDynamicActions = new Set(["view-image", "open-search-result"]);
  const missingHandlers = declaredActions.filter((action) => !handledActions.includes(action) && !allowedDynamicActions.has(action));
  const unusedHandlers = handledActions.filter((action) => !declaredActions.includes(action) && !allowedDynamicActions.has(action));

  assert(!missingHandlers.length, "Some rendered buttons have no click handler.", { missingHandlers });
  assert(!unusedHandlers.length, "Some click handlers have no rendered action.", { unusedHandlers });

  return {
    declaredActions: declaredActions.length,
    handledActions: handledActions.length,
    dynamicActions: [...allowedDynamicActions]
  };
}

function languageCoverageTest(appText) {
  const languages = loadLanguageMap(appText);
  const keysUsed = uniqueMatches(appText, /\bt\("([^"]+)"\)/g);
  const languagesMissingKeys = {};
  for (const [code, labels] of Object.entries(languages)) {
    const missing = keysUsed.filter((key) => !(key in labels));
    if (missing.length) languagesMissingKeys[code] = missing;
  }

  assert(!Object.keys(languagesMissingKeys).length, "Some languages are missing UI keys.", { languagesMissingKeys });

  const keyCounts = Object.fromEntries(Object.entries(languages).map(([code, labels]) => [code, Object.keys(labels).length]));
  const englishKeys = Object.keys(languages.en || {}).sort();
  const parity = {};
  for (const [code, labels] of Object.entries(languages)) {
    parity[code] = {
      missingFromEnglish: Object.keys(labels).filter((key) => !englishKeys.includes(key)).sort(),
      missingFromLanguage: englishKeys.filter((key) => !(key in labels)).sort()
    };
  }
  const parityErrors = Object.entries(parity).filter(([, result]) => result.missingFromEnglish.length || result.missingFromLanguage.length);
  assert(!parityErrors.length, "Language dictionaries are not in parity.", { parity });

  return {
    languages: Object.keys(languages),
    keysUsed: keysUsed.length,
    keyCounts
  };
}

function hardcodedLabelRegressionTest(appText) {
  const oldPatterns = [
    /<p class="item-meta">Type:/,
    /<p class="item-meta">Date Added:/,
    /<p class="item-meta">Actor:/,
    /<p class="item-meta">Project:/,
    /<p class="item-meta">Location:/,
    /<p class="item-meta">Local File:/,
    /<p class="item-meta">Mode:/,
    /<p class="item-meta">Suggestion Status:/,
    /<p class="item-meta">Suggested By:/,
    /<p class="item-meta">File:/,
    /<p class="item-meta">Status:/,
    /<p class="item-meta">Due:/,
    /<p class="item-meta">Completed:/,
    /aria-label="View /,
    /<strong>Storage warning:/,
    /const message = info\.level[\s\S]{0,120}Local saved data is/,
    /setSaveStatus\("unsaved", "Unsaved changes/,
    /confirm\("Reset local Project State data\?/,
    /confirm\("Reset all local Project State data\?/,
    /confirm\("Final confirmation: reset local data/,
    /setSaveStatus\("saved", "Reset complete/
  ];
  const found = oldPatterns.filter((pattern) => pattern.test(appText)).map((pattern) => String(pattern));
  assert(!found.length, "Old hardcoded labels are still present in render paths.", { found });
  return { checkedPatterns: oldPatterns.length };
}

function platformBoundaryTest(appText) {
  const required = [
    "createProjectStatePlatformAdapter",
    "window.ProjectStateDesktop",
    "platformAdapter.storage",
    "platformAdapter.files",
    "platformAdapter.downloads",
    "ProjectStateStorage.usesExternalStore",
    "desktopRuntimeReady",
    "browserDevRuntime",
    "runtimeWarningHtml"
  ];
  const missing = required.filter((text) => !appText.includes(text));
  assert(!missing.length, "Platform adapter boundary is missing required pieces.", { missing });

  const adapterStart = appText.indexOf("function createProjectStatePlatformAdapter");
  const adapterEnd = appText.indexOf("const ProjectStateStorage =");
  assert(adapterStart > -1 && adapterEnd > adapterStart, "Could not locate platform adapter boundary.");
  const outsideAdapter = `${appText.slice(0, adapterStart)}\n${appText.slice(adapterEnd)}`;
  const forbiddenOutsideAdapter = [
    "localStorage.",
    "indexedDB.",
    "new FileReader",
    "webkitRelativePath",
    "URL.createObjectURL",
    "new Blob",
    "DecompressionStream",
    "new Response"
  ];
  const leaks = forbiddenOutsideAdapter.filter((text) => outsideAdapter.includes(text));
  assert(!leaks.length, "Browser-only APIs leaked outside the platform adapter.", { leaks });

  return {
    requiredPieces: required.length,
    forbiddenApisChecked: forbiddenOutsideAdapter.length
  };
}

function outsideSourceProjectCreationTest(appText, store) {
  assert(appText.includes("createIntakeItem({"), "Intake creation path is missing.");
  assert(appText.includes("approveIntakeItem(intake.id"), "Intake approval path is missing.");
  assert(appText.includes("applyApprovedIntakeToCore(item"), "Approved intake is not routed through the core application function.");
  assert(appText.includes("sourceLinks: sourceLink ? [sourceLink] : []"), "Approved draft project does not preserve source links.");
  assert(appText.includes("draftSource: {"), "Approved draft project does not retain draft/source lineage.");
  assert(appText.includes("openProjectNow(approvedProject.id)"), "Approved draft project is not opened after creation.");

  const result = approvalFlowTest(store, true);
  const created = result.store.projects.find((project) => project.id === result.createdProjectId);
  assert(created, "Approved draft project was not created in the approval flow test.", result);
  assert(created.sourceLinks?.[0]?.sourceId && created.sourceLinks?.[0]?.extractId, "Approved draft project is missing source/extract links.", created);
  assert(created.draftSource?.sourceProjectId && created.draftSource?.extractId, "Approved draft project is missing draftSource lineage.", created);
  assert(created.changes?.some((change) => change.summary === "Project created from approved draft"), "Approved draft project history was not recorded.", created.changes);

  const ids = collectIds(result.store);
  assert(!ids.duplicates.length, "Duplicate IDs after outside-source project creation.", { duplicates: ids.duplicates });

  return {
    createdProjectId: result.createdProjectId,
    sourceLinkPreserved: Boolean(created.sourceLinks?.[0]?.sourceId),
    extractLinkPreserved: Boolean(created.sourceLinks?.[0]?.extractId),
    historyRecords: created.changes.length,
    uniqueIds: ids.ids.size
  };
}

function main() {
  const appText = readApp();
  const store = extractStore(JSON.parse(fs.readFileSync(FIXTURE, "utf8")));
  const integrityErrors = verifyStoreIntegrity(store);
  assert(!integrityErrors.length, "Fixture store integrity failed before deep debug.", { integrityErrors });

  const results = {
    interactions: interactionWiringTest(appText),
    language: languageCoverageTest(appText),
    hardcodedLabels: hardcodedLabelRegressionTest(appText),
    platformBoundary: platformBoundaryTest(appText),
    dataIntegrity: dataIntegrityTest(store),
    outsideSourceProjectCreation: outsideSourceProjectCreationTest(appText, store),
    search: searchTest(store)
  };

  console.log("Deep Debug: Interactions, Language, Outside Source Creation");
  console.log(JSON.stringify(results, null, 2));
  console.log("Deep debug: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
