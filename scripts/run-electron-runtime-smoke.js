const { spawnSync } = require("node:child_process");
const path = require("node:path");

const electronPath = require("electron");
const smokeScript = path.join(__dirname, "electron-runtime-smoke.cjs");
const result = spawnSync(electronPath, [smokeScript], {
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  encoding: "utf8"
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
