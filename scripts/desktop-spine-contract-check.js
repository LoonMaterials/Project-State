const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONTRACT = path.join(ROOT, "fixtures", "desktop-spine-v0.1-contract.json");
const BRIDGE_DOC = path.join(ROOT, "DESKTOP_BRIDGE.md");
const SPINE_DOC = path.join(ROOT, "DESKTOP_STORAGE_SPINE.md");
const APP_FILE = path.join(ROOT, "app.js");
const SCHEMA_FILE = path.join(ROOT, "desktop", "spine-schema.sql");
const BRIDGE_IMPL = path.join(ROOT, "desktop", "project-state-desktop-bridge.cjs");
const DESKTOP_MAIN = path.join(ROOT, "desktop", "main.cjs");
const DESKTOP_PRELOAD = path.join(ROOT, "desktop", "preload.cjs");

const REQUIRED_FOLDERS = ["sources", "extracts", "attachments", "quarantine", "discovery", "backups", "recovery", "manifests", "logs", "temp", "integrations"];
const REQUIRED_TABLES = [
  "meta",
  "actors",
  "projects",
  "decisions",
  "facts",
  "open_questions",
  "next_actions",
  "relationships",
  "changes",
  "sources",
  "extracts",
  "extract_chunks",
  "attachments",
  "source_links",
  "intake_batches",
  "intake_items",
  "proposed_projects",
  "proposal_items",
  "draft_projects",
  "approval_records",
  "recovery_records",
  "file_assets",
  "file_versions",
  "discovery_cases",
  "discovery_case_files",
  "discovery_interactions",
  "security_receipts",
  "discovery_events",
  "discovery_extractions",
  "discovery_chunks",
  "idea_analysis_runs",
  "idea_privacy_authorizations",
  "idea_transmission_receipts",
  "ai_analysis_jobs",
  "idea_candidates",
  "ai_analysis_result_receipts",
  "idea_review_decisions",
  "confirmed_idea_units"
];
const REQUIRED_SAFETY_PHRASES = [
  "Human approval is required",
  "Preserve all stable IDs",
  "API arms must plug into the desktop app Intake Airlock",
  "must not write directly to Core or Spine",
  "recovery mode",
  "Backup location must remain separate",
  "append-only"
];
const REQUIRED_BRIDGE_METHODS = {
  storage: ["loadStore", "saveStore", "saveMeta", "preserveRecoveryRecord", "verifyIntegrity", "importBrowserExport", "createBackupPackage", "restoreBackupPackage", "reset"],
  discoveryStorage: ["initialize", "registerFileVersion", "createCase", "attachFileVersion", "appendInteraction", "appendSecurityReceipt", "appendEvent", "readFoundationState", "stageTrustedFile", "extractFileVersion", "readExtractionText", "readChunkText", "analyzeCase", "recordAnswer", "confirmRouting", "getCase", "promoteToIntake"],
  analysisArms: ["describeCapabilities", "createRun", "authorizeTransmission", "submitAnalysisBatch", "getAnalysisStatus", "getResultPage", "cancelAnalysis", "getReceipt", "recordReviewDecision", "readState"],
  securityArms: ["authorizeContentAccess"],
  files: ["metadata", "localPath", "readAsDataUrl", "readAsText", "readAsArrayBuffer", "extractText", "inflateRaw"],
  downloads: ["saveTextFile"]
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function names(records = []) {
  return records.map((record) => record.name);
}

function missing(required, actual) {
  return required.filter((item) => !actual.includes(item));
}

function validateContract(contract) {
  assert(contract.app === "Project State", "Contract app mismatch.");
  assert(contract.contractType === "desktop-storage-spine", "Contract type mismatch.");
  assert(contract.storageEngine === "sqlite-plus-managed-folders", "Storage engine should be SQLite plus managed folders.");
  assert(contract.databaseFile === "project-state.db", "Database file should be project-state.db.");

  const missingFolders = missing(REQUIRED_FOLDERS, names(contract.folderLayout));
  const missingTables = missing(REQUIRED_TABLES, names(contract.tables));
  assert(!missingFolders.length, "Desktop spine contract is missing folders.", { missingFolders });
  assert(!missingTables.length, "Desktop spine contract is missing tables.", { missingTables });

  for (const [group, methods] of Object.entries(REQUIRED_BRIDGE_METHODS)) {
    const actual = contract.minimumBridgeMethods?.[group] || [];
    const missingMethods = missing(methods, actual);
    assert(!missingMethods.length, `Desktop spine contract is missing ${group} bridge methods.`, { missingMethods });
  }

  const safetyText = (contract.safetyRules || []).join("\n");
  const missingSafety = REQUIRED_SAFETY_PHRASES.filter((phrase) => !safetyText.includes(phrase));
  assert(!missingSafety.length, "Desktop spine contract is missing safety rules.", { missingSafety });

  return {
    folders: contract.folderLayout.length,
    tables: contract.tables.length,
    safetyRules: contract.safetyRules.length
  };
}

function validateDocs(contract, bridgeDoc, spineDoc, appSource, schemaSource, bridgeSource, mainSource, preloadSource) {
  const requiredDocTerms = [
    "SQLite",
    "managed file folders",
    "IntakeBatch",
    "API Arm Rule",
    "ProposedProject",
    "ApprovalRecord",
    "DiscoveryCase",
    "external-security responsibility acknowledgment",
    "quarantine/",
    "fixtures/desktop-spine-v0.1-contract.json"
  ];
  const missingDocTerms = requiredDocTerms.filter((term) => !spineDoc.includes(term));
  assert(!missingDocTerms.length, "Desktop storage spine doc is missing required terms.", { missingDocTerms });

  for (const method of Object.values(contract.minimumBridgeMethods).flat()) {
    assert(bridgeDoc.includes(method), `Desktop bridge doc is missing method ${method}.`);
  }
  assert(bridgeDoc.includes("must not bypass human approval"), "Desktop bridge doc must preserve airlock approval rule.");
  assert(appSource.includes("window.ProjectStateDesktop"), "App does not expose the desktop bridge boundary.");
  assert(appSource.includes("platformAdapter"), "App does not use the platform adapter boundary.");
  assert(bridgeSource.includes("createProjectStateDesktopBridge"), "Desktop bridge implementation is missing createProjectStateDesktopBridge.");
  assert(bridgeSource.includes("DatabaseSync"), "Desktop bridge implementation is missing SQLite DatabaseSync.");
  assert(mainSource.includes("loadFile(INDEX_HTML)"), "Desktop main wrapper must load local index.html without a server.");
  assert(mainSource.includes("preload: PRELOAD"), "Desktop main wrapper must load the preload bridge.");
  assert(preloadSource.includes("ProjectStateDesktop"), "Desktop preload must expose ProjectStateDesktop.");

  const missingSchemaTables = REQUIRED_TABLES.filter((table) => !schemaSource.includes(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert(!missingSchemaTables.length, "Desktop SQLite schema is missing required tables.", { missingSchemaTables });

  return {
    docTerms: requiredDocTerms.length,
    bridgeMethods: Object.values(contract.minimumBridgeMethods).flat().length,
    schemaTables: REQUIRED_TABLES.length,
    desktopWrapper: true
  };
}

function main() {
  const contract = readJson(CONTRACT);
  const bridgeDoc = readText(BRIDGE_DOC);
  const spineDoc = readText(SPINE_DOC);
  const appSource = readText(APP_FILE);
  const schemaSource = readText(SCHEMA_FILE);
  const bridgeSource = readText(BRIDGE_IMPL);
  const mainSource = readText(DESKTOP_MAIN);
  const preloadSource = readText(DESKTOP_PRELOAD);
  const contractSummary = validateContract(contract);
  const docsSummary = validateDocs(contract, bridgeDoc, spineDoc, appSource, schemaSource, bridgeSource, mainSource, preloadSource);

  console.log("Desktop Spine Contract Check");
  console.log(JSON.stringify({
    contractVersion: contract.contractVersion,
    storageEngine: contract.storageEngine,
    ...contractSummary,
    ...docsSummary
  }, null, 2));
  console.log("Desktop spine contract: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Desktop spine contract failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}
