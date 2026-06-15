const fs = require("fs");
const path = require("path");

const {
  countStoreParts,
  extractStore,
  listProjectImages,
  verifyStoreIntegrity
} = require("./storage-phase0-baseline-check");

const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");
const STORAGE_SPINE_VERSION = "0.2.0-phase2";
const STORAGE_LAYOUT_VERSION = "split-stores-v1";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function clone(record) {
  return JSON.parse(JSON.stringify(record || {}));
}

function withoutImageLinks(record) {
  const copy = clone(record);
  delete copy.imageLinks;
  return copy;
}

function withSortIndex(record, index) {
  return { ...record, _sortIndex: index };
}

function clean(record) {
  const copy = clone(record);
  delete copy._sortIndex;
  return copy;
}

function sorted(records) {
  return [...records].sort((a, b) => (a._sortIndex ?? 0) - (b._sortIndex ?? 0)).map(clean);
}

function buildManifest(store) {
  const counts = countStoreParts(store);
  const snapshot = JSON.stringify(store);
  return {
    spineVersion: STORAGE_SPINE_VERSION,
    layoutVersion: STORAGE_LAYOUT_VERSION,
    snapshotBytes: Buffer.byteLength(snapshot, "utf8"),
    counts,
    splitTargets: {
      meta: 1,
      projects: counts.projects,
      history: counts.changes,
      sources: counts.sources,
      extracts: counts.extracts,
      attachments: counts.attachments,
      drafts: counts.drafts,
      recovery: 0
    }
  };
}

function splitStoreRecords(store) {
  const manifest = buildManifest(store);
  const split = {
    meta: [{
      id: "store",
      ...manifest,
      schemaVersion: store.schemaVersion,
      settings: clone(store.settings),
      actors: clone(store.actors || []),
      intakeItems: clone(store.intakeItems || [])
    }],
    projects: [],
    history: [],
    sources: [],
    extracts: [],
    attachments: [],
    drafts: [],
    recovery: []
  };

  const addAttachments = (project, ownerType, ownerId, links = []) => {
    for (const image of links || []) {
      split.attachments.push(withSortIndex({
        ...clone(image),
        projectId: image.projectId || project.id,
        attachedToType: image.attachedToType || ownerType,
        attachedToId: image.attachedToId || ownerId
      }, split.attachments.length));
    }
  };

  (store.projects || []).forEach((project, projectIndex) => {
    const projectRecord = withoutImageLinks(project);
    projectRecord.decisions = (project.decisions || []).map(withoutImageLinks);
    projectRecord.facts = (project.facts || []).map(withoutImageLinks);
    projectRecord.relationships = (project.relationships || []).map(withoutImageLinks);
    projectRecord.openQuestions = (project.openQuestions || []).map(withoutImageLinks);
    projectRecord.nextActions = (project.nextActions || []).map(withoutImageLinks);
    delete projectRecord.sources;
    delete projectRecord.changes;
    delete projectRecord.draftProjects;
    split.projects.push(withSortIndex(projectRecord, projectIndex));
    addAttachments(project, "Project", project.id, project.imageLinks);

    (project.changes || []).forEach((change, index) => {
      split.history.push(withSortIndex({ ...withoutImageLinks(change), projectId: change.projectId || project.id }, index));
      addAttachments(project, "Change", change.id, change.imageLinks);
    });

    (project.sources || []).forEach((source, sourceIndex) => {
      const sourceRecord = withoutImageLinks(source);
      sourceRecord.projectId = sourceRecord.projectId || project.id;
      delete sourceRecord.extracts;
      split.sources.push(withSortIndex(sourceRecord, sourceIndex));
      addAttachments(project, "Source", source.id, source.imageLinks);
      (source.extracts || []).forEach((extract, extractIndex) => {
        split.extracts.push(withSortIndex({
          ...withoutImageLinks(extract),
          projectId: extract.projectId || project.id,
          sourceId: extract.sourceId || source.id
        }, extractIndex));
        addAttachments(project, "Extract", extract.id, extract.imageLinks);
      });
    });

    (project.draftProjects || []).forEach((draft, index) => {
      split.drafts.push(withSortIndex({ ...withoutImageLinks(draft), projectId: draft.projectId || project.id }, index));
      addAttachments(project, "DraftProject", draft.id, draft.imageLinks);
    });

    for (const [type, objects] of [
      ["Decision", project.decisions || []],
      ["Fact", project.facts || []],
      ["Relationship", project.relationships || []],
      ["OpenQuestion", project.openQuestions || []],
      ["NextAction", project.nextActions || []]
    ]) {
      for (const object of objects) addAttachments(project, type, object.id, object.imageLinks);
    }
  });

  return split;
}

