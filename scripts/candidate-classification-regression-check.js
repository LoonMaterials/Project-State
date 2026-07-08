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
  , personalAetherSupportSignal
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

const { classifyProjectStateCandidate, titleLooksAssistantScaffolding, strongNamedProjectSignal, conceptTitleForCandidate, personalAetherSupportSignal } = sandbox.module.exports.__classificationTest;

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

const autismReference = classifyProjectStateCandidate({
  title: "What happened",
  text: "Autism diagnosis history and a speculative time travel conversation with generic theories and physics background."
});
assert.equal(autismReference.classification, "reference_note", "Autism/time-travel educational background must not be forced into an unrelated known project.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "What happened",
    text: "Autism diagnosis history and a speculative time travel conversation with generic theories and physics background.",
    classification: autismReference.classification,
    anchors: autismReference.knownProjectAnchors
  }),
  "Reference — autism history",
  "Autism reference material should receive a content-derived reference title."
);

const genericWeakTerms = classifyProjectStateCandidate({
  title: "Important system test idea",
  text: "This is a generic discussion of time, theory, physics, question, test, travel, energy, system, and why an idea is important, with no named project."
});
assert.equal(genericWeakTerms.classification, "reference_note", "Weak generic terms alone must not create existing project support or project candidates.");

const wheelGeneralPhysics = classifyProjectStateCandidate({
  title: "Tier-0 First Test Pack",
  text: "Tier-0: single wheel, check for timing offsets. Tier-1: multiple concentric wheels, induction/eddy systems, careful metrology. Tier-2 without superconductors: layered shielding."
});
assert.equal(wheelGeneralPhysics.classification, "existing_project_support", "Wheel / General Physics Platform test paths must be known project support.");
assert.equal(wheelGeneralPhysics.knownProjectAnchors[0]?.label, "Wheel / General Physics Platform", "Wheel timing tests must not route to Fusion/Energy.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Tier-0 First Test Pack",
    text: "Tier-0: single wheel, check for timing offsets. Tier-1: multiple concentric wheels, induction/eddy systems, careful metrology. Tier-2 without superconductors: layered shielding.",
    classification: wheelGeneralPhysics.classification,
    anchors: wheelGeneralPhysics.knownProjectAnchors
  }),
  "Wheel / General Physics Platform — Tier-0 test path support",
  "Wheel test paths should get a specific Wheel / General Physics Platform label."
);

const superconductorLattice = classifyProjectStateCandidate({
  title: "Materials note",
  text: "Superconductor Lattice thermal behavior and repeated technical details for a known material architecture."
});
assert.equal(superconductorLattice.classification, "existing_project_support", "Superconductor Lattice should be a known project anchor.");

const gibmTests = classifyProjectStateCandidate({
  title: "Summary of G — The Tests",
  text: "GIBM falsifiable predictions and test framework support for deciding whether the model survives."
});
assert.equal(gibmTests.classification, "existing_project_support", "GIBM test framework chunks must remain known project support.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Summary of G — The Tests",
    text: "GIBM falsifiable predictions and test framework support for deciding whether the model survives.",
    classification: gibmTests.classification,
    anchors: gibmTests.knownProjectAnchors
  }),
  "GIBM — falsifiable predictions / test framework support",
  "GIBM test chunks must be retitled away from assistant/raw headings."
);

const gibmPreprint = classifyProjectStateCandidate({
  title: "OPTION A — Explorer Style Preprint",
  text: "GIBM formal preprint framing and explorer style paper structure."
});
assert.equal(
  conceptTitleForCandidate({
    titleSource: "OPTION A — Explorer Style Preprint",
    text: "GIBM formal preprint framing and explorer style paper structure.",
    classification: gibmPreprint.classification,
    anchors: gibmPreprint.knownProjectAnchors
  }),
  "GIBM — formal/preprint framing support",
  "GIBM preprint chunks must be retitled away from option headings."
);

const unityCode = classifyProjectStateCandidate({
  title: "Scene hookup",
  text: "Unity deterministic simulation code with fixed-step replay and seeded simulation behavior."
});
assert.equal(unityCode.classification, "reference_note", "Unity deterministic simulation code should be code reference support, not assistant scaffolding noise.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Scene hookup",
    text: "Unity deterministic simulation code with fixed-step replay and seeded simulation behavior.",
    classification: unityCode.classification,
    anchors: unityCode.knownProjectAnchors
  }),
  "Software / Simulation — deterministic Unity simulation support",
  "Unity code should get a software/simulation support label."
);

const eqValidation = classifyProjectStateCandidate({
  title: "Validation plan",
  text: "EQ Wheel co-located with standard sensors for USGS-style validation and outreach."
});
assert.equal(eqValidation.classification, "existing_project_support", "EQ Wheel validation should be known project support.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Validation plan",
    text: "EQ Wheel co-located with standard sensors for USGS-style validation and outreach.",
    classification: eqValidation.classification,
    anchors: eqValidation.knownProjectAnchors
  }),
  "EQ Wheel — validation, outreach, and pre-license specification support",
  "EQ validation chunks must not be relabeled as Software / Games."
);

const genericValidation = classifyProjectStateCandidate({
  title: "What happened",
  text: "Validation procedures and build steps for a one-off measurement script, without a named project."
});
assert.equal(genericValidation.classification, "reference_note", "Validation/build material must not be classified as assistant scaffolding just because the heading is generic.");

