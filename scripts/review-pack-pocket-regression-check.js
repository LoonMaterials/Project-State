const assert = require("node:assert/strict");
const { createProvisionalConceptProfile } = require("../desktop/review-provisional-profile.cjs");
const { __test } = require("../desktop/project-state-desktop-bridge.cjs");

const pocketText = [
  "Project AN-1 Summary",
  "Pocket Aether Node / Analog Resonant Computing Concept",
  "Purpose",
  "This document summarizes Pocket Aether Node (AN-1), a proposed classical analog resonant computing platform intended as a future Aether coprocessor."
].join("\n");
const profile = createProvisionalConceptProfile({
  text: pocketText,
  localSummaries: [{ title: "Aether — hardware support" }],
  entities: ["Aether", "Pocket Aether Node"]
});
assert.equal(profile.primary_concept, "Pocket Aether Node / AN-1", "Explicit Pocket Aether Node / AN-1 title did not outrank an umbrella Aether label.");
assert.equal(profile.likely_relationships.find((item) => item.target_name === "Aether")?.relationship_type, "part_of", "Aether was not retained as parent/integration context.");

const chunks = [
  { chunk_id: "chunk_0000", sequence: 0, file_version_id: "version_pocket", complete_text: `${pocketText}\nOpen Questions`, provisional_concept_profile: profile },
  { chunk_id: "chunk_0001", sequence: 1, file_version_id: "version_pocket", complete_text: "• Which geometry performs best? • Best coupling mechanism? • Final patent scope?", provisional_concept_profile: { primary_concept: null, profile_confidence: 0, synthesis_reasoning_summary: "unresolved" } }
];
const annotated = __test.annotateReviewPackContinuations(chunks, 500);
assert.equal(annotated[1].continuation_of_chunk_id, "chunk_0000", "Tiny trailing Open Questions material was left as an orphan chunk.");
const inherited = __test.inheritReviewPackContinuationProfiles(annotated);
assert.equal(inherited[1].provisional_concept_profile.primary_concept, "Pocket Aether Node / AN-1", "Continuation did not inherit the preceding concept.");
assert.ok(inherited[1].provisional_concept_profile.profile_confidence < profile.profile_confidence, "Inherited continuation confidence was not reduced.");

const xml = "<w:p><w:r><w:t>Project AN-1 Summary</w:t><w:br/><w:t>Pocket Aether Node</w:t></w:r></w:p><w:p><w:r><w:t>Purpose</w:t><w:cr/><w:t>This is the purpose.</w:t></w:r></w:p><w:p><w:r><w:t>- First</w:t><w:br/><w:t>- Second</w:t></w:r></w:p>";
const extracted = __test.xmlToText(xml);
assert.match(extracted, /Summary\nPocket/, "DOCX line break was lost after Summary.");
assert.match(extracted, /Purpose\nThis/, "DOCX line break was lost after Purpose.");
assert.match(extracted, /- First\n- Second/, "DOCX list separators were lost.");
const entities = __test.reviewPackEntities("The\nThis\nInternally\nWhich\nBest\nFinal\nCurrent\nBottom\nMultiple\nInitial\nCore Concept\nPrototype Roadmap\nPocket Aether Node\nAether");
for (const generic of ["The", "This", "Internally", "Which", "Best", "Final", "Current", "Bottom", "Multiple", "Initial", "Core Concept", "Prototype Roadmap"]) assert.ok(!entities.includes(generic), `Generic entity leaked: ${generic}`);
assert.ok(entities.includes("Pocket Aether Node") && entities.includes("Aether"), "Substantive entities were removed with generic title fragments.");

console.log("Pocket Review Pack Regression Check");
console.log(JSON.stringify({ explicitTitlePriority: true, aetherAsParentContext: true, tinyContinuationLinked: true, inheritedProfileReducedConfidence: true, docxBoundariesPreserved: true, genericEntitiesFiltered: true }, null, 2));
console.log("Pocket review pack regressions: ok");
