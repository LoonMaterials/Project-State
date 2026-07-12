const assert = require("node:assert/strict");
const { createProvisionalConceptProfile } = require("../desktop/review-provisional-profile.cjs");
function profile(text, extra = {}) { return createProvisionalConceptProfile({ text, ...extra }); }

const registry = [
  { project_id: "project_aether", canonical_name: "Aether", aliases: ["Aether System"], former_names: [], parent_project_id: null },
  { project_id: "product_node", canonical_name: "Pocket Aether Node", aliases: ["AN-1", "Analog Resonant Node"], former_names: ["Pocket Node"], parent_project_id: "project_aether" },
  { project_id: "project_ftl", canonical_name: "FTL Research", aliases: ["Faster Than Light Research", "FTL"], former_names: [], parent_project_id: null }
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

console.log("Provisional Concept Profile Check");
console.log(JSON.stringify({ coherentProjectManyApplications: true, twoDistinctConcepts: true, summariesCollapsedToOneProject: true, aliasesCollapsed: true, duplicateChunksStable: true, productVersusParent: true, umbrellaAndChild: true, uncertainRelationshipUnresolved: true, weakExtractionNullProfile: true }, null, 2));
console.log("Provisional concept profile: ok");
