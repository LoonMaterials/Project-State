const fs = require("node:fs");
const path = require("node:path");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const required = [
    "archivedDeletionLog: []",
    "function appendArchivedDeletionAudit",
    "function openDeleteArchivedProjectModal",
    "function openDeleteAllArchivedProjectsModal",
    "data-action=\"delete-archived-project\"",
    "data-action=\"delete-all-archived-projects\"",
    "DELETE ARCHIVE",
    "DELETE ALL ARCHIVED",
    "Managed source-file cleanup is separate.",
    "saveStore({ allowWithoutCoreApproval: true, reason: \"archived-project-delete\" })",
    "saveStore({ allowWithoutCoreApproval: true, reason: \"all-archived-projects-delete\" })"
  ];
  for (const text of required) assert(app.includes(text), `Archived deletion flow is missing: ${text}`);

  assert(
    /if \(project\.archived\) \{\s*openDeleteArchivedProjectModal\(projectId\);\s*return;\s*\}/.test(app),
    "Archived projects must route away from the old deletion-request flow."
  );
  assert(
    /if \(!project \|\| !project\.archived\) return;/.test(app),
    "Single archived delete modal must refuse non-archived projects."
  );
  assert(
    /store\.projects = store\.projects\.filter\(\(item\) => item\.id !== project\.id\);/.test(app),
    "Single archived delete must remove the archived project record."
  );
  assert(
    /store\.projects = store\.projects\.filter\(\(project\) => !archivedIds\.has\(project\.id\)\);/.test(app),
    "Bulk archived delete must remove only archived project records."
  );
  assert(
    /\["delete-project", "delete-archived-project", "delete-all-archived-projects"\]\.includes\(action\)\) return role === "owner";/.test(app),
    "Permanent archive delete controls must remain owner-only."
  );
  assert(
    /project\.archived\s*\?\s*`<button class="btn danger compact" data-action="delete-archived-project"/.test(app),
    "Archived cards must expose the permanent archive delete button."
  );
  assert(
    /project\.archived\s*\?\s*`<button class="btn danger compact"[\s\S]+:\s*`<button class="btn secondary compact" data-action="delete-project"/.test(app),
    "Active project deletion request and archived permanent deletion must stay separate."
  );

  console.log("Archived Project Deletion Flow Check");
  console.log(JSON.stringify({
    archivedOnlyPermanentDelete: true,
    bulkArchiveDelete: true,
    ownerOnlyControls: true,
    typedConfirmation: true,
    settingsAuditLog: true,
    activeDeleteRequestPreserved: true
  }, null, 2));
  console.log("Archived project deletion flow: ok");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error("Archived project deletion flow failed:");
    console.error(error.message);
    process.exitCode = 1;
  }
}
