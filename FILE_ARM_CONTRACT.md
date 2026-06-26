# Project State File Arm Contract v0.1

## Purpose

This contract lets a local connector submit one source file to the Project State desktop Intake Airlock.

The upload is staged and checksum-verified, then represented by a pending `Source` Intake proposal. The file does not become an approved Source record until a permitted human marks the Intake item Ready and approves it individually.

The desktop Files screen uses the same authority path for human-selected files and folders:

- files may be selected individually or discovered by recursively scanning a chosen folder;
- unsupported, unreadable, empty, symbolic-link, and oversized files are skipped;
- Project State copies accepted files into managed `sources/` storage and never moves or deletes the originals;
- the user reviews the selection and chooses a destination project before staging;
- each managed copy creates its own pending `Source` Intake item;
- approval, rejection, archive, trust, and Change History rules remain the same as connector-submitted files.

The machine-readable companion is `fixtures/file-arm-v0.1-contract.json`.

## Endpoint

```text
POST /v0.1/files
Content-Type: application/octet-stream
Authorization: Bearer <local connector token>
X-Project-State-File-Metadata: <base64url JSON metadata>
```

The endpoint uses the Local Arm Transport v0.1 loopback, authentication, browser-origin rejection, rate limiting, and error rules.

## Metadata

The encoded metadata object contains:

- `contractVersion`: `0.1`;
- stable `submissionId` and `idempotencyKey`;
- ISO `submittedAt`;
- API arm identity;
- an existing target Project ID;
- provenance with a human-readable source label; and
- file name, media type, and SHA-256 checksum.

The generic file connector computes SHA-256 from the bytes it reads. Project State computes SHA-256 again and rejects a mismatch.

## Limits and File Safety

- Maximum file size: 25 MiB.
- Maximum encoded metadata header: 8 KiB.
- File names are reduced to a safe base name and restricted to 180 characters.
- Empty files are rejected.
- Executable and script-like file extensions are rejected in v0.1.
- Uploaded bytes are never executed, rendered as HTML, or treated as authority.
- Files are stored under the managed `sources/` folder, never at an arm-supplied path.
- Folder-oriented connectors may include explicit Discovery metadata so the retained managed source is also registered as an immutable Discovery File Version, extracted, and analyzed as part of a grouped Discovery Case before routing.
- The response never exposes the managed filesystem path.

The accepted v0.1 file extensions are PDF, DOCX, TXT, Markdown, CSV, JSON, PNG, JPG/JPEG, WEBP, and GIF.

## Idempotency and Failure

The file checksum is part of the Intake proposal envelope.

- An exact retry returns the retained file receipt and creates no duplicate file, batch, or Intake item.
- Reusing the submission ID or idempotency key with different bytes is rejected by the API Arm idempotency rule.
- A validation or checksum failure writes no managed source file and creates no Intake item.
- If managed-file finalization fails after Airlock acceptance, Project State records a recovery issue and does not report a successful file receipt.

## Approval

Before approval, the Intake item carries server-owned managed-file metadata and remains `pending`, `needs_review`, and `new`.

On human approval, the existing Intake-to-Core path creates a Source record with:

- original file name, media type, and byte count;
- managed source path and SHA-256 checksum;
- `unverified` source trust;
- file-verification status `verified`; and
- Change History linking the Source to the Intake submission.

Approval never executes or automatically extracts the uploaded file. Extraction remains a separate, explicit workflow.

## Generic File Connector

`scripts/api-arm-submit-file.js` reads the bearer token from `PROJECT_STATE_API_ARM_TOKEN`, reads metadata from a JSON file, computes the checksum, and uploads the selected file. It refuses command-line token arguments and non-loopback destinations.

## Verification

```text
node scripts/file-arm-contract-check.js
node scripts/file-arm-implementation-check.js
```
