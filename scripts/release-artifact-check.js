const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const UNPACKED = path.join(ROOT, "release", "win-unpacked");
const EXE = path.join(UNPACKED, "Project State.exe");
const RESOURCES = path.join(UNPACKED, "resources");
const ASAR = path.join(RESOURCES, "app.asar");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function findAsarModule() {
  const pnpmRoot = path.join(ROOT, "node_modules", ".pnpm");
  const folder = fs.readdirSync(pnpmRoot).find((name) => name.startsWith("@electron+asar@"));
  if (!folder) throw new Error("@electron/asar package is unavailable for artifact inspection.");
  return require(path.join(pnpmRoot, folder, "node_modules", "@electron", "asar"));
}

function walk(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...walk(fullPath));
    else output.push(fullPath);
  }
  return output;
}

function main() {
  assert(fs.existsSync(EXE), "Unpacked Project State executable is missing.");
  assert(fs.existsSync(ASAR), "Unpacked app.asar is missing.");
  const asar = findAsarModule();
  const entries = asar.listPackage(ASAR).map((entry) => entry.replace(/\\/g, "/"));
  const required = [
    "/index.html",
    "/app.js",
    "/desktop/main.cjs",
    "/desktop/preload.cjs",
    "/desktop/project-state-desktop-bridge.cjs",
    "/desktop/api-arm-transport.cjs",
    "/desktop/api-arm-file-intake.cjs",
    "/fixtures/api-arm-v0.1-contract.json",
    "/fixtures/local-arm-transport-v0.1-contract.json",
    "/fixtures/file-arm-v0.1-contract.json"
  ];
  const missing = required.filter((entry) => !entries.includes(entry));
  assert(!missing.length, "Unpacked ASAR is missing release files.", { missing });

  const forbiddenPatterns = [/project-state\.db$/i, /api-arm-token\.bin$/i, /Project State Storage/i, /\/recovery\//i, /\/backups\//i];
  const forbiddenAsar = entries.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));
  assert(!forbiddenAsar.length, "ASAR contains user data or integration secrets.", { forbidden: forbiddenAsar });
  const unpackedFiles = walk(UNPACKED).map((file) => path.relative(UNPACKED, file).replace(/\\/g, "/"));
  const forbiddenUnpacked = unpackedFiles.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));
  assert(!forbiddenUnpacked.length, "Unpacked artifact contains user data or integration secrets.", { forbidden: forbiddenUnpacked });

  const connectors = [
    "api-arm-submit.js",
    "api-arm-submit-file.js",
    "api-arm-example-envelope.json",
    "file-arm-example-metadata.json"
  ];
  const missingConnectors = connectors.filter((name) => !fs.existsSync(path.join(RESOURCES, "connectors", name)));
  assert(!missingConnectors.length, "Unpacked artifact is missing generic connectors.", { missing: missingConnectors });

  const runtime = spawnSync(EXE, ["-e", "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(':memory:'); db.exec('CREATE TABLE smoke (value TEXT)'); db.prepare('INSERT INTO smoke VALUES (?)').run('ok'); console.log(JSON.stringify({electron:process.versions.electron,node:process.versions.node,sqlite:process.versions.sqlite,value:db.prepare('SELECT value FROM smoke').get().value})); db.close();"], {
    cwd: UNPACKED,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    encoding: "utf8"
  });
  assert(runtime.status === 0, "Packaged runtime SQLite smoke failed.", { status: runtime.status, stderr: runtime.stderr });
  const runtimeLine = String(runtime.stdout || "").trim().split(/\r?\n/).find((line) => line.startsWith("{"));
  const runtimeInfo = JSON.parse(runtimeLine || "{}");
  assert(runtimeInfo.value === "ok", "Packaged runtime SQLite read-back failed.", runtimeInfo);

  console.log("Desktop Release Artifact Check");
  console.log(JSON.stringify({
    executable: path.relative(ROOT, EXE),
    asarEntries: entries.length,
    unpackedFiles: unpackedFiles.length,
    connectors: connectors.length,
    userDataBundled: false,
    secretsBundled: false,
    packagedRuntime: runtimeInfo
  }, null, 2));
  console.log("Desktop release artifact: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop release artifact failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
