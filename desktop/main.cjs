const path = require("node:path");
const crypto = require("node:crypto");
const { Worker } = require("node:worker_threads");
const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require("electron");
const { createProjectStateDesktopBridge } = require("./project-state-desktop-bridge.cjs");
const { createApiArmTransportManager } = require("./api-arm-transport-manager.cjs");
const { createApiArmFileIntake } = require("./api-arm-file-intake.cjs");

const ROOT = path.join(__dirname, "..");
const INDEX_HTML = path.join(ROOT, "index.html");
const PRELOAD = path.join(__dirname, "preload.cjs");
const STORAGE_ROOT = process.env.PROJECT_STATE_STORAGE_ROOT || path.join(process.env.USERPROFILE || process.env.HOME || "", "Project State Storage");
let mainWindow = null;
let apiArmTransportManager = null;

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) app.quit();

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Project State",
    backgroundColor: "#f7f7f4",
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow = window;

  window.loadFile(INDEX_HTML);
  // Project State is an offline desktop app. Never hand links to a browser or
  // trigger a browser/runtime installer from the packaged application.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });
  return window;
}

function trustedRenderer(event) {
  try {
    const url = new URL(event.senderFrame.url);
    return url.protocol === "file:" && path.resolve(decodeURIComponent(url.pathname).replace(/^\/(?:([A-Za-z]:))/i, "$1")) === path.resolve(INDEX_HTML);
  } catch {
    return false;
  }
}

function registerApiArmTransportIpc(manager) {
  const handle = (channel, callback) => {
    ipcMain.handle(channel, async (event, payload) => {
      if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
      return callback(payload || {});
    });
  };
  handle("api-arm-transport:status", () => manager.status());
  handle("api-arm-transport:enable", (payload) => manager.enable(payload));
  handle("api-arm-transport:disable", (payload) => manager.disable(payload));
  handle("api-arm-transport:rotate-token", (payload) => manager.rotateToken(payload));
  handle("api-arm-transport:revoke", (payload) => manager.revoke(payload));
}

async function showNativeOpenDialog(options) {
  console.log(JSON.stringify({
    event: "native-dialog-open",
    title: options.title || "",
    properties: options.properties || [],
    at: new Date().toISOString()
  }));
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  const result = await dialog.showOpenDialog(options);
  console.log(JSON.stringify({
    event: "native-dialog-result",
    title: options.title || "",
    canceled: Boolean(result.canceled),
    fileCount: Array.isArray(result.filePaths) ? result.filePaths.length : 0,
    at: new Date().toISOString()
  }));
  return result;
}

function registerReviewExportIpc() {
  ipcMain.handle("review-exchange:export-pack", async (event, request = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const requestId = String(request.requestId || crypto.randomUUID());
    const operation = request.operation === "project_final" ? "project_final" : "universal";
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, "review-pack-worker.cjs"), { workerData: { storageRoot: STORAGE_ROOT, requestId, operation, payload: request.payload || {} } });
      let settled = false;
      const finish = (callback, value) => { if (settled) return; settled = true; callback(value); worker.terminate().catch(() => {}); };
      worker.on("message", (message = {}) => {
        if (message.type === "progress") event.sender.send("review-exchange:export-progress", message);
        if (message.type === "result") finish(resolve, message.result);
        if (message.type === "error") { const error = new Error(message.error?.message || "Review ZIP export failed."); error.stack = message.error?.stack || error.stack; finish(reject, error); }
      });
      worker.on("error", (error) => finish(reject, error));
      worker.on("exit", (code) => { if (!settled) finish(reject, new Error(code === 0 ? "Review ZIP worker stopped without a result." : "Review ZIP worker stopped with code " + code + ".")); });
    });
  });
}

function registerNativeDialogIpc() {
  const defaultPathFromPayload = (payload = {}) => {
    const value = String(payload.defaultPath || "").trim();
    return value ? path.resolve(value) : undefined;
  };

  ipcMain.handle("native-dialog:pick-file", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const filters = Array.isArray(payload.filters) ? payload.filters : [];
    const options = {
      title: String(payload.title || "Choose a file"),
      properties: ["openFile"],
      filters,
      defaultPath: defaultPathFromPayload(payload)
    };
    const result = await showNativeOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    const localPath = path.resolve(result.filePaths[0]);
    return { localPath, name: path.basename(localPath) };
  });

  ipcMain.handle("native-dialog:pick-folder", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const options = {
      title: String(payload.title || "Choose a folder"),
      properties: ["openDirectory", "createDirectory"],
      defaultPath: defaultPathFromPayload(payload)
    };
    const result = await showNativeOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return { localPath: path.resolve(result.filePaths[0]) };
  });

  ipcMain.handle("native-dialog:pick-files", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const filters = Array.isArray(payload.filters) ? payload.filters : [];
    const options = {
      title: String(payload.title || "Choose files"),
      properties: ["openFile", "multiSelections"],
      filters,
      defaultPath: defaultPathFromPayload(payload)
    };
    const result = await showNativeOpenDialog(options);
    if (result.canceled) return [];
    return result.filePaths.map((filePath) => ({ localPath: path.resolve(filePath), name: path.basename(filePath) }));
  });
}

app.whenReady().then(async () => {
  const desktopBridge = createProjectStateDesktopBridge({ storageRoot: STORAGE_ROOT, label: "Project State Desktop" });
  const fileIntake = createApiArmFileIntake({ storageRoot: STORAGE_ROOT, intakeArms: desktopBridge.intakeArms, storage: desktopBridge.storage, discoveryStorage: desktopBridge.discoveryStorage });
  apiArmTransportManager = createApiArmTransportManager({ storageRoot: STORAGE_ROOT, safeStorage, intakeArms: desktopBridge.intakeArms, fileIntake });
  registerApiArmTransportIpc(apiArmTransportManager);
  registerNativeDialogIpc();
  registerReviewExportIpc();
  await apiArmTransportManager.initialize();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  apiArmTransportManager?.stopForShutdown().catch(() => {});
});

process.on("uncaughtException", (error) => {
  dialog.showErrorBox("Project State", error?.stack || error?.message || "Unknown desktop error");
});
