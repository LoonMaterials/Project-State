const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "release-v0.1-contract.json"), "utf8"));
const releaseDoc = fs.readFileSync(path.join(ROOT, "RELEASE_CONTRACT.md"), "utf8");
const mainSource = fs.readFileSync(path.join(ROOT, "desktop", "main.cjs"), "utf8");
const preloadSource = fs.readFileSync(path.join(ROOT, "desktop", "preload.cjs"), "utf8");
const bridgeSource = fs.readFileSync(path.join(ROOT, "desktop", "project-state-desktop-bridge.cjs"), "utf8");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function main() {
  assert(contract.app === "Project State", "Release contract app mismatch.");
  assert(contract.contractType === "desktop-release", "Release contract type mismatch.");
  assert(contract.contractVersion === "0.1", "Release contract version mismatch.");
  assert(packageJson.devDependencies?.electron === contract.runtime.electron, "Electron version is not pinned to the release contract.", { package: packageJson.devDependencies?.electron, contract: contract.runtime.electron });
  assert(packageJson.devDependencies?.["electron-builder"], "electron-builder is not pinned.");
  assert(packageJson.build?.appId === "com.projectstate.desktop", "Release appId is missing.");
  assert(packageJson.build?.asar === true, "Release package must use ASAR.");
  assert(packageJson.build?.win?.target?.some((target) => target.target === "nsis"), "NSIS target is missing.");
  assert(packageJson.build?.nsis?.perMachine === false, "Installer must default to per-user scope.");
  assert(packageJson.build?.nsis?.deleteAppDataOnUninstall === false, "Installer must preserve user data on uninstall.");
  assert(contract.storage.insideInstallDirectory === false, "Storage cannot live in the install directory.");
  assert(contract.storage.deleteOnUninstall === false, "Uninstall cannot delete storage.");
  assert(contract.storage.overwriteOnUpgrade === false, "Upgrade cannot overwrite storage.");
  assert(mainSource.includes("contextIsolation: true"), "Context isolation is not enabled.");
  assert(mainSource.includes("nodeIntegration: false"), "Renderer Node integration is not disabled.");
  assert(mainSource.includes("loadFile(INDEX_HTML)"), "Desktop entry must load bundled index.html.");
  assert(preloadSource.includes("PROJECT_STATE_STORAGE_ROOT"), "Controlled storage-root override is missing.");
  assert(preloadSource.includes('"Project State Storage"'), "Default storage root is missing.");
  assert(bridgeSource.includes('require("node:sqlite")'), "Desktop bridge no longer declares node:sqlite runtime dependency.");

  const requiredDocPhrases = [
    "must not silently delete",
    "%USERPROFILE%\\Project State Storage",
    "ordinary uninstall",
    "code-signed",
    "real-time testing"
  ];
  const missingPhrases = requiredDocPhrases.filter((phrase) => !releaseDoc.includes(phrase));
  assert(!missingPhrases.length, "Release documentation is missing safety requirements.", { missing: missingPhrases });

  const packagedFiles = packageJson.build?.files || [];
  assert(packagedFiles.includes("desktop/**/*"), "Desktop runtime files are not included.");
  assert(!packagedFiles.some((entry) => entry.includes("Project State Storage") || entry.includes("project-state.db")), "Package file rules include user data.");
  const extraResources = packageJson.build?.extraResources || [];
  assert(extraResources.some((entry) => entry.to === "connectors/api-arm-submit.js"), "Generic metadata connector is missing from release resources.");
  assert(extraResources.some((entry) => entry.to === "connectors/api-arm-submit-file.js"), "Generic file connector is missing from release resources.");

  console.log("Desktop Release Contract Check");
  console.log(JSON.stringify({
    contractVersion: contract.contractVersion,
    electron: contract.runtime.electron,
    artifacts: contract.artifacts.length,
    releaseGates: contract.releaseGates.length,
    safetyRules: contract.safetyRules.length,
    storageOutsideInstall: true,
    uninstallPreservesData: true
  }, null, 2));
  console.log("Desktop release contract: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop release contract failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
