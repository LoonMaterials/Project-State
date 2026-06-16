Project State Desktop Bridge

Project State is still a local prototype, but browser-only file and storage calls are now isolated behind a platform adapter in `app.js`.

Current adapter:

- `browser`
- Uses IndexedDB split stores when available
- Falls back to the legacy JSON record only when IndexedDB is unavailable
- Handles browser file reads and download exports

Desktop implementation files:

- `desktop/main.cjs`
- `desktop/project-state-desktop-bridge.cjs`
- `desktop/preload.cjs`
- `desktop/spine-schema.sql`

The bridge uses the local filesystem plus SQLite and is intended to be loaded by a desktop wrapper before `app.js`.
The desktop wrapper loads `index.html` directly with `BrowserWindow.loadFile`; it does not use a local server.

Future desktop adapter:

A desktop wrapper can expose `window.ProjectStateDesktop` before `app.js` loads. If present, Project State will use the bridge where methods are available and fall back to the browser adapter for anything missing.

Expected shape:

```js
window.ProjectStateDesktop = {
  label: "Project State Desktop",
  storage: {
    async loadStore(context) {},
    async saveStore(payload) {},
    async saveMeta(payload) {},
    async preserveLegacyRaw(raw) {},
    async preserveRecoveryRecord(issue) {},
    async reset() {}
  },
  files: {
    metadata(file) {},
    localPath(file) {},
    async readAsDataUrl(file) {},
    async readAsText(file) {},
    async readAsArrayBuffer(file) {},
    async extractText(file) {},
    async inflateRaw(bytes) {}
  },
  downloads: {
    saveTextFile({ fileName, text, type }) {}
  }
};
```

Desktop storage should eventually use a purpose-built local spine, likely:

- SQLite or equivalent for project metadata, history, relationships, actors, and review state
- Managed local folders for original source files, images, long extracts, and backups
- Checksums or manifests for file integrity
- Recovery records that preserve failed loads or failed migrations

The current desktop storage spine contract is documented in `DESKTOP_STORAGE_SPINE.md` and `fixtures/desktop-spine-v0.1-contract.json`.

The bridge currently uses Node's built-in SQLite support. If the final packaging runtime changes SQLite support, the bridge should keep the same `window.ProjectStateDesktop` API and swap only the implementation underneath.

Core rule:

External files, AI, chats, notes, and other arms should still land in the Intake Airlock first. The desktop bridge provides storage and file access only. It must not bypass human approval into Project State.
