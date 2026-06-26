const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const required = [
    "If you expected existing projects, restore a Project State backup before starting a new blank setup.",
    "data-action=\"restore-storage\"",
    "No saved Project State database is available yet. Restore a backup or complete setup before creating a backup.",
    "needsFirstRunSetup() && action === \"restore-storage\"",
    "actorSuggestionDatalist(\"actorNameSuggestions\")"
  ];
  for (const text of required) assert(app.includes(text), `First-run recovery flow is missing: ${text}`);

  assert(
    /function exportStorageBackup\(\) \{\s*if \(needsFirstRunSetup\(\)\) \{[\s\S]+return;\s*\}/.test(app),
    "Backup must be blocked with a clear message before setup/storage exists."
  );
  assert(
    /function auditFields[\s\S]+const options = activeActorOptions\(defaultActorName\);[\s\S]+\? `<select id="actorName" name="actorName" required>\$\{options\}<\/select>`[\s\S]+: `<input id="actorName" name="actorName"/.test(app),
    "Audit actor field must fall back to typed input when no active actors exist."
  );
  assert(
    /function actionAllowedForCurrentActor\(action = "", project = getProject\(\)\) \{\s*if \(needsFirstRunSetup\(\) && action === "restore-storage"\) return true;/.test(app),
    "Restore must be allowed before first-run setup is completed."
  );

  console.log("First Run Recovery Flow Check");
  console.log(JSON.stringify({
    restoreAvailableBeforeSetup: true,
    backupBlockedBeforeSetup: true,
    typedRestoreActorFallback: true,
    setupWarningPresent: true
  }, null, 2));
  console.log("First-run recovery flow: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("First-run recovery flow failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
}
