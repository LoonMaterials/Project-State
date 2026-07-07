const QWEN3_8B_PROVIDER_ID = "ollama_qwen3_8b_local";
const QWEN3_8B_ARM_ID = "project_state_ollama_qwen3_8b";
const QWEN3_8B_MODEL_ID = "qwen3:8b";
const OLLAMA_BASE_URL = process.env.PROJECT_STATE_OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_GENERATE_TIMEOUT_MS = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_TIMEOUT_MS, 300000);
const OLLAMA_NUM_PREDICT = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_NUM_PREDICT, 2400);

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
  return [...new Set(input.map((term) => normalizeText(term, 80).toLowerCase()).filter((term) => term.length > 2))].slice(0, 32);
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
  const heading = lines.find((line) => /^#{1,6}\s+\S+/.test(line));
  if (heading) return normalizeText(heading.replace(/^#{1,6}\s+/, ""), 160);
  const namedPlan = String(text || "").match(/\b([A-Z][A-Za-z0-9 '&-]{2,80}\s+(?:Business Plan|Framework|System|Architecture|Platform|Simulation|Model|Prototype|Project|Concept))\b/);
  if (namedPlan) return normalizeText(namedPlan[1], 160);
  const sourceBase = String(sourceName || "").replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  if (sourceBase) return normalizeText(sourceBase, 160);
  const firstSentence = String(text || "").replace(/\s+/g, " ").split(/[.!?]/)[0];
  return normalizeText(firstSentence || `Substantive source window ${index + 1}`, 160);
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
    if (textLooksBinaryOrGibberish(item.text)) return { item, index, sourceName, legal: { isLegalReference: false, terms: [] }, score: 0 };
    const legal = legalReferenceSignals(item.text);
    const signalScore = legal.isLegalReference ? 2 : candidateSignalScore(item.text, sourceName);
    const fallbackScore = String(item.text || "").trim().length > 80 ? Math.max(1, signalScore) : signalScore;
    return { item, index, sourceName, legal, score: fallbackScore };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = scored.slice(0, Math.max(1, Math.min(3, Number(maxCandidates) || 3)));
  return selected.map(({ item, index, sourceName, score }) => {
    const compact = normalizeText(item.text, 1200);
    const title = titleFromText(item.text, sourceName, index);
    return {
      clientCandidateId: `qwen3_rescue_${String(index + 1).padStart(4, "0")}`,
      workingLabel: `Needs review: ${title}`,
      neutralSummary: normalizeText(`Qwen returned no candidates for this substantive window, so Project State preserved this low-confidence review candidate instead of silently dropping the signal. Source excerpt: ${compact}`, 2000),
      candidateType: fallbackCandidateType(item.text, allowedTypes),
      scope: "unknown",
      keyTerms: normalizeTerms([title, sourceName, ...compact.split(/\s+/).slice(0, 30)]),
      evidence: [{
        discoveryChunkId: item.chunk.id,
        discoveryExtractionId: item.extraction.id,
        fileVersionId: item.extraction.fileVersionId,
        sourceSha256: item.extraction.sourceSha256,
        chunkTextSha256: item.chunk.textSha256,
        relationship: "mentions",
        excerpt: normalizeText(item.text, 500)
      }],
      confidence: {
        score: Math.min(0.42, Math.max(0.22, score / 20)),
        basis: "Deterministic local rescue candidate created because Qwen returned an empty candidate list for a substantive chunk window.",
        uncertaintyNotes: "Human review should decide whether this is a real idea, supporting evidence, duplicate context, or noise."
      },
      relationships: [],
      clarificationQuestions: [{
        clientQuestionId: `qwen3_rescue_question_${String(index + 1).padStart(4, "0")}`,
        text: "Should this preserved source signal become a project candidate, merge into an existing mapped idea, or be rejected as noise?",
        affects: "routing",
        allowNotSure: true
      }],
      provenance: { providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID, externalJobId: "local_rescue_candidate", responseAttempts: attempts, deterministicRescue: true }
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
    "Prior digest context is context only. Every new candidate must still cite at least one supplied current discoveryChunkId.",
    "Do not create project names, project IDs, routes, approvals, facts, or history.",
    "Licensing agreements, EULAs, terms, privacy policies, developer/app-store agreements, SDK/API terms, and third-party notices are reference/supporting material. Do not split them into project ideas unless the text clearly describes a buildable project.",
    "When a chunk is mostly legal/app agreement material, return at most one reference candidate with scope supporting.",
    "Return an empty candidates array only when the supplied chunks are pure boilerplate, duplicate legal text, or unreadable metadata. If there are named projects, headings, business plans, code/test evidence, story drafts, simulations, requirements, risks, tasks, or questions, return at least one candidate.",
    "If a current chunk supports or continues an existing Candidate Map entry, still return a candidate with that current chunk evidence so Project State can update the map.",
    "Every candidate must cite at least one supplied discoveryChunkId.",
    "Return strict JSON only with this shape:",
    '{"candidates":[{"workingLabel":"short label","neutralSummary":"plain evidence-based summary","candidateType":"other","scope":"standalone|supporting|cross_cutting|unknown","keyTerms":["term"],"evidence":[{"discoveryChunkId":"chunk id","relationship":"supports|mentions|contrasts|limits|depends_on|context_only","excerpt":"short quote or paraphrase from the chunk"}],"confidence":{"score":0.0,"basis":"why","uncertaintyNotes":"what is unclear"},"clarificationQuestions":[{"text":"question","affects":"meaning|scope|routing|priority|grouping","allowNotSure":true}]}]}',
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
  const allowedScopes = new Set(ideaContract.objects.IdeaCandidate.candidateScopes);
  const allowedRelationships = new Set(ideaContract.objects.IdeaCandidate.evidenceRelationships);
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
        excerpt: normalizeText(evidence.excerpt || source.text, 500)
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
        excerpt: normalizeText(source.text, 500)
      });
    }
    const legalEvidenceSignals = normalizedEvidence.map((evidence) => legalByChunkId.get(evidence.discoveryChunkId)).filter(Boolean);
    const isLegalReference = legalEvidenceSignals.some((signals) => signals.isLegalReference);
    const legalTerms = [...new Set(legalEvidenceSignals.flatMap((signals) => signals.terms || []))].slice(0, 8);
    const candidateType = isLegalReference ? "reference" : allowedTypes.has(candidate.candidateType) ? candidate.candidateType : "other";
    const scope = isLegalReference ? "supporting" : allowedScopes.has(candidate.scope) ? candidate.scope : "unknown";
    const neutralSummary = normalizeText(candidate.neutralSummary || candidate.summary || "", 2000);
    return {
      clientCandidateId: normalizeText(candidate.clientCandidateId || `qwen3_candidate_${String(index + 1).padStart(4, "0")}`, 120).replace(/[^a-zA-Z0-9_-]/g, "_") || `qwen3_candidate_${index + 1}`,
      workingLabel: normalizeText(candidate.workingLabel || candidate.title || `Idea candidate ${index + 1}`, 200),
      neutralSummary: isLegalReference
        ? normalizeText(`Licensing/app agreement/reference material. Keep as supporting context unless a human confirms it is the project. Signals: ${legalTerms.join(", ") || "legal reference"}. ${neutralSummary}`, 2000)
        : neutralSummary,
      candidateType,
      scope,
      keyTerms: normalizeTerms(candidate.keyTerms),
      evidence: normalizedEvidence,
      confidence: {
        score: clampNumber(candidate.confidence?.score, 0, 1, 0.5),
        basis: normalizeText(candidate.confidence?.basis || "Qwen3 8B local model analysis of authorized chunks.", 1000),
        uncertaintyNotes: normalizeText(candidate.confidence?.uncertaintyNotes || "", 2000)
      },
      relationships: Array.isArray(candidate.relationships) ? candidate.relationships.slice(0, 50) : [],
      clarificationQuestions: (Array.isArray(candidate.clarificationQuestions) ? candidate.clarificationQuestions : []).slice(0, 20).map((question, questionIndex) => ({
        clientQuestionId: normalizeText(question.clientQuestionId || `qwen3_question_${index + 1}_${questionIndex + 1}`, 120).replace(/[^a-zA-Z0-9_-]/g, "_"),
        text: normalizeText(question.text || "", 500),
        affects: normalizeText(question.affects || "meaning", 80),
        allowNotSure: question.allowNotSure !== false
      })).filter((question) => question.text),
      provenance: { ...(candidate.provenance || {}), providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID, externalJobId: candidate.provenance?.externalJobId || `local_ollama_${envelope.requestId}`, responseAttempts: candidate.provenance?.responseAttempts || attempts, responseInvalidRescue: candidate.provenance?.responseInvalidRescue || responseInvalid }
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
