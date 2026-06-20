# Project State Internal Flow Experiment v0.1

Date: 2026-06-20  
Status: implemented and verified through the isolated live-test gate

## Objective

Make Project State substantially easier to operate without weakening identity, authority, provenance, Intake, approval, exact-file lineage, recovery, or immutable history.

The experiment changes presentation and interaction flow. It does not grant new authority and does not remove required audit evidence.

## Governing interaction

`Choose → Describe → Review → Confirm`

- **Choose:** select the project, object, destination, actor, or controlled category.
- **Describe:** enter the information that is unique to this action.
- **Review:** edit the proposed result and see what will change.
- **Confirm:** provide or confirm the audit reason and perform the governed action.

## One-active-workspace rule

- Only one action menu, detail drawer, modal, or guided task may be active at a time.
- Opening a new surface closes the previous transient surface.
- Starting an action from an object returns the user to that object after completion.
- Navigation never silently discards an edited form.

## Draft rule

- Changed forms create a session draft automatically.
- Closing a changed form offers **Save draft**, **Discard**, or **Stay here**.
- A draft records its actor and save time but is not Core, approval, or history.
- Submitting a form clears its session draft.
- Draft recovery never bypasses final validation, actor, reason, permission, Intake, or approval checks.

## Audit work session

- The active human actor is selected from known active actors rather than retyped.
- The most recent confirmed reason may be inherited during the current work session and remains editable.
- Common reason choices reduce repetitive typing; custom reasons remain available.
- Inheritance is convenience only. Every confirmed change still stores its own actor, timestamp, reason, changed object, origin/how changed, and language.
- No history record is collapsed, skipped, rewritten, or replaced by the work-session record.

## Controlled choices

Use searchable or controlled choices where Project State already has a known vocabulary:

- actors and assignees;
- projects and relationship targets;
- project health and workflow state;
- object and proposal types;
- source trust and review state;
- relationship, privacy, and routing types;
- common audit reasons.

Fields that legitimately require new values retain **Other / custom** or searchable free-entry choices.

## State presentation

The interface must distinguish:

- Draft
- Needs review
- Ready
- Approved / Core

Warnings must identify the missing requirement and provide a direct corrective action. A warning must not strand the user on a dashboard without a working route to the affected object.

## Security and authority invariants

- External material still enters through Discovery or Intake.
- Project State still performs no malware scan and makes no clean/safe claim.
- Exact staged bytes and checksums remain enforced.
- Machine actors cannot impersonate human answers, routing, or approval.
- Intake approval remains a distinct human action.
- Drafts and suggestions are never treated as truth.
- Core changes always retain who, when, why, changed object, origin, language, and history.

## Experimental release gate

The flow may replace the existing presentation only after:

1. focused one-surface, draft, audit, dropdown, navigation, and history checks pass;
2. the complete non-live regression suite passes;
3. an isolated live session proves create, edit, cancel, draft recovery, Intake approval, project navigation, persistence, and restart behavior;
4. no test shows lost history, skipped authority, silent data loss, or a new Core-write path.

## Verification result — 2026-06-20

- All 31 non-live regression checks passed after implementation.
- The isolated desktop session completed Discovery, editable Intake, Ready state, human approval, project/source creation, normal project editing, one-active-menu behavior, session-draft recovery, controlled actor/reason choices, and contextual navigation.
- The live record retained one source, one decision, one next action, one added Fact, and seven immutable history events.
- Every live history event retained actor, timestamp, reason, changed object, origin/how changed, and language.
- Exact-file, Discovery extraction/chunk, database, and managed-source integrity passed.
- SQLite now waits briefly for overlapping readers/writers and renderer saves are serialized; the live collision found during testing was corrected and regression-tested.
- Session drafts remain non-authoritative and may be explicitly saved, discarded, or retained while the form stays open.

## Flow hardening extension

The next hardening pass adds four presentation rules without changing authority:

1. Every active project and Intake proposal receives one contextual primary **Next step** action.
2. Every actionable warning links directly to the form or object that corrects it.
3. Checksums, internal IDs, managed paths, and detailed provenance move behind **Details and provenance** while remaining available and unchanged.
4. Add and edit forms stop at a plain-language final review showing what will change, target, actor, and reason before invoking the governed action.

Approval forms that already constitute a final governed review do not receive a redundant second review.

## Flow hardening verification — 2026-06-20

- Project and Intake screens now calculate one contextual primary Next step from the current governed state.
- Project-completeness warnings now open the exact corrective form instead of merely returning to the project.
- Discovery and Intake retain IDs, checksums, managed paths, routing, and detailed provenance behind **Details and provenance** disclosure.
- Governed add and edit forms now stop at a plain-language final review of the proposed change, actor, and reason before writing.
- Final approval, confirmation, rejection, deletion, archive, restore, and reset actions remain the final governed review and do not receive a redundant extra screen.
- The isolated live flow created a Fact and corrected a missing Next Action through the warning action. Both showed final review and persisted with actor identity, timestamp, reason, object identity, origin/how changed, language, and detailed field history.
- All 32 non-live regression checks passed after the final implementation, including the new flow-hardening gate and every pre-existing storage, workflow, desktop, backup/restore, API Arm, File Arm, release-contract, Discovery, and authority check.
