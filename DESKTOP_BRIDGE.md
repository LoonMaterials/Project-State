Project State Desktop Bridge

Project State is now app-first. The desktop bridge is required for real Project State mode, and browser-only file and storage calls are isolated behind a platform adapter in `app.js`.

Legacy/dev browser adapter:

- `browser`
- Uses IndexedDB split stores when available
- Falls back to the legacy JSON record only when IndexedDB is unavailable
- Handles legacy/dev file reads and download exports only

Desktop implementation files:

- `desktop/main.cjs`
- `desktop/project-state-desktop-bridge.cjs`
- `desktop/preload.cjs`
- `desktop/spine-schema.sql`

The bridge uses the local filesystem plus SQLite and is intended to be loaded by a desktop wrapper before `app.js`.
The desktop wrapper loads `index.html` directly with `BrowserWindow.loadFile`; it does not use a local server.

Desktop app runtime:

A desktop wrapper exposes `window.ProjectStateDesktop` before `app.js` loads. When the bridge is present, Project State uses the desktop storage spine as the full app runtime.

Browser mode is now a development and legacy migration harness. It remains useful for export, inspection, and migration testing, but it is not the primary runtime for new storage, backup, restore, intake, file-reading, or API work. It must not be expanded into a second production runtime.

App-first rule:

New storage, backup, restore, intake, file-reading, and API work must target the desktop bridge. Browser mode may support legacy import/export, diagnostics, and development checks, but it should not receive new authoritative Project State features.

API arm rule:

API arms plug into the desktop app's Intake Airlock. They may create intake batches, source records, extracts, proposed projects, and proposal items for human review. They must never write directly to Core Project State records or bypass the storage spine through a separate browser path.

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
    async verifyIntegrity(options) {},
    async importBrowserExport(payload) {},
    async createBackupPackage({ actorId, actorName, timestamp, reason }) {},
    async restoreBackupPackage({ packagePath, actorId, actorName, timestamp, reason }) {},
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
- Integrity checks that compare SQLite rows, manifests, managed extract files, and managed attachment files before storage is trusted
- A controlled browser JSON migration path that preserves the raw export, validates stable IDs and links, stages the import, verifies integrity, and only then writes to the desktop spine
- A desktop backup package operation that requires actor, timestamp, and reason, then writes a DB snapshot, managed files, and a manifest with checksums
- A restore package operation that requires actor, timestamp, and reason, validates the package first, preserves the current spine to recovery, and then restores

The current desktop storage spine contract is documented in `DESKTOP_STORAGE_SPINE.md` and `fixtures/desktop-spine-v0.1-contract.json`.

Desktop Backup Package v0.1:

- Folder name: `backups/project-state-backup-package-<timestamp>-<id>/`
- Required audit fields: `createdBy`, `createdAt`, and `reason`
- Database snapshot: `project-state.db`
- Managed files: `managed/sources/`, `managed/extracts/`, `managed/attachments/`, `managed/manifests/`, and `managed/recovery/`
- Manifest: `manifest.json` with package identity, audit fields, database checksum, managed file checksums, and the source integrity report

Desktop Restore Package v0.1:

- Required audit fields: restore actor, restore timestamp, and restore reason
- Validation happens before any live overwrite: manifest shape, DB checksum, managed file checksums, folder layout, and required SQLite tables
- Current live spine is preserved under `recovery/restore_recovery_*/` before restore
- Restore replaces the live DB and managed folders only after validation and preservation complete

The bridge currently uses Node's built-in SQLite support. If the final packaging runtime changes SQLite support, the bridge should keep the same `window.ProjectStateDesktop` API and swap only the implementation underneath.

Core rule:

External files, APIs, AI, chats, notes, and other arms should still land in the Intake Airlock first. The desktop bridge provides storage and file access only. It must not bypass human approval into Project State.

Runtime rule:

Full Project State mode requires the desktop bridge and desktop storage spine. If `window.ProjectStateDesktop` is missing, the app should show browser/dev mode and avoid treating browser storage as the authoritative spine.

Startup gate:

- If the desktop bridge exists, Project State opens in normal app mode.
- If the desktop bridge is missing, Project State opens a Browser/dev mode gate.
- Browser/dev mode may inspect loaded local data and export raw data for migration.
- Browser/dev mode must not silently save, migrate, back up, restore, intake, read files as authoritative sources, or edit Project State records.
