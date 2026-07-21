const path = require("node:path");
const { contextBridge, ipcRenderer } = require("electron");
const { createProjectStateDesktopBridge } = require("./project-state-desktop-bridge.cjs");

const storageRoot = process.env.PROJECT_STATE_STORAGE_ROOT || path.join(process.env.USERPROFILE || process.env.HOME || "", "Project State Storage");

const desktopBridge = createProjectStateDesktopBridge({
  storageRoot,
  label: "Project State Desktop"
});

desktopBridge.armTransport = {
  status: () => ipcRenderer.invoke("api-arm-transport:status"),
  enable: (payload) => ipcRenderer.invoke("api-arm-transport:enable", payload),
  disable: (payload) => ipcRenderer.invoke("api-arm-transport:disable", payload),
  rotateToken: (payload) => ipcRenderer.invoke("api-arm-transport:rotate-token", payload),
  revoke: (payload) => ipcRenderer.invoke("api-arm-transport:revoke", payload)
};

desktopBridge.reviewExchange.exportUniversalPack = (payload = {}) => ipcRenderer.invoke("review-exchange:export-pack", { requestId: payload.requestId, operation: "universal", payload });
desktopBridge.reviewExchange.exportProjectFinalReviewPack = (payload = {}) => ipcRenderer.invoke("review-exchange:export-pack", { requestId: payload.requestId, operation: "project_final", payload });
desktopBridge.reviewExchange.onExportProgress = (callback) => {
  const listener = (_event, message) => callback(message);
  ipcRenderer.on("review-exchange:export-progress", listener);
  return () => ipcRenderer.removeListener("review-exchange:export-progress", listener);
};

desktopBridge.dialogs = {
  pickFile: (payload) => ipcRenderer.invoke("native-dialog:pick-file", payload),
  pickFiles: (payload) => ipcRenderer.invoke("native-dialog:pick-files", payload),
  pickFolder: (payload) => ipcRenderer.invoke("native-dialog:pick-folder", payload)
};

contextBridge.exposeInMainWorld("ProjectStateDesktop", desktopBridge);
