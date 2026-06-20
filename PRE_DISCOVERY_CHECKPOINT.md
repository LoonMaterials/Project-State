# Project State Final Pre-Discovery Checkpoint

Checkpoint date: 2026-06-19

Checkpoint label: `final-pre-discovery-v0.1`

This checkpoint preserves the last Project State implementation before the Discovery-first, global File Asset, external-security boundary, and provider-neutral Interaction architecture begins.

## Included behavior

- Electron desktop application and SQLite managed-folder storage spine.
- Core Project State objects, stable IDs, roles, approval, trust, conflicts, corrections, and Change History.
- Intake Airlock and target-known API Arm Contract v0.1.
- Local authenticated loopback transport.
- File Arm v0.1 with managed copies, checksums, and human approval.
- Global Files screen with multi-file and recursive-folder import.
- Project-bound managed Source creation after Intake approval.
- Search, backup, restore, recovery, integrity checks, and Windows installer packaging.

## Explicitly not included

- Discovery Cases before project selection.
- External-security acknowledgment and exact-byte enforcement before content access.
- Global content-addressed File Assets independent of projects.
- Provider-neutral Interaction records and adaptive user questions.
- Existing-project matching or suggested project names.
- Discovery-to-Intake promotion.
- Discovery extraction, questions, routing, and Intake promotion.

## Preserved artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `checkpoints/Project-State-Final-Pre-Discovery-0.1.0-x64.exe` | 101727844 | `8F4CA66E9FB1C9D690E9556CA9F0E8D022EDEEBEDECAE80D77A05D786E4DE5D1` |
| `checkpoints/Project-State-Final-Pre-Discovery-Source.zip` | 295911 | `426A86DB32F11856C8B47427E53FF298B8D4683B92268D0F720A6F2E3413A95B` |

The installer is unsigned and intended only for local testing. The source archive excludes dependencies, build caches, generated release directories, user data, databases, and integration secrets.

## Core source hashes at the boundary

| File | SHA-256 |
|---|---|
| `app.js` | `C0D21466F57EE5B890EE59036D4C581F95666977A6F5E8A1E2BCB2A98C0DCB31` |
| `index.html` | `3DF7E31E7F4A2FD3E179FADFD65C14086BB7BF721B17BB3EB1C1E0516CE57FF8` |
| `styles.css` | `3B98FB3568BC4825E128B92FBCD589B764017525BF90505120DDA95E4C49ECDA` |
| `desktop/main.cjs` | `BA4FF8EEBE4E11639495AA6262D11E48D5C04002E53E0D3799B933F55D48AAE2` |
| `desktop/preload.cjs` | `68FCB6E2D71162CE90793962ADE9FBCF92457CF3969CE6F8BF349237F5018E76` |
| `desktop/project-state-desktop-bridge.cjs` | `BB068EFAD654DDCAA7246E2606D21DFE84DF9B04E3E5453B2C55E5A02199F2B1` |
| `desktop/spine-schema.sql` | `9A06AFE3DB836FB93CD6482AA0C23AD7294D0A6001F75999E1CFC6237C2E99CC` |
| `package.json` | `FAE10C215E2F385EFFE281A1AAA84D116D3CDFC39180AD69488409036B5D739F` |
| `pnpm-lock.yaml` | `442E27DCCBEB5EC9E976373BD0EF1E835FA076DA9121E78111EE68EC37CEA79B` |

## Continuation rule

Discovery implementation must not rewrite or replace these checkpoint artifacts. Future migrations must preserve the ability to identify and import pre-Discovery data without silently changing its meaning.
