Project State Desktop Bridge

Project State is now app-first. The desktop bridge is required for real Project State mode. Browser-only file and storage calls are no longer valid app starts; they exist only as disabled compatibility helpers behind the platform adapter in `app.js`.

Missing-bridge adapter:

- `desktop-required`
- Does not use IndexedDB as a Project State spine
- Does not fall back to the legacy localStorage JSON record
- Does not read local files through browser file APIs
- Does not save or export through browser download APIs

Desktop implementation files:

- `desktop/main.cjs`
- `desktop/project-state-desktop-bridge.cjs`
- `desktop/preload.cjs`
- `desktop/spine-schema.sql`

The bridge uses the local filesystem plus SQLite and is intended to be loaded by a desktop wrapper before `app.js`.
The desktop wrapper loads `index.html` directly with `BrowserWindow.loadFile`; it does not use a local server.

Desktop app runtime:

A desktop wrapper exposes `window.ProjectStateDesktop` before `app.js` loads. When the bridge is present, Project State uses the desktop storage spine as the full app runtime.

Browser mode is no longer a working Project State runtime. Old browser JSON can still be imported through the desktop bridge, but Project State should not run as a browser app for storage, backup, restore, intake, file-reading, API work, or Discovery.

App-first rule:

New storage, backup, restore, intake, file-reading, and API work must target the desktop bridge. Browser mode must not receive new authoritative Project State features and must not be treated as a second production runtime.

API arm rule:

API arms plug into the desktop app's Intake Airlock. They may create intake batches, source records, extracts, proposed projects, and proposal items for human review. They must never write directly to Core Project State records or bypass the storage spine through a separate browser path.

The inbound proposal envelope, validation, idempotency, receipt, and authority boundary are defined by `API_ARM_CONTRACT.md` and `fixtures/api-arm-v0.1-contract.json`. The desktop bridge exposes the implemented logical operations under `window.ProjectStateDesktop.intakeArms`; Local Arm Transport v0.1 carries authenticated loopback requests, while provider-specific integrations remain uninstalled. Arm operations are not generic storage bridge methods.

Transport and file rules:

- `LOCAL_ARM_TRANSPORT_CONTRACT.md` governs the disabled-by-default loopback listener, encrypted token, request limits, lifecycle, and generic connector.
- `FILE_ARM_CONTRACT.md` governs checksum-verified file uploads into managed `sources/` storage and pending Source proposals.
- Integration secrets remain under machine-local `integrations/` storage and are excluded from backup packages.
- Neither transport nor file acceptance can approve Intake or write Core directly.

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
  intakeArms: {
    async describeCapabilities() {},
    async submitEnvelope(envelope) {},
    async getReceipt(submissionId) {}
  },
  discoveryStorage: {
    async initialize() {},
    async registerFileVersion(payload) {},
    async createCase(payload) {},
    async attachFileVersion(payload) {},
    async appendInteraction(payload) {},
    async appendSecurityReceipt(payload) {},
    async appendEvent(payload) {},
    async readFoundationState(payload) {},
    async stageTrustedFile(payload) {},
    async extractFileVersion(payload) {},
    async readExtractionText(payload) {},
    async readChunkText(payload) {},
    async analyzeCase(payload) {},
    async recordAnswer(payload) {},
    async confirmRouting(payload) {},
    async getCase(payload) {},
    async promoteToIntake(payload) {}
  },
  analysisArms: {
    async describeCapabilities() {},
    async createRun(payload) {},
    async authorizeTransmission(payload) {},
    async submitAnalysisBatch(envelope) {},
    async getAnalysisStatus(requestId) {},
    async getResultPage(requestId, cursor) {},
    async cancelAnalysis(requestId) {},
    async getReceipt(requestId) {},
    async recordReviewDecision(payload) {},
    async readState(payload) {}
  },
  securityArms: {
    async authorizeContentAccess(reference) {}
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
- Managed local folders for original source files, images, long extracts, quarantine, Discovery artifacts, and backups
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
- Managed files: `managed/sources/`, `managed/extracts/`, `managed/attachments/`, `managed/quarantine/`, `managed/discovery/`, `managed/manifests/`, and `managed/recovery/`
- Manifest: `manifest.json` with package identity, audit fields, database checksum, managed file checksums, and the source integrity report

Desktop Restore Package v0.1:

- Required audit fields: restore actor, restore timestamp, and restore reason
- Validation happens before any live overwrite: manifest shape, DB checksum, managed file checksums, folder layout, and required SQLite tables
- Current live spine is preserved under `recovery/restore_recovery_*/` before restore
- Restore replaces the live DB and managed folders only after validation and preservation complete

The bridge currently uses Node's built-in SQLite support. If the final packaging runtime changes SQLite support, the bridge should keep the same `window.ProjectStateDesktop` API and swap only the implementation underneath.

Discovery implementation:

The `discoveryStorage` methods stage user-trusted files as project-independent File Assets and append-only File Versions, then create Discovery Cases, deterministic extractions, chunks, Interactions, and Discovery Events. Project State does not scan files for malware and does not claim that a file is clean or safe. Staging requires the user to acknowledge that they have handled security with their own tools. File Arm/API uploads retained in managed `sources/` storage may also be linked into Discovery as exact File Versions, so Discovery can read Project State's managed copy without needing the outside original file path again. Folder connectors can preserve relative paths, group files into Discovery Cases, extract readable files, and trigger deterministic document-unit detection after the final file in a group. Every later read rechecks the managed file size and SHA-256 so changed bytes fail closed.

The `analysisArms` methods implement the provider-neutral Idea Candidate boundary. The deterministic fake local contract-test arm remains available for fallback validation. An optional Qwen3 8B local provider can run through Ollama on `127.0.0.1:11434` when installed. Both paths accept only exact human-authorized chunks, validate checksums and idempotency, create non-authoritative candidates and receipts, block machine review decisions, and record human-confirmed non-Core Idea Units. The Qwen path records `externalTransmission: false`, stores no provider credential, and cannot approve Intake or write Core.

Discovery can suggest a project name, find possible existing-project matches, ask adaptive questions, and record a human routing confirmation. Promotion creates pending Intake proposals only. A Discovery Case may exist without a project, machine actors cannot record user answers or routing confirmations, and neither Discovery nor an outside arm can approve Intake or write Core.

Core rule:

External files, APIs, AI, chats, notes, and other arms should still land in the Intake Airlock first. The desktop bridge provides storage and file access only. It must not bypass human approval into Project State.

Runtime rule:

Full Project State mode requires the desktop bridge and desktop storage spine. If `window.ProjectStateDesktop` is missing, the app should show desktop-required mode and refuse to treat browser storage as a Project State spine.

Startup gate:

- If the desktop bridge exists, Project State opens in normal app mode.
- If the desktop bridge is missing, Project State opens a desktop-required gate.
- Missing desktop bridge means desktop-required mode.
- Desktop-required mode must not save, migrate, back up, restore, intake, read files as authoritative sources, export browser state, or edit Project State records.

Web-testing isolation:

- HTTP and HTTPS runtimes always select the locked desktop-required adapter, even if a page attempts to inject `window.ProjectStateDesktop`.
- The entry document blocks outbound connections, external objects, frames, and workers with Content Security Policy.
- Browser testing exposes no API Arm transport, native filesystem dialogs, desktop storage, or provider bridge.
- The internal Electron preload bridge remains available only to the installed `file:` desktop runtime.
