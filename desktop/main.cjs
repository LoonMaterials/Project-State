const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require("electron");
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
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
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

function registerNativeDialogIpc() {
  ipcMain.handle("native-dialog:pick-file", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const filters = Array.isArray(payload.filters) ? payload.filters : [];
    const options = {
      title: String(payload.title || "Choose a file"),
      properties: ["openFile"],
      filters
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    const localPath = path.resolve(result.filePaths[0]);
    return { localPath, name: path.basename(localPath) };
  });

  ipcMain.handle("native-dialog:pick-folder", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const options = {
      title: String(payload.title || "Choose a folder"),
      properties: ["openDirectory", "createDirectory"]
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return null;
    return { localPath: path.resolve(result.filePaths[0]) };
  });

  ipcMain.handle("native-dialog:pick-files", async (event, payload = {}) => {
    if (!trustedRenderer(event)) throw new Error("Untrusted renderer request.");
    const filters = Array.isArray(payload.filters) ? payload.filters : [];
    const options = {
      title: String(payload.title || "Choose files"),
      properties: ["openFile", "multiSelections"],
      filters
    };
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
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
