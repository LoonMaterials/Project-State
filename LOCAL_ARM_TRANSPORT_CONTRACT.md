# Project State Local Arm Transport v0.1

## Purpose

This contract carries API Arm Contract v0.1 envelopes from a local connector into the desktop Intake Airlock.

It is a machine-local transport, not a public server. It does not add remote access, cloud hosting, provider credentials, approval authority, or Core write authority.

The machine-readable companion is `fixtures/local-arm-transport-v0.1-contract.json`.

## Network Boundary

- The listener is disabled by default.
- When enabled, it binds only to `127.0.0.1`.
- It never binds to all interfaces.
- Browser-origin requests are rejected; v0.1 is for local connector processes, not arbitrary web pages.
- Every contract endpoint requires a bearer token.
- The listener exposes no static files, project browsing, generic storage, approval, or administration endpoint.

## Secret Boundary

Project State creates a random bearer token using cryptographic randomness. Electron `safeStorage` must be available before the listener can be enabled.

The token is encrypted at rest in the machine-local `integrations/` folder. It is excluded from Project State backup packages, exports, Intake records, logs, receipts, and error responses.

The token is returned only when first created or explicitly rotated. Status calls report only whether a token is configured. Disabling the listener retains the encrypted token; revoking the integration stops the listener and deletes the encrypted token.

A connector receives its token through an explicit local handoff. The generic connector reads it from `PROJECT_STATE_API_ARM_TOKEN`; it does not accept the token as a command-line argument, where it could be retained in shell history or process listings.

## Endpoints

All endpoint paths are versioned:

```text
GET  /v0.1/capabilities
POST /v0.1/submissions
GET  /v0.1/receipts/<submissionId>
POST /v0.1/files
```

Successful submission still means only `airlock_pending_human_review`.

## Request Controls

- JSON submission bodies only.
- Maximum request body: 1 MiB.
- Maximum file body: 25 MiB under the separate File Arm Contract v0.1.
- Maximum 100 proposal items per envelope.
- Maximum 60 authenticated requests per minute per local address.
- Header and request timeouts are enforced.
- Unsupported methods and paths return bounded JSON errors.
- Internal stack traces, filesystem paths, tokens, and envelope contents are not returned in transport errors.

## Lifecycle

The desktop main process owns the listener. Settings controls may:

- enable it on a validated local port;
- disable it without deleting its token;
- rotate the token; or
- revoke it and delete its token.

An enabled listener may start with the desktop app. Failure to bind does not bypass the Airlock or switch to another interface; it reports a stopped/error state for human action.

## Generic Connector

`scripts/api-arm-submit.js` is the first maintained connector. It sends one validated JSON envelope to the local listener and prints the non-secret receipt. It accepts an envelope file or standard input and requires the bearer token through an environment variable.

`scripts/api-arm-submit-file.js` implements File Arm Contract v0.1 for one checksum-verified managed source file.

It is provider-neutral. Provider-specific calendar, email, chat, Codex, or AI adapters remain later connectors and must emit the same API Arm Contract envelope.

## Verification

```text
node scripts/local-arm-transport-contract-check.js
node scripts/local-arm-transport-implementation-check.js
```

The automated implementation check uses an ephemeral loopback port and temporary storage. Manual real-time testing remains required for packaged-app lifecycle, Settings controls, connector handoff, firewall behavior, and an actual external source process.
