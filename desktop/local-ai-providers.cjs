const QWEN3_8B_PROVIDER_ID = "ollama_qwen3_8b_local";
const QWEN3_8B_ARM_ID = "project_state_ollama_qwen3_8b";
const QWEN3_8B_MODEL_ID = "qwen3:8b";
const OLLAMA_BASE_URL = process.env.PROJECT_STATE_OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_GENERATE_TIMEOUT_MS = positiveInteger(process.env.PROJECT_STATE_LOCAL_AI_TIMEOUT_MS, 300000);

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

function normalizeTerms(value = []) {
  const input = Array.isArray(value) ? value : String(value || "").split(/[,;\n]/);
  return [...new Set(input.map((term) => normalizeText(term, 80).toLowerCase()).filter((term) => term.length > 2))].slice(0, 32);
}

function buildAnalysisPrompt({ chunks, candidateTypes, maxCandidates }) {
  const safeChunks = chunks.map(({ chunk, text }, index) => ({
    index,
    discoveryChunkId: chunk.id,
    chunkTextSha256: chunk.textSha256,
    text: String(text || "").slice(0, 12000)
  }));
  return [
    "You are a local Project State analysis arm. You are not the source of truth.",
    "Analyze only the supplied chunks. Create non-authoritative Idea Candidates only.",
    "Do not create project names, project IDs, routes, approvals, facts, or history.",
    "Every candidate must cite at least one supplied discoveryChunkId.",
    "Return strict JSON only with this shape:",
    '{"candidates":[{"workingLabel":"short label","neutralSummary":"plain evidence-based summary","candidateType":"other","scope":"standalone|supporting|cross_cutting|unknown","keyTerms":["term"],"evidence":[{"discoveryChunkId":"chunk id","relationship":"supports|mentions|contrasts|limits|depends_on|context_only","excerpt":"short quote or paraphrase from the chunk"}],"confidence":{"score":0.0,"basis":"why","uncertaintyNotes":"what is unclear"},"clarificationQuestions":[{"text":"question","affects":"meaning|scope|routing|priority|grouping","allowNotSure":true}]}]}',
    `Allowed candidateType values: ${candidateTypes.join(", ")}`,
    `Maximum candidates: ${maxCandidates}`,
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
      num_predict: 1200
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
      "Use exactly this top-level shape:",
      '{"candidates":[{"workingLabel":"short label","neutralSummary":"plain evidence-based summary","candidateType":"other","scope":"unknown","keyTerms":[],"evidence":[{"discoveryChunkId":"chunk id from the supplied chunks","relationship":"supports","excerpt":"short quote or paraphrase"}],"confidence":{"score":0.5,"basis":"why","uncertaintyNotes":""},"clarificationQuestions":[]}]}',
      candidateTypes?.length ? `Allowed candidateType values: ${candidateTypes.join(", ")}` : "",
      maxCandidates ? `Maximum candidates: ${maxCandidates}` : "",
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
  const prompt = buildAnalysisPrompt({ chunks: validated, candidateTypes: ideaContract.objects.IdeaCandidate.candidateTypes, maxCandidates });
  const { parsed, attempts } = await callQwenForJson(prompt, { candidateTypes: ideaContract.objects.IdeaCandidate.candidateTypes, maxCandidates });
  const suppliedCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
  const chunkById = new Map(validated.map((item) => [item.chunk.id, item]));
  const allowedTypes = new Set(ideaContract.objects.IdeaCandidate.candidateTypes);
  const allowedScopes = new Set(ideaContract.objects.IdeaCandidate.candidateScopes);
  const allowedRelationships = new Set(ideaContract.objects.IdeaCandidate.evidenceRelationships);
  return suppliedCandidates.slice(0, maxCandidates).map((candidate, index) => {
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
    const candidateType = allowedTypes.has(candidate.candidateType) ? candidate.candidateType : "other";
    const scope = allowedScopes.has(candidate.scope) ? candidate.scope : "unknown";
    return {
      clientCandidateId: normalizeText(candidate.clientCandidateId || `qwen3_candidate_${String(index + 1).padStart(4, "0")}`, 120).replace(/[^a-zA-Z0-9_-]/g, "_") || `qwen3_candidate_${index + 1}`,
      workingLabel: normalizeText(candidate.workingLabel || candidate.title || `Idea candidate ${index + 1}`, 200),
      neutralSummary: normalizeText(candidate.neutralSummary || candidate.summary || "", 2000),
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
      provenance: { providerId: QWEN3_8B_PROVIDER_ID, modelId: QWEN3_8B_MODEL_ID, externalJobId: `local_ollama_${envelope.requestId}`, responseAttempts: attempts }
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
