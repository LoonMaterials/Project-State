const { parentPort, workerData } = require("node:worker_threads");
const { createProjectStateDesktopBridge } = require("./project-state-desktop-bridge.cjs");

async function main() {
  const bridge = createProjectStateDesktopBridge({ storageRoot: workerData.storageRoot, label: "Project State Review Export Worker" });
  const payload = {
    ...(workerData.payload || {}),
    onProgress(progress = {}) {
      parentPort.postMessage({ type: "progress", requestId: workerData.requestId, progress });
    }
  };
  const operation = workerData.operation === "project_final" ? "exportProjectFinalReviewPack" : "exportUniversalPack";
  const result = await bridge.reviewExchange[operation](payload);
  parentPort.postMessage({ type: "result", requestId: workerData.requestId, result });
}

main().catch((error) => {
  parentPort.postMessage({ type: "error", requestId: workerData.requestId, error: { message: error?.message || String(error), stack: error?.stack || "" } });
});
