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
    "function browserDevRuntime()",
    "function runtimeWarningHtml()",
    "browserRuntimeWarning",
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

  const requiredDocPieces = [
    "Desktop app runtime",
    "Browser mode is now a development and legacy migration harness",
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
