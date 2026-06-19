# Project State Real-Time Test Plan v0.1

## Status

The non-live implementation gates are complete. The next work requires launching the desktop UI, opening a real loopback listener, installing and uninstalling a Windows application, and observing the resulting behavior in real time.

The current installer is an unsigned local test candidate. It is not ready for public distribution until code signing is configured and verified.

## Test Safety

Before starting:

1. Create and verify a current Project State backup if authoritative data already exists.
2. Do not delete or rename `%USERPROFILE%\Project State Storage` as part of an ordinary test.
3. Use `PROJECT_STATE_STORAGE_ROOT` with a dedicated temporary folder for the unpacked first-launch test.
4. Keep the local API Arm Transport disabled except during its test cases.
5. Treat the connector token as a secret. Do not paste it into chat, screenshots, logs, command arguments, or committed files.
6. Do not test public-network binding; v0.1 is loopback-only.

## Candidate Artifacts

- Unpacked application: `release/win-unpacked/Project State.exe`
- Installer: `release/Project-State-Setup-0.1.0-x64.exe`
- Release manifest: `release/release-candidate-manifest.json`

Verify the installer SHA-256 against the release manifest before running it.

## Test 1: Unpacked First Launch

1. Launch the unpacked executable with `PROJECT_STATE_STORAGE_ROOT` set to a new temporary folder.
2. Confirm exactly one application window opens.
3. Complete first-run setup.
4. Create a test project with a recognizable name.
5. Close and reopen the app against the same temporary storage root.
6. Confirm the project, actor, Settings, and history persist.
7. Confirm no project database or managed folder appears inside `release/win-unpacked`.

Pass condition: the packaged app launches on the real desktop, uses the external storage root, and survives restart.

## Test 2: Local Transport Lifecycle

1. Open Settings as the Owner.
2. Confirm Local API Arm Transport initially shows Stopped.
3. Enable it on port `32145` with actor and reason.
4. Save the one-time token outside the project workspace in an approved secret location.
5. Confirm Settings shows Running, `127.0.0.1:32145`, configured token, and available secure storage.
6. Attempt a second Project State launch and confirm the existing window is focused rather than a second listener starting.
7. Disable the transport and confirm the listener stops while the token remains configured.
8. Re-enable, rotate the token, and confirm the previous token stops working.
9. Revoke the transport and confirm it stops and the token becomes unconfigured.

Pass condition: all lifecycle controls work, token display is one-time, and the service never binds beyond loopback.

## Test 3: Generic Metadata Connector

1. Re-enable the transport and capture a fresh token.
2. Export or inspect the test project JSON to obtain its stable Project ID.
3. Copy `fixtures/api-arm-example-envelope.json` to a temporary, untracked location.
4. Replace all placeholders and set the actual Project ID, stable submission ID, idempotency key, and current timestamps.
5. Set `PROJECT_STATE_API_ARM_TOKEN` only in the connector process environment.
6. Run `scripts/api-arm-submit.js` against `http://127.0.0.1:32145`.
7. Confirm the connector returns `accepted` and `airlock_pending_human_review`.
8. Confirm the proposal appears in Intake as Pending, Needs Review, and New.
9. Confirm the proposed Core record does not yet exist.
10. Submit the exact envelope again and confirm `duplicate` with no additional Intake item.
11. Review, mark Ready, and approve the original Intake item as a permitted human.
12. Confirm the Core record and Change History are created together.

Pass condition: real connector traffic reaches Intake, retries deduplicate, and Core remains human-governed.

## Test 4: Generic File Connector

1. Copy `fixtures/file-arm-example-metadata.json` to a temporary, untracked location.
2. Replace placeholders and use a harmless TXT, Markdown, PDF, DOCX, CSV, JSON, or supported image fixture.
3. Run `scripts/api-arm-submit-file.js` with the token in `PROJECT_STATE_API_ARM_TOKEN`.
4. Confirm the receipt reports checksum, file name, size, and Intake ID but no managed path.
5. Confirm the Source proposal appears in Intake and no Source exists in Core yet.
6. Approve it individually.
7. Confirm the Source record shows Unverified trust, verified file status, file name, media type, and size.
8. Run integrity verification and create a backup.
9. Confirm restore retains the approved Source and readable managed file.

Pass condition: file bytes, metadata, checksum, Intake approval, managed storage, integrity, backup, and restore work in the real desktop session.

## Test 5: Installer, Upgrade, and Uninstall Preservation

1. Record the current test storage database checksum and project count.
2. Run the unsigned installer only after accepting that it is a local test candidate.
3. Install per-user without elevation if Windows permits.
4. Launch from the Start Menu and confirm existing external test data opens unchanged.
5. Re-run the same installer as an upgrade/repair and confirm the storage checksum/project count remain valid.
6. Uninstall Project State.
7. Confirm application files and shortcuts are removed.
8. Confirm the external Project State storage root, database, managed sources, backups, recovery, and integration audit log remain.
9. Confirm the encrypted connector token is not present in the installation directory or installer artifacts.

Pass condition: install, repair/upgrade, and uninstall affect application files without silently deleting user data.

## Test 6: Failure Cases

Verify visible, bounded failures for:

- wrong or missing bearer token;
- browser-origin request;
- occupied port;
- invalid Project ID;
- reused idempotency key with changed content;
- unsupported file extension;
- checksum mismatch;
- oversized metadata envelope;
- oversized file body;
- secure storage unavailable; and
- missing or changed managed source file.

Pass condition: every failure is explicit, creates no unauthorized Core state, and preserves recovery evidence where persistence began.

## Public Release Gates After Real-Time Tests

- Fix every failed real-time case and rerun the full non-live suite.
- Add a real application icon and verify installer branding.
- Configure a Windows code-signing certificate.
- Produce a signed installer and confirm `Valid` Authenticode status.
- Repeat clean install, upgrade, SmartScreen/signature, backup/restore, and uninstall-preservation tests on the supported Windows versions.
