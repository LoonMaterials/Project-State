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
    const indexSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    assert(bridgeSource.includes("LOCAL_ANALYSIS_PROVIDER_IDS"), "Local provider privacy boundary is missing.");
    assert(bridgeSource.includes("externalTransmission: false"), "Local AI receipts must remain non-external.");
    assert(providerSource.includes("127.0.0.1:11434"), "Qwen/Ollama provider must target loopback only.");
    assert(indexSource.includes("connect-src http://127.0.0.1:11434 http://localhost:11434"), "CSP must permit local-only Ollama loopback checks.");
    assert(!/connect-src[^"]*(https?:\/\/(?!127\.0\.0\.1:11434|localhost:11434)[^"'\s;]+)/.test(indexSource), "CSP must not permit non-loopback provider connections.");
    assert(providerSource.includes("PROJECT_STATE_LOCAL_AI_TIMEOUT_MS"), "Local AI generation timeout must be configurable for offline models.");
    assert(providerSource.includes("PROJECT_STATE_LOCAL_AI_NUM_PREDICT") && providerSource.includes("num_predict: OLLAMA_NUM_PREDICT"), "Local AI generation should keep responses bounded but configurable for offline models.");
    assert(providerSource.includes("PROJECT_STATE_LOCAL_AI_PROMPT_TEXT_BUDGET") && providerSource.includes("boundedChunkTextForPrompt"), "Local AI prompt text must be bounded for huge-file passes.");
    assert(providerSource.includes("deterministicRescueCandidates") && providerSource.includes("Qwen returned no candidates"), "Local AI must preserve substantive chunk-window signals when Qwen returns an empty candidate list.");
    assert(providerSource.includes("responseInvalidRescue") && providerSource.includes('error.code !== "PROVIDER_RESPONSE_INVALID"'), "Local AI must rescue malformed Qwen JSON instead of failing the entire Work Order pass.");
    assert(providerSource.includes("textLooksBinaryOrGibberish") && providerSource.includes("Content_Types"), "Local AI rescue must not preserve binary/container garbage as candidates.");
    assert(providerSource.includes("looksLikeChatBoundaryOnly") && providerSource.includes("chat/thread/conversation start is source metadata only"), "Local AI must treat chat/thread starts as provenance metadata, not project candidates.");
    assert(providerSource.includes("source_thread") && providerSource.includes("source_date") && providerSource.includes("source_title"), "Local AI candidate provenance must retain chat/thread source metadata when available.");
    assert(providerSource.includes("cleanArchiveMarkupArtifacts") && providerSource.includes("entity") && providerSource.includes("cite"), "Local AI output should clean archive entity/citation artifacts before display/storage.");
    assert(providerSource.includes("PROJECT_STATE_CLASSIFICATIONS") && providerSource.includes("assistant_scaffolding_noise") && providerSource.includes("existing_project_support"), "Local AI must distinguish project candidates from support/reference/scaffolding/noise.");
    for (const noisyHeading of [
      "Short answer",
      "IMPORTANT",
      "Bottom line",
      "Where this leaves us",
      "The right mental model",
      "Ground rule for next steps",
      "What I'd recommend",
      "Simple intuition",
      "Why your instinct was correct",
      "One last grounding point",
      "What to hand the kids",
      "Scene hookup",
      "Operational guardrails",
      "Decisions I can convert into immediate outputs"
    ]) assert(providerSource.includes(noisyHeading), `Local AI assistant-heading filter missing: ${noisyHeading}`);
    assert(providerSource.includes("titleSource") && providerSource.includes("conceptTitle") && providerSource.includes("conceptTitleForCandidate"), "Local AI must separate source headings from normalized concept titles.");
    assert(providerSource.includes("Reference — autism history") && providerSource.includes("Reference — Wow signal analysis") && providerSource.includes("Reference — biological magnetoreception"), "Local AI must give generic reference material content-derived labels.");
    assert(providerSource.includes("personalAetherSupport") && providerSource.includes("commercial Project State") && providerSource.includes("identity persistence"), "Local AI must flag personal Aether support separate from commercial Project State defaults.");
    assert(providerSource.includes("ASSISTANT_SCAFFOLDING_HEADING_PATTERN") && providerSource.includes("GENERIC_ASSISTANT_HEADING_PATTERN"), "Local AI must filter generic assistant-answer headings.");
    assert(providerSource.includes("KNOWN_PROJECT_ANCHORS") && providerSource.includes("GIBM") && providerSource.includes("EQ Wheel") && providerSource.includes("Superconductor Lattice") && providerSource.includes("Fusion/Energy") && providerSource.includes("Aether"), "Local AI must run known-project anchor matching before new-project classification.");
    assert(providerSource.includes("Do not use weak generic terms alone") && providerSource.includes("substantiveTechnicalSignal"), "Local AI must reject weak generic project matches and protect substantive technical material from scaffolding classification.");
    assert(bridgeSource.includes("extractReadableDiscoveryText") && bridgeSource.includes("windowed ? \"\" : await extractReadableDiscoveryText(physicalPath)"), "Large-corpus indexing must use format-aware text extraction instead of raw UTF-8 reads.");
    assert(bridgeSource.includes("extractDocxTextWindow") && bridgeSource.includes("streamingWindow") && bridgeSource.includes("createInflateRaw"), "Large DOCX corpus indexing must stream windowed text instead of creating one giant string.");
    assert(providerSource.includes("callQwenForJson"), "Local AI provider must retry malformed JSON locally before failing.");
    assert(providerSource.includes("responseAttempts"), "Local AI candidate provenance should record JSON retry attempts.");
    assert(providerSource.includes("Do not create project names"), "Local AI prompt must keep project naming out of the provider.");
    assert(providerSource.includes("priorDigestContext") && providerSource.includes("much larger file"), "Local AI prompt must carry rolling digest context across chunk windows.");
    assert(providerSource.includes("candidateMapContext") && providerSource.includes("Candidate Map context"), "Local AI prompt must receive Candidate Map context.");
    assert(appSource.includes("creates no Core authority"), "UI does not explain local AI authority boundary.");
    for (const required of [
      "Start local AI digestion",
      "function executeAiWorkOrderLocalAnalysis",
      "function openStartLocalAiWorkOrderModal",
      "function openAiWorkOrderResultsModal",
      "No real local AI provider is available",
      "Idea Candidates only",
      "no_candidates_found",
      "candidates_found_more_source_remaining",
      "sourceFullyAnalyzed",
      "Pass complete — more remains",
      "Work Order stays active",
      "buildWorkOrderDigestContext",
      "updateWorkOrderDigestContext",
      "retryableEmptyRunIds",
      "normalizeCandidateMap",
      "buildCandidateMapContext",
      "updateWorkOrderCandidateMap",
      "renderCandidateMapEntries",
      "isWeakSingleWindowCandidate",
      "knownProjectMatchesForCandidate",
      "review_only_note",
      "possible_existing_project_match",
      "assistant_scaffolding_noise",
      "existing_project_support",
      "PROJECT_STATE_CLASSIFICATIONS",
      "KNOWN_PROJECT_ANCHORS",
      "classifyProjectStateCandidate",
      "displaySafeAiTitle",
      "Candidate Map:",
      "until_paused",
      "Stop after this pass",
      "Rolling digest context",
      "view-ai-work-order-results",
      "start-local-ai-work-order"
    ]) assert(appSource.includes(required), `AI Work Order local execution UI missing: ${required}`);
    assert(appSource.includes('workOrder.status = sourceFullyAnalyzed ? "completed" : "submitted";'), "AI Work Orders must complete only when source coverage is fully analyzed.");
    assert(appSource.includes("unanalyzedChunks") && appSource.includes("alreadyAnalyzedChunkIds"), "AI Work Order execution must continue through new chunk windows instead of repeating the first pass.");
    assert(appSource.includes("!capabilities.realProviderInstalled"), "AI Work Order execution should require a real local provider instead of the fake fixture arm.");
    assert(appSource.includes("externalTransmission: execution.transmissionReceipt?.externalTransmission === true"), "AI Work Order execution should retain local/external transmission evidence.");

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
