const assert = require("node:assert/strict");
const { createProvisionalConceptProfile } = require("../desktop/review-provisional-profile.cjs");
function profile(text, extra = {}) { return createProvisionalConceptProfile({ text, ...extra }); }

const registry = [
  { project_id: "project_aether", canonical_name: "Aether", aliases: ["Aether System"], former_names: [], parent_project_id: null },
  { project_id: "product_node", canonical_name: "Pocket Aether Node", aliases: ["AN-1", "Analog Resonant Node"], former_names: ["Pocket Node"], parent_project_id: "project_aether" },
  { project_id: "project_ftl", canonical_name: "FTL Research", aliases: ["Faster Than Light Research", "FTL"], former_names: [], parent_project_id: null },
  { project_id: "project_gibm", canonical_name: "GIBM", aliases: ["Generalized Inertial Boundary Model"], former_names: [], parent_project_id: null, project_family: "Physics" },
  { project_id: "project_drl", canonical_name: "DRL", aliases: ["Distributed Resilience Lattice"], former_names: [], parent_project_id: "organization_redundant", project_family: "Materials" },
  { project_id: "project_state", canonical_name: "Project State", aliases: ["PS"], former_names: [], parent_project_id: "organization_redundant", project_family: "Software" },
  { project_id: "project_darpa", canonical_name: "DARPA Outreach", aliases: ["DARPA"], former_names: [], parent_project_id: "organization_redundant", project_family: "Outreach" },
  { project_id: "organization_redundant", canonical_name: "Redundant Industries", aliases: ["RI"], former_names: [], parent_project_id: null, project_family: "Organization" },
  { project_id: "project_llc", canonical_name: "LLC Planning", aliases: ["Loon LLC"], former_names: [], parent_project_id: null, project_family: "Business" }
];

const manyApplications = profile("Pocket Aether Node is currently in active development. Applications include optimization, classification, anomaly detection, structural sensing, and signal analysis.", { registry, headings: ["Pocket Aether Node", "Applications"], entities: ["Pocket Aether Node", "Optimization", "Classification"] });
assert.equal(manyApplications.primary_concept, "Pocket Aether Node");
assert.equal(manyApplications.estimated_concept_count, 1, "Applications inflated the concept count.");

const twoConcepts = profile("Pocket Aether Node is a portable analog product. FTL Research is a separate theoretical research program.", { registry, localSummaries: [{ title: "Pocket Aether Node" }, { title: "FTL Research" }] });
assert.equal(twoConcepts.estimated_concept_count, 2);
assert.deepEqual([twoConcepts.primary_concept, ...twoConcepts.secondary_concepts], ["Pocket Aether Node", "FTL Research"]);

const repeatedSummaries = profile("Pocket Aether Node is being documented for patent review.", { registry, localSummaries: [{ title: "AN-1 overview" }, { title: "Pocket Aether Node support" }, { title: "Analog Resonant Node summary" }], projectMatches: [{ project_id: "product_node", canonical_name: "Pocket Aether Node", confidence: 0.9 }] });
assert.equal(repeatedSummaries.estimated_concept_count, 1, "Several summaries for one known project became several concepts.");

const aliasHeavy = profile("AN-1, Pocket Node, Analog Resonant Node, and Pocket Aether Node all refer to the same product.", { registry, entities: ["AN-1", "Pocket Node", "Analog Resonant Node", "Pocket Aether Node"] });
assert.equal(aliasHeavy.estimated_concept_count, 1, "Aliases inflated the concept count.");
assert.equal(aliasHeavy.primary_concept, "Pocket Aether Node");

const duplicateText = "Pocket Aether Node is currently in active development and prototype testing.";
assert.deepEqual(profile(duplicateText, { registry }), profile(duplicateText, { registry }), "Exact duplicate chunks produced different profiles.");

