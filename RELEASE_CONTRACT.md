# Project State Desktop Release Contract v0.1

## Purpose

This contract defines the minimum safe Windows desktop release for Project State.

The release is local-first. Installing, upgrading, or uninstalling application files must not silently delete, replace, or relocate the user's Project State storage spine.

The machine-readable companion is `fixtures/release-v0.1-contract.json`.

## Runtime

- Electron is pinned to `42.4.1` for the v0.1 release line.
- The packaged runtime must successfully load `node:sqlite` before a release artifact is accepted.
- Context isolation remains enabled.
- Renderer Node integration remains disabled.
- The preload bridge remains the renderer-to-desktop boundary.
- The application loads its bundled `index.html`; it does not start a production web server.

Electron upgrades require the release contract, runtime smoke check, desktop bridge checks, and packaged smoke tests to pass again.

## Artifacts

The maintained Windows targets are:

- unpacked application directory for pre-installer smoke testing; and
- per-user NSIS installer for the release candidate.

The installer must not require administrator access for the normal per-user path. Public distribution should be code-signed. Local test builds may be unsigned but must be labeled as test builds rather than represented as trusted public releases.

## Included Application Files

The package includes only the application entry files, desktop runtime files, maintained contracts and documentation, contract fixtures, the two generic connector scripts with example metadata, and runtime dependencies required by the release. Other development scripts, test output, local caches, source-control metadata, and existing user data are not packaged as application content.

## User Data Boundary

The authoritative storage root remains outside the installed application directory. The current default is:

```text
%USERPROFILE%\Project State Storage
```

`PROJECT_STATE_STORAGE_ROOT` may override this location for controlled tests or deliberate deployments.

At runtime Project State must reject a storage root that resolves to the application directory or any folder inside it. This guard is required so repeated uninstall/reinstall testing cannot accidentally use removable application files as live project storage.

Installer and updater behavior must obey these rules:

- never bundle an existing `project-state.db` or a user's managed folders;
- never treat the application installation directory as primary storage;
- never erase the storage root during ordinary uninstall;
- never overwrite the storage root during upgrade;
- preserve backup and recovery packages outside application files; and
- require a separate, explicit governed workflow for permanent data deletion.

## Release Gates

Before a release candidate reaches real-time testing:

1. JavaScript syntax checks pass.
2. Storage, migration, workflow, bridge, backup, restore, API-arm contract, and API-arm implementation checks pass.
3. The pinned Electron runtime loads `node:sqlite` and completes a temporary SQLite write/read/delete smoke test.
4. The storage-root safety check rejects app-folder storage and permits the default external user storage root.
5. The release contract check passes.
6. The unpacked Windows application is produced successfully.
7. The unpacked artifact contains the expected executable and resources and contains no Project State user database.
8. The NSIS installer is produced successfully.

Real-time testing then verifies first launch, an existing-data launch, Intake submission through the local transport, upgrade behavior, backup/restore, and uninstall data preservation on an actual desktop session.

## Commands

```text
pnpm check:release
pnpm release:dir
pnpm release:installer
```
