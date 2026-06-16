const path = require("node:path");
const { contextBridge } = require("electron");
const { createProjectStateDesktopBridge } = require("./project-state-desktop-bridge.cjs");

const storageRoot = process.env.PROJECT_STATE_STORAGE_ROOT || path.join(process.env.USERPROFILE || process.env.HOME || "", "Project State Storage");

contextBridge.exposeInMainWorld(
  "ProjectStateDesktop",
  createProjectStateDesktopBridge({
    storageRoot,
    label: "Project State Desktop"
  })
);
