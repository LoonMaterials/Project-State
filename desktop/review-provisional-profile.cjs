"use strict";

const HIERARCHY_LEVELS = new Set(["portfolio", "organization", "project", "subproject", "product", "research_theme", "future_idea", "reference_note", "unresolved"]);
const MATURITY_LEVELS = new Set(["active", "formalizing", "exploratory", "paused", "completed", "abandoned", "historical", "unresolved"]);
const GENERATORS = new Set(["local_extraction", "rule_based", "local_model", "hybrid"]);
const RELATIONSHIP_TYPES = new Set(["parent_of", "child_of", "supports", "related_to", "product_of", "part_of", "derived_from", "unresolved"]);

const GENERIC_HEADING = /^(?:short answer|important|bottom line|what happened|why it matters|where this (?:all )?leaves us|the right mental model|ground rule(?:s)?(?: for next steps)?|what i(?:'|’)d recommend|simple intuition|one last grounding point|scene hookup|operational guardrails|next steps?|summary|overview|introduction|conclusion|applications?|examples?|embodiments?)$/i;
const REFERENCE = /\b(?:reference|background|history|overview|explanation|literature|citation|source material|research note)\b/i;
const FUTURE = /\b(?:future idea|could build|could become|someday|possible concept|might create|exploratory idea|what if)\b/i;
const PRODUCT = /\b(?:product|device|appliance|commercial offering|sku|customer-facing|portable node|prototype unit)\b/i;
const SUBPROJECT = /\b(?:subproject|module|component|workstream|phase|track)\b/i;
const ORGANIZATION = /\b(?:organization|company|laboratory|lab|foundation|institute|llc|corporation|collective)\b/i;
const PORTFOLIO = /\b(?:portfolio|umbrella|project family|program of projects|suite of projects)\b/i;
const RESEARCH = /\b(?:research theme|research question|investigation|hypothesis|theory|study)\b/i;
const MATURITY_RULES = [
  ["abandoned", /\b(?:abandoned|cancelled|canceled|discarded|terminated|will not pursue)\b/i],
  ["completed", /\b(?:completed|finished|shipped|released|validated successfully|finalized)\b/i],
  ["paused", /\b(?:paused|on hold|deferred|shelved for now)\b/i],
  ["historical", /\b(?:historical|formerly|previously|legacy|archive only|no longer active)\b/i],
  ["active", /\b(?:actively developing|active development|currently building|currently testing|in testing|prototype testing|implementation underway|working prototype)\b/i],
  ["formalizing", /\b(?:formalizing|documenting|documentation|drafting|preprint|patent draft|patent review|claim language|specification)\b/i],
  ["exploratory", /\b(?:exploratory|speculative|early idea|initial concept|conceptual|proposed|possible|might|could|what if)\b/i]
];

function clean(value = "") { return String(value || "").replace(/^#{1,6}\s+/, "").replace(/^[\s*`_\-–—:]+|[\s*`_\-–—:]+$/g, "").replace(/\s+/g, " ").trim(); }
function key(value = "") { return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function words(value = "") { return new Set(key(value).split(" ").filter((word) => word.length > 1)); }
function overlap(left, right) { const a = words(left); const b = words(right); if (!a.size || !b.size) return 0; let common = 0; for (const word of a) if (b.has(word)) common += 1; return common / Math.min(a.size, b.size); }
function meaningfulLabel(value = "") { const label = clean(value); const tokens = [...words(label)]; return label.length >= 3 && label.length <= 140 && !GENERIC_HEADING.test(label) && tokens.length > 0 && new Set(tokens).size === tokens.length; }

function registryIndex(registry = []) {
  const aliases = [];
  const byId = new Map();
  for (const project of registry) {
    byId.set(String(project.project_id || ""), project);
    for (const name of [project.canonical_name, ...(project.aliases || []), ...(project.former_names || [])]) if (meaningfulLabel(name)) aliases.push({ alias: clean(name), project });
  }
  return { aliases: aliases.sort((a, b) => b.alias.length - a.alias.length), byId };
}

function matchedRegistryProjects(text, projectMatches, registry) {
  const index = registryIndex(registry);
  const found = new Map();
  for (const match of projectMatches || []) {
    const project = index.byId.get(String(match?.project_id || ""));
    if (project) found.set(project.project_id, { project, confidence: Number(match.confidence) || 0.7, source: "provisional project match" });
  }
  const normalizedText = key(text);
  for (const item of index.aliases) {
    const aliasKey = key(item.alias);
    if (!aliasKey.includes(" ") && aliasKey.length < 8 && item.alias !== item.alias.toUpperCase()) continue;
    let maskedText = ` ${normalizedText} `;
    for (const longer of index.aliases) if (longer.project.project_id !== item.project.project_id && key(longer.alias).length > aliasKey.length) maskedText = maskedText.replaceAll(` ${key(longer.alias)} `, " ");
    const needle = ` ${aliasKey} `;
    if (needle.length > 3 && maskedText.includes(needle) && !found.has(item.project.project_id)) found.set(item.project.project_id, { project: item.project, confidence: item.alias === item.project.canonical_name ? 0.72 : 0.66, source: "project registry name or alias in chunk" });
  }
  return { matches: [...found.values()], index };
}

function collapseConceptLabels(labels, registry) {
  const index = registryIndex(registry);
  const canonicalId = new Map((registry || []).map((project) => [key(project.canonical_name), String(project.project_id || "")]));
  const output = [];
  for (const raw of labels) {
    if (!meaningfulLabel(raw)) continue;
    let label = clean(raw).replace(/\s+(?:support|notes?|summary|overview|applications?|examples?|embodiments?)$/i, "").trim();
    const aliasHit = index.aliases.find((item) => key(item.alias) === key(label) || (key(label).includes(key(item.alias)) && key(item.alias).length >= 4));
    if (aliasHit) label = aliasHit.project.canonical_name;
    if (!meaningfulLabel(label)) continue;
    const equivalent = output.find((existing) => key(existing) === key(label) || (!(canonicalId.has(key(existing)) && canonicalId.has(key(label)) && canonicalId.get(key(existing)) !== canonicalId.get(key(label))) && overlap(existing, label) >= 0.8));
    if (!equivalent) output.push(label);
  }
  return output.slice(0, 12);
}

function synthesizedLabels(input, registryMatches) {
  const summaryLabels = (input.localSummaries || []).flatMap((item) => [item?.title, item?.conceptTitle]).filter(Boolean);
  const headingLabels = (input.headings || []).filter((heading) => /(?:project|aether|node|platform|engine|wheel|lattice|detector|system|device|model|network|protocol|studio|labs?|works|portfolio|organization)$/i.test(clean(heading)));
  const entityLabels = (input.entities || []).filter((entity) => /(?:project|aether|node|platform|engine|wheel|lattice|detector|system|device|model|network|protocol|studio|labs?|works)$/i.test(clean(entity)));
  return collapseConceptLabels([
    ...summaryLabels,
    ...headingLabels,
    ...entityLabels,
    ...registryMatches.map((match) => match.project.canonical_name)
  ], input.registry || []);
}

function inferHierarchy(text, primary, matches) {
  const primaryMatch = matches.find((match) => key(match.project.canonical_name) === key(primary));
  if (ORGANIZATION.test(text)) return "organization";
  if (PORTFOLIO.test(text)) return "portfolio";
  if (primaryMatch?.project.parent_project_id && PRODUCT.test(text)) return "product";
  if (PRODUCT.test(text)) return "product";
  if (SUBPROJECT.test(text) || primaryMatch?.project.parent_project_id) return "subproject";
  if (FUTURE.test(text)) return "future_idea";
  if (RESEARCH.test(text)) return "research_theme";
  if (REFERENCE.test(text) && !primary) return "reference_note";
  return primary ? "project" : "unresolved";
}

function inferMaturity(text) { for (const [value, pattern] of MATURITY_RULES) if (pattern.test(text)) return value; return "unresolved"; }

function relationship(targetName, type, confidence, reasoning) {
  return { target_name: String(targetName), relationship_type: RELATIONSHIP_TYPES.has(type) ? type : "unresolved", confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)), reasoning_summary: clean(reasoning).slice(0, 240) };
}

function inferRelationships(text, primary, labels, matches, registry) {
  const index = registryIndex(registry);
  const primaryMatch = matches.find((match) => key(match.project.canonical_name) === key(primary));
  const output = [];
  if (primaryMatch?.project.parent_project_id) {
    const parent = index.byId.get(String(primaryMatch.project.parent_project_id));
    const type = PRODUCT.test(text) ? "product_of" : "child_of";
    output.push(relationship(parent?.canonical_name || primaryMatch.project.parent_project_id, type, primaryMatch.confidence, `The project registry records ${primaryMatch.project.canonical_name} under this parent; the relationship remains provisional until review.`));
  }
  if ((PORTFOLIO.test(text) || ORGANIZATION.test(text)) && labels.length > 1) {
    for (const child of labels.slice(1, 6)) output.push(relationship(child, "parent_of", 0.58, `The chunk describes ${primary} as an umbrella and names ${child} as a contained concept.`));
  }
  const uncertain = text.match(/\b(?:may|might|possibly|perhaps)\s+(?:be\s+)?(?:related|connected|linked)\s+to\s+([A-Z][A-Za-z0-9 '\/-]{2,80})/i);
  if (uncertain) output.push(relationship(clean(uncertain[1]), "unresolved", 0.2, "The text suggests a relationship but does not establish its type or project identity."));
  return output.slice(0, 20);
}

function unresolvedProfile(reason = "Local extraction did not provide enough consistent evidence to identify a distinct concept without false precision.") {
  return { primary_concept: null, secondary_concepts: [], estimated_concept_count: 0, likely_hierarchy_level: "unresolved", likely_maturity: "unresolved", likely_relationships: [], profile_confidence: 0, generated_by: "rule_based", reviewer_may_override: true, synthesis_reasoning_summary: reason };
}

function createProvisionalConceptProfile(input = {}) {
  const text = String(input.text || "").trim();
  if (!text || text.length < 24) return unresolvedProfile("The chunk is empty or too weak to support a reliable concept synthesis.");
  const { matches } = matchedRegistryProjects(text, input.projectMatches || [], input.registry || []);
  const labels = synthesizedLabels(input, matches);
  if (!labels.length) {
    if (REFERENCE.test(text)) return { ...unresolvedProfile("The material appears reference-oriented, but no reliable named concept could be synthesized."), likely_hierarchy_level: "reference_note", profile_confidence: 0.18 };
    return unresolvedProfile();
  }
  const primary = labels[0];
  const secondary = labels.slice(1);
  const hierarchy = inferHierarchy(text, primary, matches);
  const maturity = inferMaturity(text);
  const signalKinds = [matches.length, (input.localSummaries || []).length, (input.entities || []).length, (input.headings || []).length].filter((count) => count > 0).length;
  const confidence = Math.min(0.86, 0.34 + signalKinds * 0.1 + (matches.length ? 0.12 : 0) + (text.length >= 250 ? 0.06 : 0));
  const relationships = inferRelationships(text, primary, labels, matches, input.registry || []);
  const evidenceDescription = [matches.length ? `${matches.length} project-registry match${matches.length === 1 ? "" : "es"}` : "", (input.localSummaries || []).length ? `${input.localSummaries.length} local summar${input.localSummaries.length === 1 ? "y" : "ies"}` : "", (input.entities || []).length ? "named-entity signals" : "", (input.headings || []).length ? "heading provenance" : ""].filter(Boolean).join(", ");
  return {
    primary_concept: primary,
    secondary_concepts: secondary,
    estimated_concept_count: 1 + secondary.length,
    likely_hierarchy_level: HIERARCHY_LEVELS.has(hierarchy) ? hierarchy : "unresolved",
    likely_maturity: MATURITY_LEVELS.has(maturity) ? maturity : "unresolved",
    likely_relationships: relationships,
    profile_confidence: Number(confidence.toFixed(2)),
    generated_by: GENERATORS.has(input.generatedBy) ? input.generatedBy : "rule_based",
    reviewer_may_override: true,
    synthesis_reasoning_summary: `Synthesized ${1 + secondary.length} distinct concept${secondary.length ? "s" : ""} from ${evidenceDescription || "chunk language"}; aliases, repeated mentions, headings alone, examples, embodiments, and listed applications were not counted independently.`
  };
}

module.exports = { createProvisionalConceptProfile, unresolvedProfile };
