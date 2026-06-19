const fs = require("node:fs/promises");

function usage() {
  return [
    "Project State generic API arm connector",
    "",
    "Usage:",
    "  node scripts/api-arm-submit.js --url http://127.0.0.1:32145 --file envelope.json",
    "  Get-Content envelope.json | node scripts/api-arm-submit.js --url http://127.0.0.1:32145",
    "",
    "Required environment:",
    "  PROJECT_STATE_API_ARM_TOKEN",
    "",
    "The token is intentionally not accepted as a command-line argument."
  ].join("\n");
}

function parseArgs(argv) {
  const result = { url: "http://127.0.0.1:32145", file: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") result.help = true;
    else if (arg === "--url") result.url = argv[++index] || "";
    else if (arg === "--file") result.file = argv[++index] || "";
    else if (arg === "--token" || arg.startsWith("--token=")) throw new Error("Token arguments are forbidden. Use PROJECT_STATE_API_ARM_TOKEN.");
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return result;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const token = String(process.env.PROJECT_STATE_API_ARM_TOKEN || "").trim();
  if (!token) throw new Error("PROJECT_STATE_API_ARM_TOKEN is required.");
  const baseUrl = new URL(args.url);
  if (baseUrl.hostname !== "127.0.0.1" && baseUrl.hostname !== "localhost") throw new Error("The v0.1 connector only sends to local loopback.");
  const raw = args.file ? await fs.readFile(args.file, "utf8") : await readStdin();
  const envelope = JSON.parse(raw);
  if (envelope?.contractVersion !== "0.1") throw new Error("Envelope contractVersion must be 0.1.");
  const endpoint = new URL("/v0.1/submissions", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(envelope)
  });
  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  if (!response.ok || result.status === "rejected" || result.status === "error") process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Connector failed: ${error.message}`);
  process.exitCode = 1;
});
