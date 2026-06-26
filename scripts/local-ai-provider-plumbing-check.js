const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");
const { QWEN3_8B_PROVIDER_ID, QWEN3_8B_MODEL_ID, describeLocalAiProviders } = require("../desktop/local-ai-providers.cjs");

async function main() {
  const storageRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-local-ai-plumbing-"));
  try {
    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const capabilities = await bridge.analysisArms.describeCapabilities();
    const providers = await describeLocalAiProviders();
    const qwen = providers.find((provider) => provider.providerId === QWEN3_8B_PROVIDER_ID);
    assert(qwen, "Qwen3 8B local provider is not discoverable.");
    assert.equal(qwen.modelId, QWEN3_8B_MODEL_ID, "Qwen3 8B model ID changed unexpectedly.");
    assert(Array.isArray(capabilities.localProviders), "Analysis capabilities do not include local provider inventory.");
    assert(capabilities.localProviders.some((provider) => provider.providerId === QWEN3_8B_PROVIDER_ID), "Analysis capabilities are missing Qwen3 8B.");
    assert.equal(capabilities.arm.executionLocation, "local", "Default analysis arm must remain local.");
    assert(["local_fixture", "local_ai"].includes(capabilities.providerMode), "Analysis provider mode is not recognized.");

    const bridgeSource = fs.readFileSync(path.join(__dirname, "..", "desktop", "project-state-desktop-bridge.cjs"), "utf8");
    const providerSource = fs.readFileSync(path.join(__dirname, "..", "desktop", "local-ai-providers.cjs"), "utf8");
    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    assert(bridgeSource.includes("LOCAL_ANALYSIS_PROVIDER_IDS"), "Local provider privacy boundary is missing.");
    assert(bridgeSource.includes("externalTransmission: false"), "Local AI receipts must remain non-external.");
    assert(providerSource.includes("127.0.0.1:11434"), "Qwen/Ollama provider must target loopback only.");
    assert(providerSource.includes("Do not create project names"), "Local AI prompt must keep project naming out of the provider.");
    assert(appSource.includes("creates no Core authority"), "UI does not explain local AI authority boundary.");

    console.log("Local AI Provider Plumbing Check");
    console.log(JSON.stringify({
      qwenProviderSlot: true,
      modelId: QWEN3_8B_MODEL_ID,
      ollamaAvailable: Boolean(qwen.available),
      defaultMode: capabilities.providerMode,
      localOnlyReceipt: true,
      preAirlockBoundary: true
    }, null, 2));
    console.log("Local AI provider plumbing: ok");
  } finally {
    await fsp.rm(storageRoot, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Local AI provider plumbing failed:");
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}
