const fs = require("fs");
const path = require("path");

const DEFAULT_FIXTURE = path.join(__dirname, "..", "fixtures", "storage-spine-v0.1-baseline.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function extractStore(payload) {
  if (payload && payload.app === "Project State" && payload.store) return payload.store;
  if (payload && Array.isArray(payload.projects)) return payload;
  throw new Error("Input does not contain a Project State store.");
}

function listProjectImages(project) {
  const images = [];
  const collect = (ownerType, ownerId, links = []) => {
    for (const image of links || []) {
      images.push({
        id: image.id,
        projectId: image.projectId || project.id,
        attachedToType: image.attachedToType || ownerType,
        attachedToId: image.attachedToId || ownerId,
        fileName: image.fileName || ""
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

function countStoreParts(store) {
  const counts = {
    actors: (store.actors || []).length,
    intakeItems: (store.intakeItems || []).length,
    projects: (store.projects || []).length,
    archivedProjects: 0,
    decisions: 0,
    facts: 0,
    sources: 0,
    extracts: 0,
    drafts: 0,
    relationships: 0,
    openQuestions: 0,
    nextActions: 0,
    changes: 0,
    attachments: 0,
    projectSourceLinks: 0,
    objectSourceLinks: 0
  };

  for (const project of store.projects || []) {
    if (project.archived) counts.archivedProjects += 1;
    counts.decisions += (project.decisions || []).length;
    counts.facts += (project.facts || []).length;
    counts.sources += (project.sources || []).length;
    counts.extracts += (project.sources || []).reduce((total, source) => total + (source.extracts || []).length, 0);
    counts.drafts += (project.draftProjects || []).length;
    counts.relationships += (project.relationships || []).length;
    counts.openQuestions += (project.openQuestions || []).length;
    counts.nextActions += (project.nextActions || []).length;
    counts.changes += (project.changes || []).length;
    counts.attachments += listProjectImages(project).length;
    counts.projectSourceLinks += (project.sourceLinks || []).length;

    const objectLists = [
      project.decisions,
      project.facts,
      project.relationships,
      project.openQuestions,
      project.nextActions,
      project.draftProjects,
      project.changes
    ];
    for (const list of objectLists) {
      for (const object of list || []) counts.objectSourceLinks += (object.sourceLinks || []).length;
    }
    for (const source of project.sources || []) {
      counts.objectSourceLinks += (source.sourceLinks || []).length;
      for (const extract of source.extracts || []) counts.objectSourceLinks += (extract.sourceLinks || []).length;
    }
  }

  return counts;
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
    for (const image of listProjectImages(project)) add(image.id, "attachment");
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
  }
  return { ids, duplicates };
}

function verifyStoreIntegrity(store) {
  const errors = [];
  const projectIds = new Set((store.projects || []).map((project) => project.id));
  const actorIds = new Set((store.actors || []).map((actor) => actor.id));
  const sourceIds = new Set();
  const extractIds = new Set();
  const { duplicates } = collectIds(store);

  for (const duplicate of duplicates) errors.push(`Duplicate id: ${duplicate}`);

  for (const project of store.projects || []) {
    if (!project.id) errors.push("Project missing id.");
    if (!project.name) errors.push(`Project ${project.id || "(missing id)"} missing name.`);
    if (project.updatedBy && !actorIds.has(project.updatedBy)) errors.push(`Project ${project.id} updatedBy missing actor ${project.updatedBy}.`);
    for (const source of project.sources || []) {
      sourceIds.add(source.id);
      if (source.projectId !== project.id) errors.push(`Source ${source.id} projectId mismatch.`);
      for (const extract of source.extracts || []) {
        extractIds.add(extract.id);
        if (extract.projectId !== project.id) errors.push(`Extract ${extract.id} projectId mismatch.`);
        if (extract.sourceId !== source.id) errors.push(`Extract ${extract.id} sourceId mismatch.`);
      }
    }
    for (const draft of project.draftProjects || []) {
      if (draft.projectId !== project.id) errors.push(`Draft ${draft.id} projectId mismatch.`);
      if (draft.sourceId && !sourceIds.has(draft.sourceId)) errors.push(`Draft ${draft.id} missing source ${draft.sourceId}.`);
      if (draft.extractId && !extractIds.has(draft.extractId)) errors.push(`Draft ${draft.id} missing extract ${draft.extractId}.`);
    }
    for (const relationship of project.relationships || []) {
      if (relationship.projectId !== project.id) errors.push(`Relationship ${relationship.id} projectId mismatch.`);
      if (relationship.targetProjectId && !projectIds.has(relationship.targetProjectId)) errors.push(`Relationship ${relationship.id} missing target project ${relationship.targetProjectId}.`);
    }
    for (const change of project.changes || []) {
      if (change.projectId !== project.id) errors.push(`Change ${change.id} projectId mismatch.`);
      if (!change.actorId && !change.actorName) errors.push(`Change ${change.id} missing actor.`);
      if (!change.timestamp) errors.push(`Change ${change.id} missing timestamp.`);
      if (!change.reason) errors.push(`Change ${change.id} missing reason.`);
      if (!change.details?.objectType && !change.details?.objectId) errors.push(`Change ${change.id} missing changed object detail.`);
      if (!change.howChanged && !change.details?.origin) errors.push(`Change ${change.id} missing howChanged/origin.`);
      if (!change.language && !change.details?.language) errors.push(`Change ${change.id} missing language.`);
    }
    for (const image of listProjectImages(project)) {
      if (!image.id) errors.push(`Attachment on ${image.attachedToType}:${image.attachedToId} missing id.`);
      if (image.projectId !== project.id) errors.push(`Attachment ${image.id} projectId mismatch.`);
      if (!image.attachedToType || !image.attachedToId) errors.push(`Attachment ${image.id} missing attachment target.`);
    }
  }

  return errors;
}

function main() {
  const filePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_FIXTURE;
  const payload = readJson(filePath);
  const store = extractStore(payload);
  const counts = countStoreParts(store);
  const errors = verifyStoreIntegrity(store);

  console.log("Storage Spine Phase 0 Baseline");
  console.log(`Input: ${filePath}`);
  console.log(JSON.stringify(counts, null, 2));

  if (errors.length) {
    console.error("Integrity errors:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Integrity: ok");
}

if (require.main === module) main();

module.exports = {
  countStoreParts,
  extractStore,
  listProjectImages,
  verifyStoreIntegrity
};
