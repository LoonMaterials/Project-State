# Project State API Arm Contract v0.1

## Purpose

This contract defines how a future API arm may submit outside information to the Project State desktop Intake Airlock.

It is an inbound proposal contract. It is not a Core write API, a general storage API, an approval API, or a network-service specification.

The machine-readable contract is `fixtures/api-arm-v0.1-contract.json`.

## Authority Boundary

An API arm may:

- describe its identity and contract version;
- submit one intake envelope containing one or more proposal items;
- retry the same submission using the same idempotency key;
- receive an Airlock receipt for the submission; and
- ask for the receipt associated with a submission it created.

An API arm may not:

- create, edit, archive, approve, or delete Core Project State records;
- mark its own proposal Ready, Approved, Rejected, or Archived;
- assign approval metadata, review metadata, trusted-source status, or Change History;
- call the generic storage save methods;
- write SQLite tables or managed folders directly;
- use browser/dev mode as a production ingestion path; or
- treat a successful Airlock receipt as approval or truth.

Only the desktop bridge may accept an envelope. Acceptance creates Intake records outside Core. A permitted human must still review and approve each proposal individually before the existing Intake workflow may create a Core record and its Change History entry.

## Logical Operations

The v0.1 contract defines three logical operations for a future desktop adapter:

```text
describeCapabilities()
submitEnvelope(envelope)
getReceipt(submissionId)
```

The exposed desktop adapter implements these operations at `window.ProjectStateDesktop.intakeArms`. Local Arm Transport v0.1 provides the authenticated loopback carrier and must preserve this contract and the Airlock boundary. No provider-specific external API integration is installed by v0.1.

## Submission Envelope

Every submission has:

- `contractVersion`: exactly `0.1`;
- `submissionId`: stable ID created by the arm;
- `idempotencyKey`: stable retry key created by the arm;
- `submittedAt`: ISO 8601 timestamp supplied by the arm;
- `arm`: arm ID, display name, type, arm version, and optional instance ID;
- `target`: existing Project ID;
- `items`: one or more proposed Intake items; and
- `provenance`: a human-readable source label plus optional external reference and capture timestamp.

Each proposal item has:

- `clientItemId`: stable within the submission;
- `title`: proposed Intake title;
- `proposedObjectType`: one supported Intake proposal type;
- `proposedChange.text`: the proposed content;
- optional proposal summary, target, and due date fields;
- optional source label; and
- optional structured evidence metadata.

The accepted proposal types are:

- `ProjectStatus`
- `Decision`
- `Fact`
- `Conflict`
- `OpenQuestion`
- `NextAction`
- `Source`
- `Relationship`

The accepted arm types match the current Intake model. An API connector normally uses `api`; the other values allow a shared adapter to preserve the actual origin instead of relabeling it.

## Validation and Normalization

The desktop adapter must reject the whole envelope before persistence when:

- the contract version is unsupported;
- a required field is absent or blank;
- the target Project ID does not resolve;
- the arm type or proposal type is unsupported;
- item IDs repeat within the envelope;
- the same idempotency key is reused with different content; or
- the payload attempts to provide server-owned workflow or authority fields.

The adapter must not silently convert an unsupported proposal type to `Decision` or an unsupported arm type to `other`. Contract validation occurs before the app's legacy normalization helpers.

The envelope carries metadata only. v0.1 does not accept embedded file bytes, data URLs, credentials, secrets, executable content, or direct managed-file paths. File transfer and secret handling require separate contracts.

## Server-Owned Intake Fields

On first acceptance, Project State creates its own stable Intake IDs and sets:

```json
{
  "status": "pending",
  "reviewState": "needs_review",
  "queueState": "new",
  "queueNotes": "",
  "approval": null,
  "assignments": [],
  "comments": [],
  "archived": false
}
```

The arm cannot override these fields. A human queue review is required to move an accepted proposal to `ready`; human approval remains a separate, item-by-item operation.

Project State also records the arm identity, submission ID, client item ID, idempotency key, received timestamp, and provenance with each accepted Intake item or its batch metadata so the proposal remains traceable.

## Idempotency and Atomicity

`submissionId` and `idempotencyKey` are both required.

- First valid submission: accept the envelope as one Intake batch and return `accepted`.
- Exact retry: create no new records and return the original receipt as `duplicate`.
- Same idempotency key with different canonical content: reject with `IDEMPOTENCY_CONFLICT`.
- Invalid item: reject the entire envelope; v0.1 does not partially accept a batch.

Acceptance and receipt creation must be transactional. A receipt must never claim acceptance unless the corresponding Intake batch and all Intake items were persisted.

## Receipt

An accepted or duplicate receipt contains:

- contract version;
- submission ID and idempotency key;
- Project State batch ID;
- one mapping from each client item ID to its Project State Intake ID;
- `accepted` or `duplicate` receipt status;
- received timestamp; and
- the fixed boundary value `airlock_pending_human_review`.

The receipt proves only that Project State retained an outside proposal in the Airlock. It does not prove approval, correctness, trust, or a Core write.

A rejected response contains no batch ID or Intake IDs. It returns one or more stable error codes with readable messages and optional field paths.

## Error Codes

- `UNSUPPORTED_CONTRACT_VERSION`
- `INVALID_ENVELOPE`
- `INVALID_ARM`
- `INVALID_TARGET_PROJECT`
- `INVALID_PROPOSAL_TYPE`
- `DUPLICATE_CLIENT_ITEM_ID`
- `FORBIDDEN_FIELD`
- `IDEMPOTENCY_CONFLICT`
- `PAYLOAD_NOT_SUPPORTED`
- `DESKTOP_RUNTIME_REQUIRED`
- `PERSISTENCE_FAILED`

## Read Scope

`getReceipt` returns only the submission receipt and Airlock boundary status. It does not expose arbitrary projects, Core records, storage contents, approval actors, comments, assignments, or Change History.

An unknown or blank submission ID returns `null`. Receipt lookup does not search or disclose other submissions.

Read access to bounded project context remains a separate Context Pack export. A Context Pack is read-only and does not grant write authority.

## Versioning

Contract version `0.1` is exact. Additive or breaking changes require a new machine-readable contract version and an updated verification check. Adapters must reject unsupported versions rather than guessing.

Run:

```text
node scripts/api-arm-contract-check.js
```

This check verifies the machine-readable contract, the current Intake vocabulary, required authority rules, and the documentation boundary. `scripts/api-arm-implementation-check.js` verifies the desktop adapter, durable receipts, idempotency, rejection paths, Core isolation, and normal-save round trips. Local transport and file submission are governed and verified separately; no check claims a provider-specific external integration exists.
