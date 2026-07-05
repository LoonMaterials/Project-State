const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createProjectStateDesktopBridge } = require("../desktop/project-state-desktop-bridge.cjs");

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

async function removeTempRoot(root) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await fsp.rm(root, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!["EBUSY", "EPERM"].includes(error.code) || attempt === 11) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

async function main() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "project-state-large-corpus-"));
  const storageRoot = path.join(tempRoot, "storage");
  const inputRoot = path.join(tempRoot, "input");
  try {
    await fsp.mkdir(inputRoot, { recursive: true });
    const corpusPath = path.join(inputRoot, "raw-chatgpt-archive.txt");
    const turn = [
      "User: We need to capture ideas for Aether, Project State, and long-term memory.",
      "Assistant: This archive contains repeated project design notes, questions, risks, and candidate tasks."
    ].join("\n");
    const repeated = Array.from({ length: 18000 }, (_, index) => `${turn}\nConversation index ${index + 1}: project idea discovery should be indexed before promotion.`).join("\n\n");
    await fsp.writeFile(corpusPath, repeated, "utf8");

    const bridge = createProjectStateDesktopBridge({ storageRoot });
    const staged = await bridge.discoveryStorage.stageTrustedFile({
      path: corpusPath,
      actorId: "actor_owner",
      reason: "Trusted large raw ChatGPT archive fixture.",
      externalSecurityAcknowledged: true,
      timestamp: "2026-07-02T09:00:00.000Z"
    });
    const extracted = await bridge.discoveryStorage.extractFileVersion({
      discoveryCaseId: staged.discoveryCaseId,
      fileVersionId: staged.fileVersionId,
      actorId: "deterministic_extractor",
      createdAt: "2026-07-02T09:01:00.000Z"
    });
    assert(extracted.extraction.status === "large_corpus_pending", "Large raw ChatGPT archive should defer to corpus intake.", extracted.extraction);
    assert(extracted.chunks.length === 0, "Large corpus preflight should not explode into immediate chunks.", extracted);
    assert(extracted.extraction.preflight?.recommendedLane === "corpus_intake", "Large corpus preflight did not choose the corpus lane.", extracted.extraction.preflight);
    assert(extracted.extraction.preflight?.estimatedWords > 250000, "Large corpus word estimate was not high enough to trigger corpus mode.", extracted.extraction.preflight);
    assert(extracted.extraction.preflight?.corpusKind === "raw_chatgpt_archive", "Raw ChatGPT archive was not detected.", extracted.extraction.preflight);

    const analysis = await bridge.discoveryStorage.analyzeCase({
      discoveryCaseId: staged.discoveryCaseId,
      actorId: "project_state_deterministic",
      createdAt: "2026-07-02T09:02:00.000Z"
    });
    assert(analysis.corpusIntake?.recommended === true, "Analysis did not recommend corpus intake.", analysis);
    assert(analysis.documentUnits.length === 1, "Large corpus should produce one reviewable corpus unit, not zero units or many guesses.", analysis.documentUnits);
    assert(analysis.documentUnits[0].evidence?.[0]?.role === "large_corpus_pending", "Corpus unit lost its pending-corpus evidence.", analysis.documentUnits[0]);
    const indexed = await bridge.discoveryStorage.indexCorpus({
      discoveryCaseId: staged.discoveryCaseId,
      extractionId: extracted.extraction.id,
      actorId: "project_state_deterministic",
      createdAt: "2026-07-02T09:02:30.000Z",
      chunkCharacters: 12000,
      maxChunks: 12
    });
    assert(indexed.chunks.length === 12, "Corpus index should create bounded chunks for local AI.", indexed);
    assert(indexed.indexed?.truncated === true, "First corpus indexing pass should report that more chunks remain.", indexed.indexed);
    const readChunk = await bridge.discoveryStorage.readChunkText({ discoveryChunkId: indexed.chunks[0].id });
    assert(readChunk.text.includes("User:") && readChunk.text.includes("Assistant:"), "Indexed corpus chunk was not readable.", readChunk);
    const continued = await bridge.discoveryStorage.indexCorpus({
      discoveryCaseId: staged.discoveryCaseId,
      extractionId: extracted.extraction.id,
      actorId: "project_state_deterministic",
      createdAt: "2026-07-02T09:02:45.000Z",
      chunkCharacters: 12000,
      maxChunks: 5,
      continueIndex: true
    });
    assert(continued.indexed?.chunkCount === 5, "Corpus continuation should add only the requested next batch.", continued.indexed);
    assert(continued.chunks.length === 17, "Corpus continuation should preserve prior chunks and append the next batch.", continued);
    assert(continued.chunks[12].chunkIndex === 12, "Corpus continuation did not preserve sequential chunk indexes.", continued.chunks.slice(10, 14));
    const indexedAgain = await bridge.discoveryStorage.indexCorpus({
      discoveryCaseId: staged.discoveryCaseId,
      extractionId: extracted.extraction.id,
      actorId: "project_state_deterministic"
    });
    assert(indexedAgain.deduplicated === true && indexedAgain.chunks.length === continued.chunks.length, "Corpus indexing should be idempotent unless continuation is requested.", indexedAgain);

    await bridge.discoveryStorage.confirmRouting({
      discoveryCaseId: staged.discoveryCaseId,
      actorId: "actor_owner",
      routes: [{ ...analysis.documentUnits[0], destination: "large_ai_work_order", proposedProjectName: analysis.documentUnits[0].title }],
      confirmedAt: "2026-07-02T09:03:00.000Z"
    });
    let promotionBlocked = false;
    try {
      await bridge.discoveryStorage.promoteToIntake({
        discoveryCaseId: staged.discoveryCaseId,
        actorId: "actor_owner",
        promotedAt: "2026-07-02T09:04:00.000Z",
        reason: "Route staged corpus as a pending project candidate."
      });
    } catch {
      promotionBlocked = true;
    }
    assert(promotionBlocked, "Large corpus should not promote directly to Intake; it belongs in AI Work Orders first.");
    const db = new DatabaseSync(path.join(storageRoot, "project-state.db"));
    const intake = db.prepare("SELECT record_json FROM intake_items ORDER BY rowid").all().map((row) => JSON.parse(row.record_json)).find((item) => item.discoveryCaseId === staged.discoveryCaseId);
    const coreProjects = db.prepare("SELECT COUNT(*) AS count FROM projects").get().count;
    db.close();
    assert(!intake, "Large corpus should not create an Intake item before AI follow-up.", intake);
    assert(coreProjects === 0, "Large corpus Intake promotion must not create Core projects.", { coreProjects });

    const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
    assert(appSource.includes("data-corpus-index-required"), "Large corpus review UI should show that indexing is required before local AI.");
    assert(appSource.includes("Create Large-file/folder AI Work Order"), "Large corpus review UI should route slow digestion to AI Work Orders.");
    assert(appSource.includes("Large-file digestion now belongs in AI Work Orders"), "Large corpus review UI should explain the AI Work Order bench.");
    assert(appSource.includes("continueIndex"), "Large corpus review UI should support resumable indexing.");
    assert(appSource.includes("Queue indexed evidence in AI Work Orders"), "Large corpus UI should not steer users into inline Discovery AI.");
    assert(appSource.includes("Partial analysis window"), "Large corpus AI path should disclose bounded local-analysis windows.");
    assert(appSource.includes("maximumChunks"), "Large corpus AI path should obey local analysis arm chunk limits.");
    assert(appSource.includes("No AI is called from this Discovery screen."), "Discovery should not run AI inline for large-file review.");
    assert(appSource.includes("Build a large-file index before running local AI idea analysis."), "Chunkless large-file AI guard should still explain the required backend next step.");

    console.log("Large Corpus Intake Flow Check");
    console.log(JSON.stringify({
      status: extracted.extraction.status,
      estimatedWords: extracted.extraction.preflight.estimatedWords,
      corpusKind: extracted.extraction.preflight.corpusKind,
      immediateChunks: extracted.chunks.length,
      indexedChunks: continued.chunks.length,
      corpusUnit: analysis.documentUnits[0].title,
      intakeProposals: 0,
      directIntakeBlocked: promotionBlocked,
      coreChanged: false
    }, null, 2));
    console.log("Large corpus intake flow: ok");
  } finally {
    await removeTempRoot(tempRoot);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Large corpus intake flow failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  });
}
