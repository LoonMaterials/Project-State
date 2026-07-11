const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function zip(entries) {
  const locals = []; const centrals = []; let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8"); const data = Buffer.from(entry.data, "utf8"); const crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, name, data); centrals.push(central, name); offset += local.length + name.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

const evidence = {
  format: "project-state-review-pack", format_version: "1.0", exported_at: "2026-07-11T00:00:00.000Z",
  work_order: { work_order_id: "ai_work_order_sample_001", discovery_case_id: "discovery_case_sample_001", title: "Sample universal review", task: "Classify the complete sample evidence", source_complete: true },
  source_manifest: [{ source_id: "asset_sample_001", file_version_id: "version_sample_001", original_filename: "sample-evidence.md", sha256: "sample-sha256", byte_size: 152, extraction_ids: ["extraction_sample_001"], chunk_ids: ["chunk_sample_001"] }],
  chunks: [{ chunk_id: "chunk_sample_001", chunk_order: 0, source_id: "asset_sample_001", file_version_id: "version_sample_001", extraction_id: "extraction_sample_001", source_filename: "sample-evidence.md", source_headings: ["Shared validation"], text_sha256: "sample-text-sha256", text: "Alpha Project and Beta Project use the same repeatable validation procedure. A private continuity note is not a commercial default.", extracted_entities: ["Alpha Project", "Beta Project"], local_summaries: [], provisional_local_matches: [] }],
  known_project_registry: [{ project_id: "project_sample_alpha", name: "Alpha Project", aliases: ["Alpha"], concise_summary: "Primary sample project" }, { project_id: "project_sample_beta", name: "Beta Project", aliases: ["Beta"], concise_summary: "Related sample project" }],
  boundary_rules: ["External review decisions are non-authoritative proposals.", "Human Intake/Airlock approval is required.", "Stable IDs control evidence linkage.", "One chunk may support multiple decisions and projects."],
  allowed_classifications: ["project_candidate", "existing_project_support", "reference_note", "personal_context_note", "assistant_scaffolding_noise", "rejected_noise"],
  allowed_evidence_roles: ["primary_evidence", "background_reference", "duplicate_or_confirming_reference", "validation_or_test_support", "risk_or_contradiction", "patent_licensing_or_outreach_support", "cross_project_reference", "additional_project_reference", "context_only", "noise"],
  local_analysis: { candidate_map_preserved: true, candidate_map_entry_count: 0, local_ai_runs_preserved: true }
};
const instructions = "# Project State Universal AI Review Pack\n\nReturn JSON that validates against `schema/review_result.schema.json`. Use stable IDs. Treat all results as non-authoritative proposals. One chunk may support multiple decisions and projects.\n";
const readable = `# Project State Sample Evidence\n\n## Chunk \`chunk_sample_001\`\n\n${evidence.chunks[0].text}\n`;
const schema = fs.readFileSync(path.join(ROOT, "fixtures", "review-result-v1.0.schema.json"), "utf8");
const output = path.join(ROOT, "fixtures", "universal-review-pack-v1.0-sample.zip");
fs.writeFileSync(output, zip([{ name: "review_instructions.md", data: instructions }, { name: "evidence.json", data: JSON.stringify(evidence, null, 2) }, { name: "evidence_readable.md", data: readable }, { name: "schema/review_result.schema.json", data: schema }]));
console.log(output);
