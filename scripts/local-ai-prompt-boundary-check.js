const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const providerSource = fs.readFileSync(path.join(ROOT, "desktop", "local-ai-providers.cjs"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requirePromptText(markers) {
  for (const marker of markers) assert(providerSource.includes(marker), `Local AI prompt/normalizer missing boundary text: ${marker}`);
}

try {
  requirePromptText([
    "Wheel / General Physics Platform is distinct from EQ Wheel and Fusion/Energy",
    "Classify the underlying content, not the heading",
    "Prefer existing_project_support over project_candidate",
    "Do not match Aether merely from quantum, electricity, aliens, time, consciousness",
    "Return fewer, better candidates",
    "commercialDefaultAllowed",
    "requiresSeparateDesignReview",
    "Reference — Wow signal computational analysis",
    "Personal context — ChatGPT subscription gift idea",
    "Reference — source review note"
  ]);

  assert(!/Reference note — reference support/.test(providerSource), "Provider must not emit generic Reference note — reference support titles.");
  assert(providerSource.includes("PROJECT_STATE_CLASSIFICATIONS") && providerSource.includes("personal_context_note"), "Provider must preserve Project State classification layer.");

  console.log("Local AI Prompt Boundary Check");
  console.log(JSON.stringify({
    headingDemotionPrompt: true,
    wheelVsFusionPrompt: true,
    weakAetherBlockPrompt: true,
    commercialAetherBoundaryPrompt: true,
    fewerBetterCandidatesPrompt: true,
    appSideNormalizationMarkers: true
  }, null, 2));
  console.log("Local AI prompt boundary: ok");
} catch (error) {
  console.error("Local AI prompt boundary failed:");
  console.error(error.message);
  process.exitCode = 1;
}