const product = profile("Pocket Aether Node is a customer-facing product under Aether.", { registry, projectMatches: [{ project_id: "product_node", canonical_name: "Pocket Aether Node", confidence: 0.88 }] });
assert.equal(product.likely_hierarchy_level, "product");
assert.equal(product.likely_relationships[0].relationship_type, "product_of");
assert.equal(product.likely_relationships[0].target_name, "Aether");
assert.ok(product.likely_relationships[0].reasoning_summary);

const umbrella = profile("Aether is an umbrella organization containing Pocket Aether Node as a child project.", { registry, localSummaries: [{ title: "Aether" }, { title: "Pocket Aether Node" }] });
assert.equal(umbrella.likely_hierarchy_level, "organization");
assert.equal(umbrella.likely_relationships.find((item) => item.target_name === "Pocket Aether Node")?.relationship_type, "parent_of");

const uncertain = profile("Pocket Aether Node might be related to Blue Harbor, but the relationship is not established.", { registry });
const uncertainRelationship = uncertain.likely_relationships.find((item) => item.target_name.includes("Blue Harbor"));
assert.equal(uncertainRelationship?.relationship_type, "unresolved");
assert.ok(uncertainRelationship?.confidence <= 0.2);

const weak = profile("A few uncertain words with no reliable named concept or status.");
assert.equal(weak.primary_concept, null);
assert.deepEqual(weak.secondary_concepts, []);
assert.equal(weak.estimated_concept_count, 0);
assert.equal(weak.likely_hierarchy_level, "unresolved");
assert.equal(weak.likely_maturity, "unresolved");
assert.deepEqual(weak.likely_relationships, []);
assert.equal(weak.profile_confidence, 0);
assert.equal(weak.reviewer_may_override, true);
assert.ok(weak.synthesis_reasoning_summary);

const broadFebruaryContext = {
  sourceFilename: "Complete_Thread_Summary_Feb20.docx",
  text: "Complete Thread Summary February. This overview covers multiple projects and topics. Personal continuity and household context. GIBM entropy testing. DRL insulation testing. Loon LLC planning and outreach.",
  headings: ["Personal Context", "Insulation Testing", "GIBM and Entropy", "LLC Planning"],
  entities: ["GIBM", "DRL", "Loon LLC"],
  localSummaries: [{ title: "GIBM testing" }, { title: "DRL insulation" }, { title: "LLC planning" }],
  projectMatches: [{ project_id: "project_gibm", confidence: 0.9 }, { project_id: "project_drl", confidence: 0.86 }, { project_id: "project_llc", confidence: 0.82 }]
};
const broadThread = profile("GIBM entropy notes from one section.", { registry, sourceContext: broadFebruaryContext });
assert.match(broadThread.primary_concept, /Complete Thread Summary Feb20/i, "Broad thread source identity was replaced by one registry match.");
assert.ok(broadThread.estimated_concept_count >= 3 && broadThread.secondary_concepts.includes("GIBM") && broadThread.secondary_concepts.includes("DRL"), "Broad thread concepts were collapsed or undercounted.");
assert.equal(broadThread.likely_hierarchy_level, "portfolio");

const umbrellaContext = {
  sourceFilename: "Redundant_Industries_development_notes.docx",
  text: "Title: Redundant Industries\nThis organization overview covers multiple child projects: Project State, DRL, and DARPA outreach.",
  headings: ["Redundant Industries", "Project State", "DRL", "DARPA Outreach"],
  entities: ["Redundant Industries", "Project State", "DRL", "DARPA"],
  localSummaries: [],
  projectMatches: [{ project_id: "organization_redundant", confidence: 0.95 }, { project_id: "project_state", confidence: 0.9 }, { project_id: "project_drl", confidence: 0.88 }, { project_id: "project_darpa", confidence: 0.82 }]
};
const umbrellaProfile = profile("Project State and DRL are child projects.", { registry, sourceContext: umbrellaContext });
assert.equal(umbrellaProfile.primary_concept, "Redundant Industries");
assert.ok(umbrellaProfile.secondary_concepts.includes("Project State") && umbrellaProfile.secondary_concepts.includes("DRL") && umbrellaProfile.estimated_concept_count >= 4, "Umbrella children were not distinguished.");

