const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const artifacts = [
  {
    file: "checkpoints/Project-State-Final-Pre-Discovery-0.1.0-x64.exe",
    bytes: 101727844,
    sha256: "8f4ca66e9fb1c9d690e9556ca9f0e8d022edeebedecae80d77a05d786e4de5d1"
  },
  {
    file: "checkpoints/Project-State-Final-Pre-Discovery-Source.zip",
    bytes: 295911,
    sha256: "426a86db32f11856c8b47427e53ff298b8d4683b92268d0f720a6f2e3413a95b"
  }
];

function checksum(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function main() {
  for (const artifact of artifacts) {
    const filePath = path.join(ROOT, ...artifact.file.split("/"));
    assert(fs.existsSync(filePath), `Checkpoint artifact is missing: ${artifact.file}`);
    assert.equal(fs.statSync(filePath).size, artifact.bytes, `Checkpoint size changed: ${artifact.file}`);
    assert.equal(checksum(filePath), artifact.sha256, `Checkpoint checksum changed: ${artifact.file}`);
  }
  const checkpoint = fs.readFileSync(path.join(ROOT, "PRE_DISCOVERY_CHECKPOINT.md"), "utf8");
  assert(checkpoint.includes("final-pre-discovery-v0.1"));
  assert(checkpoint.includes("Discovery implementation must not rewrite or replace these checkpoint artifacts."));

  console.log("Pre-Discovery Checkpoint Check");
  console.log(JSON.stringify({ label: "final-pre-discovery-v0.1", artifacts: artifacts.length, immutable: true }, null, 2));
  console.log("Pre-Discovery checkpoint: ok");
}

try {
  main();
} catch (error) {
  console.error("Pre-Discovery checkpoint check failed:");
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
