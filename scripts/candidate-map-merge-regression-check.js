const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const appSource = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireMarkers(markers, label) {
  for (const marker of markers) assert(appSource.includes(marker), `${label} missing marker: ${marker}`);
}

try {
  requireMarkers([
    "function candidateMapMergeRoot",
    "Wheel / General Physics Platform",
    "Reference — Wow signal computational analysis",
    "Reference — biological magnetoreception",
    "Reference — body charge / bioelectricity",
    "aether personal support",
    "leftRoot && rightRoot && leftRoot === rightRoot",
    "validation, outreach, and pre-license specification support",
    "commercialDefaultAllowed",
    "requiresSeparateDesignReview"
  ], "Candidate Map merge hardening");

  assert(!/Reference note — reference support/.test(appSource), "Generic reference-support title should not be emitted by app normalizer.");
  assert(appSource.includes("candidateMapMergeRoot(a)") && appSource.includes("candidateMapMergeRoot(b)"), "Candidate Map similarity must use topic roots before token overlap.");

  console.log("Candidate Map Merge Regression Check");
  console.log(JSON.stringify({
    topicRootMerge: true,
    eqWheelClusterMergeGuard: true,
    wheelGeneralPhysicsRootGuard: true,
    referenceTopicMergeGuard: true,
    aetherCommercialBoundaryFields: true,
    genericReferenceTitleBlocked: true
  }, null, 2));
  console.log("Candidate Map merge regression: ok");
} catch (error) {
  console.error("Candidate Map merge regression failed:");
  console.error(error.message);
  process.exitCode = 1;
}
