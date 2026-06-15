const fs = require("fs");
const path = require("path");

const {
  countStoreParts,
  extractStore,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");
const {
  rebuildStore,
  splitStoreRecords
} = require("./storage-phase2-split-check");

const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
const STORAGE_META_MAIN_RECORD = "store";
const STORAGE_SPINE_VERSION = "0.2.0-phase3";
const STORAGE_LAYOUT_VERSION = "split-stores-v1-audited";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function phase3SplitStoreRecords(store) {
  const split = splitStoreRecords(store);
  split.meta[0] = {
    ...split.meta[0],
    spineVersion: STORAGE_SPINE_VERSION,
    layoutVersion: STORAGE_LAYOUT_VERSION,
    largeContent: {
      ...(split.meta[0].largeContent || {}),
      attachments: split.attachments.length
    }
  };
  for (const project of split.projects) {
    project.sourceIds = (store.projects.find((item) => item.id === project.id)?.sources || []).map((source) => source.id);
    project.historyIds = (store.projects.find((item) => item.id === project.id)?.changes || []).map((change) => change.id);
    project.draftProjectIds = (store.projects.find((item) => item.id === project.id)?.draftProjects || []).map((draft) => draft.id);
    project.attachmentIds = (store.projects.find((item) => item.id === project.id)?.imageLinks || []).map((image) => image.id);
  }
  for (const source of split.sources) {
    const project = store.projects.find((item) => item.id === source.projectId);
    const original = project?.sources?.find((item) => item.id === source.id);
    source.extractIds = (original?.extracts || []).map((extract) => extract.id);
    source.attachmentIds = (original?.imageLinks || []).map((image) => image.id);
  }
  for (const extract of split.extracts) {
    const project = store.projects.find((item) => item.id === extract.projectId);
    const originalSource = project?.sources?.find((source) => source.id === extract.sourceId);
    const original = originalSource?.extracts?.find((item) => item.id === extract.id);
    extract.attachmentIds = (original?.imageLinks || []).map((image) => image.id);
  }
  for (const draft of split.drafts) {
    const project = store.projects.find((item) => item.id === draft.projectId);
    const original = project?.draftProjects?.find((item) => item.id === draft.id);
    draft.attachmentIds = (original?.imageLinks || []).map((image) => image.id);
  }
  return split;
}

function auditSplitStoreRecords(split = {}) {
  const errors = [];
  const meta = (split.meta || []).find((record) => record.id === STORAGE_META_MAIN_RECORD);
  if (!meta) errors.push("meta store missing main store manifest");
  if (meta?.spineVersion !== STORAGE_SPINE_VERSION) errors.push("meta spine version mismatch");
  if (meta?.layoutVersion !== STORAGE_LAYOUT_VERSION) errors.push("meta layout version mismatch");

  const projectRecords = split.projects || [];
  const sourceRecords = split.sources || [];
  const extractRecords = split.extracts || [];
  const historyRecords = split.history || [];
  const draftRecords = split.drafts || [];
  const attachmentRecords = split.attachments || [];

  const ids = new Set();
  const addId = (id, label) => {
    if (!id) errors.push(`${label} missing id`);
    else if (ids.has(id)) errors.push(`duplicate id ${id}`);
    else ids.add(id);
  };
  for (const project of projectRecords) addId(project.id, "project");
  for (const source of sourceRecords) addId(source.id, "source");
  for (const extract of extractRecords) addId(extract.id, "extract");
  for (const change of historyRecords) addId(change.id, "history");
  for (const draft of draftRecords) addId(draft.id, "draft");
  for (const attachment of attachmentRecords) addId(attachment.id, "attachment");

  const projectsById = new Map(projectRecords.map((project) => [project.id, project]));
  const sourcesById = new Map(sourceRecords.map((source) => [source.id, source]));
  const extractsById = new Map(extractRecords.map((extract) => [extract.id, extract]));
  const projectObjectIds = new Map();
  for (const project of projectRecords) {
    const objectIds = new Set([project.id]);
    for (const decision of project.decisions || []) objectIds.add(decision.id);
    for (const fact of project.facts || []) objectIds.add(fact.id);
    for (const relationship of project.relationships || []) objectIds.add(relationship.id);
    for (const question of project.openQuestions || []) objectIds.add(question.id);
    for (const action of project.nextActions || []) objectIds.add(action.id);
    projectObjectIds.set(project.id, objectIds);
  }
  for (const change of historyRecords) projectObjectIds.get(change.projectId)?.add(change.id);
  for (const draft of draftRecords) projectObjectIds.get(draft.projectId)?.add(draft.id);

  for (const source of sourceRecords) {
    const project = projectsById.get(source.projectId);
    if (!project) errors.push(`source ${source.id} references missing project ${source.projectId}`);
    else if (!project.sourceIds?.includes(source.id)) errors.push(`source ${source.id} missing from project sourceIds`);
  }

  for (const extract of extractRecords) {
    const source = sourcesById.get(extract.sourceId);
    if (!source) errors.push(`extract ${extract.id} references missing source ${extract.sourceId}`);
    else if (!source.extractIds?.includes(extract.id)) errors.push(`extract ${extract.id} missing from source extractIds`);
    if (source && extract.projectId !== source.projectId) errors.push(`extract ${extract.id} project/source mismatch`);
    if (!projectsById.has(extract.projectId)) errors.push(`extract ${extract.id} references missing project ${extract.projectId}`);
  }

  for (const change of historyRecords) {
    const project = projectsById.get(change.projectId);
    if (!project) errors.push(`history ${change.id} references missing project ${change.projectId}`);
    else if (!project.historyIds?.includes(change.id)) errors.push(`history ${change.id} missing from project historyIds`);
    if (!change.actorId && !change.actorName) errors.push(`history ${change.id} missing actor`);
    if (!change.timestamp) errors.push(`history ${change.id} missing timestamp`);
    if (!change.reason) errors.push(`history ${change.id} missing reason`);
    if (!change.details?.objectType && !change.details?.objectId) errors.push(`history ${change.id} missing changed object detail`);
  }

  for (const draft of draftRecords) {
    const project = projectsById.get(draft.projectId);
    if (!project) errors.push(`draft ${draft.id} references missing project ${draft.projectId}`);
    else if (!project.draftProjectIds?.includes(draft.id)) errors.push(`draft ${draft.id} missing from project draftProjectIds`);
    if (draft.sourceId && !sourcesById.has(draft.sourceId)) errors.push(`draft ${draft.id} references missing source ${draft.sourceId}`);
    if (draft.extractId && !extractsById.has(draft.extractId)) errors.push(`draft ${draft.id} references missing extract ${draft.extractId}`);
  }

  for (const attachment of attachmentRecords) {
    const project = projectsById.get(attachment.projectId);
    if (!project) {
      errors.push(`attachment ${attachment.id} references missing project ${attachment.projectId}`);
      continue;
    }
    if (!attachment.attachedToType || !attachment.attachedToId) errors.push(`attachment ${attachment.id} missing target`);
    if (attachment.attachedToType === "Source" && !sourcesById.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} targets missing source`);
    else if (attachment.attachedToType === "Extract" && !extractsById.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} targets missing extract`);
    else if (attachment.attachedToType !== "Source" && attachment.attachedToType !== "Extract") {
      const objectIds = projectObjectIds.get(project.id);
      if (!objectIds?.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} targets missing project object`);
    }
  }

  if (meta?.counts) {
    if (meta.counts.projects !== projectRecords.length) errors.push("meta project count mismatch");
    if (meta.counts.sources !== sourceRecords.length) errors.push("meta source count mismatch");
    if (meta.counts.extracts !== extractRecords.length) errors.push("meta extract count mismatch");
    if (meta.counts.drafts !== draftRecords.length) errors.push("meta draft count mismatch");
    if (meta.counts.changes !== historyRecords.length) errors.push("meta history count mismatch");
    if (meta.largeContent?.attachments !== attachmentRecords.length) errors.push("meta attachment count mismatch");
  }

  return errors;
}

function compareCounts(a, b) {
  const first = countStoreParts(a);
  const second = countStoreParts(b);
  const errors = [];
  for (const [key, value] of Object.entries(first)) {
    if (second[key] !== value) errors.push(`${key} changed from ${value} to ${second[key]}`);
  }
  return { first, second, errors };
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FIXTURE;
  const payload = readJson(filePath);
  const store = extractStore(payload);
  const split = phase3SplitStoreRecords(store);
  const rebuilt = rebuildStore(split);
  const counts = compareCounts(store, rebuilt);
  const mainBackup = JSON.parse(JSON.stringify(store));
  const mainBackupCounts = compareCounts(mainBackup, rebuilt);
  const errors = [
    ...verifyStoreIntegrity(store),
    ...auditSplitStoreRecords(split),
    ...verifyStoreIntegrity(rebuilt),
    ...counts.errors,
    ...mainBackupCounts.errors.map((error) => `main backup mismatch: ${error}`)
  ];

  console.log("Storage Spine Phase 3 Audit");
  console.log(`Input: ${filePath}`);
  console.log(JSON.stringify({
    splitCounts: {
      meta: split.meta.length,
      projects: split.projects.length,
      history: split.history.length,
      sources: split.sources.length,
      extracts: split.extracts.length,
      attachments: split.attachments.length,
      drafts: split.drafts.length,
      recovery: split.recovery.length
    },
    rebuiltCounts: counts.second,
    mainBackupCounts: mainBackupCounts.first
  }, null, 2));

  if (errors.length) {
    console.error("Phase 3 audit errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Phase 3 audit: ok");
}

if (require.main === module) main();

module.exports = {
  auditSplitStoreRecords,
  phase3SplitStoreRecords
};
