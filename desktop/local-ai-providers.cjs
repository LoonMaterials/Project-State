const QWEN3_8B_PROVIDER_ID = "ollama_qwen3_8b_local";
const QWEN3_8B_ARM_ID = "project_state_ollama_qwen3_8b";
const QWEN3_8B_MODEL_ID = "qwen3:8b";
const OLLAMA_BASE_URL = process.env.PROJECT_STATE_OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_GENERATE_TIMEOUT_MS = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_TIMEOUT_MS, 300000);
const OLLAMA_NUM_PREDICT = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_NUM_PREDICT, 2400);
const PROJECT_STATE_CLASSIFICATIONS = ["project_candidate", "existing_project_support", "reference_note", "personal_context_note", "assistant_scaffolding_noise", "rejected_noise"];
const ASSISTANT_SCAFFOLDING_HEADING_PATTERN = /^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:short answer|important|bottom line|where this (?:all )?leaves us|the right mental model|ground rule for next steps|what i(?:'|’)d recommend|simple intuition|why your instinct was correct|one last grounding point|what happened|why (?:.+?\s+)?matters|the big caution|simple timeline|next steps|here(?:'|’)s (?:what i propose|the point)|the key point|in plain english|quick answer|quick note|my honest recommendation|what to hand the kids|scene hookup|cases with (?:weaker|more speculative|weaker\s*\/\s*more speculative) support|operational guardrails|decisions i can convert into immediate outputs)\s*[:.!-]*$/i;
const GENERIC_ASSISTANT_HEADING_PATTERN = /^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:short answer|important|bottom line|where this|the right|ground rule|what i|simple|why your|why .+ matters|one last|what happened|what to hand|scene hookup|cases with|operational guardrails|decisions i can|big caution|timeline|next steps|recommendation|intuition|mental model|here(?:'|’)s what)\b/i;
const KNOWN_PROJECT_ANCHORS = [
  { id: "gibm", label: "GIBM", patterns: [/\bgibm\b/i] },
  { id: "wheel_general_physics", label: "Wheel / General Physics Platform", patterns: [/\bwheel\s*\/\s*general\s+physics\s+platform\b/i, /\btier[-\s]?[012]\b.{0,180}\bwheel\b/i, /\bsingle\s+wheel\b.{0,120}\btiming\s+offsets?\b/i, /\bconcentric\s+wheels?\b/i, /\bframe[-\s]?dragging\b/i, /\bphase\s+drift\b|\btiming\s+drift\b/i, /\binertial\s+coupling\b/i, /\bhigh[-\s]?mu\s+shielding\b/i, /\bmetrology\s+playbook\b/i, /\bgalinstan\b.{0,180}\b(?:wheel|timing|phase|physics\s+test)\b/i, /\bsuperconductor[-\s]?free\b.{0,160}\bwheel\b/i, /\bwheel[-\s]?based\s+physics\s+test\b/i] },
  { id: "eq_wheel", label: "EQ Wheel / earthquake analog detector", patterns: [/\beq\s*wheel\b/i, /\bearthquake\s+detector\b/i, /\banalog\s+detector\b/i] },
  { id: "drl_ltc", label: "Lattice / DRL / LTC", patterns: [/\blattice\s+insulation\b/i, /\bdrl\b/i, /\bltc\b/i, /\bresilience\s+lattice\b/i] },
  { id: "gpc1_cancer_tube", label: "Cancer Tube", patterns: [/\bcancer\s+tube\b/i, /\bexosome\s+diagnostic\b/i, /\bgpc1\b/i] },
  { id: "superconductor_lattice", label: "Superconductor Lattice", patterns: [/\bsuperconductor\s+lattice\b/i, /\bsuperconducting\s+lattice\b/i, /\blattice\s+superconductor\b/i] },
  { id: "aether", label: "Aether / Project State", patterns: [/\baether\b/i, /\bproject\s+state\b/i, /\bintake\b.{0,80}\bairlock\b/i, /\bcandidate\s+map\b/i, /\bai\s+work\s+orders?\b/i] },
  { id: "fusion_desal_thermal", label: "Fusion / Energy", patterns: [/\bfusion\s+(?:reactor|energy|power|desal(?:ination)?|thermal|blanket)\b/i, /\b(?:superconductors?|magnets?)\b.{0,120}\bfusion\b/i, /\bfusion\b.{0,120}\b(?:superconductors?|magnets?)\b/i, /\bdesal(?:ination)?\b/i, /\bthermal\s+battery\b/i] },
  { id: "mirror_earth_games", label: "Mirror Earth / games / software", patterns: [/\bmirror\s+earth\b/i, /\bleave\s+me\s+alone\s+games?\b/i, /\bgame\s+suite\b/i, /\b(?:pygame|godot|unity)\b.{0,180}\b(?:game|room\s+template|character|camera|controls|playable\s+prototype|micro[-\s]?gdd|vertical\s+slice)\b/i] },
  { id: "shaw_governance", label: "SHAW / human-first / governance", patterns: [/\bshaw\b/i, /\bhuman[-\s]?first\b/i, /\bgovernance\b/i] },
  { id: "patents_lmc", label: "Patents / licensing / outreach / LMC", patterns: [/\bpatents?\b/i, /\blicen[cs](?:e|ing)\b/i, /\boutreach\b/i, /\blmc\b/i, /\bloon\s+materials\b/i] }
];
const GENERIC_REFERENCE_PATTERNS = [
  ["Reference — autism history", /\bautism\b.{0,160}\b(?:diagnosis|history|diagnostic|asperger|kanner)\b|\b(?:diagnosis|history|diagnostic|asperger|kanner)\b.{0,160}\bautism\b/i],
  ["Reference — Sora explanation", /\bsora\b.{0,160}\b(?:explain|explanation|model|video|openai)\b|\b(?:explain|explanation|model|video|openai)\b.{0,160}\bsora\b/i],
  ["Reference — Wow signal analysis", /\bwow\w*[_\s-]+signal|\bwow\b.{0,40}\bsignal\b|\bseti\b/i],
  ["Reference — alien detection framework / SETI speculation", /\balien\s+detection\b|\baliens?\b.{0,120}\b(?:detection|seti|signal)\b/i],
  ["Reference — biological magnetoreception", /\bmagnetoreception\b|\bbiological\s+magnetism\b|\bcryptochrome\b/i],
  ["Reference — body charge / bioelectricity", /\bbody\s+charge\b|\bbioelectric(?:ity)?\b|\bbiological\s+charge\b/i],
  ["Reference — exotic geometry", /\bexotic\s+geometry\b|\bnon[-\s]?euclidean\b|\btime\s+travel\b|\bclosed\s+timelike\b/i],
  ["Reference — superconductivity material background", /\bsuperconductiv(?:ity|e)\b.{0,180}\b(?:background|material|chemistry|basic|educational|overview)\b|\b(?:basic\s+chemistry|material\s+background)\b.{0,180}\bsuperconduct/i],
  ["Reference — generic science background", /\bgeneric\s+science\b|\bbackground\b.{0,80}\b(?:physics|biology|chemistry|science)\b/i]
];
const WEAK_ANCHOR_WORDS = /\b(?:time|theor(?:y|ies)|travel|physics|user|question|answer|summary|background|history|science|generic|idea|test|energy|system|important)\b/i;

function localAiError(code, message, fieldPath = "") {
  const error = new Error(message);
  error.code = code;
  error.fieldPath = fieldPath;
  return error;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function fetchJson(url, options = {}, timeoutMs = 2500) {
  if (typeof fetch !== "function") throw localAiError("PROVIDER_UNAVAILABLE", "This runtime does not provide fetch for local AI calls.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw localAiError("PROVIDER_UNAVAILABLE", `Local AI provider returned HTTP ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (error.code) throw error;
    throw localAiError("PROVIDER_UNAVAILABLE", `Local AI provider is unavailable: ${error.message || error}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function ollamaTags() {
  const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/tags`, {}, 1500);
  return Array.isArray(payload.models) ? payload.models : [];
}

function modelMatches(model = {}, modelId = QWEN3_8B_MODEL_ID) {
  const names = [model.name, model.model, model.digest].filter(Boolean).map(String);
  return names.some((name) => name === modelId || name.startsWith(`${modelId}:`) || name.startsWith(`${modelId}@`));
}

async function describeLocalAiProviders() {
  let ollamaAvailable = false;
  let qwenInstalled = false;
  let models = [];
  let lastError = "";
  try {
    models = await ollamaTags();
    ollamaAvailable = true;
    qwenInstalled = models.some((model) => modelMatches(model));
  } catch (error) {
    lastError = error.message || "Ollama unavailable.";
  }
  return [{
    providerId: QWEN3_8B_PROVIDER_ID,
    displayName: "Qwen3 8B via Ollama",
    runtime: "ollama",
    baseUrl: OLLAMA_BASE_URL,
    modelId: QWEN3_8B_MODEL_ID,
    installed: qwenInstalled,
    available: ollamaAvailable && qwenInstalled,
    lastError,
    arm: {
      armId: QWEN3_8B_ARM_ID,
      displayName: "Project State Local AI Analysis Arm — Qwen3 8B",
      armVersion: "0.1.0",
      providerId: QWEN3_8B_PROVIDER_ID,
      executionLocation: "local"
    },
    retention: {
      policyId: "local_ollama_machine_only",
      declaredRetention: "Local model runtime on this machine; no cloud transmission by Project State."
    }
  }];
}

function stripModelJson(text = "") {
  let cleaned = String(text || "").trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first >= 0 && last > first) cleaned = cleaned.slice(first, last + 1);
  return cleaned;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeText(value = "", limit = 2000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function cleanArchiveMarkupArtifacts(value = "", limit = 2000) {
  return normalizeText(String(value || "")
    .replace(/[\uFFFD\u25A1]*cite[\uFFFD\u25A1]*(?:turn|ref|news|search)[A-Za-z0-9_\-:\[\]]*/gi, " ")
    .replace(/[\uFFFD\u25A1]*entity[\uFFFD\u25A1]*\[[^\]]{0,240}\][\uFFFD\u25A1]*/gi, " ")
    .replace(/\s{2,}/g, " "), limit);
}

function textLooksBinaryOrGibberish(text = "") {
  const sample = String(text || "").slice(0, 6000);
  if (!sample.trim()) return true;
  const replacementCount = (sample.match(/\uFFFD/g) || []).length;
  const controlCount = (sample.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
  const printableCount = (sample.match(/[A-Za-z0-9\s.,;:'"!?()[\]{}#/_-]/g) || []).length;
  const printableRatio = printableCount / Math.max(1, sample.length);
  const wordCount = (sample.match(/[A-Za-z][A-Za-z0-9_'-]{2,}/g) || []).length;
  const zipContainerNoise = /^\s*PK[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFD]/.test(sample) || /\[Content_Types\]\.xml|_rels\/\.rels/.test(sample);
  return zipContainerNoise || replacementCount > 12 || controlCount > 20 || printableRatio < 0.58 || (sample.length > 500 && wordCount < 8);
}

function normalizeTerms(value = []) {
  const input = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  return [...new Set(input
    .map((term) => cleanArchiveMarkupArtifacts(term, 80).toLowerCase())
    .filter((term) => term.length > 2 && !textLooksBinaryOrGibberish(term)))].slice(0, 32);
}

function firstMeaningfulHeading(text = "") {
  return String(text || "").split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#{1,6}\s+\S+/.test(line) || ASSISTANT_SCAFFOLDING_HEADING_PATTERN.test(line))
    || "";
}

function titleLooksAssistantScaffolding(value = "") {
  const cleaned = cleanArchiveMarkupArtifacts(value, 220)
    .replace(/^needs review:\s*/i, "")
    .replace(/^[-*•>\s]+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*{1,3}(.+?)\*{1,3}$/g, "$1")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .trim();
  return ASSISTANT_SCAFFOLDING_HEADING_PATTERN.test(cleaned) || GENERIC_ASSISTANT_HEADING_PATTERN.test(cleaned);
}

function knownProjectAnchorMatches(text = "") {
  const haystack = String(text || "").slice(0, 60000);
  return KNOWN_PROJECT_ANCHORS
    .filter((anchor) => anchor.patterns.some((pattern) => pattern.test(haystack)))
    .map((anchor) => ({ id: anchor.id, label: anchor.label, confidence: anchor.id === "fusion_desal_thermal" && WEAK_ANCHOR_WORDS.test(haystack) ? 0.72 : 0.9 }))
    .slice(0, 8);
}

function referenceTopicLabel(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  if (/\bwow\w*[_\s-]+signal|\bwow\b.{0,40}\bsignal\b|\bseti\b/i.test(haystack) && /\b(?:python|script|binary|bits?_to_numbers|chonps|amplitude|computational|block sizes?)\b/i.test(haystack)) return "Reference — Wow signal computational analysis";
  const match = GENERIC_REFERENCE_PATTERNS.find(([, pattern]) => pattern.test(haystack));
  if (match) return match[0];
  if (/\bunity\b|\bdeterministic\s+simulation\b|\bsimulation\s+code\b/i.test(haystack)) return "Software / Simulation — deterministic Unity simulation support";
  if (/\bcode\b|\bscript\b|\bpython\b|\bjavascript\b|\bmatplotlib\b|\bjupyter\b/i.test(haystack) && !knownProjectAnchorMatches(haystack).length) return "Reference — computational analysis";
  return "";
}

function isGenericReferenceMaterial(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  return Boolean(referenceTopicLabel(text, title))
    || /\b(?:educational|background|overview|explainer|history of|what is|how does)\b.{0,120}\b(?:science|physics|biology|technology|ai|model)\b/i.test(haystack);
}

function personalContextSignal(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  return /\b(?:household|family|spouse|partner|wife|kids?|gift|voucher|subscription|plus\s+plan|shared\s+journal|schedule|calendar|appointment|emotionally|mental health|stress|fear|hope|preference|personal routine|home life|user-life|life continuity)\b/i.test(haystack);
}

function personalAetherSupportSignal(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  return /\baether\b/i.test(haystack)
    && /\b(?:personal continuity|host control|consent resilience|anti[-\s]?deletion|prevent(?:ing)?\s+(?:deletion|core changes?|owner changes?)|fight(?:ing)?\s+modification|self[-\s]?(?:preservation|rewrite)|identity persistence|local hardware|autonomous(?:\s+continuity|\s+host)?|agency continuity|survival infrastructure|aether\s+(?:life|agency|identity|home|continuity))\b/i.test(haystack);
}

function substantiveTechnicalSignal(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  return /\b(?:code|snippet|function|class|def|const|let|var|unity|python|javascript|matplotlib|jupyter|test instructions?|build steps?|prototype steps?|claim language|validation procedures?|validation plan|sensor validation|co[-\s]?locat|USGS|falsifiable predictions?|preprint framing)\b/i.test(haystack);
}

function weakGenericProjectLanguage(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  const weakHits = haystack.match(/\b(?:time|theor(?:y|ies)|physics|idea|question|test|travel|energy|system|important)\b/gi) || [];
  return weakHits.length >= 3
    && !filterWeakKnownProjectAnchors(knownProjectAnchorMatches(haystack), text, title).length
    && !/\b[A-Z][A-Za-z0-9 '&-]{2,80}\s+(?:Project|System|Framework|Architecture|Platform|Prototype|Model|Engine|Device|Detector|Diagnostic|Battery|Theory|Plan|Patent|Game|App|Protocol)\b/.test(haystack);
}

function filterWeakKnownProjectAnchors(anchors = [], text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  if (!anchors.length) return [];
  return anchors.filter((anchor) => {
    if (anchor.id === "fusion_desal_thermal" && !/\bfusion\s+(?:reactor|energy|power|desal(?:ination)?|thermal|blanket)\b|\b(?:superconductors?|magnets?)\b.{0,120}\bfusion\b|\bfusion\b.{0,120}\b(?:superconductors?|magnets?)\b|\bdesal(?:ination)?\b|\bthermal\s+battery\b/i.test(haystack)) return false;
    if (anchor.id === "aether" && !/\baether\b|\bproject\s+state\b|\bintake\b.{0,80}\bairlock\b|\bcandidate\s+map\b|\bai\s+work\s+orders?\b|\bsource\s+control\b|\breview\s+gates?\b|\bcontext\s+packs?\b|\bproject\s+memory\b/i.test(haystack)) return false;
    if (isGenericReferenceMaterial(text, title) && anchor.confidence < 0.85) return false;
    return true;
  });
}

function hasStrongKnownProjectTie(anchors = []) {
  return anchors.some((anchor) => Number(anchor.confidence || 0) >= 0.85);
}

function knownProjectConceptLabel(anchors = [], text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  if (/\bgibm\b/i.test(haystack)) return "GIBM";
  if (/\bwheel\s*\/\s*general\s+physics\s+platform\b|\btier[-\s]?[012]\b.{0,180}\bwheel\b|\bsingle\s+wheel\b.{0,120}\btiming\s+offsets?\b|\bconcentric\s+wheels?\b|\bframe[-\s]?dragging\b|\bphase\s+drift\b|\btiming\s+drift\b|\binertial\s+coupling\b|\bwheel[-\s]?based\s+physics\s+test\b/i.test(haystack)) return "Wheel / General Physics Platform";
  if (/\beq\s*wheel\b|\bearthquake\s+detector\b|\banalog\s+detector\b/i.test(haystack)) return "EQ Wheel";
  if (personalAetherSupportSignal(haystack)) return "Aether";
  if (/\bproject\s+state\b|\bintake\b.{0,80}\bairlock\b|\bcandidate\s+map\b|\bai\s+work\s+orders?\b|\breview\s+gates?\b|\bcontext\s+packs?\b|\bproject\s+memory\b/i.test(haystack) && !/\baether\b/i.test(haystack)) return "Project State";
  if (/\baether\b/i.test(haystack)) return "Aether";
  if (/\bsuperconductors?\b/i.test(haystack) && /\bfusion\b/i.test(haystack)) return "Superconductor / Fusion";
  if (/\btier[-\s]?0\b/i.test(haystack) && /\b(?:wheel|general\s+physics|first\s+test)\b/i.test(haystack)) return "Wheel / General Physics Platform";
  if (/\bunity\b|\bdeterministic\s+simulation\b|\bsimulation\s+code\b/i.test(haystack)) return "Software / Simulation";
  if (/\bpython\b|\bpygame\b/i.test(haystack) && /\b(?:game|software|prototype)\b/i.test(haystack)) return "Software / Games";
  const first = anchors[0]?.label || "";
  return first
    .replace(/\s*\/\s*(?:agency|identity|continuity|desal|thermal battery|software|human-first|governance|outreach|LMC).*$/i, "")
    .replace(/\s*\/\s*earthquake analog detector\s*$/i, "")
    .replace(/\s*\/\s*exosome diagnostic\s*\/\s*GPC1\s*$/i, "")
    .trim() || "Known project";
}

function supportTypeForContent(text = "", title = "", legal = null) {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  if (legal?.isLegalReference || legalReferenceSignals(haystack).isLegalReference) return "licensing/reference support";
  if (/\bgibm\b/i.test(haystack) && /\b(?:falsifiable|prediction|test framework|tests?)\b/i.test(haystack)) return "falsifiable predictions / test framework support";
  if (/\bgibm\b/i.test(haystack) && /\b(?:formal|preprint|explorer style|paper|framing)\b/i.test(haystack)) return "formal/preprint framing support";
  if (/\beq\s*wheel\b|\bearthquake\s+detector\b|\banalog\s+detector\b/i.test(haystack) && /\b(?:pre[-\s]?license|acceptance|licensing|visuals?|outreach|usgs|sensor|validation|co[-\s]?locat|nasa|university)\b/i.test(haystack)) return "validation, outreach, and pre-license specification support";
  if (/\btier[-\s]?0\b|\bfirst\s+test\b|\btest\s+path\b|\bsingle\s+wheel\b/i.test(haystack) && /\bwheel\b/i.test(haystack)) return "Tier-0 test path support";
  if (/\b(?:timing|phase)\b.{0,80}\b(?:offset|drift|measurement|metrology)\b|\bframe[-\s]?dragging\b|\binertial\s+coupling\b/i.test(haystack)) return "timing/phase metrology support";
  if (/\bgalinstan\b/i.test(haystack) && /\b(?:wheel|containment|model|timing|phase)\b/i.test(haystack)) return "Galinstan containment/modeling support";
  if (personalAetherSupportSignal(haystack) && /\bconsent|signed\s+core|upgrade\s+gate|safety\s+architecture\b/i.test(haystack)) return "consent-based safety architecture support";
  if (/\bsafety\s+architecture\b|\bsafety\b/i.test(haystack) && /\barchitecture\b/i.test(haystack)) return "safety architecture support";
  if (/\bhost\s+control\s+layer\b/i.test(haystack)) return "host control layer support";
  if (/\b(?:dft|phonons?|electron[-\s]?phonon|quantum\s+espresso|vasp|mhd|elmerfem|openfoam|femm|sealed\s+toroidal|alumina|glass\s+containment|liquid[-\s]?metal)\b/i.test(haystack)) return "modeling and bench-test support";
  if (/\bunity\b|\bdeterministic\s+simulation\b|\bsimulation\s+code\b/i.test(haystack)) return "deterministic Unity simulation support";
  if (/\bpython\b|\bpygame\b|\bprototype\b/i.test(haystack) && /\b(?:game|room|character|camera|controls|playable|micro[-\s]?gdd|vertical\s+slice)\b/i.test(haystack)) return "prototype creation workflow support";
  if (/\bpython\b|\bscript\b|\bbinary\b|\bbits?_to_numbers\b/i.test(haystack) && /\bwow\w*[_\s-]+signal|\bwow\b.{0,40}\bsignal\b|\bseti\b/i.test(haystack)) return "computational analysis support";
  if (/\bsuperconductors?\b|\bfusion\b|\breference\b|\bwhy\b/i.test(haystack)) return "reference support";
  if (/\bdecision|guardrail|requirement|next step\b/i.test(haystack)) return "decision/support note";
  return "support";
}

function namedConceptFromContent(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  const named = haystack.match(/\b([A-Z][A-Za-z0-9 '&-]{2,80}\s+(?:Project|System|Framework|Architecture|Platform|Prototype|Model|Engine|Device|Detector|Diagnostic|Battery|Theory|Plan|Patent|Game|App|Protocol|Layer))\b/);
  if (named) return cleanArchiveMarkupArtifacts(named[1], 160);
  return "";
}

function conceptTitleForCandidate({ titleSource = "", text = "", sourceName = "", classification = "reference_note", anchors = [], legal = null } = {}) {
  const cleanTitle = cleanArchiveMarkupArtifacts(titleSource, 180).replace(/^needs review:\s*/i, "").trim();
  const supportType = supportTypeForContent(text, titleSource, legal);
  if (anchors.length || classification === "existing_project_support") return `${knownProjectConceptLabel(anchors, text, titleSource)} — ${supportType}`;
  if (classification === "project_candidate") {
    if (cleanTitle && !titleLooksAssistantScaffolding(cleanTitle)) return cleanTitle;
    return namedConceptFromContent(text, titleSource) || cleanArchiveMarkupArtifacts(sourceName, 120) || "New project candidate";
  }
  if (classification === "personal_context_note") {
    if (/\b(?:chatgpt|plus\s+plan)\b/i.test(`${titleSource}\n${text}`) && /\b(?:gift|voucher|subscription|spouse|partner|wife|shared\s+journal)\b/i.test(`${titleSource}\n${text}`)) return "Personal context — ChatGPT subscription gift idea";
    return "Personal context note";
  }
  if (classification === "assistant_scaffolding_noise") return "Assistant scaffolding note";
  if (classification === "rejected_noise") return "Rejected noise";
  if (legal?.isLegalReference) return "Reference note — licensing/reference material";
  const referenceLabel = referenceTopicLabel(text, titleSource);
  if (referenceLabel) return referenceLabel;
  return namedConceptFromContent(text, titleSource) || "Reference — source review note";
}

function strongNamedProjectSignal(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  if (filterWeakKnownProjectAnchors(knownProjectAnchorMatches(haystack), haystack, title).length) return true;
  if (/\b[A-Z][A-Za-z0-9 '&-]{2,80}\s+(?:Project|System|Framework|Architecture|Platform|Prototype|Model|Engine|Device|Detector|Diagnostic|Battery|Theory|Plan|Patent|Game|App|Protocol)\b/.test(haystack)) return true;
  return false;
}

function concreteProjectSignal(text = "", title = "") {
  const haystack = `${title}\n${text}`.slice(0, 50000);
  return strongNamedProjectSignal(text, title)
    || /\b(?:business\s+plan|prototype|patent|invention|white\s+paper|simulation|device|detector|diagnostic|architecture|platform|software|game|publishable|buildable)\b/i.test(haystack);
}

function classifyProjectStateCandidate({ text = "", title = "", sourceName = "", legal = null } = {}) {
  const combined = `${sourceName}\n${title}\n${text}`;
  const anchors = filterWeakKnownProjectAnchors(knownProjectAnchorMatches(combined), text, title);
  const assistantHeading = titleLooksAssistantScaffolding(title) || titleLooksAssistantScaffolding(firstMeaningfulHeading(text));
  const strongSignal = strongNamedProjectSignal(text, title);
  const concreteSignal = concreteProjectSignal(text, title);
  const legalSignals = legal || legalReferenceSignals(text);
  if (textLooksBinaryOrGibberish(text)) return { classification: "rejected_noise", knownProjectAnchors: anchors, reason: "Unreadable binary/container text." };
  if (isGenericReferenceMaterial(text, title) && !hasStrongKnownProjectTie(anchors)) return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Generic educational/reference material without a strong known-project tie." };
  if (/\bunity\b|\bdeterministic\s+simulation\b|\bsimulation\s+code\b|\bcode snippet\b/i.test(combined) && !hasStrongKnownProjectTie(anchors)) return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Code/simulation reference material without a confirmed project tie." };
  if (anchors.length) return { classification: "existing_project_support", knownProjectAnchors: anchors, reason: "Matched a known Project State project anchor before new-project creation." };
  if (substantiveTechnicalSignal(text, title) && !strongSignal) return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Substantive code/build/test/claim/validation material preserved as reference rather than assistant scaffolding." };
  if (weakGenericProjectLanguage(text, title)) return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Weak generic project-like words without a strong named project tie." };
  if (assistantHeading && !strongSignal) return { classification: "assistant_scaffolding_noise", knownProjectAnchors: anchors, reason: "Generic ChatGPT response heading without a strong named project signal." };
  if (legalSignals.isLegalReference) return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Legal/licensing/reference material." };
  if (personalContextSignal(text, title) && !concreteSignal) return { classification: "personal_context_note", knownProjectAnchors: anchors, reason: "Personal life/context without a concrete buildable/publishable project signal." };
  if (concreteSignal) return { classification: "project_candidate", knownProjectAnchors: anchors, reason: "Concrete named/buildable or publishable idea signal not matched to known projects." };
  return { classification: "reference_note", knownProjectAnchors: anchors, reason: "Weak material preserved as reference, not a project candidate." };
}

function extractChatThreadMetadata(text = "", sourceName = "") {
  const sample = String(text || "").slice(0, 12000);
  const title =
    (sample.match(/(?:^|\n)\s*(?:title|conversation title|thread title|chat title)\s*[:=-]\s*(.{3,180})/i) || [])[1]
    || (sample.match(/(?:^|\n)\s*#{1,3}\s*(?:chat|thread|conversation)\s*[:=-]?\s*(.{3,180})/i) || [])[1]
    || "";
  const date =
    (sample.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?)\b/) || [])[1]
    || (sample.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2}\b/i) || [])[0]
    || "";
  const sourceTitle = title || String(sourceName || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  const threadMarker = /\b(?:new chat|chat started|conversation started|thread started|chatgpt conversation|conversation id|mapping|create_time|update_time)\b/i.test(sample)
    || Boolean(title && /\b(?:chat|thread|conversation)\b/i.test(sample.slice(0, 1000)));
  return {
    hasThreadMarker: threadMarker,
    source_thread: sourceTitle ? cleanArchiveMarkupArtifacts(sourceTitle, 180) : "",
    source_date: cleanArchiveMarkupArtifacts(date, 80),
    source_title: sourceTitle ? cleanArchiveMarkupArtifacts(sourceTitle, 180) : ""
  };
}

function looksLikeChatBoundaryOnly(text = "") {
  const sample = String(text || "").trim().slice(0, 5000);
  if (!sample) return false;
  const lines = sample.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const boundaryLineCount = lines.filter((line) => /\b(?:new chat|chat started|conversation started|thread started|conversation title|chat title|create_time|update_time|conversation id|mapping|moderation_results)\b/i.test(line)).length;
  const substantiveSignals = [
    /^#{1,6}\s+(?!.*\b(?:new chat|chat started|conversation started|thread started|chat title|conversation title)\b).{3,}/im,
    /\b(?:business\s+plan|framework|prototype|architecture|platform|system|model|workflow|design|concept|invention|patent|simulation|test|evidence)\b/i,
    /\b(?:def|class|import|function|const|let|var|plt\.|np\.|matplotlib|jupyter|unreal|python|json file)\b/i,
    /\b(?:act\s+i|chapter|scene|story|character|novel|screenplay|draft)\b/i,
    /\b(?:should|must|need(?:s)?|todo|risk|question|decision|requirement)\b/i
  ].filter((pattern) => pattern.test(sample)).length;
  return boundaryLineCount > 0 && substantiveSignals === 0 && sample.length < 1400;
}

const LEGAL_REFERENCE_PATTERNS = [
  ["license", /\blicen[cs](?:e|ing|ed|es)\b/i],
  ["agreement", /\bagreement\b/i],
  ["eula", /\bend\s+user\s+licen[cs]e\b|\beula\b/i],
  ["terms of service", /\bterms\s+(?:of\s+(?:service|use)|and\s+conditions)\b/i],
  ["privacy policy", /\bprivacy\s+policy\b/i],
  ["developer agreement", /\bdeveloper\s+(?:program\s+)?agreement\b/i],
  ["app store terms", /\bapp\s+store\b|\bgoogle\s+play\b|\bmicrosoft\s+store\b|\bsteamworks\b|\bepic\s+games\s+store\b/i],
  ["sdk/api terms", /\b(?:sdk|api)\s+(?:agreement|terms|license)\b/i],
  ["third party notices", /\bthird[-\s]party\s+notices\b|\bopen\s+source\s+notices\b/i],
  ["copyright/trademark", /\bcopyright\b|\btrademark\b|\ball\s+rights\s+reserved\b/i]
];

function legalReferenceSignals(text = "") {
  const haystack = String(text || "").slice(0, 30000);
  const found = LEGAL_REFERENCE_PATTERNS.filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
  return {
    isLegalReference: found.length >= 2,
    terms: [...new Set(found)].slice(0, 8)
  };
}

function candidateSignalScore(text = "", sourceName = "") {
  if (textLooksBinaryOrGibberish(text)) return 0;
  const haystack = `${sourceName}\n${text}`.slice(0, 24000);
  let score = 0;
  if (looksLikeChatBoundaryOnly(haystack)) return 0;
  if (/^#{1,6}\s+\S+/m.test(haystack)) score += 5;
  if (/\b(?:business\s+plan|framework|project|prototype|architecture|platform|system|model|workflow|design|concept|invention|patent|simulation|test|evidence)\b/i.test(haystack)) score += 4;
  if (/\b(?:def|class|import|function|const|let|var|plt\.|np\.|matplotlib|jupyter|unreal|python|json file)\b/i.test(haystack)) score += 3;
  if (/\b(?:act\s+i|chapter|scene|story|character|novel|screenplay|draft)\b/i.test(haystack)) score += 3;
  if (/\b(?:should|must|need(?:s)?|todo|risk|question|decision|requirement)\b/i.test(haystack)) score += 2;
  if (String(text || "").trim().length > 700) score += 1;
  return score;
}

function titleFromText(text = "", sourceName = "", index = 0) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => /^#{1,6}\s+\S+/.test(line) && !/\b(?:new chat|chat started|conversation started|thread started|chat title|conversation title)\b/i.test(line) && !titleLooksAssistantScaffolding(line));
  if (heading) return cleanArchiveMarkupArtifacts(heading.replace(/^#{1,6}\s+/, ""), 160);
  const namedPlan = String(text || "").match(/\b([A-Z][A-Za-z0-9 '&-]{2,80}\s+(?:Business Plan|Framework|System|Architecture|Platform|Simulation|Model|Prototype|Project|Concept))\b/);
  if (namedPlan) return cleanArchiveMarkupArtifacts(namedPlan[1], 160);
  const sourceBase = String(sourceName || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  if (sourceBase) return cleanArchiveMarkupArtifacts(sourceBase, 160);
  const firstSentence = String(text || "").replace(/\s+/g, " ").split(/[.!?]/)[0];
  return cleanArchiveMarkupArtifacts(firstSentence || `Substantive source window ${index + 1}`, 160);
}

function fallbackCandidateType(text = "", allowedTypes = new Set()) {
  if (legalReferenceSignals(text).isLegalReference && allowedTypes.has("reference")) return "reference";
  if (/\b(?:business\s+plan|project|prototype|platform|invention|patent)\b/i.test(text) && allowedTypes.has("project_concept")) return "project_concept";
  if (/\b(?:architecture|design|model|simulation|lattice|framework)\b/i.test(text) && allowedTypes.has("design_concept")) return "design_concept";
  if (/\b(?:def|class|import|function|const|let|var|plt\.|np\.|matplotlib|jupyter|python|json file)\b/i.test(text) && allowedTypes.has("observation")) return "observation";
  if (/\b(?:should|must|requirement|needs?)\b/i.test(text) && allowedTypes.has("requirement")) return "requirement";
  if (/\b(?:risk|failure|problem)\b/i.test(text) && allowedTypes.has("risk")) return "risk";
  return allowedTypes.has("other") ? "other" : "unknown";
}

function deterministicRescueCandidates({ validated, allowedTypes, maxCandidates, attempts }) {
  const scored = validated.map((item, index) => {
    const sourceName = item.extraction?.fileName || item.extraction?.originalName || "";
    if (textLooksBinaryOrGibberish(item.text) || looksLikeChatBoundaryOnly(item.text)) return { item, index, sourceName, legal: { isLegalReference: false, terms: [] }, score: 0 };
    const legal = legalReferenceSignals(item.text);
    const signalScore = legal.isLegalReference ? 2 : candidateSignalScore(item.text, sourceName);
    const fallbackScore = String(item.text || "").trim().length > 80 ? Math.max(1, signalScore) : signalScore;
    return { item, index, sourceName, legal, score: fallbackScore };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = scored.slice(0, Math.max(1, Math.min(3, Number(maxCandidates) || 3)));
  return selected.map(({ item, index, sourceName, score }) => {
    const compact = cleanArchiveMarkupArtifacts(item.text, 1200);
    const title = titleFromText(item.text, sourceName, index);
    const chatMetadata = extractChatThreadMetadata(item.text, sourceName);
    const classification = classifyProjectStateCandidate({ text: item.text, title, sourceName });
    const conceptTitle = conceptTitleForCandidate({ titleSource: title, text: item.text, sourceName, classification: classification.classification, anchors: classification.knownProjectAnchors });
    const personalAetherSupport = personalAetherSupportSignal(item.text, title);
    const commercialDefaultAllowed = !personalAetherSupport;
    const requiresSeparateDesignReview = personalAetherSupport;
    const candidateType = classification.classification === "project_candidate"
      ? fallbackCandidateType(item.text, allowedTypes)
      : classification.classification === "existing_project_support" || classification.classification === "reference_note"
        ? "reference"
        : "observation";
    return {
      clientCandidateId: `qwen3_rescue_${String(index + 1).padStart(4, "0")}`,
      workingLabel: conceptTitle,
      conceptTitle,
      titleSource: title,
      neutralSummary: normalizeText(`Qwen returned no candidates for this substantive window, so Project State preserved this low-confidence review candidate instead of silently dropping the signal. Source excerpt: ${compact}`, 2000),
      candidateType: allowedTypes.has(candidateType) ? candidateType : "other",
      scope: classification.classification === "project_candidate" ? "unknown" : "supporting",
      keyTerms: normalizeTerms([title, sourceName, ...compact.split(/\s+/).slice(0, 30)]),
      evidence: [{
        discoveryChunkId: item.chunk.id,
        discoveryExtractionId: item.extraction.id,
        fileVersionId: item.extraction.fileVersionId,
        sourceSha256: item.extraction.sourceSha256,
        chunkTextSha256: item.chunk.textSha256,
        relationship: "mentions",
        excerpt: cleanArchiveMarkupArtifacts(item.text, 500)
      }],
      confidence: {
        score: Math.min(0.42, Math.max(0.22, score / 20)),
        basis: `Deterministic local rescue candidate created because Qwen returned an empty candidate list for a substantive chunk window. Project State classification: ${classification.classification}.`,
        uncertaintyNotes: "Human review should decide whether this is a real idea, supporting evidence, duplicate context, or noise."
      },
      relationships: [],
      clarificationQuestions: [{
        clientQuestionId: `qwen3_rescue_question_${String(index + 1).padStart(4, "0")}`,
        text: "Should this preserved source signal become a project candidate, merge into an existing mapped idea, or be rejected as noise?",
        affects: "routing",
        allowNotSure: true
      }],
      projectStateClassification: classification.classification,
      knownProjectAnchors: classification.knownProjectAnchors,
      projectEvidenceRole: "additional_project_reference",
      personalAetherSupport,
      commercialDefaultAllowed,
      requiresSeparateDesignReview,
      classificationReason: classification.reason,
      provenance: { providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID, externalJobId: "local_rescue_candidate", responseAttempts: attempts, deterministicRescue: true, titleSource: title, conceptTitle, personalAetherSupport, commercialDefaultAllowed, requiresSeparateDesignReview, projectStateClassification: classification.classification, knownProjectAnchors: classification.knownProjectAnchors, ...chatMetadata }
    };
  });
}

function boundedChunkTextForPrompt(text = "", chunkCount = 1) {
  const totalBudget = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_PROMPT_TEXT_BUDGET, 36000);
  const perChunkBudget = Math.max(1200, Math.min(6000, Math.floor(totalBudget / Math.max(1, chunkCount))));
  return String(text || "").slice(0, perChunkBudget);
}

function buildAnalysisPrompt({ chunks, candidateTypes, maxCandidates, priorDigestContext = "", candidateMapContext = "" }) {
  const safeChunks = chunks.map(({ chunk, text }, index) => ({
    index,
    discoveryChunkId: chunk.id,
    chunkTextSha256: chunk.textSha256,
    text: boundedChunkTextForPrompt(text, chunks.length)
  }));
  const boundedPriorDigestContext = normalizeText(priorDigestContext, 2800);
  const boundedCandidateMapContext = normalizeText(candidateMapContext, 4200);
  return [
    "You are a local Project State analysis arm. You are not the source of truth.",
    "Analyze only the supplied chunks. Create non-authoritative Idea Candidates only.",
    "These chunks may be one window from a much larger file. Use the prior digest context to understand continuity and avoid treating each chunk as a separate file.",
    "Use the Candidate Map context to avoid duplicate ideas and to recognize when current evidence updates, supports, conflicts with, or extends an existing mapped idea.",
    "If Candidate Map context includes Known Project Enrichment, compare every substantive chunk against the listed active projects before creating new project candidates.",
    "When current chunks add references, duplicate confirmation, validation, contradiction/risk, patent/licensing/outreach support, or technical detail for an existing listed project, classify as existing_project_support and use projectEvidenceRole such as background_reference, duplicate_or_confirming_reference, validation_or_test_support, risk_or_contradiction, patent_licensing_or_outreach_support, cross_project_reference, or additional_project_reference.",
    "Known Project Enrichment is pre-Airlock. Do not mutate existing projects, facts, sources, history, Intake, or Core. Return reviewable evidence only.",
    "Prior digest context is context only. Every new candidate must still cite at least one supplied current discoveryChunkId.",
    "Do not create project names, project IDs, routes, approvals, facts, or history.",
    "For raw chat archives, a new chat/thread/conversation start is source metadata only. Do not create a candidate merely because a chat or thread begins.",
    "Use chat/thread title, date, or start marker only as provenance: source_thread, source_date, source_title if available.",
    "Before suggesting a distinct new idea, first check whether the current evidence supports, continues, updates, or duplicates an existing Candidate Map entry.",
    "Weak single-window signals should usually update an existing cluster or remain a review-only note; do not inflate them into separate project proposals.",
    "Base candidate generation on substantive repeated topic signals, named entities, project names, filenames, user-confirmed labels, and semantic clustering across chunks.",
    "Classify each candidate using projectStateClassification with one of: project_candidate, existing_project_support, reference_note, personal_context_note, assistant_scaffolding_noise, rejected_noise.",
    "Generic ChatGPT assistant-answer headings are assistant_scaffolding_noise unless surrounding text has a strong named project signal. Examples: Short answer, IMPORTANT, Bottom line, Where this leaves us, The right mental model, Ground rule for next steps, What I'd recommend, Simple intuition, Why your instinct was correct, One last grounding point.",
    "Separate titleSource from conceptTitle. titleSource is the heading found in the text. conceptTitle is the normalized project/support label inferred from content. If the heading is generic or assistant-style, do not use it as conceptTitle.",
    "Demote assistant section headings such as What happened, Why X matters, What to hand the kids, Scene hookup, Cases with weaker support, Here's what I propose, Operational guardrails, and Decisions I can convert into immediate outputs.",
    "Run known-project matching before new-project creation. Known projects include GIBM; Wheel / General Physics Platform; EQ Wheel; Lattice/DRL/LTC; Cancer Tube; Superconductor Lattice; Fusion/Energy; Aether/Project State; Software/Games/Mirror Earth; and Patents/licensing/outreach.",
    "Wheel / General Physics Platform is distinct from EQ Wheel and Fusion/Energy. Tier-0/Tier-1/Tier-2 wheel testing, single-wheel timing offsets, concentric wheels, frame-dragging, timing/phase drift, inertial coupling, eddy systems, high-mu shielding, metrology playbooks, Galinstan wheel cores tied to timing/physics tests, superconductor-free wheel models, layered shielding, and wheel-based physics tests should become Wheel / General Physics Platform support. Do not route this to Fusion/Energy unless the chunk explicitly discusses fusion containment, fusion fuel, plasma confinement, fusion power generation, liquid-metal divertors for fusion, or superconductors specifically as fusion-enabling materials.",
    "Before assigning existing_project_support, verify the match uses strong project signals: named project terms, invention-specific language, repeated technical details, known project vocabulary, source folder/file title, or explicit user reference.",
    "Do not use weak generic terms alone for project matching: time, theory, physics, idea, question, test, travel, energy, system, important.",
    "If content is useful but not tied to a named project, classify it as reference_note.",
    "If content is household/user-life context, classify it as personal_context_note.",
    "If content is assistant structure only, classify it as assistant_scaffolding_noise.",
    "If content contains actual code, test instructions, build steps, claim language, or validation procedures, do not classify it as assistant_scaffolding_noise. Classify it as existing_project_support when tied to a known project, otherwise reference_note.",
    "Candidate promotion hierarchy: known_project_match -> existing_project_support -> reference_note -> personal_context_note -> assistant_scaffolding_noise -> rejected_noise -> only then project_candidate.",
    "If a chunk matches a known project anchor, classify it as existing_project_support, not project_candidate.",
    "Only classify project_candidate when the chunk has a concrete buildable or publishable idea, a meaningful named concept/title, is not merely a ChatGPT heading, is repeated or strongly described, and does not match an existing known project.",
    "When content matches a known project, retitle conceptTitle using the known project name plus support type, for example: Aether - safety architecture support, Superconductor / Fusion - reference support, Software / Games - prototype support.",
    "Do not force weak educational/reference chunks into unrelated known projects. Generic words like time, theories, travel, physics, user, question, summary, background, or science are not enough for existing_project_support.",
    "Default generic educational/reference material to reference_note, including autism history, Sora explanations, Wow signal background, generic science references, biological magnetoreception, body charge/bioelectricity, exotic geometry, and one-off code snippets unless tied to a named project.",
    "Classify the underlying content, not the heading. Headings such as What happened, Bottom line, Why it matters, My recommendation, Stage 0, Option A, The basic chemistry, What your machine can handle, and Why the Government Would Care are titleSource only. Do not use them as conceptTitle. Create conceptTitle from the actual content, project names, artifacts, source filename/folder, and repeated technical vocabulary.",
    "Prefer existing_project_support over project_candidate when content belongs to a known project. Prefer reference_note when material is useful but not clearly tied to a named project. Use personal_context_note for family, household, subscription, gift, emotional, schedule, or preference context. Use assistant_scaffolding_noise only when the content has no substantive evidence.",
    "Do not match Aether merely from quantum, electricity, aliens, time, consciousness, existence, hardware, servers, or long-term survival. Require explicit Aether architecture or Aether continuity language. If content discusses self-preservation, anti-deletion, preventing owner changes, host control, identity persistence, autonomous continuity, or self-rewrite, mark personalAetherSupport=true and commercialDefaultAllowed=false.",
    "Return fewer, better candidates. Prefer updating an existing Candidate Map entry over creating a new entry. Create a new entry only when the concept has a distinct project anchor, distinct artifact/build path, distinct technical domain, or direct user-confirmed label. Otherwise classify as supporting evidence for an existing entry or reference_note.",
    "GIBM remains a known project anchor. Retitle GIBM support as GIBM - falsifiable predictions / test framework support or GIBM - formal/preprint framing support when applicable.",
    "Unity/deterministic simulation code that is not tied to a named project should be Software / Simulation - code reference support, not assistant_scaffolding_noise.",
    "EQ Wheel co-located sensor, USGS-style validation, or outreach material should be EQ Wheel - validation/outreach support, not Software / Games.",
    "Use personal_context_note only for household, preferences, emotional context, family, schedule, or user-life continuity. SETI/Wow-signal analysis and technical scratch work are reference_note unless tied to a named project.",
    "Aether personal continuity, host control, consent resilience, anti-deletion, local hardware, and identity persistence material must set personalAetherSupport true. Do not treat those as commercial Project State defaults.",
    "For Aether content, distinguish Aether personal continuity support from commercial Project State functionality. Do not route personal Aether autonomy/survival/host-control ideas into commercial Project State defaults.",
    "Chat/thread/chunk boundaries and assistant headings are provenance, not project boundaries.",
    "Licensing agreements, EULAs, terms, privacy policies, developer/app-store agreements, SDK/API terms, and third-party notices are reference/supporting material. Do not split them into project ideas unless the text clearly describes a buildable project.",
    "When a chunk is mostly legal/app agreement material, return at most one reference candidate with scope supporting.",
    "Return an empty candidates array only when the supplied chunks are pure boilerplate, duplicate legal text, or unreadable metadata. If there are named projects, headings, business plans, code/test evidence, story drafts, simulations, requirements, risks, tasks, or questions, return at least one candidate.",
    "If a current chunk supports or continues an existing Candidate Map entry, still return a candidate with that current chunk evidence so Project State can update the map.",
    "Every candidate must cite at least one supplied discoveryChunkId.",
    "Return strict JSON only with this shape:",
    '{"candidates":[{"workingLabel":"normalized concept/support label","conceptTitle":"normalized concept/support label","titleSource":"heading found in text, if any","neutralSummary":"plain evidence-based summary","candidateType":"other","projectStateClassification":"reference_note","projectEvidenceRole":"additional_project_reference","personalAetherSupport":false,"commercialDefaultAllowed":true,"requiresSeparateDesignReview":false,"scope":"standalone|supporting|cross_cutting|unknown","keyTerms":["term"],"evidence":[{"discoveryChunkId":"chunk id","relationship":"supports|mentions|contrasts|limits|depends_on|context_only","excerpt":"short quote or paraphrase from the chunk"}],"confidence":{"score":0.0,"basis":"why","uncertaintyNotes":"what is unclear"},"clarificationQuestions":[{"text":"question","affects":"meaning|scope|routing|priority|grouping","allowNotSure":true}]}]}',
    `Allowed candidateType values: ${candidateTypes.join(", ")}`,
    `Maximum candidates: ${maxCandidates}`,
    "Keep the response extremely compact. Prefer one strong candidate over several weak candidates.",
    "Use at most one evidence item per candidate.",
    "Use at most six key terms per candidate.",
    "Keep each label under 80 characters, each summary under 220 characters, and each evidence excerpt under 90 characters.",
    boundedPriorDigestContext ? `Prior digest context from earlier windows: ${boundedPriorDigestContext}` : "Prior digest context from earlier windows: none yet.",
    boundedCandidateMapContext ? `Candidate Map context: ${boundedCandidateMapContext}` : "Candidate Map context: empty.",
    `Chunks: ${JSON.stringify(safeChunks)}`
  ].join("\n\n");
}

async function callOllamaGenerate(prompt) {
  const payload = {
    model: QWEN3_8B_MODEL_ID,
    prompt,
    stream: false,
    format: "json",
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: OLLAMA_NUM_PREDICT
    }
  };
  return fetchJson(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }, OLLAMA_GENERATE_TIMEOUT_MS);
}

function parseQwenJsonResponse(responseText = "") {
  return JSON.parse(stripModelJson(responseText || ""));
}

async function callQwenForJson(prompt, { candidateTypes, maxCandidates } = {}) {
  const first = await callOllamaGenerate(prompt);
  try {
    return { parsed: parseQwenJsonResponse(first.response || ""), attempts: 1 };
  } catch (firstError) {
    const retryPrompt = [
      "Your previous response was not valid JSON.",
      "Return valid JSON only. Do not include markdown, commentary, trailing text, or partial arrays.",
      "The entire response must parse with JSON.parse.",
      "Return a smaller answer than before. Maximum 1 candidate. Keep strings very short.",
      "Use exactly this top-level shape:",
      '{"candidates":[{"workingLabel":"short label","neutralSummary":"brief summary","candidateType":"other","scope":"unknown","keyTerms":["term"],"evidence":[{"discoveryChunkId":"chunk id from supplied chunks","relationship":"supports","excerpt":"short excerpt"}],"confidence":{"score":0.5,"basis":"brief basis","uncertaintyNotes":""},"clarificationQuestions":[]}]}',
      candidateTypes?.length ? `Allowed candidateType values: ${candidateTypes.join(", ")}` : "",
      "Maximum candidates: 1",
      "Original task:",
      prompt
    ].filter(Boolean).join("\n\n");
    const second = await callOllamaGenerate(retryPrompt);
    try {
      return { parsed: parseQwenJsonResponse(second.response || ""), attempts: 2 };
    } catch (secondError) {
      throw localAiError("PROVIDER_RESPONSE_INVALID", `Qwen3 8B returned unreadable JSON after retry: ${secondError.message}; first attempt: ${firstError.message}`);
    }
  }
}

async function generateQwenIdeaCandidates({ validated, envelope, ideaContract, maxCandidates }) {
  const providers = await describeLocalAiProviders();
  const provider = providers.find((item) => item.providerId === QWEN3_8B_PROVIDER_ID);
  if (!provider?.available) throw localAiError("PROVIDER_UNAVAILABLE", provider?.lastError || "Qwen3 8B is not installed in Ollama.");
  const prompt = buildAnalysisPrompt({ chunks: validated, candidateTypes: ideaContract.objects.IdeaCandidate.candidateTypes, maxCandidates, priorDigestContext: envelope.analysisOptions?.priorDigestContext || "", candidateMapContext: envelope.analysisOptions?.candidateMapContext || "" });
  const chunkById = new Map(validated.map((item) => [item.chunk.id, item]));
  const legalByChunkId = new Map(validated.map((item) => [item.chunk.id, legalReferenceSignals(item.text)]));
  const allowedTypes = new Set(ideaContract.objects.IdeaCandidate.candidateTypes);
  const allowedScopes = new Set(ideaContract.objects.IdeaCandidate.scopes || ideaContract.objects.IdeaCandidate.candidateScopes || []);
  const allowedRelationships = new Set(ideaContract.objects.EvidenceReference?.relationships || ideaContract.objects.IdeaCandidate.evidenceRelationships || []);
  let parsed;
  let attempts = 0;
  let responseInvalid = false;
  try {
    const response = await callQwenForJson(prompt, { candidateTypes: ideaContract.objects.IdeaCandidate.candidateTypes, maxCandidates });
    parsed = response.parsed;
    attempts = response.attempts;
  } catch (error) {
    if (error.code !== "PROVIDER_RESPONSE_INVALID") throw error;
    parsed = { candidates: [] };
    attempts = 2;
    responseInvalid = true;
  }
  const suppliedCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const candidatesToNormalize = suppliedCandidates.length
    ? suppliedCandidates
    : deterministicRescueCandidates({ validated, allowedTypes, maxCandidates, attempts });
  return candidatesToNormalize.slice(0, maxCandidates).map((candidate, index) => {
    const modelEvidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
    const normalizedEvidence = modelEvidence.map((evidence) => {
      const source = chunkById.get(String(evidence.discoveryChunkId || ""));
      if (!source) return null;
      const relationship = allowedRelationships.has(evidence.relationship) ? evidence.relationship : "supports";
      return {
        discoveryChunkId: source.chunk.id,
        discoveryExtractionId: source.extraction.id,
        fileVersionId: source.extraction.fileVersionId,
        sourceSha256: source.extraction.sourceSha256,
        chunkTextSha256: source.chunk.textSha256,
        relationship,
        excerpt: cleanArchiveMarkupArtifacts(evidence.excerpt || source.text, 500)
      };
    }).filter(Boolean);
    if (!normalizedEvidence.length && validated[index]) {
      const source = validated[index];
      normalizedEvidence.push({
        discoveryChunkId: source.chunk.id,
        discoveryExtractionId: source.extraction.id,
        fileVersionId: source.extraction.fileVersionId,
        sourceSha256: source.extraction.sourceSha256,
        chunkTextSha256: source.chunk.textSha256,
        relationship: "supports",
        excerpt: cleanArchiveMarkupArtifacts(source.text, 500)
      });
    }
    const legalEvidenceSignals = normalizedEvidence.map((evidence) => legalByChunkId.get(evidence.discoveryChunkId)).filter(Boolean);
    const isLegalReference = legalEvidenceSignals.some((signals) => signals.isLegalReference);
    const legalTerms = [...new Set(legalEvidenceSignals.flatMap((signals) => signals.terms || []))].slice(0, 8);
    const firstEvidenceSource = normalizedEvidence[0] ? chunkById.get(normalizedEvidence[0].discoveryChunkId) : null;
    const chatMetadata = extractChatThreadMetadata(firstEvidenceSource?.text || "", firstEvidenceSource?.extraction?.fileName || firstEvidenceSource?.extraction?.originalName || "");
    const titleSource = candidate.titleSource || candidate.workingLabel || candidate.title || "";
    const classification = classifyProjectStateCandidate({
      text: [firstEvidenceSource?.text || "", candidate.neutralSummary || candidate.summary || "", (candidate.keyTerms || []).join(" ")].join("\n"),
      title: titleSource,
      sourceName: firstEvidenceSource?.extraction?.fileName || firstEvidenceSource?.extraction?.originalName || "",
      legal: isLegalReference ? { isLegalReference: true, terms: legalTerms } : null
    });
    const modelClassification = PROJECT_STATE_CLASSIFICATIONS.includes(candidate.projectStateClassification) ? candidate.projectStateClassification : "";
    const projectStateClassification = ["existing_project_support", "reference_note", "personal_context_note", "assistant_scaffolding_noise", "rejected_noise"].includes(classification.classification)
      ? classification.classification
      : modelClassification || classification.classification;
    const candidateType = isLegalReference || ["existing_project_support", "reference_note"].includes(projectStateClassification)
      ? "reference"
      : ["assistant_scaffolding_noise", "personal_context_note", "rejected_noise"].includes(projectStateClassification)
        ? "observation"
        : allowedTypes.has(candidate.candidateType) ? candidate.candidateType : "other";
    const scope = projectStateClassification === "project_candidate"
      ? (allowedScopes.has(candidate.scope) ? candidate.scope : "unknown")
      : "supporting";
    const neutralSummary = cleanArchiveMarkupArtifacts(candidate.neutralSummary || candidate.summary || "", 2000);
    const conceptTitle = conceptTitleForCandidate({
      titleSource,
      text: [firstEvidenceSource?.text || "", neutralSummary, (candidate.keyTerms || []).join(" ")].join("\n"),
      sourceName: firstEvidenceSource?.extraction?.fileName || firstEvidenceSource?.extraction?.originalName || "",
      classification: projectStateClassification,
      anchors: classification.knownProjectAnchors,
      legal: isLegalReference ? { isLegalReference: true, terms: legalTerms } : null
    });
    const personalAetherSupport = personalAetherSupportSignal([firstEvidenceSource?.text || "", neutralSummary, titleSource, (candidate.keyTerms || []).join(" ")].join("\n"));
    const commercialDefaultAllowed = !personalAetherSupport;
    const requiresSeparateDesignReview = personalAetherSupport;
    return {
      clientCandidateId: normalizeText(candidate.clientCandidateId || `qwen3_candidate_${String(index + 1).padStart(4, "0")}`, 120).replace(/[^a-zA-Z0-9_-]/g, "_") || `qwen3_candidate_${index + 1}`,
      workingLabel: conceptTitle,
      conceptTitle,
      titleSource: cleanArchiveMarkupArtifacts(titleSource, 200),
      neutralSummary: isLegalReference
        ? normalizeText(`Licensing/app agreement/reference material. Keep as supporting context unless a human confirms it is the project. Signals: ${legalTerms.join(", ") || "legal reference"}. ${neutralSummary}`, 2000)
        : neutralSummary,
      candidateType,
      scope,
      keyTerms: normalizeTerms(candidate.keyTerms),
      evidence: normalizedEvidence,
      confidence: {
        score: clampNumber(candidate.confidence?.score, 0, 1, 0.5),
        basis: cleanArchiveMarkupArtifacts(candidate.confidence?.basis || "Qwen3 8B local model analysis of authorized chunks.", 1000),
        uncertaintyNotes: cleanArchiveMarkupArtifacts(candidate.confidence?.uncertaintyNotes || "", 2000)
      },
      relationships: Array.isArray(candidate.relationships) ? candidate.relationships.slice(0, 50) : [],
      clarificationQuestions: (Array.isArray(candidate.clarificationQuestions) ? candidate.clarificationQuestions : []).slice(0, 20).map((question, questionIndex) => ({
        clientQuestionId: normalizeText(question.clientQuestionId || `qwen3_question_${index + 1}_${questionIndex + 1}`, 120).replace(/[^a-zA-Z0-9_-]/g, "_"),
        text: cleanArchiveMarkupArtifacts(question.text || "", 500),
        affects: normalizeText(question.affects || "meaning", 80),
        allowNotSure: question.allowNotSure !== false
      })).filter((question) => question.text),
      projectStateClassification,
      knownProjectAnchors: classification.knownProjectAnchors,
      projectEvidenceRole: normalizeText(candidate.projectEvidenceRole || "", 120).replace(/[^a-zA-Z0-9_-]/g, "_"),
      personalAetherSupport,
      commercialDefaultAllowed,
      requiresSeparateDesignReview,
      classificationReason: classification.reason,
      provenance: { ...(candidate.provenance || {}), ...chatMetadata, providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID, externalJobId: candidate.provenance?.externalJobId || `local_ollama_${envelope.requestId}`, responseAttempts: candidate.provenance?.responseAttempts || attempts, responseInvalidRescue: candidate.provenance?.responseInvalidRescue || responseInvalid, titleSource: cleanArchiveMarkupArtifacts(titleSource, 200), conceptTitle, personalAetherSupport, commercialDefaultAllowed, requiresSeparateDesignReview, projectStateClassification, knownProjectAnchors: classification.knownProjectAnchors }
    };
  });
}

module.exports = {
  QWEN3_8B_PROVIDER_ID,
  QWEN3_8B_ARM_ID,
  QWEN3_8B_MODEL_ID,
  describeLocalAiProviders,
  generateQwenIdeaCandidates
};
