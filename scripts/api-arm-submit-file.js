const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function parseArgs(argv) {
  const result = { url: "http://127.0.0.1:32145", metadata: "", file: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--url") result.url = argv[++index] || "";
    else if (arg === "--metadata") result.metadata = argv[++index] || "";
    else if (arg === "--file") result.file = argv[++index] || "";
    else if (arg === "--token" || arg.startsWith("--token=")) throw new Error("Token arguments are forbidden. Use PROJECT_STATE_API_ARM_TOKEN.");
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!result.metadata || !result.file) throw new Error("--metadata and --file are required.");
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = String(process.env.PROJECT_STATE_API_ARM_TOKEN || "").trim();
  if (!token) throw new Error("PROJECT_STATE_API_ARM_TOKEN is required.");
  const baseUrl = new URL(args.url);
  if (baseUrl.hostname !== "127.0.0.1" && baseUrl.hostname !== "localhost") throw new Error("The v0.1 connector only sends to local loopback.");
  const metadata = JSON.parse(await fs.readFile(args.metadata, "utf8"));
  const bytes = await fs.readFile(args.file);
  metadata.file = {
    ...(metadata.file || {}),
    fileName: metadata.file?.fileName || path.basename(args.file),
    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  };
  const encodedMetadata = Buffer.from(JSON.stringify(metadata), "utf8").toString("base64url");
  const response = await fetch(new URL("/v0.1/files", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "X-Project-State-File-Metadata": encodedMetadata
    },
    body: bytes
  });
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok || result.status === "rejected" || result.status === "error") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`File connector failed: ${error.message}`);
  process.exitCode = 1;
});
