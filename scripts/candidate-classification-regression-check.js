const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const providerPath = path.join(__dirname, "..", "desktop", "local-ai-providers.cjs");
const providerSource = `${fs.readFileSync(providerPath, "utf8")}
module.exports.__classificationTest = {
  classifyProjectStateCandidate,
  titleLooksAssistantScaffolding,
  strongNamedProjectSignal,
  conceptTitleForCandidate
};`;

const sandbox = {
  module: { exports: {} },
  exports: {},
  require,
  process,
  console,
  fetch: async () => { throw new Error("network not used by classification regression"); }
};
vm.runInNewContext(providerSource, sandbox, { filename: providerPath });

const { classifyProjectStateCandidate, titleLooksAssistantScaffolding, strongNamedProjectSignal, conceptTitleForCandidate } = sandbox.module.exports.__classificationTest;

const assistantHeadingCases = [
  "Short answer",
  "IMPORTANT",
  "Bottom line",
  "Where this all leaves us",
  "The right mental model",
  "Ground rule for next steps",
  "What I'd recommend",
  "Simple intuition",
  "Why your instinct was correct",
  "One last grounding point",
  "What happened",
  "Why it matters",
  "The big caution",
  "Simple timeline",
  "What to hand the kids",
  "Scene hookup",
  "Cases with Weaker / More Speculative Support",
  "Operational guardrails",
  "Decisions I can convert into immediate outputs"
];

for (const title of assistantHeadingCases) {
  assert.equal(titleLooksAssistantScaffolding(title), true, `Assistant heading was not detected: ${title}`);
  const result = classifyProjectStateCandidate({
    title,
    text: "This could become a publishable architecture later, but this chunk is generic ChatGPT answer scaffolding without a named project title."
  });
  assert.equal(result.classification, "assistant_scaffolding_noise", `Assistant heading became ${result.classification}: ${title}`);
}

const knownProject = classifyProjectStateCandidate({
  title: "Short answer",
  text: "This passage discusses GIBM implementation details and supporting evidence."
});
assert.equal(knownProject.classification, "existing_project_support", "Known project anchors must beat assistant heading noise.");

const fusionSupport = classifyProjectStateCandidate({
  title: "Why superconductors unlock fusion",
  text: "Superconductors are reference support for fusion design decisions."
});
assert.equal(fusionSupport.classification, "existing_project_support", "Known project support must not become a new project candidate.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Why superconductors unlock fusion",
    text: "Superconductors are reference support for fusion design decisions.",
    classification: fusionSupport.classification,
    anchors: fusionSupport.knownProjectAnchors
  }),
  "Superconductor / Fusion — reference support",
  "Known project support should be retitled from content, not assistant heading."
);

const scaffoldingConcept = conceptTitleForCandidate({
  titleSource: "What happened",
  text: "This is an assistant transition paragraph with no named project.",
  classification: "assistant_scaffolding_noise",
  anchors: []
});
assert.equal(scaffoldingConcept, "Assistant scaffolding note", "Assistant headings must not become concept titles.");

const namedNewProject = classifyProjectStateCandidate({
  title: "North Ridge Detector System",
  text: "A concrete detector system proposal with buildable prototype steps."
});
assert.equal(namedNewProject.classification, "project_candidate", "Named buildable concepts should still survive as project candidates.");

assert.equal(strongNamedProjectSignal("publishable architecture without a named concept", ""), false, "Generic build/publish words must not count as a strong named project signal.");

const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert(appSource.includes('modelClassification && modelClassification !== "project_candidate"'), "App classification must not blindly trust model project_candidate labels.");
assert(appSource.indexOf("titleLooksAssistantScaffolding(candidate.workingLabel") < appSource.indexOf('modelClassification && modelClassification !== "project_candidate"'), "App must apply assistant-heading override before accepting non-project model classifications.");
assert(appSource.includes("titleSource") && appSource.includes("conceptTitle") && appSource.includes("rawCandidatesNotRepresentedByMap"), "App must separate title source, concept title, and duplicate raw/map display.");

console.log("Candidate Classification Regression Check");
console.log(JSON.stringify({
  assistantHeadingCases: assistantHeadingCases.length,
  knownProjectAnchorBeatsNoise: true,
  conceptTitleRetitlesKnownSupport: true,
  sourceHeadingDemoted: true,
  namedProjectStillSurvives: true,
  modelProjectCandidateNotBlindlyTrusted: true
}, null, 2));
console.log("Candidate classification regression: ok");