function findTarget(project, type, id) {
  if (type === "Project" && project.id === id) return project;
  const lists = {
    Decision: project.decisions || [],
    Fact: project.facts || [],
    Relationship: project.relationships || [],
    OpenQuestion: project.openQuestions || [],
    NextAction: project.nextActions || [],
    DraftProject: project.draftProjects || [],
    Change: project.changes || []
  };
  if (lists[type]) return lists[type].find((item) => item.id === id) || null;
  if (type === "Source") return (project.sources || []).find((source) => source.id === id) || null;
  if (type === "Extract") {
    for (const source of project.sources || []) {
      const extract = (source.extracts || []).find((item) => item.id === id);
      if (extract) return extract;
    }
  }
  return null;
}

function rebuildStore(split) {
  const meta = split.meta[0];
  const store = {
    schemaVersion: meta.schemaVersion || "0.1.0",
    settings: meta.settings || {},
    actors: meta.actors || [],
    intakeItems: meta.intakeItems || [],
    projects: sorted(split.projects)
  };
  for (const project of store.projects) {
    project.sources = [];
    project.changes = [];
    project.draftProjects = [];
    project.imageLinks = [];
  }
  const projectById = new Map(store.projects.map((project) => [project.id, project]));

  for (const source of sorted(split.sources)) {
    const project = projectById.get(source.projectId);
    if (!project) continue;
    source.extracts = [];
    source.imageLinks = [];
    project.sources.push(source);
  }
  const sourceById = new Map();
  for (const project of store.projects) for (const source of project.sources) sourceById.set(source.id, source);

  for (const extract of sorted(split.extracts)) {
    const source = sourceById.get(extract.sourceId);
    if (!source) continue;
    extract.imageLinks = [];
    source.extracts.push(extract);
  }
  for (const change of sorted(split.history)) {
    const project = projectById.get(change.projectId);
    if (!project) continue;
    change.imageLinks = [];
    project.changes.push(change);
  }
  for (const draft of sorted(split.drafts)) {
    const project = projectById.get(draft.projectId);
    if (!project) continue;
    draft.imageLinks = [];
    project.draftProjects.push(draft);
  }
  for (const attachment of sorted(split.attachments)) {
    const project = projectById.get(attachment.projectId);
    if (!project) continue;
    const target = findTarget(project, attachment.attachedToType, attachment.attachedToId);
    if (!target) continue;
    if (!Array.isArray(target.imageLinks)) target.imageLinks = [];
    target.imageLinks.push(attachment);
  }
  return store;
}

function compareCounts(before, after) {
  const errors = [];
  const beforeCounts = countStoreParts(before);
  const afterCounts = countStoreParts(after);
  for (const [key, value] of Object.entries(beforeCounts)) {
    if (afterCounts[key] !== value) errors.push(`${key} changed from ${value} to ${afterCounts[key]}`);
  }
  return { beforeCounts, afterCounts, errors };
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FIXTURE;
  const payload = readJson(filePath);
  const store = extractStore(payload);
  const split = splitStoreRecords(store);
  const rebuilt = rebuildStore(split);
  const comparison = compareCounts(store, rebuilt);
  const errors = [
    ...verifyStoreIntegrity(store),
    ...verifyStoreIntegrity(rebuilt),
    ...comparison.errors
  ];

  console.log("Storage Spine Phase 2 Split");
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
    beforeCounts: comparison.beforeCounts,
    afterCounts: comparison.afterCounts
  }, null, 2));

  if (errors.length) {
    console.error("Phase 2 errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Phase 2 split/rebuild: ok");
}

if (require.main === module) main();

module.exports = {
  buildManifest,
  rebuildStore,
  splitStoreRecords
};
