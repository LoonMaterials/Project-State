const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt", ".md", ".csv", ".json", ".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const CONTENT_TYPES = new Map([
  [".md", "text/markdown"],
  [".txt", "text/plain"],
  [".csv", "text/csv"],
  [".json", "application/json"],
  [".pdf", "application/pdf"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);

function usage() {
  return [
    "Project State API folder discovery connector",
    "",
    "Usage:",
    "  node scripts/api-arm-submit-folder.js --url http://127.0.0.1:32145 --folder \"D:\\PS API Folder Test\" --project-id project_id --actor-id actor_owner --reason \"Trusted test folder\"",
    "",
    "Options:",
    "  --group-mode folder-groups | one-case | each-file",
    "  --case-title \"Case title\"",
    "",
    "Required environment:",
    "  PROJECT_STATE_API_ARM_TOKEN",
    "",
    "The token is intentionally not accepted as a command-line argument."
  ].join("\n");
}

function parseArgs(argv) {
  const result = { url: "http://127.0.0.1:32145", folder: "", projectId: "", actorId: "", reason: "", groupMode: "folder-groups", caseTitle: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--url") result.url = argv[++index] || "";
    else if (arg === "--folder") result.folder = argv[++index] || "";
    else if (arg === "--project-id") result.projectId = argv[++index] || "";
    else if (arg === "--actor-id") result.actorId = argv[++index] || "";
    else if (arg === "--reason") result.reason = argv[++index] || "";
    else if (arg === "--group-mode") result.groupMode = argv[++index] || "";
    else if (arg === "--case-title") result.caseTitle = argv[++index] || "";
    else if (arg === "--token" || arg.startsWith("--token=")) throw new Error("Token arguments are forbidden. Use PROJECT_STATE_API_ARM_TOKEN.");
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

async function walkFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) results.push(...await walkFiles(fullPath));
    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.has(extension)) results.push(fullPath);
    }
  }
  return results.sort((a, b) => relativePath(root, a).localeCompare(relativePath(root, b)));
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).replace(/\\/g, "/");
}

function groupLabel(root, filePath, mode) {
  const relative = relativePath(root, filePath);
  if (mode === "one-case") return "Selected folder";
  if (mode === "each-file") return relative;
  const parts = relative.split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "Folder root";
}

function safeId(value) {
  return String(value || "").replace(/[^A-Za-z0-9._:-]/g, "_").replace(/^_+/, "").slice(0, 96) || "folder";
}

async function submitFile({ baseUrl, token, root, filePath, projectId, actorId, reason, folderBatchId, discoveryCaseId, group, isFinalFile }) {
  const bytes = await fs.readFile(filePath);
  const relative = relativePath(root, filePath);
  const extension = path.extname(filePath).toLowerCase();
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  const submittedAt = new Date().toISOString();
  const submissionId = `folder_${safeId(folderBatchId)}_${safeId(relative)}`;
  const metadata = {
    contractVersion: "0.1",
    submissionId,
    idempotencyKey: `${submissionId}_key`,
    submittedAt,
    arm: {
      armId: "project_state_folder_discovery_connector",
      displayName: "Project State Folder Discovery Connector",
      type: "file",
      armVersion: "0.1.0"
    },
    target: { projectId },
    provenance: {
      sourceLabel: `Folder discovery: ${group}`,
      externalReference: relative,
      capturedAt: submittedAt
    },
    file: {
      fileName: path.basename(filePath),
      contentType: CONTENT_TYPES.get(extension) || "application/octet-stream",
      sha256
    },
    discovery: {
      enabled: true,
      folderBatchId,
      discoveryCaseId,
      caseTitle: group,
      actorId,
      reason,
      relativePath: relative,
      groupingRationale: `Relative folder group: ${group}`,
      privacyClass: "local_only",
      extract: true,
      analyzeWhenComplete: isFinalFile
    }
  };
  const response = await fetch(new URL("/v0.1/files", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Project-State-File-Metadata": Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url")
    },
    body: bytes
  });
  const result = await response.json();
  if (!response.ok || result.status === "rejected" || result.status === "error") {
    const error = new Error(`Folder file submission failed for ${relative}.`);
    error.result = result;
    throw error;
  }
  return {
    relativePath: relative,
    status: result.status,
    intakeId: result.file?.intakeId || "",
    discoveryCaseId: result.file?.discovery?.discoveryCaseId || discoveryCaseId,
    fileVersionId: result.file?.discovery?.fileVersionId || "",
    extraction: result.file?.discovery?.extraction || null,
    analysis: result.file?.discovery?.analysis || null
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const token = String(process.env.PROJECT_STATE_API_ARM_TOKEN || "").trim();
  if (!token) throw new Error("PROJECT_STATE_API_ARM_TOKEN is required.");
  if (!args.folder || !args.projectId || !args.actorId || !args.reason) throw new Error("--folder, --project-id, --actor-id, and --reason are required.");
  if (!["folder-groups", "one-case", "each-file"].includes(args.groupMode)) throw new Error("--group-mode must be folder-groups, one-case, or each-file.");
  const baseUrl = new URL(args.url);
  if (baseUrl.hostname !== "127.0.0.1" && baseUrl.hostname !== "localhost") throw new Error("The v0.1 connector only sends to local loopback.");
  const root = path.resolve(args.folder);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error("--folder must point to a directory.");
  const files = await walkFiles(root);
  if (!files.length) throw new Error("No supported files were found in the folder.");
  const folderBatchId = `folder_batch_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  const grouped = new Map();
  for (const filePath of files) {
    const label = args.caseTitle && args.groupMode === "one-case" ? args.caseTitle : groupLabel(root, filePath, args.groupMode);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(filePath);
  }
  const cases = [];
  for (const [group, groupFiles] of grouped.entries()) {
    const discoveryCaseId = `discovery_case_${safeId(folderBatchId)}_${safeId(group)}`;
    const submitted = [];
    for (let index = 0; index < groupFiles.length; index += 1) {
      submitted.push(await submitFile({
        baseUrl,
        token,
        root,
        filePath: groupFiles[index],
        projectId: args.projectId,
        actorId: args.actorId,
        reason: args.reason,
        folderBatchId,
        discoveryCaseId,
        group,
        isFinalFile: index === groupFiles.length - 1
      }));
    }
    cases.push({ group, discoveryCaseId, files: submitted.length, submitted });
  }
  console.log(JSON.stringify({ status: "accepted", folder: root, folderBatchId, files: files.length, cases }, null, 2));
}

main().catch((error) => {
  console.error(`Folder connector failed: ${error.message}`);
  if (error.result) console.error(JSON.stringify(error.result, null, 2));
  process.exitCode = 1;
});
