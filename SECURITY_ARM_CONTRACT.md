# Project State External Security Boundary v0.1

Status: bundled malware scanning abandoned by owner decision. Project State records external-security responsibility but does not scan files or claim they are safe.

## Product boundary

Project State is not antivirus software and must not become responsible for malware detection, remediation, security-definition currency, or operating-system protection.

The user is responsible for checking files with security tools they trust before adding them. Project State requires an explicit acknowledgment of that responsibility for every staged Discovery case.

## Required order

`Select trusted file → acknowledge external security responsibility → copy to managed staging → hash exact bytes → deterministic extraction → Discovery`

Project State enforces:

- Explicit human acknowledgment before staging.
- A copied managed version; the original file is never moved or deleted.
- SHA-256 and byte-size identity for the staged version.
- Content reads only from a registered version whose current bytes still match its immutable identity.
- Immediate blocking when staged bytes are missing or changed.
- Actor, timestamp, reason, File Version, and case history for the acknowledgment.

Project State does not enforce or claim:

- Malware scanning.
- A clean, safe, trusted, or threat-free verdict.
- Antivirus installation, health, definitions, or remediation.
- Windows Defender integration.
- Automatic deletion or quarantine by an operating-system security product.

## Optional future Security Arms

The provider-neutral `SecurityReceipt` storage type remains reserved for independently developed end-user or third-party integrations. No provider ships with the general application.

If a future Security Arm is installed, its result remains provider evidence rather than a Project State guarantee. It cannot select projects, answer Discovery questions, confirm routing, approve Intake, write Core, delete originals, scan unrelated paths, or rewrite receipt history.

## Stable external-boundary errors

- `EXTERNAL_SECURITY_ACKNOWLEDGMENT_REQUIRED`
- `FILE_VERSION_MISMATCH`
- `STAGED_FILE_MISSING`
- `STAGING_SCOPE_REJECTED`

## UI language

The Add step must state plainly:

> Project State does not scan files for malware. Only add files you trust and have already checked using your own security tools.

The acknowledgment must never be labeled as a scan result or clean verdict.
