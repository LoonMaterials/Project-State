const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

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
  package_id: "review_package_sample_001", work_order_id: "ai_work_order_sample_001", discovery_case_id: "discovery_case_sample_001", pack_revision: 1,
  created_at: "2026-07-11T00:00:00.000Z", project_state_version: "0.2.1", format: "project-state-review-pack", format_version: "1.0",
  review_protocol: { id: "project-state-model-neutral-consolidated-review", version: "1.1", model_neutral: true, human_authoritative: true, complete_package_required: true, decision_source: "concept_clusters", coverage_required: true, preserve_original_chunk_ids_and_provenance: true, duplicate_repetition_increases_confidence: false, approval_requires_zero_unaccounted_chunks: true, final_self_check_required: true }, review_protocol_version: "1.1", evidence_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  source_complete: true, source_counts: { total: 1, complete: 1, truncated: 0 }, chunk_counts: { exported: 1, detected: 1, omitted: 0, truncated_sources: 0 },
  source_manifest: [{ source_id: "asset_sample_001", file_version_id: "version_sample_001", original_filename: "sample-evidence.md", sha256: "sample-sha256", byte_size: 152, extraction_ids: ["extraction_sample_001"], extraction_statuses: ["complete"], chunk_ids: ["chunk_sample_001"], complete: true, truncated: false }],
  chunks: [{ chunk_id: "chunk_sample_001", sequence: 0, source_id: "asset_sample_001", file_version_id: "version_sample_001", provenance: { extraction_id: "extraction_sample_001", source_filename: "sample-evidence.md", headings: ["Shared validation"] }, text_sha256: "sample-text-sha256", complete_text: "Alpha Project and Beta Project use the same repeatable validation procedure. A private continuity note is not a commercial default.", provisional_concept_profile: { primary_concept: "Shared validation", secondary_concepts: [], estimated_concept_count: 1, likely_hierarchy_level: "research_theme", likely_maturity: "unresolved", likely_relationships: [], profile_confidence: 0.55, generated_by: "rule_based", reviewer_may_override: true, synthesis_reasoning_summary: "Synthesized one shared validation concept; repeated mentions and applications were not counted independently." }, provisional_local_summaries: [], provisional_entities: [{ value: "Alpha Project", provisional: true }, { value: "Beta Project", provisional: true }], provisional_project_matches: [], review_directive: { action: "cluster_before_decision", review_in_isolation: false, compare_against_all_chunks: true, cluster_before_decision: true, may_be_duplicate: true, may_support_multiple_concepts: true, must_receive_final_disposition: true, read_with_complete_package: true, collapse_exact_and_near_duplicates: true, merge_aliases_and_alternate_names: true, preserve_genuine_contradictions: true, assign_hierarchy_and_maturity: true, preserve_chunk_id_and_provenance: true, duplicate_repetition_increases_confidence: false } }],
  project_registry: [{ project_id: "project_sample_alpha", canonical_name: "Alpha Project", aliases: ["Alpha"], former_names: [], short_summary: "Primary sample project", status: "active", parent_project_id: null }, { project_id: "project_sample_beta", canonical_name: "Beta Project", aliases: ["Beta"], former_names: [], short_summary: "Related sample project", status: "active", parent_project_id: null }],
  boundary_rules: ["External review decisions are non-authoritative proposals.", "Human Intake/Airlock approval is required.", "Stable IDs control evidence linkage.", "One chunk may support multiple decisions and projects."],
  allowed_classifications: ["project_candidate", "existing_project_support", "reference_note", "personal_context_note", "assistant_scaffolding_noise", "rejected_noise"],
  allowed_evidence_roles: ["primary_evidence", "background_reference", "duplicate_or_confirming_reference", "validation_or_test_support", "risk_or_contradiction", "patent_licensing_or_outreach_support", "cross_project_reference", "additional_project_reference", "context_only", "noise"],
  local_analysis: { candidate_map_preserved: true, candidate_map_entry_count: 0, local_ai_runs_preserved: true }
};
delete evidence.evidence_sha256;
evidence.evidence_sha256 = crypto.createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
const instructions = "# Project State Universal AI Review Pack\n\nRead the complete package. The provisional concept profile is a synthesized starting hypothesis and raw extraction arrays are supporting signals only. Reviewers may override every profile field. Compare all chunks and collapse duplicates before concept counts. Build concept_clusters first, account for every chunk, and generate final decisions from package-wide concept reconstruction rather than the profile alone. Duplicate repetition must not increase confidence. Use stable IDs and preserve provenance. Treat all results as non-authoritative proposals.\n";
const readable = `# Project State Sample Evidence\n\n## Mandatory Consolidation Protocol\n\n- Read all chunks, cluster first, account for coverage, then produce cluster-linked decisions.\n\n## Current Project Registry\n\n- \`project_sample_alpha\` — **Alpha Project**\n- \`project_sample_beta\` — **Beta Project**\n\n## Chunk \`chunk_sample_001\`\n\n**Provisional concept profile**\n- Primary concept: Shared validation\n- Secondary concepts: none identified\n- Estimated distinct concepts: 1\n- Likely hierarchy: research_theme\n- Likely maturity: unresolved\n- Likely relationships: none identified\n- Confidence: 55%\n- Generated by: rule_based\n- Reviewer may override: yes\n- Synthesis reasoning: Synthesized one shared validation concept.\n\n**Raw provisional extraction signals**\n- Provisional local summaries: none\n- Provisional entities: Alpha Project | Beta Project\n- Provisional project matches: none\n\nReview directive: cluster_before_decision\n\n${evidence.chunks[0].complete_text}\n`;
const schema = fs.readFileSync(path.join(ROOT, "fixtures", "review-result-v1.0.schema.json"), "utf8");
const output = path.join(ROOT, "fixtures", "universal-review-pack-v1.0-sample.zip");
fs.writeFileSync(output, zip([{ name: "review_instructions.md", data: instructions }, { name: "evidence.json", data: JSON.stringify(evidence, null, 2) }, { name: "evidence_readable.md", data: readable }, { name: "schema/review_result.schema.json", data: schema }]));
const reviewedResultPath = path.join(ROOT, "fixtures", "review-result-v1.0-valid-sample.json");
const reviewedResult = JSON.parse(fs.readFileSync(reviewedResultPath, "utf8"));
reviewedResult.package_id = evidence.package_id;
reviewedResult.work_order_id = evidence.work_order_id;
reviewedResult.discovery_case_id = evidence.discovery_case_id;
reviewedResult.pack_revision = evidence.pack_revision;
reviewedResult.evidence_sha256 = evidence.evidence_sha256;
reviewedResult.concept_clusters = [{ cluster_id: "cluster_sample_001", concept_title: "Shared validation support", summary: "The package contains shared validation evidence.", aliases: ["Shared validation"], hierarchy_type: "theme", parent_cluster_id: null, maturity: "active", primary_chunk_ids: ["chunk_sample_001"], duplicate_chunk_ids: [], contextual_chunk_ids: [], contradictory_chunk_ids: [], unresolved_chunk_ids: [], confidence: 0.86, confidence_basis: "Based on one substantive primary chunk; duplicate repetition did not increase confidence." }];
reviewedResult.coverage_summary = { exported_chunk_count: 1, accounted_chunk_count: 1, complete_package_read: true, decisions_generated_from_clusters: true, duplicate_repetition_increased_confidence: false, duplicate_groups: [], contradiction_chunk_ids: [], rejected_chunk_ids: [], unresolved_chunk_ids: [], unaccounted_chunks: [] };
reviewedResult.final_self_check = { concepts_reconstructed: true, duplicates_did_not_inflate_confidence: true, all_chunks_accounted_for: true, hierarchy_distinguished: true, contradictions_preserved: true, recommendations_explained: true, decisions_generated_from_clusters: true };
reviewedResult.decisions[0].cluster_id = "cluster_sample_001";
reviewedResult.decisions[0].evidence_spans[0] = { chunk_id: "chunk_sample_001", start: 0, end: 42, excerpt: evidence.chunks[0].complete_text.slice(0, 42) };
fs.writeFileSync(reviewedResultPath, `${JSON.stringify(reviewedResult, null, 2)}\n`, "utf8");
console.log(output);