const wowReference = classifyProjectStateCandidate({
  title: "Wow signal scratch work",
  text: "SETI Wow signal analysis and one-off technical experiment notes."
});
assert.equal(wowReference.classification, "reference_note", "SETI/Wow signal technical scratch work should be reference, not personal context.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Wow signal scratch work",
    text: "SETI Wow signal analysis and one-off technical experiment notes.",
    classification: wowReference.classification,
    anchors: wowReference.knownProjectAnchors
  }),
  "Reference — Wow signal analysis",
  "Wow signal material should get a content-derived reference label."
);

assert.equal(
  personalAetherSupportSignal("Aether personal continuity and host control with consent resilience and anti-deletion discussion."),
  true,
  "Aether personal continuity/control material must be flagged for commercial-boundary review."
);

const aetherPersonalSafety = classifyProjectStateCandidate({
  title: "Safety architecture",
  text: "Aether still needs the ability to prevent core changes. Prevent deletion on its own and learn to rewrite itself. Consent-based resilience, signed core, upgrade gate."
});
assert.equal(aetherPersonalSafety.classification, "existing_project_support", "Aether deletion/self-rewrite material should be support, not commercial default behavior.");
assert.equal(personalAetherSupportSignal("Aether still needs the ability to prevent core changes. Prevent deletion on its own and learn to rewrite itself. Consent-based resilience, signed core, upgrade gate."), true, "Aether anti-deletion/self-rewrite material must be flagged personal.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Safety architecture",
    text: "Aether still needs the ability to prevent core changes. Prevent deletion on its own and learn to rewrite itself. Consent-based resilience, signed core, upgrade gate.",
    classification: aetherPersonalSafety.classification,
    anchors: aetherPersonalSafety.knownProjectAnchors
  }),
  "Aether — consent-based safety architecture support",
  "Aether personal safety chunks should be normalized with a personal Aether label."
);

const quantumBiologyReference = classifyProjectStateCandidate({
  title: "The basic chemistry",
  text: "Cryptochrome radical pairs can respond to weak magnetic perturbations. This may be a biological quantum effect."
});
assert.equal(quantumBiologyReference.classification, "reference_note", "Generic quantum biology must not weak-match Aether.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "The basic chemistry",
    text: "Cryptochrome radical pairs can respond to weak magnetic perturbations. This may be a biological quantum effect.",
    classification: quantumBiologyReference.classification,
    anchors: quantumBiologyReference.knownProjectAnchors
  }),
  "Reference — biological magnetoreception",
  "Quantum biology/magnetoreception should be a reference note."
);

const bodyChargeReference = classifyProjectStateCandidate({
  title: "Could a human body charge by touch?",
  text: "Is there a method that a human body could charge by touch? Electrostatic, biochemical energy, heat, motion."
});
assert.equal(bodyChargeReference.classification, "reference_note", "Body charge/bioelectricity must not weak-match Aether.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Could a human body charge by touch?",
    text: "Is there a method that a human body could charge by touch? Electrostatic, biochemical energy, heat, motion.",
    classification: bodyChargeReference.classification,
    anchors: bodyChargeReference.knownProjectAnchors
  }),
  "Reference — body charge / bioelectricity",
  "Body charge should get a content-derived reference title."
);

const wowComputationalReference = classifyProjectStateCandidate({
  title: "What happened",
  text: "Python snippet bits_to_numbers('Wow_signal_binary_signal_body.txt') try block sizes 4, 6, 8."
});
assert.equal(wowComputationalReference.classification, "reference_note", "Wow signal scripts must not become Software/Games support.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "What happened",
    text: "Python snippet bits_to_numbers('Wow_signal_binary_signal_body.txt') try block sizes 4, 6, 8.",
    classification: wowComputationalReference.classification,
    anchors: wowComputationalReference.knownProjectAnchors
  }),
  "Reference — Wow signal computational analysis",
  "Wow signal scripts should get computational reference labeling."
);

const gameWorkflowSupport = classifyProjectStateCandidate({
  title: "Option A — Python/Pygame",
  text: "Option A — Python Pygame 2D room template. Character, camera, controls, core loop, playable prototype."
});
assert.equal(gameWorkflowSupport.classification, "existing_project_support", "Pygame game workflow should be Software/Games support, not Aether or generic reference.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Option A — Python/Pygame",
    text: "Option A — Python Pygame 2D room template. Character, camera, controls, core loop, playable prototype.",
    classification: gameWorkflowSupport.classification,
    anchors: gameWorkflowSupport.knownProjectAnchors
  }),
  "Software / Games — prototype creation workflow support",
  "Game workflow should normalize to Software / Games support."
);

const subscriptionGift = classifyProjectStateCandidate({
  title: "Gift idea",
  text: "Set her up with her own Plus plan, personalized voucher, shared journal, ChatGPT subscription gift."
});
assert.equal(subscriptionGift.classification, "personal_context_note", "Subscription/gift/family context should be personal_context_note.");
assert.equal(
  conceptTitleForCandidate({
    titleSource: "Gift idea",
    text: "Set her up with her own Plus plan, personalized voucher, shared journal, ChatGPT subscription gift.",
    classification: subscriptionGift.classification,
    anchors: subscriptionGift.knownProjectAnchors
  }),
  "Personal context — ChatGPT subscription gift idea",
  "Subscription gift context should receive a specific personal-context title."
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
  genericReferenceDemotion: true,
  weakGenericTermsRejectedForProjectMatching: true,
  superconductorLatticeAnchor: true,
  gibmSupportTitles: true,
  simulationCodeReference: true,
  substantiveValidationNotScaffolding: true,
  eqWheelValidationSupport: true,
  personalAetherBoundary: true,
  namedProjectStillSurvives: true,
  modelProjectCandidateNotBlindlyTrusted: true
}, null, 2));
console.log("Candidate classification regression: ok");
