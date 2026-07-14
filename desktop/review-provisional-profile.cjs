"use strict";

const path = require("node:path");

const HIERARCHY_LEVELS = new Set(["portfolio", "organization", "project", "subproject", "product", "research_theme", "future_idea", "reference_note", "unresolved"]);
const MATURITY_LEVELS = new Set(["active", "formalizing", "exploratory", "paused", "completed", "abandoned", "historical", "unresolved"]);
const GENERATORS = new Set(["local_extraction", "rule_based", "local_model", "hybrid"]);
const RELATIONSHIP_TYPES = new Set(["parent_of", "child_of", "supports", "related_to", "product_of", "part_of", "derived_from", "unresolved"]);

const GENERIC_HEADING = /^(?:short answer|important|bottom line|what happened|why it matters|where this (?:all )?leaves us|the right mental model|ground rule(?:s)?(?: for next steps)?|what i(?:'|’)d recommend|simple intuition|one last grounding point|scene hookup|operational guardrails|next steps?|summary|summary date(?::.*)?|overview|introduction|conclusion|overall(?: status| conclusions?)?|applications?|examples?|embodiments?)$/i;
const REFERENCE = /\b(?:reference|background|history|overview|explanation|literature|citation|source material|research note)\b/i;
const FUTURE = /\b(?:future idea|could build|could become|someday|possible concept|might create|exploratory idea|what if)\b/i;
const PRODUCT = /\b(?:product|device|appliance|commercial offering|sku|customer-facing|portable node|prototype unit)\b/i;
const SUBPROJECT = /\b(?:subproject|module|component|workstream|phase|track)\b/i;
const ORGANIZATION = /\b(?:organization|company|laboratory|lab|foundation|institute|llc|corporation|collective)\b/i;
const PORTFOLIO = /\b(?:portfolio|umbrella|project family|program of projects|suite of projects)\b/i;
const RESEARCH = /\b(?:research theme|research question|investigation|hypothesis|theory|study)\b/i;
const BROAD_SOURCE_TITLE = /\b(?:complete[ _-]+thread[ _-]+summary|thread[ _-]+summary|conversation[ _-]+summary|chat[ _-]+summary|archive|multi[- ]project|project[ _-]+collection|portfolio[ _-]+summary)\b/i;
const BROAD_OVERVIEW = /\b(?:covers?|covering|summari[sz]es?|contains?|includes?|spans?|documents?)\b.{0,100}\b(?:several|multiple|many|various|distinct)\b.{0,80}\b(?:projects?|topics?|ideas?|workstreams?|initiatives?|concepts?)\b|\b(?:several|multiple|many|various|distinct)\b.{0,80}\b(?:projects?|topics?|ideas?|workstreams?|initiatives?|concepts?)\b/i;
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

function sourceIdentityFromFilename(fileName = "") {
  const base = path.basename(String(fileName || ""), path.extname(String(fileName || ""))).replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return BROAD_SOURCE_TITLE.test(base) && meaningfulLabel(base) ? base : null;
}

function explicitProjectTitle(text = "") {
  const source = String(text || "").slice(0, 8000);
  const parenthetical = source.match(/\b([A-Z][A-Za-z0-9]*(?:[ \t]+[A-Z][A-Za-z0-9/-]*){1,6})[ \t]*\(([A-Z]{1,10}-?\d{1,8})\)/);
  if (parenthetical) return `${clean(parenthetical[1])} / ${clean(parenthetical[2])}`;
  const summaryTitle = source.match(/\bProject[ \t]+([A-Z]{1,10}-?\d{1,8})[ \t]+Summary[ \t\r\n]*([A-Z][^\r\n/]{2,100})/i);
  if (summaryTitle) return `${clean(summaryTitle[2])} / ${clean(summaryTitle[1]).toUpperCase()}`;
  const declared = source.match(/^(?:project(?: name)?|document title|title)[ \t]*:[ \t]*([^\r\n]{3,120})/im);
  return declared && meaningfulLabel(declared[1]) ? clean(declared[1]) : null;
}

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

function declaredDocumentIdentity(input = {}) {
  const broadFileIdentity = sourceIdentityFromFilename(input.sourceFilename);
  if (broadFileIdentity) return broadFileIdentity;
  const explicit = explicitProjectTitle(input.text);
  if (explicit) return explicit;
  return (input.headings || []).map(clean).find(meaningfulLabel) || null;
}

function countPhrase(text = "", phrase = "") {
  const haystack = ` ${key(text)} `;
  const needle = key(phrase);
  if (!needle) return 0;
  let count = 0; let offset = 0; const token = ` ${needle} `;
  while ((offset = haystack.indexOf(token, offset)) >= 0) { count += 1; offset += token.length; }
  return count;
}

function registryDominance(text, matches, registry) {
  const index = registryIndex(registry);
  const scores = matches.map((match) => {
    const aliases = index.aliases.filter((item) => item.project.project_id === match.project.project_id).map((item) => item.alias);
    const counts = aliases.map((alias) => countPhrase(text, alias));
    const score = Math.max(1, ...counts);
    return { match, score };
  }).sort((a, b) => b.score - a.score);
  const total = scores.reduce((sum, item) => sum + item.score, 0);
  const winner = scores[0] || null;
  const share = winner && total ? winner.score / total : 0;
  return { scores, winner, share, dominant: Boolean(winner && winner.score >= 3 && share >= 0.67 && (!scores[1] || winner.score >= scores[1].score * 1.8)) };
}

function broadSourceAssessment(input, matches) {
  const text = String(input.text || "");
  const identity = declaredDocumentIdentity(input);
  const headings = [...new Set((input.headings || []).map(clean).filter(meaningfulLabel).map(key))];
  const families = new Set(matches.map((match) => clean(match.project.project_family || "")).filter(Boolean));
  let score = 0;
  if (BROAD_SOURCE_TITLE.test(`${input.sourceFilename || ""} ${identity || ""}`)) score += 4;
  if (BROAD_OVERVIEW.test(text)) score += 2;
  if (headings.length >= 4) score += 1;
  if (matches.length >= 2) score += 2;
  if (families.size >= 2) score += 1;
  if ((input.localSummaries || []).length >= 4) score += 1;
  return { isBroad: score >= 3, score, identity, headingCount: headings.length, dominance: registryDominance(text, matches, input.registry || []) };
}

function broadConceptLabels(input, matches, broadIdentity) {
  const summaryLabels = (input.localSummaries || []).flatMap((item) => [item?.title, item?.conceptTitle]).filter(Boolean);
  const headingLabels = (input.headings || []).map(clean).filter((heading) => meaningfulLabel(heading) && !BROAD_SOURCE_TITLE.test(heading));
  const entityLabels = (input.entities || []).filter((entity) => meaningfulLabel(entity) && /^[A-Z][A-Z0-9]{2,8}$/.test(clean(entity)) && countPhrase(input.text, entity) >= 2);
  return collapseConceptLabels([...matches.map((match) => match.project.canonical_name), ...summaryLabels, ...headingLabels, ...entityLabels], input.registry || [])
    .filter((label) => !broadIdentity || key(label) !== key(broadIdentity));
}

function synthesizedLabels(input, registryMatches) {
  const explicitTitle = declaredDocumentIdentity(input);
  const summaryLabels = (input.localSummaries || []).flatMap((item) => [item?.title, item?.conceptTitle]).filter(Boolean);
  const headingLabels = (input.headings || []).filter((heading) => /(?:project|aether|node|platform|engine|wheel|lattice|detector|system|device|model|network|protocol|studio|labs?|works|portfolio|organization)$/i.test(clean(heading)));
  const entityLabels = (input.entities || []).filter((entity) => /(?:project|aether|node|platform|engine|wheel|lattice|detector|system|device|model|network|protocol|studio|labs?|works)$/i.test(clean(entity)));
  const explicitLabels = explicitTitle ? collapseConceptLabels([explicitTitle], []) : [];
  const associatedLabels = collapseConceptLabels([
    ...summaryLabels,
    ...headingLabels,
    ...entityLabels,
    ...registryMatches.map((match) => match.project.canonical_name)
  ], input.registry || []);
  return [...explicitLabels, ...associatedLabels.filter((label) => !explicitLabels.some((explicitLabel) => key(explicitLabel) === key(label) || overlap(explicitLabel, label) >= 0.8))].slice(0, 12);
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

function dedupeRelationships(items, registry, primary) {
  const index = registryIndex(registry);
  const canonicalTarget = (target) => index.aliases.find((item) => key(item.alias) === key(target))?.project.canonical_name || clean(target);
  const output = new Map();
  for (const item of items) {
    const target = canonicalTarget(item.target_name);
    if (!target || key(target) === key(primary)) continue;
    const normalized = key(target);
    const candidate = { ...item, target_name: target };
    const existing = output.get(normalized);
    if (!existing || (existing.relationship_type === "unresolved" && candidate.relationship_type !== "unresolved") || (existing.relationship_type === candidate.relationship_type && candidate.confidence > existing.confidence)) output.set(normalized, candidate);
  }
  return [...output.values()].slice(0, 20);
}

function inferRelationships(text, primary, labels, matches, registry, input = {}) {
  const index = registryIndex(registry);
  const primaryMatch = matches.find((match) => key(match.project.canonical_name) === key(primary));
  const primaryActsAsUmbrella = input.broadSourceIdentity ? input.primaryIsUmbrellaConcept === true : PORTFOLIO.test(text) || ORGANIZATION.test(text);
  const output = [];
  if (primaryMatch?.project.parent_project_id) {
    const parent = index.byId.get(String(primaryMatch.project.parent_project_id));
    const type = PRODUCT.test(text) ? "product_of" : "child_of";
    output.push(relationship(parent?.canonical_name || primaryMatch.project.parent_project_id, type, primaryMatch.confidence, `The project registry records ${primaryMatch.project.canonical_name} under this parent; the relationship remains provisional until review.`));
  }
  for (const match of matches) {
    if (key(match.project.canonical_name) === key(primary)) continue;
    if (key(match.project.canonical_name) === "aether" && /\b(?:Aether\s+(?:coprocessor|integration|platform|interface|node)|interface\s+to\s+Aether|future\s+Aether\s+coprocessor)\b/i.test(text)) continue;
    if (primaryActsAsUmbrella && labels.slice(1).some((label) => key(label) === key(match.project.canonical_name))) continue;
    output.push(relationship(match.project.canonical_name, "related_to", match.confidence, `${match.project.canonical_name} matched the project registry, but the source document declares ${primary} as its own identity; the registry association is therefore provisional relationship context only.`));
  }
  if (primaryActsAsUmbrella && labels.length > 1) {
    for (const child of labels.slice(1, 6)) output.push(relationship(child, "parent_of", 0.58, `The chunk describes ${primary} as an umbrella and names ${child} as a contained concept.`));
  }
  if (key(primary) !== "aether" && /\bAether\b/.test(text) && /\b(?:Aether\s+(?:coprocessor|integration|platform|interface|node)|interface\s+to\s+Aether|future\s+Aether\s+coprocessor)\b/i.test(text)) {
    output.push(relationship("Aether", "part_of", 0.72, `${primary} is explicitly described as hardware or integration context for Aether, so Aether is retained as a provisional parent context rather than the primary concept.`));
  }
  for (const anchor of inputUnregisteredAnchors(input)) output.push(relationship(anchor.canonical_name || anchor.name || anchor.project_id || "Unresolved anchor", "unresolved", Math.min(0.35, Number(anchor.confidence) || 0.25), "This local anchor is not present in the exported project registry, so it is retained only as an unresolved textual relationship and not as an existing-project match."));
  const uncertain = text.match(/\b(?:may|might|possibly|perhaps)\s+(?:be\s+)?(?:related|connected|linked)\s+to\s+([A-Z][A-Za-z0-9 '\/-]{2,80})/i);
  if (uncertain) output.push(relationship(clean(uncertain[1]), "unresolved", 0.2, "The text suggests a relationship but does not establish its type or project identity."));
  return dedupeRelationships(output, registry, primary);
}

function inputUnregisteredAnchors(value) { return Array.isArray(value?.unregisteredAnchors) ? value.unregisteredAnchors : []; }

function unresolvedProfile(reason = "Local extraction did not provide enough consistent evidence to identify a distinct concept without false precision.") {
  return { primary_concept: null, secondary_concepts: [], estimated_concept_count: 0, likely_hierarchy_level: "unresolved", likely_maturity: "unresolved", likely_relationships: [], profile_confidence: 0, generated_by: "rule_based", reviewer_may_override: true, synthesis_reasoning_summary: reason };
}

function createProvisionalConceptProfile(input = {}) {
  const text = String(input.text || "").trim();
  const context = input.sourceContext && String(input.sourceContext.text || "").trim() ? { ...input, ...input.sourceContext, text: String(input.sourceContext.text) } : input;
  if ((!text || text.length < 24) && (!context.text || context.text.length < 24)) return unresolvedProfile("The chunk is empty or too weak to support a reliable concept synthesis.");
  const { matches: contextMatches } = matchedRegistryProjects(context.text, context.projectMatches || input.projectMatches || [], input.registry || []);
  const broad = broadSourceAssessment({ ...context, registry: input.registry || [] }, contextMatches);
  if (broad.isBroad) {
    const concepts = broadConceptLabels({ ...context, registry: input.registry || [] }, contextMatches, broad.identity);
    const dominantProject = broad.dominance.dominant ? broad.dominance.winner.match.project.canonical_name : null;
    const primary = dominantProject || broad.identity || null;
    const secondary = concepts.filter((label) => !primary || key(label) !== key(primary));
    const identityIsRegisteredConcept = Boolean(broad.identity && contextMatches.some((match) => key(match.project.canonical_name) === key(broad.identity)));
    const distinctConceptCount = concepts.length + (identityIsRegisteredConcept && !concepts.some((label) => key(label) === key(broad.identity)) ? 1 : 0) || (dominantProject ? 1 : 0);
    const hierarchy = contextMatches.length >= 2 || PORTFOLIO.test(context.text) || ORGANIZATION.test(context.text) ? "portfolio" : RESEARCH.test(context.text) ? "research_theme" : "reference_note";
    const primaryIsUmbrellaConcept = Boolean(identityIsRegisteredConcept && (PORTFOLIO.test(context.text) || ORGANIZATION.test(context.text)));
    const relationships = inferRelationships(context.text, primary, [primary, ...secondary].filter(Boolean), contextMatches, input.registry || [], { ...input, unregisteredAnchors: context.unregisteredAnchors || input.unregisteredAnchors || [], broadSourceIdentity: Boolean(broad.identity && !dominantProject), primaryIsUmbrellaConcept });
    const confidence = Math.min(0.78, 0.42 + Math.min(0.18, broad.score * 0.03) + (concepts.length >= 2 ? 0.08 : 0));
    return {
      primary_concept: primary,
      secondary_concepts: secondary,
      estimated_concept_count: distinctConceptCount,
      likely_hierarchy_level: hierarchy,
      likely_maturity: inferMaturity(context.text),
      likely_relationships: relationships,
      profile_confidence: Number(confidence.toFixed(2)),
      generated_by: GENERATORS.has(input.generatedBy) ? input.generatedBy : "rule_based",
      reviewer_may_override: true,
      synthesis_reasoning_summary: `${broad.identity ? `Detected broad source identity ${broad.identity}. ` : "Detected a broad multi-topic source. "}${dominantProject ? `${dominantProject} materially dominates the source and remains primary. ` : "No registry project materially dominates the source; registry matches remain secondary concepts or relationships. "}Counted ${distinctConceptCount} coherent project/topic group${distinctConceptCount === 1 ? "" : "s"} after collapsing aliases, repetition, applications, examples, and headings that do not establish independent identity.`
    };
  }
  if (!text || text.length < 24) return unresolvedProfile("This individual chunk is too weak to support a reliable concept synthesis and the complete source was not classified as broad multi-concept material.");
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
  const relationships = inferRelationships(text, primary, labels, matches, input.registry || [], input);
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
