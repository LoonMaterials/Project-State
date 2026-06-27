const path = require("node:path");
const os = require("node:os");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

const ROOT = path.join(__dirname, "..");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function rejectsStorageRoot(storageRoot) {
  try {
    createProjectStateDesktopBridge({ storageRoot });
    return false;
  } catch (error) {
    return /Unsafe Project State storage root/.test(String(error?.message || ""));
  }
}

function main() {
  const appRoot = ROOT;
  const insideAppRoot = path.join(ROOT, "Project State Storage");
  const normalDefaultStyleRoot = path.join(os.homedir(), "Project State Storage");
  const externalTempRoot = path.join(os.tmpdir(), "project-state-storage-root-safety");

  assert(rejectsStorageRoot(appRoot), "Project State must refuse to use the app folder itself as storage.", { appRoot });
  assert(rejectsStorageRoot(insideAppRoot), "Project State must refuse storage inside the app/install folder.", { insideAppRoot });
  assert(!rejectsStorageRoot(normalDefaultStyleRoot), "Default-style user storage root should be allowed.", { normalDefaultStyleRoot });
  assert(!rejectsStorageRoot(externalTempRoot), "External temp storage roots used by checks should be allowed.", { externalTempRoot });

  console.log("Storage Root Safety Check");
  console.log(JSON.stringify({
    appRootRejected: true,
    insideAppRootRejected: true,
    defaultUserStorageAllowed: true,
    tempStorageAllowed: true,
    uninstallReinstallDataBoundary: "storage-outside-app-root"
  }, null, 2));
  console.log("Storage root safety: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Storage root safety failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
