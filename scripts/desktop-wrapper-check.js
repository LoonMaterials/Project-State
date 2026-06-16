const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PACKAGE_FILE = path.join(ROOT, "package.json");
const MAIN_FILE = path.join(ROOT, "desktop", "main.cjs");
const PRELOAD_FILE = path.join(ROOT, "desktop", "preload.cjs");
const INDEX_FILE = path.join(ROOT, "index.html");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function main() {
  const pkg = JSON.parse(readText(PACKAGE_FILE));
  const mainSource = readText(MAIN_FILE);
  const preloadSource = readText(PRELOAD_FILE);
  const indexSource = readText(INDEX_FILE);

  assert(pkg.main === "desktop/main.cjs", "package.json main must point to the desktop wrapper.");
  assert(pkg.scripts?.desktop === "electron .", "package.json is missing the desktop launch script.");
  assert(pkg.devDependencies?.electron, "package.json is missing Electron as a dev dependency.");

  assert(mainSource.includes("BrowserWindow"), "Desktop main file must create a BrowserWindow.");
  assert(mainSource.includes("loadFile(INDEX_HTML)"), "Desktop wrapper must load index.html directly, not through a server.");
  assert(mainSource.includes("preload: PRELOAD"), "Desktop wrapper must load the preload bridge.");
  assert(mainSource.includes("contextIsolation: true"), "Desktop wrapper should keep context isolation on.");
  assert(mainSource.includes("nodeIntegration: false"), "Desktop wrapper should keep node integration off in the renderer.");

  assert(preloadSource.includes("contextBridge.exposeInMainWorld"), "Preload must expose the desktop bridge through contextBridge.");
  assert(preloadSource.includes("ProjectStateDesktop"), "Preload must expose window.ProjectStateDesktop.");
  assert(preloadSource.includes("createProjectStateDesktopBridge"), "Preload must create the desktop bridge implementation.");

  assert(indexSource.includes("app.js"), "index.html must still load app.js.");
  assert(!mainSource.includes("http://") && !mainSource.includes("https://localhost"), "Desktop wrapper should not depend on a local server.");

  console.log("Desktop Wrapper Check");
  console.log(JSON.stringify({
    packageMain: pkg.main,
    desktopScript: pkg.scripts.desktop,
    preload: "desktop/preload.cjs",
    entry: "index.html"
  }, null, 2));
  console.log("Desktop wrapper: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop wrapper check failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
