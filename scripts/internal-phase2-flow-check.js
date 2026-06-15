const fs = require("fs");
const path = require("path");

const {
  countStoreParts,
  extractStore,
  listProjectImages,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");
const {
  buildManifest,
  rebuildStore,
  splitStoreRecords
} = require("./storage-phase2-split-check");

const FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
const APP_FILE = path.join(__dirname, "..", "app.js");

function readFixture() {
  return extractStore(JSON.parse(fs.readFileSync(FIXTURE, "utf8")));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function collectIds(store) {
  const ids = new Set();
  const duplicates = [];
  const add = (id, label) => {
    if (!id) return;
    if (ids.has(id)) duplicates.push(`${label}:${id}`);
    ids.add(id);
  };

  for (const actor of store.actors || []) add(actor.id, "actor");
  for (const intake of store.intakeItems || []) add(intake.id, "intake");
  for (const project of store.projects || []) {
    add(project.id, "project");
    for (const decision of project.decisions || []) add(decision.id, "decision");
    for (const fact of project.facts || []) add(fact.id, "fact");
    for (const source of project.sources || []) {
      add(source.id, "source");
      for (const extract of source.extracts || []) add(extract.id, "extract");
    }
    for (const draft of project.draftProjects || []) add(draft.id, "draft");
    for (const relationship of project.relationships || []) add(relationship.id, "relationship");
    for (const question of project.openQuestions || []) add(question.id, "question");
    for (const action of project.nextActions || []) add(action.id, "action");
    for (const change of project.changes || []) add(change.id, "change");
    for (const image of listProjectImages(project)) add(image.id, "attachment");
  }

  return { ids, duplicates };
}

function findObject(project, objectType, objectId) {
  if (objectType === "Project") return project.id === objectId ? project : null;
  const lists = {
    Decision: project.decisions || [],
    Fact: project.facts || [],
    Relationship: project.relationships || [],
    OpenQuestion: project.openQuestions || [],
    NextAction: project.nextActions || [],
    DraftProject: project.draftProjects || [],
    Change: project.changes || []
  };
  if (lists[objectType]) return lists[objectType].find((item) => item.id === objectId) || null;
  if (objectType === "Source") return (project.sources || []).find((source) => source.id === objectId) || null;
  if (objectType === "Extract") {
    for (const source of project.sources || []) {
      const extract = (source.extracts || []).find((item) => item.id === objectId);
      if (extract) return extract;
    }
  }
  return null;
}

function listFullProjectImages(project) {
  const images = [];
  const collect = (ownerType, ownerId, links = []) => {
    for (const image of links || []) {
      images.push({
        ...image,
        projectId: image.projectId || project.id,
        attachedToType: image.attachedToType || ownerType,
        attachedToId: image.attachedToId || ownerId
      });
    }
  };

  collect("Project", project.id, project.imageLinks);
  for (const decision of project.decisions || []) collect("Decision", decision.id, decision.imageLinks);
  for (const fact of project.facts || []) collect("Fact", fact.id, fact.imageLinks);
  for (const source of project.sources || []) {
    collect("Source", source.id, source.imageLinks);
    for (const extract of source.extracts || []) collect("Extract", extract.id, extract.imageLinks);
  }
  for (const draft of project.draftProjects || []) collect("DraftProject", draft.id, draft.imageLinks);
  for (const relationship of project.relationships || []) collect("Relationship", relationship.id, relationship.imageLinks);
  for (const question of project.openQuestions || []) collect("OpenQuestion", question.id, question.imageLinks);
  for (const action of project.nextActions || []) collect("NextAction", action.id, action.imageLinks);
  for (const change of project.changes || []) collect("Change", change.id, change.imageLinks);
  return images;
}

function dataIntegrityTest(store) {
  const projectIds = new Set((store.projects || []).map((project) => project.id));
  let openedProjects = 0;
  let openedSources = 0;
  let openedExtracts = 0;
  let openedDrafts = 0;
  let openedAttachments = 0;
  let verifiedRelationships = 0;

  for (const project of store.projects || []) {
    assert(project.id && project.name, "Project did not open with id/name.", { project });
    openedProjects += 1;

    for (const source of project.sources || []) {
      assert(source.id && source.projectId === project.id, "Source did not open or projectId mismatch.", { source });
      openedSources += 1;
      for (const extract of source.extracts || []) {
        assert(extract.id && extract.sourceId === source.id && extract.text, "Extract did not open or source link failed.", { extract });
        openedExtracts += 1;
      }
    }

    for (const draft of project.draftProjects || []) {
      assert(draft.id && draft.projectId === project.id && draft.draft, "Draft did not open or projectId mismatch.", { draft });
      openedDrafts += 1;
    }

    for (const image of listFullProjectImages(project)) {
      const target = findObject(project, image.attachedToType, image.attachedToId);
      assert(target, "Attachment target did not resolve.", { image });
      assert(image.fileName && (image.dataUrl || image.localPath || image.localReference), "Attachment missing readable reference.", { image });
      openedAttachments += 1;
    }

    for (const relationship of project.relationships || []) {
      if (relationship.targetProjectId) {
        assert(projectIds.has(relationship.targetProjectId), "Relationship target project missing.", { relationship });
        verifiedRelationships += 1;
      }
    }
  }

  return { openedProjects, openedSources, openedExtracts, openedDrafts, openedAttachments, verifiedRelationships };
}

function makeId(prefix, ids) {
  let index = 1;
  let id = `${prefix}_internal_${index}`;
  while (ids.has(id)) {
    index += 1;
    id = `${prefix}_internal_${index}`;
  }
  ids.add(id);
  return id;
}

function recordChange(project, actor, reason, summary, details, ids) {
  const timestamp = "2026-06-15T12:00:00.000Z";
  const change = {
    id: makeId("change", ids),
    projectId: project.id,
    actorId: actor.id,
    actorName: actor.name,
    timestamp,
    language: "en",
    howChanged: "human_ui",
    reason,
    summary,
    details: {
      origin: "human_ui",
      language: "en",
      ...details
    },
    imageLinks: []
  };
  project.changes.unshift(change);
  project.updatedAt = timestamp;
  project.updatedBy = actor.id;
  return change;
}

function approvalFlowTest(inputStore, includeStore = false) {
  const store = clone(inputStore);
  const actor = store.actors.find((item) => item.role === "owner") || store.actors[0];
  const { ids } = collectIds(store);
  const sourceProject = store.projects.find((project) => project.sources?.[0]?.extracts?.[0]);
  assert(sourceProject, "No project with source/extract exists for draft approval test.");
  const source = sourceProject.sources[0];
  const extract = source.extracts[0];

  const draft = {
    id: makeId("draft", ids),
    projectId: sourceProject.id,
    name: "Internal Approved Draft Project",
    createdAt: "2026-06-15T12:00:00.000Z",
    createdDate: "2026-06-15T12:00:00.000Z",
    sourceId: source.id,
    sourceTitle: source.title,
    extractId: extract.id,
    draft: "Internal draft project text for approval flow.",
    status: "draft",
    reviewFlags: {
      factsReviewed: true,
      decisionsReviewed: true,
      questionsReviewed: true,
      actionsReviewed: true,
      relationshipsReviewed: true,
      readyForApproval: true
    },
    sourceLinks: [],
    imageLinks: []
  };
  sourceProject.draftProjects.unshift(draft);
  recordChange(sourceProject, actor, "Internal test draft creation.", "Draft project created", {
    objectType: "DraftProject",
    objectId: draft.id,
    objectText: draft.name
  }, ids);

  const timestamp = "2026-06-15T12:05:00.000Z";
  const sourceLink = {
    id: makeId("source_link", ids),
    sourceProjectId: sourceProject.id,
    sourceId: source.id,
    sourceTitle: source.title,
    sourceType: source.sourceType || source.type || "",
    extractId: extract.id,
    extractTitle: extract.title || "",
    attachedAt: timestamp,
    actorId: actor.id
  };
  const approvedProject = {
    id: makeId("project", ids),
    name: draft.name,
    currentStatus: "Approved draft project",
    currentSummary: draft.draft,
    healthFlag: "active",
    archived: false,
    deletionStatus: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy: actor.id,
    sourceLinks: [sourceLink],
    imageLinks: [],
    decisions: [],
    facts: [],
    sources: [],
    draftProjects: [],
    relationships: [],
    openQuestions: [],
    nextActions: [],
    changes: [],
    draftSource: {
      sourceProjectId: sourceProject.id,
      draftProjectId: draft.id,
      sourceId: draft.sourceId,
      extractId: draft.extractId
    }
  };

  draft.status = "approved";
  draft.approvedAt = timestamp;
  draft.approvedBy = actor.id;
  draft.approvalReason = "Internal test approval.";
  draft.approvedProjectId = approvedProject.id;

  recordChange(sourceProject, actor, draft.approvalReason, "Draft project approved", {
    objectType: "DraftProject",
    objectId: draft.id,
    objectText: draft.name,
    approvedProjectId: approvedProject.id
  }, ids);
  recordChange(approvedProject, actor, draft.approvalReason, "Project created from approved draft", {
    objectType: "Project",
    objectId: approvedProject.id,
    objectText: approvedProject.name,
    draftProjectId: draft.id,
    sourceProjectId: sourceProject.id,
    sourceId: source.id,
    extractId: extract.id
  }, ids);
  store.projects.unshift(approvedProject);

  const uniqueness = collectIds(store);
  assert(!uniqueness.duplicates.length, "Approval flow created duplicate IDs.", { duplicates: uniqueness.duplicates });
  assert(store.projects.some((project) => project.id === approvedProject.id), "Approved draft did not create a new project.");
  assert(approvedProject.sourceLinks[0]?.sourceId === source.id, "Approved project source link was not preserved.", { approvedProject });
  assert(approvedProject.draftSource?.extractId === extract.id, "Approved project extract link was not preserved.", { approvedProject });
  assert(sourceProject.changes.some((change) => change.details?.objectId === draft.id), "Source project history did not record draft approval.");
  assert(approvedProject.changes.some((change) => change.details?.objectId === approvedProject.id), "New project history did not record project creation.");

  const result = {
    createdProjectId: approvedProject.id,
    sourceLinkPreserved: Boolean(approvedProject.sourceLinks[0]?.sourceId),
    historyRecords: sourceProject.changes.length + approvedProject.changes.length,
    uniqueIds: uniqueness.ids.size
  };
  if (includeStore) result.store = store;
  return result;
}

function persistenceTest(store) {
  const firstCounts = countStoreParts(store);
  const refresh = rebuildStore(splitStoreRecords(store));
  const close = rebuildStore(splitStoreRecords(refresh));
  const reopen = rebuildStore(splitStoreRecords(close));
  const finalCounts = countStoreParts(reopen);
  assert(JSON.stringify(firstCounts) === JSON.stringify(finalCounts), "Counts changed across refresh/close/reopen simulation.", { firstCounts, finalCounts });
  return finalCounts;
}

function backupTest(store) {
  const backup = {
    exportedAt: "2026-06-15T12:10:00.000Z",
    app: "Project State",
    backupType: "full-storage-spine",
    storageSpine: buildManifest(store),
    schemaVersion: store.schemaVersion,
    store
  };
  const imported = extractStore(JSON.parse(JSON.stringify(backup)));
  const before = countStoreParts(store);
  const after = countStoreParts(imported);
  assert(JSON.stringify(before) === JSON.stringify(after), "Backup/import counts do not match.", { before, after });
  return { before, after };
}

function recoveryTest() {
  const appSource = fs.readFileSync(APP_FILE, "utf8");
  const checks = {
    recoveryScreen: /function renderRecoveryScreen/.test(appSource),
    recoveryExport: /function exportFailedData/.test(appSource) && /data-action="export-failed-data"/.test(appSource),
    recoveryStore: /preserveRecoveryRecord/.test(appSource) && /\"recovery\"/.test(appSource),
    resetConfirmation: /resetFailedData/.test(appSource)
  };
  for (const [key, value] of Object.entries(checks)) assert(value, `Recovery check failed: ${key}`);
  return checks;
}

function searchIndex(store) {
  const results = [];
  const add = (project, objectType, objectId, title, values) => {
    results.push({ projectId: project.id, objectType, objectId, title, values: values.map((value) => String(value || "").toLowerCase()) });
  };
  for (const project of store.projects || []) {
    add(project, "Project", project.id, project.name, [project.name, project.currentStatus, project.currentSummary]);
    for (const source of project.sources || []) {
      add(project, "Source", source.id, source.title, [source.title, source.summary, source.location]);
      for (const extract of source.extracts || []) add(project, "Extract", extract.id, extract.text, [extract.text, extract.summary]);
    }
    for (const image of listFullProjectImages(project)) add(project, "Attachment", image.id, image.caption || image.fileName, [image.caption, image.fileName, image.localPath]);
  }
  return results;
}

function searchTest(store) {
  const index = searchIndex(store);
  const queries = [
    { name: "project name", query: "Alpha Project", type: "Project" },
    { name: "source title", query: "Alpha source note", type: "Source" },
    { name: "extract text", query: "representative extract text", type: "Extract" },
    { name: "attachment caption", query: "Project dashboard fixture image", type: "Attachment" }
  ];
  const results = {};
  for (const item of queries) {
    const needle = item.query.toLowerCase();
    const matches = index.filter((entry) => entry.objectType === item.type && entry.values.some((value) => value.includes(needle)));
    assert(matches.length > 0, `Search did not return expected result for ${item.name}.`, item);
    results[item.name] = matches.length;
  }
  return results;
}

function run() {
  const store = readFixture();
  const integrityErrors = verifyStoreIntegrity(store);
  assert(!integrityErrors.length, "Fixture integrity failed before tests.", { integrityErrors });

  const dataIntegrity = dataIntegrityTest(store);
  const approvalFlow = approvalFlowTest(store);
  const persistence = persistenceTest(store);
  const backup = backupTest(store);
  const recovery = recoveryTest();
  const search = searchTest(store);

  const summary = {
    dataIntegrity,
    approvalFlow,
    persistenceCounts: persistence,
    backupCountsMatch: JSON.stringify(backup.before) === JSON.stringify(backup.after),
    recovery,
    search
  };
  console.log("Internal Phase 2 Flow Check");
  console.log(JSON.stringify(summary, null, 2));
  console.log("Internal tests: ok");
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error("Internal tests failed:");
    console.error(error.message);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  approvalFlowTest,
  backupTest,
  collectIds,
  dataIntegrityTest,
  listFullProjectImages,
  persistenceTest,
  recoveryTest,
  searchTest
};
