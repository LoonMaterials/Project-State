const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function run() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-state-electron-runtime-"));
  const dbPath = path.join(tempRoot, "runtime-smoke.db");
  try {
    if (!process.versions.electron) throw new Error("Smoke check is not running in the pinned Electron runtime.");
    const db = new DatabaseSync(dbPath);
    db.exec("CREATE TABLE runtime_smoke (id TEXT PRIMARY KEY, value TEXT NOT NULL)");
    db.prepare("INSERT INTO runtime_smoke (id, value) VALUES (?, ?)").run("runtime", "ok");
    const row = db.prepare("SELECT value FROM runtime_smoke WHERE id = ?").get("runtime");
    db.close();
    if (row?.value !== "ok") throw new Error("Packaged Electron SQLite read-back failed.");
    console.log("Electron Runtime Smoke");
    console.log(JSON.stringify({ electron: process.versions.electron, node: process.versions.node, sqlite: process.versions.sqlite, sqliteWriteRead: true }, null, 2));
    console.log("Electron runtime: ok");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

try {
  run();
} catch (error) {
  console.error("Electron runtime smoke failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