const dominantText = ["Complete Thread Summary for current work. This summary covers multiple projects.", ...Array.from({ length: 8 }, () => "GIBM falsifiable prediction and entropy test framework."), "DRL appears once as contextual insulation background."].join("\n");
const dominantProfile = profile("GIBM test framework.", { registry, sourceContext: { sourceFilename: "Complete_Thread_Summary_GIBM.docx", text: dominantText, headings: ["GIBM Tests", "Context"], entities: ["GIBM", "DRL"], localSummaries: [], projectMatches: [{ project_id: "project_gibm", confidence: 0.92 }, { project_id: "project_drl", confidence: 0.65 }] } });
assert.equal(dominantProfile.primary_concept, "GIBM", "A materially dominant project was not selected from a broad source.");
assert.ok(dominantProfile.secondary_concepts.includes("DRL"), "Minor contextual project was lost from a dominant-project source.");

const balancedProfile = profile("Project State section.", { registry, sourceContext: { sourceFilename: "Complete_Thread_Summary_RI_PS_DARPA.docx", text: "This overview covers multiple projects. Redundant Industries, Project State, DARPA outreach, and DRL each have a section.", headings: ["Redundant Industries", "Project State", "DARPA", "DRL"], entities: ["Redundant Industries", "Project State", "DARPA", "DRL"], localSummaries: [], projectMatches: [{ project_id: "organization_redundant", confidence: 0.9 }, { project_id: "project_state", confidence: 0.9 }, { project_id: "project_darpa", confidence: 0.9 }, { project_id: "project_drl", confidence: 0.9 }] } });
assert.notEqual(balancedProfile.primary_concept, "DARPA Outreach", "One balanced registry match incorrectly became primary.");
assert.ok(balancedProfile.estimated_concept_count >= 4, "Balanced multi-project source was collapsed.");

const duplicateRelationshipProfile = profile("GIBM is one topic in this broad collection.", { registry, sourceContext: { sourceFilename: "Complete_Thread_Summary_Mixed.docx", text: "This overview covers multiple projects and topics: GIBM, DRL, and Project State.", headings: ["GIBM", "DRL", "Project State"], entities: ["GIBM", "DRL", "Project State"], localSummaries: [], projectMatches: [{ project_id: "project_gibm", confidence: 0.9 }, { project_id: "project_drl", confidence: 0.85 }, { project_id: "project_state", confidence: 0.85 }], unregisteredAnchors: [{ project_id: "known_anchor_gibm", canonical_name: "GIBM", confidence: 0.7 }] } });
const gibmRelationships = duplicateRelationshipProfile.likely_relationships.filter((item) => item.target_name === "GIBM");
assert.equal(gibmRelationships.length, 1, "Registry and local-anchor paths duplicated the GIBM relationship.");
assert.equal(gibmRelationships[0].relationship_type, "related_to", "Valid registry-backed GIBM relationship did not replace unresolved anchor duplication.");

console.log("Provisional Concept Profile Check");
console.log(JSON.stringify({ coherentProjectManyApplications: true, twoDistinctConcepts: true, summariesCollapsedToOneProject: true, aliasesCollapsed: true, duplicateChunksStable: true, productVersusParent: true, umbrellaAndChild: true, uncertainRelationshipUnresolved: true, weakExtractionNullProfile: true, oneProjectTitlePreserved: true, broadThreadMultiConcept: true, umbrellaSeveralChildren: true, dominantProjectWithContext: true, balancedRegistryMatchesNoForcedPrimary: true, duplicateRelationshipTargetsCollapsed: true }, null, 2));
console.log("Provisional concept profile: ok");
