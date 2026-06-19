# Project State Security Arm Contract v0.1

Status: partial runtime foundation. Exact-checksum quarantine read authorization is implemented and fail-closed; provider configuration, health checks, scanning adapters, and first-run UI remain pending.

The Security Arm is a mandatory, user-configured local gate between quarantine and all file-content access.

## Required order

`Selected bytes → managed quarantine → immutable hash/metadata → Security Arm → security receipt → eligible or blocked`

No preview, thumbnail generation, extraction, indexing, OCR, summarization, AI transmission, Discovery interpretation, Intake promotion, or Core linkage may access file content before an eligible clean receipt exists for the exact checksum.

## Provider model

- General Project State provides this contract and setup UI but does not require one security vendor.
- The end user installs or selects a compatible local provider.
- Aether initially targets a Windows Defender adapter.
- Exact provider commands and supported Microsoft interfaces must be verified against current official documentation during adapter implementation.
- Provider configuration and secrets remain machine-local and are excluded from normal backup packages.

## Operations

- `describeCapabilities`
- `healthCheck`
- `scanStagedFile`
- `getScanReceipt`
- `rescanStagedFile`
- `revokeProvider`

## Verdicts

- `clean`
- `threat_detected`
- `suspicious`
- `unknown`
- `error`

Only `clean` may permit content access. Unknown, unavailable, stale, suspicious, threat, and error outcomes fail closed.

## Receipt fields

- Stable receipt ID and scan job ID.
- File Asset ID, File Version ID, and SHA-256.
- Verdict and eligibility state.
- Provider, product, engine, and definition versions where available.
- Definition date and scan start/completion times.
- Threat names/categories and provider-reported action where applicable.
- Provider-native result reference where safe.
- Requesting actor and adapter identity.
- Superseded receipt ID for rescans.
- Structured errors without secrets.

## Security boundaries

The Security Arm may inspect only the immutable file version explicitly staged for its scan job. It cannot:

- Select or create projects.
- Confirm Discovery answers or routing.
- Approve Intake or write Core.
- Delete original user files.
- Read unrelated filesystem paths.
- Perform AI analysis or content summarization.
- Change old receipts or history.
- Treat a stale receipt as current after file-byte or policy changes.

Project State does not claim to be an antivirus engine. It records and enforces the configured provider’s result.

## First-run policy

1. Configure owner and storage.
2. Select or install a Security Arm provider.
3. Run provider health and capability checks.
4. Record the active security policy.
5. Enable file addition only after the gate is healthy.

If no provider is healthy, Project State may retain explicitly selected bytes in quarantine but must not read or promote them.

## Aether Windows Defender profile

Aether’s existing files may be historically described as previously checked, but ingestion should request a new Defender scan so Project State receives a traceable receipt for each exact imported version. Future additions follow the same gate automatically.

Defender unavailability, disabled protection, outdated definitions, scan failure, or an ineligible verdict pauses Discovery safely. Project State does not silently override Defender and does not automatically delete the original file.

## Stable errors

- `SECURITY_ARM_NOT_CONFIGURED`
- `SECURITY_ARM_UNAVAILABLE`
- `SECURITY_HEALTH_CHECK_FAILED`
- `SCAN_FAILED`
- `THREAT_DETECTED`
- `VERDICT_SUSPICIOUS`
- `VERDICT_UNKNOWN`
- `SECURITY_RECEIPT_STALE`
- `FILE_VERSION_MISMATCH`
- `SCAN_SCOPE_REJECTED`
