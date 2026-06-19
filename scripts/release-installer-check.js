const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const installerName = `Project-State-Setup-${packageJson.version}-x64.exe`;
const installerPath = path.join(ROOT, "release", installerName);
const blockMapPath = `${installerPath}.blockmap`;
const manifestPath = path.join(ROOT, "release", "release-candidate-manifest.json");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function signatureStatus(filePath) {
  if (process.platform !== "win32") return "Unknown";
  const escaped = filePath.replace(/'/g, "''");
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const result = spawnSync(powershell, ["-NoProfile", "-Command", `(Get-AuthenticodeSignature -LiteralPath '${escaped}').Status`], { encoding: "utf8" });
  if (result.status === 0 && String(result.stdout || "").trim()) return String(result.stdout).trim();
  return hasEmbeddedAuthenticodeCertificate(filePath) ? "Present-Unverified" : "NotSigned";
}

function hasEmbeddedAuthenticodeCertificate(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.length < 256 || bytes.readUInt16LE(0) !== 0x5a4d) return false;
  const peOffset = bytes.readUInt32LE(0x3c);
  if (peOffset + 160 >= bytes.length || bytes.toString("ascii", peOffset, peOffset + 4) !== "PE\u0000\u0000") return false;
  const optionalOffset = peOffset + 24;
  const magic = bytes.readUInt16LE(optionalOffset);
  const dataDirectoryOffset = optionalOffset + (magic === 0x20b ? 112 : magic === 0x10b ? 96 : 0);
  if (!dataDirectoryOffset) return false;
  const securityDirectoryOffset = dataDirectoryOffset + (4 * 8);
  if (securityDirectoryOffset + 8 > bytes.length) return false;
  return bytes.readUInt32LE(securityDirectoryOffset) > 0 && bytes.readUInt32LE(securityDirectoryOffset + 4) > 0;
}

function main() {
  assert(fs.existsSync(installerPath), "NSIS installer is missing.", { installerPath });
  assert(fs.existsSync(blockMapPath), "NSIS installer block map is missing.");
  const stats = fs.statSync(installerPath);
  assert(stats.size > 50 * 1024 * 1024, "Installer is unexpectedly small.", { bytes: stats.size });
  const signature = signatureStatus(installerPath);
  const signed = signature === "Valid";
  const manifest = {
    app: "Project State",
    releaseCandidateVersion: packageJson.version,
    generatedAt: new Date().toISOString(),
    platform: "windows",
    architecture: "x64",
    installer: {
      fileName: installerName,
      bytes: stats.size,
      sha256: sha256(installerPath),
      signatureStatus: signature,
      signed
    },
    unpackedDirectory: "win-unpacked",
    testOnly: !signed,
    publicDistributionReady: signed,
    remainingGate: "real-time-desktop-tests"
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  assert(manifest.testOnly === !manifest.installer.signed, "Unsigned release labeling is inconsistent.");
  console.log("Desktop Release Installer Check");
  console.log(JSON.stringify(manifest, null, 2));
  console.log("Desktop release installer: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop release installer failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
