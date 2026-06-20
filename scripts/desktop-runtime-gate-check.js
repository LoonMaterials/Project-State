const fs = require("fs");
const path = require("path");

const APP_FILE = path.join(__dirname, "..", "app.js");
const BRIDGE_DOC = path.join(__dirname, "..", "DESKTOP_BRIDGE.md");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function main() {
  const appText = fs.readFileSync(APP_FILE, "utf8");
  const bridgeDoc = fs.readFileSync(BRIDGE_DOC, "utf8");

  const requiredAppPieces = [
    "function desktopRuntimeReady()",
    "function desktopBridgeAllowed()",
    "function browserDevRuntime()",
    "function seriousStorageWorkAllowed()",
    "function renderBrowserDevModeGate()",
    "function browserDevActionAllowed(action)",
    "function runtimeWarningHtml()",
    "browserRuntimeWarning",
    "browserDevGateTitle",
    "browserDevNoSilentStorage",
    "browser-dev-indexeddb-split",
    "browser-dev-legacy-json",
    "storageModeForLoadedSource"
  ];
  const missingAppPieces = requiredAppPieces.filter((piece) => !appText.includes(piece));
  assert(!missingAppPieces.length, "Desktop runtime gate is missing app pieces.", { missingAppPieces });

  const desktopAdapterStart = appText.indexOf("function createDesktopPlatformAdapter");
  const browserAdapterStart = appText.indexOf("function createBrowserPlatformAdapter");
  assert(desktopAdapterStart > -1 && browserAdapterStart > desktopAdapterStart, "Could not locate desktop adapter boundary.");
  const desktopAdapterText = appText.slice(desktopAdapterStart, browserAdapterStart);
  assert(desktopAdapterText.includes("return typeof storage.loadStore === \"function\" && typeof storage.saveStore === \"function\";"), "Desktop adapter supported() still appears to allow browser fallback.");
  assert(!desktopAdapterText.includes("|| browserFallback.storage.supported()"), "Desktop adapter still silently falls back to browser storage support.");
  assert(appText.includes('return window.location?.protocol === "file:";'), "Web runtime could still accept an injected desktop bridge.");
  const indexText = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert(indexText.includes("connect-src 'none'"), "Web runtime must block all outbound network connections.");
  assert(indexText.includes("object-src 'none'") && indexText.includes("frame-src 'none'"), "Web runtime must block external objects and frames.");
  assert(/if \(browserDevRuntime\(\)\) \{\s+renderBrowserDevModeGate\(\);\s+return;\s+\}/.test(appText), "Startup render path does not gate browser/dev mode.");
  assert(appText.includes("if (!seriousStorageWorkAllowed() && !options.allowInBrowserDev)"), "saveStore does not block serious storage work without the desktop bridge.");
  assert(/if \(seriousStorageWorkAllowed\(\)\) \{\s+if \(loaded\.source === "legacy-json"\) await ProjectStateStorage\.preserveLegacyRaw\(loaded\.raw\);/.test(appText), "loadStore still appears to allow silent browser migration writes.");

  const requiredDocPieces = [
    "Project State is now app-first",
    "Desktop app runtime",
    "Browser mode is now a development and legacy migration harness",
    "It must not be expanded into a second production runtime",
    "New storage, backup, restore, intake, file-reading, and API work must target the desktop bridge",
    "API arms plug into the desktop app's Intake Airlock",
    "They must never write directly to Core Project State records",
    "Startup gate",
    "Browser/dev mode must not silently save, migrate, back up, restore, intake, read files as authoritative sources, or edit Project State records",
    "Full Project State mode requires the desktop bridge"
  ];
  const missingDocPieces = requiredDocPieces.filter((piece) => !bridgeDoc.includes(piece));
  assert(!missingDocPieces.length, "Desktop bridge docs are missing runtime gate language.", { missingDocPieces });

  console.log("Desktop Runtime Gate Check");
  console.log(JSON.stringify({
    appPieces: requiredAppPieces.length,
    desktopAdapterFallbackRemoved: true,
    docsUpdated: true
  }, null, 2));
  console.log("Desktop runtime gate: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop runtime gate failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
