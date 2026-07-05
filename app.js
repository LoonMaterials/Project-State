const STORAGE_KEY = "project-state.v0.1";
const STORAGE_DB_NAME = "project-state-spine";
const STORAGE_DB_VERSION = 2;
const STORAGE_OBJECT_STORE = "records";
const STORAGE_MAIN_RECORD = "main";
const STORAGE_META_RECORD = "spine-meta";
const STORAGE_META_MAIN_RECORD = "store";
const STORAGE_LEGACY_BACKUP_RECORD = "legacy-json-backup";
const STORAGE_SPINE_VERSION = "0.2.0-phase3";
const STORAGE_LAYOUT_VERSION = "split-stores-v1-audited";
const STORAGE_SPLIT_STORES = ["meta", "projects", "history", "sources", "extracts", "attachments", "drafts", "recovery"];
const DISPLAY_TEXT_LIMIT = 1200;
const DISPLAY_META_LIMIT = 240;
const EXTRACT_TEXT_LIMIT = 5000;
const DISCOVERY_REVIEW_UNIT_LIMIT = 100;
const PROJECT_HEALTH_FLAGS = ["active", "blocked", "at_risk", "complete", "on_hold"];
const ARM_TYPES = ["calendar", "meeting", "api", "ai", "codex", "notes", "chat", "email", "file", "manual", "other"];
const INTAKE_STATUSES = ["pending", "approved", "rejected", "archived"];
const INTAKE_QUEUE_STATES = ["new", "needs_review", "ready", "blocked"];
const COLLAB_REVIEW_STATES = ["draft", "needs_review", "revision_requested", "ready_for_approval", "approved", "rejected", "archived"];
const ASSIGNMENT_ROLES = ["owner", "reviewer", "approver", "watcher"];
const AI_WORK_ORDER_STATUSES = ["submitted", "in_progress", "completed", "archived"];
const SOURCE_TRUST_LEVELS = ["primary", "supporting", "unverified", "superseded", "conflicting"];
const SOURCE_STALENESS_STATES = ["current", "review_due", "stale", "not_reviewed"];
const SOURCE_REVIEW_DUE_WINDOW_DAYS = 30;
const TRUST_BOUNDARIES = ["external", "airlock", "core", "read_only"];
const DECISION_RELATION_TYPES = ["", "supersedes", "replaces"];
const CONFLICT_STATUSES = ["unresolved", "under_review", "resolved", "archived"];
const CONTEXT_PACK_PRESET_KEYS = ["current_state", "recent_decisions", "handoff", "source_research", "codex_implementation", "custom"];
const CONTEXT_PACK_PRESETS = {
  current_state: {
    scope: "project",
    budget: "quick",
    includeSources: false,
    includeOpenWork: false,
    includeHistory: false,
    includeDecisions: false,
    includeFacts: false,
    includeRelationships: false
  },
  recent_decisions: {
    scope: "project",
    budget: "quick",
    includeSources: false,
    includeOpenWork: false,
    includeHistory: false,
    includeDecisions: true,
    includeFacts: false,
    includeRelationships: false
  },
  handoff: {
    scope: "related",
    budget: "normal",
    includeSources: true,
    includeOpenWork: true,
    includeHistory: true,
    includeDecisions: true,
    includeFacts: true,
    includeRelationships: true
  },
  source_research: {
    scope: "sources",
    budget: "deep",
    includeSources: true,
    includeOpenWork: true,
    includeHistory: false,
    includeDecisions: true,
    includeFacts: true,
    includeRelationships: true
  },
  codex_implementation: {
    scope: "related",
    budget: "deep",
    includeSources: true,
    includeOpenWork: true,
    includeHistory: true,
    includeDecisions: true,
    includeFacts: true,
    includeRelationships: true
  }
};
const APPROVED_CORE_ORIGINS = ["human_ui", "migration"];
const ACTOR_ROLES = ["owner", "admin", "project_lead", "approver", "editor", "contributor", "reviewer", "auditor", "viewer", "ai_tool"];
const ACTOR_STATUSES = ["active", "archived"];
const ROLE_DEFINITIONS_VERSION = "0.1";
const ROLE_DEFINITIONS = {
  owner: {
    purpose: "Ultimate authority over Project State.",
    permissions: [
      "Create projects",
      "Edit projects",
      "Approve changes",
      "Manage users",
      "Manage roles",
      "Manage integrations",
      "Manage storage",
      "Export data",
      "Import data",
      "Archive projects",
      "Delete projects",
      "Reset system",
      "Transfer ownership"
    ],
    restrictions: ["None"]
  },
  admin: {
    purpose: "System administrator.",
    permissions: [
      "Create projects",
      "Edit projects",
      "Manage users",
      "Assign roles",
      "Manage integrations",
      "Manage storage",
      "Export data",
      "Import data",
      "Archive projects"
    ],
    restrictions: ["Cannot transfer ownership", "Cannot override Owner authority"]
  },
  project_lead: {
    purpose: "Responsible for one or more assigned projects.",
    permissions: [
      "Create project content",
      "Edit project content",
      "Approve changes within assigned projects",
      "Manage contributors within assigned projects",
      "Archive assigned projects"
    ],
    restrictions: ["Cannot manage system-wide settings", "Cannot manage global roles"]
  },
  approver: {
    purpose: "Authority to approve proposed state changes.",
    permissions: [
      "Review drafts",
      "Approve drafts",
      "Approve facts",
      "Approve decisions",
      "Approve questions",
      "Approve actions",
      "Approve relationships"
    ],
    restrictions: ["Cannot manage users", "Cannot manage permissions", "Cannot manage system settings"]
  },
  editor: {
    purpose: "Maintain approved project content.",
    permissions: [
      "Create content",
      "Edit content",
      "Update approved records",
      "Attach sources",
      "Create extracts",
      "Generate draft projects"
    ],
    restrictions: ["Cannot approve changes", "Cannot manage permissions"]
  },
  contributor: {
    purpose: "Submit information and proposals.",
    permissions: [
      "Create drafts",
      "Create facts",
      "Create questions",
      "Create actions",
      "Attach sources",
      "Create extracts",
      "Generate suggestions"
    ],
    restrictions: ["Cannot approve changes", "Cannot edit approved records without permission"]
  },
  reviewer: {
    purpose: "Review proposed content before approval.",
    permissions: ["Review drafts", "Add comments", "Add feedback", "Request revisions"],
    restrictions: ["Cannot approve changes", "Cannot modify approved records"]
  },
  auditor: {
    purpose: "Independent oversight and traceability.",
    permissions: ["View all projects", "View history", "View change logs", "View approvals", "Export audit reports"],
    restrictions: ["Cannot create content", "Cannot edit content", "Cannot approve changes"]
  },
  viewer: {
    purpose: "Read-only access.",
    permissions: ["View projects", "View current state", "Search content"],
    restrictions: ["Cannot create content", "Cannot edit content", "Cannot approve changes"]
  },
  ai_tool: {
    purpose: "Non-human contributor.",
    permissions: [
      "Search content",
      "Summarize content",
      "Create extracts",
      "Generate facts",
      "Generate questions",
      "Generate actions",
      "Generate relationships",
      "Generate draft projects",
      "Generate reports",
      "Generate handoffs"
    ],
    restrictions: [
      "Cannot approve changes",
      "Cannot modify permissions",
      "Cannot delete history",
      "Cannot delete projects",
      "Cannot become source of truth"
    ],
    rule: "AI and tools may propose changes. Humans must approve changes before they become Project State."
  }
};
const ROLE_PERMISSION_COLUMNS = ["create", "edit", "approve", "audit", "admin"];
const ROLE_PERMISSION_MATRIX = {
  owner: { create: true, edit: true, approve: true, audit: true, admin: true },
  admin: { create: true, edit: true, approve: false, audit: true, admin: true },
  project_lead: { create: true, edit: true, approve: true, audit: true, admin: false },
  approver: { create: false, edit: false, approve: true, audit: true, admin: false },
  editor: { create: true, edit: true, approve: false, audit: false, admin: false },
  contributor: { create: true, edit: false, approve: false, audit: false, admin: false },
  reviewer: { create: false, edit: false, approve: false, audit: false, admin: false },
  auditor: { create: false, edit: false, approve: false, audit: true, admin: false },
  viewer: { create: false, edit: false, approve: false, audit: false, admin: false },
  ai_tool: { create: true, edit: false, approve: false, audit: false, admin: false }
};
const HISTORY_POLICY_VERSION = "0.1";
const MANDATORY_HISTORY_FIELDS = ["actor", "timestamp", "reason", "changedObject", "howChanged", "language"];
const RECENT_PROJECT_LIMIT = 5;
const DEFAULT_LANGUAGE = "en";
const LANGUAGES = {
  en: {
    languageName: "English",
    appTitle: "Project State",
    appKicker: "Local-first project record",
    openingTitle: "Opening Project State",
    openingSubtitle: "Loading the storage spine and checking local project records.",
    search: "Search",
    searchPlaceholder: "Search projects and records",
    refreshStorage: "Refresh",
    refreshedFromStorage: "Refreshed from storage.",
    storageRefreshFailed: "Storage refresh failed.",
    storageRecoveryNotice: "Project State could not load saved data. Recovery details were preserved.",
    projects: "Projects",
    workInbox: "Work Inbox",
    workInboxSubtitle: "Items that need human attention across Project State.",
    inboxEmpty: "Nothing needs attention right now.",
    inboxEmptyDetail: "Pending reviews, blocked work, source issues, and due actions will appear here.",
    readyToApprove: "Ready to Approve",
    needsReview: "Needs Review",
    blockedWork: "Blocked",
    dueSoon: "Due Soon",
    overdue: "Overdue",
    missingSource: "Missing Source",
    integrityWarning: "Integrity Warning",
    draftWaiting: "Draft Waiting",
    openQuestionNeedsAction: "Question Needs Action",
    goToProject: "Go to Project",
    goToIntake: "Go to Intake",
    goToSettings: "Go to Settings",
    openItem: "Open Item",
    assignment: "Assignment",
    assignments: "Assignments",
    assignObject: "Assign",
    assignedTo: "Assigned To",
    assignmentRole: "Assignment Role",
    assignmentOwner: "Owner",
    assignmentReviewer: "Reviewer",
    assignmentApprover: "Approver",
    assignmentWatcher: "Watcher",
    comments: "Comments",
    reviewThread: "Review Thread",
    addComment: "Add Comment",
    commentText: "Comment",
    commentsNotPrivateNotice: "Comments are part of the project record and are not private.",
    reviewState: "Review State",
    projectRoles: "Project Roles",
    manageProjectRoles: "Manage Project Roles",
    projectRole: "Project Role",
    proposalDiff: "Proposal Diff",
    currentValue: "Current Value",
    proposedValue: "Proposed Value",
    conflictWarning: "Conflict Warning",
    changedSinceOpened: "This record may have changed since it was opened. Review before approving.",
    notificationQueue: "Notification Queue",
    assignedToYou: "Assigned to you",
    aiWorkOrders: "AI Work Orders",
    aiWorkOrder: "AI Work Order",
    aiWorkOrdersSubtitle: "Human-created work requests for future AI arms. Outputs must return through the airlock.",
    createAiWorkOrder: "Create AI Work Order",
    aiWorkOrderNotice: "This creates a work order only. It does not call AI and does not change Project State.",
    workOrderTask: "Task",
    outputType: "Output Type",
    canCreateIntake: "May create intake proposals",
    noAiWorkOrders: "No AI work orders recorded.",
    inProgress: "In Progress",
    revisionRequested: "Revision Requested",
    projectConfidence: "Project Confidence",
    projectCompleteness: "Project Completeness",
    airlockCompleteness: "Airlock Completeness",
    airlockIncompleteNotice: "This item is incomplete and cannot pass the airlock.",
    requiredAirlockChecks: "Required Airlock Checks",
    present: "Present",
    missing: "Missing",
    hasCurrentStatus: "Current status",
    hasCurrentSummary: "Current summary",
    hasNextAction: "Next action",
    hasRecentDecision: "Recent decision",
    hasSourceReference: "Source reference",
    sourceFilesClear: "Source files clear",
    healthNotBlocked: "Not blocked or at risk",
    targetProjectSelected: "Target project selected",
    proposedTitleRecorded: "Proposal title recorded",
    proposedTextRecorded: "Proposal text recorded",
    proposedTypeSelected: "Proposal type selected",
    queueMarkedReady: "Queue marked ready",
    draftNameRecorded: "Draft name recorded",
    draftTextRecorded: "Draft text recorded",
    draftReviewComplete: "Draft review complete",
    draftSourceLinked: "Source and extract linked",
    archivedProjects: "Archived Projects",
    intake: "Intake",
    backup: "Backup",
    restore: "Restore",
    exportJson: "Export JSON",
    addIntake: "Add Intake",
    createProject: "Create Project",
    addMenu: "Add",
    moreActions: "More Actions",
    viewDetails: "View Details",
    objectDetails: "Object Details",
    closeDetails: "Close Details",
    continueWorking: "Continue Working",
    continueLastProject: "Continue Last Project",
    recentProjects: "Recent Projects",
    noRecentProjects: "No recently opened projects.",
    batchTriage: "Batch Triage",
    batchTriageNotice: "Triage changes queue state only. Each approval still requires its own human review, confirmation, actor, and reason.",
    selectIntakeItems: "Select Intake Items",
    applyTriage: "Apply Triage",
    proposeCorrection: "Propose Correction",
    correctionNotice: "This creates an Airlock proposal. It does not alter the approved record until a human approves it.",
    correctedContent: "Corrected Content",
    correctionProposed: "Correction proposed",
    correctionApproved: "Correction approved",
    permissionDenied: "The selected actor role does not permit this action.",
    currentActorRole: "Current Actor Role",
    openReferencedObject: "Open Referenced Object",
    backToProjects: "Back to Projects",
    saved: "Saved",
    setupTitle: "Set Up Project State",
    setupSubtitle: "This configures local use, backup guidance, and the primary actor for approved changes.",
    primaryActor: "Primary Actor",
    backupLocation: "Backup Location",
    backupLocationPlaceholder: "Example: External Drive / Project State Backups",
    backupReminder: "Backup Reminder",
    language: "Language",
    localModeConfirm: "I understand this is single-user local mode and backups are controlled by the user.",
    recoveryWarnings: "Show storage and recovery warnings.",
    saveSetup: "Save Setup",
    manual: "Manual",
    weekly: "Weekly",
    monthly: "Monthly",
    active: "Active",
    blocked: "Blocked",
    atRisk: "At Risk",
    complete: "Complete",
    onHold: "On Hold",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    archived: "Archived",
    withApproval: "With approval",
    aiSuggested: "AI suggested",
    settings: "Settings",
    settingsSubtitle: "Local app configuration for language, actors, storage, backup, recovery, and safety policy.",
    coreSettings: "Core Settings",
    defaultLanguage: "Default Language",
    defaultActor: "Default Actor",
    saveCoreSettings: "Save Core Settings",
    usersActors: "Users / Actors",
    noActorsRecorded: "No actors recorded.",
    newActorName: "New Actor Name",
    role: "Role",
    addActor: "Add Actor",
    storageSystem: "Storage System",
    platformStorageSpine: "Platform storage spine",
    platformAdapterLabel: "Platform Adapter",
    primaryStorage: "Primary Storage",
    localBrowserStorageSpine: "Desktop storage spine",
    desktopRuntime: "Desktop App Runtime",
    desktopRuntimeReady: "Desktop storage spine active.",
    browserDevRuntime: "Desktop app required",
    browserRuntimeWarning: "Project State is running without the desktop bridge. The Windows desktop app is required for storage, backup, restore, intake, file reading, Discovery, and API work.",
    browserDevGateTitle: "Desktop app required",
    browserDevGateSubtitle: "The desktop bridge is required for Project State.",
    browserDevGateNotice: "This launch cannot act as Project State. Open the Windows desktop app so the desktop storage spine, managed files, Discovery, and API arms are available.",
    browserDevGateReadOnly: "Locked runtime",
    browserDevGateCounts: "Loaded records",
    browserDevNoSilentStorage: "No Project State work runs without the desktop bridge.",
    saveBlockedApproval: "Unsaved changes: approval gate blocked save",
    saveStorageFailed: "Unsaved changes: {message}",
    storageFailed: "storage failed",
    savedAt: "Saved {time}",
    unsavedChanges: "Unsaved changes",
    storageWarningTitle: "Storage warning",
    storageWarningDanger: "Local saved data is very large. Browser storage may fail soon, especially with images or long extracts.",
    storageWarningNotice: "Local saved data is getting large. Images and long extracts can make saves slower.",
    currentSizeSentence: "Current size: {size}.",
    resetFailedDataConfirmFirst: "Reset local Project State data? Export the failed data first. This clears only this app's local saved data.",
    resetFailedDataConfirmSecond: "Final confirmation: reset local data and start with an empty Project State store?",
    resetAllDataConfirmFirst: "Reset all local Project State data? Export a full backup first. This clears only this app's local saved data.",
    resetAllDataConfirmSecond: "Final confirmation: reset local data and return to first-run setup?",
    resetComplete: "Reset complete",
    currentMode: "Current Mode",
    currentSize: "Current Size",
    storageOverrideAcknowledged: "Record that a storage override or migration exception has been acknowledged.",
    storageOverrideReason: "Storage Override Reason",
    saveStorageSettings: "Save Storage Settings",
    backupSystem: "Backup System",
    backupLocationWarning: "Primary storage and backup should not be the same location unless this becomes a server-backed deployment.",
    backupOverrideAcknowledged: "Allow a backup-location override with warning recorded.",
    backupOverrideReason: "Backup Override Reason",
    desktopBackupPackageNotice: "Create a desktop backup package from the active storage spine. Actor, timestamp, and reason are required.",
    exportedBy: "Exported By",
    backupReason: "Backup Reason",
    backupPackageCreated: "Backup package created",
    backupPackageUnavailable: "Desktop backup package support is unavailable.",
    exportFullBackup: "Export Full Backup",
    restoreBackup: "Restore Backup",
    saveBackupSettings: "Save Backup Settings",
    recovery: "Recovery",
    recoveryControlsNotice: "Recovery controls are local-only. Export before reset.",
    exportRawCurrentData: "Export Raw Current Data",
    resetLocalData: "Reset Local Data",
    approvalAirlock: "Approval / Airlock",
    lockedOn: "Locked On",
    approvalPolicyHuman: "Human approval is required before intake reaches the core.",
    approvalPolicyAudit: "Project and object changes require actor, timestamp, reason, and changed object details.",
    approvalPolicyArms: "Outside arms write to intake first, not directly to Project State or the storage spine.",
    diagnostics: "Diagnostics",
    actorName: "Actor Name",
    actorId: "Actor ID",
    emailAddress: "Email Address",
    chatHandle: "Chat Handle",
    linkedUsers: "Linked Users",
    linkedProjectStateUsers: "Linked Project State Users",
    noLinkedUsers: "No linked users.",
    communicationRecordsNotice: "Recorded chats and emails are Project State records. They are not private.",
    userPrivacyNotice: "Project State users should assume recorded project chats, emails, sources, and history are visible to authorized Project State users.",
    defaultActorPill: "Default Actor",
    saveActor: "Save Actor",
    owner: "Owner",
    admin: "Admin",
    projectLead: "Project Lead",
    approver: "Approver",
    editor: "Editor",
    contributor: "Contributor",
    reviewer: "Reviewer",
    auditor: "Auditor",
    viewer: "Viewer",
    aiTool: "AI / Tool",
    reason: "Reason",
    status: "Status",
    storageMigrationNotice: "Primary storage is built into this local app. Changing storage systems later should be treated as a migration, not a casual setting.",
    settingsReasonPlaceholder: "Why are these settings changing?",
    storageReasonPlaceholder: "Why are storage settings changing?",
    backupReasonPlaceholder: "Why are backup settings changing?",
    actorReasonPlaceholder: "Why is this actor changing?",
    addActorReasonPlaceholder: "Why is this actor being added?",
    restoredBy: "Restored By",
    restoreReason: "Restore Reason",
    permissionMatrix: "Permission Matrix",
    permissionMatrixNote: "Role permissions control the actions shown for the configured default actor. This remains local single-user policy, not account authentication.",
    createPermission: "Create",
    editPermission: "Edit",
    approvePermission: "Approve",
    auditPermission: "Audit",
    adminPermission: "Admin",
    yes: "Y",
    no: "N",
    mandatoryHistory: "Mandatory History",
    mandatoryHistoryNote: "Every approved Project State change must record who changed it, when it changed, why it changed, what changed, how it entered the core, and the active UI language.",
    historyFieldActor: "Actor",
    historyFieldTimestamp: "Timestamp",
    historyFieldReason: "Reason",
    historyFieldObject: "Changed object",
    historyFieldHow: "How changed",
    historyFieldLanguage: "Language",
    howChanged: "How",
    languageAtChange: "Language",
    addDecision: "Add Decision",
    addExtract: "Add Extract",
    addFact: "Add Fact",
    addNextAction: "Add Next Action",
    addOpenQuestion: "Add Open Question",
    addRelationship: "Add Relationship",
    addSource: "Add Source",
    approve: "Approve",
    approveDraft: "Approve Draft",
    approveExtract: "Approve Extract",
    archive: "Archive",
    attachImage: "Attach Image",
    attachSource: "Attach Source",
    cancel: "Cancel",
    clearSearch: "Clear Search",
    createDraftProject: "Create Draft Project",
    dashboard: "Dashboard",
    deleteProject: "Delete Project",
    edit: "Edit",
    editStatus: "Edit Status",
    exportFailedData: "Export Failed Data",
    markComplete: "Mark Complete",
    onePageOverview: "One Page Overview",
    open: "Open",
    readFileExtract: "Read File Extract",
    reject: "Reject",
    review: "Review",
    suggestExtract: "Suggest Extract",
    unarchiveProject: "Unarchive Project",
    viewFullHistory: "View Full History",
    viewHistory: "View History",
    close: "Close",
    saveToAirlock: "Save to Airlock",
    approveToProjectState: "Approve to Project State",
    approveProject: "Approve Project",
    requestDeletion: "Request Deletion",
    approveUnarchive: "Approve Unarchive",
    approveChange: "Approve Change",
    approveEdit: "Approve Edit",
    createDraft: "Create Draft",
    saveReview: "Save Review",
    approveToProject: "Approve to Project",
    approveCompletion: "Approve Completion",
    recordSuggestion: "Record Suggestion",
    approveAttachment: "Approve Attachment",
    approveImage: "Approve Image",
    approveArchive: "Approve Archive",
    approveDecision: "Approve Decision",
    approveFact: "Approve Fact",
    approveSource: "Approve Source",
    approveRelationship: "Approve Relationship",
    approveQuestion: "Approve Question",
    approveAction: "Approve Action",
    restoreProjectStateBackup: "Restore Project State Backup",
    approveIntake: "Approve Intake",
    rejectIntake: "Reject Intake",
    archiveIntake: "Archive Intake",
    editCurrentStatus: "Edit Current Status",
    editProject: "Edit Project",
    editDecision: "Edit Decision",
    editFact: "Edit Fact",
    editSource: "Edit Source",
    editExtract: "Edit Extract",
    editRelationship: "Edit Relationship",
    reviewDraftProject: "Review Draft Project",
    editOpenQuestion: "Edit Open Question",
    editNextAction: "Edit Next Action",
    markActionComplete: "Mark Action Complete",
    relationshipPlaceholder: "Parent, child, dependency, related",
    historyReason: "Reason",
    historyChanged: "Changed",
    savedDataNeedsRecovery: "Saved Data Needs Recovery",
    noActiveProjects: "No active projects",
    noArchivedProjects: "No archived projects",
    roleDefinitions: "Role Definitions",
    intakeAirlock: "Intake Airlock",
    intakeAirlockSubtitle: "Outside arms can propose changes here. Human approval is required before anything reaches Project State.",
    approvalQueueSummary: "Approval Queue Summary",
    approvalQueueReview: "Queue Review",
    approvalQueueReviewNotice: "Queue review triages an intake item. It does not approve the change or write it to Project State.",
    approvalChecklist: "Approval Checklist",
    queueState: "Queue State",
    queueNew: "New",
    queueNeedsReview: "Needs Review",
    queueReady: "Ready",
    queueBlocked: "Blocked",
    reviewQueueItem: "Review Queue Item",
    saveQueueReview: "Save Queue Review",
    queueReviewNotes: "Review Notes",
    approvalQueueReadyRequired: "Queue review must mark this item ready before approval.",
    confirmProposalReviewed: "I reviewed the proposal and target project.",
    confirmApprovalWritesCore: "I understand approval writes this proposal to Project State.",
    confirmInputsNotAuthority: "I understand outside conversations, files, and AI suggestions are inputs, not authority.",
    age: "Age",
    pendingReview: "Pending Review",
    reviewedIntake: "Reviewed Intake",
    currentState: "Current State",
    currentObjects: "Current Objects",
    recentActivity: "Recent Activity",
    recentDecisions: "Recent Decisions",
    decisionRelationship: "Decision Relationship",
    decisionNoRelationship: "No earlier decision",
    supersedesDecision: "Supersedes an earlier decision",
    replacesDecision: "Replaces an earlier decision",
    supersedes: "Supersedes",
    replaces: "Replaces",
    supersededBy: "Superseded By",
    replacedBy: "Replaced By",
    missingDecision: "Missing decision",
    whatChangedSince: "What Changed Since…",
    whatChangedSinceSubtitle: "A read-only view of recorded project changes since the selected date.",
    sinceDate: "Since Date",
    changesFound: "Changes Found",
    noChangesSince: "No recorded changes since this date.",
    relationships: "Relationships",
    projectMap: "Project Map",
    projectMapSubtitle: "Relationships, evidence, and unresolved work around this project.",
    handoffMode: "Handoff Mode",
    handoffSubtitle: "A read-only briefing for a human or AI helper joining this project.",
    exportHandoff: "Export Handoff",
    whatThisProjectIs: "What This Project Is",
    whyItMatters: "Why It Matters",
    whatChangedRecently: "What Changed Recently",
    waitingOnApproval: "Waiting On Approval",
    blockersAndRisks: "Blockers And Risks",
    whoOwnsWhat: "Who Owns What",
    trustedSources: "Trusted Sources",
    sourceTrustLevel: "Source Trust Level",
    sourceTrustPrimary: "Primary",
    sourceTrustSupporting: "Supporting",
    sourceTrustUnverified: "Unverified",
    sourceTrustSuperseded: "Superseded",
    sourceTrustConflicting: "Conflicting",
    sourceFreshness: "Source Freshness",
    freshnessCurrent: "Current",
    freshnessReviewDue: "Review Due",
    freshnessStale: "Stale",
    freshnessNotReviewed: "Not Reviewed",
    freshnessLastReviewed: "Last Reviewed",
    freshnessNextReview: "Next Review",
    lastReviewedBy: "Reviewed By",
    reviewFreshness: "Review Freshness",
    reviewSourceFreshness: "Review Source Freshness",
    freshnessReviewNotice: "Freshness is based only on a recorded human review and next-review date. File verification does not certify that source content is current.",
    freshnessReviewed: "Source freshness reviewed",
    staleSourceWarning: "Source review is stale or due.",
    validationReviewDueAfterReviewed: "Next review must be on or after the review date.",
    validationRelatedDecisionRequired: "Choose the earlier decision this decision supersedes or replaces.",
    trustBoundary: "Trust Boundary",
    trustBoundaryExternal: "Outside Input",
    trustBoundaryAirlock: "Airlock Proposal",
    trustBoundaryCore: "Project State Record",
    trustBoundaryReadOnly: "Read-only View / Export",
    trustBoundaryEvidenceNotice: "This label shows workflow position, not truth. Sources remain evidence and cannot approve themselves.",
    conflictRegister: "Conflict Register",
    addConflict: "Add Conflict",
    editConflict: "Edit Conflict",
    conflictTitle: "Conflict Title",
    conflictDescription: "Conflict Description",
    linkedItems: "Linked Items",
    conflictStatus: "Conflict Status",
    conflictUnresolved: "Unresolved",
    conflictUnderReview: "Under Review",
    conflictResolved: "Resolved",
    resolution: "Resolution",
    noConflictsRecorded: "No conflicts recorded.",
    aiAllowedHelp: "AI Allowed Help",
    doNotTouch: "Do Not Touch",
    handoffNoApprovalItems: "No approval items are waiting.",
    handoffNoBlockers: "No blockers or risks are recorded.",
    handoffNoAssignments: "No assignments or project roles are recorded.",
    handoffNoTrustedSources: "No verified or active sources are recorded.",
    handoffAiBoundary: "AI may summarize, search, draft, and suggest. AI may not approve, write to Core, write to Spine, delete history, or become source of truth.",
    handoffDoNotTouchDefault: "Do not bypass the Intake Airlock, overwrite history, approve incomplete items, or treat comments/source extracts as Core truth.",
    contextPack: "Context Pack",
    contextPackNotice: "Export a bounded local context packet for a future API or AI arm. This does not change Project State.",
    contextPackPreset: "Context Pack Preset",
    contextPresetCurrentState: "Current state only",
    contextPresetRecentDecisions: "Current state + recent decisions",
    contextPresetHandoff: "Full project handoff",
    contextPresetSourceResearch: "Source-heavy research context",
    contextPresetCodexImplementation: "Codex implementation context",
    contextPresetCustom: "Custom",
    contextPresetNotice: "Presets choose scope, budget, and included sections. Custom uses the controls below.",
    contextScope: "Context Scope",
    contextScopeProject: "This project only",
    contextScopeRelated: "This project and related projects",
    contextScopeSources: "Sources and extracts focus",
    contextBudget: "Context Budget",
    budgetQuick: "Quick scan",
    budgetNormal: "Normal review",
    budgetDeep: "Deep review",
    includeSources: "Include sources and extract chunks",
    includeHistory: "Include recent history",
    includeOpenWork: "Include open questions and next actions",
    includeDecisions: "Include decisions",
    includeFacts: "Include facts",
    includeRelationships: "Include relationships",
    exportContextPack: "Export Context Pack",
    linkedProjects: "Linked Projects",
    incomingLinks: "Incoming Links",
    outgoingLinks: "Outgoing Links",
    evidenceTrail: "Evidence Trail",
    sourceCoverage: "Source Coverage",
    unresolvedWork: "Unresolved Work",
    noLinkedProjects: "No linked projects recorded.",
    noEvidenceRecorded: "No sources or extracts recorded.",
    facts: "Facts",
    sources: "Sources",
    draftProjects: "Draft Projects",
    lastUpdated: "Last Updated",
    updated: "Updated",
    updatedBy: "Updated By",
    health: "Health",
    project: "Project",
    generated: "Generated",
    extract: "Extract",
    attachedImages: "Attached Images:",
    attachedSources: "Attached Sources:",
    added: "Added",
    localReference: "Local reference",
    allEvents: "All events",
    eventType: "Event Type",
    projectName: "Project Name",
    currentStatus: "Current Status",
    projectHealth: "Project Health",
    currentSummary: "Current Summary",
    backupFile: "Backup File",
    arm: "Arm",
    targetProject: "Target Project",
    proposedChangeType: "Proposed Change Type",
    intakeTitle: "Intake Title",
    proposedText: "Proposed Text",
    summaryContext: "Summary / Context",
    sourceOriginLabel: "Source / Origin Label",
    relationshipTargetOwner: "Relationship Target / Owner",
    dueDate: "Due Date",
    decision: "Decision",
    confidence: "Confidence",
    fact: "Fact",
    source: "Source",
    title: "Title",
    type: "Type",
    capitalizationDoesNotMatter: "Capitalization does not matter.",
    unknown: "Unknown",
    dateAdded: "Date Added",
    actor: "Actor",
    location: "Location",
    localFile: "Local File",
    modified: "Modified",
    findLocalFile: "Find Local File",
    browseFile: "Browse for file…",
    browseFolder: "Browse for folder…",
    filesLibrary: "Files",
    filesLibrarySubtitle: "Import, review, and track managed project files.",
    importFiles: "Import Files",
    importFolder: "Import Folder",
    noManagedFiles: "No managed files have been imported.",
    pendingFileImports: "Pending File Imports",
    approvedManagedFiles: "Approved Managed Files",
    fileImportReview: "Review File Import",
    fileImportReviewNotice: "Review the selected files and choose their destination project. Importing creates managed copies in Intake; it does not approve them into the project.",
    importToIntake: "Import to Intake",
    fileImportComplete: "Managed copies were created and sent to Intake.",
    unsupportedFilesSkipped: "Unsupported or unreadable files skipped",
    originalFilePreserved: "Original files remain in place and are never moved or deleted.",
    managedCopy: "Managed copy",
    originalLocation: "Original location",
    selectedFiles: "Selected files",
    fileImportFailed: "No files could be imported.",
    recursiveFolderImport: "Folders are scanned recursively for supported files.",
    verifyFile: "Verify File",
    verifySourceFiles: "Verify Source Files",
    sourceFileVerification: "Source File Verification",
    fileVerified: "File verified",
    fileChanged: "File changed",
    fileMissing: "File missing",
    fileUnverifiable: "File not verifiable",
    lastVerified: "Last verified",
    verificationReasonPlaceholder: "Why are source files being verified?",
    sourceFileVerificationComplete: "Source file verification complete.",
    sourceFileVerificationNotice: "Desktop mode can verify absolute local file paths. Desktop-required mode cannot verify local paths.",
    summary: "Summary",
    tags: "Tags",
    mode: "Mode",
    suggestionStatus: "Suggestion Status",
    truncated: "Truncated",
    related: "Related",
    relatedProjectOrEntity: "Related Project or Entity",
    relationshipType: "Relationship Type",
    notes: "Notes",
    name: "Name",
    draft: "Draft",
    approvedProjectName: "Approved Project Name",
    approvedProjectSummary: "Approved Project Summary",
    openQuestion: "Open Question",
    openQuestions: "Open Questions",
    context: "Context",
    nextAction: "Next Action",
    nextActions: "Next Actions",
    ownerField: "Owner",
    completedDate: "Completed Date",
    suggestedBy: "Suggested By",
    suggestedExtract: "Suggested Extract",
    imageFile: "Image File",
    captionNotes: "Caption / Notes",
    file: "File",
    factsReviewed: "Facts reviewed",
    decisionsReviewed: "Decisions reviewed",
    questionsReviewed: "Questions reviewed",
    actionsReviewed: "Actions reviewed",
    relationshipsReviewed: "Relationships reviewed",
    readyForApproval: "Ready for approval",
    due: "Due",
    notSet: "Not set",
    completed: "Completed",
    notCompleted: "Not completed",
    noDueDate: "No due date",
    searchResultsFor: "{count} results for \"{query}\"",
    noSearchResultsFor: "No results for \"{query}\"",
    limitCharacters: "Limit {limit} characters",
    viewImage: "View {name}",
    attachedImage: "Attached Image",
    draftProjectDefault: "Draft Project",
    changeHistory: "Change History",
    addSourceBeforeAttaching: "Add a source before attaching one to this object.",
    approvalAppliesChangeNotice: "Approval applies this proposed change to the selected project and records it in history.",
    approvalCreatesProjectNotice: "Approval creates a new project from this draft and records the approval on the draft.",
    approvalRecordsSuggestionNotice: "Approval records this AI suggestion as accepted by a human reviewer.",
    archivedProjectsNotice: "Archived projects are kept out of the active project list. Unarchive a project to return it to current use.",
    archivedProjectsEmpty: "Archived projects will appear here.",
    archiveIntakeNotice: "Archiving removes the intake from active review but keeps the record in the storage spine.",
    archiveObjectNotice: "Archiving removes the object from the current dashboard but keeps its history.",
    chooseProjectEmpty: "Choose a project to see its current state and history.",
    createProjectEmpty: "Create a project or open Archived Projects to restore one.",
    stateHistorySeparate: "Current state and historical record are kept in separate views.",
    deletionNotice: "Deletion does not remove data in v0.1. The project will be archived and flagged as pending deletion approval. The final approval process is still to be determined.",
    errorDetails: "Error Details",
    recoveryExportNotice: "Export the raw saved data before resetting. Reset should only be used after the failed data is backed up.",
    recoveryLoadNotice: "Project State could not safely load the saved local data. The original saved data has not been changed.",
    readsFileExtractNotice: "Reads TXT/MD directly. PDF and DOCX extraction is best-effort and stays local.",
    rejectIntakeNotice: "Rejecting keeps the intake record but prevents it from reaching Project State.",
    restoreBackupNotice: "Restore replaces the local storage spine with the selected backup file. This does not use a server.",
    createDraftFromExtractNotice: "This creates a draft from the selected extract. It does not create a new project until approved.",
    proposedChangeNotice: "This creates a proposed change only. It will not change Project State until approved.",
    unarchiveNotice: "Unarchiving returns the project to current use and records the approval in history.",
    validationReasonRequired: "A reason is required.",
    validationActorRequired: "Actor is required.",
    validationActorNameRequired: "Actor name is required.",
    validationActorExists: "An actor with this name already exists.",
    validationExtractFileType: "Choose a PDF, DOCX, TXT, or MD file.",
    validationImageFileType: "Choose a PNG, JPG, WEBP, or GIF image.",
    validationBackupFileType: "Choose a Project State backup JSON file.",
    validationDefaultActorArchive: "Choose a different default actor before archiving this actor.",
    validationActiveDefaultActor: "Choose an active default actor.",
    validationConfirmLocalMode: "Confirm local mode before continuing.",
    validationConfirmRestore: "Confirm restore before continuing.",
    validationNoReadableText: "No readable text was found in this file.",
    validationPrimaryActorRequired: "Primary actor is required.",
    validationStorageOverrideReason: "Record the storage override reason.",
    validationBackupOverrideReason: "Record the backup override reason.",
    validationRestoreReasonRequired: "Restore reason is required.",
    validationBackupUnreadable: "This backup file is not readable JSON.",
    validationInvalidBackup: "This is not a valid Project State backup.",
    validationReadExtractFailed: "Could not read text from this file.",
    notRecorded: "Not recorded",
    noErrorDetailsRecorded: "No error details recorded.",
    noCurrentStatusRecorded: "No current status recorded.",
    noStatusRecorded: "No status recorded.",
    noCurrentSummaryRecorded: "No current summary recorded.",
    noChangesRecordedForFilter: "No changes recorded for this filter.",
    noDecisionsRecorded: "No decisions recorded.",
    noFactsRecorded: "No facts recorded.",
    noSourcesRecorded: "No sources recorded.",
    noRelationshipsRecorded: "No relationships recorded.",
    noDraftProjects: "No draft projects.",
    noOpenQuestions: "No open questions.",
    noNextActions: "No next actions.",
    noRecentActivity: "No recent activity.",
    noDraftTextRecorded: "No draft text recorded.",
    noReasonRecorded: "No reason recorded.",
    noContextRecorded: "No context recorded.",
    noProposedTextRecorded: "No proposed text recorded.",
    noPendingIntake: "No pending intake. Future arms should land here before touching the core.",
    noReviewedIntake: "No reviewed intake yet.",
    searchEmptyHint: "Try a project name, decision, fact, source, action, relationship, image caption, or history reason.",
    missingProject: "Missing project",
    noTargetProject: "No target project",
    target: "Target",
    created: "Created",
    reviewedBy: "Reviewed by",
    approvedBy: "Approved by",
    untitled: "Untitled",
    untitledIntake: "Untitled intake",
    untitledObject: "Untitled object",
    untitledSource: "Untitled Source",
    attachedImageAlt: "Attached image",
    imageDataUnavailable: "Image data is not available.",
    calendar: "Calendar",
    meeting: "Meeting",
    api: "API",
    chat: "Chat",
    email: "Email",
    other: "Other",
    projectStatus: "Project Status",
    proposedChange: "Proposed Change",
    permissions: "Permissions",
    restrictions: "Restrictions",
    schemaVersion: "Schema Version",
    storageModeLabel: "Storage Mode",
    lastSettingsUpdate: "Last Settings Update",
    lastBackupExport: "Last Backup Export",
    lastRestore: "Last Restore",
    storageSpineVersion: "Storage Spine Version",
    storageLayout: "Storage Layout",
    storageSnapshotBytes: "Storage Snapshot Bytes",
    attachmentRecords: "Attachment Records",
    extractTextCharacters: "Extract Text Characters",
    storageSizeLabel: "Storage Size",
    activeProjectsLabel: "Active Projects",
    archivedProjectsLabel: "Archived Projects",
    actorsLabel: "Actors",
    changesLabel: "Changes",
    sourcesLabel: "Sources",
    extractsLabel: "Extracts",
    imagesLabel: "Images",
    integrityDashboard: "Integrity Dashboard",
    localApiArmTransport: "Local API Arm Transport",
    transportBoundaryNotice: "Loopback-only connector access. Submissions enter the Intake Airlock and still require individual human approval.",
    transportStatus: "Transport Status",
    transportRunning: "Running",
    transportStopped: "Stopped",
    transportAddress: "Local Address",
    secureToken: "Secure Token",
    secureStorage: "Secure Storage",
    configured: "Configured",
    notConfigured: "Not configured",
    available: "Available",
    unavailable: "Unavailable",
    transportLastError: "Last transport error",
    enableTransport: "Enable Transport",
    disableTransport: "Disable Transport",
    rotateTransportToken: "Rotate Token",
    revokeTransport: "Revoke Transport",
    transportEnableNotice: "Enabling opens a bearer-token-protected listener on 127.0.0.1 only. It does not grant approval authority.",
    transportDisableNotice: "Disabling stops the listener but retains the encrypted token for later use.",
    transportRotateNotice: "Rotating immediately invalidates the previous connector token.",
    transportRevokeNotice: "Revoking stops the listener and deletes the encrypted connector token.",
    transportPort: "Local Port",
    transportTokenTitle: "Connector Token",
    tokenOneTimeNotice: "Copy this token now and store it securely. Project State will not display it again unless you rotate it.",
    tokenSaved: "I Saved the Token",
    changedBy: "Changed By",
    integrityStatus: "Integrity Status",
    healthy: "Healthy",
    warning: "Warning",
    needsAttention: "Needs Attention",
    objectCounts: "Object Counts",
    storageHealth: "Storage Health",
    orphanLinks: "Orphan Links",
    sourceFileReferences: "Source File References",
    linkedUserIssues: "Linked User Issues",
    oversizedContent: "Oversized Content",
    recoverySignals: "Recovery Signals",
    noIntegrityIssues: "No integrity issues found.",
    noStorageWarnings: "No storage warnings.",
    noBrokenLinks: "No broken internal links found.",
    noSourceReferenceIssues: "No weak source file references found.",
    noLinkedUserIssues: "No linked-user issues found.",
    noOversizedContent: "No oversized content warnings.",
    noRecoverySignals: "No recovery signals found.",
    checkGenerated: "Check Generated",
    projectReference: "Project Reference",
    missingSourceDetails: "Source is missing location, local file metadata, and summary.",
    missingLinkedUser: "Source references a user that no longer exists.",
    missingAttachedSource: "Attached source link points to a missing source.",
    missingAttachedExtract: "Attached source link points to a missing extract.",
    missingImageReference: "Image attachment has no stored data or local reference.",
    missingImageTarget: "Image attachment points to a missing object.",
    missingRelationshipTarget: "Relationship points to a missing project.",
    largeExtractWarning: "Extract text is large.",
    largeAttachmentWarning: "Image attachment data is large.",
    recoveryModeNotActive: "Recovery mode is not active.",
    storageWarningStorageSizeDanger: "Storage size is near the browser limit.",
    storageWarningStorageSizeWarning: "Storage size is growing.",
    storageWarningAttachmentsDominateMainRecord: "Images are taking most of the main record.",
    storageWarningExtractsGrowingInMainRecord: "Extract text is growing inside the main record."
  },
  fr: {
    languageName: "Français",
    appTitle: "Project State",
    appKicker: "Dossier de projet local d’abord",
    openingTitle: "Ouverture de Project State",
    openingSubtitle: "Chargement de l’axe de stockage et vérification des dossiers de projet locaux.",
    search: "Rechercher",
    searchPlaceholder: "Rechercher des projets et des enregistrements",
    refreshStorage: "Actualiser",
    refreshedFromStorage: "Stockage actualisé.",
    storageRefreshFailed: "L’actualisation du stockage a échoué.",
    storageRecoveryNotice: "Project State n’a pas pu charger les données enregistrées. Les détails de récupération ont été conservés.",
    projects: "Projets",
    workInbox: "Boîte de travail",
    workInboxSubtitle: "Éléments qui demandent une attention humaine dans Project State.",
    inboxEmpty: "Rien ne demande d’attention pour le moment.",
    inboxEmptyDetail: "Les révisions en attente, travaux bloqués, problèmes de sources et actions à échéance apparaîtront ici.",
    readyToApprove: "Prêt à approuver",
    needsReview: "À réviser",
    blockedWork: "Bloqué",
    dueSoon: "Bientôt dû",
    overdue: "En retard",
    missingSource: "Source manquante",
    integrityWarning: "Avertissement d’intégrité",
    draftWaiting: "Brouillon en attente",
    openQuestionNeedsAction: "Question sans action",
    goToProject: "Aller au projet",
    goToIntake: "Aller à l’entrée",
    goToSettings: "Aller aux paramètres",
    openItem: "Ouvrir l’élément",
    assignment: "Affectation",
    assignments: "Affectations",
    assignObject: "Affecter",
    assignedTo: "Affecté à",
    assignmentRole: "Rôle d’affectation",
    assignmentOwner: "Responsable",
    assignmentReviewer: "Réviseur",
    assignmentApprover: "Approbateur",
    assignmentWatcher: "Observateur",
    comments: "Commentaires",
    reviewThread: "Fil de révision",
    addComment: "Ajouter un commentaire",
    commentText: "Commentaire",
    commentsNotPrivateNotice: "Les commentaires font partie du dossier du projet et ne sont pas privés.",
    reviewState: "État de révision",
    projectRoles: "Rôles du projet",
    manageProjectRoles: "Gérer les rôles du projet",
    projectRole: "Rôle du projet",
    proposalDiff: "Diff de proposition",
    currentValue: "Valeur actuelle",
    proposedValue: "Valeur proposée",
    conflictWarning: "Avertissement de conflit",
    changedSinceOpened: "Cet enregistrement a peut-être changé depuis son ouverture. Révisez avant d’approuver.",
    notificationQueue: "File de notifications",
    assignedToYou: "Affecté à vous",
    aiWorkOrders: "Ordres de travail IA",
    aiWorkOrder: "Ordre de travail IA",
    aiWorkOrdersSubtitle: "Demandes de travail créées par des humains pour de futurs bras IA. Les sorties doivent revenir par l’airlock.",
    createAiWorkOrder: "Créer un ordre de travail IA",
    aiWorkOrderNotice: "Cela crée seulement un ordre de travail. Cela n’appelle pas l’IA et ne modifie pas Project State.",
    workOrderTask: "Tâche",
    outputType: "Type de sortie",
    canCreateIntake: "Peut créer des propositions d’entrée",
    noAiWorkOrders: "Aucun ordre de travail IA enregistré.",
    inProgress: "En cours",
    revisionRequested: "Révision demandée",
    projectConfidence: "Confiance du projet",
    projectCompleteness: "Complétude du projet",
    airlockCompleteness: "Complétude de l’airlock",
    airlockIncompleteNotice: "Cet élément est incomplet et ne peut pas passer l’airlock.",
    requiredAirlockChecks: "Vérifications d’airlock requises",
    present: "Présent",
    missing: "Manquant",
    hasCurrentStatus: "Statut actuel",
    hasCurrentSummary: "Résumé actuel",
    hasNextAction: "Prochaine action",
    hasRecentDecision: "Décision récente",
    hasSourceReference: "Référence source",
    sourceFilesClear: "Fichiers source clairs",
    healthNotBlocked: "Non bloqué ou à risque",
    targetProjectSelected: "Projet cible sélectionné",
    proposedTitleRecorded: "Titre de proposition enregistré",
    proposedTextRecorded: "Texte de proposition enregistré",
    proposedTypeSelected: "Type de proposition sélectionné",
    queueMarkedReady: "File marquée prête",
    draftNameRecorded: "Nom du brouillon enregistré",
    draftTextRecorded: "Texte du brouillon enregistré",
    draftReviewComplete: "Révision du brouillon complète",
    draftSourceLinked: "Source et extrait liés",
    archivedProjects: "Projets archivés",
    intake: "Entrée",
    backup: "Sauvegarde",
    restore: "Restaurer",
    exportJson: "Exporter JSON",
    addIntake: "Ajouter une entrée",
    createProject: "Créer un projet",
    addMenu: "Ajouter",
    moreActions: "Autres actions",
    viewDetails: "Voir les détails",
    objectDetails: "Détails de l’objet",
    closeDetails: "Fermer les détails",
    continueWorking: "Continuer le travail",
    continueLastProject: "Reprendre le dernier projet",
    recentProjects: "Projets récents",
    noRecentProjects: "Aucun projet ouvert récemment.",
    batchTriage: "Triage groupé",
    batchTriageNotice: "Le triage modifie uniquement l’état de la file. Chaque approbation exige toujours sa propre révision humaine, confirmation, acteur et raison.",
    selectIntakeItems: "Sélectionner les entrées",
    applyTriage: "Appliquer le triage",
    proposeCorrection: "Proposer une correction",
    correctionNotice: "Ceci crée une proposition dans l’Airlock. L’enregistrement approuvé ne change pas avant l’approbation humaine.",
    correctedContent: "Contenu corrigé",
    correctionProposed: "Correction proposée",
    correctionApproved: "Correction approuvée",
    permissionDenied: "Le rôle de l’acteur sélectionné n’autorise pas cette action.",
    currentActorRole: "Rôle actuel de l’acteur",
    openReferencedObject: "Ouvrir l’objet référencé",
    backToProjects: "Retour aux projets",
    saved: "Enregistré",
    setupTitle: "Configurer Project State",
    setupSubtitle: "Ceci configure l’utilisation locale, les indications de sauvegarde et l’acteur principal pour les changements approuvés.",
    primaryActor: "Acteur principal",
    backupLocation: "Emplacement de sauvegarde",
    backupLocationPlaceholder: "Exemple : disque externe / sauvegardes Project State",
    backupReminder: "Rappel de sauvegarde",
    language: "Langue",
    localModeConfirm: "Je comprends qu’il s’agit d’un mode local mono-utilisateur et que les sauvegardes sont contrôlées par l’utilisateur.",
    recoveryWarnings: "Afficher les avertissements de stockage et de récupération.",
    saveSetup: "Enregistrer la configuration",
    manual: "Manuel",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    active: "Actif",
    blocked: "Bloqué",
    atRisk: "À risque",
    complete: "Terminé",
    onHold: "En attente",
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    archived: "Archivé",
    withApproval: "Avec approbation",
    aiSuggested: "Suggérée par l’IA",
    settings: "Paramètres",
    settingsSubtitle: "Configuration locale de l’application pour la langue, les acteurs, le stockage, la sauvegarde, la récupération et la politique de sécurité.",
    coreSettings: "Paramètres principaux",
    defaultLanguage: "Langue par défaut",
    defaultActor: "Acteur par défaut",
    saveCoreSettings: "Enregistrer les paramètres principaux",
    usersActors: "Utilisateurs / Acteurs",
    noActorsRecorded: "Aucun acteur enregistré.",
    newActorName: "Nom du nouvel acteur",
    role: "Rôle",
    addActor: "Ajouter un acteur",
    storageSystem: "Système de stockage",
    platformStorageSpine: "Axe de stockage de plateforme",
    platformAdapterLabel: "Adaptateur de plateforme",
    primaryStorage: "Stockage principal",
    localBrowserStorageSpine: "Axe de stockage local du navigateur",
    desktopRuntime: "Runtime d’application de bureau",
    desktopRuntimeReady: "Axe de stockage de bureau actif.",
    browserDevRuntime: "Runtime navigateur / développement",
    browserRuntimeWarning: "Project State fonctionne sans le pont de bureau. Le mode navigateur sert uniquement à l’export hérité, à la migration et au développement ; utilisez l’application de bureau pour le stockage complet, la sauvegarde, la restauration, l’entrée et les API.",
    browserDevGateTitle: "Mode navigateur/développement",
    browserDevGateSubtitle: "Le pont de bureau est requis pour le vrai mode Project State.",
    browserDevGateNotice: "Cet écran peut inspecter les données locales chargées et exporter les données brutes pour migration. Il n’enregistre pas, ne migre pas, ne sauvegarde pas, ne restaure pas, n’intègre pas et ne modifie pas les enregistrements Project State en silence.",
    browserDevGateReadOnly: "Accès lecture seule/développement",
    browserDevGateCounts: "Enregistrements chargés",
    browserDevNoSilentStorage: "Aucun travail de stockage sérieux ne s’exécute sans le pont de bureau.",
    saveBlockedApproval: "Changements non enregistrés : la porte d’approbation a bloqué l’enregistrement",
    saveStorageFailed: "Changements non enregistrés : {message}",
    storageFailed: "échec du stockage",
    savedAt: "Enregistré {time}",
    unsavedChanges: "Changements non enregistrés",
    storageWarningTitle: "Avertissement de stockage",
    storageWarningDanger: "Les données locales enregistrées sont très volumineuses. Le stockage navigateur peut bientôt échouer, surtout avec des images ou de longs extraits.",
    storageWarningNotice: "Les données locales enregistrées deviennent volumineuses. Les images et les longs extraits peuvent ralentir les enregistrements.",
    currentSizeSentence: "Taille actuelle : {size}.",
    resetFailedDataConfirmFirst: "Réinitialiser les données locales Project State ? Exportez d’abord les données en échec. Cela efface uniquement les données locales enregistrées par cette application.",
    resetFailedDataConfirmSecond: "Confirmation finale : réinitialiser les données locales et repartir avec un espace Project State vide ?",
    resetAllDataConfirmFirst: "Réinitialiser toutes les données locales Project State ? Exportez d’abord une sauvegarde complète. Cela efface uniquement les données locales enregistrées par cette application.",
    resetAllDataConfirmSecond: "Confirmation finale : réinitialiser les données locales et revenir à la configuration initiale ?",
    resetComplete: "Réinitialisation terminée",
    currentMode: "Mode actuel",
    currentSize: "Taille actuelle",
    storageOverrideAcknowledged: "Enregistrer qu’une exception de stockage ou de migration a été reconnue.",
    storageOverrideReason: "Raison de l’exception de stockage",
    saveStorageSettings: "Enregistrer les paramètres de stockage",
    backupSystem: "Système de sauvegarde",
    backupLocationWarning: "Le stockage principal et la sauvegarde ne doivent pas être au même emplacement, sauf dans un déploiement avec serveur.",
    backupOverrideAcknowledged: "Autoriser une exception d’emplacement de sauvegarde avec avertissement enregistré.",
    backupOverrideReason: "Raison de l’exception de sauvegarde",
    desktopBackupPackageNotice: "Créer un paquet de sauvegarde de bureau depuis l’axe de stockage actif. L’acteur, l’horodatage et la raison sont obligatoires.",
    exportedBy: "Exporté par",
    backupReason: "Raison de la sauvegarde",
    backupPackageCreated: "Paquet de sauvegarde créé",
    backupPackageUnavailable: "La prise en charge du paquet de sauvegarde de bureau n’est pas disponible.",
    exportFullBackup: "Exporter la sauvegarde complète",
    restoreBackup: "Restaurer une sauvegarde",
    saveBackupSettings: "Enregistrer les paramètres de sauvegarde",
    recovery: "Récupération",
    recoveryControlsNotice: "Les contrôles de récupération sont uniquement locaux. Exportez avant de réinitialiser.",
    exportRawCurrentData: "Exporter les données brutes actuelles",
    resetLocalData: "Réinitialiser les données locales",
    approvalAirlock: "Approbation / Airlock",
    lockedOn: "Verrouillé",
    approvalPolicyHuman: "Une approbation humaine est requise avant que l’entrée atteigne le noyau.",
    approvalPolicyAudit: "Les changements de projet et d’objet exigent acteur, horodatage, raison et détails de l’objet modifié.",
    approvalPolicyArms: "Les bras externes écrivent d’abord dans l’entrée, pas directement dans Project State ni dans l’axe de stockage.",
    diagnostics: "Diagnostics",
    actorName: "Nom de l’acteur",
    actorId: "ID de l’acteur",
    emailAddress: "Adresse e-mail",
    chatHandle: "Identifiant de chat",
    linkedUsers: "Utilisateurs liés",
    linkedProjectStateUsers: "Utilisateurs Project State liés",
    noLinkedUsers: "Aucun utilisateur lié.",
    communicationRecordsNotice: "Les chats et e-mails enregistrés sont des dossiers Project State. Ils ne sont pas privés.",
    userPrivacyNotice: "Les utilisateurs de Project State doivent considérer que les chats, e-mails, sources et historiques de projet enregistrés sont visibles par les utilisateurs Project State autorisés.",
    defaultActorPill: "Acteur par défaut",
    saveActor: "Enregistrer l’acteur",
    owner: "Propriétaire",
    admin: "Administrateur",
    projectLead: "Responsable de projet",
    approver: "Approbateur",
    editor: "Éditeur",
    contributor: "Contributeur",
    reviewer: "Réviseur",
    auditor: "Auditeur",
    viewer: "Lecteur",
    aiTool: "IA / Outil",
    reason: "Raison",
    status: "Statut",
    storageMigrationNotice: "Le stockage principal est intégré à cette application locale. Changer de système de stockage plus tard doit être traité comme une migration, pas comme un simple paramètre.",
    settingsReasonPlaceholder: "Pourquoi ces paramètres changent-ils ?",
    storageReasonPlaceholder: "Pourquoi les paramètres de stockage changent-ils ?",
    backupReasonPlaceholder: "Pourquoi les paramètres de sauvegarde changent-ils ?",
    actorReasonPlaceholder: "Pourquoi cet acteur change-t-il ?",
    addActorReasonPlaceholder: "Pourquoi cet acteur est-il ajouté ?",
    restoredBy: "Restauré par",
    restoreReason: "Raison de la restauration",
    permissionMatrix: "Matrice des permissions",
    permissionMatrixNote: "Les permissions de rôle contrôlent les actions affichées pour l’acteur par défaut configuré. Cela reste une politique locale mono-utilisateur, pas une authentification de compte.",
    createPermission: "Créer",
    editPermission: "Modifier",
    approvePermission: "Approuver",
    auditPermission: "Auditer",
    adminPermission: "Admin",
    yes: "O",
    no: "N",
    mandatoryHistory: "Historique obligatoire",
    mandatoryHistoryNote: "Chaque changement approuvé de Project State doit enregistrer qui l’a fait, quand, pourquoi, ce qui a changé, comment il est entré dans le noyau et la langue active de l’interface.",
    historyFieldActor: "Acteur",
    historyFieldTimestamp: "Horodatage",
    historyFieldReason: "Raison",
    historyFieldObject: "Objet modifié",
    historyFieldHow: "Mode de changement",
    historyFieldLanguage: "Langue",
    howChanged: "Mode",
    languageAtChange: "Langue",
    addDecision: "Ajouter une décision",
    addExtract: "Ajouter un extrait",
    addFact: "Ajouter un fait",
    addNextAction: "Ajouter une prochaine action",
    addOpenQuestion: "Ajouter une question ouverte",
    addRelationship: "Ajouter une relation",
    addSource: "Ajouter une source",
    approve: "Approuver",
    approveDraft: "Approuver le brouillon",
    approveExtract: "Approuver l’extrait",
    archive: "Archiver",
    attachImage: "Joindre une image",
    attachSource: "Joindre une source",
    cancel: "Annuler",
    clearSearch: "Effacer la recherche",
    createDraftProject: "Créer un projet brouillon",
    dashboard: "Tableau de bord",
    deleteProject: "Supprimer le projet",
    edit: "Modifier",
    editStatus: "Modifier le statut",
    exportFailedData: "Exporter les données en échec",
    markComplete: "Marquer terminé",
    onePageOverview: "Vue d’ensemble d’une page",
    open: "Ouvrir",
    readFileExtract: "Lire un extrait de fichier",
    reject: "Rejeter",
    review: "Réviser",
    suggestExtract: "Suggérer un extrait",
    unarchiveProject: "Désarchiver le projet",
    viewFullHistory: "Voir tout l’historique",
    viewHistory: "Voir l’historique",
    close: "Fermer",
    saveToAirlock: "Enregistrer dans l’airlock",
    approveToProjectState: "Approuver vers Project State",
    approveProject: "Approuver le projet",
    requestDeletion: "Demander la suppression",
    approveUnarchive: "Approuver le désarchivage",
    approveChange: "Approuver le changement",
    approveEdit: "Approuver la modification",
    createDraft: "Créer un brouillon",
    saveReview: "Enregistrer la révision",
    approveToProject: "Approuver vers le projet",
    approveCompletion: "Approuver l’achèvement",
    recordSuggestion: "Enregistrer la suggestion",
    approveAttachment: "Approuver la pièce jointe",
    approveImage: "Approuver l’image",
    approveArchive: "Approuver l’archivage",
    approveDecision: "Approuver la décision",
    approveFact: "Approuver le fait",
    approveSource: "Approuver la source",
    approveRelationship: "Approuver la relation",
    approveQuestion: "Approuver la question",
    approveAction: "Approuver l’action",
    restoreProjectStateBackup: "Restaurer une sauvegarde Project State",
    approveIntake: "Approuver l’entrée",
    rejectIntake: "Rejeter l’entrée",
    archiveIntake: "Archiver l’entrée",
    editCurrentStatus: "Modifier le statut actuel",
    editProject: "Modifier le projet",
    editDecision: "Modifier la décision",
    editFact: "Modifier le fait",
    editSource: "Modifier la source",
    editExtract: "Modifier l’extrait",
    editRelationship: "Modifier la relation",
    reviewDraftProject: "Réviser le projet brouillon",
    editOpenQuestion: "Modifier la question ouverte",
    editNextAction: "Modifier la prochaine action",
    markActionComplete: "Marquer l’action terminée",
    relationshipPlaceholder: "Parent, enfant, dépendance, lié",
    historyReason: "Raison",
    historyChanged: "Modifié",
    savedDataNeedsRecovery: "Les données enregistrées doivent être récupérées",
    noActiveProjects: "Aucun projet actif",
    noArchivedProjects: "Aucun projet archivé",
    roleDefinitions: "Définitions des rôles",
    intakeAirlock: "Airlock d’entrée",
    intakeAirlockSubtitle: "Les bras externes peuvent proposer des changements ici. Une approbation humaine est requise avant toute entrée dans Project State.",
    approvalQueueSummary: "Résumé de la file d’approbation",
    approvalQueueReview: "Révision de la file",
    approvalQueueReviewNotice: "La révision de file trie une entrée. Elle n’approuve pas le changement et ne l’écrit pas dans Project State.",
    approvalChecklist: "Liste de vérification d’approbation",
    queueState: "État de la file",
    queueNew: "Nouveau",
    queueNeedsReview: "À réviser",
    queueReady: "Prêt",
    queueBlocked: "Bloqué",
    reviewQueueItem: "Réviser l’entrée",
    saveQueueReview: "Enregistrer la révision",
    queueReviewNotes: "Notes de révision",
    approvalQueueReadyRequired: "La révision de file doit marquer cette entrée comme prête avant l’approbation.",
    confirmProposalReviewed: "J’ai révisé la proposition et le projet cible.",
    confirmApprovalWritesCore: "Je comprends que l’approbation écrit cette proposition dans Project State.",
    confirmInputsNotAuthority: "Je comprends que les conversations, fichiers et suggestions IA externes sont des entrées, pas l’autorité.",
    age: "Âge",
    pendingReview: "En attente de révision",
    reviewedIntake: "Entrées révisées",
    currentState: "État actuel",
    currentObjects: "Objets actuels",
    recentActivity: "Activité récente",
    recentDecisions: "Décisions récentes",
    decisionRelationship: "Relation entre décisions",
    decisionNoRelationship: "Aucune décision antérieure",
    supersedesDecision: "Annule et remplace une décision antérieure",
    replacesDecision: "Remplace une décision antérieure",
    supersedes: "Annule et remplace",
    replaces: "Remplace",
    supersededBy: "Annulée et remplacée par",
    replacedBy: "Remplacée par",
    missingDecision: "Décision manquante",
    whatChangedSince: "Ce qui a changé depuis…",
    whatChangedSinceSubtitle: "Une vue en lecture seule des changements enregistrés depuis la date sélectionnée.",
    sinceDate: "Depuis la date",
    changesFound: "Changements trouvés",
    noChangesSince: "Aucun changement enregistré depuis cette date.",
    relationships: "Relations",
    projectMap: "Carte du projet",
    projectMapSubtitle: "Relations, preuves et travail non résolu autour de ce projet.",
    handoffMode: "Mode transmission",
    handoffSubtitle: "Un briefing en lecture seule pour une personne ou une aide IA qui rejoint ce projet.",
    exportHandoff: "Exporter la transmission",
    whatThisProjectIs: "Ce qu’est ce projet",
    whyItMatters: "Pourquoi c’est important",
    whatChangedRecently: "Ce qui a changé récemment",
    waitingOnApproval: "En attente d’approbation",
    blockersAndRisks: "Blocages et risques",
    whoOwnsWhat: "Qui possède quoi",
    trustedSources: "Sources fiables",
    sourceTrustLevel: "Niveau de confiance de la source",
    sourceTrustPrimary: "Primaire",
    sourceTrustSupporting: "Appui",
    sourceTrustUnverified: "Non vérifiée",
    sourceTrustSuperseded: "Remplacée",
    sourceTrustConflicting: "En conflit",
    sourceFreshness: "Actualité de la source",
    freshnessCurrent: "À jour",
    freshnessReviewDue: "Révision bientôt due",
    freshnessStale: "Périmée",
    freshnessNotReviewed: "Non révisée",
    freshnessLastReviewed: "Dernière révision",
    freshnessNextReview: "Prochaine révision",
    lastReviewedBy: "Révisée par",
    reviewFreshness: "Réviser l’actualité",
    reviewSourceFreshness: "Réviser l’actualité de la source",
    freshnessReviewNotice: "L’actualité repose uniquement sur une révision humaine enregistrée et une date de prochaine révision. La vérification du fichier ne certifie pas que le contenu est à jour.",
    freshnessReviewed: "Actualité de la source révisée",
    staleSourceWarning: "La révision de la source est périmée ou bientôt due.",
    validationReviewDueAfterReviewed: "La prochaine révision doit être le même jour ou après la date de révision.",
    validationRelatedDecisionRequired: "Choisissez la décision antérieure que cette décision annule ou remplace.",
    trustBoundary: "Frontière de confiance",
    trustBoundaryExternal: "Entrée externe",
    trustBoundaryAirlock: "Proposition dans l’Airlock",
    trustBoundaryCore: "Enregistrement Project State",
    trustBoundaryReadOnly: "Vue / exportation en lecture seule",
    trustBoundaryEvidenceNotice: "Cette étiquette indique la position dans le flux, pas la vérité. Les sources restent des preuves et ne peuvent pas s’approuver elles-mêmes.",
    conflictRegister: "Registre des conflits",
    addConflict: "Ajouter un conflit",
    editConflict: "Modifier le conflit",
    conflictTitle: "Titre du conflit",
    conflictDescription: "Description du conflit",
    linkedItems: "Éléments liés",
    conflictStatus: "État du conflit",
    conflictUnresolved: "Non résolu",
    conflictUnderReview: "En révision",
    conflictResolved: "Résolu",
    resolution: "Résolution",
    noConflictsRecorded: "Aucun conflit enregistré.",
    aiAllowedHelp: "Aide IA autorisée",
    doNotTouch: "Ne pas toucher",
    handoffNoApprovalItems: "Aucun élément n’attend d’approbation.",
    handoffNoBlockers: "Aucun blocage ou risque n’est enregistré.",
    handoffNoAssignments: "Aucune affectation ou rôle de projet n’est enregistré.",
    handoffNoTrustedSources: "Aucune source vérifiée ou active n’est enregistrée.",
    handoffAiBoundary: "L’IA peut résumer, chercher, rédiger et suggérer. L’IA ne peut pas approuver, écrire dans le Core, écrire dans la Spine, supprimer l’historique ou devenir source de vérité.",
    handoffDoNotTouchDefault: "Ne contournez pas l’Intake Airlock, n’écrasez pas l’historique, n’approuvez pas les éléments incomplets et ne traitez pas les commentaires ou extraits comme vérité Core.",
    contextPack: "Paquet de contexte",
    contextPackNotice: "Exporter un paquet de contexte local et borné pour un futur bras API ou IA. Cela ne modifie pas Project State.",
    contextPackPreset: "Préréglage du paquet de contexte",
    contextPresetCurrentState: "État actuel uniquement",
    contextPresetRecentDecisions: "État actuel + décisions récentes",
    contextPresetHandoff: "Transmission complète du projet",
    contextPresetSourceResearch: "Contexte de recherche axé sources",
    contextPresetCodexImplementation: "Contexte d’implémentation Codex",
    contextPresetCustom: "Personnalisé",
    contextPresetNotice: "Les préréglages choisissent la portée, le budget et les sections incluses. Personnalisé utilise les contrôles ci-dessous.",
    contextScope: "Portée du contexte",
    contextScopeProject: "Ce projet uniquement",
    contextScopeRelated: "Ce projet et les projets liés",
    contextScopeSources: "Sources et extraits en priorité",
    contextBudget: "Budget de contexte",
    budgetQuick: "Analyse rapide",
    budgetNormal: "Révision normale",
    budgetDeep: "Révision approfondie",
    includeSources: "Inclure les sources et morceaux d’extraits",
    includeHistory: "Inclure l’historique récent",
    includeOpenWork: "Inclure les questions ouvertes et prochaines actions",
    includeDecisions: "Inclure les décisions",
    includeFacts: "Inclure les faits",
    includeRelationships: "Inclure les relations",
    exportContextPack: "Exporter le paquet de contexte",
    linkedProjects: "Projets liés",
    incomingLinks: "Liens entrants",
    outgoingLinks: "Liens sortants",
    evidenceTrail: "Piste de preuves",
    sourceCoverage: "Couverture des sources",
    unresolvedWork: "Travail non résolu",
    noLinkedProjects: "Aucun projet lié enregistré.",
    noEvidenceRecorded: "Aucune source ou extrait enregistré.",
    facts: "Faits",
    sources: "Sources",
    draftProjects: "Projets brouillons",
    lastUpdated: "Dernière mise à jour",
    updated: "Mis à jour",
    updatedBy: "Mis à jour par",
    health: "Santé",
    project: "Projet",
    generated: "Généré",
    extract: "Extrait",
    attachedImages: "Images jointes :",
    attachedSources: "Sources jointes :",
    added: "Ajouté",
    localReference: "Référence locale",
    allEvents: "Tous les événements",
    eventType: "Type d’événement",
    projectName: "Nom du projet",
    currentStatus: "Statut actuel",
    projectHealth: "Santé du projet",
    currentSummary: "Résumé actuel",
    backupFile: "Fichier de sauvegarde",
    arm: "Bras",
    targetProject: "Projet cible",
    proposedChangeType: "Type de changement proposé",
    intakeTitle: "Titre de l’entrée",
    proposedText: "Texte proposé",
    summaryContext: "Résumé / Contexte",
    sourceOriginLabel: "Libellé de source / origine",
    relationshipTargetOwner: "Cible / responsable de la relation",
    dueDate: "Date d’échéance",
    decision: "Décision",
    confidence: "Confiance",
    fact: "Fait",
    source: "Source",
    title: "Titre",
    type: "Type",
    capitalizationDoesNotMatter: "Les majuscules et minuscules n’ont pas d’importance.",
    unknown: "Inconnu",
    dateAdded: "Date ajoutée",
    actor: "Acteur",
    location: "Emplacement",
    localFile: "Fichier local",
    modified: "Modifié",
    findLocalFile: "Trouver un fichier local",
    browseFile: "Parcourir les fichiers…",
    browseFolder: "Parcourir les dossiers…",
    filesLibrary: "Fichiers",
    filesLibrarySubtitle: "Importer, réviser et suivre les fichiers de projet gérés.",
    importFiles: "Importer des fichiers",
    importFolder: "Importer un dossier",
    noManagedFiles: "Aucun fichier géré n’a été importé.",
    pendingFileImports: "Importations de fichiers en attente",
    approvedManagedFiles: "Fichiers gérés approuvés",
    fileImportReview: "Réviser l’importation de fichiers",
    fileImportReviewNotice: "Révisez les fichiers sélectionnés et choisissez leur projet de destination. L’importation crée des copies gérées dans l’entrée sans les approuver dans le projet.",
    importToIntake: "Importer vers l’entrée",
    fileImportComplete: "Des copies gérées ont été créées et envoyées à l’entrée.",
    unsupportedFilesSkipped: "Fichiers non pris en charge ou illisibles ignorés",
    originalFilePreserved: "Les fichiers originaux restent en place et ne sont jamais déplacés ni supprimés.",
    managedCopy: "Copie gérée",
    originalLocation: "Emplacement d’origine",
    selectedFiles: "Fichiers sélectionnés",
    fileImportFailed: "Aucun fichier n’a pu être importé.",
    recursiveFolderImport: "Les dossiers sont analysés récursivement pour les fichiers pris en charge.",
    verifyFile: "Vérifier le fichier",
    verifySourceFiles: "Vérifier les fichiers source",
    sourceFileVerification: "Vérification des fichiers source",
    fileVerified: "Fichier vérifié",
    fileChanged: "Fichier modifié",
    fileMissing: "Fichier manquant",
    fileUnverifiable: "Fichier non vérifiable",
    lastVerified: "Dernière vérification",
    verificationReasonPlaceholder: "Pourquoi les fichiers source sont-ils vérifiés ?",
    sourceFileVerificationComplete: "Vérification des fichiers source terminée.",
    sourceFileVerificationNotice: "Le mode bureau peut vérifier les chemins locaux absolus. Le mode navigateur/développement peut seulement marquer les fichiers source comme non vérifiables.",
    summary: "Résumé",
    tags: "Étiquettes",
    mode: "Mode",
    suggestionStatus: "Statut de suggestion",
    truncated: "Tronqué",
    related: "Lié",
    relatedProjectOrEntity: "Projet ou entité liée",
    relationshipType: "Type de relation",
    notes: "Notes",
    name: "Nom",
    draft: "Brouillon",
    approvedProjectName: "Nom du projet approuvé",
    approvedProjectSummary: "Résumé du projet approuvé",
    openQuestion: "Question ouverte",
    openQuestions: "Questions ouvertes",
    context: "Contexte",
    nextAction: "Prochaine action",
    nextActions: "Prochaines actions",
    ownerField: "Responsable",
    completedDate: "Date d’achèvement",
    suggestedBy: "Suggéré par",
    suggestedExtract: "Extrait suggéré",
    imageFile: "Fichier image",
    captionNotes: "Légende / Notes",
    file: "Fichier",
    factsReviewed: "Faits revus",
    decisionsReviewed: "Décisions revues",
    questionsReviewed: "Questions revues",
    actionsReviewed: "Actions revues",
    relationshipsReviewed: "Relations revues",
    readyForApproval: "Prêt pour approbation",
    due: "Échéance",
    notSet: "Non défini",
    completed: "Terminé",
    notCompleted: "Non terminé",
    noDueDate: "Aucune échéance",
    searchResultsFor: "{count} résultats pour « {query} »",
    noSearchResultsFor: "Aucun résultat pour « {query} »",
    limitCharacters: "Limite de {limit} caractères",
    viewImage: "Voir {name}",
    attachedImage: "Image jointe",
    draftProjectDefault: "Projet brouillon",
    changeHistory: "Historique des changements",
    addSourceBeforeAttaching: "Ajoutez une source avant d’en joindre une à cet objet.",
    approvalAppliesChangeNotice: "L’approbation applique ce changement proposé au projet sélectionné et l’enregistre dans l’historique.",
    approvalCreatesProjectNotice: "L’approbation crée un nouveau projet à partir de ce brouillon et enregistre l’approbation sur le brouillon.",
    approvalRecordsSuggestionNotice: "L’approbation enregistre cette suggestion de l’IA comme acceptée par un réviseur humain.",
    archivedProjectsNotice: "Les projets archivés sont retirés de la liste des projets actifs. Désarchivez un projet pour le remettre en usage courant.",
    archivedProjectsEmpty: "Les projets archivés apparaîtront ici.",
    archiveIntakeNotice: "L’archivage retire l’entrée de la révision active mais conserve l’enregistrement dans l’axe de stockage.",
    archiveObjectNotice: "L’archivage retire l’objet du tableau de bord actuel mais conserve son historique.",
    chooseProjectEmpty: "Choisissez un projet pour voir son état actuel et son historique.",
    createProjectEmpty: "Créez un projet ou ouvrez Projets archivés pour en restaurer un.",
    stateHistorySeparate: "L’état actuel et l’historique sont conservés dans des vues séparées.",
    deletionNotice: "La suppression ne retire pas les données dans la v0.1. Le projet sera archivé et marqué comme en attente d’approbation de suppression. Le processus final d’approbation reste à déterminer.",
    errorDetails: "Détails de l’erreur",
    recoveryExportNotice: "Exportez les données brutes enregistrées avant de réinitialiser. La réinitialisation ne doit être utilisée qu’après sauvegarde des données défaillantes.",
    recoveryLoadNotice: "Project State n’a pas pu charger les données locales enregistrées en toute sécurité. Les données originales n’ont pas été modifiées.",
    readsFileExtractNotice: "Lit TXT/MD directement. L’extraction PDF et DOCX est au mieux et reste locale.",
    rejectIntakeNotice: "Le rejet conserve l’entrée mais l’empêche d’atteindre Project State.",
    restoreBackupNotice: "La restauration remplace l’axe de stockage local par le fichier de sauvegarde sélectionné. Aucun serveur n’est utilisé.",
    createDraftFromExtractNotice: "Cela crée un brouillon à partir de l’extrait sélectionné. Aucun nouveau projet n’est créé avant approbation.",
    proposedChangeNotice: "Cela crée seulement un changement proposé. Project State ne sera pas modifié avant approbation.",
    unarchiveNotice: "Le désarchivage remet le projet en usage courant et enregistre l’approbation dans l’historique.",
    validationReasonRequired: "Une raison est requise.",
    validationActorRequired: "L’acteur est requis.",
    validationActorNameRequired: "Le nom de l’acteur est requis.",
    validationActorExists: "Un acteur portant ce nom existe déjà.",
    validationExtractFileType: "Choisissez un fichier PDF, DOCX, TXT ou MD.",
    validationImageFileType: "Choisissez une image PNG, JPG, WEBP ou GIF.",
    validationBackupFileType: "Choisissez un fichier JSON de sauvegarde Project State.",
    validationDefaultActorArchive: "Choisissez un autre acteur par défaut avant d’archiver celui-ci.",
    validationActiveDefaultActor: "Choisissez un acteur par défaut actif.",
    validationConfirmLocalMode: "Confirmez le mode local avant de continuer.",
    validationConfirmRestore: "Confirmez la restauration avant de continuer.",
    validationNoReadableText: "Aucun texte lisible n’a été trouvé dans ce fichier.",
    validationPrimaryActorRequired: "L’acteur principal est requis.",
    validationStorageOverrideReason: "Enregistrez la raison de l’exception de stockage.",
    validationBackupOverrideReason: "Enregistrez la raison de l’exception de sauvegarde.",
    validationRestoreReasonRequired: "La raison de restauration est requise.",
    validationBackupUnreadable: "Ce fichier de sauvegarde n’est pas un JSON lisible.",
    validationInvalidBackup: "Ce n’est pas une sauvegarde Project State valide.",
    validationReadExtractFailed: "Impossible de lire le texte de ce fichier.",
    notRecorded: "Non enregistré",
    noErrorDetailsRecorded: "Aucun détail d’erreur enregistré.",
    noCurrentStatusRecorded: "Aucun statut actuel enregistré.",
    noStatusRecorded: "Aucun statut enregistré.",
    noCurrentSummaryRecorded: "Aucun résumé actuel enregistré.",
    noChangesRecordedForFilter: "Aucun changement enregistré pour ce filtre.",
    noDecisionsRecorded: "Aucune décision enregistrée.",
    noFactsRecorded: "Aucun fait enregistré.",
    noSourcesRecorded: "Aucune source enregistrée.",
    noRelationshipsRecorded: "Aucune relation enregistrée.",
    noDraftProjects: "Aucun projet brouillon.",
    noOpenQuestions: "Aucune question ouverte.",
    noNextActions: "Aucune prochaine action.",
    noRecentActivity: "Aucune activité récente.",
    noDraftTextRecorded: "Aucun texte de brouillon enregistré.",
    noReasonRecorded: "Aucune raison enregistrée.",
    noContextRecorded: "Aucun contexte enregistré.",
    noProposedTextRecorded: "Aucun texte proposé enregistré.",
    noPendingIntake: "Aucune entrée en attente. Les futurs bras doivent arriver ici avant de toucher le noyau.",
    noReviewedIntake: "Aucune entrée révisée pour l’instant.",
    searchEmptyHint: "Essayez un nom de projet, une décision, un fait, une source, une action, une relation, une légende d’image ou une raison d’historique.",
    missingProject: "Projet manquant",
    noTargetProject: "Aucun projet cible",
    target: "Cible",
    created: "Créé",
    reviewedBy: "Révisé par",
    approvedBy: "Approuvé par",
    untitled: "Sans titre",
    untitledIntake: "Entrée sans titre",
    untitledObject: "Objet sans titre",
    untitledSource: "Source sans titre",
    attachedImageAlt: "Image jointe",
    imageDataUnavailable: "Les données de l’image ne sont pas disponibles.",
    calendar: "Calendrier",
    meeting: "Réunion",
    api: "API",
    chat: "Chat",
    email: "E-mail",
    other: "Autre",
    projectStatus: "Statut du projet",
    proposedChange: "Changement proposé",
    permissions: "Permissions",
    restrictions: "Restrictions",
    schemaVersion: "Version du schéma",
    storageModeLabel: "Mode de stockage",
    lastSettingsUpdate: "Dernière mise à jour des paramètres",
    lastBackupExport: "Dernier export de sauvegarde",
    lastRestore: "Dernière restauration",
    storageSpineVersion: "Version de l’axe de stockage",
    storageLayout: "Disposition du stockage",
    storageSnapshotBytes: "Octets de l’instantané de stockage",
    attachmentRecords: "Enregistrements de pièces jointes",
    extractTextCharacters: "Caractères du texte extrait",
    storageSizeLabel: "Taille du stockage",
    activeProjectsLabel: "Projets actifs",
    archivedProjectsLabel: "Projets archivés",
    actorsLabel: "Acteurs",
    changesLabel: "Changements",
    sourcesLabel: "Sources",
    extractsLabel: "Extraits",
    imagesLabel: "Images",
    integrityDashboard: "Tableau d’intégrité",
    localApiArmTransport: "Transport local du bras API",
    transportBoundaryNotice: "Accès connecteur limité à la boucle locale. Les propositions entrent dans le sas d’admission et nécessitent toujours une approbation humaine individuelle.",
    transportStatus: "État du transport",
    transportRunning: "En cours",
    transportStopped: "Arrêté",
    transportAddress: "Adresse locale",
    secureToken: "Jeton sécurisé",
    secureStorage: "Stockage sécurisé",
    configured: "Configuré",
    notConfigured: "Non configuré",
    available: "Disponible",
    unavailable: "Indisponible",
    transportLastError: "Dernière erreur de transport",
    enableTransport: "Activer le transport",
    disableTransport: "Désactiver le transport",
    rotateTransportToken: "Renouveler le jeton",
    revokeTransport: "Révoquer le transport",
    transportEnableNotice: "L’activation ouvre un écouteur protégé par jeton sur 127.0.0.1 uniquement. Elle n’accorde aucun pouvoir d’approbation.",
    transportDisableNotice: "La désactivation arrête l’écouteur mais conserve le jeton chiffré pour plus tard.",
    transportRotateNotice: "Le renouvellement invalide immédiatement l’ancien jeton du connecteur.",
    transportRevokeNotice: "La révocation arrête l’écouteur et supprime le jeton chiffré du connecteur.",
    transportPort: "Port local",
    transportTokenTitle: "Jeton du connecteur",
    tokenOneTimeNotice: "Copiez ce jeton maintenant et conservez-le en lieu sûr. Project State ne l’affichera plus, sauf renouvellement.",
    tokenSaved: "J’ai enregistré le jeton",
    changedBy: "Modifié par",
    integrityStatus: "État d’intégrité",
    healthy: "Sain",
    warning: "Avertissement",
    needsAttention: "À vérifier",
    objectCounts: "Comptes d’objets",
    storageHealth: "Santé du stockage",
    orphanLinks: "Liens orphelins",
    sourceFileReferences: "Références de fichiers source",
    linkedUserIssues: "Problèmes d’utilisateurs liés",
    oversizedContent: "Contenu volumineux",
    recoverySignals: "Signaux de récupération",
    noIntegrityIssues: "Aucun problème d’intégrité trouvé.",
    noStorageWarnings: "Aucun avertissement de stockage.",
    noBrokenLinks: "Aucun lien interne cassé trouvé.",
    noSourceReferenceIssues: "Aucune référence de fichier source faible trouvée.",
    noLinkedUserIssues: "Aucun problème d’utilisateur lié trouvé.",
    noOversizedContent: "Aucun avertissement de contenu volumineux.",
    noRecoverySignals: "Aucun signal de récupération trouvé.",
    checkGenerated: "Vérification générée",
    projectReference: "Référence du projet",
    missingSourceDetails: "La source n’a ni emplacement, ni métadonnées de fichier local, ni résumé.",
    missingLinkedUser: "La source référence un utilisateur qui n’existe plus.",
    missingAttachedSource: "Le lien de source attachée pointe vers une source manquante.",
    missingAttachedExtract: "Le lien de source attachée pointe vers un extrait manquant.",
    missingImageReference: "La pièce jointe image n’a aucune donnée stockée ni référence locale.",
    missingImageTarget: "La pièce jointe image pointe vers un objet manquant.",
    missingRelationshipTarget: "La relation pointe vers un projet manquant.",
    largeExtractWarning: "Le texte de l’extrait est volumineux.",
    largeAttachmentWarning: "Les données de la pièce jointe image sont volumineuses.",
    recoveryModeNotActive: "Le mode de récupération n’est pas actif.",
    storageWarningStorageSizeDanger: "La taille du stockage approche la limite du navigateur.",
    storageWarningStorageSizeWarning: "La taille du stockage augmente.",
    storageWarningAttachmentsDominateMainRecord: "Les images occupent la majeure partie de l’enregistrement principal.",
    storageWarningExtractsGrowingInMainRecord: "Le texte des extraits augmente dans l’enregistrement principal."
  },
  de: {
    languageName: "Deutsch",
    appTitle: "Project State",
    appKicker: "Lokaler Projektstand",
    openingTitle: "Project State wird geöffnet",
    openingSubtitle: "Speicher-Spine wird geladen und lokale Projektdaten werden geprüft.",
    search: "Suchen",
    searchPlaceholder: "Projekte und Einträge suchen",
    refreshStorage: "Aktualisieren",
    refreshedFromStorage: "Aus Speicher aktualisiert.",
    storageRefreshFailed: "Speicheraktualisierung fehlgeschlagen.",
    storageRecoveryNotice: "Project State konnte gespeicherte Daten nicht laden. Wiederherstellungsdetails wurden erhalten.",
    projects: "Projekte",
    workInbox: "Arbeits-Eingang",
    workInboxSubtitle: "Elemente, die menschliche Aufmerksamkeit in Project State benötigen.",
    inboxEmpty: "Im Moment benötigt nichts Aufmerksamkeit.",
    inboxEmptyDetail: "Ausstehende Prüfungen, blockierte Arbeit, Quellenprobleme und fällige Aktionen erscheinen hier.",
    readyToApprove: "Bereit zur Genehmigung",
    needsReview: "Benötigt Prüfung",
    blockedWork: "Blockiert",
    dueSoon: "Bald fällig",
    overdue: "Überfällig",
    missingSource: "Fehlende Quelle",
    integrityWarning: "Integritätswarnung",
    draftWaiting: "Entwurf wartet",
    openQuestionNeedsAction: "Frage ohne Aktion",
    goToProject: "Zum Projekt",
    goToIntake: "Zum Eingang",
    goToSettings: "Zu Einstellungen",
    openItem: "Element öffnen",
    assignment: "Zuweisung",
    assignments: "Zuweisungen",
    assignObject: "Zuweisen",
    assignedTo: "Zugewiesen an",
    assignmentRole: "Zuweisungsrolle",
    assignmentOwner: "Verantwortlich",
    assignmentReviewer: "Prüfer",
    assignmentApprover: "Genehmiger",
    assignmentWatcher: "Beobachter",
    comments: "Kommentare",
    reviewThread: "Prüfverlauf",
    addComment: "Kommentar hinzufügen",
    commentText: "Kommentar",
    commentsNotPrivateNotice: "Kommentare sind Teil des Projektdatensatzes und nicht privat.",
    reviewState: "Prüfstatus",
    projectRoles: "Projektrollen",
    manageProjectRoles: "Projektrollen verwalten",
    projectRole: "Projektrolle",
    proposalDiff: "Vorschlagsdiff",
    currentValue: "Aktueller Wert",
    proposedValue: "Vorgeschlagener Wert",
    conflictWarning: "Konfliktwarnung",
    changedSinceOpened: "Dieser Eintrag könnte sich seit dem Öffnen geändert haben. Vor der Genehmigung prüfen.",
    notificationQueue: "Benachrichtigungswarteschlange",
    assignedToYou: "Ihnen zugewiesen",
    aiWorkOrders: "KI-Arbeitsaufträge",
    aiWorkOrder: "KI-Arbeitsauftrag",
    aiWorkOrdersSubtitle: "Von Menschen erstellte Arbeitsanfragen für künftige KI-Arme. Ergebnisse müssen durch den Airlock zurückkehren.",
    createAiWorkOrder: "KI-Arbeitsauftrag erstellen",
    aiWorkOrderNotice: "Dies erstellt nur einen Arbeitsauftrag. Es ruft keine KI auf und ändert Project State nicht.",
    workOrderTask: "Aufgabe",
    outputType: "Ausgabetyp",
    canCreateIntake: "Darf Eingangsvorschläge erstellen",
    noAiWorkOrders: "Keine KI-Arbeitsaufträge erfasst.",
    inProgress: "In Bearbeitung",
    revisionRequested: "Überarbeitung angefordert",
    projectConfidence: "Projektvertrauen",
    projectCompleteness: "Projektvollständigkeit",
    airlockCompleteness: "Airlock-Vollständigkeit",
    airlockIncompleteNotice: "Dieses Element ist unvollständig und kann den Airlock nicht passieren.",
    requiredAirlockChecks: "Erforderliche Airlock-Prüfungen",
    present: "Vorhanden",
    missing: "Fehlt",
    hasCurrentStatus: "Aktueller Status",
    hasCurrentSummary: "Aktuelle Zusammenfassung",
    hasNextAction: "Nächste Aktion",
    hasRecentDecision: "Aktuelle Entscheidung",
    hasSourceReference: "Quellenverweis",
    sourceFilesClear: "Quelldateien klar",
    healthNotBlocked: "Nicht blockiert oder gefährdet",
    targetProjectSelected: "Zielprojekt ausgewählt",
    proposedTitleRecorded: "Vorschlagstitel erfasst",
    proposedTextRecorded: "Vorschlagstext erfasst",
    proposedTypeSelected: "Vorschlagstyp ausgewählt",
    queueMarkedReady: "Warteschlange als bereit markiert",
    draftNameRecorded: "Entwurfsname erfasst",
    draftTextRecorded: "Entwurfstext erfasst",
    draftReviewComplete: "Entwurfsprüfung vollständig",
    draftSourceLinked: "Quelle und Auszug verknüpft",
    archivedProjects: "Archivierte Projekte",
    intake: "Eingang",
    backup: "Sicherung",
    restore: "Wiederherstellen",
    exportJson: "JSON exportieren",
    addIntake: "Eingang hinzufügen",
    createProject: "Projekt erstellen",
    addMenu: "Hinzufügen",
    moreActions: "Weitere Aktionen",
    viewDetails: "Details anzeigen",
    objectDetails: "Objektdetails",
    closeDetails: "Details schließen",
    continueWorking: "Weiterarbeiten",
    continueLastProject: "Letztes Projekt fortsetzen",
    recentProjects: "Letzte Projekte",
    noRecentProjects: "Keine kürzlich geöffneten Projekte.",
    batchTriage: "Sammeltriage",
    batchTriageNotice: "Die Triage ändert nur den Warteschlangenstatus. Jede Genehmigung erfordert weiterhin eine eigene menschliche Prüfung, Bestätigung, Person und Begründung.",
    selectIntakeItems: "Eingänge auswählen",
    applyTriage: "Triage anwenden",
    proposeCorrection: "Korrektur vorschlagen",
    correctionNotice: "Dies erstellt einen Airlock-Vorschlag. Der genehmigte Datensatz ändert sich erst nach menschlicher Genehmigung.",
    correctedContent: "Korrigierter Inhalt",
    correctionProposed: "Korrektur vorgeschlagen",
    correctionApproved: "Korrektur genehmigt",
    permissionDenied: "Die Rolle der ausgewählten Person erlaubt diese Aktion nicht.",
    currentActorRole: "Aktuelle Akteursrolle",
    openReferencedObject: "Referenziertes Objekt öffnen",
    backToProjects: "Zurück zu Projekten",
    saved: "Gespeichert",
    setupTitle: "Project State einrichten",
    setupSubtitle: "Dies konfiguriert lokale Nutzung, Sicherungshinweise und den primären Akteur für genehmigte Änderungen.",
    primaryActor: "Primärer Akteur",
    backupLocation: "Sicherungsort",
    backupLocationPlaceholder: "Beispiel: Externes Laufwerk / Project State Sicherungen",
    backupReminder: "Sicherungserinnerung",
    language: "Sprache",
    localModeConfirm: "Ich verstehe, dass dies ein lokaler Einzelbenutzermodus ist und Sicherungen vom Benutzer verwaltet werden.",
    recoveryWarnings: "Speicher- und Wiederherstellungswarnungen anzeigen.",
    saveSetup: "Einrichtung speichern",
    manual: "Manuell",
    weekly: "Wöchentlich",
    monthly: "Monatlich",
    active: "Aktiv",
    blocked: "Blockiert",
    atRisk: "Gefährdet",
    complete: "Abgeschlossen",
    onHold: "Angehalten",
    pending: "Ausstehend",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
    archived: "Archiviert",
    withApproval: "Mit Genehmigung",
    aiSuggested: "Von KI vorgeschlagen",
    settings: "Einstellungen",
    settingsSubtitle: "Lokale App-Konfiguration für Sprache, Akteure, Speicher, Sicherung, Wiederherstellung und Sicherheitsrichtlinien.",
    coreSettings: "Grundeinstellungen",
    defaultLanguage: "Standardsprache",
    defaultActor: "Standardakteur",
    saveCoreSettings: "Grundeinstellungen speichern",
    usersActors: "Benutzer / Akteure",
    noActorsRecorded: "Keine Akteure erfasst.",
    newActorName: "Neuer Akteursname",
    role: "Rolle",
    addActor: "Akteur hinzufügen",
    storageSystem: "Speichersystem",
    platformStorageSpine: "Plattform-Speicher-Spine",
    platformAdapterLabel: "Plattformadapter",
    primaryStorage: "Primärspeicher",
    localBrowserStorageSpine: "Lokaler Browser-Speicher-Spine",
    desktopRuntime: "Desktop-App-Laufzeit",
    desktopRuntimeReady: "Desktop-Speicher-Spine aktiv.",
    browserDevRuntime: "Browser-/Entwicklungs-Laufzeit",
    browserRuntimeWarning: "Project State läuft ohne Desktop-Bridge. Der Browsermodus ist nur für Legacy-Export, Migration und Entwicklung gedacht; verwenden Sie die Desktop-App für vollständigen Speicher, Sicherung, Wiederherstellung, Eingang und API-Arbeit.",
    browserDevGateTitle: "Browser-/Entwicklungsmodus",
    browserDevGateSubtitle: "Die Desktop-Bridge ist für den echten Project-State-Modus erforderlich.",
    browserDevGateNotice: "Dieser Bildschirm kann geladene lokale Daten prüfen und Rohdaten für die Migration exportieren. Er speichert, migriert, sichert, stellt wieder her, nimmt auf oder bearbeitet Project-State-Datensätze nicht stillschweigend.",
    browserDevGateReadOnly: "Schreibgeschützter Entwicklungszugriff",
    browserDevGateCounts: "Geladene Datensätze",
    browserDevNoSilentStorage: "Ohne Desktop-Bridge wird keine ernsthafte Speicherarbeit ausgeführt.",
    saveBlockedApproval: "Nicht gespeicherte Änderungen: Genehmigungssperre hat das Speichern blockiert",
    saveStorageFailed: "Nicht gespeicherte Änderungen: {message}",
    storageFailed: "Speichern fehlgeschlagen",
    savedAt: "Gespeichert {time}",
    unsavedChanges: "Nicht gespeicherte Änderungen",
    storageWarningTitle: "Speicherwarnung",
    storageWarningDanger: "Die lokal gespeicherten Daten sind sehr groß. Browser-Speicher kann bald fehlschlagen, besonders mit Bildern oder langen Auszügen.",
    storageWarningNotice: "Die lokal gespeicherten Daten werden groß. Bilder und lange Auszüge können das Speichern verlangsamen.",
    currentSizeSentence: "Aktuelle Größe: {size}.",
    resetFailedDataConfirmFirst: "Lokale Project-State-Daten zurücksetzen? Exportieren Sie zuerst die fehlerhaften Daten. Dies löscht nur die lokal gespeicherten Daten dieser App.",
    resetFailedDataConfirmSecond: "Letzte Bestätigung: lokale Daten zurücksetzen und mit einem leeren Project-State-Speicher beginnen?",
    resetAllDataConfirmFirst: "Alle lokalen Project-State-Daten zurücksetzen? Exportieren Sie zuerst eine vollständige Sicherung. Dies löscht nur die lokal gespeicherten Daten dieser App.",
    resetAllDataConfirmSecond: "Letzte Bestätigung: lokale Daten zurücksetzen und zur Ersteinrichtung zurückkehren?",
    resetComplete: "Zurücksetzen abgeschlossen",
    currentMode: "Aktueller Modus",
    currentSize: "Aktuelle Größe",
    storageOverrideAcknowledged: "Speicher-Override oder Migrationsausnahme als bestätigt erfassen.",
    storageOverrideReason: "Grund für Speicher-Override",
    saveStorageSettings: "Speichereinstellungen speichern",
    backupSystem: "Sicherungssystem",
    backupLocationWarning: "Primärspeicher und Sicherung sollten nicht am selben Ort liegen, außer bei einer servergestützten Bereitstellung.",
    backupOverrideAcknowledged: "Sicherungsort-Override mit aufgezeichneter Warnung erlauben.",
    backupOverrideReason: "Grund für Sicherungs-Override",
    desktopBackupPackageNotice: "Ein Desktop-Sicherungspaket aus dem aktiven Speicher-Spine erstellen. Akteur, Zeitstempel und Grund sind erforderlich.",
    exportedBy: "Exportiert von",
    backupReason: "Sicherungsgrund",
    backupPackageCreated: "Sicherungspaket erstellt",
    backupPackageUnavailable: "Desktop-Sicherungspaket-Unterstützung ist nicht verfügbar.",
    exportFullBackup: "Vollständige Sicherung exportieren",
    restoreBackup: "Sicherung wiederherstellen",
    saveBackupSettings: "Sicherungseinstellungen speichern",
    recovery: "Wiederherstellung",
    recoveryControlsNotice: "Wiederherstellungsfunktionen sind nur lokal. Vor dem Zurücksetzen exportieren.",
    exportRawCurrentData: "Aktuelle Rohdaten exportieren",
    resetLocalData: "Lokale Daten zurücksetzen",
    approvalAirlock: "Genehmigung / Airlock",
    lockedOn: "Fest aktiviert",
    approvalPolicyHuman: "Menschliche Genehmigung ist erforderlich, bevor Eingangsdaten den Kern erreichen.",
    approvalPolicyAudit: "Projekt- und Objektänderungen erfordern Akteur, Zeitstempel, Grund und Details zum geänderten Objekt.",
    approvalPolicyArms: "Externe Arme schreiben zuerst in den Eingang, nicht direkt in Project State oder den Speicher-Spine.",
    diagnostics: "Diagnose",
    actorName: "Akteursname",
    actorId: "Akteur-ID",
    emailAddress: "E-Mail-Adresse",
    chatHandle: "Chat-Kennung",
    linkedUsers: "Verknüpfte Benutzer",
    linkedProjectStateUsers: "Verknüpfte Project-State-Benutzer",
    noLinkedUsers: "Keine verknüpften Benutzer.",
    communicationRecordsNotice: "Erfasste Chats und E-Mails sind Project-State-Datensätze. Sie sind nicht privat.",
    userPrivacyNotice: "Project-State-Benutzer sollten davon ausgehen, dass erfasste Projekt-Chats, E-Mails, Quellen und Verläufe für berechtigte Project-State-Benutzer sichtbar sind.",
    defaultActorPill: "Standardakteur",
    saveActor: "Akteur speichern",
    owner: "Eigentümer",
    admin: "Administrator",
    projectLead: "Projektleitung",
    approver: "Genehmiger",
    editor: "Bearbeiter",
    contributor: "Mitwirkender",
    reviewer: "Prüfer",
    auditor: "Auditor",
    viewer: "Betrachter",
    aiTool: "KI / Tool",
    reason: "Grund",
    status: "Status",
    storageMigrationNotice: "Der Primärspeicher ist in diese lokale App eingebaut. Ein späterer Wechsel des Speichersystems sollte als Migration behandelt werden, nicht als einfache Einstellung.",
    settingsReasonPlaceholder: "Warum ändern sich diese Einstellungen?",
    storageReasonPlaceholder: "Warum ändern sich die Speichereinstellungen?",
    backupReasonPlaceholder: "Warum ändern sich die Sicherungseinstellungen?",
    actorReasonPlaceholder: "Warum ändert sich dieser Akteur?",
    addActorReasonPlaceholder: "Warum wird dieser Akteur hinzugefügt?",
    restoredBy: "Wiederhergestellt von",
    restoreReason: "Grund der Wiederherstellung",
    permissionMatrix: "Berechtigungsmatrix",
    permissionMatrixNote: "Rollenberechtigungen steuern die angezeigten Aktionen für den konfigurierten Standardakteur. Dies bleibt eine lokale Einzelbenutzer-Richtlinie und ist keine Kontoanmeldung.",
    createPermission: "Erstellen",
    editPermission: "Bearbeiten",
    approvePermission: "Genehmigen",
    auditPermission: "Audit",
    adminPermission: "Admin",
    yes: "J",
    no: "N",
    mandatoryHistory: "Pflichtverlauf",
    mandatoryHistoryNote: "Jede genehmigte Project-State-Änderung muss erfassen, wer sie vorgenommen hat, wann sie erfolgte, warum, was geändert wurde, wie sie in den Kern gelangte und welche UI-Sprache aktiv war.",
    historyFieldActor: "Akteur",
    historyFieldTimestamp: "Zeitstempel",
    historyFieldReason: "Grund",
    historyFieldObject: "Geändertes Objekt",
    historyFieldHow: "Änderungsweg",
    historyFieldLanguage: "Sprache",
    howChanged: "Weg",
    languageAtChange: "Sprache",
    addDecision: "Entscheidung hinzufügen",
    addExtract: "Auszug hinzufügen",
    addFact: "Fakt hinzufügen",
    addNextAction: "Nächste Aktion hinzufügen",
    addOpenQuestion: "Offene Frage hinzufügen",
    addRelationship: "Beziehung hinzufügen",
    addSource: "Quelle hinzufügen",
    approve: "Genehmigen",
    approveDraft: "Entwurf genehmigen",
    approveExtract: "Auszug genehmigen",
    archive: "Archivieren",
    attachImage: "Bild anhängen",
    attachSource: "Quelle anhängen",
    cancel: "Abbrechen",
    clearSearch: "Suche löschen",
    createDraftProject: "Entwurfsprojekt erstellen",
    dashboard: "Dashboard",
    deleteProject: "Projekt löschen",
    edit: "Bearbeiten",
    editStatus: "Status bearbeiten",
    exportFailedData: "Fehlerdaten exportieren",
    markComplete: "Als erledigt markieren",
    onePageOverview: "Einseitenübersicht",
    open: "Öffnen",
    readFileExtract: "Dateiauszug lesen",
    reject: "Ablehnen",
    review: "Prüfen",
    suggestExtract: "Auszug vorschlagen",
    unarchiveProject: "Projekt dearchivieren",
    viewFullHistory: "Vollständigen Verlauf anzeigen",
    viewHistory: "Verlauf anzeigen",
    close: "Schließen",
    saveToAirlock: "In Airlock speichern",
    approveToProjectState: "Für Project State genehmigen",
    approveProject: "Projekt genehmigen",
    requestDeletion: "Löschung anfordern",
    approveUnarchive: "Dearchivierung genehmigen",
    approveChange: "Änderung genehmigen",
    approveEdit: "Bearbeitung genehmigen",
    createDraft: "Entwurf erstellen",
    saveReview: "Prüfung speichern",
    approveToProject: "Für Projekt genehmigen",
    approveCompletion: "Abschluss genehmigen",
    recordSuggestion: "Vorschlag erfassen",
    approveAttachment: "Anhang genehmigen",
    approveImage: "Bild genehmigen",
    approveArchive: "Archivierung genehmigen",
    approveDecision: "Entscheidung genehmigen",
    approveFact: "Fakt genehmigen",
    approveSource: "Quelle genehmigen",
    approveRelationship: "Beziehung genehmigen",
    approveQuestion: "Frage genehmigen",
    approveAction: "Aktion genehmigen",
    restoreProjectStateBackup: "Project-State-Sicherung wiederherstellen",
    approveIntake: "Eingang genehmigen",
    rejectIntake: "Eingang ablehnen",
    archiveIntake: "Eingang archivieren",
    editCurrentStatus: "Aktuellen Status bearbeiten",
    editProject: "Projekt bearbeiten",
    editDecision: "Entscheidung bearbeiten",
    editFact: "Fakt bearbeiten",
    editSource: "Quelle bearbeiten",
    editExtract: "Auszug bearbeiten",
    editRelationship: "Beziehung bearbeiten",
    reviewDraftProject: "Entwurfsprojekt prüfen",
    editOpenQuestion: "Offene Frage bearbeiten",
    editNextAction: "Nächste Aktion bearbeiten",
    markActionComplete: "Aktion als erledigt markieren",
    relationshipPlaceholder: "Übergeordnet, untergeordnet, Abhängigkeit, verbunden",
    historyReason: "Grund",
    historyChanged: "Geändert",
    savedDataNeedsRecovery: "Gespeicherte Daten benötigen Wiederherstellung",
    noActiveProjects: "Keine aktiven Projekte",
    noArchivedProjects: "Keine archivierten Projekte",
    roleDefinitions: "Rollendefinitionen",
    intakeAirlock: "Eingangs-Airlock",
    intakeAirlockSubtitle: "Externe Arme können hier Änderungen vorschlagen. Menschliche Genehmigung ist erforderlich, bevor etwas Project State erreicht.",
    approvalQueueSummary: "Übersicht der Genehmigungswarteschlange",
    approvalQueueReview: "Warteschlangenprüfung",
    approvalQueueReviewNotice: "Die Warteschlangenprüfung sortiert einen Eingang. Sie genehmigt die Änderung nicht und schreibt sie nicht in Project State.",
    approvalChecklist: "Genehmigungscheckliste",
    queueState: "Warteschlangenstatus",
    queueNew: "Neu",
    queueNeedsReview: "Benötigt Prüfung",
    queueReady: "Bereit",
    queueBlocked: "Blockiert",
    reviewQueueItem: "Eintrag prüfen",
    saveQueueReview: "Prüfung speichern",
    queueReviewNotes: "Prüfnotizen",
    approvalQueueReadyRequired: "Die Warteschlangenprüfung muss diesen Eintrag vor der Genehmigung als bereit markieren.",
    confirmProposalReviewed: "Ich habe den Vorschlag und das Zielprojekt geprüft.",
    confirmApprovalWritesCore: "Ich verstehe, dass die Genehmigung diesen Vorschlag in Project State schreibt.",
    confirmInputsNotAuthority: "Ich verstehe, dass externe Gespräche, Dateien und KI-Vorschläge Eingaben sind, nicht die Autorität.",
    age: "Alter",
    pendingReview: "Ausstehende Prüfung",
    reviewedIntake: "Geprüfter Eingang",
    currentState: "Aktueller Stand",
    currentObjects: "Aktuelle Objekte",
    recentActivity: "Letzte Aktivität",
    recentDecisions: "Letzte Entscheidungen",
    decisionRelationship: "Entscheidungsbeziehung",
    decisionNoRelationship: "Keine frühere Entscheidung",
    supersedesDecision: "Hebt eine frühere Entscheidung auf",
    replacesDecision: "Ersetzt eine frühere Entscheidung",
    supersedes: "Hebt auf",
    replaces: "Ersetzt",
    supersededBy: "Aufgehoben durch",
    replacedBy: "Ersetzt durch",
    missingDecision: "Fehlende Entscheidung",
    whatChangedSince: "Was hat sich geändert seit…",
    whatChangedSinceSubtitle: "Eine schreibgeschützte Ansicht der seit dem gewählten Datum erfassten Projektänderungen.",
    sinceDate: "Seit Datum",
    changesFound: "Gefundene Änderungen",
    noChangesSince: "Seit diesem Datum wurden keine Änderungen erfasst.",
    relationships: "Beziehungen",
    projectMap: "Projektkarte",
    projectMapSubtitle: "Beziehungen, Nachweise und offene Arbeit rund um dieses Projekt.",
    handoffMode: "Übergabemodus",
    handoffSubtitle: "Ein schreibgeschütztes Briefing für eine Person oder KI-Hilfe, die diesem Projekt beitritt.",
    exportHandoff: "Übergabe exportieren",
    whatThisProjectIs: "Was dieses Projekt ist",
    whyItMatters: "Warum es wichtig ist",
    whatChangedRecently: "Was sich kürzlich geändert hat",
    waitingOnApproval: "Wartet auf Genehmigung",
    blockersAndRisks: "Blockaden und Risiken",
    whoOwnsWhat: "Wer was verantwortet",
    trustedSources: "Vertrauenswürdige Quellen",
    sourceTrustLevel: "Quellen-Vertrauensstufe",
    sourceTrustPrimary: "Primär",
    sourceTrustSupporting: "Unterstützend",
    sourceTrustUnverified: "Ungeprüft",
    sourceTrustSuperseded: "Ersetzt",
    sourceTrustConflicting: "Widersprüchlich",
    sourceFreshness: "Quellenaktualität",
    freshnessCurrent: "Aktuell",
    freshnessReviewDue: "Prüfung fällig",
    freshnessStale: "Veraltet",
    freshnessNotReviewed: "Nicht geprüft",
    freshnessLastReviewed: "Zuletzt geprüft",
    freshnessNextReview: "Nächste Prüfung",
    lastReviewedBy: "Geprüft von",
    reviewFreshness: "Aktualität prüfen",
    reviewSourceFreshness: "Quellenaktualität prüfen",
    freshnessReviewNotice: "Die Aktualität basiert nur auf einer erfassten menschlichen Prüfung und dem nächsten Prüfdatum. Eine Dateiprüfung bestätigt nicht, dass der Quelleninhalt aktuell ist.",
    freshnessReviewed: "Quellenaktualität geprüft",
    staleSourceWarning: "Die Quellenprüfung ist veraltet oder fällig.",
    validationReviewDueAfterReviewed: "Die nächste Prüfung muss am oder nach dem Prüfdatum liegen.",
    validationRelatedDecisionRequired: "Wählen Sie die frühere Entscheidung, die aufgehoben oder ersetzt wird.",
    trustBoundary: "Vertrauensgrenze",
    trustBoundaryExternal: "Externe Eingabe",
    trustBoundaryAirlock: "Airlock-Vorschlag",
    trustBoundaryCore: "Project-State-Datensatz",
    trustBoundaryReadOnly: "Schreibgeschützte Ansicht / Export",
    trustBoundaryEvidenceNotice: "Diese Kennzeichnung zeigt die Workflow-Position, nicht die Wahrheit. Quellen bleiben Nachweise und können sich nicht selbst genehmigen.",
    conflictRegister: "Konfliktregister",
    addConflict: "Konflikt hinzufügen",
    editConflict: "Konflikt bearbeiten",
    conflictTitle: "Konflikttitel",
    conflictDescription: "Konfliktbeschreibung",
    linkedItems: "Verknüpfte Elemente",
    conflictStatus: "Konfliktstatus",
    conflictUnresolved: "Ungelöst",
    conflictUnderReview: "In Prüfung",
    conflictResolved: "Gelöst",
    resolution: "Lösung",
    noConflictsRecorded: "Keine Konflikte erfasst.",
    aiAllowedHelp: "Erlaubte KI-Hilfe",
    doNotTouch: "Nicht anfassen",
    handoffNoApprovalItems: "Keine Elemente warten auf Genehmigung.",
    handoffNoBlockers: "Keine Blockaden oder Risiken erfasst.",
    handoffNoAssignments: "Keine Zuweisungen oder Projektrollen erfasst.",
    handoffNoTrustedSources: "Keine geprüften oder aktiven Quellen erfasst.",
    handoffAiBoundary: "KI darf zusammenfassen, suchen, entwerfen und vorschlagen. KI darf nicht genehmigen, in Core schreiben, in die Spine schreiben, Verlauf löschen oder zur Quelle der Wahrheit werden.",
    handoffDoNotTouchDefault: "Den Intake Airlock nicht umgehen, Verlauf nicht überschreiben, unvollständige Elemente nicht genehmigen und Kommentare oder Auszüge nicht als Core-Wahrheit behandeln.",
    contextPack: "Kontextpaket",
    contextPackNotice: "Ein begrenztes lokales Kontextpaket für einen künftigen API- oder KI-Arm exportieren. Project State wird dadurch nicht geändert.",
    contextPackPreset: "Kontextpaket-Voreinstellung",
    contextPresetCurrentState: "Nur aktueller Stand",
    contextPresetRecentDecisions: "Aktueller Stand + letzte Entscheidungen",
    contextPresetHandoff: "Vollständige Projektübergabe",
    contextPresetSourceResearch: "Quellenlastiger Forschungskontext",
    contextPresetCodexImplementation: "Codex-Implementierungskontext",
    contextPresetCustom: "Benutzerdefiniert",
    contextPresetNotice: "Voreinstellungen wählen Umfang, Budget und enthaltene Abschnitte. Benutzerdefiniert nutzt die Steuerelemente unten.",
    contextScope: "Kontextumfang",
    contextScopeProject: "Nur dieses Projekt",
    contextScopeRelated: "Dieses Projekt und verknüpfte Projekte",
    contextScopeSources: "Fokus auf Quellen und Auszüge",
    contextBudget: "Kontextbudget",
    budgetQuick: "Schneller Scan",
    budgetNormal: "Normale Prüfung",
    budgetDeep: "Tiefe Prüfung",
    includeSources: "Quellen und Auszugsabschnitte einbeziehen",
    includeHistory: "Aktuellen Verlauf einbeziehen",
    includeOpenWork: "Offene Fragen und nächste Aktionen einbeziehen",
    includeDecisions: "Entscheidungen einbeziehen",
    includeFacts: "Fakten einbeziehen",
    includeRelationships: "Beziehungen einbeziehen",
    exportContextPack: "Kontextpaket exportieren",
    linkedProjects: "Verknüpfte Projekte",
    incomingLinks: "Eingehende Links",
    outgoingLinks: "Ausgehende Links",
    evidenceTrail: "Nachweisspur",
    sourceCoverage: "Quellenabdeckung",
    unresolvedWork: "Offene Arbeit",
    noLinkedProjects: "Keine verknüpften Projekte erfasst.",
    noEvidenceRecorded: "Keine Quellen oder Auszüge erfasst.",
    facts: "Fakten",
    sources: "Quellen",
    draftProjects: "Projektentwürfe",
    lastUpdated: "Zuletzt aktualisiert",
    updated: "Aktualisiert",
    updatedBy: "Aktualisiert von",
    health: "Statuslage",
    project: "Projekt",
    generated: "Erstellt",
    extract: "Auszug",
    attachedImages: "Angehängte Bilder:",
    attachedSources: "Angehängte Quellen:",
    added: "Hinzugefügt",
    localReference: "Lokaler Verweis",
    allEvents: "Alle Ereignisse",
    eventType: "Ereignistyp",
    projectName: "Projektname",
    currentStatus: "Aktueller Status",
    projectHealth: "Projektlage",
    currentSummary: "Aktuelle Zusammenfassung",
    backupFile: "Sicherungsdatei",
    arm: "Arm",
    targetProject: "Zielprojekt",
    proposedChangeType: "Vorgeschlagener Änderungstyp",
    intakeTitle: "Eingangstitel",
    proposedText: "Vorgeschlagener Text",
    summaryContext: "Zusammenfassung / Kontext",
    sourceOriginLabel: "Quelle / Herkunft",
    relationshipTargetOwner: "Beziehungsziel / Verantwortlicher",
    dueDate: "Fälligkeitsdatum",
    decision: "Entscheidung",
    confidence: "Vertrauen",
    fact: "Fakt",
    source: "Quelle",
    title: "Titel",
    type: "Typ",
    capitalizationDoesNotMatter: "Groß- und Kleinschreibung spielt keine Rolle.",
    unknown: "Unbekannt",
    dateAdded: "Hinzugefügt am",
    actor: "Akteur",
    location: "Ort",
    localFile: "Lokale Datei",
    modified: "Geändert",
    findLocalFile: "Lokale Datei finden",
    browseFile: "Datei auswählen…",
    browseFolder: "Ordner auswählen…",
    filesLibrary: "Dateien",
    filesLibrarySubtitle: "Verwaltete Projektdateien importieren, prüfen und verfolgen.",
    importFiles: "Dateien importieren",
    importFolder: "Ordner importieren",
    noManagedFiles: "Es wurden noch keine verwalteten Dateien importiert.",
    pendingFileImports: "Ausstehende Dateiimporte",
    approvedManagedFiles: "Genehmigte verwaltete Dateien",
    fileImportReview: "Dateiimport prüfen",
    fileImportReviewNotice: "Prüfen Sie die ausgewählten Dateien und wählen Sie das Zielprojekt. Der Import erstellt verwaltete Kopien im Eingang, genehmigt sie jedoch nicht für das Projekt.",
    importToIntake: "In den Eingang importieren",
    fileImportComplete: "Verwaltete Kopien wurden erstellt und an den Eingang gesendet.",
    unsupportedFilesSkipped: "Nicht unterstützte oder unlesbare Dateien übersprungen",
    originalFilePreserved: "Originaldateien bleiben erhalten und werden nie verschoben oder gelöscht.",
    managedCopy: "Verwaltete Kopie",
    originalLocation: "Ursprünglicher Speicherort",
    selectedFiles: "Ausgewählte Dateien",
    fileImportFailed: "Es konnten keine Dateien importiert werden.",
    recursiveFolderImport: "Ordner werden rekursiv nach unterstützten Dateien durchsucht.",
    verifyFile: "Datei prüfen",
    verifySourceFiles: "Quelldateien prüfen",
    sourceFileVerification: "Quelldatei-Prüfung",
    fileVerified: "Datei geprüft",
    fileChanged: "Datei geändert",
    fileMissing: "Datei fehlt",
    fileUnverifiable: "Datei nicht prüfbar",
    lastVerified: "Zuletzt geprüft",
    verificationReasonPlaceholder: "Warum werden Quelldateien geprüft?",
    sourceFileVerificationComplete: "Quelldatei-Prüfung abgeschlossen.",
    sourceFileVerificationNotice: "Der Desktopmodus kann absolute lokale Dateipfade prüfen. Der Browser-/Entwicklungsmodus kann Quelldateien nur als nicht prüfbar markieren.",
    summary: "Zusammenfassung",
    tags: "Tags",
    mode: "Modus",
    suggestionStatus: "Vorschlagsstatus",
    truncated: "Gekürzt",
    related: "Zugehörig",
    relatedProjectOrEntity: "Zugehöriges Projekt oder Objekt",
    relationshipType: "Beziehungstyp",
    notes: "Notizen",
    name: "Name",
    draft: "Entwurf",
    approvedProjectName: "Genehmigter Projektname",
    approvedProjectSummary: "Genehmigte Projektzusammenfassung",
    openQuestion: "Offene Frage",
    openQuestions: "Offene Fragen",
    context: "Kontext",
    nextAction: "Nächste Aktion",
    nextActions: "Nächste Aktionen",
    ownerField: "Verantwortlicher",
    completedDate: "Abschlussdatum",
    suggestedBy: "Vorgeschlagen von",
    suggestedExtract: "Vorgeschlagener Auszug",
    imageFile: "Bilddatei",
    captionNotes: "Beschriftung / Notizen",
    file: "Datei",
    factsReviewed: "Fakten geprüft",
    decisionsReviewed: "Entscheidungen geprüft",
    questionsReviewed: "Fragen geprüft",
    actionsReviewed: "Aktionen geprüft",
    relationshipsReviewed: "Beziehungen geprüft",
    readyForApproval: "Bereit zur Genehmigung",
    due: "Fällig",
    notSet: "Nicht festgelegt",
    completed: "Abgeschlossen",
    notCompleted: "Nicht abgeschlossen",
    noDueDate: "Kein Fälligkeitsdatum",
    searchResultsFor: "{count} Ergebnisse für „{query}“",
    noSearchResultsFor: "Keine Ergebnisse für „{query}“",
    limitCharacters: "Maximal {limit} Zeichen",
    viewImage: "{name} anzeigen",
    attachedImage: "Angehängtes Bild",
    draftProjectDefault: "Projektentwurf",
    changeHistory: "Änderungsverlauf",
    addSourceBeforeAttaching: "Fügen Sie eine Quelle hinzu, bevor Sie sie an dieses Objekt anhängen.",
    approvalAppliesChangeNotice: "Die Genehmigung wendet diese vorgeschlagene Änderung auf das ausgewählte Projekt an und zeichnet sie im Verlauf auf.",
    approvalCreatesProjectNotice: "Die Genehmigung erstellt aus diesem Entwurf ein neues Projekt und zeichnet die Genehmigung am Entwurf auf.",
    approvalRecordsSuggestionNotice: "Die Genehmigung zeichnet diesen KI-Vorschlag als von einem Menschen akzeptiert auf.",
    archivedProjectsNotice: "Archivierte Projekte werden aus der aktiven Projektliste herausgehalten. Heben Sie die Archivierung auf, um ein Projekt wieder aktuell zu nutzen.",
    archivedProjectsEmpty: "Archivierte Projekte erscheinen hier.",
    archiveIntakeNotice: "Die Archivierung entfernt den Eingang aus der aktiven Prüfung, behält den Eintrag aber in der Speicher-Spine.",
    archiveObjectNotice: "Die Archivierung entfernt das Objekt aus dem aktuellen Dashboard, behält aber seinen Verlauf.",
    chooseProjectEmpty: "Wählen Sie ein Projekt, um den aktuellen Stand und den Verlauf zu sehen.",
    createProjectEmpty: "Erstellen Sie ein Projekt oder öffnen Sie Archivierte Projekte, um eines wiederherzustellen.",
    stateHistorySeparate: "Aktueller Stand und historischer Datensatz bleiben in getrennten Ansichten.",
    deletionNotice: "Löschen entfernt in v0.1 keine Daten. Das Projekt wird archiviert und als ausstehende Löschgenehmigung markiert. Der endgültige Genehmigungsprozess wird noch festgelegt.",
    errorDetails: "Fehlerdetails",
    recoveryExportNotice: "Exportieren Sie die rohen gespeicherten Daten vor dem Zurücksetzen. Zurücksetzen sollte nur genutzt werden, nachdem die fehlerhaften Daten gesichert wurden.",
    recoveryLoadNotice: "Project State konnte die gespeicherten lokalen Daten nicht sicher laden. Die ursprünglichen gespeicherten Daten wurden nicht geändert.",
    readsFileExtractNotice: "Liest TXT/MD direkt. PDF- und DOCX-Auszüge sind bestmöglich und bleiben lokal.",
    rejectIntakeNotice: "Ablehnen behält den Eingangseintrag, verhindert aber, dass er Project State erreicht.",
    restoreBackupNotice: "Wiederherstellen ersetzt die lokale Speicher-Spine durch die ausgewählte Sicherungsdatei. Es wird kein Server verwendet.",
    createDraftFromExtractNotice: "Dies erstellt einen Entwurf aus dem ausgewählten Auszug. Ein neues Projekt entsteht erst nach Genehmigung.",
    proposedChangeNotice: "Dies erstellt nur eine vorgeschlagene Änderung. Project State wird erst nach Genehmigung geändert.",
    unarchiveNotice: "Das Aufheben der Archivierung bringt das Projekt in die aktuelle Nutzung zurück und zeichnet die Genehmigung im Verlauf auf.",
    validationReasonRequired: "Ein Grund ist erforderlich.",
    validationActorRequired: "Akteur ist erforderlich.",
    validationActorNameRequired: "Akteurname ist erforderlich.",
    validationActorExists: "Ein Akteur mit diesem Namen existiert bereits.",
    validationExtractFileType: "Wählen Sie eine PDF-, DOCX-, TXT- oder MD-Datei.",
    validationImageFileType: "Wählen Sie ein PNG-, JPG-, WEBP- oder GIF-Bild.",
    validationBackupFileType: "Wählen Sie eine Project-State-Sicherungsdatei im JSON-Format.",
    validationDefaultActorArchive: "Wählen Sie einen anderen Standardakteur, bevor Sie diesen Akteur archivieren.",
    validationActiveDefaultActor: "Wählen Sie einen aktiven Standardakteur.",
    validationConfirmLocalMode: "Bestätigen Sie den lokalen Modus, bevor Sie fortfahren.",
    validationConfirmRestore: "Bestätigen Sie die Wiederherstellung, bevor Sie fortfahren.",
    validationNoReadableText: "In dieser Datei wurde kein lesbarer Text gefunden.",
    validationPrimaryActorRequired: "Primärer Akteur ist erforderlich.",
    validationStorageOverrideReason: "Erfassen Sie den Grund für die Speicher-Ausnahme.",
    validationBackupOverrideReason: "Erfassen Sie den Grund für die Sicherungs-Ausnahme.",
    validationRestoreReasonRequired: "Ein Wiederherstellungsgrund ist erforderlich.",
    validationBackupUnreadable: "Diese Sicherungsdatei ist kein lesbares JSON.",
    validationInvalidBackup: "Dies ist keine gültige Project-State-Sicherung.",
    validationReadExtractFailed: "Text konnte aus dieser Datei nicht gelesen werden.",
    notRecorded: "Nicht erfasst",
    noErrorDetailsRecorded: "Keine Fehlerdetails erfasst.",
    noCurrentStatusRecorded: "Kein aktueller Status erfasst.",
    noStatusRecorded: "Kein Status erfasst.",
    noCurrentSummaryRecorded: "Keine aktuelle Zusammenfassung erfasst.",
    noChangesRecordedForFilter: "Für diesen Filter wurden keine Änderungen erfasst.",
    noDecisionsRecorded: "Keine Entscheidungen erfasst.",
    noFactsRecorded: "Keine Fakten erfasst.",
    noSourcesRecorded: "Keine Quellen erfasst.",
    noRelationshipsRecorded: "Keine Beziehungen erfasst.",
    noDraftProjects: "Keine Projektentwürfe.",
    noOpenQuestions: "Keine offenen Fragen.",
    noNextActions: "Keine nächsten Aktionen.",
    noRecentActivity: "Keine aktuelle Aktivität.",
    noDraftTextRecorded: "Kein Entwurfstext erfasst.",
    noReasonRecorded: "Kein Grund erfasst.",
    noContextRecorded: "Kein Kontext erfasst.",
    noProposedTextRecorded: "Kein vorgeschlagener Text erfasst.",
    noPendingIntake: "Kein ausstehender Eingang. Künftige Arme sollten hier landen, bevor sie den Kern berühren.",
    noReviewedIntake: "Noch kein geprüfter Eingang.",
    searchEmptyHint: "Suchen Sie nach Projektname, Entscheidung, Fakt, Quelle, Aktion, Beziehung, Bildbeschriftung oder Verlaufsgrund.",
    missingProject: "Projekt fehlt",
    noTargetProject: "Kein Zielprojekt",
    target: "Ziel",
    created: "Erstellt",
    reviewedBy: "Geprüft von",
    approvedBy: "Genehmigt von",
    untitled: "Ohne Titel",
    untitledIntake: "Eingang ohne Titel",
    untitledObject: "Objekt ohne Titel",
    untitledSource: "Quelle ohne Titel",
    attachedImageAlt: "Angehängtes Bild",
    imageDataUnavailable: "Bilddaten sind nicht verfügbar.",
    calendar: "Kalender",
    meeting: "Besprechung",
    api: "API",
    chat: "Chat",
    email: "E-Mail",
    other: "Sonstiges",
    projectStatus: "Projektstatus",
    proposedChange: "Vorgeschlagene Änderung",
    permissions: "Berechtigungen",
    restrictions: "Einschränkungen",
    schemaVersion: "Schemaversion",
    storageModeLabel: "Speichermodus",
    lastSettingsUpdate: "Letzte Einstellungsänderung",
    lastBackupExport: "Letzter Sicherungsexport",
    lastRestore: "Letzte Wiederherstellung",
    storageSpineVersion: "Speicher-Spine-Version",
    storageLayout: "Speicherlayout",
    storageSnapshotBytes: "Speicher-Snapshot-Bytes",
    attachmentRecords: "Anhangseinträge",
    extractTextCharacters: "Auszugstext-Zeichen",
    storageSizeLabel: "Speichergröße",
    activeProjectsLabel: "Aktive Projekte",
    archivedProjectsLabel: "Archivierte Projekte",
    actorsLabel: "Akteure",
    changesLabel: "Änderungen",
    sourcesLabel: "Quellen",
    extractsLabel: "Auszüge",
    imagesLabel: "Bilder",
    integrityDashboard: "Integritäts-Dashboard",
    localApiArmTransport: "Lokaler API-Arm-Transport",
    transportBoundaryNotice: "Connector-Zugriff nur über Loopback. Vorschläge gelangen in die Intake-Schleuse und benötigen weiterhin eine einzelne menschliche Genehmigung.",
    transportStatus: "Transportstatus",
    transportRunning: "Aktiv",
    transportStopped: "Gestoppt",
    transportAddress: "Lokale Adresse",
    secureToken: "Sicheres Token",
    secureStorage: "Sicherer Speicher",
    configured: "Konfiguriert",
    notConfigured: "Nicht konfiguriert",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    transportLastError: "Letzter Transportfehler",
    enableTransport: "Transport aktivieren",
    disableTransport: "Transport deaktivieren",
    rotateTransportToken: "Token erneuern",
    revokeTransport: "Transport widerrufen",
    transportEnableNotice: "Die Aktivierung öffnet einen durch Bearer-Token geschützten Listener ausschließlich auf 127.0.0.1. Sie erteilt keine Genehmigungsbefugnis.",
    transportDisableNotice: "Die Deaktivierung stoppt den Listener, behält aber das verschlüsselte Token für später.",
    transportRotateNotice: "Die Erneuerung macht das bisherige Connector-Token sofort ungültig.",
    transportRevokeNotice: "Der Widerruf stoppt den Listener und löscht das verschlüsselte Connector-Token.",
    transportPort: "Lokaler Port",
    transportTokenTitle: "Connector-Token",
    tokenOneTimeNotice: "Kopieren Sie dieses Token jetzt und bewahren Sie es sicher auf. Project State zeigt es nur nach einer Erneuerung erneut an.",
    tokenSaved: "Token wurde gespeichert",
    changedBy: "Geändert von",
    integrityStatus: "Integritätsstatus",
    healthy: "Gesund",
    warning: "Warnung",
    needsAttention: "Prüfen",
    objectCounts: "Objektzahlen",
    storageHealth: "Speicherzustand",
    orphanLinks: "Verwaiste Links",
    sourceFileReferences: "Quelldatei-Verweise",
    linkedUserIssues: "Probleme mit verknüpften Benutzern",
    oversizedContent: "Große Inhalte",
    recoverySignals: "Wiederherstellungssignale",
    noIntegrityIssues: "Keine Integritätsprobleme gefunden.",
    noStorageWarnings: "Keine Speicherwarnungen.",
    noBrokenLinks: "Keine defekten internen Links gefunden.",
    noSourceReferenceIssues: "Keine schwachen Quelldatei-Verweise gefunden.",
    noLinkedUserIssues: "Keine Probleme mit verknüpften Benutzern gefunden.",
    noOversizedContent: "Keine Warnungen zu großen Inhalten.",
    noRecoverySignals: "Keine Wiederherstellungssignale gefunden.",
    checkGenerated: "Prüfung erstellt",
    projectReference: "Projektverweis",
    missingSourceDetails: "Quelle hat weder Speicherort noch lokale Dateimetadaten noch Zusammenfassung.",
    missingLinkedUser: "Quelle verweist auf einen Benutzer, der nicht mehr existiert.",
    missingAttachedSource: "Angehängter Quellenlink verweist auf eine fehlende Quelle.",
    missingAttachedExtract: "Angehängter Quellenlink verweist auf einen fehlenden Auszug.",
    missingImageReference: "Bildanhang hat keine gespeicherten Daten und keinen lokalen Verweis.",
    missingImageTarget: "Bildanhang verweist auf ein fehlendes Objekt.",
    missingRelationshipTarget: "Beziehung verweist auf ein fehlendes Projekt.",
    largeExtractWarning: "Auszugstext ist groß.",
    largeAttachmentWarning: "Bildanhangsdaten sind groß.",
    recoveryModeNotActive: "Wiederherstellungsmodus ist nicht aktiv.",
    storageWarningStorageSizeDanger: "Speichergröße nähert sich der Browsergrenze.",
    storageWarningStorageSizeWarning: "Speichergröße wächst.",
    storageWarningAttachmentsDominateMainRecord: "Bilder nehmen den größten Teil des Haupteintrags ein.",
    storageWarningExtractsGrowingInMainRecord: "Auszugstext wächst im Haupteintrag."
  },
  es: {
    languageName: "Español",
    appTitle: "Project State",
    appKicker: "Registro de proyecto local primero",
    openingTitle: "Abriendo Project State",
    openingSubtitle: "Cargando la columna de almacenamiento y revisando los registros locales del proyecto.",
    search: "Buscar",
    searchPlaceholder: "Buscar proyectos y registros",
    refreshStorage: "Actualizar",
    refreshedFromStorage: "Actualizado desde almacenamiento.",
    storageRefreshFailed: "No se pudo actualizar el almacenamiento.",
    storageRecoveryNotice: "Project State no pudo cargar los datos guardados. Se conservaron los detalles de recuperación.",
    projects: "Proyectos",
    workInbox: "Bandeja de trabajo",
    workInboxSubtitle: "Elementos que necesitan atención humana en Project State.",
    inboxEmpty: "Nada necesita atención ahora.",
    inboxEmptyDetail: "Las revisiones pendientes, trabajo bloqueado, problemas de fuentes y acciones vencidas aparecerán aquí.",
    readyToApprove: "Listo para aprobar",
    needsReview: "Necesita revisión",
    blockedWork: "Bloqueado",
    dueSoon: "Vence pronto",
    overdue: "Vencido",
    missingSource: "Fuente faltante",
    integrityWarning: "Advertencia de integridad",
    draftWaiting: "Borrador en espera",
    openQuestionNeedsAction: "Pregunta sin acción",
    goToProject: "Ir al proyecto",
    goToIntake: "Ir a entrada",
    goToSettings: "Ir a ajustes",
    openItem: "Abrir elemento",
    assignment: "Asignación",
    assignments: "Asignaciones",
    assignObject: "Asignar",
    assignedTo: "Asignado a",
    assignmentRole: "Rol de asignación",
    assignmentOwner: "Responsable",
    assignmentReviewer: "Revisor",
    assignmentApprover: "Aprobador",
    assignmentWatcher: "Observador",
    comments: "Comentarios",
    reviewThread: "Hilo de revisión",
    addComment: "Agregar comentario",
    commentText: "Comentario",
    commentsNotPrivateNotice: "Los comentarios son parte del registro del proyecto y no son privados.",
    reviewState: "Estado de revisión",
    projectRoles: "Roles del proyecto",
    manageProjectRoles: "Gestionar roles del proyecto",
    projectRole: "Rol del proyecto",
    proposalDiff: "Diferencia de propuesta",
    currentValue: "Valor actual",
    proposedValue: "Valor propuesto",
    conflictWarning: "Advertencia de conflicto",
    changedSinceOpened: "Este registro puede haber cambiado desde que se abrió. Revisa antes de aprobar.",
    notificationQueue: "Cola de notificaciones",
    assignedToYou: "Asignado a ti",
    aiWorkOrders: "Órdenes de trabajo IA",
    aiWorkOrder: "Orden de trabajo IA",
    aiWorkOrdersSubtitle: "Solicitudes de trabajo creadas por humanos para futuros brazos IA. Los resultados deben volver por el airlock.",
    createAiWorkOrder: "Crear orden de trabajo IA",
    aiWorkOrderNotice: "Esto solo crea una orden de trabajo. No llama a la IA ni cambia Project State.",
    workOrderTask: "Tarea",
    outputType: "Tipo de salida",
    canCreateIntake: "Puede crear propuestas de entrada",
    noAiWorkOrders: "No hay órdenes de trabajo IA registradas.",
    inProgress: "En curso",
    revisionRequested: "Revisión solicitada",
    projectConfidence: "Confianza del proyecto",
    projectCompleteness: "Completitud del proyecto",
    airlockCompleteness: "Completitud del airlock",
    airlockIncompleteNotice: "Este elemento está incompleto y no puede pasar el airlock.",
    requiredAirlockChecks: "Revisiones requeridas del airlock",
    present: "Presente",
    missing: "Falta",
    hasCurrentStatus: "Estado actual",
    hasCurrentSummary: "Resumen actual",
    hasNextAction: "Próxima acción",
    hasRecentDecision: "Decisión reciente",
    hasSourceReference: "Referencia de fuente",
    sourceFilesClear: "Archivos fuente claros",
    healthNotBlocked: "No bloqueado ni en riesgo",
    targetProjectSelected: "Proyecto objetivo seleccionado",
    proposedTitleRecorded: "Título de propuesta registrado",
    proposedTextRecorded: "Texto de propuesta registrado",
    proposedTypeSelected: "Tipo de propuesta seleccionado",
    queueMarkedReady: "Cola marcada lista",
    draftNameRecorded: "Nombre del borrador registrado",
    draftTextRecorded: "Texto del borrador registrado",
    draftReviewComplete: "Revisión del borrador completa",
    draftSourceLinked: "Fuente y extracto vinculados",
    archivedProjects: "Proyectos archivados",
    intake: "Entrada",
    backup: "Copia de seguridad",
    restore: "Restaurar",
    exportJson: "Exportar JSON",
    addIntake: "Agregar entrada",
    createProject: "Crear proyecto",
    addMenu: "Agregar",
    moreActions: "Más acciones",
    viewDetails: "Ver detalles",
    objectDetails: "Detalles del objeto",
    closeDetails: "Cerrar detalles",
    continueWorking: "Continuar trabajando",
    continueLastProject: "Continuar último proyecto",
    recentProjects: "Proyectos recientes",
    noRecentProjects: "No hay proyectos abiertos recientemente.",
    batchTriage: "Clasificación por lote",
    batchTriageNotice: "La clasificación solo cambia el estado de la cola. Cada aprobación aún requiere su propia revisión humana, confirmación, actor y razón.",
    selectIntakeItems: "Seleccionar entradas",
    applyTriage: "Aplicar clasificación",
    proposeCorrection: "Proponer corrección",
    correctionNotice: "Esto crea una propuesta en Airlock. No cambia el registro aprobado hasta que una persona lo apruebe.",
    correctedContent: "Contenido corregido",
    correctionProposed: "Corrección propuesta",
    correctionApproved: "Corrección aprobada",
    permissionDenied: "El rol del actor seleccionado no permite esta acción.",
    currentActorRole: "Rol actual del actor",
    openReferencedObject: "Abrir objeto referenciado",
    backToProjects: "Volver a proyectos",
    saved: "Guardado",
    setupTitle: "Configurar Project State",
    setupSubtitle: "Esto configura el uso local, la guía de copias de seguridad y el actor principal para cambios aprobados.",
    primaryActor: "Actor principal",
    backupLocation: "Ubicación de copia de seguridad",
    backupLocationPlaceholder: "Ejemplo: unidad externa / copias de Project State",
    backupReminder: "Recordatorio de copia",
    language: "Idioma",
    localModeConfirm: "Entiendo que este es un modo local de un solo usuario y que las copias de seguridad las controla el usuario.",
    recoveryWarnings: "Mostrar advertencias de almacenamiento y recuperación.",
    saveSetup: "Guardar configuración",
    manual: "Manual",
    weekly: "Semanal",
    monthly: "Mensual",
    active: "Activo",
    blocked: "Bloqueado",
    atRisk: "En riesgo",
    complete: "Completo",
    onHold: "En pausa",
    pending: "Pendiente",
    approved: "Aprobado",
    rejected: "Rechazado",
    archived: "Archivado",
    withApproval: "Con aprobación",
    aiSuggested: "Sugerido por IA",
    settings: "Configuración",
    settingsSubtitle: "Configuración local de la app para idioma, actores, almacenamiento, copias de seguridad, recuperación y política de seguridad.",
    coreSettings: "Configuración principal",
    defaultLanguage: "Idioma predeterminado",
    defaultActor: "Actor predeterminado",
    saveCoreSettings: "Guardar configuración principal",
    usersActors: "Usuarios / Actores",
    noActorsRecorded: "No hay actores registrados.",
    newActorName: "Nombre del nuevo actor",
    role: "Rol",
    addActor: "Agregar actor",
    storageSystem: "Sistema de almacenamiento",
    platformStorageSpine: "Columna de almacenamiento de plataforma",
    platformAdapterLabel: "Adaptador de plataforma",
    primaryStorage: "Almacenamiento principal",
    localBrowserStorageSpine: "Columna de almacenamiento local del navegador",
    desktopRuntime: "Entorno de app de escritorio",
    desktopRuntimeReady: "Columna de almacenamiento de escritorio activa.",
    browserDevRuntime: "Entorno navegador / desarrollo",
    browserRuntimeWarning: "Project State se está ejecutando sin el puente de escritorio. El modo navegador es solo para exportación heredada, migración y desarrollo; usa la app de escritorio para almacenamiento completo, copias, restauración, entrada y trabajo de API.",
    browserDevGateTitle: "Modo navegador/desarrollo",
    browserDevGateSubtitle: "El puente de escritorio es obligatorio para el modo real de Project State.",
    browserDevGateNotice: "Esta pantalla puede inspeccionar datos locales cargados y exportar datos sin procesar para migración. No guarda, migra, crea copias, restaura, ingresa ni edita registros de Project State en silencio.",
    browserDevGateReadOnly: "Acceso de solo lectura/desarrollo",
    browserDevGateCounts: "Registros cargados",
    browserDevNoSilentStorage: "Ningún trabajo serio de almacenamiento se ejecuta sin el puente de escritorio.",
    saveBlockedApproval: "Cambios sin guardar: la puerta de aprobación bloqueó el guardado",
    saveStorageFailed: "Cambios sin guardar: {message}",
    storageFailed: "fallo de almacenamiento",
    savedAt: "Guardado {time}",
    unsavedChanges: "Cambios sin guardar",
    storageWarningTitle: "Advertencia de almacenamiento",
    storageWarningDanger: "Los datos locales guardados son muy grandes. El almacenamiento del navegador puede fallar pronto, especialmente con imágenes o extractos largos.",
    storageWarningNotice: "Los datos locales guardados están creciendo. Las imágenes y los extractos largos pueden ralentizar los guardados.",
    currentSizeSentence: "Tamaño actual: {size}.",
    resetFailedDataConfirmFirst: "¿Restablecer los datos locales de Project State? Exporta primero los datos fallidos. Esto borra solo los datos locales guardados por esta app.",
    resetFailedDataConfirmSecond: "Confirmación final: ¿restablecer los datos locales y empezar con un almacén Project State vacío?",
    resetAllDataConfirmFirst: "¿Restablecer todos los datos locales de Project State? Exporta primero una copia completa. Esto borra solo los datos locales guardados por esta app.",
    resetAllDataConfirmSecond: "Confirmación final: ¿restablecer los datos locales y volver a la configuración inicial?",
    resetComplete: "Restablecimiento terminado",
    currentMode: "Modo actual",
    currentSize: "Tamaño actual",
    storageOverrideAcknowledged: "Registrar que se reconoció una excepción de almacenamiento o migración.",
    storageOverrideReason: "Razón de excepción de almacenamiento",
    saveStorageSettings: "Guardar configuración de almacenamiento",
    backupSystem: "Sistema de copia de seguridad",
    backupLocationWarning: "El almacenamiento principal y la copia de seguridad no deben estar en la misma ubicación salvo en una implementación con servidor.",
    backupOverrideAcknowledged: "Permitir una excepción de ubicación de copia con advertencia registrada.",
    backupOverrideReason: "Razón de excepción de copia",
    desktopBackupPackageNotice: "Crear un paquete de copia de escritorio desde la columna de almacenamiento activa. Actor, marca de tiempo y razón son obligatorios.",
    exportedBy: "Exportado por",
    backupReason: "Razón de copia",
    backupPackageCreated: "Paquete de copia creado",
    backupPackageUnavailable: "La compatibilidad con paquetes de copia de escritorio no está disponible.",
    exportFullBackup: "Exportar copia completa",
    restoreBackup: "Restaurar copia",
    saveBackupSettings: "Guardar configuración de copia",
    recovery: "Recuperación",
    recoveryControlsNotice: "Los controles de recuperación son solo locales. Exporta antes de restablecer.",
    exportRawCurrentData: "Exportar datos brutos actuales",
    resetLocalData: "Restablecer datos locales",
    approvalAirlock: "Aprobación / Airlock",
    lockedOn: "Bloqueado",
    approvalPolicyHuman: "Se requiere aprobación humana antes de que una entrada llegue al núcleo.",
    approvalPolicyAudit: "Los cambios de proyecto y objeto requieren actor, marca de tiempo, razón y detalles del objeto cambiado.",
    approvalPolicyArms: "Los brazos externos escriben primero en la entrada, no directamente en Project State ni en la columna de almacenamiento.",
    diagnostics: "Diagnósticos",
    actorName: "Nombre del actor",
    actorId: "ID del actor",
    emailAddress: "Correo electrónico",
    chatHandle: "Identificador de chat",
    linkedUsers: "Usuarios vinculados",
    linkedProjectStateUsers: "Usuarios de Project State vinculados",
    noLinkedUsers: "No hay usuarios vinculados.",
    communicationRecordsNotice: "Los chats y correos registrados son registros de Project State. No son privados.",
    userPrivacyNotice: "Los usuarios de Project State deben asumir que los chats, correos, fuentes e historial de proyecto registrados son visibles para usuarios autorizados de Project State.",
    defaultActorPill: "Actor predeterminado",
    saveActor: "Guardar actor",
    owner: "Propietario",
    admin: "Administrador",
    projectLead: "Responsable del proyecto",
    approver: "Aprobador",
    editor: "Editor",
    contributor: "Colaborador",
    reviewer: "Revisor",
    auditor: "Auditor",
    viewer: "Lector",
    aiTool: "IA / Herramienta",
    reason: "Razón",
    status: "Estado",
    storageMigrationNotice: "El almacenamiento principal está integrado en esta app local. Cambiar el sistema de almacenamiento más adelante debe tratarse como una migración, no como un ajuste casual.",
    settingsReasonPlaceholder: "¿Por qué cambian estos ajustes?",
    storageReasonPlaceholder: "¿Por qué cambian los ajustes de almacenamiento?",
    backupReasonPlaceholder: "¿Por qué cambian los ajustes de copia de seguridad?",
    actorReasonPlaceholder: "¿Por qué cambia este actor?",
    addActorReasonPlaceholder: "¿Por qué se agrega este actor?",
    restoredBy: "Restaurado por",
    restoreReason: "Razón de restauración",
    permissionMatrix: "Matriz de permisos",
    permissionMatrixNote: "Los permisos de rol controlan las acciones mostradas para el actor predeterminado configurado. Sigue siendo una política local de un solo usuario, no autenticación de cuenta.",
    createPermission: "Crear",
    editPermission: "Editar",
    approvePermission: "Aprobar",
    auditPermission: "Auditar",
    adminPermission: "Admin",
    yes: "S",
    no: "N",
    mandatoryHistory: "Historial obligatorio",
    mandatoryHistoryNote: "Cada cambio aprobado de Project State debe registrar quién lo cambió, cuándo cambió, por qué cambió, qué cambió, cómo entró al núcleo y el idioma activo de la interfaz.",
    historyFieldActor: "Actor",
    historyFieldTimestamp: "Marca de tiempo",
    historyFieldReason: "Razón",
    historyFieldObject: "Objeto cambiado",
    historyFieldHow: "Cómo cambió",
    historyFieldLanguage: "Idioma",
    howChanged: "Cómo",
    languageAtChange: "Idioma",
    addDecision: "Agregar decisión",
    addExtract: "Agregar extracto",
    addFact: "Agregar hecho",
    addNextAction: "Agregar próxima acción",
    addOpenQuestion: "Agregar pregunta abierta",
    addRelationship: "Agregar relación",
    addSource: "Agregar fuente",
    approve: "Aprobar",
    approveDraft: "Aprobar borrador",
    approveExtract: "Aprobar extracto",
    archive: "Archivar",
    attachImage: "Adjuntar imagen",
    attachSource: "Adjuntar fuente",
    cancel: "Cancelar",
    clearSearch: "Borrar búsqueda",
    createDraftProject: "Crear proyecto borrador",
    dashboard: "Panel",
    deleteProject: "Eliminar proyecto",
    edit: "Editar",
    editStatus: "Editar estado",
    exportFailedData: "Exportar datos fallidos",
    markComplete: "Marcar completo",
    onePageOverview: "Resumen de una página",
    open: "Abrir",
    readFileExtract: "Leer extracto de archivo",
    reject: "Rechazar",
    review: "Revisar",
    suggestExtract: "Sugerir extracto",
    unarchiveProject: "Desarchivar proyecto",
    viewFullHistory: "Ver historial completo",
    viewHistory: "Ver historial",
    close: "Cerrar",
    saveToAirlock: "Guardar en airlock",
    approveToProjectState: "Aprobar a Project State",
    approveProject: "Aprobar proyecto",
    requestDeletion: "Solicitar eliminación",
    approveUnarchive: "Aprobar desarchivado",
    approveChange: "Aprobar cambio",
    approveEdit: "Aprobar edición",
    createDraft: "Crear borrador",
    saveReview: "Guardar revisión",
    approveToProject: "Aprobar al proyecto",
    approveCompletion: "Aprobar finalización",
    recordSuggestion: "Registrar sugerencia",
    approveAttachment: "Aprobar adjunto",
    approveImage: "Aprobar imagen",
    approveArchive: "Aprobar archivado",
    approveDecision: "Aprobar decisión",
    approveFact: "Aprobar hecho",
    approveSource: "Aprobar fuente",
    approveRelationship: "Aprobar relación",
    approveQuestion: "Aprobar pregunta",
    approveAction: "Aprobar acción",
    restoreProjectStateBackup: "Restaurar copia de Project State",
    approveIntake: "Aprobar entrada",
    rejectIntake: "Rechazar entrada",
    archiveIntake: "Archivar entrada",
    editCurrentStatus: "Editar estado actual",
    editProject: "Editar proyecto",
    editDecision: "Editar decisión",
    editFact: "Editar hecho",
    editSource: "Editar fuente",
    editExtract: "Editar extracto",
    editRelationship: "Editar relación",
    reviewDraftProject: "Revisar proyecto borrador",
    editOpenQuestion: "Editar pregunta abierta",
    editNextAction: "Editar próxima acción",
    markActionComplete: "Marcar acción completa",
    relationshipPlaceholder: "Padre, hijo, dependencia, relacionado",
    historyReason: "Razón",
    historyChanged: "Cambiado",
    savedDataNeedsRecovery: "Los datos guardados necesitan recuperación",
    noActiveProjects: "No hay proyectos activos",
    noArchivedProjects: "No hay proyectos archivados",
    roleDefinitions: "Definiciones de roles",
    intakeAirlock: "Airlock de entrada",
    intakeAirlockSubtitle: "Los brazos externos pueden proponer cambios aquí. Se requiere aprobación humana antes de que algo llegue a Project State.",
    approvalQueueSummary: "Resumen de la cola de aprobación",
    approvalQueueReview: "Revisión de cola",
    approvalQueueReviewNotice: "La revisión de cola clasifica una entrada. No aprueba el cambio ni lo escribe en Project State.",
    approvalChecklist: "Lista de aprobación",
    queueState: "Estado de cola",
    queueNew: "Nuevo",
    queueNeedsReview: "Necesita revisión",
    queueReady: "Listo",
    queueBlocked: "Bloqueado",
    reviewQueueItem: "Revisar entrada",
    saveQueueReview: "Guardar revisión",
    queueReviewNotes: "Notas de revisión",
    approvalQueueReadyRequired: "La revisión de cola debe marcar esta entrada como lista antes de aprobarla.",
    confirmProposalReviewed: "Revisé la propuesta y el proyecto objetivo.",
    confirmApprovalWritesCore: "Entiendo que aprobar escribe esta propuesta en Project State.",
    confirmInputsNotAuthority: "Entiendo que conversaciones, archivos y sugerencias de IA externas son entradas, no autoridad.",
    age: "Antigüedad",
    pendingReview: "Revisión pendiente",
    reviewedIntake: "Entrada revisada",
    currentState: "Estado actual",
    currentObjects: "Objetos actuales",
    recentActivity: "Actividad reciente",
    recentDecisions: "Decisiones recientes",
    decisionRelationship: "Relación entre decisiones",
    decisionNoRelationship: "Ninguna decisión anterior",
    supersedesDecision: "Anula una decisión anterior",
    replacesDecision: "Reemplaza una decisión anterior",
    supersedes: "Anula",
    replaces: "Reemplaza",
    supersededBy: "Anulada por",
    replacedBy: "Reemplazada por",
    missingDecision: "Decisión faltante",
    whatChangedSince: "Qué cambió desde…",
    whatChangedSinceSubtitle: "Una vista de solo lectura de los cambios registrados desde la fecha seleccionada.",
    sinceDate: "Desde la fecha",
    changesFound: "Cambios encontrados",
    noChangesSince: "No hay cambios registrados desde esta fecha.",
    relationships: "Relaciones",
    projectMap: "Mapa del proyecto",
    projectMapSubtitle: "Relaciones, evidencia y trabajo sin resolver alrededor de este proyecto.",
    handoffMode: "Modo traspaso",
    handoffSubtitle: "Un resumen de solo lectura para una persona o ayuda de IA que se suma al proyecto.",
    exportHandoff: "Exportar traspaso",
    whatThisProjectIs: "Qué es este proyecto",
    whyItMatters: "Por qué importa",
    whatChangedRecently: "Qué cambió recientemente",
    waitingOnApproval: "En espera de aprobación",
    blockersAndRisks: "Bloqueos y riesgos",
    whoOwnsWhat: "Quién tiene qué",
    trustedSources: "Fuentes confiables",
    sourceTrustLevel: "Nivel de confianza de fuente",
    sourceTrustPrimary: "Primaria",
    sourceTrustSupporting: "De apoyo",
    sourceTrustUnverified: "No verificada",
    sourceTrustSuperseded: "Reemplazada",
    sourceTrustConflicting: "En conflicto",
    sourceFreshness: "Vigencia de la fuente",
    freshnessCurrent: "Vigente",
    freshnessReviewDue: "Revisión próxima",
    freshnessStale: "Desactualizada",
    freshnessNotReviewed: "Sin revisar",
    freshnessLastReviewed: "Última revisión",
    freshnessNextReview: "Próxima revisión",
    lastReviewedBy: "Revisada por",
    reviewFreshness: "Revisar vigencia",
    reviewSourceFreshness: "Revisar vigencia de la fuente",
    freshnessReviewNotice: "La vigencia se basa únicamente en una revisión humana registrada y una fecha de próxima revisión. Verificar el archivo no certifica que el contenido esté vigente.",
    freshnessReviewed: "Vigencia de la fuente revisada",
    staleSourceWarning: "La revisión de la fuente está vencida o próxima.",
    validationReviewDueAfterReviewed: "La próxima revisión debe ser el mismo día o posterior a la fecha de revisión.",
    validationRelatedDecisionRequired: "Elige la decisión anterior que esta decisión anula o reemplaza.",
    trustBoundary: "Límite de confianza",
    trustBoundaryExternal: "Entrada externa",
    trustBoundaryAirlock: "Propuesta en Airlock",
    trustBoundaryCore: "Registro de Project State",
    trustBoundaryReadOnly: "Vista / exportación de solo lectura",
    trustBoundaryEvidenceNotice: "Esta etiqueta muestra la posición en el flujo, no la verdad. Las fuentes siguen siendo evidencia y no pueden aprobarse a sí mismas.",
    conflictRegister: "Registro de conflictos",
    addConflict: "Agregar conflicto",
    editConflict: "Editar conflicto",
    conflictTitle: "Título del conflicto",
    conflictDescription: "Descripción del conflicto",
    linkedItems: "Elementos vinculados",
    conflictStatus: "Estado del conflicto",
    conflictUnresolved: "Sin resolver",
    conflictUnderReview: "En revisión",
    conflictResolved: "Resuelto",
    resolution: "Resolución",
    noConflictsRecorded: "No hay conflictos registrados.",
    aiAllowedHelp: "Ayuda de IA permitida",
    doNotTouch: "No tocar",
    handoffNoApprovalItems: "No hay elementos esperando aprobación.",
    handoffNoBlockers: "No hay bloqueos ni riesgos registrados.",
    handoffNoAssignments: "No hay asignaciones ni roles de proyecto registrados.",
    handoffNoTrustedSources: "No hay fuentes verificadas o activas registradas.",
    handoffAiBoundary: "La IA puede resumir, buscar, redactar y sugerir. La IA no puede aprobar, escribir en Core, escribir en Spine, borrar historial ni convertirse en fuente de verdad.",
    handoffDoNotTouchDefault: "No omitas el Intake Airlock, no sobrescribas historial, no apruebes elementos incompletos ni trates comentarios o extractos como verdad Core.",
    contextPack: "Paquete de contexto",
    contextPackNotice: "Exporta un paquete de contexto local y acotado para un futuro brazo API o IA. Esto no cambia Project State.",
    contextPackPreset: "Preajuste de paquete de contexto",
    contextPresetCurrentState: "Solo estado actual",
    contextPresetRecentDecisions: "Estado actual + decisiones recientes",
    contextPresetHandoff: "Traspaso completo del proyecto",
    contextPresetSourceResearch: "Contexto de investigación con muchas fuentes",
    contextPresetCodexImplementation: "Contexto de implementación Codex",
    contextPresetCustom: "Personalizado",
    contextPresetNotice: "Los preajustes eligen alcance, presupuesto y secciones incluidas. Personalizado usa los controles de abajo.",
    contextScope: "Alcance de contexto",
    contextScopeProject: "Solo este proyecto",
    contextScopeRelated: "Este proyecto y proyectos vinculados",
    contextScopeSources: "Enfoque en fuentes y extractos",
    contextBudget: "Presupuesto de contexto",
    budgetQuick: "Escaneo rápido",
    budgetNormal: "Revisión normal",
    budgetDeep: "Revisión profunda",
    includeSources: "Incluir fuentes y fragmentos de extracto",
    includeHistory: "Incluir historial reciente",
    includeOpenWork: "Incluir preguntas abiertas y próximas acciones",
    includeDecisions: "Incluir decisiones",
    includeFacts: "Incluir hechos",
    includeRelationships: "Incluir relaciones",
    exportContextPack: "Exportar paquete de contexto",
    linkedProjects: "Proyectos vinculados",
    incomingLinks: "Enlaces entrantes",
    outgoingLinks: "Enlaces salientes",
    evidenceTrail: "Rastro de evidencia",
    sourceCoverage: "Cobertura de fuentes",
    unresolvedWork: "Trabajo sin resolver",
    noLinkedProjects: "No hay proyectos vinculados registrados.",
    noEvidenceRecorded: "No hay fuentes ni extractos registrados.",
    facts: "Hechos",
    sources: "Fuentes",
    draftProjects: "Proyectos borrador",
    lastUpdated: "Última actualización",
    updated: "Actualizado",
    updatedBy: "Actualizado por",
    health: "Salud",
    project: "Proyecto",
    generated: "Generado",
    extract: "Extracto",
    attachedImages: "Imágenes adjuntas:",
    attachedSources: "Fuentes adjuntas:",
    added: "Agregado",
    localReference: "Referencia local",
    allEvents: "Todos los eventos",
    eventType: "Tipo de evento",
    projectName: "Nombre del proyecto",
    currentStatus: "Estado actual",
    projectHealth: "Salud del proyecto",
    currentSummary: "Resumen actual",
    backupFile: "Archivo de copia",
    arm: "Brazo",
    targetProject: "Proyecto destino",
    proposedChangeType: "Tipo de cambio propuesto",
    intakeTitle: "Título de entrada",
    proposedText: "Texto propuesto",
    summaryContext: "Resumen / Contexto",
    sourceOriginLabel: "Etiqueta de fuente / origen",
    relationshipTargetOwner: "Destino / responsable de la relación",
    dueDate: "Fecha límite",
    decision: "Decisión",
    confidence: "Confianza",
    fact: "Hecho",
    source: "Fuente",
    title: "Título",
    type: "Tipo",
    capitalizationDoesNotMatter: "No importa si usas mayúsculas o minúsculas.",
    unknown: "Desconocido",
    dateAdded: "Fecha agregada",
    actor: "Actor",
    location: "Ubicación",
    localFile: "Archivo local",
    modified: "Modificado",
    findLocalFile: "Buscar archivo local",
    browseFile: "Buscar archivo…",
    browseFolder: "Buscar carpeta…",
    filesLibrary: "Archivos",
    filesLibrarySubtitle: "Importa, revisa y controla archivos administrados del proyecto.",
    importFiles: "Importar archivos",
    importFolder: "Importar carpeta",
    noManagedFiles: "No se han importado archivos administrados.",
    pendingFileImports: "Importaciones de archivos pendientes",
    approvedManagedFiles: "Archivos administrados aprobados",
    fileImportReview: "Revisar importación de archivos",
    fileImportReviewNotice: "Revisa los archivos seleccionados y elige su proyecto de destino. La importación crea copias administradas en Entrada; no las aprueba dentro del proyecto.",
    importToIntake: "Importar a Entrada",
    fileImportComplete: "Se crearon copias administradas y se enviaron a Entrada.",
    unsupportedFilesSkipped: "Archivos no compatibles o ilegibles omitidos",
    originalFilePreserved: "Los archivos originales permanecen en su lugar y nunca se mueven ni eliminan.",
    managedCopy: "Copia administrada",
    originalLocation: "Ubicación original",
    selectedFiles: "Archivos seleccionados",
    fileImportFailed: "No se pudo importar ningún archivo.",
    recursiveFolderImport: "Las carpetas se analizan recursivamente en busca de archivos compatibles.",
    verifyFile: "Verificar archivo",
    verifySourceFiles: "Verificar archivos fuente",
    sourceFileVerification: "Verificación de archivos fuente",
    fileVerified: "Archivo verificado",
    fileChanged: "Archivo cambiado",
    fileMissing: "Archivo faltante",
    fileUnverifiable: "Archivo no verificable",
    lastVerified: "Última verificación",
    verificationReasonPlaceholder: "¿Por qué se verifican los archivos fuente?",
    sourceFileVerificationComplete: "Verificación de archivos fuente completa.",
    sourceFileVerificationNotice: "El modo de escritorio puede verificar rutas locales absolutas. El modo navegador/desarrollo solo puede marcar archivos fuente como no verificables.",
    summary: "Resumen",
    tags: "Etiquetas",
    mode: "Modo",
    suggestionStatus: "Estado de sugerencia",
    truncated: "Truncado",
    related: "Relacionado",
    relatedProjectOrEntity: "Proyecto o entidad relacionada",
    relationshipType: "Tipo de relación",
    notes: "Notas",
    name: "Nombre",
    draft: "Borrador",
    approvedProjectName: "Nombre del proyecto aprobado",
    approvedProjectSummary: "Resumen del proyecto aprobado",
    openQuestion: "Pregunta abierta",
    openQuestions: "Preguntas abiertas",
    context: "Contexto",
    nextAction: "Próxima acción",
    nextActions: "Próximas acciones",
    ownerField: "Responsable",
    completedDate: "Fecha de finalización",
    suggestedBy: "Sugerido por",
    suggestedExtract: "Extracto sugerido",
    imageFile: "Archivo de imagen",
    captionNotes: "Pie / Notas",
    file: "Archivo",
    factsReviewed: "Hechos revisados",
    decisionsReviewed: "Decisiones revisadas",
    questionsReviewed: "Preguntas revisadas",
    actionsReviewed: "Acciones revisadas",
    relationshipsReviewed: "Relaciones revisadas",
    readyForApproval: "Listo para aprobación",
    due: "Vence",
    notSet: "No definido",
    completed: "Completado",
    notCompleted: "No completado",
    noDueDate: "Sin fecha límite",
    searchResultsFor: "{count} resultados para \"{query}\"",
    noSearchResultsFor: "Sin resultados para \"{query}\"",
    limitCharacters: "Límite de {limit} caracteres",
    viewImage: "Ver {name}",
    attachedImage: "Imagen adjunta",
    draftProjectDefault: "Proyecto borrador",
    changeHistory: "Historial de cambios",
    addSourceBeforeAttaching: "Agrega una fuente antes de adjuntar una a este objeto.",
    approvalAppliesChangeNotice: "La aprobación aplica este cambio propuesto al proyecto seleccionado y lo registra en el historial.",
    approvalCreatesProjectNotice: "La aprobación crea un nuevo proyecto desde este borrador y registra la aprobación en el borrador.",
    approvalRecordsSuggestionNotice: "La aprobación registra esta sugerencia de IA como aceptada por una persona revisora.",
    archivedProjectsNotice: "Los proyectos archivados se mantienen fuera de la lista activa. Desarchiva un proyecto para volver a usarlo.",
    archivedProjectsEmpty: "Los proyectos archivados aparecerán aquí.",
    archiveIntakeNotice: "Archivar quita la entrada de la revisión activa pero mantiene el registro en la columna de almacenamiento.",
    archiveObjectNotice: "Archivar quita el objeto del panel actual pero mantiene su historial.",
    chooseProjectEmpty: "Elige un proyecto para ver su estado actual e historial.",
    createProjectEmpty: "Crea un proyecto o abre Proyectos archivados para restaurar uno.",
    stateHistorySeparate: "El estado actual y el registro histórico se mantienen en vistas separadas.",
    deletionNotice: "La eliminación no borra datos en v0.1. El proyecto se archivará y se marcará como pendiente de aprobación de eliminación. El proceso final de aprobación aún está por determinarse.",
    errorDetails: "Detalles del error",
    recoveryExportNotice: "Exporta los datos brutos guardados antes de restablecer. El restablecimiento solo debe usarse después de respaldar los datos fallidos.",
    recoveryLoadNotice: "Project State no pudo cargar de forma segura los datos locales guardados. Los datos guardados originales no se han cambiado.",
    readsFileExtractNotice: "Lee TXT/MD directamente. La extracción PDF y DOCX es de mejor esfuerzo y permanece local.",
    rejectIntakeNotice: "Rechazar mantiene el registro de entrada pero evita que llegue a Project State.",
    restoreBackupNotice: "Restaurar reemplaza la columna de almacenamiento local con el archivo de copia seleccionado. No usa servidor.",
    createDraftFromExtractNotice: "Esto crea un borrador desde el extracto seleccionado. No crea un nuevo proyecto hasta que se apruebe.",
    proposedChangeNotice: "Esto crea solo un cambio propuesto. No cambiará Project State hasta que se apruebe.",
    unarchiveNotice: "Desarchivar devuelve el proyecto al uso actual y registra la aprobación en el historial.",
    validationReasonRequired: "Se requiere una razón.",
    validationActorRequired: "Se requiere actor.",
    validationActorNameRequired: "Se requiere el nombre del actor.",
    validationActorExists: "Ya existe un actor con este nombre.",
    validationExtractFileType: "Elige un archivo PDF, DOCX, TXT o MD.",
    validationImageFileType: "Elige una imagen PNG, JPG, WEBP o GIF.",
    validationBackupFileType: "Elige un archivo JSON de copia de Project State.",
    validationDefaultActorArchive: "Elige otro actor predeterminado antes de archivar este actor.",
    validationActiveDefaultActor: "Elige un actor predeterminado activo.",
    validationConfirmLocalMode: "Confirma el modo local antes de continuar.",
    validationConfirmRestore: "Confirma la restauración antes de continuar.",
    validationNoReadableText: "No se encontró texto legible en este archivo.",
    validationPrimaryActorRequired: "Se requiere el actor principal.",
    validationStorageOverrideReason: "Registra la razón de la excepción de almacenamiento.",
    validationBackupOverrideReason: "Registra la razón de la excepción de copia.",
    validationRestoreReasonRequired: "Se requiere una razón de restauración.",
    validationBackupUnreadable: "Este archivo de copia no es JSON legible.",
    validationInvalidBackup: "Esta no es una copia válida de Project State.",
    validationReadExtractFailed: "No se pudo leer texto de este archivo.",
    notRecorded: "No registrado",
    noErrorDetailsRecorded: "No hay detalles de error registrados.",
    noCurrentStatusRecorded: "No hay estado actual registrado.",
    noStatusRecorded: "No hay estado registrado.",
    noCurrentSummaryRecorded: "No hay resumen actual registrado.",
    noChangesRecordedForFilter: "No hay cambios registrados para este filtro.",
    noDecisionsRecorded: "No hay decisiones registradas.",
    noFactsRecorded: "No hay hechos registrados.",
    noSourcesRecorded: "No hay fuentes registradas.",
    noRelationshipsRecorded: "No hay relaciones registradas.",
    noDraftProjects: "No hay proyectos borrador.",
    noOpenQuestions: "No hay preguntas abiertas.",
    noNextActions: "No hay próximas acciones.",
    noRecentActivity: "No hay actividad reciente.",
    noDraftTextRecorded: "No hay texto de borrador registrado.",
    noReasonRecorded: "No hay razón registrada.",
    noContextRecorded: "No hay contexto registrado.",
    noProposedTextRecorded: "No hay texto propuesto registrado.",
    noPendingIntake: "No hay entradas pendientes. Los brazos futuros deben llegar aquí antes de tocar el núcleo.",
    noReviewedIntake: "Aún no hay entradas revisadas.",
    searchEmptyHint: "Prueba con nombre de proyecto, decisión, hecho, fuente, acción, relación, pie de imagen o razón del historial.",
    missingProject: "Proyecto faltante",
    noTargetProject: "Sin proyecto destino",
    target: "Destino",
    created: "Creado",
    reviewedBy: "Revisado por",
    approvedBy: "Aprobado por",
    untitled: "Sin título",
    untitledIntake: "Entrada sin título",
    untitledObject: "Objeto sin título",
    untitledSource: "Fuente sin título",
    attachedImageAlt: "Imagen adjunta",
    imageDataUnavailable: "Los datos de la imagen no están disponibles.",
    calendar: "Calendario",
    meeting: "Reunión",
    api: "API",
    chat: "Chat",
    email: "Correo",
    other: "Otro",
    projectStatus: "Estado del proyecto",
    proposedChange: "Cambio propuesto",
    permissions: "Permisos",
    restrictions: "Restricciones",
    schemaVersion: "Versión del esquema",
    storageModeLabel: "Modo de almacenamiento",
    lastSettingsUpdate: "Última actualización de configuración",
    lastBackupExport: "Última exportación de copia",
    lastRestore: "Última restauración",
    storageSpineVersion: "Versión de la columna de almacenamiento",
    storageLayout: "Diseño de almacenamiento",
    storageSnapshotBytes: "Bytes de instantánea de almacenamiento",
    attachmentRecords: "Registros de adjuntos",
    extractTextCharacters: "Caracteres de texto extraído",
    storageSizeLabel: "Tamaño de almacenamiento",
    activeProjectsLabel: "Proyectos activos",
    archivedProjectsLabel: "Proyectos archivados",
    actorsLabel: "Actores",
    changesLabel: "Cambios",
    sourcesLabel: "Fuentes",
    extractsLabel: "Extractos",
    imagesLabel: "Imágenes",
    integrityDashboard: "Panel de integridad",
    localApiArmTransport: "Transporte local del brazo API",
    transportBoundaryNotice: "Acceso del conector solo mediante bucle local. Las propuestas entran en la esclusa de admisión y aún requieren aprobación humana individual.",
    transportStatus: "Estado del transporte",
    transportRunning: "En ejecución",
    transportStopped: "Detenido",
    transportAddress: "Dirección local",
    secureToken: "Token seguro",
    secureStorage: "Almacenamiento seguro",
    configured: "Configurado",
    notConfigured: "No configurado",
    available: "Disponible",
    unavailable: "No disponible",
    transportLastError: "Último error de transporte",
    enableTransport: "Activar transporte",
    disableTransport: "Desactivar transporte",
    rotateTransportToken: "Rotar token",
    revokeTransport: "Revocar transporte",
    transportEnableNotice: "La activación abre un receptor protegido con token solo en 127.0.0.1. No concede autoridad de aprobación.",
    transportDisableNotice: "La desactivación detiene el receptor, pero conserva el token cifrado para usarlo después.",
    transportRotateNotice: "La rotación invalida inmediatamente el token anterior del conector.",
    transportRevokeNotice: "La revocación detiene el receptor y elimina el token cifrado del conector.",
    transportPort: "Puerto local",
    transportTokenTitle: "Token del conector",
    tokenOneTimeNotice: "Copie este token ahora y guárdelo de forma segura. Project State no volverá a mostrarlo salvo que lo rote.",
    tokenSaved: "Guardé el token",
    changedBy: "Modificado por",
    integrityStatus: "Estado de integridad",
    healthy: "Sano",
    warning: "Advertencia",
    needsAttention: "Requiere atención",
    objectCounts: "Conteo de objetos",
    storageHealth: "Salud del almacenamiento",
    orphanLinks: "Enlaces huérfanos",
    sourceFileReferences: "Referencias de archivos fuente",
    linkedUserIssues: "Problemas de usuarios vinculados",
    oversizedContent: "Contenido grande",
    recoverySignals: "Señales de recuperación",
    noIntegrityIssues: "No se encontraron problemas de integridad.",
    noStorageWarnings: "No hay advertencias de almacenamiento.",
    noBrokenLinks: "No se encontraron enlaces internos rotos.",
    noSourceReferenceIssues: "No se encontraron referencias débiles de archivos fuente.",
    noLinkedUserIssues: "No se encontraron problemas de usuarios vinculados.",
    noOversizedContent: "No hay advertencias de contenido grande.",
    noRecoverySignals: "No se encontraron señales de recuperación.",
    checkGenerated: "Revisión generada",
    projectReference: "Referencia del proyecto",
    missingSourceDetails: "La fuente no tiene ubicación, metadatos de archivo local ni resumen.",
    missingLinkedUser: "La fuente hace referencia a un usuario que ya no existe.",
    missingAttachedSource: "El enlace de fuente adjunta apunta a una fuente faltante.",
    missingAttachedExtract: "El enlace de fuente adjunta apunta a un extracto faltante.",
    missingImageReference: "El adjunto de imagen no tiene datos guardados ni referencia local.",
    missingImageTarget: "El adjunto de imagen apunta a un objeto faltante.",
    missingRelationshipTarget: "La relación apunta a un proyecto faltante.",
    largeExtractWarning: "El texto del extracto es grande.",
    largeAttachmentWarning: "Los datos del adjunto de imagen son grandes.",
    recoveryModeNotActive: "El modo de recuperación no está activo.",
    storageWarningStorageSizeDanger: "El tamaño de almacenamiento está cerca del límite del navegador.",
    storageWarningStorageSizeWarning: "El tamaño de almacenamiento está creciendo.",
    storageWarningAttachmentsDominateMainRecord: "Las imágenes ocupan la mayor parte del registro principal.",
    storageWarningExtractsGrowingInMainRecord: "El texto de extractos está creciendo dentro del registro principal."
  }
};
const DRAFT_REVIEW_FLAGS = [
  "factsReviewed",
  "decisionsReviewed",
  "questionsReviewed",
  "actionsReviewed",
  "relationshipsReviewed",
  "readyForApproval"
];
const INPUT_LIMITS = {
  actorName: 120,
  backupLocationHint: 500,
  name: 160,
  title: 180,
  currentStatus: 500,
  currentSummary: 5000,
  draft: 8000,
  reason: 2000,
  decision: 2500,
  confidence: 120,
  statement: 2500,
  source: 500,
  sourceLabel: 500,
  sourceType: 80,
  location: 500,
  summary: 2500,
  tags: 500,
    caption: 1200,
  backupOverrideReason: 1200,
  storageOverrideReason: 1200,
  target: 240,
  relationshipType: 120,
  notes: 2500,
  question: 2500,
  context: 2500,
  action: 2500,
  owner: 160,
  text: 5000,
  correctedContent: 5000,
  suggestedBy: 120
};

const defaultSettings = () => ({
  setupCompletedAt: "",
  primaryActorId: "",
  backupLocationHint: "",
  backupReminder: "manual",
  language: DEFAULT_LANGUAGE,
  localMode: "single_user_local",
  recoveryWarnings: true,
  storageSystem: "platform_storage_spine",
  storageOverrideAcknowledged: false,
  storageOverrideReason: "",
  backupSystem: "user_controlled_backup",
  backupOverrideAcknowledged: false,
  backupOverrideReason: "",
  settingsUpdatedAt: "",
  settingsUpdatedBy: "",
  settingsUpdateReason: "",
  lastBackupExportedAt: "",
  lastBackupExportedBy: "",
  lastRestoreAt: "",
  lastRestoreBy: "",
  lastRestoreReason: "",
  lastRestoreSourceFile: "",
  archivedDeletionLog: [],
  uiState: {
    recentProjectIds: [],
    lastProjectId: "",
    lastProjectView: "dashboard",
    projectScrollPositions: {},
    lastImportFolders: {}
  },
  historyPolicyVersion: HISTORY_POLICY_VERSION,
  mandatoryHistory: true,
  mandatoryHistoryFields: [...MANDATORY_HISTORY_FIELDS]
});

const emptyStore = () => ({
  schemaVersion: "0.1.0",
  settings: defaultSettings(),
  actors: [],
  intakeBatches: [],
  intakeItems: [],
  aiWorkOrders: [],
  projects: []
});

let migrationNeeded = false;
let loadFailure = null;
let store = emptyStore();
let storageReady = false;
let storageMode = "initializing";
let storageSnapshotText = "";
let storageSpineMeta = null;
let pendingApprovedCoreWrites = 0;
let activeProjectId = null;
let activeRootView = "projects";
let activeView = "dashboard";
let activeHistoryFilter = null;
let activeHistoryEventType = "all";
let activeChangesSinceDate = defaultChangesSinceDate();
let activeObjectDetail = null;
let postModalAction = null;
let pendingFlowReturnContext = null;
const flowDrafts = new Map();
let fileImportDialogInProgress = false;
let fileImportFlowState = { status: "idle", kind: "", message: "", updatedAt: "" };
let pendingFileImportReviewSelection = null;
let auditWorkSession = { actorName: "", reason: "", updatedAt: "" };
let searchQuery = "";
let armTransportStatus = {
  available: false,
  running: false,
  configuredEnabled: false,
  configuredPort: 32145,
  port: 0,
  baseUrl: "",
  encryptionAvailable: false,
  tokenConfigured: false,
  lastError: ""
};
let discoveryWorkspace = { loaded: false, loading: false, cases: [], extractions: [], error: "" };
let saveState = {
  status: "saved",
  message: ""
};
let saveQueue = Promise.resolve();

const app = document.querySelector("#app");

function createProjectStatePlatformAdapter() {
  const desktopBridge = desktopBridgeAllowed() ? window.ProjectStateDesktop : null;
  if (desktopBridge) return createDesktopPlatformAdapter(desktopBridge);
  return createBrowserPlatformAdapter();
}

function desktopBridgeAllowed() {
  if (typeof window === "undefined" || !window.ProjectStateDesktop) return false;
  return window.location?.protocol === "file:";
}

function createDesktopPlatformAdapter(bridge) {
  const storage = bridge.storage || {};
  const files = bridge.files || {};
  const downloads = bridge.downloads || {};
  const armTransport = bridge.armTransport || {};
  const discoveryStorage = bridge.discoveryStorage || {};
  const analysisArms = bridge.analysisArms || {};
  const dialogs = bridge.dialogs || {};
  return {
    id: "desktop",
    label: bridge.label || "Desktop platform bridge",
    storage: {
      externalStore: typeof storage.loadStore === "function" && typeof storage.saveStore === "function",
      supported() {
        return typeof storage.loadStore === "function" && typeof storage.saveStore === "function";
      },
      async loadStore(context) {
        return storage.loadStore(context);
      },
      async saveStore(payload) {
        return storage.saveStore(payload);
      },
      async saveMeta(payload) {
        if (typeof storage.saveMeta === "function") return storage.saveMeta(payload);
        return null;
      },
      async preserveLegacyRaw(raw) {
        if (typeof storage.preserveLegacyRaw === "function") return storage.preserveLegacyRaw(raw);
        return null;
      },
      async preserveRecoveryRecord(issue) {
        if (typeof storage.preserveRecoveryRecord === "function") return storage.preserveRecoveryRecord(issue);
        return null;
      },
      async verifyIntegrity(options) {
        if (typeof storage.verifyIntegrity === "function") return storage.verifyIntegrity(options);
        return null;
      },
      async importBrowserExport(payload) {
        if (typeof storage.importBrowserExport === "function") return storage.importBrowserExport(payload);
        return null;
      },
      async createBackupPackage(payload) {
        if (typeof storage.createBackupPackage === "function") return storage.createBackupPackage(payload);
        return null;
      },
      async restoreBackupPackage(payload) {
        if (typeof storage.restoreBackupPackage === "function") return storage.restoreBackupPackage(payload);
        return null;
      },
      async reset() {
        if (typeof storage.reset === "function") return storage.reset();
        return null;
      },
      supportsIndexedDb() {
        return false;
      },
      async openDatabase() {
        return null;
      },
      getLegacyItem() {
        return "";
      },
      setLegacyItem() {
        return null;
      },
      removeLegacyItem() {
        return null;
      }
    },
    files: {
      metadata(file) {
        if (typeof files.metadata === "function") return files.metadata(file);
        return null;
      },
      localPath(file) {
        if (typeof files.localPath === "function") return files.localPath(file);
        return "";
      },
      async inspectImportSelection(payload) {
        if (typeof files.inspectImportSelection === "function") return files.inspectImportSelection(payload);
        return { candidates: [], skipped: [] };
      },
      async stageManagedFiles(payload) {
        if (typeof files.stageManagedFiles === "function") return files.stageManagedFiles(payload);
        return { staged: [], errors: [{ message: "Managed file import is unavailable." }] };
      },
      async verifyLocalFile(reference) {
        if (typeof files.verifyLocalFile === "function") return files.verifyLocalFile(reference);
        return {
          status: "unverifiable",
          exists: false,
          checkedAt: nowIso(),
          reason: "Desktop file verification is unavailable."
        };
      },
      async readAsDataUrl(file) {
        if (typeof files.readAsDataUrl === "function") return files.readAsDataUrl(file);
        throw new Error("Desktop file reading is unavailable.");
      },
      async readAsText(file) {
        if (typeof files.readAsText === "function") return files.readAsText(file);
        throw new Error("Desktop file reading is unavailable.");
      },
      async readAsArrayBuffer(file) {
        if (typeof files.readAsArrayBuffer === "function") return files.readAsArrayBuffer(file);
        throw new Error("Desktop file reading is unavailable.");
      },
      async extractText(file) {
        if (typeof files.extractText === "function") return files.extractText(file);
        return null;
      },
      async inflateRaw(bytes) {
        if (typeof files.inflateRaw === "function") return files.inflateRaw(bytes);
        throw new Error("Desktop compressed file reading is unavailable.");
      }
    },
    downloads: {
      saveTextFile(fileName, text, type) {
        if (typeof downloads.saveTextFile === "function") return downloads.saveTextFile({ fileName, text, type });
        throw new Error("Desktop file saving is unavailable.");
      }
    },
    dialogs: {
      available: typeof dialogs.pickFile === "function" && typeof dialogs.pickFolder === "function",
      async pickFile(payload) {
        return typeof dialogs.pickFile === "function" ? dialogs.pickFile(payload) : null;
      },
      async pickFolder(payload) {
        return typeof dialogs.pickFolder === "function" ? dialogs.pickFolder(payload) : null;
      },
      async pickFiles(payload) {
        return typeof dialogs.pickFiles === "function" ? dialogs.pickFiles(payload) : [];
      }
    },
    armTransport: {
      available: typeof armTransport.status === "function",
      async status() {
        return typeof armTransport.status === "function" ? armTransport.status() : null;
      },
      async enable(payload) {
        return armTransport.enable(payload);
      },
      async disable(payload) {
        return armTransport.disable(payload);
      },
      async rotateToken(payload) {
        return armTransport.rotateToken(payload);
      },
      async revoke(payload) {
        return armTransport.revoke(payload);
      }
    },
    discovery: {
      available: typeof discoveryStorage.stageTrustedFile === "function" && typeof discoveryStorage.getCase === "function",
      stageTrustedFile: (payload) => discoveryStorage.stageTrustedFile(payload),
      extractFileVersion: (payload) => discoveryStorage.extractFileVersion(payload),
      indexCorpus: (payload) => discoveryStorage.indexCorpus(payload),
      readExtractionText: (payload) => discoveryStorage.readExtractionText(payload),
      readChunkText: (payload) => discoveryStorage.readChunkText(payload),
      analyzeCase: (payload) => discoveryStorage.analyzeCase(payload),
      recordAnswer: (payload) => discoveryStorage.recordAnswer(payload),
      confirmRouting: (payload) => discoveryStorage.confirmRouting(payload),
      promoteToIntake: (payload) => discoveryStorage.promoteToIntake(payload),
      getCase: (payload) => discoveryStorage.getCase(payload),
      readFoundationState: (payload) => discoveryStorage.readFoundationState(payload)
    },
    analysis: {
      available: typeof analysisArms.submitAnalysisBatch === "function" && typeof analysisArms.recordReviewDecision === "function",
      describeCapabilities: () => analysisArms.describeCapabilities(),
      createRun: (payload) => analysisArms.createRun(payload),
      authorizeTransmission: (payload) => analysisArms.authorizeTransmission(payload),
      submitAnalysisBatch: (envelope) => analysisArms.submitAnalysisBatch(envelope),
      getAnalysisStatus: (requestId) => analysisArms.getAnalysisStatus(requestId),
      getResultPage: (requestId, cursor) => analysisArms.getResultPage(requestId, cursor),
      cancelAnalysis: (requestId) => analysisArms.cancelAnalysis(requestId),
      getReceipt: (requestId) => analysisArms.getReceipt(requestId),
      recordReviewDecision: (payload) => analysisArms.recordReviewDecision(payload),
      readState: (payload) => analysisArms.readState(payload)
    }
  };
}

function createBrowserPlatformAdapter() {
  return {
    id: "desktop-required",
    label: "Desktop app required",
    dialogs: {
      available: false,
      async pickFile() { return null; },
      async pickFiles() { return []; },
      async pickFolder() { return null; }
    },
    storage: {
      externalStore: false,
      supported() {
        return false;
      },
      supportsIndexedDb() {
        return false;
      },
      async openDatabase() {
        return null;
      },
      getLegacyItem() {
        return "";
      },
      setLegacyItem() {
        return null;
      },
      removeLegacyItem() {
        return null;
      }
    },
    files: {
      metadata() { return null; },
      localPath() { return ""; },
      async inspectImportSelection() { return { candidates: [], skipped: [] }; },
      async stageManagedFiles() { return { staged: [], errors: [] }; },
      verifyLocalFile: browserVerifyLocalFile,
      async readAsDataUrl() { throw new Error("Desktop app required for file reading."); },
      async readAsText() { throw new Error("Desktop app required for file reading."); },
      async readAsArrayBuffer() { throw new Error("Desktop app required for file reading."); },
      async extractText() {
        return null;
      },
      async inflateRaw() { throw new Error("Desktop app required for compressed file reading."); }
    },
    downloads: {
      saveTextFile() { throw new Error("Desktop app required for file saving."); }
    },
    armTransport: {
      available: false,
      async status() {
        return null;
      }
    },
    discovery: { available: false },
    analysis: { available: false }
  };
}

async function browserVerifyLocalFile() {
  return {
    status: "unverifiable",
    exists: false,
    checkedAt: nowIso(),
    reason: "Desktop app required for local file verification."
  };
}

const platformAdapter = createProjectStatePlatformAdapter();

const ProjectStateStorage = {
  db: null,
  usesExternalStore() {
    return Boolean(platformAdapter.storage.externalStore && platformAdapter.storage.supported());
  },
  browserDbSupported() {
    return Boolean(platformAdapter.storage.supportsIndexedDb?.());
  },
  supported() {
    return this.usesExternalStore();
  },
  async open() {
    if (!this.browserDbSupported()) return null;
    if (this.db) return this.db;
    this.db = await platformAdapter.storage.openDatabase(STORAGE_DB_NAME, STORAGE_DB_VERSION, (db) => {
        if (!db.objectStoreNames.contains(STORAGE_OBJECT_STORE)) db.createObjectStore(STORAGE_OBJECT_STORE, { keyPath: "id" });
        for (const storeName of STORAGE_SPLIT_STORES) {
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "id" });
        }
    });
    return this.db;
  },
  async getRecord(id) {
    return this.getFromStore(STORAGE_OBJECT_STORE, id);
  },
  async getFromStore(storeName, id) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).get(id);
      request.addEventListener("success", () => resolve(request.result || null));
      request.addEventListener("error", () => reject(request.error));
    });
  },
  async putRecord(record) {
    return this.putInStore(STORAGE_OBJECT_STORE, record);
  },
  async putInStore(storeName, record) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).put(record);
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  },
  async deleteRecord(id) {
    return this.deleteFromStore(STORAGE_OBJECT_STORE, id);
  },
  async deleteFromStore(storeName, id) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).delete(id);
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  },
  async getAllFromStore(storeName) {
    const db = await this.open();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const request = transaction.objectStore(storeName).getAll();
      request.addEventListener("success", () => resolve(request.result || []));
      request.addEventListener("error", () => reject(request.error));
    });
  },
  async clearStore(storeName) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      transaction.objectStore(storeName).clear();
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  },
  async getMetaRecord() {
    if (this.usesExternalStore()) return storageSpineMeta;
    if (!this.browserDbSupported()) return null;
    return await this.getFromStore("meta", STORAGE_META_MAIN_RECORD) || this.getRecord(STORAGE_META_RECORD);
  },
  async putMetaRecord(manifest) {
    if (this.usesExternalStore()) {
      await platformAdapter.storage.saveMeta({ manifest });
      storageSpineMeta = manifest;
      return true;
    }
    if (!this.browserDbSupported()) return false;
    await this.putInStore("meta", {
      id: STORAGE_META_MAIN_RECORD,
      ...manifest
    });
    await this.putRecord({
      id: STORAGE_META_RECORD,
      ...manifest
    });
    storageSpineMeta = manifest;
    return true;
  },
  async load() {
    if (this.usesExternalStore()) {
      const loaded = await platformAdapter.storage.loadStore({
        app: "Project State",
        spineVersion: STORAGE_SPINE_VERSION,
        layoutVersion: STORAGE_LAYOUT_VERSION,
        schemaVersion: store.schemaVersion
      });
      storageSpineMeta = loaded?.meta || null;
      return {
        source: loaded?.source || "desktop-spine",
        raw: loaded?.raw || (loaded?.store ? JSON.stringify(loaded.store) : ""),
        store: loaded?.store || (!loaded?.raw ? emptyStore() : null),
        meta: storageSpineMeta
      };
    }

    if (this.browserDbSupported()) {
      try {
        const splitStore = await this.loadSplitStore();
        if (splitStore) return splitStore;
      } catch (error) {
        console.warn("Project State split-store load failed; attempting preserved main record.", error);
        await this.preserveRecoveryRecord({
          stage: "split-store-load",
          message: error?.message || "Unknown split-store load failure",
          stack: error?.stack || ""
        });
      }

      const record = await this.getRecord(STORAGE_MAIN_RECORD);
      if (record?.store) {
        const meta = await this.getMetaRecord();
        storageSpineMeta = meta || record.storageSpine || null;
        return {
          source: "indexeddb-main-backup",
          store: record.store,
          raw: JSON.stringify(record.store),
          meta: storageSpineMeta
        };
      }
    }

    const raw = platformAdapter.storage.getLegacyItem(STORAGE_KEY) || "";
    return {
      source: raw ? "legacy-json" : "empty",
      raw,
      store: raw ? null : emptyStore()
    };
  },
  async save(nextStore, options = {}) {
    const snapshot = JSON.stringify(nextStore);
    const manifest = buildStorageSpineManifest(nextStore, snapshot);
    storageSnapshotText = snapshot;
    storageSpineMeta = manifest;
    if (this.usesExternalStore()) {
      await platformAdapter.storage.saveStore({
        store: nextStore,
        manifest,
        split: splitStoreRecords(nextStore, manifest),
        snapshot,
        preserveConcurrentApiIntake: options.preserveConcurrentApiIntake
      });
      storageMode = "desktop-spine";
      return;
    }
    throw new Error("Desktop storage spine is required for Project State saves.");
  },
  async ensureMeta(nextStore) {
    const snapshot = JSON.stringify(nextStore);
    storageSnapshotText = snapshot;
    const manifest = buildStorageSpineManifest(nextStore, snapshot);
    storageSpineMeta = manifest;
    if (this.usesExternalStore()) {
      await platformAdapter.storage.saveMeta({ manifest });
      return manifest;
    }
    if (!this.browserDbSupported()) return manifest;
    const existing = await this.getMetaRecord();
    if (
      existing?.spineVersion === STORAGE_SPINE_VERSION &&
      existing?.layoutVersion === STORAGE_LAYOUT_VERSION &&
      existing?.snapshotBytes === manifest.snapshotBytes &&
      existing?.counts?.projects === manifest.counts.projects &&
      existing?.counts?.changes === manifest.counts.changes
    ) {
      storageSpineMeta = existing;
      return existing;
    }
    await this.putMetaRecord(manifest);
    return manifest;
  },
  async loadSplitStore() {
    const meta = await this.getMetaRecord();
    if (meta?.spineVersion !== STORAGE_SPINE_VERSION || meta?.layoutVersion !== STORAGE_LAYOUT_VERSION) return null;
    const split = {};
    for (const storeName of STORAGE_SPLIT_STORES) {
      split[storeName] = await this.getAllFromStore(storeName);
    }
    const splitAuditErrors = auditSplitStoreRecords(split);
    if (splitAuditErrors.length) throw new Error(`Storage spine split audit failed: ${splitAuditErrors.join("; ")}`);
    const rebuilt = rebuildStoreFromSplitRecords(split);
    const manifest = buildStorageSpineManifest(rebuilt, JSON.stringify(rebuilt));
    verifyStorageSpineManifest(manifest, meta);
    storageSpineMeta = meta;
    return {
      source: "indexeddb-split",
      store: rebuilt,
      raw: JSON.stringify(rebuilt),
      meta
    };
  },
  async writeSplitStore(nextStore, manifest) {
    const db = await this.open();
    if (!db) return false;
    const split = splitStoreRecords(nextStore, manifest);
    split.recovery = await this.getAllFromStore("recovery").catch(() => []);
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORAGE_OBJECT_STORE, ...STORAGE_SPLIT_STORES], "readwrite");
      for (const storeName of STORAGE_SPLIT_STORES) transaction.objectStore(storeName).clear();

      transaction.objectStore(STORAGE_OBJECT_STORE).put({
        id: STORAGE_MAIN_RECORD,
        app: "Project State",
        role: "phase2-main-backup",
        spineVersion: STORAGE_SPINE_VERSION,
        layoutVersion: STORAGE_LAYOUT_VERSION,
        schemaVersion: nextStore.schemaVersion,
        updatedAt: manifest.generatedAt,
        storageSpine: manifest,
        store: nextStore
      });
      transaction.objectStore(STORAGE_OBJECT_STORE).put({
        id: STORAGE_META_RECORD,
        ...manifest
      });

      transaction.objectStore("meta").put(split.meta);
      for (const project of split.projects) transaction.objectStore("projects").put(project);
      for (const change of split.history) transaction.objectStore("history").put(change);
      for (const source of split.sources) transaction.objectStore("sources").put(source);
      for (const extract of split.extracts) transaction.objectStore("extracts").put(extract);
      for (const attachment of split.attachments) transaction.objectStore("attachments").put(attachment);
      for (const draft of split.drafts) transaction.objectStore("drafts").put(draft);
      for (const recovery of split.recovery) transaction.objectStore("recovery").put(recovery);

      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
    storageSpineMeta = manifest;
    return true;
  },
  async verifyMainRecord(expectedStore, expectedManifest) {
    if (this.usesExternalStore() || !this.browserDbSupported()) return true;
    const record = await this.getRecord(STORAGE_MAIN_RECORD);
    if (!record?.store) throw new Error("Storage spine verification failed: main record was not saved.");
    if (record.spineVersion !== STORAGE_SPINE_VERSION) throw new Error("Storage spine verification failed: spine version mismatch.");
    if (record.layoutVersion !== STORAGE_LAYOUT_VERSION) throw new Error("Storage spine verification failed: layout version mismatch.");
    if (record.store.schemaVersion !== expectedStore.schemaVersion) throw new Error("Storage spine verification failed: store schema mismatch.");
    const readback = buildStorageSpineManifest(record.store, JSON.stringify(record.store));
    if (readback.counts.projects !== expectedManifest.counts.projects) throw new Error("Storage spine verification failed: project count mismatch.");
    if (readback.counts.changes !== expectedManifest.counts.changes) throw new Error("Storage spine verification failed: history count mismatch.");
    if (readback.largeContent.attachments !== expectedManifest.largeContent.attachments) throw new Error("Storage spine verification failed: attachment count mismatch.");
    return true;
  },
  async verifySplitStore(expectedStore, expectedManifest) {
    const splitStore = await this.loadSplitStore();
    if (!splitStore?.store) throw new Error("Storage spine verification failed: split stores did not reload.");
    const readback = buildStorageSpineManifest(splitStore.store, JSON.stringify(splitStore.store));
    verifyStorageSpineManifest(readback, expectedManifest);
    if (readback.counts.projects !== expectedManifest.counts.projects) throw new Error("Storage spine verification failed: split project count mismatch.");
    if (readback.counts.changes !== expectedManifest.counts.changes) throw new Error("Storage spine verification failed: split history count mismatch.");
    if (readback.largeContent.attachments !== expectedManifest.largeContent.attachments) throw new Error("Storage spine verification failed: split attachment count mismatch.");
    await this.verifyMainRecord(expectedStore, expectedManifest);
    return true;
  },
  async preserveLegacyRaw(raw) {
    if (!raw || !this.supported()) return;
    if (this.usesExternalStore()) {
      await platformAdapter.storage.preserveLegacyRaw(raw);
      return;
    }
    await this.putRecord({
      id: STORAGE_LEGACY_BACKUP_RECORD,
      createdAt: nowIso(),
      storageKey: STORAGE_KEY,
      raw
    });
  },
  async preserveRecoveryRecord(issue = {}) {
    if (!this.supported()) return;
    if (this.usesExternalStore()) {
      await platformAdapter.storage.preserveRecoveryRecord({
        id: uid("recovery"),
        date: nowIso(),
        ...issue
      });
      return;
    }
    try {
      await this.putInStore("recovery", {
        id: uid("recovery"),
        date: nowIso(),
        ...issue
      });
    } catch (error) {
      console.warn("Project State could not preserve a recovery record.", error);
    }
  },
  async reset() {
    if (this.usesExternalStore()) {
      await platformAdapter.storage.reset();
    } else if (this.browserDbSupported()) {
      await this.deleteRecord(STORAGE_MAIN_RECORD);
      await this.deleteRecord(STORAGE_META_RECORD);
      await this.deleteRecord(STORAGE_LEGACY_BACKUP_RECORD);
      for (const storeName of STORAGE_SPLIT_STORES) await this.clearStore(storeName);
    }
    platformAdapter.storage.removeLegacyItem(STORAGE_KEY);
    storageSnapshotText = "";
    storageSpineMeta = null;
  }
};

function desktopRuntimeReady() {
  return ProjectStateStorage.usesExternalStore();
}

function browserDevRuntime() {
  return !desktopRuntimeReady();
}

function seriousStorageWorkAllowed() {
  return desktopRuntimeReady();
}

function currentStorageModeName() {
  if (ProjectStateStorage.usesExternalStore()) return "desktop-spine";
  return "desktop-required";
}

function storageModeForLoadedSource(source = "") {
  if (ProjectStateStorage.usesExternalStore()) return source || "desktop-spine";
  if (source === "empty") return currentStorageModeName();
  return source || currentStorageModeName();
}

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record || {}));
}

function withoutImageLinks(record) {
  const clone = cloneRecord(record);
  delete clone.imageLinks;
  return clone;
}

function withSortIndex(record, index) {
  return {
    ...record,
    _sortIndex: index
  };
}

function cleanSplitRecord(record) {
  const clone = cloneRecord(record);
  delete clone._sortIndex;
  return clone;
}

function sortSplitRecords(records = []) {
  return [...records].sort((a, b) => (a._sortIndex ?? 0) - (b._sortIndex ?? 0)).map(cleanSplitRecord);
}

function splitStoreRecords(nextStore, manifest) {
  const split = {
    meta: {
      id: STORAGE_META_MAIN_RECORD,
      ...manifest,
      schemaVersion: nextStore.schemaVersion || "",
      settings: cloneRecord(nextStore.settings),
      actors: cloneRecord(nextStore.actors || []),
      intakeBatches: cloneRecord(nextStore.intakeBatches || []),
      intakeItems: cloneRecord(nextStore.intakeItems || [])
    },
    projects: [],
    history: [],
    sources: [],
    extracts: [],
    attachments: [],
    drafts: [],
    recovery: []
  };

  const addAttachments = (project, ownerType, ownerId, links = []) => {
    (links || []).forEach((image) => {
      split.attachments.push(withSortIndex({
        ...cloneRecord(image),
        projectId: image.projectId || project.id,
        attachedToType: image.attachedToType || ownerType,
        attachedToId: image.attachedToId || ownerId
      }, split.attachments.length));
    });
  };

  (nextStore.projects || []).forEach((project, projectIndex) => {
    const projectRecord = withoutImageLinks(project);
    projectRecord.decisions = (project.decisions || []).map(withoutImageLinks);
    projectRecord.facts = (project.facts || []).map(withoutImageLinks);
    projectRecord.conflicts = (project.conflicts || []).map(withoutImageLinks);
    projectRecord.relationships = (project.relationships || []).map(withoutImageLinks);
    projectRecord.openQuestions = (project.openQuestions || []).map(withoutImageLinks);
    projectRecord.nextActions = (project.nextActions || []).map(withoutImageLinks);
    projectRecord.sourceIds = (project.sources || []).map((source) => source.id);
    projectRecord.historyIds = (project.changes || []).map((change) => change.id);
    projectRecord.draftProjectIds = (project.draftProjects || []).map((draft) => draft.id);
    projectRecord.attachmentIds = (project.imageLinks || []).map((image) => image.id);
    delete projectRecord.sources;
    delete projectRecord.changes;
    delete projectRecord.draftProjects;
    split.projects.push(withSortIndex(projectRecord, projectIndex));
    addAttachments(project, "Project", project.id, project.imageLinks);

    (project.changes || []).forEach((change, changeIndex) => {
      const historyRecord = withoutImageLinks(change);
      historyRecord.projectId = historyRecord.projectId || project.id;
      split.history.push(withSortIndex(historyRecord, changeIndex));
      addAttachments(project, "Change", change.id, change.imageLinks);
    });

    (project.sources || []).forEach((source, sourceIndex) => {
      const sourceRecord = withoutImageLinks(source);
      sourceRecord.projectId = sourceRecord.projectId || project.id;
      sourceRecord.extractIds = (source.extracts || []).map((extract) => extract.id);
      sourceRecord.attachmentIds = (source.imageLinks || []).map((image) => image.id);
      delete sourceRecord.extracts;
      split.sources.push(withSortIndex(sourceRecord, sourceIndex));
      addAttachments(project, "Source", source.id, source.imageLinks);

      (source.extracts || []).forEach((extract, extractIndex) => {
        const extractRecord = withoutImageLinks(extract);
        extractRecord.projectId = extractRecord.projectId || project.id;
        extractRecord.sourceId = extractRecord.sourceId || source.id;
        extractRecord.attachmentIds = (extract.imageLinks || []).map((image) => image.id);
        split.extracts.push(withSortIndex(extractRecord, extractIndex));
        addAttachments(project, "Extract", extract.id, extract.imageLinks);
      });
    });

    (project.draftProjects || []).forEach((draft, draftIndex) => {
      const draftRecord = withoutImageLinks(draft);
      draftRecord.projectId = draftRecord.projectId || project.id;
      draftRecord.attachmentIds = (draft.imageLinks || []).map((image) => image.id);
      split.drafts.push(withSortIndex(draftRecord, draftIndex));
      addAttachments(project, "DraftProject", draft.id, draft.imageLinks);
    });

    const objectLists = [
      ["Decision", project.decisions || []],
      ["Fact", project.facts || []],
      ["Conflict", project.conflicts || []],
      ["Relationship", project.relationships || []],
      ["OpenQuestion", project.openQuestions || []],
      ["NextAction", project.nextActions || []]
    ];
    for (const [objectType, objects] of objectLists) {
      for (const object of objects) addAttachments(project, objectType, object.id, object.imageLinks);
    }
  });

  return split;
}

function rebuildStoreFromSplitRecords(split = {}) {
  const meta = (split.meta || []).find((record) => record.id === STORAGE_META_MAIN_RECORD) || {};
  const rebuilt = {
    ...emptyStore(),
    schemaVersion: meta.schemaVersion || "0.1.0",
    settings: meta.settings || defaultSettings(),
    actors: Array.isArray(meta.actors) ? meta.actors : [],
    intakeBatches: Array.isArray(meta.intakeBatches) ? meta.intakeBatches : [],
    intakeItems: Array.isArray(meta.intakeItems) ? meta.intakeItems : [],
    projects: sortSplitRecords(split.projects || [])
  };

  for (const project of rebuilt.projects) {
    project.sources = [];
    project.changes = [];
    project.draftProjects = [];
    project.imageLinks = [];
  }

  const projectById = new Map(rebuilt.projects.map((project) => [project.id, project]));

  for (const source of sortSplitRecords(split.sources || [])) {
    const project = projectById.get(source.projectId);
    if (!project) continue;
    source.extracts = [];
    source.imageLinks = [];
    project.sources.push(source);
  }

  const sourceById = new Map();
  for (const project of rebuilt.projects) {
    for (const source of project.sources) sourceById.set(source.id, source);
  }

  for (const extract of sortSplitRecords(split.extracts || [])) {
    const source = sourceById.get(extract.sourceId);
    if (!source) continue;
    extract.imageLinks = [];
    source.extracts.push(extract);
  }

  for (const change of sortSplitRecords(split.history || [])) {
    const project = projectById.get(change.projectId);
    if (!project) continue;
    change.imageLinks = [];
    project.changes.push(change);
  }

  for (const draft of sortSplitRecords(split.drafts || [])) {
    const project = projectById.get(draft.projectId);
    if (!project) continue;
    draft.imageLinks = [];
    project.draftProjects.push(draft);
  }

  for (const attachment of sortSplitRecords(split.attachments || [])) {
    const project = projectById.get(attachment.projectId);
    if (!project) continue;
    const object = findSplitAttachmentTarget(project, attachment.attachedToType, attachment.attachedToId);
    if (!object) continue;
    if (!Array.isArray(object.imageLinks)) object.imageLinks = [];
    object.imageLinks.push(attachment);
  }

  for (const project of rebuilt.projects) {
    delete project.sourceIds;
    delete project.historyIds;
    delete project.draftProjectIds;
    delete project.attachmentIds;
    for (const source of project.sources || []) {
      delete source.extractIds;
      delete source.attachmentIds;
      for (const extract of source.extracts || []) delete extract.attachmentIds;
    }
    for (const draft of project.draftProjects || []) delete draft.attachmentIds;
  }

  return rebuilt;
}

function findSplitAttachmentTarget(project, objectType, objectId) {
  if (objectType === "Project" && project.id === objectId) return project;
  const lists = {
    Decision: project.decisions || [],
    Fact: project.facts || [],
    Conflict: project.conflicts || [],
    Relationship: project.relationships || [],
    OpenQuestion: project.openQuestions || [],
    NextAction: project.nextActions || [],
    DraftProject: project.draftProjects || [],
    Change: project.changes || []
  };
  if (lists[objectType]) return lists[objectType].find((item) => item.id === objectId) || null;
  if (objectType === "Source") return (project.sources || []).find((source) => source.id === objectId) || null;
  if (objectType === "Extract") {
    for (const source of project.sources || []) {
      const extract = (source.extracts || []).find((item) => item.id === objectId);
      if (extract) return extract;
    }
  }
  return null;
}

function auditSplitStoreRecords(split = {}) {
  const errors = [];
  const meta = (split.meta || []).find((record) => record.id === STORAGE_META_MAIN_RECORD);
  if (!meta) errors.push("meta store missing main store manifest");

  const projectRecords = split.projects || [];
  const sourceRecords = split.sources || [];
  const extractRecords = split.extracts || [];
  const historyRecords = split.history || [];
  const draftRecords = split.drafts || [];
  const attachmentRecords = split.attachments || [];

  const ids = new Set();
  const addId = (id, label) => {
    if (!id) {
      errors.push(`${label} missing id`);
      return;
    }
    if (ids.has(id)) errors.push(`duplicate id ${id}`);
    ids.add(id);
  };

  for (const project of projectRecords) addId(project.id, "project");
  for (const source of sourceRecords) addId(source.id, "source");
  for (const extract of extractRecords) addId(extract.id, "extract");
  for (const change of historyRecords) addId(change.id, "history");
  for (const draft of draftRecords) addId(draft.id, "draft");
  for (const attachment of attachmentRecords) addId(attachment.id, "attachment");

  const projectsById = new Map(projectRecords.map((project) => [project.id, project]));
  const sourcesById = new Map(sourceRecords.map((source) => [source.id, source]));
  const extractsById = new Map(extractRecords.map((extract) => [extract.id, extract]));

  const projectObjectIds = new Map();
  for (const project of projectRecords) {
    const objectIds = new Set([project.id]);
    for (const decision of project.decisions || []) objectIds.add(decision.id);
    for (const fact of project.facts || []) objectIds.add(fact.id);
    for (const conflict of project.conflicts || []) objectIds.add(conflict.id);
    for (const relationship of project.relationships || []) objectIds.add(relationship.id);
    for (const question of project.openQuestions || []) objectIds.add(question.id);
    for (const action of project.nextActions || []) objectIds.add(action.id);
    projectObjectIds.set(project.id, objectIds);
  }
  for (const change of historyRecords) projectObjectIds.get(change.projectId)?.add(change.id);
  for (const draft of draftRecords) projectObjectIds.get(draft.projectId)?.add(draft.id);

  for (const source of sourceRecords) {
    const project = projectsById.get(source.projectId);
    if (!project) errors.push(`source ${source.id} references missing project ${source.projectId}`);
    else if (Array.isArray(project.sourceIds) && !project.sourceIds.includes(source.id)) errors.push(`source ${source.id} missing from project ${project.id} sourceIds`);
  }

  for (const extract of extractRecords) {
    const source = sourcesById.get(extract.sourceId);
    if (!source) errors.push(`extract ${extract.id} references missing source ${extract.sourceId}`);
    else {
      if (extract.projectId !== source.projectId) errors.push(`extract ${extract.id} projectId does not match source projectId`);
      if (Array.isArray(source.extractIds) && !source.extractIds.includes(extract.id)) errors.push(`extract ${extract.id} missing from source ${source.id} extractIds`);
    }
    if (!projectsById.has(extract.projectId)) errors.push(`extract ${extract.id} references missing project ${extract.projectId}`);
  }

  for (const change of historyRecords) {
    const project = projectsById.get(change.projectId);
    if (!project) errors.push(`history ${change.id} references missing project ${change.projectId}`);
    else if (Array.isArray(project.historyIds) && !project.historyIds.includes(change.id)) errors.push(`history ${change.id} missing from project ${project.id} historyIds`);
    if (!change.actorId && !change.actorName) errors.push(`history ${change.id} missing actor`);
    if (!change.timestamp) errors.push(`history ${change.id} missing timestamp`);
    if (!change.reason) errors.push(`history ${change.id} missing reason`);
    if (!change.details?.objectType && !change.details?.objectId) errors.push(`history ${change.id} missing changed object detail`);
  }

  for (const draft of draftRecords) {
    const project = projectsById.get(draft.projectId);
    if (!project) errors.push(`draft ${draft.id} references missing project ${draft.projectId}`);
    else if (Array.isArray(project.draftProjectIds) && !project.draftProjectIds.includes(draft.id)) errors.push(`draft ${draft.id} missing from project ${project.id} draftProjectIds`);
    if (draft.sourceId && !sourcesById.has(draft.sourceId)) errors.push(`draft ${draft.id} references missing source ${draft.sourceId}`);
    if (draft.extractId && !extractsById.has(draft.extractId)) errors.push(`draft ${draft.id} references missing extract ${draft.extractId}`);
  }

  for (const attachment of attachmentRecords) {
    const project = projectsById.get(attachment.projectId);
    if (!project) {
      errors.push(`attachment ${attachment.id} references missing project ${attachment.projectId}`);
      continue;
    }
    if (!attachment.attachedToType || !attachment.attachedToId) errors.push(`attachment ${attachment.id} missing target`);
    if (attachment.attachedToType === "Source" && !sourcesById.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} targets missing source ${attachment.attachedToId}`);
    else if (attachment.attachedToType === "Extract" && !extractsById.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} targets missing extract ${attachment.attachedToId}`);
    else if (attachment.attachedToType !== "Source" && attachment.attachedToType !== "Extract") {
      const objectIds = projectObjectIds.get(project.id);
      if (!objectIds?.has(attachment.attachedToId)) errors.push(`attachment ${attachment.id} target ${attachment.attachedToType}:${attachment.attachedToId} missing in project ${project.id}`);
    }
  }

  if (meta?.counts) {
    if (meta.counts.projects !== projectRecords.length) errors.push("meta project count does not match projects store");
    if (meta.counts.sources !== sourceRecords.length) errors.push("meta source count does not match sources store");
    if (meta.counts.extracts !== extractRecords.length) errors.push("meta extract count does not match extracts store");
    if (meta.counts.drafts !== draftRecords.length) errors.push("meta draft count does not match drafts store");
    if (meta.counts.changes !== historyRecords.length) errors.push("meta history count does not match history store");
    if (meta.largeContent?.attachments !== attachmentRecords.length) errors.push("meta attachment count does not match attachments store");
  }

  return errors;
}

function verifyStorageSpineManifest(actual, expected) {
  if (!actual || !expected) throw new Error("Storage spine verification failed: missing manifest.");
  if (actual.spineVersion !== expected.spineVersion) throw new Error("Storage spine verification failed: spine version mismatch.");
  if (actual.layoutVersion !== expected.layoutVersion) throw new Error("Storage spine verification failed: layout version mismatch.");
  if (actual.counts.projects !== expected.counts.projects) throw new Error("Storage spine verification failed: project count mismatch.");
  if (actual.counts.sources !== expected.counts.sources) throw new Error("Storage spine verification failed: source count mismatch.");
  if (actual.counts.extracts !== expected.counts.extracts) throw new Error("Storage spine verification failed: extract count mismatch.");
  if (actual.counts.drafts !== expected.counts.drafts) throw new Error("Storage spine verification failed: draft count mismatch.");
  if (actual.counts.changes !== expected.counts.changes) throw new Error("Storage spine verification failed: history count mismatch.");
  if (actual.largeContent.attachments !== expected.largeContent.attachments) throw new Error("Storage spine verification failed: attachment count mismatch.");
  return true;
}

function buildStorageSpineManifest(nextStore = emptyStore(), snapshot = "") {
  const counts = {
    actors: Array.isArray(nextStore.actors) ? nextStore.actors.length : 0,
    intakeItems: Array.isArray(nextStore.intakeItems) ? nextStore.intakeItems.length : 0,
    projects: Array.isArray(nextStore.projects) ? nextStore.projects.length : 0,
    archivedProjects: 0,
    decisions: 0,
    facts: 0,
    sources: 0,
    extracts: 0,
    drafts: 0,
    relationships: 0,
    openQuestions: 0,
    nextActions: 0,
    changes: 0
  };
  const largeContent = {
    attachments: 0,
    attachmentDataCharacters: 0,
    extractTextCharacters: 0,
    largestAttachmentCharacters: 0,
    largestExtractCharacters: 0
  };

  const addAttachment = (image = {}) => {
    largeContent.attachments += 1;
    const dataLength = String(image.dataUrl || image.localReference || "").length;
    largeContent.attachmentDataCharacters += dataLength;
    largeContent.largestAttachmentCharacters = Math.max(largeContent.largestAttachmentCharacters, dataLength);
  };
  const collectImages = (links = []) => {
    for (const image of links || []) addAttachment(image);
  };

  for (const project of nextStore.projects || []) {
    if (project.archived) counts.archivedProjects += 1;
    counts.decisions += (project.decisions || []).length;
    counts.facts += (project.facts || []).length;
    counts.sources += (project.sources || []).length;
    counts.drafts += (project.draftProjects || []).length;
    counts.relationships += (project.relationships || []).length;
    counts.openQuestions += (project.openQuestions || []).length;
    counts.nextActions += (project.nextActions || []).length;
    counts.changes += (project.changes || []).length;
    collectImages(project.imageLinks);

    const imageBearingLists = [project.decisions, project.facts, project.conflicts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes];
    for (const list of imageBearingLists) {
      for (const item of list || []) collectImages(item.imageLinks);
    }

    for (const source of project.sources || []) {
      collectImages(source.imageLinks);
      counts.extracts += (source.extracts || []).length;
      for (const extract of source.extracts || []) {
        collectImages(extract.imageLinks);
        const textLength = String(extract.text || "").length;
        largeContent.extractTextCharacters += textLength;
        largeContent.largestExtractCharacters = Math.max(largeContent.largestExtractCharacters, textLength);
      }
    }
  }

  const snapshotBytes = textByteSize(snapshot || JSON.stringify(nextStore));
  const warnings = [];
  if (snapshotBytes >= 4.5 * 1024 * 1024) warnings.push("storage-size-danger");
  else if (snapshotBytes >= 3 * 1024 * 1024) warnings.push("storage-size-warning");
  if (largeContent.attachmentDataCharacters > snapshotBytes * 0.5) warnings.push("attachments-dominate-main-record");
  if (largeContent.extractTextCharacters > snapshotBytes * 0.25) warnings.push("extracts-growing-in-main-record");

  return {
    app: "Project State",
    spineVersion: STORAGE_SPINE_VERSION,
    layoutVersion: STORAGE_LAYOUT_VERSION,
    generatedAt: nowIso(),
    storageKey: STORAGE_KEY,
    dbName: STORAGE_DB_NAME,
    dbVersion: STORAGE_DB_VERSION,
    objectStores: [STORAGE_OBJECT_STORE, ...STORAGE_SPLIT_STORES],
    mainRecordId: STORAGE_MAIN_RECORD,
    metaRecordId: STORAGE_META_RECORD,
    splitMetaRecordId: STORAGE_META_MAIN_RECORD,
    legacyBackupRecordId: STORAGE_LEGACY_BACKUP_RECORD,
    storeSchemaVersion: nextStore.schemaVersion || "",
    snapshotBytes,
    counts,
    largeContent,
    splitTargets: {
      meta: 1,
      projects: counts.projects,
      history: counts.changes,
      sources: counts.sources,
      extracts: counts.extracts,
      attachments: largeContent.attachments,
      drafts: counts.drafts,
      recovery: 0
    },
    warnings
  };
}

async function loadStore() {
  let loaded = { source: "unknown", raw: "" };
  try {
    migrationNeeded = false;
    loaded = await ProjectStateStorage.load();
    if (!loaded.raw && !loaded.store) return emptyStore();
    const parsed = loaded.store || JSON.parse(loaded.raw);
    const normalized = normalizeStore(parsed);
    storageSnapshotText = JSON.stringify(normalized);
    storageMode = storageModeForLoadedSource(loaded.source);
    if (seriousStorageWorkAllowed()) {
      if (loaded.source === "legacy-json") await ProjectStateStorage.preserveLegacyRaw(loaded.raw);
      if (migrationNeeded || loaded.source !== "indexeddb-split") await ProjectStateStorage.save(normalized);
      else await ProjectStateStorage.ensureMeta(normalized);
    } else {
      storageSpineMeta = buildStorageSpineManifest(normalized, storageSnapshotText);
    }
    return normalized;
  } catch (error) {
    loadFailure = {
      raw: loaded.raw || safeStringify(loaded.store),
      source: loaded.source || "unknown",
      message: error?.message || "Unknown load error",
      stack: error?.stack || "",
      date: nowIso()
    };
    await ProjectStateStorage.preserveRecoveryRecord({
      stage: "store-load",
      source: loadFailure.source,
      message: loadFailure.message,
      stack: loadFailure.stack,
      raw: loadFailure.raw
    });
    console.error("Project State could not load saved data.", loadFailure);
    return null;
  }
}

async function refreshFromExternalStorage() {
  const loadedStore = await loadStore();
  if (!loadedStore) {
    window.alert(t("storageRecoveryNotice"));
    return;
  }
  store = loadedStore;
  await refreshDiscoveryWorkspace();
  setSaveStatus("saved", t("refreshedFromStorage"));
  render();
}

function normalizeStore(parsed) {
  const context = migrationContext();
  const actors = Array.isArray(parsed.actors) ? parsed.actors.map((actor) => normalizeActor(actor, context)) : [];
  context.actors = actors;
  actors.forEach((actor) => {
    const key = nameKey(actor.name);
    if (key && !context.actorNameToId.has(key)) context.actorNameToId.set(key, actor.id);
  });
  const projects = Array.isArray(parsed.projects)
    ? parsed.projects.map((project) => ({
      ...project,
      id: ensureId(project, "project", context)
    }))
    : [];
  projects.forEach((project) => {
    const key = nameKey(project.name);
    if (key && !context.projectNameToId.has(key)) context.projectNameToId.set(key, project.id);
  });
  if (!parsed.settings) migrationNeeded = true;
  return {
    ...emptyStore(),
    ...parsed,
    settings: normalizeSettings(parsed.settings),
    actors,
    intakeBatches: Array.isArray(parsed.intakeBatches) ? parsed.intakeBatches : [],
    intakeItems: Array.isArray(parsed.intakeItems) ? parsed.intakeItems.map((item) => normalizeIntakeItem(item, context)) : [],
    aiWorkOrders: Array.isArray(parsed.aiWorkOrders) ? parsed.aiWorkOrders.map((workOrder) => normalizeAiWorkOrder(workOrder, context)) : [],
    projects: projects.map((project) => normalizeProject(project, context))
  };
}

function normalizeSettings(settings = {}) {
  const defaults = defaultSettings();
  const storageSystem = settings.storageSystem === "local_browser_spine"
    ? defaults.storageSystem
    : settings.storageSystem || defaults.storageSystem;
  const backupSystem = settings.backupSystem === "user_json_export"
    ? defaults.backupSystem
    : settings.backupSystem || defaults.backupSystem;
  const normalized = {
    ...defaults,
    ...settings,
    backupReminder: ["manual", "weekly", "monthly"].includes(settings.backupReminder) ? settings.backupReminder : defaults.backupReminder,
    language: normalizeLanguage(settings.language),
    localMode: settings.localMode || defaults.localMode,
    recoveryWarnings: settings.recoveryWarnings !== false,
    storageSystem,
    storageOverrideAcknowledged: Boolean(settings.storageOverrideAcknowledged),
    storageOverrideReason: settings.storageOverrideReason || "",
    backupSystem,
    backupOverrideAcknowledged: Boolean(settings.backupOverrideAcknowledged),
    backupOverrideReason: settings.backupOverrideReason || "",
    settingsUpdatedAt: settings.settingsUpdatedAt || "",
    settingsUpdatedBy: settings.settingsUpdatedBy || "",
    settingsUpdateReason: settings.settingsUpdateReason || "",
    lastBackupExportedAt: settings.lastBackupExportedAt || "",
    lastBackupExportedBy: settings.lastBackupExportedBy || "",
    lastRestoreAt: settings.lastRestoreAt || "",
    lastRestoreBy: settings.lastRestoreBy || "",
    lastRestoreReason: settings.lastRestoreReason || "",
    lastRestoreSourceFile: settings.lastRestoreSourceFile || "",
    archivedDeletionLog: Array.isArray(settings.archivedDeletionLog) ? settings.archivedDeletionLog : [],
    uiState: normalizeUiState(settings.uiState),
    historyPolicyVersion: settings.historyPolicyVersion || defaults.historyPolicyVersion,
    mandatoryHistory: settings.mandatoryHistory !== false,
    mandatoryHistoryFields: Array.isArray(settings.mandatoryHistoryFields) && settings.mandatoryHistoryFields.length
      ? settings.mandatoryHistoryFields
      : [...defaults.mandatoryHistoryFields]
  };
  if (
    !settings ||
    settings.backupReminder !== normalized.backupReminder ||
    settings.language !== normalized.language ||
    settings.recoveryWarnings !== normalized.recoveryWarnings ||
    settings.storageSystem !== normalized.storageSystem ||
    settings.backupSystem !== normalized.backupSystem ||
    !Array.isArray(settings.archivedDeletionLog) ||
    settings.historyPolicyVersion !== normalized.historyPolicyVersion ||
    settings.mandatoryHistory !== normalized.mandatoryHistory ||
    !Array.isArray(settings.mandatoryHistoryFields) ||
    !settings.uiState
  ) migrationNeeded = true;
  return normalized;
}

function normalizeUiState(uiState = {}) {
  const allowedViews = ["dashboard", "handoff", "map", "changes_since", "history"];
  const scrollPositions = uiState.projectScrollPositions && typeof uiState.projectScrollPositions === "object"
    ? Object.fromEntries(Object.entries(uiState.projectScrollPositions).filter(([, value]) => Number.isFinite(Number(value))).map(([key, value]) => [key, Math.max(0, Number(value))]))
    : {};
  const lastImportFolders = normalizeLastImportFolders(uiState.lastImportFolders);
  return {
    recentProjectIds: Array.isArray(uiState.recentProjectIds) ? [...new Set(uiState.recentProjectIds.map(String).filter(Boolean))].slice(0, RECENT_PROJECT_LIMIT) : [],
    lastProjectId: String(uiState.lastProjectId || ""),
    lastProjectView: allowedViews.includes(uiState.lastProjectView) ? uiState.lastProjectView : "dashboard",
    projectScrollPositions: scrollPositions,
    lastImportFolders
  };
}

function normalizeLastImportFolders(lastImportFolders = {}) {
  const allowed = new Set(["discovery_files", "discovery_folder", "project_files", "project_folder", "backup"]);
  if (!lastImportFolders || typeof lastImportFolders !== "object") return {};
  return Object.fromEntries(Object.entries(lastImportFolders)
    .filter(([key, value]) => allowed.has(key) && String(value || "").trim())
    .map(([key, value]) => [key, String(value || "").trim()]));
}

function safeStringify(value) {
  try {
    return value === undefined ? "" : JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function migrationContext() {
  return {
    usedIds: new Set(),
    actors: [],
    actorNameToId: new Map(),
    projectNameToId: new Map()
  };
}

function ensureId(object, prefix, context) {
  const current = String(object?.id || "").trim();
  if (current && !context.usedIds.has(current)) {
    context.usedIds.add(current);
    if (object.id !== current) migrationNeeded = true;
    return current;
  }

  const id = uid(prefix);
  context.usedIds.add(id);
  migrationNeeded = true;
  return id;
}

function normalizeActor(actor, context) {
  const role = normalizeActorRole(actor.role, actor.type);
  const status = normalizeActorStatus(actor.status);
  if (actor.role !== role || actor.status !== status || actor.emailAddress === undefined || actor.chatHandle === undefined) migrationNeeded = true;
  return {
    type: "Human",
    emailAddress: "",
    chatHandle: "",
    ...actor,
    id: ensureId(actor, "actor", context),
    role,
    status,
    emailAddress: String(actor.emailAddress || actor.email || "").trim(),
    chatHandle: String(actor.chatHandle || actor.chat || "").trim()
  };
}

function ensureActorIdByName(name, context) {
  const key = nameKey(name);
  if (!key) return "";
  const existingId = context.actorNameToId.get(key);
  if (existingId) return existingId;

  const actor = {
    id: ensureId({}, "actor", context),
    name: String(name).trim(),
    type: "Human",
    role: "contributor",
    status: "active",
    emailAddress: "",
    chatHandle: ""
  };
  context.actors.push(actor);
  context.actorNameToId.set(key, actor.id);
  migrationNeeded = true;
  return actor.id;
}

function normalizeProject(project, context) {
  if (!project.healthFlag || !PROJECT_HEALTH_FLAGS.includes(project.healthFlag)) migrationNeeded = true;
  const normalized = {
    archived: false,
    deletionStatus: "",
    healthFlag: "active",
    reviewState: "approved",
    assignments: [],
    comments: [],
    projectRoles: [],
    sourceLinks: [],
    imageLinks: [],
    decisions: [],
    facts: [],
    sources: [],
    conflicts: [],
    draftProjects: [],
    relationships: [],
    openQuestions: [],
    nextActions: [],
    changes: [],
    ...project,
    id: project.id,
    healthFlag: normalizeHealthFlag(project.healthFlag),
    reviewState: normalizeReviewState(project.reviewState || "approved"),
    assignments: normalizeAssignments(project.assignments, context),
    comments: normalizeComments(project.comments, context),
    projectRoles: normalizeProjectRoles(project.projectRoles, context),
    sourceLinks: normalizeSourceLinksArray(project.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(project.imageLinks, project.id, "Project", project.id, context),
    decisions: Array.isArray(project.decisions) ? project.decisions.map((decision) => normalizeDecision(decision, project.id, context)) : [],
    facts: Array.isArray(project.facts) ? project.facts.map((fact) => normalizeObject(fact, "fact", project.id, context)) : [],
    sources: Array.isArray(project.sources) ? project.sources.map((source) => normalizeSource(source, project.id, context)) : [],
    conflicts: Array.isArray(project.conflicts) ? project.conflicts.map((conflict) => normalizeConflict(conflict, project.id, context)) : [],
    draftProjects: Array.isArray(project.draftProjects) ? project.draftProjects.map((draftProject) => normalizeDraftProject(draftProject, project.id, context)) : [],
    relationships: Array.isArray(project.relationships) ? project.relationships.map((relationship) => normalizeRelationship(relationship, project, context)) : [],
    openQuestions: Array.isArray(project.openQuestions) ? project.openQuestions.map((question) => normalizeObject(question, "question", project.id, context)) : [],
    nextActions: Array.isArray(project.nextActions) ? project.nextActions.map((action) => normalizeObject(action, "action", project.id, context)) : []
  };
  if (!project.reviewState || !Array.isArray(project.assignments) || !Array.isArray(project.comments) || !Array.isArray(project.projectRoles)) migrationNeeded = true;
  normalized.changes = Array.isArray(project.changes) ? project.changes.map((change) => normalizeChange(change, normalized, context)) : [];
  return normalized;
}

function normalizeObject(object, prefix, projectId, context) {
  const objectId = ensureId(object, prefix, context);
  const normalized = {
    sourceLinks: [],
    imageLinks: [],
    assignments: [],
    comments: [],
    reviewState: "approved",
    ...object,
    id: objectId,
    projectId: object.projectId || projectId,
    reviewState: normalizeReviewState(object.reviewState || "approved"),
    assignments: normalizeAssignments(object.assignments, context),
    comments: normalizeComments(object.comments, context),
    sourceLinks: normalizeSourceLinksArray(object.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(object.imageLinks, projectId, objectTypeFromPrefix(prefix), objectId, context)
  };
  if (!object.projectId || !object.reviewState || !Array.isArray(object.assignments) || !Array.isArray(object.comments)) migrationNeeded = true;
  return normalized;
}

function normalizeDecision(decision, projectId, context) {
  const normalized = normalizeObject(decision, "decision", projectId, context);
  const legacyRelationType = decision.supersedesDecisionId ? "supersedes" : decision.replacesDecisionId ? "replaces" : "";
  const relationType = DECISION_RELATION_TYPES.includes(decision.relationType) ? decision.relationType : legacyRelationType;
  const relatedDecisionId = String(decision.relatedDecisionId || decision.supersedesDecisionId || decision.replacesDecisionId || "").trim();
  if (decision.relationType === undefined || decision.relatedDecisionId === undefined || decision.relationType !== relationType) migrationNeeded = true;
  return {
    ...normalized,
    relationType: relatedDecisionId ? relationType : "",
    relatedDecisionId
  };
}

function normalizeConflict(conflict, projectId, context) {
  const conflictId = ensureId(conflict, "conflict", context);
  const status = normalizeConflictStatus(conflict.status);
  if (!conflict.projectId || !conflict.status) migrationNeeded = true;
  return {
    sourceLinks: [],
    imageLinks: [],
    assignments: [],
    comments: [],
    reviewState: "needs_review",
    linkedItems: "",
    resolution: "",
    ...conflict,
    id: conflictId,
    projectId: conflict.projectId || projectId,
    title: conflict.title || t("conflictTitle"),
    description: conflict.description || "",
    linkedItems: conflict.linkedItems || "",
    status,
    noticedAt: conflict.noticedAt || conflict.createdAt || nowIso(),
    noticedBy: conflict.noticedBy || conflict.actorId || "",
    resolution: conflict.resolution || conflict.resolutionReason || "",
    reviewState: normalizeReviewState(conflict.reviewState || (status === "resolved" ? "approved" : "needs_review")),
    assignments: normalizeAssignments(conflict.assignments, context),
    comments: normalizeComments(conflict.comments, context),
    sourceLinks: normalizeSourceLinksArray(conflict.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(conflict.imageLinks, projectId, "Conflict", conflictId, context)
  };
}

function normalizeReviewState(state = "approved") {
  return COLLAB_REVIEW_STATES.includes(state) ? state : "approved";
}

function normalizeSourceTrustLevel(level = "unverified") {
  return SOURCE_TRUST_LEVELS.includes(level) ? level : "unverified";
}

function normalizeTrustBoundary(boundary = "core") {
  return TRUST_BOUNDARIES.includes(boundary) ? boundary : "core";
}

function trustBoundaryForRecord(objectType = "", object = {}) {
  if (objectType === "Intake") return "airlock";
  if (objectType === "ContextPack") return "read_only";
  if (objectType === "External") return "external";
  if (objectType === "Extract" && object.suggestionStatus === "pending_approval") return "airlock";
  if (objectType === "DraftProject" || (object.reviewState && normalizeReviewState(object.reviewState) !== "approved")) return "airlock";
  return "core";
}

function trustBoundaryLabel(boundary = "core") {
  const labels = {
    external: t("trustBoundaryExternal"),
    airlock: t("trustBoundaryAirlock"),
    core: t("trustBoundaryCore"),
    read_only: t("trustBoundaryReadOnly")
  };
  return labels[normalizeTrustBoundary(boundary)] || t("trustBoundaryCore");
}

function renderTrustBoundaryLabel(objectType, object = {}) {
  const boundary = trustBoundaryForRecord(objectType, object);
  return `<span class="pill trust-boundary-${escapeHtml(boundary)}">${escapeHtml(trustBoundaryLabel(boundary))}</span>`;
}

function sourceStalenessState(source = {}, at = new Date()) {
  const reviewedAt = Date.parse(source.lastReviewedAt || "");
  const dueText = String(source.reviewDueAt || "");
  const reviewDueAt = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(dueText) ? `${dueText}T23:59:59` : dueText);
  if (!Number.isFinite(reviewedAt) || !Number.isFinite(reviewDueAt)) return "not_reviewed";

  const now = at instanceof Date ? at.getTime() : Date.parse(at);
  if (!Number.isFinite(now)) return "not_reviewed";
  if (reviewDueAt < now) return "stale";
  if (reviewDueAt - now <= SOURCE_REVIEW_DUE_WINDOW_DAYS * 24 * 60 * 60 * 1000) return "review_due";
  return "current";
}

function sourceStalenessLabel(state = "not_reviewed") {
  const labels = {
    current: t("freshnessCurrent"),
    review_due: t("freshnessReviewDue"),
    stale: t("freshnessStale"),
    not_reviewed: t("freshnessNotReviewed")
  };
  const safeState = SOURCE_STALENESS_STATES.includes(state) ? state : "not_reviewed";
  return labels[safeState] || t("freshnessNotReviewed");
}

function renderSourceFreshness(source = {}) {
  const state = sourceStalenessState(source);
  const details = [];
  if (source.lastReviewedAt) details.push(`${t("freshnessLastReviewed")} ${formatDate(source.lastReviewedAt, false)}`);
  if (source.reviewDueAt) details.push(`${t("freshnessNextReview")} ${formatDate(source.reviewDueAt, false)}`);
  if (source.reviewedBy) details.push(`${t("lastReviewedBy")} ${actorDisplay(source.reviewedBy)}`);
  return `
    <p class="item-meta">
      ${escapeHtml(t("sourceFreshness"))}: <span class="pill source-freshness-${escapeHtml(state)}">${escapeHtml(sourceStalenessLabel(state))}</span>
      ${details.length ? ` · ${escapeDisplay(details.join(" · "), DISPLAY_META_LIMIT)}` : ""}
    </p>
  `;
}

function normalizeConflictStatus(status = "unresolved") {
  return CONFLICT_STATUSES.includes(status) ? status : "unresolved";
}

function sourceTrustLabel(level = "unverified") {
  const labels = {
    primary: t("sourceTrustPrimary"),
    supporting: t("sourceTrustSupporting"),
    unverified: t("sourceTrustUnverified"),
    superseded: t("sourceTrustSuperseded"),
    conflicting: t("sourceTrustConflicting")
  };
  return labels[normalizeSourceTrustLevel(level)] || t("sourceTrustUnverified");
}

function sourceTrustOptions(selected = "unverified") {
  const safeSelected = normalizeSourceTrustLevel(selected);
  return SOURCE_TRUST_LEVELS.map((level) => `<option value="${level}" ${level === safeSelected ? "selected" : ""}>${escapeHtml(sourceTrustLabel(level))}</option>`).join("");
}

function conflictStatusLabel(status = "unresolved") {
  const labels = {
    unresolved: t("conflictUnresolved"),
    under_review: t("conflictUnderReview"),
    resolved: t("conflictResolved"),
    archived: t("archived")
  };
  return labels[normalizeConflictStatus(status)] || t("conflictUnresolved");
}

function conflictStatusOptions(selected = "unresolved") {
  const safeSelected = normalizeConflictStatus(selected);
  return CONFLICT_STATUSES.map((status) => `<option value="${status}" ${status === safeSelected ? "selected" : ""}>${escapeHtml(conflictStatusLabel(status))}</option>`).join("");
}

function normalizeAssignmentRole(role = "watcher") {
  return ASSIGNMENT_ROLES.includes(role) ? role : "watcher";
}

function normalizeAssignments(assignments, context) {
  if (!Array.isArray(assignments)) return [];
  return assignments.map((assignment) => ({
    id: ensureId(assignment, "assignment", context),
    actorId: assignment.actorId || "",
    role: normalizeAssignmentRole(assignment.role),
    assignedAt: assignment.assignedAt || nowIso(),
    assignedBy: assignment.assignedBy || "",
    reason: assignment.reason || "",
    status: assignment.status === "archived" ? "archived" : "active"
  }));
}

function normalizeComments(comments, context) {
  if (!Array.isArray(comments)) return [];
  return comments.map((comment) => ({
    id: ensureId(comment, "comment", context),
    actorId: comment.actorId || "",
    actorName: comment.actorName || "",
    createdAt: comment.createdAt || nowIso(),
    text: comment.text || "",
    reviewState: normalizeReviewState(comment.reviewState || "needs_review"),
    visibilityNotice: comment.visibilityNotice || "Project State comments are part of the project record and are not private."
  }));
}

function normalizeProjectRoles(projectRoles, context) {
  if (!Array.isArray(projectRoles)) return [];
  return projectRoles.map((role) => ({
    id: ensureId(role, "project_role", context),
    actorId: role.actorId || "",
    role: normalizeActorRole(role.role || "viewer"),
    assignedAt: role.assignedAt || nowIso(),
    assignedBy: role.assignedBy || "",
    reason: role.reason || "",
    status: role.status === "archived" ? "archived" : "active"
  }));
}

function normalizeAiWorkOrder(workOrder, context) {
  const status = AI_WORK_ORDER_STATUSES.includes(workOrder.status) ? workOrder.status : "submitted";
  if (!AI_WORK_ORDER_STATUSES.includes(workOrder.status)) migrationNeeded = true;
  return {
    id: ensureId(workOrder, "ai_work_order", context),
    projectId: workOrder.projectId || "",
    title: workOrder.title || t("aiWorkOrder"),
    task: workOrder.task || "",
    contextPreset: CONTEXT_PACK_PRESET_KEYS.includes(workOrder.contextPreset) ? workOrder.contextPreset : "handoff",
    outputType: workOrder.outputType || "",
    canCreateIntake: Boolean(workOrder.canCreateIntake),
    status,
    createdAt: workOrder.createdAt || nowIso(),
    createdBy: workOrder.createdBy || "",
    reason: workOrder.reason || "",
    source: workOrder.source && typeof workOrder.source === "object" ? cloneRecord(workOrder.source) : null,
    comments: normalizeComments(workOrder.comments, context)
  };
}

function normalizeSourceLinksArray(sourceLinks, context) {
  if (!Array.isArray(sourceLinks)) return [];
  return sourceLinks.map((link) => ({
    ...link,
    id: ensureId(link, "source_link", context)
  }));
}

function normalizeImageLinksArray(imageLinks, projectId, attachedToType, attachedToId, context) {
  if (!Array.isArray(imageLinks)) return [];
  return imageLinks.map((link) => {
    const normalized = {
      caption: "",
      localPath: "",
      dataUrl: "",
      ...link,
      id: ensureId(link, "image", context),
      projectId: link.projectId || projectId,
      attachedToType: link.attachedToType || attachedToType,
      attachedToId: link.attachedToId || attachedToId,
      dateAdded: link.dateAdded || nowIso()
    };
    if (!link.projectId || !link.attachedToType || !link.attachedToId || !link.dateAdded) migrationNeeded = true;
    return normalized;
  });
}

function objectTypeFromPrefix(prefix) {
  const types = {
    decision: "Decision",
    fact: "Fact",
    relationship: "Relationship",
    question: "OpenQuestion",
    action: "NextAction"
  };
  return types[prefix] || prefix;
}

function normalizeSource(source, projectId, context) {
  const sourceId = ensureId(source, "source", context);
  if (!source.projectId || !Array.isArray(source.linkedActorIds) || !source.trustLevel || source.lastReviewedAt === undefined || source.reviewDueAt === undefined || source.reviewedBy === undefined) migrationNeeded = true;
  return {
    extracts: [],
    status: "active",
    trustLevel: "unverified",
    tags: [],
    linkedActorIds: [],
    assignments: [],
    comments: [],
    reviewState: "approved",
    lastReviewedAt: "",
    reviewDueAt: "",
    reviewedBy: "",
    ...source,
    id: sourceId,
    projectId: source.projectId || projectId,
    trustLevel: normalizeSourceTrustLevel(source.trustLevel),
    reviewState: normalizeReviewState(source.reviewState || "approved"),
    assignments: normalizeAssignments(source.assignments, context),
    comments: normalizeComments(source.comments, context),
    extracts: Array.isArray(source.extracts) ? source.extracts.map((extract) => normalizeExtract(extract, projectId, sourceId, context)) : [],
    tags: Array.isArray(source.tags) ? source.tags : tagsFromText(source.tags || ""),
    linkedActorIds: normalizeLinkedActorIds(source.linkedActorIds || source.participantActorIds || source.actorIds || [])
  };
}

function normalizeLinkedActorIds(actorIds = []) {
  if (!Array.isArray(actorIds)) return [];
  return [...new Set(actorIds.map((actorId) => String(actorId || "").trim()).filter(Boolean))];
}

function normalizeExtract(extract, projectId, sourceId, context) {
  if (!extract.projectId || !extract.sourceId) migrationNeeded = true;
  const extractId = ensureId(extract, "extract", context);
  return {
    status: "active",
    extractMode: "manual",
    suggestionStatus: "",
    tags: [],
    sourceLinks: [],
    imageLinks: [],
    assignments: [],
    comments: [],
    reviewState: "approved",
    ...extract,
    id: extractId,
    projectId: extract.projectId || projectId,
    sourceId: extract.sourceId || sourceId,
    reviewState: normalizeReviewState(extract.reviewState || "approved"),
    assignments: normalizeAssignments(extract.assignments, context),
    comments: normalizeComments(extract.comments, context),
    extractMode: extract.extractMode || "manual",
    suggestionStatus: extract.suggestionStatus || (extract.extractMode === "ai_suggested" ? "pending_approval" : ""),
    sourceLinks: normalizeSourceLinksArray(extract.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(extract.imageLinks, projectId, "Extract", extractId, context),
    tags: Array.isArray(extract.tags) ? extract.tags : tagsFromText(extract.tags || "")
  };
}

function normalizeRelationship(relationship, project, context) {
  const normalized = normalizeObject(relationship, "relationship", project.id, context);
  const targetProjectId = relationship.targetProjectId || relationship.relatedProjectId || resolveProjectIdByName(relationship.target, project.id, context);
  if (targetProjectId && normalized.targetProjectId !== targetProjectId) {
    normalized.targetProjectId = targetProjectId;
    migrationNeeded = true;
  }
  return normalized;
}

function normalizeDraftProject(draftProject, projectId, context) {
  const draftId = ensureId(draftProject, "draft_project", context);
  const reviewFlags = normalizeDraftReviewFlags(draftProject.reviewFlags);
  if (!draftProject.projectId || !draftProject.reviewFlags || !draftProject.status) migrationNeeded = true;
  return {
    sourceLinks: [],
    imageLinks: [],
    assignments: [],
    comments: [],
    reviewState: "draft",
    status: "draft",
    ...draftProject,
    id: draftId,
    projectId: draftProject.projectId || projectId,
    createdAt: draftProject.createdAt || draftProject.createdDate || nowIso(),
    createdDate: draftProject.createdDate || draftProject.createdAt || nowIso(),
    status: draftProject.status || (draftProject.approvedAt ? "approved" : "draft"),
    reviewState: normalizeReviewState(draftProject.reviewState || "draft"),
    assignments: normalizeAssignments(draftProject.assignments, context),
    comments: normalizeComments(draftProject.comments, context),
    reviewFlags,
    sourceLinks: normalizeSourceLinksArray(draftProject.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(draftProject.imageLinks, projectId, "DraftProject", draftId, context)
  };
}

function normalizeDraftReviewFlags(flags = {}) {
  const normalized = {};
  for (const flag of DRAFT_REVIEW_FLAGS) normalized[flag] = Boolean(flags?.[flag]);
  return normalized;
}

function normalizeIntakeItem(item, context) {
  const id = ensureId(item, "intake", context);
  const status = INTAKE_STATUSES.includes(item.status) ? item.status : "pending";
  if (!INTAKE_STATUSES.includes(item.status)) migrationNeeded = true;
  const queueState = normalizeIntakeQueueState(item.queueState, context);
  return {
    ...item,
    id,
    armType: item.armType === "discovery" ? "file" : normalizeArmType(item.armType),
    status,
    reviewState: normalizeReviewState(item.reviewState || (status === "pending" ? "needs_review" : status === "approved" ? "approved" : "rejected")),
    queueState,
    queueNotes: item.queueNotes || "",
    queueReviewedAt: item.queueReviewedAt || "",
    queueReviewedBy: item.queueReviewedBy || "",
    queueReviewReason: item.queueReviewReason || "",
    assignments: normalizeAssignments(item.assignments, context),
    comments: normalizeComments(item.comments, context),
    title: item.title || (item.armType === "discovery" && item.originalName ? `Add source: ${item.originalName}` : t("untitledIntake")),
    projectId: item.projectId || "",
    createdAt: item.createdAt || nowIso(),
    createdBy: item.createdBy || "",
    sourceLabel: item.sourceLabel || (item.armType === "discovery" && item.originalName ? `Discovery: ${item.originalName}` : ""),
    proposedObjectType: normalizeProposedObjectType(item.proposedObjectType),
    proposedChange: Object.keys(item.proposedChange || {}).length ? item.proposedChange : (item.armType === "discovery" ? { text: String(item.originalName || "Discovery source").replace(/\.[^.]+$/, ""), summary: "" } : {}),
    proposedProjectName: item.proposedProjectName || (item.destination === "proposed_new_project" ? String(item.originalName || "").replace(/\.[^.]+$/, "") : ""),
    evidence: item.evidence || {},
    approval: item.approval || null,
    archived: Boolean(item.archived)
  };
}

function normalizeIntakeQueueState(value, context = {}) {
  if (INTAKE_QUEUE_STATES.includes(value)) return value;
  migrationNeeded = true;
  return "new";
}

function createIntakeItem(input = {}) {
  const item = {
    id: input.id || uid("intake"),
    armType: normalizeArmType(input.armType),
    status: "pending",
    reviewState: "needs_review",
    queueState: normalizeIntakeQueueState(input.queueState || "new"),
    queueNotes: input.queueNotes || "",
    queueReviewedAt: "",
    queueReviewedBy: "",
    queueReviewReason: "",
    title: input.title || t("untitledIntake"),
    projectId: input.projectId || "",
    createdAt: nowIso(),
    createdBy: input.createdBy || "",
    sourceLabel: input.sourceLabel || "",
    proposedObjectType: normalizeProposedObjectType(input.proposedObjectType),
    proposedChange: input.proposedChange || {},
    evidence: input.evidence || {},
    destination: input.destination || (input.projectId ? "existing_project" : ""),
    proposedProjectName: input.proposedProjectName || "",
    approval: null,
    assignments: [],
    comments: [],
    archived: false
  };
  if (input.queueState === undefined) item.queueState = intakeSuggestedQueueState(item);
  store.intakeItems = Array.isArray(store.intakeItems) ? store.intakeItems : [];
  store.intakeItems.unshift(item);
  if (input.save !== false) saveStore({ allowWithoutCoreApproval: true, reason: "intake-only" });
  return item;
}

function approveIntakeItem(intakeId, actor, reason, applyApprovedChange) {
  const intake = store.intakeItems?.find((item) => item.id === intakeId);
  requireHumanApproval(actor, reason, { origin: "intake" });
  if (!actorHasPermission(actor, "approve", intakePermissionProject(intake))) {
    throw new Error(t("permissionDenied"));
  }
  if (!intake || intake.status !== "pending" || typeof applyApprovedChange !== "function") return null;
  if (!allRequiredFlagsPass(intakeAirlockChecks(intake))) return null;
  const approval = {
    approvedAt: nowIso(),
    approvedBy: actor.id,
    reason: reason.trim()
  };
  const result = applyApprovedChange(intake, approval);
  if (!result) return null;
  intake.status = "approved";
  intake.approval = approval;
  saveStore();
  return result;
}

function requireHumanApproval(actor, reason, details = {}) {
  const origin = details.origin || "human_ui";
  const approvedViaIntake = Boolean(details.intakeId || details.intakeApprovalId || details.approvedIntakeId || details.origin === "intake");
  if (!actor?.id || !String(reason || "").trim()) {
    throw new Error("Human approval requires an actor and a reason before writing to Project State.");
  }
  if (!APPROVED_CORE_ORIGINS.includes(origin) && !approvedViaIntake) {
    throw new Error("Outside arms must create an intake item and receive human approval before writing to Project State.");
  }
}

function normalizeChange(change, project, context) {
  const actorId = change.actorId || ensureActorIdByName(change.actorName, context);
  const changeId = ensureId(change, "change", context);
  const details = normalizeChangeDetails(change.details || {}, project);
  const language = normalizeLanguage(change.language || change.uiLanguage || details.language || DEFAULT_LANGUAGE);
  const howChanged = change.howChanged || details.origin || "human_ui";
  const normalized = {
    ...change,
    id: changeId,
    projectId: change.projectId || project.id,
    actorId,
    language,
    howChanged,
    reviewState: normalizeReviewState(change.reviewState || "approved"),
    assignments: normalizeAssignments(change.assignments, context),
    comments: normalizeComments(change.comments, context),
    imageLinks: normalizeImageLinksArray(change.imageLinks, project.id, "Change", changeId, context),
    details: {
      ...details,
      language: details.language || language,
      origin: details.origin || howChanged
    }
  };
  if (!change.projectId) migrationNeeded = true;
  if (!change.actorId && actorId) migrationNeeded = true;
  if (!change.language && !change.uiLanguage) migrationNeeded = true;
  if (!change.howChanged) migrationNeeded = true;
  return normalized;
}

function normalizeChangeDetails(details, project) {
  const normalized = { ...details };
  if (normalized.objectText && !normalized.objectTitle) {
    normalized.objectTitle = normalized.objectText;
    migrationNeeded = true;
  }
  if (normalized.objectTitle && !normalized.objectText) {
    normalized.objectText = normalized.objectTitle;
    migrationNeeded = true;
  }
  if (normalized.objectType && !normalized.objectId) {
    const object = findObjectByTitle(project, normalized.objectType, normalized.objectTitle || normalized.objectText);
    if (object?.id) {
      normalized.objectId = object.id;
      migrationNeeded = true;
    }
  }
  return normalized;
}

function saveStore(options = {}) {
  if (!seriousStorageWorkAllowed() && !options.allowInBrowserDev) {
    setSaveStatus("unsaved", t("browserDevNoSilentStorage"));
    console.error("Project State blocked a serious storage write because the desktop bridge is missing.");
    return Promise.resolve(false);
  }
  const hasApprovedCoreWrite = pendingApprovedCoreWrites > 0;
  if (!options.allowWithoutCoreApproval && !hasApprovedCoreWrite) {
    setSaveStatus("unsaved", t("saveBlockedApproval"));
    console.error("Project State blocked a save because no approved core change was recorded first.");
    return Promise.resolve(false);
  }
  const approvedWriteCount = pendingApprovedCoreWrites;
  pendingApprovedCoreWrites = 0;
  const storeSnapshot = cloneRecord(store);
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => ProjectStateStorage.save(storeSnapshot, { preserveConcurrentApiIntake: options.preserveConcurrentApiIntake }))
    .then(() => {
      setSaveStatus("saved", tFormat("savedAt", { time: formatDate(nowIso()) }));
      renderStorageWarning();
      return true;
    })
    .catch((error) => {
      pendingApprovedCoreWrites += approvedWriteCount;
      setSaveStatus("unsaved", tFormat("saveStorageFailed", { message: error?.message || t("storageFailed") }));
      console.error("Project State could not save through the storage spine.", error);
      return false;
    });
  return saveQueue;
}

function storageSizeInfo(raw = storageSnapshotText || platformAdapter.storage.getLegacyItem(STORAGE_KEY) || "") {
  const bytes = textByteSize(raw);
  const mb = bytes / 1024 / 1024;
  let level = "ok";
  if (mb >= 4.5) level = "danger";
  else if (mb >= 3) level = "warning";
  return {
    bytes,
    mb,
    level,
    label: `${mb.toFixed(2)} MB`
  };
}

function textByteSize(value = "") {
  const text = String(value || "");
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
  return text.length;
}

function renderStorageWarning() {
  const warning = document.querySelector("[data-storage-warning-slot]");
  if (!warning) return;
  warning.innerHTML = `${runtimeWarningHtml()}${storageWarningHtml()}`;
}

function runtimeWarningHtml() {
  if (!browserDevRuntime()) return "";
  return `
    <div class="storage-warning warning" role="status">
      <strong>${escapeHtml(t("browserDevRuntime"))}:</strong> ${escapeHtml(t("browserRuntimeWarning"))}
    </div>
  `;
}

function storageWarningHtml(raw) {
  if (arguments.length === 0 && store.settings?.recoveryWarnings === false) return "";
  const info = storageSizeInfo(raw);
  if (info.level === "ok") return "";
  const message = info.level === "danger"
    ? t("storageWarningDanger")
    : t("storageWarningNotice");
  return `
    <div class="storage-warning ${info.level}" role="status">
      <strong>${escapeHtml(t("storageWarningTitle"))}:</strong> ${escapeHtml(message)} ${escapeHtml(tFormat("currentSizeSentence", { size: info.label }))}
    </div>
  `;
}

function setSaveStatus(status, message) {
  saveState = { status, message };
  const indicator = document.querySelector(".save-indicator");
  if (!indicator) return;
  indicator.className = `save-indicator ${status}`;
  indicator.textContent = message;
}

window.addEventListener("beforeunload", (event) => {
  if (saveState.status !== "unsaved") return;
  event.preventDefault();
  event.returnValue = "";
});

function actorDisplay(actorId, fallbackName = "") {
  const actor = getActor(actorId);
  if (actor) return `${actor.name} (${actorRoleLabel(actor.role, actor.type)})`;
  return fallbackName ? `${fallbackName} (Recorded)` : "Unknown actor";
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(value, includeTime = true) {
  if (!value) return t("notRecorded");
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return t("notRecorded");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: includeTime && !dateOnly ? "short" : undefined
  }).format(date);
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function limitText(value = "", limit = DISPLAY_TEXT_LIMIT) {
  const text = String(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}... [truncated for display; full value is stored]`;
}

function escapeDisplay(value = "", limit = DISPLAY_TEXT_LIMIT) {
  return escapeHtml(limitText(value, limit));
}

function tagsFromText(value = "") {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tagsToText(tags = []) {
  return Array.isArray(tags) ? tags.join(", ") : String(tags || "");
}

function nameKey(value = "") {
  return String(value).trim().toLowerCase();
}

function normalizeLanguage(language = DEFAULT_LANGUAGE) {
  const code = String(language || "").trim();
  return LANGUAGES[code] ? code : DEFAULT_LANGUAGE;
}

function currentLanguage() {
  return normalizeLanguage(store?.settings?.language);
}

function t(key) {
  return LANGUAGES[currentLanguage()]?.[key] || LANGUAGES[DEFAULT_LANGUAGE][key] || key;
}

function tFormat(key, values = {}) {
  return Object.entries(values).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, t(key));
}

function languageOptions(selected = currentLanguage()) {
  const selectedLanguage = normalizeLanguage(selected);
  return Object.entries(LANGUAGES)
    .map(([code, labels]) => `<option value="${code}" ${selectedLanguage === code ? "selected" : ""}>${escapeHtml(labels.languageName || code)}</option>`)
    .join("");
}

function languageDisplayName(language = DEFAULT_LANGUAGE) {
  const code = normalizeLanguage(language);
  return `${LANGUAGES[code]?.languageName || code} (${code})`;
}

function resolveProjectIdByName(name, currentProjectId = "", context = null) {
  const key = nameKey(name);
  if (!key) return "";
  if (context?.projectNameToId?.has(key)) {
    const projectId = context.projectNameToId.get(key);
    return projectId === currentProjectId ? "" : projectId;
  }
  if (context) return "";
  const project = store?.projects?.find((item) => nameKey(item.name) === key && item.id !== currentProjectId);
  return project?.id || "";
}

function projectNameById(projectId) {
  return store.projects.find((project) => project.id === projectId)?.name || "";
}

function relationshipTargetLabel(relationship) {
  return relationship.targetProjectId ? (projectNameById(relationship.targetProjectId) || relationship.target || "Related project") : relationship.target;
}

function findObjectByTitle(project, objectType, title = "") {
  const key = nameKey(title);
  if (!key) return null;
  const match = (value) => nameKey(value) === key;
  if (objectType === "Project") return match(project.name) ? project : null;
  if (objectType === "Decision") return project.decisions.find((item) => match(item.text)) || null;
  if (objectType === "Fact") return project.facts.find((item) => match(item.statement)) || null;
  if (objectType === "Conflict") return (project.conflicts || []).find((item) => match(item.title)) || null;
  if (objectType === "Source") return project.sources.find((item) => match(item.title)) || null;
  if (objectType === "DraftProject") return project.draftProjects.find((item) => match(item.name)) || null;
  if (objectType === "Relationship") return project.relationships.find((item) => match(item.target)) || null;
  if (objectType === "OpenQuestion") return project.openQuestions.find((item) => match(item.question)) || null;
  if (objectType === "NextAction") return project.nextActions.find((item) => match(item.action)) || null;
  if (objectType === "Change") return project.changes.find((item) => match(item.summary) || match(item.details?.objectTitle) || match(item.details?.objectText)) || null;
  if (objectType === "Extract") {
    for (const source of project.sources) {
      const extract = source.extracts.find((item) => match(item.text));
      if (extract) return extract;
    }
  }
  return null;
}

function fileMetadata(file) {
  return platformAdapter.files.metadata(file);
}

function sourceLocalFileMetadata(file) {
  const metadata = fileMetadata(file);
  if (!metadata) return null;
  return {
    ...metadata,
    localPath: platformAdapter.files.localPath(file)
  };
}

function selectedSourceFileMetadata(form, browserFile) {
  const selected = form?._projectStateSelectedFiles?.source;
  return sourceLocalFileMetadata(selected || browserFile);
}

function sourceFilePickerMarkup() {
  if (platformAdapter.dialogs?.available) {
    return `<button class="btn secondary" type="button" data-native-file-picker data-file-key="source" data-location-target="location" data-title-target="title" data-type-target="sourceType">${escapeHtml(t("browseFile"))}</button>`;
  }
  return `<input id="localFile" name="localFile" type="file" data-local-file-picker data-location-target="location" data-title-target="title" data-type-target="sourceType">`;
}

function backupLocationPickerMarkup() {
  if (!platformAdapter.dialogs?.available) return "";
  return `<button class="btn secondary" type="button" data-native-folder-picker data-location-target="backupLocationHint">${escapeHtml(t("browseFolder"))}</button>`;
}

function restoreFilePickerMarkup() {
  if (!platformAdapter.dialogs?.available) {
    return `<input id="backupFile" name="backupFile" type="file" accept=".json,application/json" required>`;
  }
  return `
    <input id="backupFilePath" name="backupFilePath" readonly required>
    <button class="btn secondary" type="button" data-native-file-picker data-file-key="backup" data-location-target="backupFilePath" data-file-filter="json">${escapeHtml(t("browseFile"))}</button>
  `;
}

function supportedImageTypes() {
  return ["image/png", "image/jpeg", "image/webp", "image/gif"];
}

function isSupportedImageFile(file) {
  if (!file?.name) return false;
  const type = String(file.type || "").toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase();
  return supportedImageTypes().includes(type) || ["png", "jpg", "jpeg", "webp", "gif"].includes(extension);
}

function readFileAsDataUrl(file) {
  return platformAdapter.files.readAsDataUrl(file);
}

function readFileAsText(file) {
  return platformAdapter.files.readAsText(file);
}

function readFileAsArrayBuffer(file) {
  return platformAdapter.files.readAsArrayBuffer(file);
}

function extractFileExtension(fileName = "") {
  return String(fileName).split(".").pop()?.toLowerCase() || "";
}

function isSupportedExtractFile(file) {
  const extension = extractFileExtension(file?.name);
  return ["pdf", "docx", "txt", "md"].includes(extension);
}

async function extractTextFromFile(file) {
  const platformText = await platformAdapter.files.extractText(file);
  if (typeof platformText === "string") return cleanExtractedText(platformText);
  const extension = extractFileExtension(file.name);
  if (extension === "txt" || extension === "md") {
    return cleanExtractedText(await readFileAsText(file));
  }
  if (extension === "docx") return extractDocxText(file);
  if (extension === "pdf") return extractPdfText(file);
  throw new Error("Unsupported file type.");
}

function cleanExtractedText(text = "") {
  return String(text)
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncateExtractedText(text = "") {
  const clean = cleanExtractedText(text);
  if (clean.length <= EXTRACT_TEXT_LIMIT) return { text: clean, truncated: false };
  return {
    text: clean.slice(0, EXTRACT_TEXT_LIMIT),
    truncated: true
  };
}

async function extractDocxText(file) {
  const bytes = new Uint8Array(await readFileAsArrayBuffer(file));
  const entry = findZipEntry(bytes, "word/document.xml");
  if (!entry) throw new Error("Could not find document text in this DOCX.");
  const xmlBytes = await inflateZipEntry(bytes, entry);
  const xml = new TextDecoder("utf-8").decode(xmlBytes);
  return cleanExtractedText(xmlToText(xml));
}

function findZipEntry(bytes, fileName) {
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (readUint32(bytes, i) !== 0x06054b50) continue;
    const entryCount = readUint16(bytes, i + 10);
    const directoryOffset = readUint32(bytes, i + 16);
    let offset = directoryOffset;
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
      if (readUint32(bytes, offset) !== 0x02014b50) return null;
      const method = readUint16(bytes, offset + 10);
      const compressedSize = readUint32(bytes, offset + 20);
      const fileNameLength = readUint16(bytes, offset + 28);
      const extraLength = readUint16(bytes, offset + 30);
      const commentLength = readUint16(bytes, offset + 32);
      const localHeaderOffset = readUint32(bytes, offset + 42);
      const name = new TextDecoder("utf-8").decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
      if (name === fileName) return { method, compressedSize, localHeaderOffset };
      offset += 46 + fileNameLength + extraLength + commentLength;
    }
  }
  return null;
}

async function inflateZipEntry(bytes, entry) {
  const localOffset = entry.localHeaderOffset;
  if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("Invalid DOCX file.");
  const nameLength = readUint16(bytes, localOffset + 26);
  const extraLength = readUint16(bytes, localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method !== 8) throw new Error("This DOCX compression method is not supported.");
  return platformAdapter.files.inflateRaw(compressed);
}

function xmlToText(xml = "") {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
  );
}

function decodeXmlEntities(text = "") {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPdfText(file) {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(await readFileAsArrayBuffer(file)));
  const parts = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    parts.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "")));
  }
  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    for (const literal of match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      parts.push(decodePdfLiteral(literal[0]));
    }
  }
  return cleanExtractedText(parts.join(" "));
}

function decodePdfLiteral(value = "") {
  return value
    .replace(/^\(|\)$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 bytes";
  const units = ["bytes", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getActor(actorId) {
  return store.actors.find((actor) => actor.id === actorId) || null;
}

function currentActor() {
  return getActor(store.settings?.primaryActorId) || store.actors.find((actor) => normalizeActorStatus(actor.status) === "active") || null;
}

function defaultUiActor() {
  return currentActor() || store.actors.find((actor) => normalizeActorStatus(actor.status) === "active") || getOrCreateActor("Owner", "Human");
}

function actorPermissionRoles(actor, project = null) {
  if (!actor) return [];
  const roles = [normalizeActorRole(actor.role, actor.type)];
  if (project) {
    for (const assignment of project.projectRoles || []) {
      if (assignment.actorId === actor.id && assignment.status !== "archived") roles.push(normalizeActorRole(assignment.role));
    }
  }
  return [...new Set(roles)];
}

function actorHasPermission(actor, permission, project = null) {
  if (!actor || normalizeActorStatus(actor.status) !== "active") return false;
  return actorPermissionRoles(actor, project).some((role) => Boolean(ROLE_PERMISSION_MATRIX[role]?.[permission]));
}

function validateActorPermission(actor, permission, project = null) {
  if (actorHasPermission(actor, permission, project)) return true;
  window.alert(t("permissionDenied"));
  return false;
}

function currentActorCan(permission, project = getProject()) {
  return actorHasPermission(currentActor(), permission, project);
}

function actionPermission(action = "") {
  if (["create-project", "add-decision", "add-fact", "add-conflict", "add-source", "add-relationship", "add-question", "add-action", "add-extract", "read-file-extract", "suggest-extract", "create-draft-project", "import-files", "import-folder", "import-project-files", "import-project-folder"].includes(action)) return "create";
  if (["edit-status", "edit-object", "assign-object", "mark-complete", "attach-source", "attach-image", "archive-object", "unarchive-project", "manage-project-roles", "review-source-freshness", "verify-source-file", "verify-all-source-files", "archive-ai-work-order", "edit-file-source", "archive-file-source"].includes(action)) return "edit";
  if (["approve-intake", "approve-extract", "approve-draft-project"].includes(action)) return "approve";
  if (["export-project", "export-handoff", "context-pack", "view-object-history", "show-history", "view-history", "show-changes-since", "history-file-source", "refresh-storage"].includes(action)) return "audit";
  if (["show-settings", "backup-storage", "restore-storage", "reset-local-data", "export-current-raw-data", "enable-arm-transport", "disable-arm-transport", "rotate-arm-transport-token", "revoke-arm-transport"].includes(action)) return "admin";
  return "";
}

function actionAllowedForCurrentActor(action = "", project = getProject()) {
  if (needsFirstRunSetup() && action === "restore-storage") return true;
  const actor = currentActor();
  const role = normalizeActorRole(actor?.role, actor?.type);
  if (["create-intake", "create-ai-work-order", "propose-correction"].includes(action)) return actorHasPermission(actor, "create", project);
  if (["review-intake-queue", "batch-triage", "reject-intake", "archive-intake", "comment-object", "comment-ai-work-order"].includes(action)) {
    return ["owner", "admin", "project_lead", "approver", "editor", "contributor", "reviewer", "auditor"].includes(role);
  }
  if (["delete-project", "delete-archived-project", "delete-all-archived-projects"].includes(action)) return role === "owner";
  const permission = actionPermission(action);
  if (role === "ai_tool" && permission === "create") return false;
  return permission ? currentActorCan(permission, project) : true;
}

function applyRoleAwareControls() {
  const actor = currentActor();
  const project = getProject();
  for (const control of app.querySelectorAll("[data-action]")) {
    if (!actionAllowedForCurrentActor(control.dataset.action, project)) control.hidden = true;
  }
  for (const menu of app.querySelectorAll("details.action-menu")) {
    if (!menu.querySelector(".action-menu-popover [data-action]:not([hidden])")) menu.hidden = true;
  }
  return actor;
}

function actorName(actorId) {
  return getActor(actorId)?.name || "Unknown actor";
}

function getOrCreateActor(name, type = "Human") {
  const normalized = name.trim();
  const existing = store.actors.find((actor) => actor.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;

  const actor = {
    id: uid("actor"),
    name: normalized,
    type,
    role: normalizeActorRole("", type),
    status: "active",
    emailAddress: "",
    chatHandle: ""
  };
  store.actors.push(actor);
  return actor;
}

function getProject(projectId = activeProjectId) {
  return store.projects.find((project) => project.id === projectId) || null;
}

function getProjectObject(project, objectType, objectId) {
  if (objectType === "Project") return project;
  if (objectType === "Decision") return project.decisions.find((item) => item.id === objectId) || null;
  if (objectType === "Fact") return project.facts.find((item) => item.id === objectId) || null;
  if (objectType === "Conflict") return (project.conflicts || []).find((item) => item.id === objectId) || null;
  if (objectType === "Source") return project.sources.find((item) => item.id === objectId) || null;
  if (objectType === "DraftProject") return project.draftProjects.find((item) => item.id === objectId) || null;
  if (objectType === "Extract") {
    for (const source of project.sources) {
      const extract = source.extracts.find((item) => item.id === objectId);
      if (extract) return extract;
    }
  }
  if (objectType === "Relationship") return project.relationships.find((item) => item.id === objectId) || null;
  if (objectType === "OpenQuestion") return project.openQuestions.find((item) => item.id === objectId) || null;
  if (objectType === "NextAction") return project.nextActions.find((item) => item.id === objectId) || null;
  if (objectType === "Change") return project.changes.find((item) => item.id === objectId) || null;
  return null;
}

function getActionStatus(action) {
  return normalizeActionStatus(action.status);
}

function normalizeActionStatus(status = "open") {
  return ["open", "completed", "archived"].includes(status) ? status : "open";
}

function normalizeActorRole(role = "", type = "Human") {
  if (ACTOR_ROLES.includes(role)) return role;
  const actorType = String(type || "").toLowerCase();
  if (actorType.includes("ai") || actorType.includes("tool") || actorType.includes("codex")) return "ai_tool";
  return "contributor";
}

function normalizeActorStatus(status = "active") {
  return ACTOR_STATUSES.includes(status) ? status : "active";
}

function actorRoleLabel(role = "contributor", type = "Human") {
  const labels = {
    owner: t("owner"),
    admin: t("admin"),
    project_lead: t("projectLead"),
    approver: t("approver"),
    editor: t("editor"),
    contributor: t("contributor"),
    reviewer: t("reviewer"),
    auditor: t("auditor"),
    viewer: t("viewer"),
    ai_tool: t("aiTool")
  };
  return labels[normalizeActorRole(role, type)] || t("contributor");
}

function actorRoleOptions(selected = "contributor") {
  const safeSelected = normalizeActorRole(selected);
  return ACTOR_ROLES
    .map((role) => `<option value="${role}" ${safeSelected === role ? "selected" : ""}>${escapeHtml(actorRoleLabel(role))}</option>`)
    .join("");
}

function actorStatusOptions(selected = "active") {
  const safeSelected = normalizeActorStatus(selected);
  const labels = {
    active: t("active"),
    archived: t("archived")
  };
  return ACTOR_STATUSES
    .map((status) => `<option value="${status}" ${safeSelected === status ? "selected" : ""}>${escapeHtml(labels[status])}</option>`)
    .join("");
}

function normalizeHealthFlag(flag = "active") {
  return PROJECT_HEALTH_FLAGS.includes(flag) ? flag : "active";
}

function normalizeArmType(type = "other") {
  return ARM_TYPES.includes(type) ? type : "other";
}

function normalizeProposedObjectType(type = "Decision") {
  const allowed = ["ProjectStatus", "Decision", "Fact", "Conflict", "OpenQuestion", "NextAction", "Source", "Relationship"];
  return allowed.includes(type) ? type : "Decision";
}

function extractModeLabel(mode) {
  if (mode === "with_approval") return t("withApproval");
  if (mode === "ai_suggested") return t("aiSuggested");
  return t("manual");
}

function healthFlagLabel(flag = "active") {
  const labels = {
    active: t("active"),
    blocked: t("blocked"),
    at_risk: t("atRisk"),
    complete: t("complete"),
    on_hold: t("onHold")
  };
  return labels[flag] || t("active");
}

function healthFlagOptions(selected = "active") {
  const safeSelected = normalizeHealthFlag(selected);
  return PROJECT_HEALTH_FLAGS
    .map((flag) => `<option value="${flag}" ${safeSelected === flag ? "selected" : ""}>${healthFlagLabel(flag)}</option>`)
    .join("");
}

function flagItem(key, label, passed, required = false) {
  return { key, label, passed: Boolean(passed), required: Boolean(required) };
}

function allRequiredFlagsPass(flags = []) {
  return flags.every((flag) => !flag.required || flag.passed);
}

function knownImportSources(project = {}) {
  return (project.sources || []).filter((source) => source.status !== "archived");
}

function isKnownImportProject(project = {}) {
  return Boolean(project.sourceImportChecked || project.sourceImportReviewPending) && knownImportSources(project).length > 0;
}

function knownImportHasVerifiedSources(project = {}) {
  const sources = knownImportSources(project);
  return sources.length > 0 && !sources.some((source) => ["missing", "changed", "unverifiable"].includes(source.fileVerification?.status));
}

function intakeHasExistingTarget(item = {}) {
  return Boolean(item.projectId && getProject(item.projectId));
}

function intakeHasProposedProjectTarget(item = {}) {
  return item.destination === "proposed_new_project" && Boolean(String(item.proposedProjectName || "").trim());
}

function intakeHasCoreTarget(item = {}) {
  return intakeHasExistingTarget(item) || intakeHasProposedProjectTarget(item);
}

function intakePermissionProject(item = {}) {
  return intakeHasExistingTarget(item) ? getProject(item.projectId) : null;
}

function intakeSuggestedQueueState(item = {}) {
  const proposed = item.proposedChange || {};
  const hasMinimumProposal = String(item.title || "").trim()
    && String(proposed.text || "").trim()
    && normalizeProposedObjectType(item.proposedObjectType);
  if (hasMinimumProposal && intakeHasCoreTarget(item)) return "ready";
  if (hasMinimumProposal) return "needs_review";
  return "new";
}

function renderFlagPills(flags = []) {
  if (!flags.length) return "";
  return `
    <div class="review-flags">
      ${flags.map((flag) => `<span class="pill ${flag.passed ? "review-done" : flag.required ? "health-blocked" : "review-open"}">${escapeHtml(flag.label)}: ${flag.passed ? escapeHtml(t("present")) : escapeHtml(t("missing"))}</span>`).join("")}
    </div>
  `;
}

function projectCompletenessFlags(project) {
  const activeSources = (project.sources || []).filter((source) => source.status !== "archived");
  const sourceLinks = Array.isArray(project.sourceLinks) ? project.sourceLinks : [];
  const sourceIssues = activeSources.some((source) => ["missing", "changed", "unverifiable"].includes(source.fileVerification?.status));
  const knownImportReady = isKnownImportProject(project) && String(project.currentStatus || "").trim() && String(project.currentSummary || "").trim() && knownImportHasVerifiedSources(project);
  return [
    flagItem("hasCurrentStatus", t("hasCurrentStatus"), String(project.currentStatus || "").trim()),
    flagItem("hasCurrentSummary", t("hasCurrentSummary"), String(project.currentSummary || "").trim()),
    flagItem("hasNextAction", t("hasNextAction"), knownImportReady || (project.nextActions || []).some((action) => getActionStatus(action) === "open")),
    flagItem("hasRecentDecision", t("hasRecentDecision"), knownImportReady || (project.decisions || []).some((decision) => !decision.archived)),
    flagItem("hasSourceReference", t("hasSourceReference"), activeSources.length || sourceLinks.length),
    flagItem("sourceFilesClear", t("sourceFilesClear"), activeSources.length ? !sourceIssues : false),
    flagItem("healthNotBlocked", t("healthNotBlocked"), !["blocked", "at_risk"].includes(project.healthFlag))
  ];
}

function intakeAirlockChecks(intake) {
  const proposed = intake.proposedChange || {};
  return [
    flagItem("targetProjectSelected", t("targetProjectSelected"), intakeHasCoreTarget(intake), true),
    flagItem("proposedTitleRecorded", t("proposedTitleRecorded"), String(intake.title || "").trim(), true),
    flagItem("proposedTextRecorded", t("proposedTextRecorded"), String(proposed.text || "").trim(), true),
    flagItem("proposedTypeSelected", t("proposedTypeSelected"), normalizeProposedObjectType(intake.proposedObjectType), true),
    flagItem("queueMarkedReady", t("queueMarkedReady"), intake.queueState === "ready", true)
  ];
}

function draftAirlockChecks(draftProject) {
  const flags = normalizeDraftReviewFlags(draftProject.reviewFlags);
  return [
    flagItem("draftNameRecorded", t("draftNameRecorded"), String(draftProject.name || "").trim(), true),
    flagItem("draftTextRecorded", t("draftTextRecorded"), String(draftProject.draft || "").trim(), true),
    flagItem("draftSourceLinked", t("draftSourceLinked"), draftProject.sourceId && draftProject.extractId, true),
    flagItem("draftReviewComplete", t("draftReviewComplete"), DRAFT_REVIEW_FLAGS.every((flag) => flags[flag]), true)
  ];
}

function sortNewest(items, field = "createdAt") {
  return [...items].sort((a, b) => dateSortValue(b[field]) - dateSortValue(a[field]));
}

function dateSortValue(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function recent(items, count) {
  return items.slice(0, count);
}

function recordChange(project, actor, reason, summary, details = {}) {
  requireHumanApproval(actor, reason, details);
  pendingApprovedCoreWrites += 1;
  const timestamp = nowIso();
  const objectTitle = details.objectTitle || details.objectText || "";
  const normalizedDetails = {
    ...details,
    origin: details.origin || "human_ui",
    objectTitle,
    objectText: details.objectText || objectTitle
  };
  setSaveStatus("unsaved", t("unsavedChanges"));
  const change = {
    id: uid("change"),
    projectId: project.id,
    actorId: actor.id,
    actorName: actor.name,
    timestamp,
    language: currentLanguage(),
    howChanged: normalizedDetails.origin,
    reason: reason.trim(),
    summary,
    details: {
      ...normalizedDetails,
      language: currentLanguage()
    }
  };

  project.changes.unshift(change);
  project.updatedAt = timestamp;
  project.updatedBy = actor.id;
  const changedObject = normalizedDetails.objectType && normalizedDetails.objectId
    ? getProjectObject(project, normalizedDetails.objectType, normalizedDetails.objectId)
    : null;
  if (changedObject && changedObject !== project && normalizedDetails.objectType !== "Change") {
    changedObject.updatedAt = timestamp;
    changedObject.updatedBy = actor.id;
  }
  return change;
}

function render() {
  if (!storageReady) {
    renderLoadingScreen();
    return;
  }

  if (loadFailure) {
    renderRecoveryScreen();
    return;
  }

  if (browserDevRuntime()) {
    renderBrowserDevModeGate();
    return;
  }

  if (needsFirstRunSetup()) {
    renderFirstRunSetup();
    return;
  }

  if (searchQuery.trim()) {
    renderSearchResults();
    return;
  }

  if (!activeProjectId) {
    if (activeRootView === "inbox") renderWorkInbox();
    else if (activeRootView === "work-orders") renderAiWorkOrders();
    else if (activeRootView === "files") renderFilesLibrary();
    else if (activeRootView === "intake") renderIntakeQueue();
    else if (activeRootView === "archived") renderArchivedProjectList();
    else if (activeRootView === "settings") renderSettings();
    else renderProjectList();
    return;
  }

  const project = getProject();
  if (!project) {
    activeProjectId = null;
    renderProjectList();
    return;
  }

  renderProject(project);
}

function needsFirstRunSetup() {
  return !store.settings?.setupCompletedAt || !store.settings?.primaryActorId;
}

function captureWorkspacePosition() {
  if (!activeProjectId || !store.settings) return;
  const uiState = normalizeUiState(store.settings.uiState);
  uiState.projectScrollPositions[activeProjectId] = Math.max(0, Math.round(window.scrollY || 0));
  store.settings.uiState = uiState;
}

function rememberProjectVisit(projectId, view = activeView) {
  if (!projectId || !store.settings) return;
  const uiState = normalizeUiState(store.settings.uiState);
  uiState.recentProjectIds = [projectId, ...uiState.recentProjectIds.filter((id) => id !== projectId)].slice(0, RECENT_PROJECT_LIMIT);
  uiState.lastProjectId = projectId;
  uiState.lastProjectView = ["dashboard", "handoff", "map", "changes_since", "history"].includes(view) ? view : "dashboard";
  store.settings.uiState = uiState;
  saveStore({ allowWithoutCoreApproval: true, reason: "workspace-ui-state" });
}

function restoreWorkspacePosition(projectId = activeProjectId) {
  const y = normalizeUiState(store.settings?.uiState).projectScrollPositions[projectId] || 0;
  requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
}

function openProjectNow(projectId, view = "") {
  const uiState = normalizeUiState(store.settings?.uiState);
  activeProjectId = projectId;
  activeRootView = "projects";
  activeView = view || (uiState.lastProjectId === projectId ? uiState.lastProjectView : "dashboard");
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  activeObjectDetail = null;
  searchQuery = "";
  rememberProjectVisit(projectId, activeView);
}

function recentProjects() {
  const uiState = normalizeUiState(store.settings?.uiState);
  return uiState.recentProjectIds.map((projectId) => getProject(projectId)).filter((project) => project && !project.archived);
}

function renderContinueWorking() {
  const uiState = normalizeUiState(store.settings?.uiState);
  const lastProjectRecord = getProject(uiState.lastProjectId);
  const lastProject = lastProjectRecord && !lastProjectRecord.archived ? lastProjectRecord : null;
  const recent = recentProjects();
  if (!lastProject && !recent.length) return "";
  return `
    <section class="continue-working-band">
      <div class="panel-head">
        <h2 class="panel-title">${escapeHtml(t("continueWorking"))}</h2>
        ${lastProject ? `<button class="btn secondary" data-action="continue-last-project" data-project-id="${escapeHtml(lastProject.id)}">${escapeHtml(t("continueLastProject"))}</button>` : ""}
      </div>
      <div class="recent-project-links">
        ${recent.length ? recent.map((project) => `<button class="recent-project-link" data-action="open-project" data-project-id="${escapeHtml(project.id)}"><strong>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</strong><span>${escapeDisplay(project.currentStatus || t("noStatusRecorded"), DISPLAY_META_LIMIT)}</span></button>`).join("") : emptyText(t("noRecentProjects"))}
      </div>
    </section>
  `;
}

function workInboxCount() {
  return buildWorkInboxItems().length;
}

function activeAiWorkOrderCount() {
  return (store.aiWorkOrders || []).filter((order) => !["completed", "archived"].includes(order.status)).length;
}

function renderAiWorkOrders() {
  const orders = sortNewest(store.aiWorkOrders || [], "createdAt");
  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("aiWorkOrders"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("aiWorkOrdersSubtitle"))}</p>
      </div>
      <button class="btn" data-action="create-ai-work-order">${escapeHtml(t("createAiWorkOrder"))}</button>
    </section>
    ${orders.length ? `<section class="list">${orders.map(renderAiWorkOrderItem).join("")}</section>` : `
      <section class="empty-state">
        <h2>${escapeHtml(t("noAiWorkOrders"))}</h2>
        <p>${escapeHtml(t("aiWorkOrderNotice"))}</p>
        <button class="btn" data-action="create-ai-work-order">${escapeHtml(t("createAiWorkOrder"))}</button>
      </section>
    `}
  `);
}

function renderAiWorkOrderItem(order) {
  const projectName = order.projectId ? projectNameById(order.projectId) || t("missingProject") : t("noTargetProject");
  const source = order.source || {};
  const sourceMeta = source.discoveryCaseId
    ? `Discovery case: ${source.discoveryCaseId}${source.sourceFiles?.length ? ` · Sources: ${source.sourceFiles.length}` : ""}${source.folderIntent ? ` · ${source.folderIntent}` : ""}`
    : "";
  return `
    <article class="item">
      <p class="item-title">${escapeDisplay(order.title, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("project"))}: ${escapeDisplay(projectName, DISPLAY_META_LIMIT)} · ${escapeHtml(t("status"))}: ${escapeHtml(aiWorkOrderStatusLabel(order.status))}</p>
      <p class="item-meta">${escapeHtml(t("contextPackPreset"))}: ${escapeHtml(contextPackPresetLabel(order.contextPreset))} · ${escapeHtml(t("outputType"))}: ${escapeDisplay(order.outputType || t("notRecorded"), DISPLAY_META_LIMIT)}</p>
      ${sourceMeta ? `<p class="item-meta">${escapeDisplay(sourceMeta, DISPLAY_META_LIMIT)}</p>` : ""}
      <p class="item-body">${escapeDisplay(order.task, DISPLAY_TEXT_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("created"))}: ${escapeHtml(formatDate(order.createdAt))} · ${escapeHtml(t("actor"))}: ${escapeHtml(actorDisplay(order.createdBy))}</p>
      ${order.canCreateIntake ? `<p class="notice">${escapeHtml(t("canCreateIntake"))}</p>` : ""}
      <div class="item-actions">
        ${order.projectId ? `<button class="btn secondary compact" data-action="open-project" data-project-id="${escapeHtml(order.projectId)}">${escapeHtml(t("goToProject"))}</button>` : ""}
        <button class="btn secondary compact" data-action="comment-ai-work-order" data-work-order-id="${escapeHtml(order.id)}">${escapeHtml(t("reviewThread"))}</button>
        <button class="btn secondary compact" data-action="archive-ai-work-order" data-work-order-id="${escapeHtml(order.id)}" ${order.status === "archived" ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
      </div>
    </article>
  `;
}

function aiWorkOrderStatusLabel(status = "submitted") {
  if (status === "in_progress") return t("inProgress");
  if (status === "completed") return t("complete");
  if (status === "archived") return t("archived");
  return t("pending");
}

function buildWorkInboxItems() {
  const items = [];
  const push = (item) => items.push({
    id: item.id || uid("inbox"),
    level: item.level || "warning",
    category: item.category || t("needsAttention"),
    title: item.title || t("openItem"),
    body: item.body || "",
    meta: item.meta || "",
    projectId: item.projectId || "",
    action: item.action || "open-project",
    correctiveAction: item.correctiveAction || "",
    actionLabel: item.actionLabel || t("openItem"),
    sortAt: item.sortAt || nowIso()
  });

  for (const intake of visibleIntakeItems(store.intakeItems || [])) {
    if (intake.archived || intake.status !== "pending") continue;
    const projectName = intake.projectId ? projectNameById(intake.projectId) || t("missingProject") : t("noTargetProject");
    const state = normalizeIntakeQueueState(intake.queueState);
    push({
      id: `intake-${intake.id}`,
      level: state === "blocked" ? "needs_attention" : state === "ready" ? "healthy" : "warning",
      category: state === "ready" ? t("readyToApprove") : state === "blocked" ? t("blockedWork") : t("needsReview"),
      title: intake.title,
      body: `${armTypeLabel(intake.armType)} · ${proposedObjectTypeLabel(intake.proposedObjectType)}`,
      meta: `${t("target")}: ${projectName} · ${t("created")}: ${formatDate(intake.createdAt)}`,
      action: "show-intake",
      actionLabel: t("goToIntake"),
      sortAt: intake.createdAt
    });
  }

  for (const project of store.projects || []) {
    if (project.archived) continue;
    const incompleteFlags = projectCompletenessFlags(project).filter((flag) => !flag.passed && !["sourceFilesClear", "healthNotBlocked"].includes(flag.key));
    if (incompleteFlags.length) {
      const correction = projectCorrectionForFlag(incompleteFlags[0].key);
      push({
        id: `project-completeness-${project.id}`,
        level: "warning",
        category: t("projectCompleteness"),
        title: project.name,
        body: incompleteFlags.map((flag) => flag.label).join(", "),
        meta: `${t("lastUpdated")}: ${formatDate(project.updatedAt)}`,
        projectId: project.id,
        action: "correct-project-warning",
        correctiveAction: correction.action,
        actionLabel: correction.label,
        sortAt: project.updatedAt
      });
    }
    for (const conflict of project.conflicts || []) {
      if (!["unresolved", "under_review"].includes(conflict.status)) continue;
      push({
        id: `conflict-${conflict.id}`,
        level: conflict.status === "unresolved" ? "needs_attention" : "warning",
        category: t("conflictRegister"),
        title: conflict.title,
        body: conflict.description || conflict.linkedItems || "",
        meta: `${t("project")}: ${project.name} · ${conflictStatusLabel(conflict.status)}`,
        projectId: project.id,
        actionLabel: t("goToProject"),
        sortAt: conflict.noticedAt
      });
    }
    for (const item of projectIntegrityObjects(project)) {
      for (const assignment of item.object.assignments || []) {
        if (assignment.status === "archived") continue;
        push({
          id: `assignment-${assignment.id}`,
          level: "warning",
          category: t("assignedToYou"),
          title: objectLabel(item.objectType, item.object),
          body: `${assignmentRoleLabel(assignment.role)} · ${actorDisplay(assignment.actorId)}`,
          meta: `${t("project")}: ${project.name} · ${t("assignedTo")}: ${actorDisplay(assignment.actorId)}`,
          projectId: project.id,
          actionLabel: t("goToProject"),
          sortAt: assignment.assignedAt
        });
      }
    }

    if (["blocked", "at_risk"].includes(project.healthFlag)) {
      push({
        id: `project-health-${project.id}`,
        level: project.healthFlag === "blocked" ? "needs_attention" : "warning",
        category: project.healthFlag === "blocked" ? t("blockedWork") : t("atRisk"),
        title: project.name,
        body: healthFlagLabel(project.healthFlag),
        meta: `${t("lastUpdated")}: ${formatDate(project.updatedAt)}`,
        projectId: project.id,
        actionLabel: t("goToProject"),
        sortAt: project.updatedAt
      });
    }

    for (const draft of project.draftProjects || []) {
      if (draft.status === "approved" || draft.status === "archived") continue;
      if (allRequiredFlagsPass(draftAirlockChecks(draft))) {
        push({
          id: `draft-${draft.id}`,
          level: "healthy",
          category: t("draftWaiting"),
          title: draft.name || t("draftProjectDefault"),
          body: t("readyToApprove"),
          meta: `${t("project")}: ${project.name} · ${t("created")}: ${formatDate(draft.createdAt)}`,
          projectId: project.id,
          actionLabel: t("goToProject"),
          sortAt: draft.createdAt
        });
      }
    }

    for (const action of project.nextActions || []) {
      if (getActionStatus(action) !== "open" || !action.dueDate) continue;
      const dueState = nextActionDueState(action.dueDate);
      if (!dueState) continue;
      push({
        id: `action-${action.id}`,
        level: dueState === "overdue" ? "needs_attention" : "warning",
        category: dueState === "overdue" ? t("overdue") : t("dueSoon"),
        title: action.action,
        body: `${t("due")}: ${formatDate(action.dueDate, false)}`,
        meta: `${t("project")}: ${project.name} · ${t("status")}: ${getActionStatus(action)}`,
        projectId: project.id,
        actionLabel: t("goToProject"),
        sortAt: action.dueDate
      });
    }

    const openActions = (project.nextActions || []).filter((action) => getActionStatus(action) === "open");
    if (!openActions.length) {
      for (const question of project.openQuestions || []) {
        if (question.status !== "open") continue;
        push({
          id: `question-${question.id}`,
          level: "warning",
          category: t("openQuestionNeedsAction"),
          title: question.question,
          body: question.context || "",
          meta: `${t("project")}: ${project.name} · ${t("created")}: ${formatDate(question.createdAt)}`,
          projectId: project.id,
          actionLabel: t("goToProject"),
          sortAt: question.createdAt
        });
      }
    }

    for (const source of project.sources || []) {
      const status = source.fileVerification?.status || "";
      if (!["missing", "changed", "unverifiable"].includes(status)) continue;
      push({
        id: `source-${source.id}`,
        level: status === "missing" ? "needs_attention" : "warning",
        category: t("missingSource"),
        title: source.title || t("source"),
        body: sourceFileVerificationMessage(source.fileVerification),
        meta: `${t("project")}: ${project.name}`,
        projectId: project.id,
        actionLabel: t("goToProject"),
        sortAt: source.fileVerification.checkedAt || source.dateAdded
      });
    }
  }

  const integrity = buildIntegrityDashboard(settingsDiagnostics(), storageSizeInfo());
  const integrityIssues = Object.values(integrity.groups || {})
    .flat()
    .filter((issue) => issue.level !== "ok" && issue.type !== "source-file-verification")
    .slice(0, 12);
  for (const issue of integrityIssues) {
    push({
      id: `integrity-${issue.type}-${issue.objectId || issue.projectId || issue.message}`,
      level: issue.level,
      category: t("integrityWarning"),
      title: issue.objectTitle || issue.projectName || issue.type,
      body: issue.message,
      meta: issue.projectName ? `${t("project")}: ${issue.projectName}` : "",
      projectId: issue.projectId,
      action: issue.projectId ? "open-project" : "show-settings",
      actionLabel: issue.projectId ? t("goToProject") : t("goToSettings"),
      sortAt: integrity.generatedAt
    });
  }

  for (const order of store.aiWorkOrders || []) {
    if (["completed", "archived"].includes(order.status)) continue;
    push({
      id: `ai-work-order-${order.id}`,
      level: "warning",
      category: t("aiWorkOrders"),
      title: order.title,
      body: order.task,
      meta: `${t("contextPackPreset")}: ${contextPackPresetLabel(order.contextPreset)} · ${t("status")}: ${aiWorkOrderStatusLabel(order.status)}`,
      projectId: order.projectId,
      action: "show-work-orders",
      actionLabel: t("aiWorkOrders"),
      sortAt: order.createdAt
    });
  }

  return items
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => inboxLevelRank(a.level) - inboxLevelRank(b.level) || dateSortValue(b.sortAt) - dateSortValue(a.sortAt));
}

function nextActionDueState(dueDate) {
  const due = Date.parse(`${dueDate}T00:00:00`);
  if (!Number.isFinite(due)) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((due - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 7) return "dueSoon";
  return "";
}

function inboxLevelRank(level = "warning") {
  if (level === "needs_attention") return 0;
  if (level === "warning") return 1;
  return 2;
}

function inboxStats(items = []) {
  return {
    total: items.length,
    ready: items.filter((item) => item.category === t("readyToApprove") || item.category === t("draftWaiting")).length,
    blocked: items.filter((item) => item.category === t("blockedWork")).length,
    overdue: items.filter((item) => item.category === t("overdue")).length,
    warnings: items.filter((item) => item.level === "warning").length
  };
}

function renderWorkInbox() {
  const items = buildWorkInboxItems();
  const stats = inboxStats(items);
  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("needsAttention"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("workInboxSubtitle"))}</p>
      </div>
    </section>
    <article class="panel">
      <div class="meta-grid">
        ${renderInboxStat(t("needsAttention"), stats.total)}
        ${renderInboxStat(t("readyToApprove"), stats.ready)}
        ${renderInboxStat(t("blockedWork"), stats.blocked)}
        ${renderInboxStat(t("overdue"), stats.overdue)}
        ${renderInboxStat(t("warning"), stats.warnings)}
      </div>
    </article>
    ${items.length ? `<section class="inbox-groups">${renderInboxGroups(items)}</section>` : `
      <section class="empty-state">
        <h2>${escapeHtml(t("inboxEmpty"))}</h2>
        <p>${escapeHtml(t("inboxEmptyDetail"))}</p>
      </section>
    `}
  `);
}

function renderInboxStat(label, value) {
  return `
    <div class="meta-card">
      <p class="meta-label">${escapeHtml(label)}</p>
      <p class="meta-value">${escapeHtml(String(value))}</p>
    </div>
  `;
}

function renderInboxGroups(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }
  return [...groups.entries()].map(([category, groupItems]) => `
    <article class="panel">
      <div class="panel-head">
        <h2 class="panel-title">${escapeHtml(category)} (${groupItems.length})</h2>
      </div>
      <div class="list">${groupItems.map(renderInboxItem).join("")}</div>
    </article>
  `).join("");
}

function renderInboxItem(item) {
  return `
    <div class="item">
      <p class="item-title"><span class="pill integrity-${escapeHtml(item.level)}">${escapeHtml(integrityStatusLabel(item.level))}</span> ${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
      ${item.body ? `<p class="item-body">${escapeDisplay(item.body, DISPLAY_META_LIMIT)}</p>` : ""}
      ${item.meta ? `<p class="item-meta">${escapeDisplay(item.meta, DISPLAY_META_LIMIT)}</p>` : ""}
      <div class="item-actions">
        <button class="btn secondary compact" data-action="${escapeHtml(item.action)}" ${item.projectId ? `data-project-id="${escapeHtml(item.projectId)}"` : ""} ${item.correctiveAction ? `data-corrective-action="${escapeHtml(item.correctiveAction)}"` : ""}>${escapeHtml(item.actionLabel)}</button>
      </div>
    </div>
  `;
}

function renderLoadingScreen() {
  app.innerHTML = `
    <main class="main recovery-screen">
      <section class="panel strong">
        <h1 class="view-title">${escapeHtml(t("openingTitle"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("openingSubtitle"))}</p>
      </section>
    </main>
  `;
}

function shell(inner) {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="brand-title">${escapeHtml(t("appTitle"))}</div>
        <div class="brand-kicker">${escapeHtml(t("appKicker"))}</div>
      </div>
      <label class="search-box">
        <span>${escapeHtml(t("search"))}</span>
        <input type="search" data-search-input value="${escapeHtml(searchQuery)}" placeholder="${escapeHtml(t("searchPlaceholder"))}">
      </label>
      <div class="button-row">
        ${activeProjectId ? `<button class="btn secondary" data-action="back">${escapeHtml(t("backToProjects"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-projects">${escapeHtml(t("projects"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-inbox">${escapeHtml(t("needsAttention"))}${workInboxCount() ? ` (${workInboxCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-work-orders">${escapeHtml(t("aiWorkOrders"))}${activeAiWorkOrderCount() ? ` (${activeAiWorkOrderCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-files">${escapeHtml(t("addIntake"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-archived-projects">${escapeHtml(t("archivedProjects"))}${archivedProjectCount() ? ` (${archivedProjectCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-intake">${escapeHtml(t("intake"))}${pendingIntakeCount() ? ` (${pendingIntakeCount()})` : ""}</button>` : ""}
        ${!activeProjectId && platformAdapter.storage.externalStore ? `<button class="btn secondary" data-action="refresh-storage">${escapeHtml(t("refreshStorage"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-settings">${escapeHtml(t("settings"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="backup-storage">${escapeHtml(t("backup"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="restore-storage">${escapeHtml(t("restore"))}</button>` : ""}
        ${activeProjectId ? `<button class="btn secondary" data-action="export-project">${escapeHtml(t("exportJson"))}</button>` : ""}
        <span class="actor-role-indicator">${escapeHtml(t("currentActorRole"))}: ${escapeHtml(actorRoleLabel(currentActor()?.role, currentActor()?.type))}</span>
        <span class="save-indicator ${saveState.status}" role="status">${escapeHtml(saveState.message || t("saved"))}</span>
        <button class="btn" data-action="create-project">${escapeHtml(t("createProject"))}</button>
      </div>
    </header>
    <div data-storage-warning-slot>${runtimeWarningHtml()}${storageWarningHtml()}</div>
    <main class="main">${workflowBreadcrumbHtml()}${inner}</main>
  `;
  applyRoleAwareControls();
}

function projectCorrectionForFlag(flagKey = "") {
  if (["hasCurrentStatus", "hasCurrentSummary", "healthNotBlocked"].includes(flagKey)) return { action: "edit-status", label: "Complete current state" };
  if (flagKey === "hasNextAction") return { action: "add-action", label: "Add next action" };
  if (flagKey === "hasRecentDecision") return { action: "add-decision", label: "Record decision" };
  if (["hasSourceReference", "sourceFilesClear"].includes(flagKey)) return { action: flagKey === "sourceFilesClear" ? "verify-all-source-files" : "add-source", label: flagKey === "sourceFilesClear" ? "Verify source files" : "Add source" };
  return { action: "edit-status", label: "Open and correct" };
}

function projectNextStep(project) {
  const flags = projectCompletenessFlags(project);
  const missing = new Set(flags.filter((flag) => !flag.passed).map((flag) => flag.key));
  const knownImportChecked = isKnownImportProject(project);
  if (missing.has("hasCurrentStatus") || missing.has("hasCurrentSummary")) return { action: "edit-status", label: "Complete current state", detail: "Record the current status and summary." };
  if (knownImportChecked) return {
    action: "show-files",
    label: "Project ready",
    buttonLabel: "Add Intake",
    detail: "Known project material is already in Core and listed below. Add more files when needed, or make changes only if something looks wrong.",
    secondaryActions: [{ action: "edit-status", label: "Make changes" }]
  };
  if (missing.has("hasNextAction")) return { action: "add-action", label: "Add next action", detail: "Give the project one concrete next step." };
  if (missing.has("hasRecentDecision")) return { action: "add-decision", label: "Record a decision", detail: "Capture the latest governing decision." };
  if (missing.has("hasSourceReference")) return { action: "add-source", label: "Add supporting source", detail: "Connect evidence to the project." };
  if (missing.has("sourceFilesClear")) return { action: "verify-all-source-files", label: "Verify source files", detail: "Resolve missing or changed source evidence." };
  if (missing.has("healthNotBlocked")) return { action: "edit-status", label: "Review blocked status", detail: "Update the health flag or record what remains blocked." };
  return { action: "show-history", label: "Review recent history", detail: "The project is complete enough for continued work." };
}

function intakeNextStep(item, airlockFlags = intakeAirlockChecks(item)) {
  if (item.status === "approved" && item.projectId && getProject(item.projectId)) return { action: "open-project", label: "Open approved project", projectId: item.projectId };
  if (item.status !== "pending" || item.archived) return null;
  if (item.queueState === "ready" && allRequiredFlagsPass(airlockFlags)) return { action: "approve-intake", label: "Approve to Core", intakeId: item.id };
  return { action: "review-intake-queue", label: item.queueState === "blocked" ? "Resolve blocked proposal" : "Complete proposal review", intakeId: item.id };
}

function intakeLaneLabel(item = {}) {
  if (item.armType === "discovery" && item.destination === "proposed_new_project") return "Discovery → new project";
  if (item.armType === "discovery" && item.projectId) return "Discovery → existing project";
  if (item.armType === "discovery") return "Discovery sorting";
  if (item.proposedObjectType === "Source" && item.projectId) return "Add evidence";
  if (item.destination === "proposed_new_project") return "Manual → new project";
  return "Manual intake";
}

function workflowBreadcrumbHtml() {
  const parts = [];
  if (activeProjectId) {
    const project = getProject(activeProjectId);
    parts.push(t("projects"), project?.name || t("missingProject"));
    const viewLabels = { dashboard: t("dashboard"), handoff: t("handoffMode"), map: t("projectMap"), changes_since: t("whatChangedSince"), history: t("changeHistory") };
    parts.push(viewLabels[activeView] || t("dashboard"));
    if (activeObjectDetail) parts.push(objectLabel(activeObjectDetail.objectType, getProjectObject(project, activeObjectDetail.objectType, activeObjectDetail.objectId) || {}));
  } else {
    const rootLabels = { projects: t("projects"), inbox: t("needsAttention"), "work-orders": t("aiWorkOrders"), files: t("addIntake"), intake: t("intake"), archived: t("archivedProjects"), settings: t("settings") };
    parts.push(rootLabels[activeRootView] || t("projects"));
  }
  return `<nav class="workflow-breadcrumb" aria-label="Current location">${parts.map((part, index) => `<span>${escapeDisplay(part, DISPLAY_META_LIMIT)}</span>${index < parts.length - 1 ? `<span aria-hidden="true">›</span>` : ""}`).join("")}</nav>`;
}

function renderRecoveryScreen() {
  app.innerHTML = `
    <main class="main recovery-screen">
      <section class="panel strong">
        <div class="view-head">
          <div>
            <h1 class="view-title">${escapeHtml(t("savedDataNeedsRecovery"))}</h1>
            <p class="view-subtitle">${escapeHtml(t("recoveryLoadNotice"))}</p>
          </div>
        </div>
        ${storageWarningHtml(loadFailure.raw || "")}
        <div class="stack">
          <p class="notice">${escapeHtml(t("recoveryExportNotice"))}</p>
          <div class="button-row">
            <button class="btn" data-action="export-failed-data">${escapeHtml(t("exportFailedData"))}</button>
            <button class="btn danger" data-action="reset-failed-data">${escapeHtml(t("resetLocalData"))}</button>
          </div>
          <div class="recovery-details">
            <p class="meta-label">${escapeHtml(t("errorDetails"))}</p>
            <pre>${escapeHtml(readableLoadError(loadFailure))}</pre>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderBrowserDevModeGate() {
  const manifest = buildStorageSpineManifest(store, storageSnapshotText || JSON.stringify(store));
  const counts = manifest.counts || {};
  const countRows = [
    [t("projects"), counts.projects || 0],
    [t("changeHistory"), counts.changes || 0],
    [t("sourcesLabel"), counts.sources || 0],
    [t("extractsLabel"), counts.extracts || 0],
    [t("imagesLabel"), manifest.largeContent?.attachments || 0],
    [t("draftProjects"), counts.drafts || 0]
  ];
  app.innerHTML = `
    <main class="main recovery-screen">
      <section class="panel strong">
        <div class="view-head">
          <div>
            <h1 class="view-title">${escapeHtml(t("browserDevGateTitle"))}</h1>
            <p class="view-subtitle">${escapeHtml(t("browserDevGateSubtitle"))}</p>
          </div>
        </div>
        ${runtimeWarningHtml()}
        ${storageWarningHtml()}
        <div class="stack">
          <p class="notice">${escapeHtml(t("browserDevGateNotice"))}</p>
          <p class="notice">${escapeHtml(t("browserDevNoSilentStorage"))}</p>
          <div>
            <p class="meta-label">${escapeHtml(t("browserDevGateReadOnly"))}</p>
            <p>${escapeHtml(t("currentMode"))}: ${escapeHtml(currentStorageModeName())}</p>
          </div>
          <div>
            <p class="meta-label">${escapeHtml(t("browserDevGateCounts"))}</p>
            <div class="summary-grid">
              ${countRows.map(([label, value]) => `
                <div>
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(value)}</strong>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function browserDevActionAllowed(action) {
  return ["export-failed-data"].includes(action);
}

function renderFirstRunSetup() {
  const existingActor = store.settings?.primaryActorId ? getActor(store.settings.primaryActorId) : store.actors[0];
  app.innerHTML = `
    <main class="main recovery-screen">
      <section class="panel strong">
        <div class="view-head">
          <div>
            <h1 class="view-title">${escapeHtml(t("setupTitle"))}</h1>
            <p class="view-subtitle">${escapeHtml(t("setupSubtitle"))}</p>
          </div>
        </div>
        <p class="notice">${escapeHtml(t("userPrivacyNotice"))}</p>
        <p class="notice">If you expected existing projects, restore a Project State backup before starting a new blank setup.</p>
        <div class="button-row">
          <button class="btn secondary" type="button" data-action="restore-storage">${escapeHtml(t("restore"))}</button>
        </div>
        <form class="form" data-first-run-setup>
          <div class="field">
            <label for="setupActorName">${escapeHtml(t("primaryActor"))}</label>
            <input id="setupActorName" name="actorName" value="${escapeHtml(existingActor?.name || "")}" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="backupLocationHint">${escapeHtml(t("backupLocation"))}</label>
            <input id="backupLocationHint" name="backupLocationHint" value="${escapeHtml(store.settings?.backupLocationHint || "")}" placeholder="${escapeHtml(t("backupLocationPlaceholder"))}">
            ${backupLocationPickerMarkup()}
          </div>
          <div class="two-col">
            <div class="field">
              <label for="backupReminder">${escapeHtml(t("backupReminder"))}</label>
              <select id="backupReminder" name="backupReminder">
                ${backupReminderOptions(store.settings?.backupReminder || "manual")}
              </select>
            </div>
            <div class="field">
              <label for="language">${escapeHtml(t("language"))}</label>
              <select id="language" name="language">
                ${languageOptions(store.settings?.language || currentLanguage())}
              </select>
            </div>
          </div>
          <label class="check-field">
            <input name="confirmLocalMode" type="checkbox" required>
            <span>${escapeHtml(t("localModeConfirm"))}</span>
          </label>
          <label class="check-field">
            <input name="recoveryWarnings" type="checkbox" ${store.settings?.recoveryWarnings !== false ? "checked" : ""}>
            <span>${escapeHtml(t("recoveryWarnings"))}</span>
          </label>
          <div class="form-footer">
            <button class="btn" type="submit">${escapeHtml(t("saveSetup"))}</button>
          </div>
        </form>
      </section>
    </main>
  `;
  applyInputLimits(app.querySelector("[data-first-run-setup]"));
  wireLocalFilePickers(app.querySelector("[data-first-run-setup]"));
}

function backupReminderOptions(selected = "manual") {
  const options = {
    manual: t("manual"),
    weekly: t("weekly"),
    monthly: t("monthly")
  };
  return Object.entries(options)
    .map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
}

function readableLoadError(failure) {
  if (!failure) return t("noErrorDetailsRecorded");
  const lines = [
    `Date: ${failure.date || t("notRecorded")}`,
    `Storage key: ${STORAGE_KEY}`,
    `Raw saved size: ${storageSizeInfo(failure.raw || "").label}`,
    `Error: ${failure.message || "Unknown load error"}`
  ];
  if (failure.stack) lines.push("", failure.stack);
  return lines.join("\n");
}

function focusSearchInput() {
  const field = document.querySelector("[data-search-input]");
  if (!field) return;
  field.focus();
  const end = field.value.length;
  field.setSelectionRange?.(end, end);
}

function renderProjectList() {
  const projects = sortNewest(store.projects.filter((project) => !project.archived), "updatedAt");

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("projects"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("chooseProjectEmpty"))}</p>
      </div>
    </section>
    ${renderContinueWorking()}
    ${projects.length ? `<section class="project-grid">${projects.map(renderProjectCard).join("")}</section>` : `
      <section class="empty-state">
        <h2>${escapeHtml(t("noActiveProjects"))}</h2>
        <p>${escapeHtml(t("createProjectEmpty"))}</p>
        <button class="btn" data-action="create-project">${escapeHtml(t("createProject"))}</button>
      </section>
    `}
  `);
}

function renderArchivedProjectList() {
  const projects = sortNewest(store.projects.filter((project) => project.archived), "updatedAt");
  const archivedIntakeCount = visibleIntakeItems(store.intakeItems || []).filter((item) => item.archived).length;
  const hasArchivedRecords = projects.length || archivedIntakeCount;

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("archivedProjects"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("archivedProjectsNotice"))}</p>
      </div>
      ${hasArchivedRecords ? `
        <div class="button-row">
          <button class="btn secondary" data-action="show-projects">${escapeHtml(t("backToProjects"))}</button>
          <button class="btn danger" data-action="delete-all-archived-projects">Delete all archived</button>
        </div>
      ` : ""}
    </section>
    ${projects.length ? `<section class="project-grid">${projects.map(renderProjectCard).join("")}</section>` : `
      <section class="empty-state">
        <h2>${escapeHtml(t("noArchivedProjects"))}</h2>
        <p>${escapeHtml(t("archivedProjectsEmpty"))}</p>
        <button class="btn secondary" data-action="show-projects">${escapeHtml(t("backToProjects"))}</button>
      </section>
    `}
  `);
}

function renderSettings() {
  if (!currentActorCan("admin", null)) {
    activeRootView = "projects";
    renderProjectList();
    return;
  }
  const info = storageSizeInfo();
  const diagnostics = settingsDiagnostics();
  const integrity = buildIntegrityDashboard(diagnostics, info);
  const runtimeStatus = desktopRuntimeReady() ? t("desktopRuntimeReady") : t("browserRuntimeWarning");
  const runtimeLabel = desktopRuntimeReady() ? t("desktopRuntime") : t("browserDevRuntime");
  const transport = armTransportStatus;
  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("settings"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("settingsSubtitle"))}</p>
      </div>
    </section>

    <section class="settings-grid">
      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("coreSettings"))}</h2>
        </div>
        <form class="form" data-settings-core>
          <div class="two-col">
            <div class="field">
              <label for="settingsLanguage">${escapeHtml(t("defaultLanguage"))}</label>
              <select id="settingsLanguage" name="language">
                ${languageOptions(store.settings?.language || currentLanguage())}
              </select>
            </div>
            <div class="field">
              <label for="settingsPrimaryActorId">${escapeHtml(t("defaultActor"))}</label>
              <select id="settingsPrimaryActorId" name="primaryActorId" required>
                ${actorSelectOptions(store.settings?.primaryActorId)}
              </select>
            </div>
          </div>
          <label class="check-field">
            <input name="recoveryWarnings" type="checkbox" ${store.settings?.recoveryWarnings !== false ? "checked" : ""}>
            <span>${escapeHtml(t("recoveryWarnings"))}</span>
          </label>
          <div class="field">
            <label for="settingsReason">${escapeHtml(t("reason"))}</label>
            <textarea id="settingsReason" name="reason" required placeholder="${escapeHtml(t("settingsReasonPlaceholder"))}"></textarea>
          </div>
          <div class="form-footer">
            <button class="btn" type="submit">${escapeHtml(t("saveCoreSettings"))}</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("usersActors"))}</h2>
        </div>
        <div class="form">
          <p class="notice">${escapeHtml(t("userPrivacyNotice"))}</p>
        </div>
        <div class="settings-list">
          ${store.actors.length ? store.actors.map(renderActorSettingsItem).join("") : emptyText(t("noActorsRecorded"))}
        </div>
        <form class="form settings-add-form" data-settings-add-actor>
          <div class="two-col">
            <div class="field">
              <label for="newActorName">${escapeHtml(t("newActorName"))}</label>
              <input id="newActorName" name="actorName" required>
            </div>
            <div class="field">
              <label for="newActorRole">${escapeHtml(t("role"))}</label>
              <select id="newActorRole" name="role">${actorRoleOptions("contributor")}</select>
            </div>
          </div>
          <div class="two-col">
            <div class="field">
              <label for="newActorEmail">${escapeHtml(t("emailAddress"))}</label>
              <input id="newActorEmail" name="emailAddress" type="email">
            </div>
            <div class="field">
              <label for="newActorChat">${escapeHtml(t("chatHandle"))}</label>
              <input id="newActorChat" name="chatHandle">
            </div>
          </div>
          <div class="field">
            <label for="newActorReason">${escapeHtml(t("reason"))}</label>
            <textarea id="newActorReason" name="reason" required placeholder="${escapeHtml(t("addActorReasonPlaceholder"))}"></textarea>
          </div>
          <div class="form-footer">
            <button class="btn" type="submit">${escapeHtml(t("addActor"))}</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("roleDefinitions"))} v${escapeHtml(ROLE_DEFINITIONS_VERSION)}</h2>
        </div>
        <div class="settings-list role-definitions">
          ${renderRoleDefinitions()}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("permissionMatrix"))}</h2>
        </div>
        <div class="form">
          <p class="notice">${escapeHtml(t("permissionMatrixNote"))}</p>
          ${renderPermissionMatrix()}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("mandatoryHistory"))} v${escapeHtml(HISTORY_POLICY_VERSION)}</h2>
        </div>
        <div class="form">
          <p class="notice">${escapeHtml(t("mandatoryHistoryNote"))}</p>
          ${renderMandatoryHistoryPolicy()}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("storageSystem"))}</h2>
        </div>
        <form class="form" data-settings-storage>
          <div class="meta-grid">
            <div>
              <p class="meta-label">${escapeHtml(t("desktopRuntime"))}</p>
              <p>${escapeHtml(runtimeLabel)}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("primaryStorage"))}</p>
              <p>${escapeHtml(t("platformStorageSpine"))}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("platformAdapterLabel"))}</p>
              <p>${escapeHtml(platformAdapter.label)}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("currentMode"))}</p>
              <p>${escapeHtml(storageMode)}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("currentSize"))}</p>
              <p>${escapeHtml(info.label)} (${escapeHtml(info.level)})</p>
            </div>
          </div>
          <p class="notice">${escapeHtml(runtimeStatus)}</p>
          <p class="notice">${escapeHtml(t("storageMigrationNotice"))}</p>
          <label class="check-field">
            <input name="storageOverrideAcknowledged" type="checkbox" ${store.settings?.storageOverrideAcknowledged ? "checked" : ""}>
            <span>${escapeHtml(t("storageOverrideAcknowledged"))}</span>
          </label>
          <div class="field">
            <label for="storageOverrideReason">${escapeHtml(t("storageOverrideReason"))}</label>
            <textarea id="storageOverrideReason" name="storageOverrideReason">${escapeHtml(store.settings?.storageOverrideReason || "")}</textarea>
          </div>
          <div class="field">
            <label for="storageSettingsReason">${escapeHtml(t("reason"))}</label>
            <textarea id="storageSettingsReason" name="reason" required placeholder="${escapeHtml(t("storageReasonPlaceholder"))}"></textarea>
          </div>
          <div class="form-footer">
            <button class="btn" type="submit">${escapeHtml(t("saveStorageSettings"))}</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("backupSystem"))}</h2>
        </div>
        <form class="form" data-settings-backup>
          <div class="two-col">
            <div class="field">
              <label for="backupLocationHint">${escapeHtml(t("backupLocation"))}</label>
              <input id="backupLocationHint" name="backupLocationHint" value="${escapeHtml(store.settings?.backupLocationHint || "")}" placeholder="${escapeHtml(t("backupLocationPlaceholder"))}">
              ${backupLocationPickerMarkup()}
            </div>
            <div class="field">
              <label for="backupReminder">${escapeHtml(t("backupReminder"))}</label>
              <select id="backupReminder" name="backupReminder">${backupReminderOptions(store.settings?.backupReminder || "manual")}</select>
            </div>
          </div>
          <p class="notice">${escapeHtml(t("backupLocationWarning"))}</p>
          <label class="check-field">
            <input name="backupOverrideAcknowledged" type="checkbox" ${store.settings?.backupOverrideAcknowledged ? "checked" : ""}>
            <span>${escapeHtml(t("backupOverrideAcknowledged"))}</span>
          </label>
          <div class="field">
            <label for="backupOverrideReason">${escapeHtml(t("backupOverrideReason"))}</label>
            <textarea id="backupOverrideReason" name="backupOverrideReason">${escapeHtml(store.settings?.backupOverrideReason || "")}</textarea>
          </div>
          <div class="field">
            <label for="backupSettingsReason">${escapeHtml(t("reason"))}</label>
            <textarea id="backupSettingsReason" name="reason" required placeholder="${escapeHtml(t("backupReasonPlaceholder"))}"></textarea>
          </div>
          <div class="button-row">
            <button class="btn secondary" type="button" data-action="backup-storage">${escapeHtml(t("exportFullBackup"))}</button>
            <button class="btn secondary" type="button" data-action="restore-storage">${escapeHtml(t("restoreBackup"))}</button>
          </div>
          <div class="form-footer">
            <button class="btn" type="submit">${escapeHtml(t("saveBackupSettings"))}</button>
          </div>
        </form>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("recovery"))}</h2>
        </div>
        <div class="form">
          <p class="notice">${escapeHtml(t("recoveryControlsNotice"))}</p>
          <div class="button-row">
            <button class="btn secondary" data-action="export-current-raw-data">${escapeHtml(t("exportRawCurrentData"))}</button>
            <button class="btn danger" data-action="reset-local-data">${escapeHtml(t("resetLocalData"))}</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("approvalAirlock"))}</h2>
        </div>
        <div class="form">
          <p><span class="pill">${escapeHtml(t("lockedOn"))}</span> ${escapeHtml(t("approvalPolicyHuman"))}</p>
          <p><span class="pill">${escapeHtml(t("lockedOn"))}</span> ${escapeHtml(t("approvalPolicyAudit"))}</p>
          <p><span class="pill">${escapeHtml(t("lockedOn"))}</span> ${escapeHtml(t("approvalPolicyArms"))}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("localApiArmTransport"))}</h2>
        </div>
        <div class="form">
          <p class="notice">${escapeHtml(t("transportBoundaryNotice"))}</p>
          <div class="meta-grid">
            <div>
              <p class="meta-label">${escapeHtml(t("transportStatus"))}</p>
              <p>${escapeHtml(transport.running ? t("transportRunning") : t("transportStopped"))}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("transportAddress"))}</p>
              <p>${escapeHtml(transport.baseUrl || `127.0.0.1:${transport.configuredPort || 32145}`)}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("secureToken"))}</p>
              <p>${escapeHtml(transport.tokenConfigured ? t("configured") : t("notConfigured"))}</p>
            </div>
            <div>
              <p class="meta-label">${escapeHtml(t("secureStorage"))}</p>
              <p>${escapeHtml(transport.encryptionAvailable ? t("available") : t("unavailable"))}</p>
            </div>
          </div>
          ${transport.lastError ? `<p class="notice">${escapeHtml(t("transportLastError"))}: ${escapeDisplay(transport.lastError, DISPLAY_META_LIMIT)}</p>` : ""}
          <div class="button-row">
            ${transport.running
              ? `<button class="btn secondary" data-action="disable-arm-transport">${escapeHtml(t("disableTransport"))}</button>`
              : `<button class="btn" data-action="enable-arm-transport" ${transport.available && transport.encryptionAvailable ? "" : "disabled"}>${escapeHtml(t("enableTransport"))}</button>`}
            <button class="btn secondary" data-action="rotate-arm-transport-token" ${transport.available && transport.encryptionAvailable ? "" : "disabled"}>${escapeHtml(t("rotateTransportToken"))}</button>
            <button class="btn danger" data-action="revoke-arm-transport" ${transport.tokenConfigured ? "" : "disabled"}>${escapeHtml(t("revokeTransport"))}</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2 class="panel-title">${escapeHtml(t("integrityDashboard"))}</h2>
        </div>
        ${renderIntegrityDashboard(integrity, diagnostics)}
      </section>
    </section>
  `);
  app.querySelectorAll("form").forEach(applyInputLimits);
  app.querySelectorAll("form").forEach(wireLocalFilePickers);
}

function renderRoleDefinitions() {
  return ACTOR_ROLES
    .map((role) => {
      const definition = ROLE_DEFINITIONS[role];
      if (!definition) return "";
      return `
        <article class="item role-definition">
          <div class="role-definition-head">
            <h3 class="item-title">${escapeHtml(actorRoleLabel(role))}</h3>
            <span class="pill">${escapeHtml(role)}</span>
          </div>
          <p class="item-body">${escapeDisplay(definition.purpose, DISPLAY_META_LIMIT)}</p>
          ${renderDefinitionList(t("permissions"), definition.permissions)}
          ${renderDefinitionList(t("restrictions"), definition.restrictions)}
          ${definition.rule ? `<p class="notice">${escapeDisplay(definition.rule, DISPLAY_META_LIMIT)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderPermissionMatrix() {
  const columnLabels = {
    create: t("createPermission"),
    edit: t("editPermission"),
    approve: t("approvePermission"),
    audit: t("auditPermission"),
    admin: t("adminPermission")
  };
  return `
    <div class="matrix-wrap">
      <table class="permission-matrix">
        <thead>
          <tr>
            <th>${escapeHtml(t("role"))}</th>
            ${ROLE_PERMISSION_COLUMNS.map((column) => `<th>${escapeHtml(columnLabels[column])}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${ACTOR_ROLES.map((role) => `
            <tr>
              <th>${escapeHtml(actorRoleLabel(role))}</th>
              ${ROLE_PERMISSION_COLUMNS.map((column) => {
                const allowed = Boolean(ROLE_PERMISSION_MATRIX[role]?.[column]);
                return `<td class="${allowed ? "matrix-yes" : "matrix-no"}">${escapeHtml(allowed ? t("yes") : t("no"))}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMandatoryHistoryPolicy() {
  const labels = {
    actor: t("historyFieldActor"),
    timestamp: t("historyFieldTimestamp"),
    reason: t("historyFieldReason"),
    changedObject: t("historyFieldObject"),
    howChanged: t("historyFieldHow"),
    language: t("historyFieldLanguage")
  };
  return `
    <div class="history-policy-list">
      ${MANDATORY_HISTORY_FIELDS.map((field) => `<span class="pill">${escapeHtml(labels[field] || field)}</span>`).join("")}
    </div>
  `;
}

function renderDefinitionList(label, items = []) {
  if (!items.length) return "";
  return `
    <div class="definition-list">
      <p class="meta-label">${escapeHtml(label)}</p>
      <ul>
        ${items.map((item) => `<li>${escapeDisplay(item, DISPLAY_META_LIMIT)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderActorSettingsItem(actor) {
  const isPrimary = store.settings?.primaryActorId === actor.id;
  return `
    <form class="item actor-settings-item" data-settings-actor data-actor-id="${escapeHtml(actor.id)}">
      <div class="two-col">
        <div class="field">
          <label for="actorName-${escapeHtml(actor.id)}">${escapeHtml(t("actorName"))}</label>
          <input id="actorName-${escapeHtml(actor.id)}" name="actorName" value="${escapeHtml(actor.name || "")}" required>
        </div>
        <div class="field">
          <label for="actorRole-${escapeHtml(actor.id)}">${escapeHtml(t("role"))}</label>
          <select id="actorRole-${escapeHtml(actor.id)}" name="role">${actorRoleOptions(actor.role)}</select>
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="actorStatus-${escapeHtml(actor.id)}">${escapeHtml(t("status"))}</label>
          <select id="actorStatus-${escapeHtml(actor.id)}" name="status">${actorStatusOptions(actor.status)}</select>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("actorId"))}</p>
          <p class="item-meta">${escapeHtml(actor.id)}</p>
          ${isPrimary ? `<span class="pill">${escapeHtml(t("defaultActorPill"))}</span>` : ""}
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="actorEmail-${escapeHtml(actor.id)}">${escapeHtml(t("emailAddress"))}</label>
          <input id="actorEmail-${escapeHtml(actor.id)}" name="emailAddress" type="email" value="${escapeHtml(actor.emailAddress || "")}">
        </div>
        <div class="field">
          <label for="actorChat-${escapeHtml(actor.id)}">${escapeHtml(t("chatHandle"))}</label>
          <input id="actorChat-${escapeHtml(actor.id)}" name="chatHandle" value="${escapeHtml(actor.chatHandle || "")}">
        </div>
      </div>
      <div class="field">
        <label for="actorReason-${escapeHtml(actor.id)}">${escapeHtml(t("reason"))}</label>
        <textarea id="actorReason-${escapeHtml(actor.id)}" name="reason" required placeholder="${escapeHtml(t("actorReasonPlaceholder"))}"></textarea>
      </div>
      <div class="form-footer">
        <button class="btn secondary" type="submit">${escapeHtml(t("saveActor"))}</button>
      </div>
    </form>
  `;
}

function actorSelectOptions(selectedActorId = "") {
  const activeActors = store.actors.filter((actor) => normalizeActorStatus(actor.status) === "active");
  const actors = activeActors.length ? activeActors : store.actors;
  return actors
    .map((actor) => `<option value="${actor.id}" ${selectedActorId === actor.id ? "selected" : ""}>${escapeHtml(actor.name)} (${escapeHtml(actorRoleLabel(actor.role, actor.type))})</option>`)
    .join("");
}

function assignmentRoleLabel(role = "watcher") {
  const labels = {
    owner: t("assignmentOwner"),
    reviewer: t("assignmentReviewer"),
    approver: t("assignmentApprover"),
    watcher: t("assignmentWatcher")
  };
  return labels[normalizeAssignmentRole(role)] || t("assignmentWatcher");
}

function assignmentRoleOptions(selected = "watcher") {
  const safeSelected = normalizeAssignmentRole(selected);
  return ASSIGNMENT_ROLES.map((role) => `<option value="${role}" ${role === safeSelected ? "selected" : ""}>${escapeHtml(assignmentRoleLabel(role))}</option>`).join("");
}

function reviewStateLabel(state = "needs_review") {
  const labels = {
    draft: t("draft"),
    needs_review: t("needsReview"),
    revision_requested: t("revisionRequested"),
    ready_for_approval: t("readyForApproval"),
    approved: t("approved"),
    rejected: t("rejected"),
    archived: t("archived")
  };
  return labels[normalizeReviewState(state)] || t("needsReview");
}

function reviewStateOptions(selected = "needs_review") {
  const safeSelected = normalizeReviewState(selected);
  return COLLAB_REVIEW_STATES.map((state) => `<option value="${state}" ${state === safeSelected ? "selected" : ""}>${escapeHtml(reviewStateLabel(state))}</option>`).join("");
}

function renderAssignmentsSummary(object = {}) {
  const assignments = (object.assignments || []).filter((assignment) => assignment.status !== "archived");
  if (!assignments.length) return "";
  const text = assignments.map((assignment) => `${actorDisplay(assignment.actorId)}: ${assignmentRoleLabel(assignment.role)}`).join(", ");
  return `<p class="item-meta">${escapeHtml(t("assignments"))}: ${escapeDisplay(text, DISPLAY_META_LIMIT)}</p>`;
}

function renderCommentsSummary(object = {}) {
  const count = (object.comments || []).length;
  if (!count) return "";
  return `<p class="item-meta">${escapeHtml(t("comments"))}: ${escapeHtml(String(count))}</p>`;
}

function renderProjectRoles(project) {
  const roles = (project.projectRoles || []).filter((role) => role.status !== "archived");
  if (!roles.length) return emptyText(t("noActorsRecorded"));
  return `<div class="list">${roles.map((role) => `
    <div class="item">
      <p class="item-title">${escapeHtml(actorDisplay(role.actorId))}</p>
      <p class="item-meta">${escapeHtml(t("projectRole"))}: ${escapeHtml(actorRoleLabel(role.role))} · ${escapeHtml(t("created"))}: ${escapeHtml(formatDate(role.assignedAt))}</p>
      ${role.reason ? `<p class="item-body">${escapeDisplay(role.reason, DISPLAY_META_LIMIT)}</p>` : ""}
    </div>
  `).join("")}</div>`;
}

function linkedActorCheckboxes(selectedActorIds = []) {
  const selected = new Set(normalizeLinkedActorIds(selectedActorIds));
  const actors = store.actors.filter((actor) => normalizeActorStatus(actor.status) === "active");
  if (!actors.length) return emptyText(t("noActorsRecorded"));
  return `
    <div class="check-list">
      ${actors.map((actor) => `
        <label class="check-field">
          <input name="linkedActorIds" type="checkbox" value="${escapeHtml(actor.id)}" ${selected.has(actor.id) ? "checked" : ""}>
          <span>${escapeHtml(actorContactLabel(actor))}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function selectedLinkedActorIds(form) {
  return [...form.querySelectorAll('[name="linkedActorIds"]:checked')]
    .map((field) => field.value)
    .filter((actorId) => getActor(actorId));
}

function actorContactLabel(actor) {
  const details = [actor.emailAddress, actor.chatHandle].map((value) => String(value || "").trim()).filter(Boolean);
  return details.length ? `${actor.name} (${details.join(" / ")})` : actor.name;
}

function linkedActorNames(actorIds = []) {
  return normalizeLinkedActorIds(actorIds)
    .map((actorId) => getActor(actorId))
    .filter(Boolean)
    .map(actorContactLabel);
}

function renderLinkedUsers(actorIds = []) {
  const names = linkedActorNames(actorIds);
  if (!names.length) return "";
  return `<p class="item-meta">${escapeHtml(t("linkedUsers"))}: ${escapeDisplay(names.join(", "), DISPLAY_META_LIMIT)}</p>`;
}

function settingsDiagnostics() {
  const activeProjects = store.projects.filter((project) => !project.archived);
  const archivedProjects = store.projects.filter((project) => project.archived);
  const changes = store.projects.reduce((count, project) => count + project.changes.length, 0);
  const sources = store.projects.reduce((count, project) => count + project.sources.length, 0);
  const extracts = store.projects.reduce((count, project) => count + project.sources.reduce((inner, source) => inner + source.extracts.length, 0), 0);
  const images = store.projects.reduce((count, project) => count + countProjectImages(project), 0);
  const info = storageSizeInfo();
  const manifest = storageSpineMeta || buildStorageSpineManifest(store, storageSnapshotText || JSON.stringify(store));
  return {
    [t("schemaVersion")]: store.schemaVersion || t("notRecorded"),
    [t("platformAdapterLabel")]: platformAdapter.label,
    [t("storageModeLabel")]: storageMode || t("notRecorded"),
    [t("storageSpineVersion")]: manifest.spineVersion || t("notRecorded"),
    [t("storageLayout")]: manifest.layoutVersion || t("notRecorded"),
    [t("storageSizeLabel")]: info.label,
    [t("storageSnapshotBytes")]: String(manifest.snapshotBytes || 0),
    [t("activeProjectsLabel")]: String(activeProjects.length),
    [t("archivedProjectsLabel")]: String(archivedProjects.length),
    [t("actorsLabel")]: String(store.actors.length),
    [t("changesLabel")]: String(changes),
    [t("sourcesLabel")]: String(sources),
    [t("extractsLabel")]: String(extracts),
    [t("imagesLabel")]: String(images),
    [t("attachmentRecords")]: String(manifest.largeContent?.attachments || 0),
    [t("extractTextCharacters")]: String(manifest.largeContent?.extractTextCharacters || 0),
    [t("lastSettingsUpdate")]: store.settings?.settingsUpdatedAt ? formatDate(store.settings.settingsUpdatedAt) : t("notRecorded"),
    [t("lastBackupExport")]: store.settings?.lastBackupExportedAt ? formatDate(store.settings.lastBackupExportedAt) : t("notRecorded"),
    [t("lastRestore")]: store.settings?.lastRestoreAt ? formatDate(store.settings.lastRestoreAt) : t("notRecorded")
  };
}

function buildIntegrityDashboard(diagnostics = settingsDiagnostics(), info = storageSizeInfo()) {
  const manifest = storageSpineMeta || buildStorageSpineManifest(store, storageSnapshotText || JSON.stringify(store));
  const groups = {
    storageHealth: integrityStorageIssues(manifest, info),
    orphanLinks: [],
    sourceFileReferences: [],
    linkedUserIssues: [],
    oversizedContent: integrityLargeContentIssues(manifest),
    recoverySignals: loadFailure ? [integrityIssue("recovery", "needs_attention", loadFailure.message || t("savedDataNeedsRecovery"))] : []
  };

  for (const project of store.projects || []) {
    scanProjectIntegrity(project, groups);
  }

  if (!groups.recoverySignals.length) {
    groups.recoverySignals.push(integrityIssue("recovery", "ok", t("recoveryModeNotActive")));
  }

  const allIssues = Object.values(groups).flat();
  const status = allIssues.some((issue) => issue.level === "needs_attention")
    ? "needs_attention"
    : allIssues.some((issue) => issue.level === "warning")
      ? "warning"
      : "healthy";

  return {
    status,
    generatedAt: nowIso(),
    manifest,
    diagnostics,
    groups
  };
}

function integrityStorageIssues(manifest, info) {
  const issues = [];
  if (!desktopRuntimeReady()) issues.push(integrityIssue("storage", "warning", t("browserRuntimeWarning")));
  if (info.level === "danger") issues.push(integrityIssue("storage", "needs_attention", t("storageWarningStorageSizeDanger")));
  else if (info.level === "warning") issues.push(integrityIssue("storage", "warning", t("storageWarningStorageSizeWarning")));

  for (const warning of manifest.warnings || []) {
    const key = storageWarningKey(warning);
    const level = warning === "storage-size-danger" ? "needs_attention" : "warning";
    if (!issues.some((issue) => issue.message === t(key))) issues.push(integrityIssue("storage", level, t(key)));
  }
  return issues;
}

function storageWarningKey(warning = "") {
  const keys = {
    "storage-size-danger": "storageWarningStorageSizeDanger",
    "storage-size-warning": "storageWarningStorageSizeWarning",
    "attachments-dominate-main-record": "storageWarningAttachmentsDominateMainRecord",
    "extracts-growing-in-main-record": "storageWarningExtractsGrowingInMainRecord"
  };
  return keys[warning] || "storageWarningStorageSizeWarning";
}

function integrityLargeContentIssues(manifest) {
  const issues = [];
  const large = manifest.largeContent || {};
  if ((large.largestExtractCharacters || 0) > 250000) {
    issues.push(integrityIssue("large-content", "warning", `${t("largeExtractWarning")} ${large.largestExtractCharacters} ${t("extractTextCharacters")}.`));
  }
  if ((large.largestAttachmentCharacters || 0) > 1024 * 1024) {
    issues.push(integrityIssue("large-content", "warning", `${t("largeAttachmentWarning")} ${formatBytes(large.largestAttachmentCharacters)}.`));
  }
  return issues;
}

function scanProjectIntegrity(project, groups) {
  for (const decision of project.decisions || []) {
    if (decision.relatedDecisionId && !decisionById(project, decision.relatedDecisionId)) {
      groups.orphanLinks.push(integrityIssue("decision-relation", "needs_attention", t("missingDecision"), project, "Decision", decision));
    }
  }
  for (const source of project.sources || []) {
    if (!source.location && !source.summary && !source.localFile?.name) {
      groups.sourceFileReferences.push(integrityIssue("source-reference", "warning", t("missingSourceDetails"), project, "Source", source));
    }
    if (source.fileVerification && ["missing", "changed", "unverifiable"].includes(source.fileVerification.status)) {
      const level = source.fileVerification.status === "missing" ? "needs_attention" : "warning";
      groups.sourceFileReferences.push(integrityIssue("source-file-verification", level, sourceFileVerificationMessage(source.fileVerification), project, "Source", source));
    }
    const freshness = sourceStalenessState(source);
    if (["stale", "review_due"].includes(freshness)) {
      groups.sourceFileReferences.push(integrityIssue("source-staleness", freshness === "stale" ? "needs_attention" : "warning", `${t("staleSourceWarning")} ${sourceStalenessLabel(freshness)}`, project, "Source", source));
    }
    for (const actorId of source.linkedActorIds || []) {
      if (!getActor(actorId)) {
        groups.linkedUserIssues.push(integrityIssue("linked-user", "needs_attention", `${t("missingLinkedUser")} ${actorId}`, project, "Source", source));
      }
    }
  }

  for (const relationship of project.relationships || []) {
    if (relationship.targetProjectId && !getProject(relationship.targetProjectId)) {
      groups.orphanLinks.push(integrityIssue("relationship", "needs_attention", t("missingRelationshipTarget"), project, "Relationship", relationship));
    }
  }

  for (const item of projectIntegrityObjects(project)) {
    scanSourceLinks(project, item, groups);
    scanImageLinks(project, item, groups);
  }
}

function projectIntegrityObjects(project) {
  const items = [{ objectType: "Project", object: project }];
  const addList = (objectType, list = []) => {
    for (const object of list || []) items.push({ objectType, object });
  };
  addList("Decision", project.decisions);
  addList("Fact", project.facts);
  addList("Conflict", project.conflicts);
  addList("Relationship", project.relationships);
  addList("OpenQuestion", project.openQuestions);
  addList("NextAction", project.nextActions);
  addList("DraftProject", project.draftProjects);
  addList("Change", project.changes);
  addList("Source", project.sources);
  for (const source of project.sources || []) addList("Extract", source.extracts);
  return items;
}

function scanSourceLinks(project, item, groups) {
  const links = Array.isArray(item.object.sourceLinks) ? item.object.sourceLinks : [];
  for (const link of links) {
    const sourceProject = getProject(link.sourceProjectId || project.id);
    const source = sourceProject?.sources?.find((candidate) => candidate.id === link.sourceId);
    if (!source) {
      groups.orphanLinks.push(integrityIssue("source-link", "needs_attention", t("missingAttachedSource"), project, item.objectType, item.object));
      continue;
    }
    if (link.extractId && !source.extracts?.some((extract) => extract.id === link.extractId)) {
      groups.orphanLinks.push(integrityIssue("extract-link", "needs_attention", t("missingAttachedExtract"), project, item.objectType, item.object));
    }
  }
}

function scanImageLinks(project, item, groups) {
  const images = Array.isArray(item.object.imageLinks) ? item.object.imageLinks : [];
  for (const image of images) {
    if (!image.dataUrl && !image.localPath && !image.localReference) {
      groups.orphanLinks.push(integrityIssue("image-reference", "needs_attention", t("missingImageReference"), project, item.objectType, item.object));
    }
    const target = getProjectObject(project, image.attachedToType || item.objectType, image.attachedToId || item.object.id);
    if (!target) {
      groups.orphanLinks.push(integrityIssue("image-target", "needs_attention", t("missingImageTarget"), project, item.objectType, item.object));
    }
  }
}

function integrityIssue(type, level, message, project = null, objectType = "", object = null) {
  return {
    type,
    level,
    message,
    projectId: project?.id || "",
    projectName: project?.name || "",
    objectType,
    objectId: object?.id || "",
    objectTitle: object && objectType ? objectLabel(objectType, object) : ""
  };
}

function renderIntegrityDashboard(integrity, diagnostics) {
  return `
    <div class="form integrity-dashboard">
      <div class="meta-grid settings-diagnostics">
        <div>
          <p class="meta-label">${escapeHtml(t("integrityStatus"))}</p>
          <p><span class="pill integrity-${escapeHtml(integrity.status)}">${escapeHtml(integrityStatusLabel(integrity.status))}</span></p>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("checkGenerated"))}</p>
          <p>${escapeHtml(formatDate(integrity.generatedAt))}</p>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("storageLayout"))}</p>
          <p>${escapeHtml(integrity.manifest.layoutVersion || t("notRecorded"))}</p>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("storageSizeLabel"))}</p>
          <p>${escapeHtml(diagnostics[t("storageSizeLabel")] || t("notRecorded"))}</p>
        </div>
      </div>
      <p class="notice">${escapeHtml(t("sourceFileVerificationNotice"))}</p>
      <div class="button-row">
        <button class="btn secondary" data-action="verify-all-source-files">${escapeHtml(t("verifySourceFiles"))}</button>
      </div>
      ${renderIntegrityGroup(t("storageHealth"), integrity.groups.storageHealth, t("noStorageWarnings"))}
      ${renderIntegrityGroup(t("orphanLinks"), integrity.groups.orphanLinks, t("noBrokenLinks"))}
      ${renderIntegrityGroup(t("sourceFileReferences"), integrity.groups.sourceFileReferences, t("noSourceReferenceIssues"))}
      ${renderIntegrityGroup(t("linkedUserIssues"), integrity.groups.linkedUserIssues, t("noLinkedUserIssues"))}
      ${renderIntegrityGroup(t("oversizedContent"), integrity.groups.oversizedContent, t("noOversizedContent"))}
      ${renderIntegrityGroup(t("recoverySignals"), integrity.groups.recoverySignals, t("noRecoverySignals"))}
      <details class="diagnostic-details">
        <summary>${escapeHtml(t("objectCounts"))}</summary>
        <div class="meta-grid settings-diagnostics">
          ${Object.entries(diagnostics).map(([label, value]) => `
            <div>
              <p class="meta-label">${escapeHtml(label)}</p>
              <p>${escapeHtml(value)}</p>
            </div>
          `).join("")}
        </div>
      </details>
    </div>
  `;
}

function integrityStatusLabel(status) {
  if (status === "needs_attention") return t("needsAttention");
  if (status === "warning") return t("warning");
  return t("healthy");
}

function renderIntegrityGroup(title, issues, emptyMessage) {
  const visible = (issues || []).filter((issue) => issue.level !== "ok");
  return `
    <section class="integrity-group">
      <h3 class="item-title">${escapeHtml(title)}</h3>
      ${visible.length ? `<div class="list">${visible.map(renderIntegrityIssue).join("")}</div>` : emptyText(emptyMessage)}
    </section>
  `;
}

function renderIntegrityIssue(issue) {
  const title = issue.objectTitle || issue.projectName || issue.type;
  const context = [
    issue.projectName ? `${t("project")}: ${issue.projectName}` : "",
    issue.objectType ? `${issue.objectType}${issue.objectId ? ` [id: ${issue.objectId}]` : ""}` : ""
  ].filter(Boolean).join(" · ");
  return `
    <div class="item integrity-issue">
      <p class="item-title"><span class="pill integrity-${escapeHtml(issue.level)}">${escapeHtml(integrityStatusLabel(issue.level))}</span> ${escapeDisplay(title, DISPLAY_META_LIMIT)}</p>
      <p class="item-body">${escapeDisplay(issue.message, DISPLAY_META_LIMIT)}</p>
      ${context ? `<p class="item-meta">${escapeDisplay(context, DISPLAY_META_LIMIT)}</p>` : ""}
    </div>
  `;
}

function countProjectImages(project) {
  let count = Array.isArray(project.imageLinks) ? project.imageLinks.length : 0;
  const objectLists = [project.decisions, project.facts, project.conflicts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes];
  for (const list of objectLists) count += list.reduce((inner, item) => inner + (Array.isArray(item.imageLinks) ? item.imageLinks.length : 0), 0);
  for (const source of project.sources) {
    count += Array.isArray(source.imageLinks) ? source.imageLinks.length : 0;
    count += source.extracts.reduce((inner, extract) => inner + (Array.isArray(extract.imageLinks) ? extract.imageLinks.length : 0), 0);
  }
  return count;
}

function listFullProjectImages(project) {
  const images = [];
  for (const { objectType, object } of projectIntegrityObjects(project)) {
    for (const image of object.imageLinks || []) {
      images.push({
        ...image,
        projectId: image.projectId || project.id,
        attachedToType: image.attachedToType || objectType,
        attachedToId: image.attachedToId || object.id
      });
    }
  }
  return images;
}

function archivedProjectCount() {
  return store.projects.filter((project) => project.archived).length;
}

function archivedDeletionSummary(project = {}) {
  const sourceCount = (project.sources || []).length;
  const historyCount = (project.changes || []).length;
  const imageCount = countProjectImages(project);
  const intakeRecordCount = (store.intakeItems || []).filter((item) => item.projectId === project.id).length;
  return {
    projectId: project.id || "",
    projectName: project.name || "",
    archivedAt: project.archivedAt || "",
    deletionStatus: project.deletionStatus || "",
    sourceCount,
    historyCount,
    imageCount,
    intakeRecordCount
  };
}

function appendArchivedDeletionAudit(projects = [], actor, reason = "") {
  store.settings = normalizeSettings(store.settings || {});
  const timestamp = nowIso();
  const entries = projects.map((project) => ({
    id: uid("archived_delete"),
    deletedAt: timestamp,
    deletedBy: actor?.id || "",
    deletedByName: actor?.name || "",
    reason: String(reason || "").trim(),
    summary: archivedDeletionSummary(project)
  }));
  store.settings.archivedDeletionLog = [
    ...entries,
    ...(store.settings.archivedDeletionLog || [])
  ].slice(0, 500);
  stampSettingsUpdate(actor?.id || store.settings.primaryActorId, reason);
  return entries;
}

function renderProjectCard(project) {
  return `
    <div class="project-card">
      <button class="card-open" data-action="open-project" data-project-id="${project.id}">
        <h2>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h2>
        <p>${escapeDisplay(project.currentStatus || t("noCurrentStatusRecorded"))}</p>
        ${renderAttachedSources(project)}
      </button>
      <div>
        <span class="pill health-${escapeHtml(project.healthFlag || "active")}">${escapeHtml(healthFlagLabel(project.healthFlag))}</span>
        <span class="pill">${escapeHtml(t("updated"))} ${escapeHtml(formatDate(project.updatedAt))}</span>
        ${project.archived ? `<span class="pill">${escapeHtml(t("archived"))}</span>` : ""}
        ${project.deletionStatus ? `<span class="pill">${escapeHtml(project.deletionStatus)}</span>` : ""}
      </div>
      ${renderObjectActions("Project", project.id, project.archived)}
      <div class="item-actions">
        ${project.archived ? `<button class="btn secondary compact" data-action="unarchive-project" data-project-id="${project.id}">${escapeHtml(t("unarchiveProject"))}</button>` : ""}
        ${project.archived
          ? `<button class="btn danger compact" data-action="delete-archived-project" data-project-id="${project.id}">Delete archived</button>`
          : `<button class="btn secondary compact" data-action="delete-project" data-project-id="${project.id}" ${project.deletionStatus ? "disabled" : ""}>${escapeHtml(t("deleteProject"))}</button>`}
      </div>
    </div>
  `;
}

function pendingIntakeCount() {
  return visibleIntakeItems(store.intakeItems || []).filter((item) => item.status === "pending" && !item.archived).length;
}

function isDiscoveryStagingIntake(item = {}) {
  if (item.evidence?.apiFolderDiscovery) return true;
  return isRawFileUploadStagingIntake(item);
}

function isRawFileUploadStagingIntake(item = {}) {
  const evidence = item.evidence || {};
  const managedFile = evidence.managedFile || {};
  const proposed = item.proposedChange || {};
  const managedPath = String(managedFile.managedPath || "");
  const fileName = String(evidence.fileName || managedFile.fileName || "");
  const title = String(item.title || "");
  const proposedText = String(proposed.text || "");
  const summary = String(proposed.summary || "");
  return item.armType === "file"
    && item.proposedObjectType === "Source"
    && Boolean(evidence.managedFile)
    && managedPath.startsWith("sources/intake_")
    && (!fileName || title === fileName)
    && (!fileName || proposedText === fileName)
    && /^Uploaded .+ source file \(\d+ bytes\) awaiting human review\.$/.test(summary);
}

function visibleIntakeItems(intakeItems = []) {
  return (intakeItems || []).filter((item) => !isDiscoveryStagingIntake(item));
}

function intakeItemsForAirlock(intakeItems = []) {
  return visibleIntakeItems(intakeItems).filter((item) => !item.archived);
}

function removeIntakeRecordsForDeletedArchives(projects = [], { includeAllArchivedIntake = false } = {}) {
  const projectIds = new Set(projects.map((project) => project.id).filter(Boolean));
  const removed = [];
  store.intakeItems = (store.intakeItems || []).filter((item) => {
    const tiedToDeletedProject = item.projectId && projectIds.has(item.projectId);
    const archivedIntake = includeAllArchivedIntake && item.archived;
    if (tiedToDeletedProject || archivedIntake) {
      removed.push(item);
      return false;
    }
    return true;
  });
  return removed;
}

function intakeQueueStateLabel(state = "new") {
  const labels = {
    new: t("queueNew"),
    needs_review: t("queueNeedsReview"),
    ready: t("queueReady"),
    blocked: t("queueBlocked")
  };
  return labels[state] || t("queueNew");
}

function intakeQueueStateClass(state = "new") {
  const classes = {
    new: "review-open",
    needs_review: "health-at_risk",
    ready: "review-done",
    blocked: "health-blocked"
  };
  return classes[state] || "review-open";
}

function intakeQueueStateRank(state = "new") {
  const ranks = { ready: 0, needs_review: 1, new: 2, blocked: 3 };
  return ranks[state] ?? 4;
}

function intakeQueueAgeLabel(createdAt) {
  const created = Date.parse(createdAt || "");
  if (!Number.isFinite(created)) return formatDate(createdAt);
  const days = Math.max(0, Math.floor((Date.now() - created) / 86400000));
  return `${days}d`;
}

function approvalQueueStats(intakeItems = []) {
  const visible = visibleIntakeItems(intakeItems);
  const active = visible.filter((item) => !item.archived);
  const pending = active.filter((item) => item.status === "pending");
  return {
    pending: pending.length,
    ready: pending.filter((item) => item.queueState === "ready").length,
    blocked: pending.filter((item) => item.queueState === "blocked").length,
    reviewed: visible.filter((item) => item.status !== "pending" && !item.archived).length,
    archived: visible.filter((item) => item.archived).length
  };
}

function renderApprovalQueueSummary(stats) {
  const cards = [
    [t("pendingReview"), stats.pending],
    [t("queueReady"), stats.ready],
    [t("queueBlocked"), stats.blocked],
    [t("reviewedIntake"), stats.reviewed],
    [t("archived"), stats.archived]
  ];
  return `
    <section class="meta-grid">
      ${cards.map(([label, value]) => `
        <div class="meta-card">
          <p class="meta-label">${escapeHtml(label)}</p>
          <p class="meta-value">${escapeHtml(String(value))}</p>
        </div>
      `).join("")}
    </section>
  `;
}

function managedFileIntakeItems() {
  return (store.intakeItems || []).filter((item) => item.evidence?.managedFile && !isDiscoveryStagingIntake(item));
}

function managedSourceFiles() {
  const files = [];
  for (const project of store.projects || []) {
    for (const source of project.sources || []) {
      if (!source.managedPath) continue;
      files.push({ project, source });
    }
  }
  return files.sort((a, b) => dateSortValue(b.source.dateAdded) - dateSortValue(a.source.dateAdded));
}

function discoveryProgressCases() {
  const largeProgressStatuses = new Set(["large_file_pending", "large_corpus_pending"]);
  const extractionCaseIds = new Set((discoveryWorkspace.extractions || [])
    .filter((extraction) => largeProgressStatuses.has(extraction.status))
    .map((extraction) => extraction.discoveryCaseId)
    .filter(Boolean));
  const activeStatuses = new Set(["created", "security_pending", "extracting", "questioning"]);
  const seen = new Set();
  return (discoveryWorkspace.cases || [])
    .filter((discoveryCase) => extractionCaseIds.has(discoveryCase.id))
    .filter((discoveryCase) => activeStatuses.has(discoveryCase.status || ""))
    .filter((discoveryCase) => !/^Project folder candidate:\s*Folder root$/i.test(String(discoveryCase.title || discoveryCase.suggestedName || "")))
    .sort((a, b) => dateSortValue(b.updatedAt || b.createdAt) - dateSortValue(a.updatedAt || a.createdAt))
    .filter((discoveryCase) => {
      const key = normalizeProjectMatchText(discoveryCase.suggestedName || discoveryCase.title || discoveryCase.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function renderDiscoveryProgressPanel() {
  const cases = discoveryProgressCases();
  if (!cases.length && !discoveryWorkspace.error) return "";
  return `
    <section class="panel">
      <div class="panel-head"><h2 class="panel-title">Discovery progress</h2></div>
      ${discoveryWorkspace.error ? `<p class="warning">${escapeHtml(discoveryWorkspace.error)}</p>` : ""}
      ${cases.length ? `<div class="list">${cases.map(renderDiscoveryCaseSummary).join("")}</div>` : emptyText("No long Discovery scans are running.")}
    </section>
  `;
}

function renderFilesLibrary() {
  const rememberedFolders = normalizeLastImportFolders(store.settings?.uiState?.lastImportFolders);
  const rememberedFolderText = Object.entries(rememberedFolders).map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(" · ");
  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("addIntake"))}</h1>
        <p class="view-subtitle">Add files or folders. Known project material can go straight into a project; unknown material goes through Discovery before Core approval.</p>
      </div>
    </section>
    ${fileImportFlowState.message || rememberedFolderText ? `<section class="panel">${fileImportFlowState.message ? `<p class="item-meta"><strong>File picker status:</strong> ${escapeDisplay(fileImportFlowState.message, DISPLAY_META_LIMIT)}${fileImportFlowState.updatedAt ? ` · ${escapeHtml(formatDate(fileImportFlowState.updatedAt))}` : ""}</p>` : ""}${rememberedFolderText ? `<p class="item-meta"><strong>Remembered folders:</strong> ${escapeDisplay(rememberedFolderText, 1200)}</p>` : ""}${pendingFileImportReviewSelection?.candidates?.length ? `<div class="item-actions"><button class="btn secondary compact" data-action="reopen-pending-file-import-review">${["project_files", "project_folder"].includes(pendingFileImportReviewSelection.importKind) ? "Open pending project file import" : "Open pending Discovery review"} (${pendingFileImportReviewSelection.candidates.length})</button></div>` : ""}</section>` : ""}
    <section class="dashboard-grid">
      <article class="panel strong">
        <div class="panel-head"><h2 class="panel-title">Known project material</h2></div>
        <p class="item-body">Use this when you already know the selected files or folder belong to one project.</p>
        <div class="item-actions">
          <button class="btn" type="button" data-action="import-project-folder">Add project folder</button>
          <button class="btn secondary" type="button" data-action="import-project-files">Add project files</button>
        </div>
      </article>
      <article class="panel strong">
        <div class="panel-head"><h2 class="panel-title">Discovery scan</h2></div>
        <p class="item-body">Use this when you want Project State to inspect material first and suggest project candidates before anything reaches Core.</p>
        <div class="item-actions">
          <button class="btn" type="button" data-action="import-folder">Scan unknown folder</button>
          <button class="btn secondary" type="button" data-action="import-files">Scan selected files</button>
        </div>
      </article>
    </section>
    <section class="panel strong">
      <div class="panel-head"><h2 class="panel-title">External security responsibility</h2></div>
      <p>Project State does not scan files for malware. Only add files you trust and have already checked using your own security tools.</p>
      <p class="item-meta">Project State copies selected files, records exact checksums, and blocks reads if staged bytes change.</p>
    </section>
    ${renderDiscoveryProgressPanel()}
    <p class="notice">${escapeHtml(t("originalFilePreserved"))} ${escapeHtml(t("recursiveFolderImport"))}</p>
  `);
}

function setFileImportFlowState(status, message, kind = fileImportFlowState.kind || "") {
  fileImportFlowState = { status, kind, message, updatedAt: nowIso() };
  const statusNode = document.querySelector("[data-file-import-status]");
  if (statusNode) statusNode.textContent = message;
}

function renderDiscoveryCaseSummary(discoveryCase) {
  const routing = discoveryCase.confirmedRouting || {};
  return `<article class="item"><p class="item-title">${escapeDisplay(discoveryCase.suggestedName || discoveryCase.title || "Discovery case", DISPLAY_META_LIMIT)}</p><p class="item-meta">${escapeHtml(discoveryCase.status || "created")} · ${escapeHtml(discoveryCase.stage || "stage")}${routing.destination ? ` · ${escapeHtml(routing.destination.replaceAll("_", " "))}` : ""}</p><details class="technical-details"><summary>Details and provenance</summary><p class="item-meta">Discovery Case: ${escapeDisplay(discoveryCase.id, DISPLAY_META_LIMIT)}</p>${discoveryCase.routingInteractionId ? `<p class="item-meta">Routing record: ${escapeDisplay(discoveryCase.routingInteractionId, DISPLAY_META_LIMIT)}</p>` : ""}${discoveryCase.promotedIntakeBatchId ? `<p class="item-meta">Intake batch: ${escapeDisplay(discoveryCase.promotedIntakeBatchId, DISPLAY_META_LIMIT)}</p>` : ""}</details></article>`;
}

async function refreshDiscoveryWorkspace() {
  if (!platformAdapter.discovery?.available || discoveryWorkspace.loading) return;
  discoveryWorkspace.loading = true;
  try {
    const state = await platformAdapter.discovery.readFoundationState({});
    discoveryWorkspace.cases = state.discoveryCases || [];
    discoveryWorkspace.extractions = state.extractions || [];
    discoveryWorkspace.error = "";
  } catch (error) {
    discoveryWorkspace.error = error.message || "Discovery could not be loaded.";
  } finally {
    discoveryWorkspace.loaded = true;
    discoveryWorkspace.loading = false;
  }
}

function renderPendingManagedFile(intake) {
  const managed = intake.evidence.managedFile;
  const original = intake.evidence.originalFile || {};
  return `
    <article class="item">
      <p class="item-title">${escapeDisplay(managed.fileName || intake.title, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("project"))}: ${escapeDisplay(projectNameById(intake.projectId) || t("missingProject"), DISPLAY_META_LIMIT)} · ${escapeHtml(t("status"))}: ${escapeHtml(intakeStatusLabel(intake))}</p>
      <p class="item-meta">${escapeHtml(t("managedCopy"))}: ${escapeDisplay(managed.managedPath, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(managed.size || 0))}</p>
      ${original.localPath ? `<p class="item-meta">${escapeHtml(t("originalLocation"))}: ${escapeDisplay(original.localPath, DISPLAY_META_LIMIT)}</p>` : ""}
      <div class="item-actions"><button class="btn secondary compact" data-action="show-intake">${escapeHtml(t("goToIntake"))}</button></div>
    </article>
  `;
}

function renderApprovedManagedFile({ project, source }) {
  const originalPath = source.localFile?.localPath || "";
  return `
    <article class="item">
      <p class="item-title">${escapeDisplay(source.localFile?.name || source.title, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("project"))}: ${escapeDisplay(project.name, DISPLAY_META_LIMIT)} · ${escapeHtml(t("status"))}: ${escapeHtml(source.status || "active")}</p>
      <p class="item-meta">${escapeHtml(t("managedCopy"))}: ${escapeDisplay(source.managedPath, DISPLAY_META_LIMIT)}${source.localFile?.size ? ` · ${escapeHtml(formatBytes(source.localFile.size))}` : ""}</p>
      ${originalPath ? `<p class="item-meta">${escapeHtml(t("originalLocation"))}: ${escapeDisplay(originalPath, DISPLAY_META_LIMIT)}</p>` : ""}
      <div class="item-actions">
        <button class="btn secondary compact" data-action="open-file-source" data-project-id="${escapeHtml(project.id)}" data-source-id="${escapeHtml(source.id)}">${escapeHtml(t("goToProject"))}</button>
        <button class="btn secondary compact" data-action="edit-file-source" data-project-id="${escapeHtml(project.id)}" data-source-id="${escapeHtml(source.id)}">${escapeHtml(t("edit"))}</button>
        ${source.status !== "archived" ? `<button class="btn secondary compact" data-action="archive-file-source" data-project-id="${escapeHtml(project.id)}" data-source-id="${escapeHtml(source.id)}">${escapeHtml(t("archive"))}</button>` : ""}
        <button class="btn secondary compact" data-action="history-file-source" data-project-id="${escapeHtml(project.id)}" data-source-id="${escapeHtml(source.id)}">${escapeHtml(t("viewHistory"))}</button>
      </div>
    </article>
  `;
}

async function beginFileImport(kind = "files") {
  const isFolderPicker = kind === "folder" || kind === "project_folder";
  const isKnownProjectImport = kind === "project_files" || kind === "project_folder";
  if (fileImportDialogInProgress) {
    setFileImportFlowState("busy", "File picker is already waiting for Windows to respond.", kind);
    if (activeRootView === "files") render();
    return;
  }
  if (!platformAdapter.dialogs?.available) {
    setFileImportFlowState("unavailable", "Windows file picker is unavailable in this runtime.", kind);
    if (activeRootView === "files") render();
    window.alert(t("fileImportFailed"));
    return;
  }
  fileImportDialogInProgress = true;
  setFileImportFlowState("opening", `Opening Windows ${isFolderPicker ? "folder" : "file"} picker…`, kind);
  if (activeRootView === "files") render();
  try {
    let paths = [];
    if (isFolderPicker) {
      setFileImportFlowState("native_dialog_requested", "Project State asked Windows to show the folder picker.", kind);
      const folder = await platformAdapter.dialogs.pickFolder({ title: isKnownProjectImport ? "Add Project Folder" : t("importFolder"), defaultPath: rememberedImportFolder(kind) });
      if (folder?.localPath) paths = [folder.localPath];
    } else {
      setFileImportFlowState("native_dialog_requested", "Project State asked Windows to show the file picker.", kind);
      const files = await platformAdapter.dialogs.pickFiles({ title: isKnownProjectImport ? "Add Files to Project" : t("importFiles"), defaultPath: rememberedImportFolder(kind) });
      paths = files.map((file) => file.localPath).filter(Boolean);
    }
    if (!paths.length) {
      setFileImportFlowState("cancelled", "Windows picker returned no selected files or folders.", kind);
      if (activeRootView === "files") render();
      return;
    }
    setFileImportFlowState("inspecting", `Windows picker returned ${paths.length} selected ${paths.length === 1 ? "path" : "paths"}. Inspecting supported files…`, kind);
    if (rememberImportFolder(kind, paths)) await saveStore({ allowWithoutCoreApproval: true, reason: "remember-import-folder" });
    if (activeRootView === "files") render();
    const selection = await platformAdapter.files.inspectImportSelection({ paths });
    if (!selection.candidates?.length) {
      setFileImportFlowState("no_supported_files", "No supported files were found in that selection.", kind);
      if (activeRootView === "files") render();
      window.alert(t("fileImportFailed"));
      return;
    }
    setFileImportFlowState("reviewing", `Found ${selection.candidates.length} supported ${selection.candidates.length === 1 ? "file" : "files"} for ${isKnownProjectImport ? "project import" : "Discovery review"}.`, kind);
    selection.importKind = kind;
    selection.rootPath = isFolderPicker ? paths[0] : "";
    pendingFileImportReviewSelection = selection;
    if (isKnownProjectImport) openProjectFileImportModal(selection);
    else openFileImportReviewModal(selection);
    if (!document.querySelector(".modal-backdrop")) {
      setFileImportFlowState("review_waiting", `Found ${selection.candidates.length} supported files. Use the pending ${isKnownProjectImport ? "project file import" : "Discovery review"} button to continue.`, kind);
      if (activeRootView === "files") render();
    }
  } catch (error) {
    console.error("Project State file import failed.", error);
    setFileImportFlowState("failed", error.message || t("fileImportFailed"), kind);
    if (activeRootView === "files") render();
    window.alert(error.message || t("fileImportFailed"));
  } finally {
    fileImportDialogInProgress = false;
  }
}

function folderRelativeGroup(localPath = "", rootPath = "") {
  const normalizedPath = String(localPath).replaceAll("\\", "/");
  const normalizedRoot = String(rootPath).replaceAll("\\", "/").replace(/\/$/, "");
  const relative = normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`) ? normalizedPath.slice(normalizedRoot.length + 1) : normalizedPath.split("/").pop();
  const parts = String(relative || "").split("/").filter(Boolean);
  return parts.length > 1 ? parts[0] : "Folder root";
}

function normalizeProjectMatchText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function existingProjectMatchForFolderName(folderName = "") {
  const normalized = normalizeProjectMatchText(folderName);
  if (!normalized || normalized === "folder root") return null;
  return (store?.projects || [])
    .filter((project) => !project.archived)
    .find((project) => normalizeProjectMatchText(project.name || "") === normalized) || null;
}

function folderGroupReviewLabel(folderGroup = "") {
  const label = folderGroup || "Folder root";
  if (normalizeProjectMatchText(label) === "folder root") return "Loose files in selected folder";
  return existingProjectMatchForFolderName(label)
    ? `Known project folder to check: ${label}`
    : `Project folder candidate: ${label}`;
}

function partitionDiscoveryCandidates(candidates = [], mode = "folder_groups", rootPath = "") {
  const grouped = new Map();
  const folderName = pathFolderName(rootPath) || "Selected folder";
  for (const candidate of candidates) {
    const folderGroup = folderRelativeGroup(candidate.localPath, rootPath);
    const label = mode === "one_project_folder"
      ? `Project folder: ${folderName}`
      : mode === "one_case"
        ? "Selected folder"
        : mode === "each_file"
          ? candidate.name || "Selected file"
          : folderGroupReviewLabel(folderGroup);
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(candidate);
  }
  const groups = [];
  for (const [label, files] of grouped.entries()) {
    const chunkSize = mode === "each_file" ? 1 : files.length || 1;
    for (let index = 0; index < files.length; index += chunkSize) {
      const chunk = files.slice(index, index + chunkSize);
      const part = chunkSize < files.length ? ` · part ${Math.floor(index / chunkSize) + 1}` : "";
      const folderReviewLane = mode === "folder_groups"
        ? /^Loose files in selected folder/i.test(label)
          ? "loose_files_discovery"
          : "subfolder_ai_followup"
        : mode === "each_file"
          ? "file_discovery"
          : "discovery_review";
      groups.push({ label: `${label}${part}`, candidates: mode === "one_project_folder" ? files : chunk, folderIntent: mode, folderReviewLane, folderRootPath: rootPath });
    }
  }
  return groups;
}

function pathFileName(localPath = "") {
  return String(localPath || "").replaceAll("\\", "/").split("/").filter(Boolean).pop() || "";
}

function pathParentFolder(localPath = "") {
  const text = String(localPath || "").trim();
  if (!text) return "";
  const normalized = text.replaceAll("\\", "/").replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "";
  return text.includes("\\") ? normalized.slice(0, index).replaceAll("/", "\\") : normalized.slice(0, index);
}

function pathFolderName(localPath = "") {
  const parts = String(localPath || "").replaceAll("\\", "/").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function importFolderMemoryKey(kind = "files") {
  if (kind === "backup") return "backup";
  if (kind === "folder") return "discovery_folder";
  if (kind === "project_files") return "project_files";
  if (kind === "project_folder") return "project_folder";
  return "discovery_files";
}

function rememberedImportFolder(kind = "files") {
  const folders = normalizeLastImportFolders(store.settings?.uiState?.lastImportFolders);
  return folders[importFolderMemoryKey(kind)] || "";
}

function rememberImportFolder(kind = "files", paths = []) {
  const selectedPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
  if (!selectedPaths.length) return "";
  const isFolderPicker = kind === "folder" || kind === "project_folder";
  const folder = isFolderPicker ? selectedPaths[0] : pathParentFolder(selectedPaths[0]);
  if (!folder) return "";
  store.settings = normalizeSettings(store.settings || {});
  const uiState = normalizeUiState(store.settings.uiState);
  uiState.lastImportFolders = {
    ...normalizeLastImportFolders(uiState.lastImportFolders),
    [importFolderMemoryKey(kind)]: folder
  };
  store.settings.uiState = uiState;
  return folder;
}

function fileExtension(fileName = "") {
  const match = String(fileName || "").toLowerCase().match(/\.([^.]+)$/);
  return match ? match[1] : "";
}

function titleFromFileName(fileName = "") {
  const name = pathFileName(fileName);
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || name || t("untitledSource");
}

function sourceTypeForProjectFile(file = {}) {
  if (file.fileType?.label) return file.fileType.label;
  if (file.evidenceKind?.label) return file.evidenceKind.label;
  const extension = fileExtension(file.name || file.localPath);
  if (["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "svg", "heic", "psd", "ai", "eps", "blend"].includes(extension)) return "Image / visual";
  if (["pdf", "docx", "doc", "rtf", "odt"].includes(extension)) return "Document / patent";
  if (["ipynb"].includes(extension)) return "Notebook / analysis";
  if (["py", "js", "ts", "jsx", "tsx", "html", "css", "scss", "cpp", "c", "h", "hpp", "cs", "java", "rs", "go", "sql", "sh", "ps1", "bat", "cmd", "lua", "r", "m", "jl"].includes(extension)) return "Code / tests";
  if (["uproject", "uplugin", "uasset", "umap", "ini"].includes(extension)) return "Unreal / visual project";
  if (["md", "txt"].includes(extension)) return "Notes";
  if (["json", "jsonl", "csv", "yaml", "yml", "toml", "xml", "xhtml", "log", "cfg", "conf"].includes(extension)) return "Data / config";
  if (["stl", "step", "stp", "iges", "igs", "dwg", "dxf", "fbx", "obj", "gltf", "glb"].includes(extension)) return "3D / CAD / model";
  if (["zip", "7z", "rar", "tar", "gz", "tgz", "bz2", "xz"].includes(extension)) return "Archive / package";
  return "Project file";
}

function readModeLabel(file = {}) {
  const mode = file.readMode || file.fileType?.readMode || "";
  if (mode === "text") return "readable";
  if (mode === "metadata_only") return "surface only";
  if (mode === "blocked") return "blocked";
  return "";
}

function projectFileImportCategorySummary(candidates = []) {
  const counts = new Map();
  for (const file of candidates) {
    const label = sourceTypeForProjectFile(file);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => `${label}: ${count}`).join(" · ") || "No selected files";
}

function openProjectFileImportModal(selection) {
  const isFolderImport = selection.importKind === "project_folder";
  const folderName = pathFolderName(selection.rootPath) || "New Project";
  const defaultProjectName = isFolderImport ? folderName : titleFromFileName(selection.candidates?.[0]?.name || "");
  const selectedSummary = projectFileImportCategorySummary(selection.candidates);
  const activeProjects = store.projects.filter((project) => !project.archived);
  showModal({
    title: isFolderImport ? "Add project folder" : "Add files to project",
    submitText: "Finish import",
    forceReplace: true,
    body: `
      <p class="notice">Use this when you already know these files belong under one project. Project State will copy the files into managed storage and add them as project Sources without creating separate Discovery project candidates.</p>
      <p class="notice">For unknown folders where you want Project State to discover what is inside first, use <strong>Scan folder for Discovery</strong> instead.</p>
      <div class="two-col">
        <div class="field">
          <label for="projectImportMode">Project</label>
          <select id="projectImportMode" name="projectImportMode">
            <option value="new">Create a new project</option>
            <option value="existing"${activeProjects.length ? "" : " disabled"}>Use an existing project</option>
          </select>
        </div>
        <div class="field" data-existing-project-import hidden>
          <label for="projectId">Existing project</label>
          <select id="projectId" name="projectId"><option value="">Choose project</option>${projectOptions()}</select>
        </div>
      </div>
      <div data-new-project-import>
        <div class="field"><label for="projectName">Project name</label><input id="projectName" name="projectName" value="${escapeHtml(defaultProjectName)}" required></div>
        <div class="field"><label for="currentStatus">${escapeHtml(t("currentStatus"))}</label><input id="currentStatus" name="currentStatus" value="Active · project materials imported" required></div>
        <div class="field"><label for="currentSummary">${escapeHtml(t("currentSummary"))}</label><textarea id="currentSummary" name="currentSummary" rows="3">${escapeHtml(isFolderImport ? `Project created from folder: ${folderName}. Imported files are listed below as Sources.` : `Project created from selected files. Imported files are listed below as Sources.`)}</textarea></div>
      </div>
      <div class="field">
        <label>${escapeHtml(t("selectedFiles"))} (${selection.candidates.length})</label>
        <p class="notice"><strong>Checked:</strong> Project State found the supported files below. Keep the right files selected, then finish the import.</p>
        <p class="item-meta">${escapeHtml(selectedSummary)}</p>
        <div class="list import-file-list">
          ${selection.candidates.map((file) => `
            <label class="check-field">
              <input type="checkbox" data-import-path="${escapeHtml(file.localPath)}" checked>
              <span><strong>${escapeDisplay(file.name, DISPLAY_META_LIMIT)}</strong><br>${escapeDisplay(file.localPath, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(file.size))} · ${escapeHtml(sourceTypeForProjectFile(file))}${readModeLabel(file) ? ` · ${escapeHtml(readModeLabel(file))}` : ""}</span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="trustLevel">${escapeHtml(t("sourceTrustLevel"))}</label>
          <select id="trustLevel" name="trustLevel">${sourceTrustOptions("unverified")}</select>
        </div>
        <div class="field">
          <label for="tags">${escapeHtml(t("tags"))}</label>
          <input id="tags" name="tags" value="project-folder-import">
        </div>
      </div>
      <div class="field">
        <label for="sourceSummary">Folder/file note for each Source</label>
        <textarea id="sourceSummary" name="sourceSummary" rows="3">${escapeHtml(isFolderImport ? `Imported from project folder: ${selection.rootPath}` : "Imported from known project file selection.")}</textarea>
      </div>
      ${confirmationField("externalSecurityAcknowledged", "I understand Project State does not scan files. I trust these files and accept responsibility for checking them with my own security tools.")}
      ${selection.skipped?.length ? `<p class="notice">${escapeHtml(t("unsupportedFilesSkipped"))}: ${selection.skipped.length}</p>` : ""}
    `,
    async onSubmit(data, form) {
      const selectedPaths = [...form.querySelectorAll("[data-import-path]:checked")].map((field) => field.dataset.importPath);
      const candidates = selection.candidates.filter((file) => selectedPaths.includes(file.localPath));
      if (!candidates.length) { window.alert("Select at least one file to add."); return false; }
      const actor = defaultUiActor();
      const useExisting = data.projectImportMode === "existing";
      let project = useExisting ? getProject(data.projectId) : null;
      if (useExisting && !project) { window.alert("Choose an existing project or create a new one."); return false; }
      if (!validateActorPermission(actor, "create", project)) return false;
      const reason = isFolderImport ? "Known project folder selected for import." : "Known project files selected for import.";
      const timestamp = nowIso();
      if (!project) {
        project = {
          id: uid("project"),
          name: String(data.projectName || defaultProjectName).trim(),
          currentStatus: String(data.currentStatus || "Active · project materials imported").trim(),
          currentSummary: String(data.currentSummary || "").trim(),
          healthFlag: "active",
          sourceImportReviewPending: false,
          sourceImportChecked: true,
          sourceImportCheckedAt: timestamp,
          sourceImportKind: selection.importKind,
          archived: false,
          deletionStatus: "",
          createdAt: timestamp,
          updatedAt: timestamp,
          updatedBy: actor.id,
          sourceLinks: [],
          imageLinks: [],
          decisions: [],
          facts: [],
          conflicts: [],
          sources: [],
          draftProjects: [],
          relationships: [],
          openQuestions: [],
          nextActions: [],
          changes: []
        };
        recordChange(project, actor, reason, "Project created from known file import", {
          objectType: "Project",
          objectId: project.id,
          objectText: project.name,
          fields: {
            status: project.currentStatus,
            summary: project.currentSummary,
            importedFiles: candidates.length,
            importKind: selection.importKind
          }
        });
        store.projects.unshift(project);
      }
      const filesToStage = candidates.map((candidate) => ({ intakeId: uid("intake"), localPath: candidate.localPath }));
      const stagedResult = await platformAdapter.files.stageManagedFiles({ files: filesToStage });
      if (stagedResult.errors?.length) {
        console.warn("Some project files could not be staged.", stagedResult.errors);
      }
      if (!stagedResult.staged?.length) {
        window.alert(stagedResult.errors?.[0]?.message || t("fileImportFailed"));
        return false;
      }
      const candidateByPath = new Map(candidates.map((candidate) => [String(candidate.localPath || ""), candidate]));
      const sharedTags = tagsFromText(data.tags || "project-folder-import");
      for (const staged of stagedResult.staged) {
        const candidate = candidateByPath.get(staged.originalPath) || { name: staged.fileName, localPath: staged.originalPath, size: staged.size };
        const source = {
          id: uid("source"),
          projectId: project.id,
          title: titleFromFileName(staged.fileName || candidate.name),
          sourceType: sourceTypeForProjectFile(candidate),
          trustLevel: normalizeSourceTrustLevel(data.trustLevel),
          lastReviewedAt: "",
          reviewDueAt: "",
          reviewedBy: "",
          dateAdded: timestamp,
          actorId: actor.id,
          location: staged.managedPath || staged.originalPath || staged.fileName,
          managedPath: staged.managedPath || "",
          checksum: staged.sha256 || "",
          localFile: {
            name: staged.fileName || candidate.name || pathFileName(staged.originalPath),
            type: staged.contentType || "",
            size: Number(staged.size || candidate.size || 0),
            lastModified: staged.lastModified || candidate.lastModified || "",
            localPath: staged.originalPath || candidate.localPath || "",
            fileType: candidate.fileType || null,
            readMode: candidate.readMode || candidate.fileType?.readMode || ""
          },
          fileVerification: {
            status: "verified",
            exists: true,
            checkedAt: timestamp,
            reason: "Checksum recorded during known project file import."
          },
          summary: String(data.sourceSummary || "").trim(),
          tags: sharedTags,
          linkedActorIds: [],
          extracts: [],
          status: "active"
        };
        project.sources.unshift(source);
        recordChange(project, actor, reason, "Source added from known project files", {
          objectType: "Source",
          objectId: source.id,
          objectText: source.title,
          fields: {
            project: project.name,
            type: source.sourceType,
            trustLevel: sourceTrustLabel(source.trustLevel),
            managedFile: source.localFile.name,
            managedPath: source.managedPath,
            checksum: source.checksum,
            originalLocation: source.localFile.localPath,
            importKind: selection.importKind
          }
        });
      }
      project.sourceImportReviewPending = false;
      project.sourceImportChecked = true;
      project.sourceImportCheckedAt = timestamp;
      project.sourceImportKind = selection.importKind;
      project.updatedAt = timestamp;
      project.updatedBy = actor.id;
      pendingFileImportReviewSelection = null;
      setFileImportFlowState("project_import_complete", `Added ${stagedResult.staged.length} ${stagedResult.staged.length === 1 ? "file" : "files"} to ${project.name}.`, selection.importKind || "");
      activeRootView = "projects";
      openProjectNow(project.id, "dashboard");
      saveStore();
      return true;
    }
  });
  const modal = document.querySelector(".modal");
  const modeField = modal?.querySelector("#projectImportMode");
  const syncProjectImportMode = () => {
    const useExisting = modeField?.value === "existing";
    modal?.querySelectorAll("[data-existing-project-import]").forEach((node) => { node.hidden = !useExisting; });
    modal?.querySelectorAll("[data-new-project-import]").forEach((node) => { node.hidden = useExisting; });
    const projectName = modal?.querySelector("[name='projectName']");
    const currentStatus = modal?.querySelector("[name='currentStatus']");
    if (projectName) projectName.required = !useExisting;
    if (currentStatus) currentStatus.required = !useExisting;
  };
  modeField?.addEventListener("change", syncProjectImportMode);
  syncProjectImportMode();
}

function openFileImportReviewModal(selection) {
  const isFolderImport = selection.importKind === "folder";
  const suggestedFolderGroups = isFolderImport ? partitionDiscoveryCandidates(selection.candidates, "folder_groups", selection.rootPath) : [];
  const updateImportReviewSelectionStatus = () => {
    const reviewModal = document.querySelector(".modal-backdrop");
    const selectedCount = reviewModal ? reviewModal.querySelectorAll("[data-import-path]:checked").length : selection.candidates.length;
    const groupingMode = isFolderImport ? reviewModal?.querySelector("#folderGroupingMode")?.selectedOptions?.[0]?.textContent || "folder groups" : "one Discovery case";
    setFileImportFlowState(
      "review_modal_open",
      `Discovery review open: ${selectedCount} of ${selection.candidates.length} files selected · ${groupingMode}.`,
      selection.importKind || ""
    );
  };
  showModal({
    title: "Add to Discovery",
    submitText: "Read and review",
    forceReplace: true,
    body: `
      <p class="notice">Project State does not scan files for malware. Only add files you trust and have already checked using your own security tools.</p>
      <p class="notice">You do not need to choose a project yet. Original files remain untouched.</p>
      <div class="field">
        <label>${escapeHtml(t("selectedFiles"))} (${selection.candidates.length})</label>
        <div class="list import-file-list">
          ${selection.candidates.map((file) => `
            <label class="check-field">
              <input type="checkbox" data-import-path="${escapeHtml(file.localPath)}" checked>
              <span><strong>${escapeDisplay(file.name, DISPLAY_META_LIMIT)}</strong><br>${escapeDisplay(file.localPath, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(file.size))} · ${escapeHtml(sourceTypeForProjectFile(file))}${readModeLabel(file) ? ` · ${escapeHtml(readModeLabel(file))}` : ""}${file.fileType?.routingHint ? `<br>${escapeDisplay(file.fileType.routingHint, DISPLAY_META_LIMIT)}` : ""}${isFolderImport ? `<br>${escapeDisplay(existingProjectMatchForFolderName(folderRelativeGroup(file.localPath, selection.rootPath)) ? "Known project folder to check" : "Folder candidate", DISPLAY_META_LIMIT)}: ${escapeDisplay(folderRelativeGroup(file.localPath, selection.rootPath), DISPLAY_META_LIMIT)}` : ""}</span>
            </label>
          `).join("")}
        </div>
      </div>
      ${isFolderImport ? `<div class="field"><label for="folderGroupingMode">How should this unknown folder be reviewed?</label><select id="folderGroupingMode" name="folderGroupingMode"><option value="folder_groups" selected>Use unknown-folder flow: subfolders to AI follow-up, loose files through Discovery (${suggestedFolderGroups.length})</option><option value="each_file">Emergency: review every file separately</option></select><p class="item-meta">Recommended for unknown folders: catalog every selected file. Subfolders are packaged for AI follow-up. Loose files continue through Discovery so known/checked files can move to Intake and large files can become AI Work Orders.</p></div>` : ""}
      <div class="field"><label for="privacyClass">Privacy</label><select id="privacyClass" name="privacyClass"><option value="local_only">Keep local only</option><option value="personal">Personal</option><option value="confidential">Confidential</option><option value="restricted">Restricted</option><option value="provider_allowed">Configured provider allowed later</option></select></div>
      ${confirmationField("externalSecurityAcknowledged", "I understand Project State does not scan files. I trust these files and accept responsibility for checking them with my own security tools.")}
      ${selection.skipped?.length ? `<p class="notice">${escapeHtml(t("unsupportedFilesSkipped"))}: ${selection.skipped.length}</p>` : ""}
    `,
    async onSubmit(data, form) {
      const selectedPaths = [...form.querySelectorAll("[data-import-path]:checked")].map((field) => field.dataset.importPath);
      const candidates = selection.candidates.filter((file) => selectedPaths.includes(file.localPath));
      if (!candidates.length) return false;
      const actor = defaultUiActor();
      const groupingMode = isFolderImport ? data.folderGroupingMode || "folder_groups" : "one_case";
      const candidateGroups = partitionDiscoveryCandidates(candidates, groupingMode, selection.rootPath);
      const reviewReason = isFolderImport
        ? groupingMode === "one_project_folder"
          ? "Selected folder staged as one Discovery evidence collection."
          : groupingMode === "each_file"
            ? "Selected folder staged for individual file Discovery review."
            : "Selected folder staged for grouped Discovery scan."
        : "Selected files staged for Discovery review.";
      const discoveryReviews = [];
      let aiFollowUpCount = 0;
      for (const candidateGroup of candidateGroups) {
        let discoveryCaseId = "";
        const stagedFiles = [];
        for (const candidate of candidateGroup.candidates) {
          const staged = await platformAdapter.discovery.stageTrustedFile({ path: candidate.localPath, discoveryCaseId: discoveryCaseId || undefined, caseTitle: candidateGroup.label, actorId: actor.id, privacyClass: data.privacyClass || "local_only", externalSecurityAcknowledged: data.externalSecurityAcknowledged === "on", reason: reviewReason });
          discoveryCaseId = staged.discoveryCaseId;
          stagedFiles.push({ ...staged, originalName: candidate.name });
        }
        const extractions = [];
        for (const staged of stagedFiles) {
          const result = await platformAdapter.discovery.extractFileVersion({ discoveryCaseId, fileVersionId: staged.fileVersionId, actorId: "project_state_deterministic" });
          let text = "";
          if (result.extraction?.textPath) {
            const readResult = await platformAdapter.discovery.readExtractionText({ extractionId: result.extraction.id });
            text = readResult.text || "";
          }
          extractions.push({ fileVersionId: staged.fileVersionId, originalName: staged.originalName, deduplicated: staged.deduplicated === true, status: result.extraction?.status || "failed", text, textBytes: result.extraction?.textBytes || 0, chunkCount: result.extraction?.chunkCount || 0, error: result.extraction?.error || null });
        }
        const analysis = await platformAdapter.discovery.analyzeCase({ discoveryCaseId, actorId: "project_state_deterministic" });
        if (candidateGroup.folderReviewLane === "subfolder_ai_followup") {
          const title = String(candidateGroup.label || "").replace(/^(?:Project folder candidate|Known project folder to check):\s*/i, "").trim() || "Subfolder follow-up";
          const routing = await platformAdapter.discovery.confirmRouting({
            discoveryCaseId,
            actorId: actor.id,
            routes: [{
              id: uid("subfolder_unit"),
              title,
              summary: `Cataloged ${stagedFiles.length} file${stagedFiles.length === 1 ? "" : "s"} from this subfolder for AI follow-up before project decisions.`,
              destination: "large_ai_work_order",
              proposedProjectName: "",
              reviewReason: "Subfolder moved to AI follow-up so its contents can be cataloged before project decisions.",
              fileVersionIds: stagedFiles.map((file) => file.fileVersionId).filter(Boolean),
              evidence: stagedFiles.map((file) => ({ fileVersionId: file.fileVersionId, fileName: file.originalName, role: "subfolder_catalog_source" }))
            }]
          });
          const confirmedRoutes = routing.routing.routes?.length ? routing.routing.routes : [routing.routing];
          await createDiscoveryAiWorkOrders({ discoveryCaseId, routes: confirmedRoutes, extractions, analysis, actor, groupLabel: candidateGroup.label, folderIntent: "subfolder_ai_followup", privacyClass: data.privacyClass || "local_only", reason: reviewReason });
          aiFollowUpCount += 1;
        } else {
          const reviewIntent = candidateGroup.folderReviewLane === "loose_files_discovery" ? "loose_files_discovery" : candidateGroup.folderIntent || groupingMode;
          discoveryReviews.push({ discoveryCaseId, analysis, extractions, actor, reason: reviewReason, groupLabel: candidateGroup.label, privacyClass: data.privacyClass || "local_only", folderIntent: reviewIntent, folderRootPath: candidateGroup.folderRootPath || selection.rootPath || "" });
        }
      }
      if (!discoveryReviews.length && !aiFollowUpCount) { window.alert(t("fileImportFailed")); return false; }
      pendingFileImportReviewSelection = null;
      setFileImportFlowState("review_started", aiFollowUpCount ? `Cataloged ${aiFollowUpCount} subfolder${aiFollowUpCount === 1 ? "" : "s"} to AI Work Orders${discoveryReviews.length ? " and opened loose-file Discovery review." : "."}` : "Discovery review opened.", selection.importKind || "");
      if (discoveryReviews.length) queuePostModalAction(() => openDiscoveryReviewSequence(discoveryReviews));
      else {
        activeRootView = "work-orders";
        queuePostModalAction(render);
      }
      return true;
    }
  });
  const reviewModal = document.querySelector(".modal-backdrop");
  if (reviewModal) {
    updateImportReviewSelectionStatus();
    reviewModal.addEventListener("change", (event) => {
      if (event.target.closest("[data-import-path], #folderGroupingMode, #privacyClass")) updateImportReviewSelectionStatus();
    });
  }
}

function openDiscoveryReviewSequence(reviews = [], index = 0) {
  const current = reviews[index];
  if (!current) return;
  openDiscoveryReviewModal({ ...current, sequencePosition: reviews.length > 1 ? { index: index + 1, total: reviews.length } : null, onConfirmed: () => openDiscoveryReviewSequence(reviews, index + 1) });
}

function discoveryDestinationOptions(selected = "proposed_new_project") {
  return [
    ["existing_project", "Existing project"],
    ["proposed_new_project", "Propose a new project"],
    ["general_reference", "General reference"],
    ["orphaned_idea", "Orphaned idea"],
    ["ai_work_order", "Create AI Work Order"],
    ["large_ai_work_order", "Create Large-file/folder AI Work Order"],
    ["unassigned", "Leave unassigned"],
    ["rejected", "Reject"]
  ].map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
}

function discoveryRouteCreatesAiWorkOrder(route = {}) {
  return ["ai_work_order", "large_ai_work_order"].includes(route.destination);
}

function discoveryRoutePromotesToIntake(route = {}) {
  return !["unassigned", "rejected", "ai_work_order", "large_ai_work_order"].includes(route.destination);
}

function discoveryRouteReasonFallback(route = {}) {
  const destination = String(route.destination || "");
  if (destination === "existing_project") return "Routed to an existing project after Discovery triage.";
  if (destination === "proposed_new_project") return "Kept as a new project candidate after Discovery triage.";
  if (destination === "general_reference") return "Kept as reference or supporting material.";
  if (destination === "orphaned_idea") return "Kept as an orphaned idea for later connection.";
  if (destination === "ai_work_order") return "Queued for AI follow-up after first-pass Discovery triage.";
  if (destination === "large_ai_work_order") return "Queued large file or folder for later AI digestion.";
  if (destination === "rejected") return "Rejected during Discovery triage.";
  if (destination === "unassigned") return "Left unassigned after Discovery triage.";
  return "Reviewed during Discovery triage.";
}

const DISCOVERY_AUTO_QUESTION_IDS = new Set(["privacy_confirmation", "routing_existing_project", "routing_new_or_unassigned", "grouping_confirmation", "large_corpus_intake_mode"]);

function discoveryAutoQuestionAnswer(question = {}, { data = {}, confirmedRoutes = [], privacyClass = "local_only", unitReviewMode = "" } = {}) {
  const id = String(question.id || "");
  const directAnswer = String(data[`answer_${id}`] || "").trim();
  if (directAnswer) return directAnswer;
  const routes = Array.isArray(confirmedRoutes) ? confirmedRoutes : [];
  const destinations = new Set(routes.map((route) => route.destination).filter(Boolean));
  if (id === "privacy_confirmation") return privacyClass === "local_only" ? "Keep local only" : "Configured provider may receive selected content later";
  if (id === "grouping_confirmation") return (data.unitReviewMode || unitReviewMode) === "multiple_units" ? "No, split into separate ideas" : "Yes, keep together";
  if (id === "routing_existing_project") {
    if (destinations.has("existing_project")) return "Yes, use the suggested existing project";
    if (destinations.has("proposed_new_project")) return "No, propose a new project";
    return "Not sure";
  }
  if (id === "routing_new_or_unassigned") {
    if (destinations.has("proposed_new_project")) return "Propose a new project";
    if (destinations.has("general_reference")) return "General reference";
    if (destinations.has("orphaned_idea")) return "Orphaned idea";
    if (destinations.has("ai_work_order") || destinations.has("large_ai_work_order")) return "Create AI Work Order";
    if (destinations.has("unassigned")) return "Leave unassigned for now";
    return "Not sure";
  }
  if (id === "large_corpus_intake_mode") {
    if (destinations.has("large_ai_work_order") || destinations.has("ai_work_order")) return "Index first before project candidates";
    return "Treat as one large document for now";
  }
  return "Not sure";
}

function discoveryQuestionOptions(question = {}, { privacyClass = "local_only" } = {}) {
  const id = String(question.id || "");
  const base = [["", "Choose an answer"]];
  if (id === "privacy_confirmation") {
    return [
      ...base,
      ["Keep local only", "Keep local only"],
      ["Configured provider may receive selected content later", "Allow configured provider later"],
      ["Not sure", "Not sure"]
    ];
  }
  if (id === "routing_new_or_unassigned") {
    return [
      ...base,
      ["Propose a new project", "Propose a new project"],
      ["General reference", "General reference"],
      ["Orphaned idea", "Orphaned idea"],
      ["Create AI Work Order", "Create AI Work Order"],
      ["Leave unassigned for now", "Leave unassigned for now"],
      ["Not sure", "Not sure"]
    ];
  }
  if (id === "grouping_confirmation") {
    return [
      ...base,
      ["Yes, keep together", "Yes, keep together"],
      ["No, split into separate ideas", "No, split into separate ideas"],
      ["Not sure", "Not sure"]
    ];
  }
  if (id === "large_corpus_intake_mode") {
    return [
      ...base,
      ["Index first before project candidates", "Index first before project candidates"],
      ["Treat as one large document for now", "Treat as one large document for now"],
      ["Not sure", "Not sure"]
    ];
  }
  if (id === "routing_existing_project") {
    return [
      ...base,
      ["Yes, use the suggested existing project", "Yes"],
      ["No, propose a new project", "No, propose new project"],
      ["Not sure", "Not sure"]
    ];
  }
  return [
    ...base,
    ["Yes", "Yes"],
    ["No", "No"],
    ["Not sure", "Not sure"]
  ];
}

function renderDiscoveryQuestionSelect(question = {}, context = {}) {
  const options = discoveryQuestionOptions(question, context)
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("");
  return `<div class="field"><label for="answer_${escapeHtml(question.id)}">${escapeHtml(question.text)}</label><select id="answer_${escapeHtml(question.id)}" name="answer_${escapeHtml(question.id)}" required>${options}</select></div>`;
}

function discoverySuggestedProjectNames(analysis = {}, units = []) {
  const names = [];
  for (const item of analysis.suggestedProjectNames || []) if (item?.name) names.push(item.name);
  for (const unit of units || []) if (unit?.title) names.push(unit.title);
  return [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))].slice(0, 12);
}

function suggestedProjectNameOptions(names = [], selected = "") {
  const all = [...new Set([selected, ...names].map((name) => String(name || "").trim()).filter(Boolean))];
  return [
    `<option value="">Choose a suggested project name</option>`,
    ...all.map((name) => `<option value="${escapeHtml(name)}"${name === selected ? " selected" : ""}>${escapeHtml(name)}</option>`),
    `<option value="__custom__">Other / custom name</option>`
  ].join("");
}

function renderDiscoveryUnitEditor(unit, index, { included = false, defaultDestination = "proposed_new_project" } = {}) {
  const title = unit?.title || "";
  const summary = unit?.summary || "";
  const reviewReason = unit?.reviewReason || unit?.routingReason || "";
  const destination = unit?.suggestedDestination || defaultDestination;
  const supportingFiles = (unit?.evidence || [])
    .filter((item) => item?.role === "supporting_file_without_text")
    .map((item) => item.fileName || "Supporting file")
    .filter(Boolean);
  const corpusEvidence = (unit?.evidence || []).find((item) => item?.role === "large_corpus_pending") || null;
  const corpusPreflight = unit?.corpusPreflight || {};
  return `
    <article class="item discovery-unit-editor" data-discovery-unit-index="${index}">
      <label class="check-field"><input type="checkbox" name="unit_include_${index}" ${included ? "checked" : ""}><span><strong>${included ? "Include this idea in the decision" : "Add another idea to review"}</strong><br>Use the route below to keep, reject, defer, or leave it unassigned.</span></label>
      <div class="field"><label for="unit_title_${index}">Idea or section name</label><input id="unit_title_${index}" name="unit_title_${index}" value="${escapeHtml(title)}" placeholder="Name this idea"></div>
      <div class="field"><label for="unit_summary_${index}">What this unit contains</label><textarea id="unit_summary_${index}" name="unit_summary_${index}" rows="3" placeholder="Optional plain-language summary">${escapeHtml(summary)}</textarea></div>
      ${supportingFiles.length ? `<p class="notice"><strong>Supporting files attached:</strong> ${supportingFiles.map((name) => escapeDisplay(name, DISPLAY_META_LIMIT)).join(", ")}</p>` : ""}
      ${corpusEvidence ? `<p class="notice"><strong>Large file:</strong> ${escapeDisplay(corpusEvidence.fileName || "Selected file", DISPLAY_META_LIMIT)}${corpusEvidence.estimatedWords ? ` · estimated ${Number(corpusEvidence.estimatedWords).toLocaleString()} words` : ""}${corpusEvidence.corpusKind ? ` · ${escapeDisplay(corpusEvidence.corpusKind, DISPLAY_META_LIMIT)}` : ""}. Index before splitting into project candidates.</p>` : ""}
      ${corpusPreflight.reasons?.length ? `<p class="item-meta">${corpusPreflight.reasons.map((item) => escapeDisplay(item, DISPLAY_META_LIMIT)).join(" ")}</p>` : ""}
      <div class="field"><label for="unit_destination_${index}">Where should this unit go?</label><select id="unit_destination_${index}" name="unit_destination_${index}">${discoveryDestinationOptions(destination)}</select></div>
      <div class="field"><label for="unit_project_${index}">Existing project, if selected</label><select id="unit_project_${index}" name="unit_project_${index}"><option value="">None</option>${projectOptions()}</select></div>
      <div class="field"><label for="unit_reason_${index}">Optional route note</label><select name="unit_reason_preset_${index}" data-unit-reason-preset="${index}"><option value="">Choose a common reason or write your own</option><option value="Keep as a separate project candidate">Keep as a separate project candidate</option><option value="Keep with parent folder/project, not a standalone project">Keep with parent folder/project</option><option value="Queue for AI follow-up after first-pass Discovery triage">Queue for AI follow-up</option><option value="Queue large file or folder for later AI digestion">Queue large file/folder for AI</option><option value="Keep as licensing or app reference, not a standalone project">Keep as licensing/app reference</option><option value="Reject duplicate intra-folder idea">Reject duplicate intra-folder idea</option><option value="Reject supporting note as standalone idea">Reject supporting note as standalone idea</option><option value="Leave unassigned until more context is available">Leave unassigned until more context is available</option><option value="Unrelated test material">Unrelated test material</option><option value="custom">Other / custom</option></select><textarea id="unit_reason_${index}" name="unit_reason_${index}" rows="2" placeholder="Optional note. Project State will auto-record a plain reason from the selected route if this is blank.">${escapeHtml(reviewReason)}</textarea></div>
    </article>
  `;
}

function renderIdeaCandidateReview(candidates = [], actor = currentActor()) {
  return `
    <p class="notice"><strong>Local test analysis complete.</strong> These are non-authoritative Idea Candidates. Review their evidence before creating Confirmed Idea Units.</p>
    <div class="list idea-candidate-review-list">
      ${candidates.map((candidate, index) => `
        <article class="item" data-idea-candidate-index="${index}">
          <label class="check-field"><input type="checkbox" data-idea-candidate-select checked><span><strong>Review this candidate</strong></span></label>
          <div class="field"><label for="idea_candidate_title_${index}">Working idea label</label><input id="idea_candidate_title_${index}" data-idea-candidate-title value="${escapeHtml(candidate.workingLabel || "")}"></div>
          <div class="field"><label for="idea_candidate_summary_${index}">Neutral summary</label><textarea id="idea_candidate_summary_${index}" data-idea-candidate-summary rows="3">${escapeHtml(candidate.neutralSummary || "")}</textarea></div>
          <p class="item-meta">${escapeHtml(t("type"))}: ${escapeHtml(candidate.candidateType || "unknown")} · Confidence: ${Math.round(Number(candidate.confidence?.score || 0) * 100)}%</p>
          ${candidate.confidence?.uncertaintyNotes ? `<p class="notice"><strong>Uncertainty:</strong> ${escapeDisplay(candidate.confidence.uncertaintyNotes, 1000)}</p>` : ""}
          <details class="technical-details"><summary>Evidence and provenance</summary>${(candidate.evidence || []).map((evidence) => `<p class="item-meta">${escapeDisplay(evidence.excerpt || evidence.discoveryChunkId, 500)}<br>Chunk: ${escapeDisplay(evidence.discoveryChunkId, DISPLAY_META_LIMIT)} · ${escapeDisplay(evidence.relationship || "supports", DISPLAY_META_LIMIT)}</p>`).join("")}<p class="item-meta">Provider: ${escapeDisplay(candidate.provenance?.providerId || "unknown", DISPLAY_META_LIMIT)} · Model: ${escapeDisplay(candidate.provenance?.modelId || "unknown", DISPLAY_META_LIMIT)}</p></details>
        </article>
      `).join("")}
    </div>
    <div class="field"><label for="ideaReviewAction">What should happen to the selected candidates?</label><select id="ideaReviewAction"><option value="accept">Keep as separate confirmed ideas</option><option value="merge">Merge into one confirmed idea</option><option value="reject">Reject</option><option value="defer">Defer</option><option value="mark_uncertain">Keep unresolved</option></select></div>
    <div data-idea-merge-fields hidden>
      <div class="field"><label for="ideaMergeTitle">Merged idea title</label><input id="ideaMergeTitle" value="${escapeHtml(candidates[0]?.workingLabel || "")}"></div>
      <div class="field"><label for="ideaMergeSummary">Merged idea summary</label><textarea id="ideaMergeSummary" rows="3">${escapeHtml(candidates.map((candidate) => candidate.neutralSummary || "").filter(Boolean).join(" ").slice(0, 2000))}</textarea></div>
    </div>
    <div class="field"><label for="ideaReviewActor">Reviewed by</label><select id="ideaReviewActor">${activeActorOptions(actor?.name || "")}</select></div>
    <div class="field"><label for="ideaReviewReason">Why</label><textarea id="ideaReviewReason" rows="2" required placeholder="Explain the review decision"></textarea></div>
    <button class="btn" type="button" data-confirm-idea-review>Confirm idea review</button>
  `;
}

async function runFakeIdeaAnalysis(discoveryCaseId, actor, reason = "") {
  const caseView = await platformAdapter.discovery.getCase({ discoveryCaseId });
  const capabilities = await platformAdapter.analysis.describeCapabilities();
  if (capabilities.arm?.executionLocation !== "local") throw new Error("Only local AI analysis arms are allowed in this flow.");
  const chunks = caseView.chunks || [];
  const hasPendingCorpus = (caseView.extractions || []).some((extraction) => extraction.status === "large_corpus_pending");
  if (!chunks.length && hasPendingCorpus) throw new Error("Large file has been staged but not indexed yet. Build a large-file index before running local AI idea analysis.");
  if (!chunks.length) throw new Error("No extracted text chunks are available for idea analysis.");
  const maximumChunks = Number(capabilities.limits?.maximumChunks || 100);
  const analysisChunks = chunks.slice(0, Math.max(1, maximumChunks));
  const extractionById = new Map((caseView.extractions || []).map((extraction) => [extraction.id, extraction]));
  const versionById = new Map((caseView.fileVersions || []).map((version) => [version.id, version]));
  const assetById = new Map((caseView.fileAssets || []).map((asset) => [asset.id, asset]));
  const privacyClasses = new Set((caseView.fileVersions || []).map((version) => assetById.get(version.fileAssetId)?.privacyClass || "local_only"));
  if (privacyClasses.size !== 1) throw new Error("Mixed privacy classes must be reviewed in separate Discovery Cases before analysis.");
  const privacyClass = [...privacyClasses][0];
  const sourceScopeMap = new Map();
  for (const chunk of analysisChunks) {
    const extraction = extractionById.get(chunk.discoveryExtractionId);
    if (!extraction) continue;
    if (!sourceScopeMap.has(extraction.fileVersionId)) sourceScopeMap.set(extraction.fileVersionId, { fileVersionId: extraction.fileVersionId, sourceSha256: extraction.sourceSha256, expectedChunkIds: [] });
    sourceScopeMap.get(extraction.fileVersionId).expectedChunkIds.push(chunk.id);
  }
  const analysisRunId = uid("idea_run");
  const modelId = capabilities.realProviderInstalled ? "qwen3:8b" : "deterministic_fake_v0.1";
  const analysisStrategy = capabilities.realProviderInstalled ? "local_ai_qwen3_8b" : "fake_local_contract_test";
  await platformAdapter.analysis.createRun({ id: analysisRunId, discoveryCaseId, actorId: capabilities.arm.armId, actorType: "tool", method: "ai", status: "running", sourceScope: [...sourceScopeMap.values()], provenance: { providerId: capabilities.arm.providerId, modelId } });
  const chunkScopes = analysisChunks.map((chunk) => ({ discoveryChunkId: chunk.id, chunkTextSha256: chunk.textSha256 }));
  const authorizationRecordId = uid("idea_privacy");
  const authorization = await platformAdapter.analysis.authorizeTransmission({ id: authorizationRecordId, discoveryCaseId, actorId: actor.id, actorType: "human", providerId: capabilities.arm.providerId, purpose: "idea_candidate_discovery", privacyClass, chunkScopes, redactionMode: "none", reason: reason || "Authorized exact chunks for local AI idea analysis." });
  const inputChunks = [];
  for (const chunk of analysisChunks) {
    const read = await platformAdapter.discovery.readChunkText({ discoveryChunkId: chunk.id });
    const extraction = extractionById.get(chunk.discoveryExtractionId);
    const version = versionById.get(extraction.fileVersionId);
    inputChunks.push({ discoveryChunkId: chunk.id, discoveryExtractionId: extraction.id, fileVersionId: version.id, sourceSha256: extraction.sourceSha256, chunkTextSha256: chunk.textSha256, content: { type: "text", text: read.text }, redactionState: "original" });
  }
  const requestId = uid("analysis_request");
  const result = await platformAdapter.analysis.submitAnalysisBatch({ contractVersion: "0.1", requestId, idempotencyKey: uid("analysis_idempotency"), submittedAt: nowIso(), arm: capabilities.arm, analysisRunId, discoveryCaseId, purpose: "idea_candidate_discovery", privacyAuthorization: { authorizationRecordId: authorization.authorization.id, authorizedBy: actor.id, authorizedAt: authorization.authorization.authorizedAt, providerId: capabilities.arm.providerId, purpose: "idea_candidate_discovery", privacyClass, chunkScopes, redactionMode: "none" }, batch: { batchId: uid("analysis_batch"), batchIndex: 0, isFinalBatch: analysisChunks.length >= chunks.length }, input: { chunks: inputChunks }, analysisOptions: { language: currentLanguage(), candidateTypes: capabilities.supportedCandidateTypes, maxCandidates: capabilities.limits.candidatesPerResultPage, includeRelationships: Boolean(capabilities.realProviderInstalled), includeClarificationQuestions: true }, provenance: { projectStateContract: "ai-analysis-arm-v0.1", ideaCandidateSchema: "0.1", analysisStrategy, analyzedChunkWindow: { analyzedChunks: analysisChunks.length, totalIndexedChunks: chunks.length } } });
  return { ...result, analysisChunkWindow: { analyzedChunks: analysisChunks.length, totalIndexedChunks: chunks.length } };
}

async function createDiscoveryAiWorkOrders({ discoveryCaseId, routes = [], extractions = [], analysis = {}, actor = currentActor(), groupLabel = "", folderIntent = "", privacyClass = "local_only", reason = "" } = {}) {
  const aiRoutes = routes.filter(discoveryRouteCreatesAiWorkOrder);
  if (!aiRoutes.length) return [];
  const createdAt = nowIso();
  const corpusIntake = analysis.corpusIntake || {};
  const allExtractions = Array.isArray(extractions) ? extractions : [];
  store.aiWorkOrders = Array.isArray(store.aiWorkOrders) ? store.aiWorkOrders : [];
  const orders = aiRoutes.map((route, index) => {
    const routeVersionIds = new Set(Array.isArray(route.fileVersionIds) ? route.fileVersionIds : []);
    const sourceExtractions = routeVersionIds.size
      ? allExtractions.filter((extraction) => routeVersionIds.has(extraction.fileVersionId))
      : allExtractions;
    const largeSource = route.destination === "large_ai_work_order" || corpusIntake.recommended || sourceExtractions.some((extraction) => ["large_file_pending", "large_corpus_pending"].includes(extraction.status));
    const sourceFiles = sourceExtractions.map((extraction) => ({
      fileVersionId: extraction.fileVersionId || "",
      originalName: extraction.originalName || "Discovery source",
      status: extraction.status || "",
      textBytes: extraction.textBytes || 0,
      chunkCount: extraction.chunkCount || 0
    }));
    const sourceNames = sourceFiles.map((file) => file.originalName).filter(Boolean);
    const titleBase = route.title || route.proposedProjectName || sourceNames[0] || groupLabel || `Discovery follow-up ${index + 1}`;
    const task = [
      largeSource ? "Large-file/folder AI follow-up queued from Discovery triage." : "AI follow-up queued from Discovery triage.",
      "Do not create Core truth directly. Analyze staged source evidence later and return suggestions through human review and the Airlock.",
      route.summary ? `Discovery summary: ${route.summary}` : "",
      route.reviewReason ? `Human routing reason: ${route.reviewReason}` : "",
      groupLabel ? `Discovery group: ${groupLabel}` : "",
      sourceNames.length ? `Sources: ${sourceNames.join(", ")}` : "",
      corpusIntake.recommended ? `Large-file preflight: ${Number(corpusIntake.totalEstimatedWords || 0).toLocaleString()} estimated words; ${corpusIntake.nextStep || "index before project candidates."}` : ""
    ].filter(Boolean).join("\n");
    return {
      id: uid("ai_work_order"),
      projectId: route.projectId || "",
      title: `${largeSource ? "Large AI follow-up" : "AI follow-up"}: ${titleFromFileName(titleBase)}`,
      task,
      contextPreset: largeSource ? "source_research" : "handoff",
      outputType: largeSource ? "Large-file/folder digestion and project-candidate suggestions" : "Discovery digestion and project-candidate suggestions",
      canCreateIntake: true,
      status: "submitted",
      createdAt,
      createdBy: actor.id,
      reason: route.reviewReason || reason || "Queued from Discovery for later AI follow-up.",
      source: {
        origin: "discovery",
        discoveryCaseId,
        discoveryUnitId: route.id || "",
        discoveryUnitTitle: route.title || "",
        destination: route.destination,
        privacyClass,
        folderIntent,
        groupLabel,
        sourceFiles,
        corpusIntake: corpusIntake.recommended ? cloneRecord(corpusIntake) : null
      },
      comments: []
    };
  });
  for (const order of orders) {
    store.aiWorkOrders.unshift(order);
    const project = getProject(order.projectId);
    if (project) {
      recordChange(project, actor, order.reason, "AI work order created from Discovery", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          workOrderId: order.id,
          title: order.title,
          discoveryCaseId,
          contextPreset: contextPackPresetLabel(order.contextPreset),
          canCreateIntake: order.canCreateIntake ? t("yes") : t("no")
        }
      });
    }
  }
  await saveStore({ allowWithoutCoreApproval: true, reason: "discovery-ai-work-order-created" });
  return orders;
}

function openDiscoveryReviewModal({ discoveryCaseId, analysis, extractions = [], actor, reason, groupLabel = "", privacyClass = "local_only", folderIntent = "", folderRootPath = "", sequencePosition = null, onConfirmed = null }) {
  const folderCollectionIntent = ["one_project_folder", "folder_groups"].includes(folderIntent);
  const folderDiscoveryIntent = ["one_project_folder", "folder_groups", "each_file", "loose_files_discovery", "subfolder_ai_followup"].includes(folderIntent);
  const folderContainerFirst = folderIntent === "folder_groups";
  const looseFolderGroup = /^Loose files in selected folder/i.test(String(groupLabel || ""));
  const cleanFolderGroupLabel = String(groupLabel || "").replace(/^(?:Project folder|Project folder candidate|Known project folder to check|Loose files in selected folder):\s*/i, "").trim();
  const knownFolderProject = folderIntent === "folder_groups" ? existingProjectMatchForFolderName(cleanFolderGroupLabel) : null;
  const folderProjectName = folderIntent === "one_project_folder"
    ? pathFolderName(folderRootPath) || cleanFolderGroupLabel
    : folderIntent === "folder_groups"
      ? looseFolderGroup ? "" : cleanFolderGroupLabel
      : "";
  const bestName = folderProjectName || analysis.suggestedProjectNames?.[0]?.name || "";
  const suggestedUnits = folderContainerFirst ? [] : (analysis.documentUnits || []).slice(0, DISCOVERY_REVIEW_UNIT_LIMIT);
  const visibleQuestions = (analysis.questions || []).filter((question) => !DISCOVERY_AUTO_QUESTION_IDS.has(String(question.id || "")));
  const suggestedProjectNames = folderProjectName
    ? [folderProjectName, ...discoverySuggestedProjectNames(analysis, suggestedUnits)].filter(Boolean)
    : discoverySuggestedProjectNames(analysis, suggestedUnits);
  const slotCount = Math.min(DISCOVERY_REVIEW_UNIT_LIMIT, Math.max(3, suggestedUnits.length + 2));
  let unitSlots = Array.from({ length: slotCount }, (_, index) => suggestedUnits[index] || { id: `manual_unit_${index + 1}`, title: "", summary: "", fileVersionIds: [], evidence: [], suggested: false });
  const suggestedMode = folderDiscoveryIntent ? "one_item" : analysis.unitModeSuggestion === "multiple_units" ? "multiple_units" : "one_item";
  const defaultSingleDestination = folderDiscoveryIntent ? "unassigned" : "proposed_new_project";
  const defaultUnitDestination = folderDiscoveryIntent ? "unassigned" : "proposed_new_project";
  const corpusIntake = analysis.corpusIntake?.recommended ? analysis.corpusIntake : null;
  let corpusReadyForAi = false;
  const ideaAnalysisPanel = platformAdapter.analysis?.available
    ? corpusIntake
      ? `<section class="panel" data-idea-analysis-panel data-corpus-index-required><p class="meta-label">AI follow-up</p><p class="notice">Large-file digestion now belongs in AI Work Orders. Choose <strong>Create Large-file/folder AI Work Order</strong> above to park this safely for later indexing and review.</p><div data-idea-analysis-output><p class="item-meta">Discovery stays fast; AI Work Orders handle the slow bench.</p></div></section>`
      : `<section class="panel" data-idea-analysis-panel><p class="meta-label">AI follow-up</p><p class="notice">AI follow-up now belongs in AI Work Orders. Choose <strong>Create AI Work Order</strong> above when this material needs slower digestion after first-pass Discovery triage.</p><div data-idea-analysis-output><p class="item-meta">No AI is called from this Discovery screen.</p></div></section>`
    : "";
  showModal({
    title: sequencePosition ? `Review Discovery (${sequencePosition.index} of ${sequencePosition.total})` : "Review Discovery",
    submitText: "Confirm",
    body: `
      <p class="notice"><strong>${corpusIntake ? "Large file staged." : "Read complete."}</strong> Project State copied the selected file into managed staging, verified its exact bytes, and ${corpusIntake ? "identified material that needs indexed large-file processing before project candidates are reliable." : "completed the supported local extraction shown below."}</p>
      ${corpusIntake ? `<p class="notice"><strong>Large-file lane:</strong> ${Number(corpusIntake.totalEstimatedWords || 0).toLocaleString()} estimated words across ${corpusIntake.pendingFiles} file${corpusIntake.pendingFiles === 1 ? "" : "s"}. Suggested type: ${escapeDisplay((corpusIntake.corpusKinds || []).join(", ") || "large document", DISPLAY_META_LIMIT)}. Next step: ${escapeDisplay(corpusIntake.nextStep || "Index before promotion.", DISPLAY_META_LIMIT)}</p>` : ""}
      ${folderCollectionIntent ? `<p class="notice"><strong>Folder intent:</strong> Treat this folder group as a project/container candidate first. Project State will keep selected files together by default and will not make child projects unless you explicitly split and route them.</p>` : ""}
      ${looseFolderGroup ? `<p class="notice"><strong>Loose files:</strong> These files are directly inside the selected folder. They were staged and read, but Project State will not treat the parent folder name as a project candidate.</p>` : ""}
      ${folderContainerFirst ? `<p class="notice"><strong>Container-first review:</strong> Files inside this folder were staged and read as evidence, but they are not treated as separate project proposals in this pass. Confirming with <strong>Leave unassigned</strong> records the check without sending anything to Needs Attention.</p>` : ""}
      ${folderIntent === "each_file" ? `<p class="notice"><strong>Individual file review:</strong> This came from an unknown folder scan. It will stay unassigned unless you deliberately choose an Intake route.</p>` : ""}
      ${knownFolderProject ? `<p class="notice"><strong>Known folder check:</strong> This folder name matches existing project <strong>${escapeDisplay(knownFolderProject.name, DISPLAY_META_LIMIT)}</strong>. Review the folder contents before deciding whether to route it into that project, create a proposal, or park it for AI follow-up.</p>` : ""}
      ${groupLabel ? `<p class="notice"><strong>Suggested group:</strong> ${escapeDisplay(groupLabel, DISPLAY_META_LIMIT)}</p>` : ""}
      <div class="field">
        <label>File reading result</label>
        <div class="list">
          ${extractions.map((extraction) => {
            const previewLimit = 6000;
            const preview = String(extraction.text || "").slice(0, previewLimit);
            const statusText = extraction.status === "complete"
              ? `Read complete · ${formatBytes(extraction.textBytes)} extracted · ${extraction.chunkCount} ${extraction.chunkCount === 1 ? "chunk" : "chunks"}`
              : extraction.status === "partial"
                ? "Partially read"
                : extraction.status === "metadata_only"
                  ? "Metadata recorded; this file type has no local text extraction"
                  : extraction.status === "large_file_pending"
                    ? `Large file staged; immediate text extraction deferred${extraction.error?.message ? `: ${extraction.error.message}` : ""}`
                  : extraction.status === "large_corpus_pending"
                    ? `Large file staged for indexed processing${extraction.preflight?.estimatedWords ? ` · estimated ${Number(extraction.preflight.estimatedWords).toLocaleString()} words` : ""}${extraction.preflight?.corpusKind ? ` · ${extraction.preflight.corpusKind}` : ""}`
                  : extraction.status === "unsupported"
                    ? "This file type is stored but local text extraction is not supported"
                    : `Read failed${extraction.error?.message ? `: ${extraction.error.message}` : ""}`;
            return `
              <article class="item">
                <p class="item-title">${escapeDisplay(extraction.originalName || "Selected file", DISPLAY_META_LIMIT)}</p>
                <p class="item-meta">${escapeHtml(statusText)}</p>
                ${extraction.deduplicated ? `<p class="notice">This exact file was already stored. Project State reused its immutable bytes instead of creating another copy.</p>` : ""}
                ${preview ? `<label>Extracted text preview</label><textarea rows="12" readonly>${escapeHtml(preview)}</textarea>${extraction.text.length > previewLimit ? `<p class="item-meta">Preview shows the first ${previewLimit.toLocaleString()} characters. The full extraction remains stored in Discovery.</p>` : ""}` : ""}
              </article>
            `;
          }).join("")}
        </div>
      </div>
      <p class="notice">Project State found a possible name and routing. These are suggestions, not decisions.</p>
      <div class="field"><label for="unitReviewMode">How should this material be reviewed?</label><select id="unitReviewMode" name="unitReviewMode"><option value="one_item"${suggestedMode === "one_item" ? " selected" : ""}>Treat it as one item</option>${folderDiscoveryIntent ? "" : `<option value="multiple_units"${suggestedMode === "multiple_units" ? " selected" : ""}>Review several ideas separately</option>`}</select>${folderDiscoveryIntent ? `<p class="item-meta">Folder-sourced Discovery starts container-first. Use a later deeper scan when you want to split contents into separate ideas.</p>` : ""}</div>
      <div data-single-discovery-route>
        <div class="field"><label for="suggestedProjectNameChoice">Suggested new project name</label><select id="suggestedProjectNameChoice" name="suggestedProjectNameChoice">${suggestedProjectNameOptions(suggestedProjectNames, bestName)}</select></div>
        <div class="field"><label>Working file-based name, only if treated as one item</label><input name="proposedProjectName" value="${escapeHtml(bestName)}"></div>
      </div>
      ${ideaAnalysisPanel}
      <div data-multiple-discovery-routes>
        <p class="notice">Each included unit will receive its own route and pending Intake proposal. Suggested boundaries are editable and do not alter the original file.</p>
        <div class="list">${unitSlots.map((unit, index) => renderDiscoveryUnitEditor(unit, index, { included: index < suggestedUnits.length, defaultDestination: defaultUnitDestination })).join("")}</div>
      </div>
      ${analysis.projectCandidates?.length ? `<div class="field"><label>Possible existing projects</label><div class="list">${analysis.projectCandidates.map((item) => `<p>${escapeDisplay(item.name, DISPLAY_META_LIMIT)} · ${Math.round(item.confidence * 100)}%</p>`).join("")}</div></div>` : ""}
      ${(analysis.questions || []).some((question) => DISCOVERY_AUTO_QUESTION_IDS.has(String(question.id || ""))) ? `<p class="notice">Routing questions are answered from your route checklist so this confirmation step does not ask twice.</p>` : ""}
      ${visibleQuestions.map((question) => renderDiscoveryQuestionSelect(question, { privacyClass })).join("")}
      <div data-single-discovery-route>
        <div class="field"><label for="destination">Where should this go?</label><select id="destination" name="destination" required>${discoveryDestinationOptions(defaultSingleDestination)}</select></div>
        <div class="field"><label for="projectId">Existing project, if selected</label><select id="projectId" name="projectId"><option value="">None</option>${projectOptions()}</select></div>
      </div>
      <p class="notice">${folderDiscoveryIntent ? "Confirming records this Discovery review. Needs Attention is created only if you deliberately choose an Intake route." : "Confirming creates Intake proposals only. Core still requires separate human approval."}</p>
    `,
    async onSubmit(data) {
      for (const question of visibleQuestions) {
        const answer = String(data[`answer_${question.id}`] || "").trim();
        if (!answer) { window.alert("Answer each Discovery question before continuing."); return false; }
      }
      let routing;
      if (data.unitReviewMode === "multiple_units") {
        const routes = unitSlots.map((unit, index) => {
          const destination = data[`unit_destination_${index}`] || "unassigned";
          const route = {
            id: unit.id || `manual_unit_${index + 1}`,
            included: data[`unit_include_${index}`] === "on",
            title: String(data[`unit_title_${index}`] || "").trim(),
            summary: String(data[`unit_summary_${index}`] || "").trim(),
            destination,
            projectId: data[`unit_project_${index}`] || null,
            proposedProjectName: String(data[`unit_title_${index}`] || "").trim(),
            fileVersionIds: unit.fileVersionIds || [],
            evidence: unit.evidence || []
          };
          route.reviewReason = String(data[`unit_reason_${index}`] || "").trim() || discoveryRouteReasonFallback(route);
          return route;
        }).filter((route) => route.included && route.title);
        if (!routes.length) { window.alert("Include and name at least one document unit, or review the material as one item."); return false; }
        if (routes.some((route) => route.destination === "existing_project" && !route.projectId)) { window.alert("Choose an existing project for every unit routed to an existing project."); return false; }
        routing = await platformAdapter.discovery.confirmRouting({ discoveryCaseId, actorId: actor.id, routes });
      } else {
        if (data.destination === "existing_project" && !data.projectId) { window.alert("Choose an existing project or select a different destination."); return false; }
        if (data.destination === "proposed_new_project" && !String(data.proposedProjectName || bestName).trim()) { window.alert("Choose or enter a proposed project name before continuing."); return false; }
        routing = await platformAdapter.discovery.confirmRouting({ discoveryCaseId, actorId: actor.id, destination: data.destination, projectId: data.projectId || null, proposedProjectName: data.proposedProjectName || bestName, reviewReason: discoveryRouteReasonFallback({ destination: data.destination }) });
      }
      const confirmedRoutes = routing.routing.routes?.length ? routing.routing.routes : [routing.routing];
      for (const question of analysis.questions || []) {
        await platformAdapter.discovery.recordAnswer({ discoveryCaseId, actorId: actor.id, questionId: question.id, answer: discoveryAutoQuestionAnswer(question, { data, confirmedRoutes, privacyClass, unitReviewMode: data.unitReviewMode }) });
      }
      const createdAiWorkOrders = await createDiscoveryAiWorkOrders({ discoveryCaseId, routes: confirmedRoutes, extractions, analysis, actor, groupLabel, folderIntent, privacyClass, reason });
      let promotedReadyItemId = "";
      if (confirmedRoutes.some(discoveryRoutePromotesToIntake)) {
        const promotion = await platformAdapter.discovery.promoteToIntake({ discoveryCaseId, actorId: actor.id, reason: reason || "Confirmed Discovery routing." });
        store = await loadStore() || store;
        const promotedItems = (promotion.intakeItemIds || []).map((id) => findIntakeItem(id)).filter(Boolean);
        const readyPromotedItems = promotedItems.filter((item) => item.status === "pending" && item.queueState === "ready" && allRequiredFlagsPass(intakeAirlockChecks(item)));
        if (readyPromotedItems.length === 1 && promotedItems.length === 1) promotedReadyItemId = readyPromotedItems[0].id;
      }
      store = await loadStore() || store;
      await refreshDiscoveryWorkspace();
      activeRootView = confirmedRoutes.some(discoveryRoutePromotesToIntake) ? "intake" : createdAiWorkOrders.length ? "work-orders" : "files";
      activeProjectId = null;
      setSaveStatus("saved", promotedReadyItemId ? "Discovery accepted. Final Core approval is ready." : createdAiWorkOrders.length ? "Discovery queued to AI Work Orders." : "Discovery confirmed.");
      const hasNextDiscoveryReview = typeof onConfirmed === "function" && sequencePosition?.index < sequencePosition?.total;
      if (hasNextDiscoveryReview) queuePostModalAction(onConfirmed);
      else if (promotedReadyItemId) queuePostModalAction(() => openApproveIntakeModal(promotedReadyItemId));
      return true;
    }
  });
  const reviewModal = document.querySelector(".modal");
  const modeField = reviewModal?.querySelector("#unitReviewMode");
  const suggestedProjectNameChoice = reviewModal?.querySelector("#suggestedProjectNameChoice");
  const proposedProjectNameField = reviewModal?.querySelector('[name="proposedProjectName"]');
  const syncDiscoveryUnitMode = () => {
    const multiple = modeField?.value === "multiple_units";
    reviewModal?.querySelectorAll("[data-single-discovery-route]").forEach((node) => { node.hidden = multiple; });
    reviewModal?.querySelectorAll("[data-multiple-discovery-routes]").forEach((node) => { node.hidden = !multiple; });
  };
  modeField?.addEventListener("change", syncDiscoveryUnitMode);
  reviewModal?.addEventListener("change", (event) => {
    const preset = event.target.closest("[data-unit-reason-preset]");
    if (!preset) return;
    const index = preset.dataset.unitReasonPreset;
    const reasonField = reviewModal.querySelector(`[name="unit_reason_${CSS.escape(index)}"]`);
    if (!reasonField) return;
    if (preset.value === "custom") {
      reasonField.focus();
      return;
    }
    if (preset.value) reasonField.value = preset.value;
  });
  suggestedProjectNameChoice?.addEventListener("change", () => {
    if (!proposedProjectNameField) return;
    if (suggestedProjectNameChoice.value === "__custom__") {
      proposedProjectNameField.focus();
      return;
    }
    if (suggestedProjectNameChoice.value) proposedProjectNameField.value = suggestedProjectNameChoice.value;
  });
  syncDiscoveryUnitMode();
  const ideaPanel = reviewModal?.querySelector("[data-idea-analysis-panel]");
  const ideaOutput = ideaPanel?.querySelector("[data-idea-analysis-output]");
  let currentIdeaCandidates = [];
  ideaPanel?.addEventListener("click", async (event) => {
    const indexButton = event.target.closest("[data-index-corpus]");
    if (indexButton) {
      indexButton.disabled = true;
      indexButton.textContent = indexButton.dataset.continueIndex === "true" ? "Indexing next local batch…" : "Indexing large file locally…";
      try {
        const caseView = await platformAdapter.discovery.getCase({ discoveryCaseId });
        const extraction = (caseView.extractions || []).find((item) => item.status === "large_corpus_pending");
        if (!extraction) throw new Error("No pending large-file extraction was found for this Discovery case.");
        const result = await platformAdapter.discovery.indexCorpus({ discoveryCaseId, extractionId: extraction.id, actorId: "project_state_deterministic", maxChunks: 120, chunkCharacters: 12000, continueIndex: indexButton.dataset.continueIndex === "true" });
        corpusReadyForAi = Boolean(result.chunks?.length);
        if (result.indexed?.truncated) {
          ideaOutput.innerHTML = `<p class="notice"><strong>Large file indexing continued.</strong> Indexed ${Number(result.indexed.totalIndexedChunks || result.chunks?.length || 0).toLocaleString()} of ${Number(result.indexed.totalDetectedChunks || 0).toLocaleString()} detected chunks. Continue indexing before running full idea analysis.</p>`;
          indexButton.textContent = "Index next large-file batch";
          indexButton.dataset.continueIndex = "true";
        } else {
          ideaOutput.innerHTML = `<p class="notice"><strong>Large file index ready.</strong> Indexed ${Number(result.indexed?.totalIndexedChunks || result.chunks?.length || 0).toLocaleString()} local evidence chunks. Local AI can now analyze the indexed evidence.</p>`;
          indexButton.textContent = "Queue indexed evidence in AI Work Orders";
          indexButton.removeAttribute("data-index-corpus");
          indexButton.removeAttribute("data-continue-index");
          indexButton.setAttribute("data-run-idea-analysis", "true");
        }
        indexButton.disabled = false;
      } catch (error) {
        console.error("Corpus indexing failed.", error);
        ideaOutput.innerHTML = `<p class="notice danger">Large-file indexing could not continue: ${escapeDisplay(error.message || "Unknown error", DISPLAY_META_LIMIT)}</p>`;
        indexButton.disabled = false;
        indexButton.textContent = "Retry large-file indexing";
      }
      return;
    }
    const runButton = event.target.closest("[data-run-idea-analysis]");
    if (runButton) {
      if (corpusIntake && !corpusReadyForAi) {
        ideaOutput.innerHTML = `<p class="notice danger">Large file has been staged but not indexed yet. Build a large-file index before running local AI idea analysis.</p>`;
        return;
      }
      runButton.disabled = true;
      runButton.textContent = "Analyzing exact chunks locally…";
      try {
        const result = await runFakeIdeaAnalysis(discoveryCaseId, actor, reason);
        currentIdeaCandidates = result.candidates || [];
        if (!currentIdeaCandidates.length) {
          ideaOutput.innerHTML = `<p class="notice">The local test arm found no Idea Candidates. No project or route was created.</p>`;
          return;
        }
        const partialWindow = result.analysisChunkWindow && result.analysisChunkWindow.analyzedChunks < result.analysisChunkWindow.totalIndexedChunks
          ? `<p class="notice"><strong>Partial analysis window:</strong> Local AI reviewed ${Number(result.analysisChunkWindow.analyzedChunks).toLocaleString()} of ${Number(result.analysisChunkWindow.totalIndexedChunks).toLocaleString()} indexed chunks. More analysis windows will be needed for full-corpus coverage.</p>`
          : "";
        ideaOutput.innerHTML = `${partialWindow}${renderIdeaCandidateReview(currentIdeaCandidates, actor)}`;
      } catch (error) {
        console.error("Local idea analysis failed.", error);
        ideaOutput.innerHTML = `<p class="notice danger">Idea analysis could not continue: ${escapeDisplay(error.message || "Unknown error", DISPLAY_META_LIMIT)}</p>`;
        runButton.disabled = false;
        runButton.textContent = "Retry local AI idea analysis";
      }
      return;
    }
    const confirmButton = event.target.closest("[data-confirm-idea-review]");
    if (!confirmButton) return;
    const selected = [...ideaPanel.querySelectorAll("[data-idea-candidate-index]")].filter((row) => row.querySelector("[data-idea-candidate-select]")?.checked).map((row) => {
      const index = Number(row.dataset.ideaCandidateIndex);
      return { candidate: currentIdeaCandidates[index], title: row.querySelector("[data-idea-candidate-title]")?.value.trim() || currentIdeaCandidates[index]?.workingLabel || "Untitled idea", summary: row.querySelector("[data-idea-candidate-summary]")?.value.trim() || currentIdeaCandidates[index]?.neutralSummary || "" };
    });
    if (!selected.length) { window.alert("Select at least one Idea Candidate to review."); return; }
    const reviewReason = ideaPanel.querySelector("#ideaReviewReason")?.value.trim() || "";
    if (!reviewReason) { window.alert("Record why you made this Idea Review decision."); return; }
    const reviewActorName = ideaPanel.querySelector("#ideaReviewActor")?.value || "";
    const reviewActor = getOrCreateActor(reviewActorName, "Human");
    const selectedAction = ideaPanel.querySelector("#ideaReviewAction")?.value || "accept";
    const reviewAction = selectedAction;
    let resultingUnits = [];
    if (reviewAction === "accept") resultingUnits = selected.map((item) => ({ id: uid("idea_unit"), title: item.title, summary: item.summary, sourceCandidateIds: [item.candidate.id], unresolvedUncertainty: item.candidate.confidence?.uncertaintyNotes ? [item.candidate.confidence.uncertaintyNotes] : [] }));
    if (reviewAction === "merge") resultingUnits = [{ id: uid("idea_unit"), title: ideaPanel.querySelector("#ideaMergeTitle")?.value.trim() || selected[0].title, summary: ideaPanel.querySelector("#ideaMergeSummary")?.value.trim() || selected.map((item) => item.summary).join(" ").slice(0, 2000), sourceCandidateIds: selected.map((item) => item.candidate.id), unresolvedUncertainty: selected.map((item) => item.candidate.confidence?.uncertaintyNotes).filter(Boolean) }];
    confirmButton.disabled = true;
    try {
      const review = await platformAdapter.analysis.recordReviewDecision({ id: uid("idea_review"), discoveryCaseId, actorId: reviewActor.id, actorType: "human", action: reviewAction, candidateIds: selected.map((item) => item.candidate.id), reason: reviewReason, resultingUnits });
      const confirmedUnits = review.confirmedIdeaUnits || [];
      if (confirmedUnits.length) {
        unitSlots = confirmedUnits.map((unit) => ({ id: unit.id, title: unit.title, summary: unit.summary, fileVersionIds: [...new Set((unit.evidence || []).map((evidence) => evidence.fileVersionId).filter(Boolean))], evidence: unit.evidence || [], suggested: false }));
        const multipleList = reviewModal.querySelector("[data-multiple-discovery-routes] .list");
        if (multipleList) multipleList.innerHTML = unitSlots.map((unit, index) => renderDiscoveryUnitEditor(unit, index, { included: true, defaultDestination: defaultUnitDestination })).join("");
        if (modeField) modeField.value = "multiple_units";
        syncDiscoveryUnitMode();
        ideaOutput.innerHTML = `<p class="notice"><strong>Idea review confirmed.</strong> ${confirmedUnits.length} Confirmed Idea ${confirmedUnits.length === 1 ? "Unit is" : "Units are"} now ready for project naming and routing below. These units are still not Core.</p>`;
      } else {
        ideaOutput.innerHTML = `<p class="notice"><strong>Idea review recorded.</strong> No Confirmed Idea Unit was created, so project naming and routing were not changed.</p>`;
      }
    } catch (error) {
      console.error("Idea review failed.", error);
      window.alert(error.message || "Idea review could not be recorded.");
      confirmButton.disabled = false;
    }
  });
  ideaPanel?.addEventListener("change", (event) => {
    if (event.target.id !== "ideaReviewAction") return;
    const mergeFields = ideaPanel.querySelector("[data-idea-merge-fields]");
    if (mergeFields) mergeFields.hidden = event.target.value !== "merge";
  });
}

function renderIntakeQueue() {
  const intakeItems = sortNewest(intakeItemsForAirlock(store.intakeItems || []), "createdAt");
  const pending = intakeItems
    .filter((item) => item.status === "pending")
    .sort((a, b) => intakeQueueStateRank(a.queueState) - intakeQueueStateRank(b.queueState) || Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
  const reviewed = intakeItems.filter((item) => item.status !== "pending");
  const stats = approvalQueueStats(store.intakeItems || []);

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("intakeAirlock"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("intakeAirlockSubtitle"))}</p>
      </div>
      <div class="button-row">
        ${pending.length ? `<button class="btn secondary" data-action="batch-triage">${escapeHtml(t("batchTriage"))}</button>` : ""}
      </div>
    </section>

    <article class="panel">
      <div class="panel-head">
        <h2 class="panel-title">${escapeHtml(t("approvalQueueSummary"))}</h2>
      </div>
      ${renderApprovalQueueSummary(stats)}
    </article>

    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel strong">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("pendingReview"))}</h2>
          </div>
          ${pending.length ? `<div class="list">${pending.map(renderIntakeItem).join("")}</div>` : emptyText(t("noPendingIntake"))}
        </article>
      </div>
      <aside class="stack">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("reviewedIntake"))}</h2>
          </div>
          ${reviewed.length ? `<div class="list">${reviewed.map(renderIntakeItem).join("")}</div>` : emptyText(t("noReviewedIntake"))}
        </article>
      </aside>
    </section>
  `);
}

function renderIntakeItem(item) {
  const projectName = item.projectId
    ? projectNameById(item.projectId) || t("missingProject")
    : item.destination === "proposed_new_project" && item.proposedProjectName
      ? `Proposed new project: ${item.proposedProjectName}`
      : t("noTargetProject");
  const proposed = item.proposedChange || {};
  const isPending = item.status === "pending" && !item.archived;
  const airlockFlags = intakeAirlockChecks(item);
  const airlockReady = allRequiredFlagsPass(airlockFlags);
  const nextStep = intakeNextStep(item, airlockFlags);
  return `
    <div class="item">
      <p class="item-title">${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
      ${renderGovernedStateStrip(item)}
      <div class="review-flags">
        <span class="pill ${escapeHtml(intakeQueueStateClass(item.queueState))}">${escapeHtml(intakeQueueStateLabel(item.queueState))}</span>
        <span class="pill">${escapeHtml(intakeStatusLabel(item))}</span>
        ${renderTrustBoundaryLabel("External", item)} <span aria-hidden="true">→</span> ${renderTrustBoundaryLabel("Intake", item)}
      </div>
      <p class="item-meta">${escapeHtml(intakeLaneLabel(item))} · ${escapeHtml(armTypeLabel(item.armType))} · ${escapeHtml(proposedObjectTypeLabel(item.proposedObjectType))}</p>
      <p class="item-meta">${escapeHtml(t("target"))}: ${escapeDisplay(projectName, DISPLAY_META_LIMIT)} · ${escapeHtml(t("created"))} ${escapeHtml(formatDate(item.createdAt))} · ${escapeHtml(t("age"))}: ${escapeHtml(intakeQueueAgeLabel(item.createdAt))}</p>
      ${item.sourceLabel ? `<p class="item-meta">${escapeHtml(t("source"))}: ${escapeDisplay(item.sourceLabel, DISPLAY_META_LIMIT)}</p>` : ""}
      ${proposed.text ? `<p class="item-body">${escapeDisplay(proposed.text)}</p>` : ""}
      ${proposed.summary ? `<p class="item-body">${escapeHtml(t("summary"))}: ${escapeDisplay(proposed.summary)}</p>` : ""}
      ${renderIntakeProposalDiff(item)}
      <p class="item-meta">${escapeHtml(t("airlockCompleteness"))}</p>
      ${renderFlagPills(airlockFlags)}
      ${item.queueNotes ? `<p class="item-meta">${escapeHtml(t("queueReviewNotes"))}: ${escapeDisplay(item.queueNotes, DISPLAY_META_LIMIT)}</p>` : ""}
      ${item.queueReviewedAt ? `<p class="item-meta">${escapeHtml(t("reviewedBy"))} ${escapeHtml(actorDisplay(item.queueReviewedBy))} · ${escapeHtml(formatDate(item.queueReviewedAt))}</p>` : ""}
      ${item.review ? `<p class="item-meta">${escapeHtml(t("reviewedBy"))} ${escapeHtml(actorDisplay(item.review.actorId, item.review.actorName))} · ${escapeHtml(formatDate(item.review.reviewedAt))}</p>` : ""}
      ${item.approval ? `<p class="item-meta">${escapeHtml(t("approvedBy"))} ${escapeHtml(actorDisplay(item.approval.approvedBy))} · ${escapeHtml(formatDate(item.approval.approvedAt))}</p>` : ""}
      ${nextStep ? `<div class="next-step-inline"><span><strong>Next step:</strong> ${escapeHtml(nextStep.label)}</span><button class="btn compact" data-action="${escapeHtml(nextStep.action)}" ${nextStep.intakeId ? `data-intake-id="${escapeHtml(nextStep.intakeId)}"` : ""} ${nextStep.projectId ? `data-project-id="${escapeHtml(nextStep.projectId)}"` : ""}>${escapeHtml(nextStep.label)}</button></div>` : ""}
      <details class="technical-details">
        <summary>Details and provenance</summary>
        <p class="item-meta">Intake ID: ${escapeDisplay(item.id, DISPLAY_META_LIMIT)}</p>
        ${item.discoveryCaseId ? `<p class="item-meta">Discovery Case: ${escapeDisplay(item.discoveryCaseId, DISPLAY_META_LIMIT)}</p>` : ""}
        ${item.evidence?.managedFile?.sha256 ? `<p class="item-meta">SHA-256: ${escapeDisplay(item.evidence.managedFile.sha256, DISPLAY_META_LIMIT)}</p>` : ""}
        ${item.evidence?.managedFile?.managedPath ? `<p class="item-meta">Managed path: ${escapeDisplay(item.evidence.managedFile.managedPath, DISPLAY_META_LIMIT)}</p>` : ""}
        ${item.routingInteractionId ? `<p class="item-meta">Routing record: ${escapeDisplay(item.routingInteractionId, DISPLAY_META_LIMIT)}</p>` : ""}
      </details>
      <div class="item-actions">
        ${isPending ? `<button class="btn secondary compact" data-action="review-intake-queue" data-intake-id="${item.id}">Edit proposal</button>` : ""}
        ${isPending ? `<button class="btn secondary compact" data-action="approve-intake" data-intake-id="${item.id}" ${airlockReady ? "" : "disabled"} title="${airlockReady ? "" : escapeHtml(t("airlockIncompleteNotice"))}">${escapeHtml(t("approve"))}</button>` : ""}
        ${isPending ? `<button class="btn secondary compact" data-action="reject-intake" data-intake-id="${item.id}">${escapeHtml(t("reject"))}</button>` : ""}
        ${!item.archived ? `<button class="btn secondary compact" data-action="archive-intake" data-intake-id="${item.id}">${escapeHtml(t("archive"))}</button>` : ""}
      </div>
    </div>
  `;
}

function armTypeLabel(type = "other") {
  const labels = {
    calendar: t("calendar"),
    meeting: t("meeting"),
    api: t("api"),
    ai: "AI",
    codex: "Codex",
    notes: t("notes"),
    chat: t("chat"),
    email: t("email"),
    file: t("file"),
    manual: t("manual"),
    other: t("other")
  };
  return labels[type] || t("other");
}

function proposedObjectTypeLabel(type = "") {
  const labels = {
    ProjectStatus: t("projectStatus"),
    Decision: t("decision"),
    Fact: t("fact"),
    Conflict: t("conflictRegister"),
    OpenQuestion: t("openQuestion"),
    NextAction: t("nextAction"),
    Source: t("source"),
    Relationship: t("relationshipType")
  };
  return labels[type] || t("proposedChange");
}

function intakeStatusLabel(item) {
  if (item.archived) return t("archived");
  if (item.status === "approved") return t("approved");
  if (item.status === "rejected") return t("rejected");
  return t("pending");
}

function normalizeSearchText(value = "") {
  return String(value).toLowerCase();
}

function searchMatches(values, query) {
  const haystack = values.map((value) => String(value || "")).join(" ").toLowerCase();
  return haystack.includes(query);
}

function addSearchResult(results, project, objectType, objectId, title, description, values, extra = {}) {
  const query = normalizeSearchText(searchQuery.trim());
  if (!query || !searchMatches(values, query)) return;
  results.push({
    projectId: project.id,
    projectName: project.name,
    objectType,
    objectId,
    title: title || t("untitled"),
    description: description || "",
    ...extra
  });
}

function buildSearchResults() {
  const results = [];
  for (const project of store.projects) {
    addSearchResult(
      results,
      project,
      "Project",
      project.id,
      project.name,
      project.currentStatus,
      [project.name, project.currentStatus, project.currentSummary, healthFlagLabel(project.healthFlag), project.deletionStatus]
    );

    for (const decision of project.decisions) {
      addSearchResult(results, project, "Decision", decision.id, decision.text, decision.reason, [decision.text, decision.reason, decision.confidence, decisionRelationLabel(decision.relationType), decisionById(project, decision.relatedDecisionId)?.text || ""]);
      addImageSearchResults(results, project, "Decision", decision);
    }
    for (const fact of project.facts) {
      addSearchResult(results, project, "Fact", fact.id, fact.statement, fact.source, [fact.statement, fact.source, fact.confidence]);
      addImageSearchResults(results, project, "Fact", fact);
    }
    for (const conflict of project.conflicts || []) {
      addSearchResult(results, project, "Conflict", conflict.id, conflict.title, conflict.description, [conflict.title, conflict.description, conflict.linkedItems, conflict.resolution, conflictStatusLabel(conflict.status)]);
      addImageSearchResults(results, project, "Conflict", conflict);
    }
    for (const source of project.sources) {
      addSearchResult(results, project, "Source", source.id, source.title, source.summary || source.location, [source.title, source.sourceType, sourceTrustLabel(source.trustLevel), sourceStalenessLabel(sourceStalenessState(source)), trustBoundaryLabel(trustBoundaryForRecord("Source", source)), source.location, source.localPath, source.managedPath, source.localFile?.name, source.localFile?.localPath, source.summary, tagsToText(source.tags), linkedActorNames(source.linkedActorIds).join(" ")]);
      for (const extract of source.extracts || []) {
        addSearchResult(results, project, "Extract", extract.id, extract.text, extract.summary, [extract.text, extract.summary, extractModeLabel(extract.extractMode), tagsToText(extract.tags), extract.extractedFromFile?.fileName, extract.extractedFromFile?.localPath]);
      }
    }
    for (const relationship of project.relationships) {
      addSearchResult(results, project, "Relationship", relationship.id, relationshipTargetLabel(relationship), relationship.notes, [relationshipTargetLabel(relationship), relationship.target, relationship.relationshipType, relationship.notes]);
      addImageSearchResults(results, project, "Relationship", relationship);
    }
    for (const draftProject of project.draftProjects) {
      addSearchResult(results, project, "DraftProject", draftProject.id, draftProject.name, draftProject.draft, [draftProject.name, draftProject.draft, draftProject.sourceTitle, draftProject.status, draftProject.approvalReason]);
      addImageSearchResults(results, project, "DraftProject", draftProject);
    }
    for (const question of project.openQuestions) {
      addSearchResult(results, project, "OpenQuestion", question.id, question.question, question.context, [question.question, question.context, question.status]);
      addImageSearchResults(results, project, "OpenQuestion", question);
    }
    for (const action of project.nextActions) {
      addSearchResult(results, project, "NextAction", action.id, action.action, action.owner, [action.action, action.owner, action.status, action.dueDate, action.completedAt]);
      addImageSearchResults(results, project, "NextAction", action);
    }
    for (const change of project.changes) {
      addSearchResult(results, project, "Change", change.id, change.summary, change.reason, [change.summary, change.reason, change.actorName, describeDetails(change.details)]);
      addImageSearchResults(results, project, "Change", change);
    }
    addImageSearchResults(results, project, "Project", project);
  }
  return results.slice(0, 80);
}

function addImageSearchResults(results, project, objectType, object) {
  for (const image of object.imageLinks || []) {
    addSearchResult(
      results,
      project,
      "Image",
      image.id,
      image.caption || image.fileName || t("attachedImage"),
      `${objectType}: ${objectLabel(objectType, object)}`,
      [image.fileName, image.fileType, image.caption, image.localPath, objectLabel(objectType, object)],
      {
        attachedToType: image.attachedToType || objectType,
        attachedToId: image.attachedToId || object.id,
        imageId: image.id
      }
    );
  }
}

function renderSearchResults() {
  const query = searchQuery.trim();
  const results = buildSearchResults();
  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("search"))}</h1>
        <p class="view-subtitle">${escapeHtml(results.length ? tFormat("searchResultsFor", { count: results.length, query: limitText(query, DISPLAY_META_LIMIT) }) : tFormat("noSearchResultsFor", { query: limitText(query, DISPLAY_META_LIMIT) }))}</p>
      </div>
      <button class="btn secondary" data-action="clear-search">${escapeHtml(t("clearSearch"))}</button>
    </section>
    ${results.length ? `<section class="search-results">${results.map(renderSearchResult).join("")}</section>` : emptyText(t("searchEmptyHint"))}
  `);
}

function renderSearchResult(result) {
  const action = result.objectType === "Image" ? "view-image" : "open-search-result";
  const data = result.objectType === "Image"
    ? `data-project-id="${result.projectId}" data-object-type="${result.attachedToType}" data-object-id="${result.attachedToId}" data-image-id="${result.imageId}"`
    : `data-project-id="${result.projectId}" data-object-type="${result.objectType}" data-object-id="${result.objectId}"`;
  return `
    <article class="search-result">
      <div>
        <p class="item-title">${escapeDisplay(result.title, DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">${escapeHtml(result.objectType)} · ${escapeDisplay(result.projectName, DISPLAY_META_LIMIT)}</p>
        ${result.description ? `<p class="item-body">${escapeDisplay(result.description)}</p>` : ""}
      </div>
      <button class="btn secondary compact" data-action="${action}" ${data}>${escapeHtml(t("open"))}</button>
    </article>
  `;
}

function renderProject(project) {
  const updatedBy = actorDisplay(project.updatedBy);
  const questions = sortNewest(project.openQuestions.filter((question) => question.status === "open"));
  const actions = sortNewest(project.nextActions.filter((action) => getActionStatus(action) === "open"));
  const decisions = sortNewest(project.decisions.filter((decision) => !decision.archived), "date");
  const facts = sortNewest(project.facts.filter((fact) => fact.status !== "archived"));
  const conflicts = sortNewest((project.conflicts || []).filter((conflict) => conflict.status !== "archived"), "noticedAt");
  const sources = sortNewest(project.sources.filter((source) => source.status !== "archived"));
  const draftProjects = sortNewest(project.draftProjects.filter((draftProject) => draftProject.status !== "archived"));
  const relationships = sortNewest(project.relationships.filter((relationship) => relationship.status !== "archived"));
  const changes = sortNewest(project.changes, "timestamp");
  const objectFilteredChanges = activeHistoryFilter ? filterObjectHistory(changes, activeHistoryFilter) : changes;
  const visibleChanges = filterHistoryByEventType(objectFilteredChanges, activeHistoryEventType);
  const eventTypes = historyEventTypes(objectFilteredChanges);
  const historyTitle = activeHistoryFilter ? `${activeHistoryFilter.objectType} ${t("viewHistory")}` : t("changeHistory");
  const completenessFlags = projectCompletenessFlags(project);
  const nextStep = projectNextStep(project);

  const dashboard = `
    <article class="panel strong next-step-panel">
      <div>
        <p class="meta-label">Next step</p>
        <h2 class="panel-title">${escapeHtml(nextStep.label)}</h2>
        <p class="item-meta">${escapeHtml(nextStep.detail)}</p>
      </div>
      <div class="item-actions">
        <button class="btn" data-action="${escapeHtml(nextStep.action)}">${escapeHtml(nextStep.buttonLabel || nextStep.label)}</button>
        ${(nextStep.secondaryActions || []).map((secondary) => `<button class="btn secondary" data-action="${escapeHtml(secondary.action)}">${escapeHtml(secondary.label)}</button>`).join("")}
      </div>
    </article>
    <section class="meta-grid">
      <div class="meta-card">
        <p class="meta-label">${escapeHtml(t("lastUpdated"))}</p>
        <p class="meta-value">${escapeHtml(formatDate(project.updatedAt))}</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">${escapeHtml(t("updatedBy"))}</p>
        <p class="meta-value">${escapeHtml(updatedBy)}</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">${escapeHtml(t("currentObjects"))}</p>
        <p class="meta-value">${decisions.length} decisions, ${facts.length} facts, ${conflicts.length} conflicts, ${sources.length} sources, ${draftProjects.length} drafts, ${relationships.length} relationships, ${questions.length} questions, ${actions.length} actions</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">${escapeHtml(t("health"))}</p>
        <p class="meta-value">${escapeHtml(healthFlagLabel(project.healthFlag))}</p>
      </div>
    </section>

    <article class="panel">
      <div class="panel-head">
        <h2 class="panel-title">${escapeHtml(t("projectConfidence"))} / ${escapeHtml(t("projectCompleteness"))}</h2>
      </div>
      ${renderFlagPills(completenessFlags)}
    </article>

    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel strong">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("currentStatus"))}</h2>
            <button class="btn secondary" data-action="edit-status">${escapeHtml(t("editStatus"))}</button>
          </div>
          <p class="status-text">${escapeDisplay(project.currentStatus || t("noStatusRecorded"))}</p>
          <p class="summary-text">${escapeDisplay(project.currentSummary || t("noCurrentSummaryRecorded"))}</p>
          ${renderAttachedSources(project)}
          ${renderAttachedImages(project)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("nextAction"))}</h2>
            <button class="btn secondary" data-action="add-action">${escapeHtml(t("addNextAction"))}</button>
          </div>
          ${renderActionList(recent(actions, 3))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("openQuestions"))}</h2>
            <button class="btn secondary" data-action="add-question">${escapeHtml(t("addOpenQuestion"))}</button>
          </div>
          ${renderQuestionList(recent(questions, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("facts"))}</h2>
            <button class="btn secondary" data-action="add-fact">${escapeHtml(t("addFact"))}</button>
          </div>
          ${renderFactList(recent(facts, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("conflictRegister"))}</h2>
            <button class="btn secondary" data-action="add-conflict">${escapeHtml(t("addConflict"))}</button>
          </div>
          ${renderConflictList(recent(conflicts, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("sources"))}</h2>
            <button class="btn secondary" data-action="add-source">${escapeHtml(t("addSource"))}</button>
          </div>
          ${renderSourceList(recent(sources, 5), project)}
        </article>
      </div>

      <aside class="stack">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("projectRoles"))}</h2>
            <button class="btn secondary" data-action="manage-project-roles">${escapeHtml(t("manageProjectRoles"))}</button>
          </div>
          ${renderProjectRoles(project)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("recentDecisions"))}</h2>
            <button class="btn secondary" data-action="add-decision">${escapeHtml(t("addDecision"))}</button>
          </div>
          ${renderDecisionList(recent(decisions, 5), project)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("relationships"))}</h2>
            <button class="btn secondary" data-action="add-relationship">${escapeHtml(t("addRelationship"))}</button>
          </div>
          ${renderRelationshipList(recent(relationships, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("draftProjects"))}</h2>
          </div>
          ${renderDraftProjectList(recent(draftProjects, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("recentActivity"))}</h2>
            <button class="btn secondary" data-action="view-history">${escapeHtml(t("viewHistory"))}</button>
          </div>
          ${renderActivityList(recent(changes, 5))}
        </article>
      </aside>
    </section>
  `;

  const history = `
    <section class="history-list">
      <div class="history-controls">
        ${activeHistoryFilter ? `<button class="btn secondary" data-action="clear-history-filter">${escapeHtml(t("viewFullHistory"))}</button>` : ""}
        <label class="filter-label">
          ${escapeHtml(t("eventType"))}
          <select data-history-event-filter>
            <option value="all" ${activeHistoryEventType === "all" ? "selected" : ""}>${escapeHtml(t("allEvents"))}</option>
            ${eventTypes.map((eventType) => `<option value="${escapeHtml(eventType)}" ${activeHistoryEventType === eventType ? "selected" : ""}>${escapeDisplay(eventType, DISPLAY_META_LIMIT)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${visibleChanges.length ? visibleChanges.map(renderHistoryItem).join("") : emptyText(t("noChangesRecordedForFilter"))}
    </section>
  `;
  const changesSince = renderWhatChangedSince(project, changes);
  const map = renderProjectMap(project, {
    questions,
    actions,
    decisions,
    facts,
    conflicts,
    sources,
    relationships,
    draftProjects,
    changes
  });
  const handoff = renderProjectHandoff(project, {
    questions,
    actions,
    decisions,
    facts,
    conflicts,
    sources,
    relationships,
    draftProjects,
    changes
  });

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h1>
        <p class="view-subtitle">${escapeHtml(t("stateHistorySeparate"))}</p>
      </div>
      <div class="button-row">
        <button class="btn secondary" data-action="project-overview">${escapeHtml(t("onePageOverview"))}</button>
        <details class="action-menu header-action-menu">
          <summary class="btn">${escapeHtml(t("addMenu"))}</summary>
          <div class="action-menu-popover">
            <button class="btn secondary compact" data-action="add-decision">${escapeHtml(t("addDecision"))}</button>
            <button class="btn secondary compact" data-action="add-fact">${escapeHtml(t("addFact"))}</button>
            <button class="btn secondary compact" data-action="add-conflict">${escapeHtml(t("addConflict"))}</button>
            <button class="btn secondary compact" data-action="add-source">${escapeHtml(t("addSource"))}</button>
            <button class="btn secondary compact" data-action="add-relationship">${escapeHtml(t("addRelationship"))}</button>
            <button class="btn secondary compact" data-action="add-question">${escapeHtml(t("addOpenQuestion"))}</button>
            <button class="btn secondary compact" data-action="add-action">${escapeHtml(t("addNextAction"))}</button>
          </div>
        </details>
        <details class="action-menu header-action-menu">
          <summary class="btn secondary">${escapeHtml(t("moreActions"))}</summary>
          <div class="action-menu-popover align-right">
            <button class="btn secondary compact" data-action="edit-object" data-object-type="Project" data-object-id="${project.id}">${escapeHtml(t("edit"))}</button>
            <button class="btn secondary compact" data-action="export-handoff">${escapeHtml(t("exportHandoff"))}</button>
            <button class="btn secondary compact" data-action="context-pack">${escapeHtml(t("contextPack"))}</button>
            <button class="btn secondary compact" data-action="view-object-history" data-object-type="Project" data-object-id="${project.id}">${escapeHtml(t("viewHistory"))}</button>
            <button class="btn secondary compact" data-action="archive-object" data-object-type="Project" data-object-id="${project.id}" ${project.archived ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
            ${project.archived ? `<button class="btn secondary compact" data-action="unarchive-project" data-project-id="${project.id}">${escapeHtml(t("unarchiveProject"))}</button>` : ""}
            <button class="btn secondary compact" data-action="delete-project" data-project-id="${project.id}" ${project.deletionStatus ? "disabled" : ""}>${escapeHtml(t("deleteProject"))}</button>
          </div>
        </details>
      </div>
    </section>

    <nav class="tabs" aria-label="Project views">
      <button class="tab ${activeView === "dashboard" ? "active" : ""}" data-action="show-dashboard">${escapeHtml(t("dashboard"))}</button>
      <button class="tab ${activeView === "handoff" ? "active" : ""}" data-action="show-handoff">${escapeHtml(t("handoffMode"))}</button>
      <button class="tab ${activeView === "map" ? "active" : ""}" data-action="show-map">${escapeHtml(t("projectMap"))}</button>
      <button class="tab ${activeView === "changes_since" ? "active" : ""}" data-action="show-changes-since">${escapeHtml(t("whatChangedSince"))}</button>
      <button class="tab ${activeView === "history" ? "active" : ""}" data-action="show-history">${escapeDisplay(historyTitle, DISPLAY_META_LIMIT)}</button>
    </nav>

    ${activeView === "dashboard" ? dashboard : activeView === "handoff" ? handoff : activeView === "map" ? map : activeView === "changes_since" ? changesSince : history}
    ${renderObjectDetailPanel(project)}
  `);
}

function renderProjectHandoff(project, collections = {}) {
  const changes = recent(sortNewest(collections.changes || [], "timestamp"), 8);
  const approvals = projectHandoffApprovalItems(project, collections);
  const blockers = projectHandoffBlockers(project, collections);
  const people = projectHandoffPeople(project);
  const sources = projectHandoffSources(collections.sources || []);
  const aiItems = projectHandoffAiItems(project);
  return `
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("handoffMode"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("handoffSubtitle"))}</p>
      </div>
    </section>
    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel strong">
          <div class="panel-head"><h2 class="panel-title">${escapeHtml(t("whatThisProjectIs"))}</h2></div>
          <p class="status-text">${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</p>
          <p class="summary-text">${escapeDisplay(project.currentStatus || t("noStatusRecorded"))}</p>
        </article>
        <article class="panel">
          <div class="panel-head"><h2 class="panel-title">${escapeHtml(t("whyItMatters"))}</h2></div>
          <p class="summary-text">${escapeDisplay(project.currentSummary || t("noCurrentSummaryRecorded"))}</p>
          ${renderFlagPills(projectCompletenessFlags(project))}
        </article>
        ${renderHandoffSection(t("whatChangedRecently"), changes.map((change) => ({
          title: change.summary,
          meta: `${formatDate(change.timestamp)} · ${actorDisplay(change.actorId, change.actorName)}`,
          body: change.reason || change.details?.objectText || ""
        })), t("noChangesRecordedForFilter"))}
        ${renderHandoffSection(t("waitingOnApproval"), approvals, t("handoffNoApprovalItems"))}
        ${renderHandoffSection(t("blockersAndRisks"), blockers, t("handoffNoBlockers"))}
      </div>
      <aside class="stack">
        ${renderHandoffSection(t("whoOwnsWhat"), people, t("handoffNoAssignments"))}
        ${renderHandoffSection(t("trustedSources"), sources, t("handoffNoTrustedSources"))}
        ${renderHandoffSection(t("aiAllowedHelp"), aiItems, t("handoffAiBoundary"))}
        <article class="panel">
          <div class="panel-head"><h2 class="panel-title">${escapeHtml(t("doNotTouch"))}</h2></div>
          <p class="notice">${escapeHtml(t("handoffDoNotTouchDefault"))}</p>
          ${project.deletionStatus ? `<p class="item-meta">${escapeHtml(t("deleteProject"))}: ${escapeDisplay(project.deletionStatus, DISPLAY_META_LIMIT)}</p>` : ""}
        </article>
      </aside>
    </section>
  `;
}

function renderHandoffSection(title, items = [], emptyMessage = "") {
  return `
    <article class="panel">
      <div class="panel-head"><h2 class="panel-title">${escapeHtml(title)}</h2></div>
      ${items.length ? `<div class="list">${items.map((item) => `
        <div class="item">
          <p class="item-title">${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
          ${item.meta ? `<p class="item-meta">${escapeDisplay(item.meta, DISPLAY_META_LIMIT)}</p>` : ""}
          ${item.body ? `<p class="item-body">${escapeDisplay(item.body, DISPLAY_TEXT_LIMIT)}</p>` : ""}
        </div>
      `).join("")}</div>` : emptyText(emptyMessage)}
    </article>
  `;
}

function projectHandoffApprovalItems(project, collections = {}) {
  const items = [];
  for (const intake of visibleIntakeItems(store.intakeItems || [])) {
    if (intake.projectId !== project.id || intake.archived || intake.status !== "pending") continue;
    items.push({
      title: intake.title,
      meta: `${t("intake")} · ${intakeQueueStateLabel(intake.queueState)} · ${proposedObjectTypeLabel(intake.proposedObjectType)}`,
      body: intake.proposedChange?.text || intake.queueNotes || ""
    });
  }
  for (const draft of collections.draftProjects || []) {
    if (draft.status !== "approved" && allRequiredFlagsPass(draftAirlockChecks(draft))) {
      items.push({
        title: draft.name,
        meta: `${t("draftProjects")} · ${t("readyForApproval")}`,
        body: draft.draft || ""
      });
    }
  }
  for (const source of collections.sources || []) {
    for (const extract of source.extracts || []) {
      if (extract.extractMode === "ai_suggested" && extract.suggestionStatus === "pending_approval") {
        items.push({
          title: source.title,
          meta: `${t("extract")} · ${t("aiSuggested")}`,
          body: extract.summary || extract.text || ""
        });
      }
    }
  }
  return items;
}

function projectHandoffBlockers(project, collections = {}) {
  const items = [];
  if (["blocked", "at_risk"].includes(project.healthFlag)) {
    items.push({ title: healthFlagLabel(project.healthFlag), meta: t("health"), body: project.currentStatus || "" });
  }
  for (const action of collections.actions || []) {
    if (nextActionDueState(action.dueDate) === "overdue") {
      items.push({ title: action.action, meta: `${t("overdue")} · ${formatDate(action.dueDate, false)}`, body: action.owner || "" });
    }
  }
  for (const source of collections.sources || []) {
    const status = source.fileVerification?.status || "";
    if (["missing", "changed", "unverifiable"].includes(status)) {
      items.push({ title: source.title, meta: t("sourceFileVerification"), body: sourceFileVerificationMessage(source.fileVerification) });
    }
    const freshness = sourceStalenessState(source);
    if (["stale", "review_due"].includes(freshness)) {
      items.push({ title: source.title, meta: `${t("sourceFreshness")} · ${sourceStalenessLabel(freshness)}`, body: t("staleSourceWarning") });
    }
  }
  for (const conflict of collections.conflicts || []) {
    if (["unresolved", "under_review"].includes(conflict.status)) {
      items.push({ title: conflict.title, meta: `${t("conflictRegister")} · ${conflictStatusLabel(conflict.status)}`, body: conflict.description || conflict.linkedItems || "" });
    }
  }
  for (const question of collections.questions || []) {
    items.push({ title: question.question, meta: t("openQuestion"), body: question.context || "" });
  }
  return items;
}

function projectHandoffPeople(project) {
  const items = [];
  for (const role of project.projectRoles || []) {
    if (role.status === "archived") continue;
    items.push({
      title: actorDisplay(role.actorId),
      meta: `${t("projectRole")}: ${actorRoleLabel(role.role)}`,
      body: role.reason || ""
    });
  }
  for (const item of projectIntegrityObjects(project)) {
    for (const assignment of item.object.assignments || []) {
      if (assignment.status === "archived") continue;
      items.push({
        title: actorDisplay(assignment.actorId),
        meta: `${assignmentRoleLabel(assignment.role)} · ${item.objectType}`,
        body: objectLabel(item.objectType, item.object)
      });
    }
  }
  return items;
}

function projectHandoffSources(sources = []) {
  return sortNewest(sources.filter((source) => source.status !== "archived"), "dateAdded")
    .sort((a, b) => sourceTrustRank(a) - sourceTrustRank(b))
    .slice(0, 8)
    .map((source) => ({
      title: source.title,
      meta: `${source.sourceType || t("source")} · ${sourceTrustLabel(source.trustLevel)} · ${sourceStalenessLabel(sourceStalenessState(source))} · ${trustBoundaryLabel(trustBoundaryForRecord("Source", source))} · ${sourceFileStatusLabel(source.fileVerification?.status || "unverifiable")}`,
      body: source.summary || source.location || source.localFile?.name || ""
    }));
}

function sourceTrustRank(source) {
  const ranks = {
    primary: 0,
    supporting: 1,
    unverified: 2,
    conflicting: 3,
    superseded: 4
  };
  const trustRank = ranks[normalizeSourceTrustLevel(source.trustLevel)] ?? 2;
  const verificationBonus = source.fileVerification?.status === "verified" ? -0.25 : 0;
  const freshnessPenalty = { current: 0, review_due: 0.5, not_reviewed: 1, stale: 2 }[sourceStalenessState(source)] || 0;
  return trustRank + verificationBonus + freshnessPenalty;
}

function projectHandoffAiItems(project) {
  const orders = (store.aiWorkOrders || []).filter((order) => order.projectId === project.id && !["completed", "archived"].includes(order.status));
  const items = orders.map((order) => ({
    title: order.title,
    meta: `${t("contextPackPreset")}: ${contextPackPresetLabel(order.contextPreset)} · ${t("status")}: ${aiWorkOrderStatusLabel(order.status)}`,
    body: order.task
  }));
  items.push({ title: t("aiAllowedHelp"), meta: t("approvalPolicyHuman"), body: t("handoffAiBoundary") });
  return items;
}

function renderProjectMap(project, collections) {
  const incoming = findIncomingProjectRelationships(project);
  const outgoingProjectLinks = collections.relationships.filter((relationship) => relationship.targetProjectId);
  const sourceCount = collections.sources.length;
  const extractCount = collections.sources.reduce((total, source) => total + (source.extracts || []).filter((extract) => extract.status !== "archived").length, 0);
  const imageCount = listFullProjectImages(project).length;
  return `
    <section class="project-map">
      <p class="view-subtitle">${escapeHtml(t("projectMapSubtitle"))}</p>
      <article class="panel strong map-center">
        <p class="meta-label">${escapeHtml(t("project"))}</p>
        <h2>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h2>
        <p class="item-body">${escapeDisplay(project.currentSummary || project.currentStatus || t("noCurrentSummaryRecorded"))}</p>
        <div class="map-stat-row">
          ${renderMapStat(t("health"), healthFlagLabel(project.healthFlag))}
          ${renderMapStat(t("relationships"), collections.relationships.length)}
          ${renderMapStat(t("conflictRegister"), (collections.conflicts || []).length)}
          ${renderMapStat(t("sourcesLabel"), sourceCount)}
          ${renderMapStat(t("extractsLabel"), extractCount)}
          ${renderMapStat(t("imagesLabel"), imageCount)}
        </div>
      </article>

      <section class="map-grid">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("linkedProjects"))}</h2>
          </div>
          ${renderRelationshipMapSection(t("outgoingLinks"), outgoingProjectLinks, "outgoing", project)}
          ${renderRelationshipMapSection(t("incomingLinks"), incoming, "incoming", project)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("evidenceTrail"))}</h2>
          </div>
          ${renderEvidenceMap(collections.sources)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("unresolvedWork"))}</h2>
          </div>
          ${renderUnresolvedMap(collections.questions, collections.actions)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("recentDecisions"))}</h2>
          </div>
          ${renderDecisionList(recent(collections.decisions, 5), project)}
        </article>
      </section>
    </section>
  `;
}

function renderMapStat(label, value) {
  return `
    <div class="map-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeDisplay(value, DISPLAY_META_LIMIT)}</strong>
    </div>
  `;
}

function findIncomingProjectRelationships(project) {
  const incoming = [];
  const projectKey = nameKey(project.name);
  for (const candidate of store.projects || []) {
    if (candidate.id === project.id || candidate.archived) continue;
    for (const relationship of candidate.relationships || []) {
      if (relationship.status === "archived") continue;
      const targetsProject = relationship.targetProjectId === project.id || (!relationship.targetProjectId && nameKey(relationship.target) === projectKey);
      if (targetsProject) incoming.push({ ...relationship, sourceProjectId: candidate.id, sourceProjectName: candidate.name });
    }
  }
  return sortNewest(incoming, "createdAt");
}

function renderRelationshipMapSection(title, relationships, direction, currentProject) {
  if (!relationships.length) return `<div class="map-subsection"><p class="meta-label">${escapeHtml(title)}</p>${emptyText(t("noLinkedProjects"))}</div>`;
  return `
    <div class="map-subsection">
      <p class="meta-label">${escapeHtml(title)}</p>
      <div class="list">
        ${relationships.map((relationship) => renderRelationshipMapItem(relationship, direction, currentProject)).join("")}
      </div>
    </div>
  `;
}

function renderRelationshipMapItem(relationship, direction, currentProject) {
  const relatedProjectId = direction === "incoming" ? relationship.sourceProjectId : relationship.targetProjectId;
  const relatedProjectName = direction === "incoming" ? relationship.sourceProjectName : relationshipTargetLabel(relationship);
  const canOpen = relatedProjectId && store.projects.some((project) => project.id === relatedProjectId);
  return `
    <div class="map-link-item">
      <div>
        <p class="item-title">${escapeDisplay(relatedProjectName || t("relatedProjectOrEntity"), DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">${escapeDisplay(relationship.relationshipType || t("related"), DISPLAY_META_LIMIT)}${relationship.notes ? ` · ${escapeDisplay(relationship.notes, DISPLAY_META_LIMIT)}` : ""}</p>
      </div>
      ${canOpen ? `<button class="btn secondary compact" data-action="open-project" data-project-id="${relatedProjectId}">${escapeHtml(t("open"))}</button>` : ""}
    </div>
  `;
}

function renderEvidenceMap(sources) {
  if (!sources.length) return emptyText(t("noEvidenceRecorded"));
  return `
    <div class="list">
      ${sources.map((source) => {
        const extracts = (source.extracts || []).filter((extract) => extract.status !== "archived");
        return `
          <div class="map-evidence-item">
            <p class="item-title">${escapeDisplay(source.title, DISPLAY_META_LIMIT)}</p>
            <p class="item-meta">${escapeDisplay(source.sourceType || t("unknown"), DISPLAY_META_LIMIT)} · ${escapeHtml(sourceTrustLabel(source.trustLevel))} · ${escapeHtml(sourceStalenessLabel(sourceStalenessState(source)))} · ${escapeHtml(trustBoundaryLabel(trustBoundaryForRecord("Source", source)))} · ${escapeHtml(formatDate(source.dateAdded))} · ${extracts.length} ${escapeHtml(t("extractsLabel"))}</p>
            ${source.summary ? `<p class="item-body">${escapeDisplay(source.summary, DISPLAY_META_LIMIT)}</p>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderUnresolvedMap(questions, actions) {
  const items = [
    ...questions.map((question) => ({ type: t("openQuestion"), title: question.question, meta: question.context || t("noContextRecorded") })),
    ...actions.map((action) => ({ type: t("nextAction"), title: action.action, meta: `${action.owner || t("unknown")} · ${action.dueDate ? formatDate(action.dueDate, false) : t("noDueDate")}` }))
  ];
  if (!items.length) return emptyText(`${t("noOpenQuestions")} ${t("noNextActions")}`);
  return `
    <div class="list">
      ${items.slice(0, 8).map((item) => `
        <div class="map-evidence-item">
          <p class="item-title">${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
          <p class="item-meta">${escapeHtml(item.type)} · ${escapeDisplay(item.meta, DISPLAY_META_LIMIT)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function normalizeDecisionRelationType(type = "") {
  return DECISION_RELATION_TYPES.includes(type) ? type : "";
}

function decisionRelationLabel(type = "") {
  if (type === "supersedes") return t("supersedes");
  if (type === "replaces") return t("replaces");
  return t("decisionNoRelationship");
}

function decisionRelationTypeOptions(selected = "") {
  const safeSelected = normalizeDecisionRelationType(selected);
  return [
    ["", t("decisionNoRelationship")],
    ["supersedes", t("supersedesDecision")],
    ["replaces", t("replacesDecision")]
  ].map(([value, label]) => `<option value="${value}" ${value === safeSelected ? "selected" : ""}>${escapeHtml(label)}</option>`).join("");
}

function relatedDecisionOptions(project, selectedId = "", excludedId = "") {
  const decisions = sortNewest((project.decisions || []).filter((decision) => decision.id !== excludedId), "date");
  return [
    `<option value="">${escapeHtml(t("decisionNoRelationship"))}</option>`,
    ...decisions.map((decision) => `<option value="${escapeHtml(decision.id)}" ${decision.id === selectedId ? "selected" : ""}>${escapeDisplay(decision.text, DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(decision.date, false))}</option>`)
  ].join("");
}

function decisionRelationFields(project, decision = {}) {
  return `
    <div class="two-col">
      <div class="field">
        <label for="relationType">${escapeHtml(t("decisionRelationship"))}</label>
        <select id="relationType" name="relationType">${decisionRelationTypeOptions(decision.relationType || "")}</select>
      </div>
      <div class="field">
        <label for="relatedDecisionId">${escapeHtml(t("decision"))}</label>
        <select id="relatedDecisionId" name="relatedDecisionId">${relatedDecisionOptions(project, decision.relatedDecisionId || "", decision.id || "")}</select>
      </div>
    </div>
  `;
}

function validateDecisionRelation(data, form) {
  if (!normalizeDecisionRelationType(data.relationType) || data.relatedDecisionId) return true;
  const field = form.querySelector('[name="relatedDecisionId"]');
  field?.setCustomValidity(t("validationRelatedDecisionRequired"));
  field?.reportValidity();
  field?.setCustomValidity("");
  return false;
}

function decisionById(project, decisionId = "") {
  return (project.decisions || []).find((decision) => decision.id === decisionId) || null;
}

function renderDecisionRelations(project, decision) {
  const links = [];
  if (decision.relatedDecisionId) {
    const related = decisionById(project, decision.relatedDecisionId);
    links.push({ label: `${decisionRelationLabel(decision.relationType)}: ${related?.text || t("missingDecision")}`, objectId: related?.id || "" });
  }
  for (const candidate of project.decisions || []) {
    if (candidate.relatedDecisionId !== decision.id) continue;
    const reverseLabel = candidate.relationType === "replaces" ? t("replacedBy") : t("supersededBy");
    links.push({ label: `${reverseLabel}: ${candidate.text}`, objectId: candidate.id });
  }
  if (!links.length) return "";
  return `<div class="decision-relations">${links.map((link) => link.objectId ? renderObjectReferenceButton(project.id, "Decision", link.objectId, link.label) : `<p class="item-meta">${escapeDisplay(link.label, DISPLAY_META_LIMIT)}</p>`).join("")}</div>`;
}

function renderDecisionList(decisions, project = getProject()) {
  if (!decisions.length) return emptyText(t("noDecisionsRecorded"));
  return `<div class="list">${decisions.map((decision) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(decision.text)}</p>
      <p class="item-body">${escapeDisplay(decision.reason)}</p>
      <p class="item-meta">${escapeHtml(actorDisplay(decision.actorId))} · ${escapeHtml(formatDate(decision.date))} · ${escapeHtml(decision.confidence)}</p>
      ${project ? renderDecisionRelations(project, decision) : ""}
      ${renderAssignmentsSummary(decision)}
      ${renderCommentsSummary(decision)}
      ${renderAttachedSources(decision)}
      ${renderAttachedImages(decision)}
      ${renderObjectActions("Decision", decision.id, decision.archived)}
    </div>
  `).join("")}</div>`;
}

function renderFactList(facts) {
  if (!facts.length) return emptyText(t("noFactsRecorded"));
  return `<div class="list">${facts.map((fact) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(fact.statement)}</p>
      ${fact.source ? `<p class="item-body">${escapeHtml(t("source"))}: ${escapeDisplay(fact.source)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(fact.actorId))} · ${escapeHtml(formatDate(fact.createdAt))} · ${escapeHtml(fact.confidence || t("unknown"))}</p>
      ${renderAssignmentsSummary(fact)}
      ${renderCommentsSummary(fact)}
      ${renderAttachedSources(fact)}
      ${renderAttachedImages(fact)}
      ${renderObjectActions("Fact", fact.id, fact.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderConflictList(conflicts) {
  if (!conflicts.length) return emptyText(t("noConflictsRecorded"));
  return `<div class="list">${conflicts.map((conflict) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(conflict.title, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("conflictStatus"))}: <span class="pill conflict-${escapeHtml(normalizeConflictStatus(conflict.status))}">${escapeHtml(conflictStatusLabel(conflict.status))}</span> · ${escapeHtml(t("created"))}: ${escapeHtml(formatDate(conflict.noticedAt))}</p>
      ${conflict.description ? `<p class="item-body">${escapeDisplay(conflict.description)}</p>` : ""}
      ${conflict.linkedItems ? `<p class="item-meta">${escapeHtml(t("linkedItems"))}: ${escapeDisplay(conflict.linkedItems, DISPLAY_META_LIMIT)}</p>` : ""}
      ${conflict.resolution ? `<p class="item-body">${escapeHtml(t("resolution"))}: ${escapeDisplay(conflict.resolution)}</p>` : ""}
      ${renderAssignmentsSummary(conflict)}
      ${renderCommentsSummary(conflict)}
      ${renderAttachedSources(conflict)}
      ${renderAttachedImages(conflict)}
      ${renderObjectActions("Conflict", conflict.id, conflict.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderSourceList(sources, project) {
  if (!sources.length) return emptyText(t("noSourcesRecorded"));
  return `<div class="list">${sources.map((source) => {
    const extracts = sortNewest(source.extracts.filter((extract) => extract.status !== "archived"));
    return `
      <div class="item">
        <p class="item-title">${escapeDisplay(source.title, DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">${escapeHtml(t("type"))}: ${escapeDisplay(source.sourceType || t("unknown"), DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">${escapeHtml(t("sourceTrustLevel"))}: <span class="pill source-trust-${escapeHtml(normalizeSourceTrustLevel(source.trustLevel))}">${escapeHtml(sourceTrustLabel(source.trustLevel))}</span></p>
        ${renderSourceFreshness(source)}
        <p class="item-meta">${escapeHtml(t("trustBoundary"))}: ${renderTrustBoundaryLabel("Source", source)}</p>
        <p class="item-meta">${escapeHtml(t("trustBoundaryEvidenceNotice"))}</p>
        <p class="item-meta">${escapeHtml(t("dateAdded"))}: ${escapeHtml(formatDate(source.dateAdded))}</p>
        <p class="item-meta">${escapeHtml(t("actor"))}: ${escapeHtml(actorDisplay(source.actorId))}</p>
        ${renderLinkedUsers(source.linkedActorIds)}
        <p class="item-meta">${escapeHtml(t("project"))}: ${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</p>
        ${source.location ? `<p class="item-meta">${escapeHtml(t("location"))}: ${escapeDisplay(source.location, DISPLAY_META_LIMIT)}</p>` : ""}
        ${source.localFile ? `<p class="item-meta">${escapeHtml(t("localFile"))}: ${escapeDisplay(source.localFile.name, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(source.localFile.size))}${source.localFile.lastModified ? ` · ${escapeHtml(t("modified"))} ${escapeHtml(formatDate(source.localFile.lastModified))}` : ""}</p>` : ""}
        ${renderSourceFileVerification(source)}
        ${source.summary ? `<p class="item-body">${escapeDisplay(source.summary)}</p>` : ""}
        ${source.tags?.length ? `<p class="item-meta">${escapeHtml(t("tags"))}: ${escapeDisplay(tagsToText(source.tags), DISPLAY_META_LIMIT)}</p>` : ""}
        ${renderAssignmentsSummary(source)}
        ${renderCommentsSummary(source)}
        <div class="item-actions">
          <button class="btn secondary compact" data-action="verify-source-file" data-source-id="${source.id}">${escapeHtml(t("verifyFile"))}</button>
          <button class="btn secondary compact" data-action="review-source-freshness" data-source-id="${source.id}">${escapeHtml(t("reviewFreshness"))}</button>
          <button class="btn secondary compact" data-action="add-extract" data-source-id="${source.id}">${escapeHtml(t("addExtract"))}</button>
          <button class="btn secondary compact" data-action="read-file-extract" data-source-id="${source.id}">${escapeHtml(t("readFileExtract"))}</button>
          <button class="btn secondary compact" data-action="suggest-extract" data-source-id="${source.id}">${escapeHtml(t("suggestExtract"))}</button>
        </div>
        ${renderObjectActions("Source", source.id, source.status === "archived")}
        ${renderExtractList(recent(extracts, 3))}
      </div>
    `;
  }).join("")}</div>`;
}

function renderSourceFileVerification(source) {
  if (!source.fileVerification) return "";
  const verification = source.fileVerification;
  return `
    <p class="item-meta">
      ${escapeHtml(t("sourceFileVerification"))}:
      <span class="pill source-file-${escapeHtml(verification.status || "unverifiable")}">${escapeHtml(sourceFileStatusLabel(verification.status))}</span>
      ${verification.checkedAt ? ` · ${escapeHtml(t("lastVerified"))} ${escapeHtml(formatDate(verification.checkedAt))}` : ""}
      ${verification.checkedBy ? ` · ${escapeHtml(actorDisplay(verification.checkedBy))}` : ""}
    </p>
    ${verification.reason ? `<p class="item-meta">${escapeDisplay(verification.reason, DISPLAY_META_LIMIT)}</p>` : ""}
  `;
}

function sourceFileStatusLabel(status = "unverifiable") {
  if (status === "verified") return t("fileVerified");
  if (status === "changed") return t("fileChanged");
  if (status === "missing") return t("fileMissing");
  return t("fileUnverifiable");
}

function sourceFileVerificationMessage(verification = {}) {
  return `${sourceFileStatusLabel(verification.status)}${verification.reason ? `: ${verification.reason}` : ""}`;
}

function renderExtractList(extracts) {
  if (!extracts.length) return "";
  return `<div class="list nested-list">${extracts.map((extract) => `
    <div class="item">
      <p class="item-title">${escapeHtml(t("extract"))}</p>
      <p class="item-meta">${escapeHtml(t("mode"))}: ${escapeHtml(extractModeLabel(extract.extractMode))}</p>
      <p class="item-meta">${escapeHtml(t("trustBoundary"))}: ${renderTrustBoundaryLabel("Extract", extract)}</p>
      ${extract.suggestionStatus ? `<p class="item-meta">${escapeHtml(t("suggestionStatus"))}: ${escapeHtml(extract.suggestionStatus)}</p>` : ""}
      ${extract.suggestedBy ? `<p class="item-meta">${escapeHtml(t("suggestedBy"))}: ${escapeHtml(extract.suggestedBy)}</p>` : ""}
      ${extract.extractedFromFile ? `<p class="item-meta">${escapeHtml(t("file"))}: ${escapeDisplay(extract.extractedFromFile.fileName, DISPLAY_META_LIMIT)}${extract.extractedFromFile.truncated ? ` · ${escapeHtml(t("truncated"))}` : ""}</p>` : ""}
      <p class="item-body">${escapeDisplay(extract.text)}</p>
      ${extract.summary ? `<p class="item-body">${escapeHtml(t("summary"))}: ${escapeDisplay(extract.summary)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(extract.actorId))} · ${escapeHtml(formatDate(extract.dateAdded))}</p>
      ${extract.tags?.length ? `<p class="item-meta">${escapeHtml(t("tags"))}: ${escapeDisplay(tagsToText(extract.tags), DISPLAY_META_LIMIT)}</p>` : ""}
      ${renderAssignmentsSummary(extract)}
      ${renderCommentsSummary(extract)}
      ${renderAttachedSources(extract)}
      <div class="item-actions"><button class="btn secondary compact" data-action="create-draft-project" data-object-id="${extract.id}">${escapeHtml(t("createDraftProject"))}</button></div>
      ${extract.extractMode === "ai_suggested" && extract.suggestionStatus === "pending_approval" ? `<div class="item-actions"><button class="btn secondary compact" data-action="approve-extract" data-object-id="${extract.id}">${escapeHtml(t("approveExtract"))}</button></div>` : ""}
      ${renderObjectActions("Extract", extract.id, extract.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderRelationshipList(relationships) {
  if (!relationships.length) return emptyText(t("noRelationshipsRecorded"));
  return `<div class="list">${relationships.map((relationship) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(relationshipTargetLabel(relationship))}</p>
      <p class="item-meta">${escapeDisplay(relationship.relationshipType || t("related"), DISPLAY_META_LIMIT)} · ${escapeHtml(actorDisplay(relationship.actorId))} · ${escapeHtml(formatDate(relationship.createdAt))}</p>
      ${relationship.targetProjectId ? renderObjectReferenceButton(relationship.targetProjectId, "Project", relationship.targetProjectId, t("openReferencedObject")) : ""}
      ${relationship.notes ? `<p class="item-body">${escapeDisplay(relationship.notes)}</p>` : ""}
      ${renderAssignmentsSummary(relationship)}
      ${renderCommentsSummary(relationship)}
      ${renderAttachedSources(relationship)}
      ${renderAttachedImages(relationship)}
      ${renderObjectActions("Relationship", relationship.id, relationship.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderDraftProjectList(draftProjects) {
  if (!draftProjects.length) return emptyText(t("noDraftProjects"));
  return `<div class="list">${draftProjects.map((draftProject) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(draftProject.name, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("created"))}: ${escapeHtml(formatDate(draftProject.createdAt))} · ${escapeHtml(t("source"))}: ${escapeDisplay(draftProject.sourceTitle || t("notRecorded"), DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(t("status"))}: ${escapeHtml(draftProject.status || t("draft"))}${draftProject.approvedAt ? ` · ${escapeHtml(t("approved"))} ${escapeHtml(formatDate(draftProject.approvedAt))}` : ""}</p>
      <p class="item-body">${escapeDisplay(draftProject.draft || t("noDraftTextRecorded"))}</p>
      ${renderDraftReviewFlags(draftProject)}
      <p class="item-meta">${escapeHtml(t("airlockCompleteness"))}</p>
      ${renderFlagPills(draftAirlockChecks(draftProject))}
      ${renderAssignmentsSummary(draftProject)}
      ${renderCommentsSummary(draftProject)}
      ${renderAttachedSources(draftProject)}
      ${renderAttachedImages(draftProject)}
      <div class="item-actions">
        <button class="btn secondary compact" data-action="edit-object" data-object-type="DraftProject" data-object-id="${draftProject.id}">${escapeHtml(t("review"))}</button>
        <button class="btn secondary compact" data-action="approve-draft-project" data-object-id="${draftProject.id}" ${draftProject.status === "approved" || !allRequiredFlagsPass(draftAirlockChecks(draftProject)) ? "disabled" : ""}>${escapeHtml(t("approveDraft"))}</button>
        <button class="btn secondary compact" data-action="archive-object" data-object-type="DraftProject" data-object-id="${draftProject.id}" ${draftProject.status === "archived" ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
        <button class="btn secondary compact" data-action="view-object-history" data-object-type="DraftProject" data-object-id="${draftProject.id}">${escapeHtml(t("viewHistory"))}</button>
      </div>
    </div>
  `).join("")}</div>`;
}

function renderDraftReviewFlags(draftProject) {
  const flags = normalizeDraftReviewFlags(draftProject.reviewFlags);
  const labels = {
    factsReviewed: t("factsReviewed"),
    decisionsReviewed: t("decisionsReviewed"),
    questionsReviewed: t("questionsReviewed"),
    actionsReviewed: t("actionsReviewed"),
    relationshipsReviewed: t("relationshipsReviewed"),
    readyForApproval: t("readyForApproval")
  };
  return `
    <div class="review-flags">
      ${DRAFT_REVIEW_FLAGS.map((flag) => `<span class="pill ${flags[flag] ? "review-done" : "review-open"}">${escapeHtml(labels[flag])}: ${flags[flag] ? escapeHtml(t("yes")) : escapeHtml(t("no"))}</span>`).join("")}
    </div>
  `;
}

function renderQuestionList(questions) {
  if (!questions.length) return emptyText(t("noOpenQuestions"));
  return `<div class="list">${questions.map((question) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(question.question)}</p>
      ${question.context ? `<p class="item-body">${escapeDisplay(question.context)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(question.actorId))} · ${escapeHtml(formatDate(question.createdAt))}</p>
      ${renderAssignmentsSummary(question)}
      ${renderCommentsSummary(question)}
      ${renderAttachedSources(question)}
      ${renderAttachedImages(question)}
      ${renderObjectActions("OpenQuestion", question.id, question.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderActionList(actions) {
  if (!actions.length) return emptyText(t("noNextActions"));
  return `<div class="list">${actions.map((action) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(action.action)}</p>
      <p class="item-meta">${escapeHtml(t("status"))}: ${escapeHtml(getActionStatus(action))}</p>
      <p class="item-meta">${escapeHtml(t("created"))}: ${escapeHtml(formatDate(action.createdAt))}</p>
      <p class="item-meta">${escapeHtml(t("due"))}: ${escapeHtml(action.dueDate ? formatDate(action.dueDate, false) : t("notSet"))}</p>
      <p class="item-meta">${escapeHtml(t("completed"))}: ${escapeHtml(action.completedAt ? formatDate(action.completedAt) : t("notCompleted"))}</p>
      <p class="item-meta">${action.owner ? `${escapeDisplay(action.owner, DISPLAY_META_LIMIT)} · ` : ""}${escapeHtml(actorDisplay(action.actorId))}</p>
      ${renderAssignmentsSummary(action)}
      ${renderCommentsSummary(action)}
      ${renderAttachedSources(action)}
      ${renderAttachedImages(action)}
      ${getActionStatus(action) === "open" ? `<div class="item-actions"><button class="btn secondary compact" data-action="mark-complete" data-object-id="${action.id}">${escapeHtml(t("markComplete"))}</button></div>` : ""}
      ${renderObjectActions("NextAction", action.id, action.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderObjectActions(objectType, objectId, archived = false) {
  const attachSource = canAttachSource(objectType)
    ? `<button class="btn secondary compact" data-action="attach-source" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("attachSource"))}</button>`
    : "";
  const attachImage = canAttachImage(objectType)
    ? `<button class="btn secondary compact" data-action="attach-image" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("attachImage"))}</button>`
    : "";
  const correction = !["Change", "DraftProject", "Extract"].includes(objectType)
    ? `<button class="btn secondary compact" data-action="propose-correction" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("proposeCorrection"))}</button>`
    : "";
  return `
    <div class="item-actions">
      <button class="btn secondary compact" data-action="open-object-detail" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("viewDetails"))}</button>
      <button class="btn secondary compact" data-action="edit-object" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("edit"))}</button>
      <details class="action-menu">
        <summary class="btn secondary compact">${escapeHtml(t("moreActions"))}</summary>
        <div class="action-menu-popover">
          <button class="btn secondary compact" data-action="assign-object" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("assignObject"))}</button>
          <button class="btn secondary compact" data-action="comment-object" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("reviewThread"))}</button>
          ${attachSource}
          ${attachImage}
          ${correction}
          <button class="btn secondary compact" data-action="archive-object" data-object-type="${objectType}" data-object-id="${objectId}" ${archived ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
          <button class="btn secondary compact" data-action="view-object-history" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("viewHistory"))}</button>
        </div>
      </details>
    </div>
  `;
}

function renderObjectDetailPanel(project) {
  if (!activeObjectDetail || activeObjectDetail.projectId !== project.id) return "";
  const object = getProjectObject(project, activeObjectDetail.objectType, activeObjectDetail.objectId);
  if (!object) return "";
  return `
    <div class="detail-backdrop" data-action="close-object-detail"></div>
    <aside class="object-detail-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(t("objectDetails"))}">
      <div class="detail-panel-head">
        <div>
          <p class="meta-label">${escapeHtml(activeObjectDetail.objectType)}</p>
          <h2 class="panel-title">${escapeDisplay(objectLabel(activeObjectDetail.objectType, object), DISPLAY_META_LIMIT)}</h2>
        </div>
        <button class="icon-btn" data-action="close-object-detail" aria-label="${escapeHtml(t("closeDetails"))}">×</button>
      </div>
      <div class="detail-panel-body">${renderObjectDetailContent(project, activeObjectDetail.objectType, object)}</div>
    </aside>
  `;
}

function renderObjectDetailContent(project, objectType, object) {
  if (objectType === "Decision") return renderDecisionList([object], project);
  if (objectType === "Fact") return renderFactList([object]);
  if (objectType === "Conflict") return renderConflictList([object]);
  if (objectType === "Source") return renderSourceList([object], project);
  if (objectType === "Extract") return renderExtractList([object]);
  if (objectType === "DraftProject") return renderDraftProjectList([object]);
  if (objectType === "Relationship") return renderRelationshipList([object]);
  if (objectType === "OpenQuestion") return renderQuestionList([object]);
  if (objectType === "NextAction") return renderActionList([object]);
  if (objectType === "Change") return renderHistoryItem(object);
  if (objectType === "Project") return `<p class="status-text">${escapeDisplay(project.currentStatus || t("noStatusRecorded"))}</p><p class="summary-text">${escapeDisplay(project.currentSummary || t("noCurrentSummaryRecorded"))}</p>${renderObjectActions("Project", project.id, project.archived)}`;
  return emptyText(t("notRecorded"));
}

function canAttachSource(objectType) {
  return !["Source", "Extract"].includes(objectType);
}

function canAttachImage(objectType) {
  return ["Project", "Decision", "Fact", "Conflict", "OpenQuestion", "NextAction", "Relationship", "DraftProject", "Change"].includes(objectType);
}

function renderAttachedSources(object) {
  const links = Array.isArray(object.sourceLinks) ? object.sourceLinks : [];
  if (!links.length) return "";
  return `
    <div class="attached-sources">
      <p class="item-meta">${escapeHtml(t("attachedSources"))}</p>
      ${links.map((link) => renderObjectReferenceButton(link.sourceProjectId || object.projectId || activeProjectId, "Source", link.sourceId, `${link.sourceTitle || t("source")} · ${formatDate(link.attachedAt)}`)).join("")}
    </div>
  `;
}

function renderObjectReferenceButton(projectId, objectType, objectId, label) {
  if (!projectId || !objectId) return `<p class="item-meta">${escapeDisplay(label, DISPLAY_META_LIMIT)}</p>`;
  return `<button class="object-reference-link" data-action="open-referenced-object" data-project-id="${escapeHtml(projectId)}" data-object-type="${escapeHtml(objectType)}" data-object-id="${escapeHtml(objectId)}">${escapeDisplay(label, DISPLAY_META_LIMIT)}</button>`;
}

function renderAttachedImages(object) {
  const images = Array.isArray(object.imageLinks) ? object.imageLinks : [];
  if (!images.length) return "";
  return `
    <div class="attached-images">
      <p class="item-meta">${escapeHtml(t("attachedImages"))}</p>
      <div class="image-strip">
        ${images.map((image) => `
          <button class="image-thumb" type="button" data-action="view-image" data-object-type="${escapeHtml(image.attachedToType || "")}" data-object-id="${escapeHtml(image.attachedToId || "")}" data-image-id="${escapeHtml(image.id)}" aria-label="${escapeHtml(t("viewImage").replace("{name}", image.fileName || t("attachedImageAlt")))}">
            ${image.dataUrl ? `<img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.caption || image.fileName || t("attachedImageAlt"))}">` : `<span>${escapeDisplay(image.fileName || t("attachedImage"), DISPLAY_META_LIMIT)}</span>`}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function filterObjectHistory(changes, filter) {
  return changes.filter((change) => {
    if (filter.objectType === "Change") return change.id === filter.objectId;
    const details = change.details || {};
    if (filter.objectType === "Source") {
      return (
        (details.objectType === "Source" && details.objectId === filter.objectId) ||
        details.sourceId === filter.objectId ||
        details.attachedSourceId === filter.objectId
      );
    }
    return details.objectType === filter.objectType && details.objectId === filter.objectId;
  });
}

function historyEventTypes(changes) {
  return [...new Set(changes.map((change) => change.summary).filter(Boolean))].sort();
}

function filterHistoryByEventType(changes, eventType) {
  if (!eventType || eventType === "all") return changes;
  return changes.filter((change) => change.summary === eventType);
}

function renderActivityList(changes) {
  if (!changes.length) return emptyText(t("noRecentActivity"));
  return `<div class="list">${changes.map((change) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(change.summary, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(actorDisplay(change.actorId, change.actorName))} · ${escapeHtml(formatDate(change.timestamp))}</p>
    </div>
  `).join("")}</div>`;
}

function defaultChangesSinceDate() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return localDateInputValue(date);
}

function localDateInputValue(date = new Date()) {
  const safeDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(safeDate.getTime())) return "";
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function changesSinceDateValue(value = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : defaultChangesSinceDate();
}

function filterChangesSince(changes = [], sinceDate = "") {
  const safeDate = changesSinceDateValue(sinceDate);
  const since = Date.parse(`${safeDate}T00:00:00`);
  return changes.filter((change) => {
    const timestamp = Date.parse(change.timestamp || "");
    return Number.isFinite(timestamp) && timestamp >= since;
  });
}

function renderWhatChangedSince(project, changes = []) {
  const safeDate = changesSinceDateValue(activeChangesSinceDate);
  const filtered = filterChangesSince(changes, safeDate);
  const objectTypes = new Set(filtered.map((change) => change.details?.objectType).filter(Boolean));
  return `
    <section class="stack">
      <section class="view-head compact-head">
        <div>
          <h2 class="panel-title">${escapeHtml(t("whatChangedSince"))}</h2>
          <p class="view-subtitle">${escapeHtml(t("whatChangedSinceSubtitle"))}</p>
        </div>
        <label class="filter-label">
          ${escapeHtml(t("sinceDate"))}
          <input type="date" value="${escapeHtml(safeDate)}" max="${escapeHtml(localDateInputValue())}" data-changes-since-date>
        </label>
      </section>
      <section class="meta-grid">
        <div class="meta-card">
          <p class="meta-label">${escapeHtml(t("changesFound"))}</p>
          <p class="meta-value">${escapeHtml(String(filtered.length))}</p>
        </div>
        <div class="meta-card">
          <p class="meta-label">${escapeHtml(t("currentObjects"))}</p>
          <p class="meta-value">${escapeHtml(String(objectTypes.size))}</p>
        </div>
        <div class="meta-card">
          <p class="meta-label">${escapeHtml(t("trustBoundary"))}</p>
          <p class="meta-value">${renderTrustBoundaryLabel("ContextPack")}</p>
        </div>
      </section>
      <section class="history-list">
        ${filtered.length ? filtered.map((change) => renderHistoryItem(change, { readOnly: true })).join("") : emptyText(t("noChangesSince"))}
      </section>
    </section>
  `;
}

function renderHistoryItem(change, options = {}) {
  return `
    <article class="history-item">
      <div class="history-time">
        <strong>${escapeHtml(formatDate(change.timestamp))}</strong><br>
        ${escapeHtml(actorDisplay(change.actorId, change.actorName))}
      </div>
      <div>
        <p class="history-title">${escapeDisplay(change.summary, DISPLAY_META_LIMIT)}</p>
        <p class="history-detail">${escapeHtml(t("historyReason"))}: ${escapeDisplay(change.reason)}</p>
        <p class="history-detail">${escapeHtml(t("historyChanged"))}: ${escapeDisplay(describeDetails(change.details))}</p>
        <p class="history-detail">${escapeHtml(t("howChanged"))}: ${escapeHtml(change.howChanged || change.details?.origin || "human_ui")}</p>
        <p class="history-detail">${escapeHtml(t("languageAtChange"))}: ${escapeHtml(languageDisplayName(change.language || change.details?.language || DEFAULT_LANGUAGE))}</p>
        ${change.details?.objectType && change.details?.objectId ? renderObjectReferenceButton(change.projectId || activeProjectId, change.details.objectType, change.details.objectId, t("openReferencedObject")) : ""}
        ${renderAttachedImages(change)}
        ${options?.readOnly ? "" : `<div class="item-actions">
          <button class="btn secondary compact" data-action="attach-image" data-object-type="Change" data-object-id="${change.id}">${escapeHtml(t("attachImage"))}</button>
        </div>`}
      </div>
    </article>
  `;
}

function describeDetails(details = {}) {
  if (details.from !== undefined || details.to !== undefined) {
    return `From "${details.from || "empty"}" to "${details.to || "empty"}"`;
  }
  if (details.objectType && (details.objectTitle || details.objectText || details.objectId)) {
    const title = details.objectTitle || details.objectText || t("untitledObject");
    const idText = details.objectId ? ` [id: ${details.objectId}]` : "";
    return `${details.objectType}: ${title}${idText}`;
  }
  if (details.fields) {
    return Object.entries(details.fields)
      .map(([key, value]) => `${key}: ${value || "empty"}`)
      .join("; ");
  }
  return "Project state updated";
}

function objectLabel(objectType, object) {
  if (objectType === "Project") return object.name;
  if (objectType === "Decision") return object.text;
  if (objectType === "Fact") return object.statement;
  if (objectType === "Conflict") return object.title;
  if (objectType === "Source") return object.title;
  if (objectType === "Extract") return object.text;
  if (objectType === "DraftProject") return object.name;
  if (objectType === "Relationship") return relationshipTargetLabel(object);
  if (objectType === "OpenQuestion") return object.question;
  if (objectType === "NextAction") return object.action;
  if (objectType === "Change") return object.summary;
  return objectType;
}

function emptyText(text) {
  return `
    <div class="inline-empty">
      <p>${escapeDisplay(text, DISPLAY_META_LIMIT)}</p>
    </div>
  `;
}

function safeFileName(value = "project") {
  return String(value)
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "project";
}

function exportProjectJson(projectId = activeProjectId) {
  const project = getProject(projectId);
  if (!project) return;
  const payload = {
    exportedAt: nowIso(),
    app: "Project State",
    storageKey: STORAGE_KEY,
    project
  };
  downloadTextFile(`${safeFileName(project.name)}.project-state.json`, JSON.stringify(payload, null, 2), "application/json");
}

function exportProjectHandoff() {
  const project = getProject();
  if (!project) return;
  const pack = buildProjectContextPack(project, {
    preset: "handoff",
    ...CONTEXT_PACK_PRESETS.handoff
  });
  const text = buildProjectHandoffText(project, pack);
  const stamp = nowIso().replace(/[:.]/g, "-");
  downloadTextFile(`${safeFileName(project.name)}.handoff-${stamp}.md`, text, "text/markdown");
}

function buildProjectHandoffText(project, pack) {
  const sections = [
    `# ${project.name}`,
    `Generated: ${formatDate(pack.generatedAt)}`,
    "",
    `## ${t("whatThisProjectIs")}`,
    project.currentStatus || t("noStatusRecorded"),
    "",
    `## ${t("whyItMatters")}`,
    project.currentSummary || t("noCurrentSummaryRecorded"),
    "",
    `## ${t("recentDecisions")}`,
    markdownList(pack.recentDecisions, (item) => `${item.text || item.title || ""} - ${item.reason || ""}`),
    "",
    `## ${t("conflictRegister")}`,
    markdownList(pack.conflicts, (item) => `${item.title || ""} - ${item.description || ""} - ${conflictStatusLabel(item.status)}`),
    "",
    `## ${t("openQuestions")}`,
    markdownList(pack.openWork.questions, (item) => `${item.question || item.title || ""} - ${item.context || ""}`),
    "",
    `## ${t("nextActions")}`,
    markdownList(pack.openWork.actions, (item) => `${item.action || item.title || ""} - ${item.dueDate || t("noDueDate")}`),
    "",
    `## ${t("trustedSources")}`,
    markdownList(pack.evidence.sources, (item) => `${item.title || ""} - ${item.summary || item.location || ""}`),
    "",
    `## ${t("aiAllowedHelp")}`,
    t("handoffAiBoundary"),
    "",
    `## ${t("doNotTouch")}`,
    t("handoffDoNotTouchDefault")
  ];
  return sections.join("\n");
}

function markdownList(items = [], renderer) {
  if (!items.length) return `- ${t("notRecorded")}`;
  return items.map((item) => `- ${renderer(item).replace(/\s+/g, " ").trim()}`).join("\n");
}

function openContextPackModal() {
  const project = getProject();
  if (!project) return;
  showModal({
    title: t("contextPack"),
    submitText: t("exportContextPack"),
    body: `
      <p class="notice">${escapeHtml(t("contextPackNotice"))}</p>
      <div class="field">
        <label for="contextPreset">${escapeHtml(t("contextPackPreset"))}</label>
        <select id="contextPreset" name="contextPreset" data-context-preset>
          ${contextPackPresetOptions()}
        </select>
      </div>
      <p class="notice">${escapeHtml(t("contextPresetNotice"))}</p>
      <div class="field">
        <label for="contextScope">${escapeHtml(t("contextScope"))}</label>
        <select id="contextScope" name="contextScope">
          <option value="project">${escapeHtml(t("contextScopeProject"))}</option>
          <option value="related">${escapeHtml(t("contextScopeRelated"))}</option>
          <option value="sources">${escapeHtml(t("contextScopeSources"))}</option>
        </select>
      </div>
      <div class="field">
        <label for="contextBudget">${escapeHtml(t("contextBudget"))}</label>
        <select id="contextBudget" name="contextBudget">
          <option value="quick">${escapeHtml(t("budgetQuick"))}</option>
          <option value="normal" selected>${escapeHtml(t("budgetNormal"))}</option>
          <option value="deep">${escapeHtml(t("budgetDeep"))}</option>
        </select>
      </div>
      <div class="check-list">
        <label class="check-field">
          <input name="includeSources" type="checkbox" checked>
          <span>${escapeHtml(t("includeSources"))}</span>
        </label>
        <label class="check-field">
          <input name="includeOpenWork" type="checkbox" checked>
          <span>${escapeHtml(t("includeOpenWork"))}</span>
        </label>
        <label class="check-field">
          <input name="includeHistory" type="checkbox" checked>
          <span>${escapeHtml(t("includeHistory"))}</span>
        </label>
        <label class="check-field">
          <input name="includeDecisions" type="checkbox" checked>
          <span>${escapeHtml(t("includeDecisions"))}</span>
        </label>
        <label class="check-field">
          <input name="includeFacts" type="checkbox" checked>
          <span>${escapeHtml(t("includeFacts"))}</span>
        </label>
        <label class="check-field">
          <input name="includeRelationships" type="checkbox" checked>
          <span>${escapeHtml(t("includeRelationships"))}</span>
        </label>
      </div>
    `,
    onSubmit(data, form) {
      const options = resolveContextPackOptions(data);
      const pack = buildProjectContextPack(project, {
        preset: options.preset,
        scope: data.contextScope,
        budget: data.contextBudget,
        includeSources: data.includeSources === "on",
        includeOpenWork: data.includeOpenWork === "on",
        includeHistory: data.includeHistory === "on",
        includeDecisions: data.includeDecisions === "on",
        includeFacts: data.includeFacts === "on",
        includeRelationships: data.includeRelationships === "on",
        ...options
      });
      const stamp = nowIso().replace(/[:.]/g, "-");
      downloadTextFile(`${safeFileName(project.name)}.context-pack-${stamp}.json`, JSON.stringify(pack, null, 2), "application/json");
      return true;
    }
  });
  const form = document.querySelector(".modal-backdrop .form");
  applyContextPresetToForm(form, "handoff");
}

function contextPackPresetOptions() {
  return CONTEXT_PACK_PRESET_KEYS.map((key) => `<option value="${escapeHtml(key)}" ${key === "handoff" ? "selected" : ""}>${escapeHtml(contextPackPresetLabel(key))}</option>`).join("");
}

function contextPackPresetLabel(key) {
  const labels = {
    current_state: t("contextPresetCurrentState"),
    recent_decisions: t("contextPresetRecentDecisions"),
    handoff: t("contextPresetHandoff"),
    source_research: t("contextPresetSourceResearch"),
    codex_implementation: t("contextPresetCodexImplementation"),
    custom: t("contextPresetCustom")
  };
  return labels[key] || t("contextPresetCustom");
}

function resolveContextPackOptions(data = {}) {
  const preset = CONTEXT_PACK_PRESET_KEYS.includes(data.contextPreset) ? data.contextPreset : "handoff";
  if (preset === "custom") {
    return {
      preset,
      scope: data.contextScope,
      budget: data.contextBudget,
      includeSources: data.includeSources === "on",
      includeOpenWork: data.includeOpenWork === "on",
      includeHistory: data.includeHistory === "on",
      includeDecisions: data.includeDecisions === "on",
      includeFacts: data.includeFacts === "on",
      includeRelationships: data.includeRelationships === "on"
    };
  }
  return { preset, ...CONTEXT_PACK_PRESETS[preset] };
}

function applyContextPresetToForm(form, presetKey) {
  const preset = CONTEXT_PACK_PRESETS[presetKey];
  if (!form || !preset) return;
  const setValue = (name, value) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) field.value = value;
  };
  const setChecked = (name, value) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) field.checked = Boolean(value);
  };
  setValue("contextScope", preset.scope);
  setValue("contextBudget", preset.budget);
  setChecked("includeSources", preset.includeSources);
  setChecked("includeOpenWork", preset.includeOpenWork);
  setChecked("includeHistory", preset.includeHistory);
  setChecked("includeDecisions", preset.includeDecisions);
  setChecked("includeFacts", preset.includeFacts);
  setChecked("includeRelationships", preset.includeRelationships);
}

function contextBudgetConfig(budget = "normal") {
  const configs = {
    quick: { itemLimit: 3, textLimit: 700, chunkLimit: 6, chunkSize: 600 },
    normal: { itemLimit: 8, textLimit: 1200, chunkLimit: 16, chunkSize: 900 },
    deep: { itemLimit: 20, textLimit: 2500, chunkLimit: 48, chunkSize: 1200 }
  };
  return configs[budget] || configs.normal;
}

function buildProjectContextPack(project, options = {}) {
  const scope = ["project", "related", "sources"].includes(options.scope) ? options.scope : "project";
  const budget = ["quick", "normal", "deep"].includes(options.budget) ? options.budget : "normal";
  const config = contextBudgetConfig(budget);
  const includeSources = options.includeSources !== false || scope === "sources";
  const includeOpenWork = options.includeOpenWork !== false;
  const includeHistory = options.includeHistory !== false;
  const includeDecisions = options.includeDecisions !== false;
  const includeFacts = options.includeFacts !== false;
  const includeRelationships = options.includeRelationships !== false;
  const relatedProjects = scope === "related" ? relatedProjectBriefs(project, config) : [];
  return {
    app: "Project State",
    packType: "project-context-pack",
    packVersion: "0.1",
    preset: options.preset || "custom",
    presetLabel: contextPackPresetLabel(options.preset || "custom"),
    generatedAt: nowIso(),
    generatedBy: "local-ui",
    runtimeMode: currentStorageModeName(),
    trustBoundary: {
      state: trustBoundaryForRecord("ContextPack"),
      label: trustBoundaryLabel(trustBoundaryForRecord("ContextPack"))
    },
    rules: {
      sourceOfTruth: "Project State Core",
      use: "Context only. Suggestions must return through the Intake Airlock for human approval.",
      forbidden: "Do not treat this pack as authority to write directly to Core or Spine."
    },
    scope,
    budget,
    project: projectBrief(project, config),
    relatedProjects,
    currentState: {
      status: limitText(project.currentStatus || "", config.textLimit),
      summary: limitText(project.currentSummary || "", config.textLimit),
      health: normalizeHealthFlag(project.healthFlag)
    },
    recentDecisions: includeDecisions ? compactDecisions(project, config) : [],
    keyFacts: includeFacts ? compactFacts(project, config) : [],
    conflicts: compactConflicts(project, config),
    openWork: includeOpenWork ? compactOpenWork(project, config) : { questions: [], actions: [] },
    relationships: includeRelationships ? compactRelationships(project, config) : [],
    evidence: includeSources ? compactEvidence(project, config) : { sources: [], chunks: [] },
    recentHistory: includeHistory ? compactHistory(project, config) : [],
    proposalSchema: contextProposalSchema()
  };
}

function projectBrief(project, config) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt || "",
    updatedAt: project.updatedAt || "",
    updatedBy: actorDisplay(project.updatedBy),
    healthFlag: normalizeHealthFlag(project.healthFlag),
    currentStatus: limitText(project.currentStatus || "", config.textLimit),
    currentSummary: limitText(project.currentSummary || "", config.textLimit)
  };
}

function relatedProjectBriefs(project, config) {
  const incoming = findIncomingProjectRelationships(project);
  const ids = new Set();
  for (const relationship of project.relationships || []) {
    if (relationship.status !== "archived" && relationship.targetProjectId) ids.add(relationship.targetProjectId);
  }
  for (const relationship of incoming) {
    if (relationship.sourceProjectId) ids.add(relationship.sourceProjectId);
  }
  return [...ids]
    .map((projectId) => store.projects.find((candidate) => candidate.id === projectId && !candidate.archived))
    .filter(Boolean)
    .slice(0, config.itemLimit)
    .map((candidate) => projectBrief(candidate, config));
}

function compactDecisions(project, config) {
  return recent(sortNewest((project.decisions || []).filter((decision) => !decision.archived), "date"), config.itemLimit)
    .map((decision) => ({
      id: decision.id,
      text: limitText(decision.text || "", config.textLimit),
      reason: limitText(decision.reason || "", config.textLimit),
      date: decision.date || "",
      actor: actorDisplay(decision.actorId),
      confidence: decision.confidence || "",
      relationType: normalizeDecisionRelationType(decision.relationType),
      relatedDecisionId: decision.relatedDecisionId || "",
      relatedDecision: limitText(decisionById(project, decision.relatedDecisionId)?.text || "", config.textLimit)
    }));
}

function compactFacts(project, config) {
  return recent(sortNewest((project.facts || []).filter((fact) => fact.status !== "archived")), config.itemLimit)
    .map((fact) => ({
      id: fact.id,
      statement: limitText(fact.statement || "", config.textLimit),
      source: limitText(fact.source || "", config.textLimit),
      confidence: fact.confidence || "",
      createdAt: fact.createdAt || "",
      actor: actorDisplay(fact.actorId)
    }));
}

function compactConflicts(project, config) {
  return recent(sortNewest((project.conflicts || []).filter((conflict) => conflict.status !== "archived"), "noticedAt"), config.itemLimit)
    .map((conflict) => ({
      id: conflict.id,
      title: limitText(conflict.title || "", DISPLAY_META_LIMIT),
      description: limitText(conflict.description || "", config.textLimit),
      linkedItems: limitText(conflict.linkedItems || "", config.textLimit),
      status: normalizeConflictStatus(conflict.status),
      resolution: limitText(conflict.resolution || "", config.textLimit),
      noticedAt: conflict.noticedAt || "",
      noticedBy: actorDisplay(conflict.noticedBy)
    }));
}

function compactOpenWork(project, config) {
  return {
    questions: recent(sortNewest((project.openQuestions || []).filter((question) => question.status === "open")), config.itemLimit)
      .map((question) => ({
        id: question.id,
        question: limitText(question.question || "", config.textLimit),
        context: limitText(question.context || "", config.textLimit),
        createdAt: question.createdAt || "",
        actor: actorDisplay(question.actorId)
      })),
    actions: recent(sortNewest((project.nextActions || []).filter((action) => getActionStatus(action) === "open")), config.itemLimit)
      .map((action) => ({
        id: action.id,
        action: limitText(action.action || "", config.textLimit),
        owner: action.owner || "",
        status: getActionStatus(action),
        createdAt: action.createdAt || "",
        dueDate: action.dueDate || "",
        actor: actorDisplay(action.actorId)
      }))
  };
}

function compactRelationships(project, config) {
  const incoming = findIncomingProjectRelationships(project);
  return {
    outgoing: recent(sortNewest((project.relationships || []).filter((relationship) => relationship.status !== "archived"), "createdAt"), config.itemLimit)
      .map((relationship) => compactRelationship(project, relationship, "outgoing", config)),
    incoming: recent(incoming, config.itemLimit)
      .map((relationship) => compactRelationship(project, relationship, "incoming", config))
  };
}

function compactRelationship(project, relationship, direction, config) {
  return {
    id: relationship.id,
    direction,
    sourceProjectId: direction === "incoming" ? relationship.sourceProjectId : project.id,
    sourceProjectName: direction === "incoming" ? relationship.sourceProjectName : project.name,
    targetProjectId: direction === "incoming" ? project.id : relationship.targetProjectId || "",
    target: limitText(direction === "incoming" ? project.name : relationshipTargetLabel(relationship), config.textLimit),
    relationshipType: relationship.relationshipType || "",
    notes: limitText(relationship.notes || "", config.textLimit),
    createdAt: relationship.createdAt || ""
  };
}

function compactEvidence(project, config) {
  const sources = [];
  const chunks = [];
  for (const source of recent(sortNewest((project.sources || []).filter((item) => item.status !== "archived")), config.itemLimit)) {
    const sourceExtracts = (source.extracts || []).filter((extract) => extract.status !== "archived");
    sources.push({
      id: source.id,
      title: source.title || "",
      type: source.sourceType || "",
      trustLevel: normalizeSourceTrustLevel(source.trustLevel),
      trustLabel: sourceTrustLabel(source.trustLevel),
      freshnessState: sourceStalenessState(source),
      freshnessLabel: sourceStalenessLabel(sourceStalenessState(source)),
      lastReviewedAt: source.lastReviewedAt || "",
      reviewDueAt: source.reviewDueAt || "",
      reviewedBy: source.reviewedBy ? actorDisplay(source.reviewedBy) : "",
      trustBoundary: trustBoundaryForRecord("Source", source),
      trustBoundaryLabel: trustBoundaryLabel(trustBoundaryForRecord("Source", source)),
      location: source.location || "",
      dateAdded: source.dateAdded || "",
      actor: actorDisplay(source.actorId),
      linkedUsers: linkedActorNames(source.linkedActorIds),
      summary: limitText(source.summary || "", config.textLimit),
      tags: source.tags || [],
      extractIds: sourceExtracts.map((extract) => extract.id)
    });
    for (const extract of sourceExtracts) {
      if (chunks.length >= config.chunkLimit) break;
      chunks.push(...chunkExtractForContext(source, extract, config).slice(0, config.chunkLimit - chunks.length));
    }
    if (chunks.length >= config.chunkLimit) break;
  }
  return { sources, chunks };
}

function chunkExtractForContext(source, extract, config) {
  const text = String(extract.text || "").trim();
  if (!text) return [];
  const chunks = [];
  for (let index = 0; index < text.length && chunks.length < config.chunkLimit; index += config.chunkSize) {
    const chunkText = text.slice(index, index + config.chunkSize);
    chunks.push({
      id: `${extract.id}:chunk_${chunks.length + 1}`,
      sourceId: source.id,
      sourceTitle: source.title || "",
      extractId: extract.id,
      start: index,
      end: Math.min(index + config.chunkSize, text.length),
      text: chunkText,
      summary: limitText(extract.summary || "", DISPLAY_META_LIMIT),
      tags: extract.tags || []
    });
  }
  return chunks;
}

function compactHistory(project, config) {
  return recent(sortNewest(project.changes || [], "timestamp"), config.itemLimit)
    .map((change) => ({
      id: change.id,
      timestamp: change.timestamp || "",
      actor: actorDisplay(change.actorId, change.actorName),
      reason: limitText(change.reason || "", config.textLimit),
      summary: limitText(change.summary || "", config.textLimit),
      objectType: change.details?.objectType || "",
      objectId: change.details?.objectId || "",
      objectTitle: limitText(change.details?.objectTitle || change.details?.objectText || "", DISPLAY_META_LIMIT),
      origin: change.howChanged || change.details?.origin || ""
    }));
}

function contextProposalSchema() {
  return {
    proposals: [
      {
        type: "Fact | Decision | Conflict | OpenQuestion | NextAction | Relationship | Source | ProjectStatus",
        title: "Readable proposal title",
        text: "Proposed content",
        reason: "Why this should be reviewed",
        evidence: [{ sourceId: "source id", extractId: "extract id", chunkId: "optional chunk id" }],
        confidence: "low | medium | high",
        targetProjectId: "stable project id",
        notes: "Anything the human reviewer should know"
      }
    ]
  };
}

function exportStorageBackup() {
  if (needsFirstRunSetup()) {
    window.alert("No saved Project State database is available yet. Restore a backup or complete setup before creating a backup.");
    return;
  }
  if (ProjectStateStorage.usesExternalStore()) {
    openDesktopBackupPackageModal();
    return;
  }
  exportCurrentRawData();
}

function openDesktopBackupPackageModal() {
  showModal({
    title: t("backup"),
    submitText: t("exportFullBackup"),
    body: `
      <p class="notice">${escapeHtml(t("desktopBackupPackageNotice"))}</p>
      ${auditFields({ actorLabel: t("exportedBy"), reasonLabel: t("backupReason") })}
    `,
    async onSubmit(data, form) {
      const actorName = String(data.actorName || "").trim();
      const reason = String(data.reason || "").trim();
      const actorField = form.querySelector('[name="actorName"]');
      const reasonField = form.querySelector('[name="reason"]');
      if (!actorName) {
        actorField?.setCustomValidity(t("validationActorRequired"));
        actorField?.reportValidity();
        actorField?.setCustomValidity("");
        return false;
      }
      if (!reason) {
        reasonField?.setCustomValidity(t("validationReasonRequired"));
        reasonField?.reportValidity();
        reasonField?.setCustomValidity("");
        return false;
      }
      const actor = store.actors.find((item) => nameKey(item.name) === nameKey(actorName));
      const result = await platformAdapter.storage.createBackupPackage({
        actorId: actor?.id || "",
        actorName,
        timestamp: nowIso(),
        reason
      });
      if (!result) {
        reasonField?.setCustomValidity(t("backupPackageUnavailable"));
        reasonField?.reportValidity();
        reasonField?.setCustomValidity("");
        return false;
      }
      setSaveStatus("saved", t("backupPackageCreated"));
      return true;
    }
  });
}

function exportStorageBackupJsonForLegacyDev() {
  const timestamp = nowIso();
  store.settings.lastBackupExportedAt = timestamp;
  store.settings.lastBackupExportedBy = store.settings.primaryActorId || "";
  const manifest = buildStorageSpineManifest(store, storageSnapshotText || JSON.stringify(store));
  const payload = {
    exportedAt: timestamp,
    app: "Project State",
    backupType: "full-storage-spine",
    storage: {
      primary: ProjectStateStorage.usesExternalStore()
        ? "Desktop storage spine"
        : (ProjectStateStorage.browserDbSupported() ? "IndexedDB split stores" : "Legacy JSON fallback"),
      platformAdapter: platformAdapter.id,
      platformAdapterLabel: platformAdapter.label,
      backup: "User-controlled JSON file",
      storageMode
    },
    storageSpine: manifest,
    schemaVersion: store.schemaVersion,
    store
  };
  const stamp = timestamp.replace(/[:.]/g, "-");
  downloadTextFile(`project-state-backup-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
  saveStore({ allowWithoutCoreApproval: true, reason: "backup-export" });
}

function exportCurrentRawData() {
  const timestamp = nowIso();
  const manifest = buildStorageSpineManifest(store, storageSnapshotText || JSON.stringify(store));
  const payload = {
    exportedAt: timestamp,
    app: "Project State",
    exportType: "raw-current-store",
    storageKey: STORAGE_KEY,
    storageMode,
    storageSpine: manifest,
    store
  };
  const stamp = timestamp.replace(/[:.]/g, "-");
  downloadTextFile(`project-state-raw-current-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function openRestoreStorageModal() {
  showModal({
    title: t("restoreProjectStateBackup"),
    submitText: t("restoreBackup"),
    body: `
      <p class="notice">${escapeHtml(t("restoreBackupNotice"))}</p>
      <div class="field">
        <label for="backupFile">${escapeHtml(t("backupFile"))}</label>
        ${restoreFilePickerMarkup()}
      </div>
      ${confirmationField("confirmRestore", "I understand this will replace the current local Project State storage.")}
      ${auditFields({ actorLabel: t("restoredBy"), reasonLabel: t("restoreReason") })}
    `,
    async onSubmit(data, form) {
      const confirmField = form.querySelector('[name="confirmRestore"]');
      if (data.confirmRestore !== "on") {
        confirmField?.setCustomValidity(t("validationConfirmRestore"));
        confirmField?.reportValidity();
        confirmField?.setCustomValidity("");
        return false;
      }
      const reasonField = form.querySelector('[name="reason"]');
      if (!String(data.reason || "").trim()) {
        reasonField?.setCustomValidity(t("validationRestoreReasonRequired"));
        reasonField?.reportValidity();
        reasonField?.setCustomValidity("");
        return false;
      }
      const fileField = form.querySelector('[name="backupFile"], [name="backupFilePath"]');
      const file = form._projectStateSelectedFiles?.backup || fileField?.files?.[0] || data.backupFile;
      if (!file) {
        fileField?.setCustomValidity(t("validationBackupFileType"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let parsed;
      try {
        parsed = JSON.parse(await readFileAsText(file));
      } catch {
        fileField?.setCustomValidity(t("validationBackupUnreadable"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let restoredStore;
      try {
        restoredStore = normalizeStore(extractStoreFromBackup(parsed));
      } catch (error) {
        fileField?.setCustomValidity(error.message || t("validationInvalidBackup"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      const actorName = data.actorName.trim();
      let actor = restoredStore.actors.find((item) => nameKey(item.name) === nameKey(actorName));
      if (!actor) {
        actor = {
          id: uid("actor"),
          name: actorName,
          type: "Human",
          role: "owner",
          status: "active"
        };
        restoredStore.actors.unshift(actor);
      }
      const restoredAt = nowIso();
      restoredStore.restoreInfo = {
        restoredAt,
        restoredBy: actor.id,
        restoredByName: actor.name,
        reason: data.reason.trim(),
        sourceFile: file.name || "backup file"
      };
      restoredStore.settings = {
        ...defaultSettings(),
        ...restoredStore.settings,
        lastRestoreAt: restoredAt,
        lastRestoreBy: actor.id,
        lastRestoreReason: data.reason.trim(),
        lastRestoreSourceFile: file.name || "backup file"
      };
      store = restoredStore;
      storageSnapshotText = JSON.stringify(store);
      pendingApprovedCoreWrites = 0;
      loadFailure = null;
      activeProjectId = null;
      activeRootView = "projects";
      activeView = "dashboard";
      activeHistoryFilter = null;
      activeHistoryEventType = "all";
      searchQuery = "";
      saveStore({ allowWithoutCoreApproval: true, reason: "backup-restore" });
      return true;
    }
  });
}

function extractStoreFromBackup(parsed) {
  if (parsed?.app === "Project State" && parsed?.backupType === "full-storage-spine" && parsed.store) return parsed.store;
  if (parsed?.app === "Project State" && parsed.project) {
    throw new Error("This is a single-project export, not a full storage backup.");
  }
  if (Array.isArray(parsed?.projects)) return parsed;
  throw new Error("This file does not contain a Project State storage backup.");
}

function exportFailedData() {
  if (!loadFailure) return;
  const errorReport = {
    exportedAt: nowIso(),
    app: "Project State",
    storageKey: STORAGE_KEY,
    storageMode,
    error: {
      date: loadFailure.date,
      source: loadFailure.source,
      message: loadFailure.message,
      stack: loadFailure.stack
    },
    rawSavedData: loadFailure.raw || ""
  };
  downloadTextFile("project-state-failed-data.json", JSON.stringify(errorReport, null, 2), "application/json");
}

async function resetFailedData() {
  if (!loadFailure) return;
  const first = confirm(t("resetFailedDataConfirmFirst"));
  if (!first) return;
  const second = confirm(t("resetFailedDataConfirmSecond"));
  if (!second) return;
  await ProjectStateStorage.reset();
  loadFailure = null;
  migrationNeeded = false;
  store = emptyStore();
  storageReady = true;
  storageMode = currentStorageModeName();
  activeProjectId = null;
  activeView = "dashboard";
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  searchQuery = "";
  setSaveStatus("saved", t("resetComplete"));
  render();
}

async function resetLocalDataFromSettings() {
  const first = confirm(t("resetAllDataConfirmFirst"));
  if (!first) return;
  const second = confirm(t("resetAllDataConfirmSecond"));
  if (!second) return;
  await ProjectStateStorage.reset();
  loadFailure = null;
  migrationNeeded = false;
  store = emptyStore();
  storageReady = true;
  storageMode = currentStorageModeName();
  activeProjectId = null;
  activeRootView = "projects";
  activeView = "dashboard";
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  searchQuery = "";
  setSaveStatus("saved", t("resetComplete"));
  render();
}

function downloadTextFile(fileName, text, type = "text/plain") {
  platformAdapter.downloads.saveTextFile(fileName, text, type);
}

function openProjectOverviewModal() {
  const project = getProject();
  if (!project) return;
  showModal({
    title: t("onePageOverview"),
    submitText: t("close"),
    body: renderProjectOverview(project),
    onSubmit() {}
  });
}

function renderProjectOverview(project) {
  const decisions = recent(sortNewest(project.decisions.filter((decision) => !decision.archived), "date"), 5);
  const questions = recent(sortNewest(project.openQuestions.filter((question) => question.status === "open")), 5);
  const actions = recent(sortNewest(project.nextActions.filter((action) => getActionStatus(action) === "open")), 5);
  return `
    <section class="overview-page">
      <div class="overview-header">
        <div>
          <p class="meta-label">${escapeHtml(t("project"))}</p>
          <h3>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h3>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("generated"))}</p>
          <p class="item-meta">${escapeHtml(formatDate(nowIso()))}</p>
        </div>
      </div>

      <div class="overview-grid">
        <div>
          <p class="meta-label">${escapeHtml(t("health"))}</p>
          <p class="overview-value">${escapeHtml(healthFlagLabel(project.healthFlag))}</p>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("lastUpdated"))}</p>
          <p class="overview-value">${escapeHtml(formatDate(project.updatedAt))}</p>
        </div>
        <div>
          <p class="meta-label">${escapeHtml(t("updatedBy"))}</p>
          <p class="overview-value">${escapeHtml(actorDisplay(project.updatedBy))}</p>
        </div>
      </div>

      <section>
        <h4>${escapeHtml(t("currentState"))}</h4>
        <p class="overview-status">${escapeDisplay(project.currentStatus || t("noCurrentStatusRecorded"))}</p>
        <p class="overview-body">${escapeDisplay(project.currentSummary || t("noCurrentSummaryRecorded"))}</p>
      </section>

      <section>
        <h4>${escapeHtml(t("recentDecisions"))}</h4>
        ${renderOverviewList(decisions, (decision) => `
          <strong>${escapeDisplay(decision.text, DISPLAY_META_LIMIT)}</strong>
          <span>${escapeDisplay(decision.reason || t("noReasonRecorded"), DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(decision.date))}</span>
        `, "No recent decisions.")}
      </section>

      <section>
        <h4>${escapeHtml(t("openQuestions"))}</h4>
        ${renderOverviewList(questions, (question) => `
          <strong>${escapeDisplay(question.question, DISPLAY_META_LIMIT)}</strong>
          <span>${escapeDisplay(question.context || t("noContextRecorded"), DISPLAY_META_LIMIT)}</span>
        `, "No open questions.")}
      </section>

      <section>
        <h4>${escapeHtml(t("nextActions"))}</h4>
        ${renderOverviewList(actions, (action) => `
          <strong>${escapeDisplay(action.action, DISPLAY_META_LIMIT)}</strong>
        <span>${action.owner ? `${escapeDisplay(action.owner, DISPLAY_META_LIMIT)} · ` : ""}${escapeHtml(action.dueDate ? `${t("due")} ${formatDate(action.dueDate, false)}` : t("noDueDate"))}</span>
        `, "No open next actions.")}
      </section>
    </section>
  `;
}

function renderOverviewList(items, renderer, emptyMessage) {
  if (!items.length) return `<p class="overview-empty">${escapeDisplay(emptyMessage, DISPLAY_META_LIMIT)}</p>`;
  return `
    <ol class="overview-list">
      ${items.map((item) => `<li>${renderer(item)}</li>`).join("")}
    </ol>
  `;
}

function showModal({ title, body, submitText, onSubmit, draftKey = "", flowStep = 0, forceReplace = false }) {
  const existingModal = document.querySelector(".modal-backdrop");
  if (existingModal) {
    if (forceReplace) {
      existingModal.remove();
      postModalAction = null;
    } else {
    existingModal.querySelector("[data-close-modal]")?.click();
    if (existingModal.isConnected) return;
    }
  }
  const returnContext = pendingFlowReturnContext ? { ...pendingFlowReturnContext } : null;
  pendingFlowReturnContext = null;
  const resolvedDraftKey = draftKey || flowDraftKey(title);
  const resolvedFlowStep = flowStep || inferFlowStep(title, submitText);
  const requiresFinalReview = resolvedFlowStep < 4 && !["close", "cancel"].includes(String(submitText || "").trim().toLowerCase());
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h2 class="modal-title" id="modal-title">${escapeHtml(title)}</h2>
        <button class="icon-btn" type="button" data-close-modal aria-label="${escapeHtml(t("close"))}">×</button>
      </div>
      ${renderFlowGuide(resolvedFlowStep)}
      <p class="modal-draft-status" data-draft-status aria-live="polite"></p>
      <form class="form">
        ${body}
      </form>
      <section class="modal-final-review" data-final-review hidden></section>
      <div class="form-footer">
        <button class="btn secondary" type="button" data-close-modal>${escapeHtml(t("cancel"))}</button>
        <button class="btn secondary" type="button" data-review-back hidden>Back</button>
        <button class="btn" type="submit" form="modal-form">${escapeHtml(requiresFinalReview ? "Review" : submitText)}</button>
      </div>
      <div class="modal-draft-guard" data-draft-guard hidden>
        <p><strong>Keep this unfinished work?</strong></p>
        <p class="item-meta">Drafts are non-authoritative and remain available only during this Project State session.</p>
        <div class="button-row">
          <button class="btn secondary" type="button" data-draft-stay>Stay here</button>
          <button class="btn secondary" type="button" data-draft-discard>Discard</button>
          <button class="btn" type="button" data-draft-save>Save draft</button>
        </div>
      </div>
    </section>
  `;

  const form = modal.querySelector(".form");
  const submitButton = modal.querySelector('button[type="submit"]');
  const draftStatus = modal.querySelector("[data-draft-status]");
  const draftGuard = modal.querySelector("[data-draft-guard]");
  const finalReview = modal.querySelector("[data-final-review]");
  const reviewBack = modal.querySelector("[data-review-back]");
  let submitting = false;
  let reviewing = false;
  let draftTimer = null;
  form.id = "modal-form";
  applyInputLimits(form);
  wireLocalFilePickers(form);
  wireFlowControls(form);
  const initialFormValues = readFlowFormValues(form);
  const savedDraft = flowDrafts.get(resolvedDraftKey);
  if (savedDraft?.values) {
    restoreFlowDraft(form, savedDraft.values);
    if (draftStatus) draftStatus.innerHTML = `Session draft restored · ${escapeHtml(formatDate(savedDraft.savedAt))} <button class="text-button" type="button" data-discard-restored-draft>Discard saved draft</button>`;
  }
  let cleanSnapshot = flowFormSnapshot(form);
  const saveDraft = () => {
    const values = readFlowFormValues(form);
    const savedAt = nowIso();
    flowDrafts.set(resolvedDraftKey, { values, savedAt, savedBy: currentActor()?.id || "" });
    if (draftStatus) draftStatus.textContent = `Draft saved for this session · ${formatDate(savedAt)}`;
  };
  form.addEventListener("input", () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 650);
  });
  form.addEventListener("change", () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const formData = new FormData(form);
    const data = enforceInputLimitsOnData(Object.fromEntries(formData.entries()));
    if (!validateAuditFields(form, data)) return;
    if (requiresFinalReview && !reviewing) {
      reviewing = true;
      form.hidden = true;
      finalReview.hidden = false;
      finalReview.innerHTML = renderFinalReviewSummary(form, data, title, submitText);
      reviewBack.hidden = false;
      submitButton.textContent = submitText;
      setFlowGuideStep(modal, 4);
      return;
    }
    submitting = true;
    if (submitButton) submitButton.disabled = true;
    try {
      const shouldClose = await onSubmit(data, form);
      if (shouldClose === false) {
        submitting = false;
        if (submitButton) submitButton.disabled = false;
        return;
      }
      flowDrafts.delete(resolvedDraftKey);
      if (data.actorName || data.reason) auditWorkSession = {
        actorName: String(data.actorName || auditWorkSession.actorName || "").trim(),
        reason: String(data.reason || auditWorkSession.reason || "").trim(),
        updatedAt: nowIso()
      };
      modal.remove();
      if (!postModalAction && returnContext?.projectId && activeProjectId === returnContext.projectId && getProject(returnContext.projectId)) activeObjectDetail = returnContext;
      render();
      const nextAction = postModalAction;
      postModalAction = null;
      if (typeof nextAction === "function") setTimeout(nextAction, 0);
    } catch (error) {
      console.error("Project State modal action failed.", error);
      submitting = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  const closeModal = ({ discard = false, keepDraft = false } = {}) => {
    clearTimeout(draftTimer);
    const changed = flowFormSnapshot(form) !== cleanSnapshot;
    if (changed && !discard && !keepDraft) {
      saveDraft();
      draftGuard.hidden = false;
      return;
    }
    postModalAction = null;
    if (discard) flowDrafts.delete(resolvedDraftKey);
    if (keepDraft && changed) saveDraft();
    modal.remove();
    if (title === "Add to Discovery" && pendingFileImportReviewSelection?.candidates?.length) {
      const pendingCount = pendingFileImportReviewSelection.candidates.length;
      const pendingKind = pendingFileImportReviewSelection.importKind || fileImportFlowState.kind || "";
      if (discard) {
        pendingFileImportReviewSelection = null;
        setFileImportFlowState(
          "discarded",
          `Discarded Discovery review for ${pendingCount} selected ${pendingCount === 1 ? "file" : "files"}. Choose files or a folder again when ready.`,
          pendingKind
        );
      } else {
        setFileImportFlowState(
          "review_waiting",
          `Discovery review was closed. Use Open pending Discovery review (${pendingCount}) or choose files again.`,
          pendingKind
        );
      }
    }
    if (returnContext?.projectId && activeProjectId === returnContext.projectId && getProject(returnContext.projectId)) activeObjectDetail = returnContext;
    render();
  };

  modal.addEventListener("click", (event) => {
    if (submitting) return;
    if (event.target.closest("[data-discard-restored-draft]")) {
      flowDrafts.delete(resolvedDraftKey);
      restoreFlowDraft(form, initialFormValues);
      cleanSnapshot = flowFormSnapshot(form);
      if (draftStatus) draftStatus.textContent = "Saved draft discarded.";
      return;
    }
    if (event.target.closest("[data-review-back]")) {
      reviewing = false;
      form.hidden = false;
      finalReview.hidden = true;
      reviewBack.hidden = true;
      submitButton.textContent = "Review";
      setFlowGuideStep(modal, resolvedFlowStep);
      form.querySelector("input, textarea, select")?.focus();
      return;
    }
    if (event.target.closest("[data-draft-stay]")) {
      draftGuard.hidden = true;
      return;
    }
    if (event.target.closest("[data-draft-discard]")) {
      closeModal({ discard: true });
      return;
    }
    if (event.target.closest("[data-draft-save]")) {
      closeModal({ keepDraft: true });
      return;
    }
    if (event.target === modal || event.target.closest("[data-close-modal]")) {
      closeModal();
    }
  });

  document.body.appendChild(modal);
  modal.querySelector("input, textarea, select")?.focus();
}

function renderGovernedStateStrip(item = {}) {
  const active = item.status === "approved" ? "approved" : item.queueState === "ready" ? "ready" : item.queueState === "new" ? "draft" : "review";
  const steps = [
    ["draft", "Draft"],
    ["review", "Needs review"],
    ["ready", "Ready"],
    ["approved", "Approved / Core"]
  ];
  const activeIndex = steps.findIndex(([key]) => key === active);
  return `<ol class="governed-state-strip" aria-label="Proposal state">${steps.map(([key, label], index) => `<li class="${index === activeIndex ? "active" : index < activeIndex ? "complete" : ""}">${escapeHtml(label)}</li>`).join("")}</ol>`;
}

function flowDraftKey(title = "") {
  const context = activeObjectDetail ? `${activeObjectDetail.objectType}:${activeObjectDetail.objectId}` : activeProjectId || activeRootView;
  return `${context}:${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function readFlowFormValues(form) {
  const values = {};
  for (const field of form.querySelectorAll("input[name], textarea[name], select[name]")) {
    if (field.type === "file") continue;
    if (field.type === "checkbox") values[field.name] = field.checked ? field.value || "on" : "";
    else if (field.type === "radio") {
      if (field.checked) values[field.name] = field.value;
      else if (!(field.name in values)) values[field.name] = "";
    }
    else values[field.name] = field.value;
  }
  return values;
}

function restoreFlowDraft(form, values = {}) {
  for (const field of form.querySelectorAll("input[name], textarea[name], select[name]")) {
    if (!(field.name in values) || field.type === "file") continue;
    if (field.type === "checkbox") field.checked = Boolean(values[field.name]);
    else if (field.type === "radio") field.checked = String(values[field.name]) === String(field.value);
    else field.value = values[field.name];
  }
}

function flowFormSnapshot(form) {
  return JSON.stringify(readFlowFormValues(form));
}

function inferFlowStep(title = "", submitText = "") {
  const titleText = String(title || "").toLowerCase();
  const combined = `${title} ${submitText}`.toLowerCase();
  if (/\b(add|create|attach|assign|import|read)\b/.test(titleText)) return 2;
  if (/\breview\b/.test(titleText) && /\b(confirm|approve|reject)\b/.test(String(submitText || "").toLowerCase())) return 4;
  if (/\b(edit|review|verify|resolve)\b/.test(titleText)) return 3;
  if (/\b(approve|confirm|reject|delete|archive|restore|reset)\b/.test(titleText)) return 4;
  if (/approve|confirm|delete|archive|restore|reset/.test(combined)) return 4;
  return 3;
}

function renderFlowGuide(activeStep = 3) {
  const steps = ["Choose", "Describe", "Review", "Confirm"];
  return `<ol class="modal-flow-guide" aria-label="Guided action steps">${steps.map((step, index) => `<li class="${index + 1 === activeStep ? "active" : index + 1 < activeStep ? "complete" : ""}"><span>${index + 1}</span>${step}</li>`).join("")}</ol>`;
}

function setFlowGuideStep(modal, activeStep) {
  const steps = [...modal.querySelectorAll(".modal-flow-guide li")];
  steps.forEach((step, index) => {
    step.classList.toggle("active", index + 1 === activeStep);
    step.classList.toggle("complete", index + 1 < activeStep);
  });
}

function renderFinalReviewSummary(form, data, title, submitText) {
  const rows = [];
  const seen = new Set();
  for (const field of form.querySelectorAll("input[name], textarea[name], select[name]")) {
    if (!field.name || seen.has(field.name) || ["reasonPreset"].includes(field.name) || field.type === "file" || field.type === "hidden") continue;
    seen.add(field.name);
    let value = data[field.name];
    if (field.type === "checkbox") value = field.checked ? "Confirmed" : "Not confirmed";
    if (field.tagName === "SELECT") value = field.selectedOptions?.[0]?.textContent || value;
    if (!String(value || "").trim()) continue;
    const explicitLabel = field.id ? form.querySelector(`label[for="${CSS.escape(field.id)}"]`) : null;
    const label = field.name === "actorName" ? "Who" : field.name === "reason" ? "Why" : explicitLabel?.textContent?.trim() || field.closest(".field")?.querySelector("label")?.textContent?.trim() || field.name;
    rows.push({ label, value: limitText(String(value), field.name === "reason" ? DISPLAY_META_LIMIT : 500) });
  }
  return `
    <p class="meta-label">Final review</p>
    <h3>${escapeHtml(title)}</h3>
    <p class="notice"><strong>What will happen:</strong> ${escapeHtml(submitText)}. Review the target, actor, reason, and proposed values before continuing.</p>
    <div class="review-summary-list">
      ${rows.map((row) => `<div><p class="meta-label">${escapeHtml(row.label)}</p><p>${escapeDisplay(row.value, 500)}</p></div>`).join("")}
    </div>
    <p class="item-meta">Technical provenance and immutable history remain attached after confirmation.</p>
  `;
}

function queuePostModalAction(callback) {
  postModalAction = typeof callback === "function" ? callback : null;
}

function applyInputLimits(form) {
  if (!form) return;
  for (const field of form.querySelectorAll("input[name], textarea[name]")) {
    const limit = INPUT_LIMITS[field.name];
    if (!limit || field.type === "date") continue;
    field.maxLength = limit;
    if (!field.placeholder) field.placeholder = tFormat("limitCharacters", { limit });
  }
}

function enforceInputLimitsOnData(data) {
  const limited = { ...data };
  for (const [name, value] of Object.entries(limited)) {
    const limit = INPUT_LIMITS[name];
    if (!limit || typeof value !== "string") continue;
    limited[name] = value.slice(0, limit);
  }
  return limited;
}

function validateAuditFields(form, data) {
  const actorField = form.querySelector('[name="actorName"]');
  const reasonField = form.querySelector('[name="reason"]');
  if (actorField && !String(data.actorName || "").trim()) {
    actorField.setCustomValidity(t("validationActorRequired"));
    actorField.reportValidity();
    actorField.setCustomValidity("");
    return false;
  }
  if (reasonField && !String(data.reason || "").trim()) {
    reasonField.setCustomValidity(t("validationReasonRequired"));
    reasonField.reportValidity();
    reasonField.setCustomValidity("");
    return false;
  }
  return true;
}

function wireLocalFilePickers(form) {
  if (!form) return;
  for (const field of form.querySelectorAll("[data-local-file-picker]")) {
    field.addEventListener("change", () => {
      const file = field.files?.[0];
      if (!file) return;
      const locationField = form.querySelector(`[name="${field.dataset.locationTarget}"]`);
      const titleField = form.querySelector(`[name="${field.dataset.titleTarget}"]`);
      const typeField = form.querySelector(`[name="${field.dataset.typeTarget}"]`);
      const fileLocation = platformAdapter.files.localPath(file);
      if (locationField) locationField.value = fileLocation;
      if (titleField && !titleField.value.trim()) titleField.value = file.name;
      if (typeField && !typeField.value.trim()) typeField.value = file.type || file.name.split(".").pop() || "";
    });
  }
  for (const button of form.querySelectorAll("[data-native-file-picker]")) {
    button.addEventListener("click", async () => {
      const filters = button.dataset.fileFilter === "json"
        ? [{ name: "Project State backup", extensions: ["json"] }]
        : [];
      const file = await platformAdapter.dialogs.pickFile({ title: t("findLocalFile"), filters });
      if (!file?.localPath) return;
      form._projectStateSelectedFiles = form._projectStateSelectedFiles || {};
      form._projectStateSelectedFiles[button.dataset.fileKey || "source"] = file;
      const locationField = form.querySelector(`[name="${button.dataset.locationTarget}"]`);
      const titleField = form.querySelector(`[name="${button.dataset.titleTarget}"]`);
      const typeField = form.querySelector(`[name="${button.dataset.typeTarget}"]`);
      if (locationField) locationField.value = file.localPath;
      if (titleField && !titleField.value.trim()) titleField.value = file.name || "";
      if (typeField && !typeField.value.trim()) typeField.value = (file.name || "").split(".").pop() || "";
    });
  }
  for (const button of form.querySelectorAll("[data-native-folder-picker]")) {
    button.addEventListener("click", async () => {
      const folder = await platformAdapter.dialogs.pickFolder({ title: t("backupLocation"), defaultPath: rememberedImportFolder("backup") });
      if (!folder?.localPath) return;
      rememberImportFolder("backup", [folder.localPath]);
      const locationField = form.querySelector(`[name="${button.dataset.locationTarget}"]`);
      if (locationField) locationField.value = folder.localPath;
    });
  }
}

function wireFlowControls(form) {
  const reasonPreset = form?.querySelector('[name="reasonPreset"]');
  const reasonField = form?.querySelector('[name="reason"]');
  if (reasonPreset && reasonField) {
    reasonPreset.addEventListener("change", () => {
      if (reasonPreset.value === "custom") {
        reasonField.focus();
        return;
      }
      if (reasonPreset.value) reasonField.value = reasonPreset.value;
      reasonField.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
}

function auditFields({ actorLabel = t("approvedBy"), reasonLabel = t("reason"), reasonOptions = null } = {}) {
  const defaultActorName = auditWorkSession.actorName || currentActor()?.name || "";
  const defaultReason = auditWorkSession.reason || "";
  const options = activeActorOptions(defaultActorName);
  return `
    <div class="field">
      <label for="actorName">${escapeHtml(actorLabel)}</label>
      ${options
        ? `<select id="actorName" name="actorName" required>${options}</select>`
        : `<input id="actorName" name="actorName" value="${escapeHtml(defaultActorName)}" list="actorNameSuggestions" autocomplete="name" required>${actorSuggestionDatalist("actorNameSuggestions")}`}
      <p class="field-help">Known active human identity. Every confirmed change still records this actor separately.</p>
    </div>
    <div class="field">
      <label for="reason">${escapeHtml(reasonLabel)}</label>
      <select name="reasonPreset" aria-label="Common audit reason">
        <option value="">Choose a common reason or write a custom reason</option>
        ${auditReasonOptions(defaultReason, reasonOptions)}
        <option value="custom">Other / custom</option>
      </select>
      <textarea id="reason" name="reason" required>${escapeHtml(defaultReason)}</textarea>
      ${auditWorkSession.updatedAt ? `<p class="field-help">Inherited from this work session · ${escapeHtml(formatDate(auditWorkSession.updatedAt))}. Edit it whenever the reason changes.</p>` : `<p class="field-help">Required for immutable history. This may be reused during the current work session.</p>`}
    </div>
  `;
}

function activeActorOptions(selectedName = "") {
  const activeActors = (store.actors || []).filter((actor) => normalizeActorStatus(actor.status) === "active" && normalizeActorRole(actor.role, actor.type) !== "ai_tool");
  return activeActors.map((actor) => `<option value="${escapeHtml(actor.name)}" ${nameKey(actor.name) === nameKey(selectedName) ? "selected" : ""}>${escapeHtml(actorDisplay(actor.id))}</option>`).join("");
}

function auditReasonOptions(selectedReason = "", customReasons = null) {
  const reasons = Array.isArray(customReasons) && customReasons.length ? customReasons : [
    "Create new project",
    "Import known project folder",
    "Import known project files",
    "Approve Discovery project candidate",
    "Updated current project state",
    "Added supporting evidence",
    "Recorded a project decision",
    "Tracked follow-up work",
    "Corrected existing information",
    "Reviewed and approved a proposal",
    "Completed routine project maintenance"
  ];
  return reasons.map((reason) => `<option value="${escapeHtml(reason)}" ${reason === selectedReason ? "selected" : ""}>${escapeHtml(reason)}</option>`).join("");
}

function actorSuggestionDatalist(id = "actor-suggestions") {
  return `<datalist id="${escapeHtml(id)}">${(store.actors || []).filter((actor) => normalizeActorStatus(actor.status) === "active").map((actor) => `<option value="${escapeHtml(actor.name)}"></option>`).join("")}</datalist>`;
}

function projectSuggestionDatalist(id = "project-suggestions") {
  return `<datalist id="${escapeHtml(id)}">${(store.projects || []).filter((project) => !project.archived).map((project) => `<option value="${escapeHtml(project.name)}"></option>`).join("")}</datalist>`;
}

function sourceTypeDatalist(id = "source-type-suggestions") {
  const values = ["Document", "File", "Note", "Conversation", "Email", "Web reference", "Dataset", "Image", "Meeting record", "Other"];
  return `<datalist id="${escapeHtml(id)}">${values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function relationshipTypeDatalist(id = "relationship-type-suggestions") {
  const values = ["depends on", "supports", "blocks", "relates to", "supersedes", "replaces", "shares evidence with", "derived from", "Other"];
  return `<datalist id="${escapeHtml(id)}">${values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("")}</datalist>`;
}

function confirmationField(name, label) {
  return `
    <div class="field">
      <label>
        <input name="${name}" type="checkbox" required>
        ${escapeHtml(label)}
      </label>
    </div>
  `;
}

function typedConfirmationField(name, label, expectedValue) {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <input id="${name}" name="${name}" placeholder="${escapeHtml(expectedValue)}" autocomplete="off" required>
      <p class="item-meta">${escapeHtml(t("type"))}: ${escapeHtml(expectedValue)}. ${escapeHtml(t("capitalizationDoesNotMatter"))}</p>
    </div>
  `;
}

function armTypeOptions(selected = "manual") {
  return ARM_TYPES
    .map((type) => `<option value="${type}" ${selected === type ? "selected" : ""}>${escapeHtml(armTypeLabel(type))}</option>`)
    .join("");
}

function proposedObjectTypeOptions(selected = "Decision") {
  const types = ["ProjectStatus", "Decision", "Fact", "Conflict", "OpenQuestion", "NextAction", "Source", "Relationship"];
  return types
    .map((type) => `<option value="${type}" ${selected === type ? "selected" : ""}>${escapeHtml(proposedObjectTypeLabel(type))}</option>`)
    .join("");
}

function projectOptions(selected = "") {
  return store.projects
    .filter((project) => !project.archived)
    .map((project) => `<option value="${project.id}" ${selected === project.id ? "selected" : ""}>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</option>`)
    .join("");
}

function openAssignObjectModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!project || !object) return;
  showModal({
    title: t("assignObject"),
    submitText: t("approveChange"),
    body: `
      <p class="notice">${escapeHtml(t("commentsNotPrivateNotice"))}</p>
      <div class="field">
        <label for="assignedActorId">${escapeHtml(t("assignedTo"))}</label>
        <select id="assignedActorId" name="assignedActorId" required>${actorSelectOptions()}</select>
      </div>
      <div class="field">
        <label for="assignmentRole">${escapeHtml(t("assignmentRole"))}</label>
        <select id="assignmentRole" name="assignmentRole">${assignmentRoleOptions("reviewer")}</select>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      object.assignments = Array.isArray(object.assignments) ? object.assignments : [];
      const assignment = {
        id: uid("assignment"),
        actorId: data.assignedActorId,
        role: normalizeAssignmentRole(data.assignmentRole),
        assignedAt: nowIso(),
        assignedBy: actor.id,
        reason: data.reason.trim(),
        status: "active"
      };
      object.assignments.unshift(assignment);
      recordChange(project, actor, data.reason, `${objectType} assigned`, {
        objectType,
        objectId: object.id,
        objectText: objectLabel(objectType, object),
        fields: {
          assignedTo: actorDisplay(assignment.actorId),
          assignmentRole: assignmentRoleLabel(assignment.role)
        }
      });
      saveStore();
    }
  });
}

function openReviewThreadModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!project || !object) return;
  showModal({
    title: t("reviewThread"),
    submitText: t("addComment"),
    body: `
      <p class="notice">${escapeHtml(t("commentsNotPrivateNotice"))}</p>
      ${renderCommentThread(object)}
      <div class="field">
        <label for="reviewState">${escapeHtml(t("reviewState"))}</label>
        <select id="reviewState" name="reviewState">${reviewStateOptions(object.reviewState || "needs_review")}</select>
      </div>
      <div class="field">
        <label for="commentText">${escapeHtml(t("commentText"))}</label>
        <textarea id="commentText" name="commentText" required></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      object.comments = Array.isArray(object.comments) ? object.comments : [];
      const comment = {
        id: uid("comment"),
        actorId: actor.id,
        actorName: actor.name,
        createdAt: nowIso(),
        text: data.commentText.trim(),
        reviewState: normalizeReviewState(data.reviewState),
        visibilityNotice: "Project State comments are part of the project record and are not private."
      };
      object.comments.unshift(comment);
      object.reviewState = comment.reviewState;
      recordChange(project, actor, data.reason, `${objectType} review comment added`, {
        objectType,
        objectId: object.id,
        objectText: objectLabel(objectType, object),
        fields: {
          reviewState: reviewStateLabel(object.reviewState),
          comment: comment.text
        }
      });
      saveStore();
    }
  });
}

function renderCommentThread(object = {}) {
  const comments = sortNewest(object.comments || [], "createdAt");
  if (!comments.length) return emptyText(t("comments"));
  return `
    <div class="list">
      ${comments.map((comment) => `
        <div class="item">
          <p class="item-title">${escapeHtml(actorDisplay(comment.actorId, comment.actorName))}</p>
          <p class="item-meta">${escapeHtml(formatDate(comment.createdAt))} · ${escapeHtml(reviewStateLabel(comment.reviewState))}</p>
          <p class="item-body">${escapeDisplay(comment.text, DISPLAY_META_LIMIT)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function openManageProjectRolesModal() {
  const project = getProject();
  if (!project) return;
  showModal({
    title: t("manageProjectRoles"),
    submitText: t("approveChange"),
    body: `
      ${renderProjectRoles(project)}
      <div class="field">
        <label for="projectRoleActorId">${escapeHtml(t("assignedTo"))}</label>
        <select id="projectRoleActorId" name="projectRoleActorId" required>${actorSelectOptions()}</select>
      </div>
      <div class="field">
        <label for="projectRole">${escapeHtml(t("projectRole"))}</label>
        <select id="projectRole" name="projectRole">${actorRoleOptions("project_lead")}</select>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      project.projectRoles = Array.isArray(project.projectRoles) ? project.projectRoles : [];
      const role = {
        id: uid("project_role"),
        actorId: data.projectRoleActorId,
        role: normalizeActorRole(data.projectRole),
        assignedAt: nowIso(),
        assignedBy: actor.id,
        reason: data.reason.trim(),
        status: "active"
      };
      project.projectRoles.unshift(role);
      recordChange(project, actor, data.reason, "Project role assigned", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          assignedTo: actorDisplay(role.actorId),
          projectRole: actorRoleLabel(role.role)
        }
      });
      saveStore();
    }
  });
}

function openCreateAiWorkOrderModal() {
  showModal({
    title: t("createAiWorkOrder"),
    submitText: t("recordSuggestion"),
    body: `
      <p class="notice">${escapeHtml(t("aiWorkOrderNotice"))}</p>
      <div class="field">
        <label for="projectId">${escapeHtml(t("targetProject"))}</label>
        <select id="projectId" name="projectId" required>${projectOptions()}</select>
      </div>
      <div class="field">
        <label for="title">${escapeHtml(t("title"))}</label>
        <input id="title" name="title" required>
      </div>
      <div class="field">
        <label for="contextPreset">${escapeHtml(t("contextPackPreset"))}</label>
        <select id="contextPreset" name="contextPreset">${contextPackPresetOptions()}</select>
      </div>
      <div class="field">
        <label for="outputType">${escapeHtml(t("outputType"))}</label>
        <input id="outputType" name="outputType" placeholder="${escapeHtml(t("draftProjectDefault"))}">
      </div>
      <div class="field">
        <label for="task">${escapeHtml(t("workOrderTask"))}</label>
        <textarea id="task" name="task" required></textarea>
      </div>
      <label class="check-field">
        <input name="canCreateIntake" type="checkbox">
        <span>${escapeHtml(t("canCreateIntake"))}</span>
      </label>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const workOrder = {
        id: uid("ai_work_order"),
        projectId: data.projectId,
        title: data.title.trim(),
        task: data.task.trim(),
        contextPreset: CONTEXT_PACK_PRESET_KEYS.includes(data.contextPreset) ? data.contextPreset : "handoff",
        outputType: data.outputType.trim(),
        canCreateIntake: data.canCreateIntake === "on",
        status: "submitted",
        createdAt: nowIso(),
        createdBy: actor.id,
        reason: data.reason.trim(),
        comments: []
      };
      store.aiWorkOrders.unshift(workOrder);
      const project = getProject(workOrder.projectId);
      if (project) {
        recordChange(project, actor, data.reason, "AI work order created", {
          objectType: "Project",
          objectId: project.id,
          objectText: project.name,
          fields: {
            workOrderId: workOrder.id,
            title: workOrder.title,
            contextPreset: contextPackPresetLabel(workOrder.contextPreset),
            canCreateIntake: workOrder.canCreateIntake ? t("yes") : t("no")
          }
        });
      }
      saveStore({ allowWithoutCoreApproval: !project, reason: "ai-work-order-created" });
      activeRootView = "work-orders";
      activeProjectId = null;
    }
  });
}

function openAiWorkOrderCommentsModal(workOrderId) {
  const workOrder = (store.aiWorkOrders || []).find((order) => order.id === workOrderId);
  if (!workOrder) return;
  showModal({
    title: t("reviewThread"),
    submitText: t("addComment"),
    body: `
      <p class="notice">${escapeHtml(t("commentsNotPrivateNotice"))}</p>
      ${renderCommentThread(workOrder)}
      <div class="field">
        <label for="reviewState">${escapeHtml(t("status"))}</label>
        <select id="reviewState" name="reviewState">
          ${AI_WORK_ORDER_STATUSES.map((status) => `<option value="${status}" ${workOrder.status === status ? "selected" : ""}>${escapeHtml(aiWorkOrderStatusLabel(status))}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="commentText">${escapeHtml(t("commentText"))}</label>
        <textarea id="commentText" name="commentText" required></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      workOrder.status = AI_WORK_ORDER_STATUSES.includes(data.reviewState) ? data.reviewState : workOrder.status;
      workOrder.comments = Array.isArray(workOrder.comments) ? workOrder.comments : [];
      workOrder.comments.unshift({
        id: uid("comment"),
        actorId: actor.id,
        actorName: actor.name,
        createdAt: nowIso(),
        text: data.commentText.trim(),
        reviewState: workOrder.status,
        visibilityNotice: "Project State comments are part of the project record and are not private."
      });
      const project = getProject(workOrder.projectId);
      if (project) {
        recordChange(project, actor, data.reason, "AI work order commented", {
          objectType: "Project",
          objectId: project.id,
          objectText: project.name,
          fields: {
            workOrderId: workOrder.id,
            status: aiWorkOrderStatusLabel(workOrder.status),
            comment: data.commentText.trim()
          }
        });
      }
      saveStore({ allowWithoutCoreApproval: !project, reason: "ai-work-order-commented" });
    }
  });
}

function archiveAiWorkOrder(workOrderId) {
  const workOrder = (store.aiWorkOrders || []).find((order) => order.id === workOrderId);
  if (!workOrder || workOrder.status === "archived") return;
  showModal({
    title: t("archive"),
    submitText: t("approveArchive"),
    body: `
      ${confirmationField("confirmArchive", t("archiveObjectNotice"))}
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      workOrder.status = "archived";
      const project = getProject(workOrder.projectId);
      if (project) {
        recordChange(project, actor, data.reason, "AI work order archived", {
          objectType: "Project",
          objectId: project.id,
          objectText: project.name,
          fields: {
            workOrderId: workOrder.id,
            title: workOrder.title
          }
        });
      }
      saveStore({ allowWithoutCoreApproval: !project, reason: "ai-work-order-archived" });
    }
  });
}

function openCreateIntakeModal() {
  const defaultProjectId = activeProjectId || "";
  showModal({
    title: t("addIntake"),
    submitText: t("saveToAirlock"),
    body: `
      <p class="notice">Fast Intake is for sorting material before Core. Pick the lane, check the suggested fields, then approve later only when you want it written into Core history.</p>
      <div class="field">
        <label for="intakeLane">What are you adding?</label>
        <select id="intakeLane" name="intakeLane">
          <option value="new_project">Known new project or folder</option>
          <option value="existing_project"${defaultProjectId ? " selected" : ""}>Add evidence/change to existing project</option>
          <option value="needs_review">Needs review / not sure yet</option>
        </select>
        <p class="item-meta">Use Discovery for real file/folder scanning. This manual form is for fast notes, known material, and cleanup.</p>
      </div>
      <div class="field">
        <label for="armType">${escapeHtml(t("arm"))}</label>
        <select id="armType" name="armType">${armTypeOptions("manual")}</select>
      </div>
      <div class="field" data-existing-target>
        <label for="projectId">${escapeHtml(t("targetProject"))}</label>
        <select id="projectId" name="projectId">
          <option value="">Choose existing project</option>
          ${projectOptions(defaultProjectId)}
        </select>
      </div>
      <div class="field" data-new-target>
        <label for="proposedProjectName">New project name</label>
        <input id="proposedProjectName" name="proposedProjectName" placeholder="Project name to create at approval">
      </div>
      <div class="field">
        <label for="proposedObjectType">What should Core receive?</label>
        <select id="proposedObjectType" name="proposedObjectType">${proposedObjectTypeOptions("Source")}</select>
      </div>
      <div class="field">
        <label for="title">${escapeHtml(t("intakeTitle"))}</label>
        <input id="title" name="title" required placeholder="Short label for this proposal">
      </div>
      <div class="field">
        <label for="text">Core text/title</label>
        <textarea id="text" name="text" required placeholder="The exact title, source title, fact, decision, action, or status text"></textarea>
      </div>
      <div class="field">
        <label for="summary">Plain summary / context</label>
        <textarea id="summary" name="summary" placeholder="Optional. Why it matters or what it contains."></textarea>
      </div>
      <div class="field">
        <label for="sourceLabel">${escapeHtml(t("sourceOriginLabel"))}</label>
        <input id="sourceLabel" name="sourceLabel" placeholder="Manual note, folder name, conversation, etc.">
      </div>
      <div class="two-col">
        <div class="field">
          <label for="target">Owner / relationship target</label>
          <input id="target" name="target" list="project-suggestions" placeholder="Optional owner, next-action owner, or related project">
          ${projectSuggestionDatalist()}
        </div>
        <div class="field">
          <label for="dueDate">${escapeHtml(t("dueDate"))}</label>
          <input id="dueDate" name="dueDate" type="date">
        </div>
      </div>
    `,
    onSubmit(data) {
      const lane = String(data.intakeLane || "needs_review");
      const projectId = lane === "existing_project" ? String(data.projectId || "").trim() : "";
      const proposedProjectName = lane === "new_project" ? String(data.proposedProjectName || data.title || "").trim() : "";
      if (lane === "existing_project" && !projectId) { window.alert("Choose the existing project, or switch the lane to known new project / needs review."); return false; }
      if (lane === "new_project" && !proposedProjectName) { window.alert("Enter the new project name, or switch the lane to needs review."); return false; }
      const actor = currentActor() || getOrCreateActor("Owner", "Human");
      const proposedObjectType = lane === "new_project" && data.proposedObjectType === "ProjectStatus" ? "Source" : normalizeProposedObjectType(data.proposedObjectType);
      const draftItem = {
        armType: normalizeArmType(data.armType),
        title: data.title.trim(),
        projectId,
        destination: lane === "new_project" ? "proposed_new_project" : projectId ? "existing_project" : "unassigned",
        proposedProjectName,
        proposedObjectType,
        proposedChange: { text: data.text.trim(), summary: data.summary.trim() }
      };
      createIntakeItem({
        armType: normalizeArmType(data.armType),
        title: data.title.trim(),
        createdBy: actor.id,
        sourceLabel: data.sourceLabel.trim(),
        projectId,
        destination: draftItem.destination,
        proposedProjectName,
        proposedObjectType,
        queueState: intakeSuggestedQueueState(draftItem),
        proposedChange: {
          text: data.text.trim(),
          summary: data.summary.trim(),
          target: data.target.trim(),
          dueDate: data.dueDate || ""
        },
        evidence: {
          enteredAt: nowIso()
        }
      });
      activeRootView = "intake";
      activeProjectId = null;
      return true;
    }
  });
  const modal = document.querySelector(".modal");
  const laneField = modal?.querySelector("#intakeLane");
  const typeField = modal?.querySelector("#proposedObjectType");
  const projectField = modal?.querySelector("#projectId");
  const proposedProjectField = modal?.querySelector("#proposedProjectName");
  const titleField = modal?.querySelector("#title");
  const textField = modal?.querySelector("#text");
  const syncLane = () => {
    const lane = laneField?.value || "needs_review";
    modal?.querySelectorAll("[data-existing-target]").forEach((node) => { node.hidden = lane !== "existing_project"; });
    modal?.querySelectorAll("[data-new-target]").forEach((node) => { node.hidden = lane !== "new_project"; });
    if (projectField) projectField.required = lane === "existing_project";
    if (proposedProjectField) proposedProjectField.required = lane === "new_project";
    if (lane === "new_project" && typeField && typeField.value === "ProjectStatus") typeField.value = "Source";
  };
  const syncTitleText = () => {
    if (!textField || String(textField.value || "").trim()) return;
    textField.value = titleField?.value || "";
  };
  laneField?.addEventListener("change", syncLane);
  titleField?.addEventListener("blur", syncTitleText);
  syncLane();
}

function correctionFieldForObjectType(objectType = "") {
  return {
    Project: "currentStatus",
    Decision: "text",
    Fact: "statement",
    Conflict: "description",
    Source: "summary",
    Relationship: "notes",
    OpenQuestion: "question",
    NextAction: "action"
  }[objectType] || "";
}

function proposedTypeForObjectType(objectType = "") {
  return objectType === "Project" ? "ProjectStatus" : objectType;
}

function openProposeCorrectionModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  const field = correctionFieldForObjectType(objectType);
  if (!project || !object || !field) return;
  showModal({
    title: t("proposeCorrection"),
    submitText: t("saveToAirlock"),
    body: `
      <p class="notice">${escapeHtml(t("correctionNotice"))}</p>
      <div class="field">
        <label for="correctedContent">${escapeHtml(t("correctedContent"))}</label>
        <textarea id="correctedContent" name="correctedContent" required>${escapeHtml(object[field] || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      createIntakeItem({
        armType: "manual",
        title: `${t("proposeCorrection")}: ${objectLabel(objectType, object)}`,
        createdBy: actor.id,
        sourceLabel: t("appTitle"),
        projectId: project.id,
        proposedObjectType: normalizeProposedObjectType(proposedTypeForObjectType(objectType)),
        proposedChange: {
          proposalKind: "correction",
          targetObjectType: objectType,
          targetObjectId: object.id,
          targetField: field,
          previousText: String(object[field] || ""),
          text: String(data.correctedContent || "").trim(),
          summary: data.reason.trim()
        },
        evidence: {
          enteredAt: nowIso(),
          proposedBy: actor.id,
          reason: data.reason.trim()
        }
      });
      activeObjectDetail = null;
      activeRootView = "intake";
      activeProjectId = null;
      return true;
    }
  });
}

function openApproveIntakeModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  const airlockFlags = intakeAirlockChecks(intake);
  if (!allRequiredFlagsPass(airlockFlags)) {
    window.alert(t("airlockIncompleteNotice"));
    return;
  }
  showModal({
    title: t("approveIntake"),
    submitText: t("approveToProjectState"),
    body: `
      <p class="notice">${escapeHtml(t("approvalAppliesChangeNotice"))}</p>
      ${renderIntakeApprovalPreview(intake)}
      <div class="field">
        <label>${escapeHtml(t("requiredAirlockChecks"))}</label>
        ${renderFlagPills(airlockFlags)}
      </div>
      <div class="field">
        <label>${escapeHtml(t("approvalChecklist"))}</label>
        ${confirmationField("confirmProposalReviewed", t("confirmProposalReviewed"))}
        ${confirmationField("confirmApprovalWritesCore", t("confirmApprovalWritesCore"))}
        ${confirmationField("confirmInputsNotAuthority", t("confirmInputsNotAuthority"))}
      </div>
      ${auditFields()}
    `,
    onSubmit(data, form) {
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "approve", intakePermissionProject(intake))) return false;
      const result = approveIntakeItem(intake.id, actor, data.reason, (item, approval) => applyApprovedIntakeToCore(item, actor, data.reason, approval));
      if (result) {
        if (intake.projectId && getProject(intake.projectId)) queuePostModalAction(() => {
          openProjectNow(intake.projectId, "dashboard");
          render();
        });
      }
      return Boolean(result);
    }
  });
}

function openReviewIntakeQueueModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  const suggestedQueueState = intakeSuggestedQueueState(intake);
  const selectedRoute = intake.projectId
    ? "existing_project"
    : intake.destination === "proposed_new_project" && intake.proposedProjectName
      ? "proposed_new_project"
      : intake.destination === "rejected"
        ? "rejected"
        : "needs_review";
  showModal({
    title: t("approvalQueueReview"),
    submitText: t("saveQueueReview"),
    body: `
      <p class="notice">Fast review: choose where this should go, fix the short title/text if needed, then mark ready. Nothing here changes Core until final approval.</p>
      ${renderIntakeApprovalPreview(intake)}
      <div class="two-col">
        <div class="field">
          <label for="intakeRoute">Routing</label>
          <select id="intakeRoute" name="intakeRoute">
            <option value="proposed_new_project"${selectedRoute === "proposed_new_project" ? " selected" : ""}>Create proposed new project</option>
            <option value="existing_project"${selectedRoute === "existing_project" ? " selected" : ""}>Add to existing project</option>
            <option value="needs_review"${selectedRoute === "needs_review" ? " selected" : ""}>Needs more review</option>
            <option value="rejected"${selectedRoute === "rejected" ? " selected" : ""}>Reject / do not promote</option>
          </select>
        </div>
        <div class="field">
          <label for="proposedObjectType">Core item type</label>
          <select id="proposedObjectType" name="proposedObjectType">${proposedObjectTypeOptions(intake.proposedObjectType || "Source")}</select>
        </div>
      </div>
      <div class="field">
        <label for="intakeTitle">Proposal title</label>
        <input id="intakeTitle" name="intakeTitle" value="${escapeHtml(intake.title || "")}" required>
      </div>
      <div class="field">
        <label for="proposedText">Core text/title</label>
        <textarea id="proposedText" name="proposedText" required>${escapeHtml(intake.proposedChange?.text || "")}</textarea>
      </div>
      <div class="field">
        <label for="proposedSummary">Summary or extracted context</label>
        <textarea id="proposedSummary" name="proposedSummary" rows="8">${escapeHtml(intake.proposedChange?.summary || "")}</textarea>
      </div>
      <div class="field" data-existing-target>
        <label for="intakeProjectId">Existing target project</label>
        <select id="intakeProjectId" name="intakeProjectId"><option value="">None</option>${projectOptions(intake.projectId || "")}</select>
      </div>
      <div class="field" data-new-target>
        <label for="proposedProjectName">Proposed new project name</label>
        <input id="proposedProjectName" name="proposedProjectName" value="${escapeHtml(intake.proposedProjectName || "")}">
      </div>
      <div class="field">
        <label for="sourceLabel">${escapeHtml(t("sourceOriginLabel"))}</label>
        <input id="sourceLabel" name="sourceLabel" value="${escapeHtml(intake.sourceLabel || "")}">
      </div>
      <div class="two-col">
        <div class="field">
          <label for="target">Owner / relationship target</label>
          <input id="target" name="target" value="${escapeHtml(intake.proposedChange?.target || "")}" list="project-suggestions">
          ${projectSuggestionDatalist()}
        </div>
        <div class="field">
          <label for="dueDate">${escapeHtml(t("dueDate"))}</label>
          <input id="dueDate" name="dueDate" type="date" value="${escapeHtml(intake.proposedChange?.dueDate || "")}">
        </div>
      </div>
      <div class="field">
        <label for="queueState">Review state</label>
        <select id="queueState" name="queueState" required>
          ${INTAKE_QUEUE_STATES.map((state) => `<option value="${escapeHtml(state)}" ${(intake.queueState || suggestedQueueState) === state ? "selected" : ""}>${escapeHtml(intakeQueueStateLabel(state))}</option>`).join("")}
        </select>
        ${suggestedQueueState === "ready" ? `<p class="item-meta">This proposal has enough information to approve after your review.</p>` : `<p class="item-meta">Add a Core target and proposal text before marking ready.</p>`}
      </div>
      <div class="field">
        <label for="queueNotes">${escapeHtml(t("queueReviewNotes"))}</label>
        <textarea id="queueNotes" name="queueNotes">${escapeHtml(intake.queueNotes || "")}</textarea>
      </div>
      ${auditFields({ actorLabel: t("reviewedBy"), reasonLabel: t("reason"), reasonOptions: [
        "Review and mark ready",
        "Needs more review before routing",
        "Reject duplicate intra-folder project suggestion",
        "Reject supporting file as standalone project",
        "Reject because this belongs inside the parent folder project",
        "Reject unrelated test material",
        "Reject mistaken Discovery suggestion",
        "Archive or defer for later manual review"
      ] })}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const route = String(data.intakeRoute || "needs_review");
      intake.title = String(data.intakeTitle || "").trim();
      intake.proposedChange = {
        ...(intake.proposedChange || {}),
        text: String(data.proposedText || "").trim(),
        summary: String(data.proposedSummary || "").trim(),
        target: String(data.target || "").trim(),
        dueDate: String(data.dueDate || "").trim()
      };
      intake.proposedObjectType = normalizeProposedObjectType(data.proposedObjectType);
      intake.sourceLabel = String(data.sourceLabel || "").trim();
      intake.projectId = route === "existing_project" ? String(data.intakeProjectId || "").trim() : "";
      intake.proposedProjectName = route === "proposed_new_project" ? String(data.proposedProjectName || "").trim() : "";
      if (route === "existing_project" && !intake.projectId) { window.alert("Choose the existing target project, or change Routing."); return false; }
      if (route === "proposed_new_project" && !intake.proposedProjectName) { window.alert("Enter a proposed new project name, or change Routing."); return false; }
      intake.destination = route === "existing_project" ? "existing_project" : route === "proposed_new_project" ? "proposed_new_project" : route === "rejected" ? "rejected" : "unassigned";
      intake.queueState = normalizeIntakeQueueState(data.queueState);
      if (intake.queueState === "ready" && !allRequiredFlagsPass(intakeAirlockChecks(intake))) {
        window.alert("This proposal is not ready yet. Add the missing Core target, title, text, and type first.");
        return false;
      }
      intake.queueNotes = String(data.queueNotes || "").trim();
      intake.queueReviewedAt = nowIso();
      intake.queueReviewedBy = actor.id;
      intake.queueReviewReason = data.reason.trim();
      if (route === "rejected") {
        intake.status = "rejected";
        intake.review = {
          reviewedAt: intake.queueReviewedAt,
          actorId: actor.id,
          actorName: actor.name,
          reason: data.reason.trim()
        };
      }
      saveStore({ allowWithoutCoreApproval: true, reason: "intake-queue-reviewed" });
      const next = route === "rejected" ? null : nextPendingIntake(intake.id);
      if (next) queuePostModalAction(() => openReviewIntakeQueueModal(next.id));
      return true;
    }
  });
  const modal = document.querySelector(".modal");
  const routeField = modal?.querySelector("#intakeRoute");
  const projectField = modal?.querySelector("#intakeProjectId");
  const proposedProjectField = modal?.querySelector("#proposedProjectName");
  const queueField = modal?.querySelector("#queueState");
  const syncRoute = () => {
    const route = routeField?.value || "needs_review";
    modal?.querySelectorAll("[data-existing-target]").forEach((node) => { node.hidden = route !== "existing_project"; });
    modal?.querySelectorAll("[data-new-target]").forEach((node) => { node.hidden = route !== "proposed_new_project"; });
    if (projectField) projectField.required = route === "existing_project";
    if (proposedProjectField) proposedProjectField.required = route === "proposed_new_project";
    if (queueField && route === "rejected") queueField.value = "blocked";
    if (queueField && route !== "rejected" && intakeSuggestedQueueState({
      ...intake,
      projectId: route === "existing_project" ? projectField?.value || "" : "",
      destination: route,
      proposedProjectName: route === "proposed_new_project" ? proposedProjectField?.value || "" : "",
      proposedChange: { ...(intake.proposedChange || {}), text: modal?.querySelector("#proposedText")?.value || "" }
    }) === "ready") queueField.value = "ready";
  };
  routeField?.addEventListener("change", syncRoute);
  projectField?.addEventListener("change", syncRoute);
  proposedProjectField?.addEventListener("input", syncRoute);
  syncRoute();
}

function nextPendingIntake(currentId = "", { readyOnly = false } = {}) {
  return visibleIntakeItems(store.intakeItems || [])
    .filter((item) => item.id !== currentId && item.status === "pending" && !item.archived && (!readyOnly || item.queueState === "ready"))
    .sort((a, b) => intakeQueueStateRank(a.queueState) - intakeQueueStateRank(b.queueState) || dateSortValue(a.createdAt) - dateSortValue(b.createdAt))[0] || null;
}

function openBatchTriageModal() {
  const pending = visibleIntakeItems(store.intakeItems || []).filter((item) => item.status === "pending" && !item.archived);
  if (!pending.length) return;
  showModal({
    title: t("batchTriage"),
    submitText: t("applyTriage"),
    body: `
      <p class="notice">${escapeHtml(t("batchTriageNotice"))}</p>
      <div class="field">
        <label>${escapeHtml(t("selectIntakeItems"))}</label>
        <div class="check-list">
          ${pending.map((item) => `<label class="check-field"><input type="checkbox" name="intakeIds" value="${escapeHtml(item.id)}"><span>${escapeDisplay(item.title, DISPLAY_META_LIMIT)} · ${escapeHtml(intakeQueueStateLabel(item.queueState))}</span></label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label for="queueState">${escapeHtml(t("queueState"))}</label>
        <select id="queueState" name="queueState" required>
          ${INTAKE_QUEUE_STATES.map((state) => `<option value="${escapeHtml(state)}">${escapeHtml(intakeQueueStateLabel(state))}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="queueNotes">${escapeHtml(t("queueReviewNotes"))}</label>
        <textarea id="queueNotes" name="queueNotes"></textarea>
      </div>
      ${auditFields({ actorLabel: t("reviewedBy"), reasonLabel: t("reason") })}
    `,
    onSubmit(data, form) {
      const selectedIds = [...form.querySelectorAll('[name="intakeIds"]:checked')].map((field) => field.value);
      if (!selectedIds.length) return false;
      const actor = getOrCreateActor(data.actorName, "Human");
      const timestamp = nowIso();
      for (const item of pending) {
        if (!selectedIds.includes(item.id)) continue;
        item.queueState = normalizeIntakeQueueState(data.queueState);
        item.queueNotes = String(data.queueNotes || "").trim();
        item.queueReviewedAt = timestamp;
        item.queueReviewedBy = actor.id;
        item.queueReviewReason = data.reason.trim();
      }
      saveStore({ allowWithoutCoreApproval: true, reason: "intake-batch-triage" });
      return true;
    }
  });
}

function openRejectIntakeModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  showModal({
    title: t("rejectIntake"),
    submitText: t("reject"),
    body: `
      <p class="notice">${escapeHtml(t("rejectIntakeNotice"))}</p>
      ${auditFields({ reasonOptions: [
        "Reject duplicate intra-folder project suggestion",
        "Reject supporting file as standalone project",
        "Reject because this belongs inside the parent folder project",
        "Reject unrelated test material",
        "Reject mistaken Discovery suggestion",
        "Reject for later manual review"
      ] })}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      intake.status = "rejected";
      intake.review = {
        reviewedAt: nowIso(),
        actorId: actor.id,
        actorName: actor.name,
        reason: data.reason.trim()
      };
      saveStore({ allowWithoutCoreApproval: true, reason: "intake-rejected" });
      return true;
    }
  });
}

function openArchiveIntakeModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.archived) return;
  showModal({
    title: t("archiveIntake"),
    submitText: t("archive"),
    body: `
      <p class="notice">${escapeHtml(t("archiveIntakeNotice"))}</p>
      ${auditFields({ reasonOptions: [
        "Archive after rejection cleanup",
        "Archive duplicate Discovery proposal",
        "Archive supporting material already handled elsewhere",
        "Archive test item",
        "Archive for later manual review"
      ] })}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      intake.archived = true;
      intake.review = {
        reviewedAt: nowIso(),
        actorId: actor.id,
        actorName: actor.name,
        reason: data.reason.trim()
      };
      saveStore({ allowWithoutCoreApproval: true, reason: "intake-archived" });
      return true;
    }
  });
}

function findIntakeItem(intakeId) {
  return (store.intakeItems || []).find((item) => item.id === intakeId) || null;
}

function renderIntakeApprovalPreview(intake) {
  const proposed = intake.proposedChange || {};
  return `
    <div class="inline-empty">
      <p><strong>${escapeDisplay(proposedObjectTypeLabel(intake.proposedObjectType), DISPLAY_META_LIMIT)}:</strong> ${escapeDisplay(intake.title, DISPLAY_META_LIMIT)}</p>
      <p>${escapeDisplay(proposed.text || t("noProposedTextRecorded"))}</p>
      ${proposed.summary ? `<p>${escapeDisplay(proposed.summary)}</p>` : ""}
    </div>
    ${renderIntakeProposalDiff(intake)}
  `;
}

function renderIntakeProposalDiff(intake) {
  const rows = intakeProposalDiffRows(intake);
  if (!rows.length) return "";
  return `
    <div class="inline-empty">
      <p><strong>${escapeHtml(t("proposalDiff"))}</strong></p>
      ${rows.map((row) => `
        <p><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(t("currentValue"))}: ${escapeDisplay(row.current || t("notRecorded"), DISPLAY_META_LIMIT)} · ${escapeHtml(t("proposedValue"))}: ${escapeDisplay(row.proposed || t("notRecorded"), DISPLAY_META_LIMIT)}</p>
      `).join("")}
    </div>
  `;
}

function intakeProposalDiffRows(intake) {
  const project = getProject(intake.projectId);
  const proposed = intake.proposedChange || {};
  if (!project) return [];
  if (proposed.proposalKind === "correction") {
    return [{ label: t("correctedContent"), current: proposed.previousText || t("notRecorded"), proposed: proposed.text }];
  }
  if (intake.proposedObjectType === "ProjectStatus") {
    return [
      { label: t("currentStatus"), current: project.currentStatus, proposed: proposed.text },
      { label: t("currentSummary"), current: project.currentSummary, proposed: proposed.summary }
    ];
  }
  return [
    { label: proposedObjectTypeLabel(intake.proposedObjectType), current: t("notRecorded"), proposed: proposed.text },
    { label: t("summary"), current: "", proposed: proposed.summary }
  ].filter((row) => row.proposed);
}

function applyApprovedIntakeToCore(intake, actor, reason, approval) {
  let project = getProject(intake.projectId);
  const proposed = intake.proposedChange || {};
  const text = String(proposed.text || intake.title || "").trim();
  const summary = String(proposed.summary || "").trim();
  const timestamp = nowIso();
  const baseDetails = {
    origin: "intake",
    intakeId: intake.id,
    intakeArmType: intake.armType,
    intakeTitle: intake.title,
    intakeApprovedAt: approval.approvedAt
  };

  if (!project && intake.destination === "proposed_new_project" && String(intake.proposedProjectName || "").trim()) {
    project = {
      id: uid("project"),
      name: String(intake.proposedProjectName).trim(),
      currentStatus: "New project created from approved Discovery intake",
      currentSummary: summary,
      healthFlag: "active",
      archived: false,
      deletionStatus: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: actor.id,
      sourceLinks: [],
      imageLinks: [],
      decisions: [],
      facts: [],
      conflicts: [],
      sources: [],
      draftProjects: [],
      relationships: [],
      openQuestions: [],
      nextActions: [],
      changes: []
    };
    intake.projectId = project.id;
    store.projects.unshift(project);
    recordChange(project, actor, reason, "Project created from approved Discovery intake", {
      ...baseDetails,
      objectType: "Project",
      objectId: project.id,
      objectText: project.name,
      fields: { status: project.currentStatus, summary: project.currentSummary, origin: "discovery" }
    });
  }

  if (!project) return null;

  if (proposed.proposalKind === "correction") {
    const targetType = proposed.targetObjectType || "";
    const target = getProjectObject(project, targetType, proposed.targetObjectId || "");
    const field = correctionFieldForObjectType(targetType);
    if (!target || !field || proposed.targetField !== field) return null;
    const previousText = String(target[field] || "");
    target[field] = text;
    target.updatedAt = timestamp;
    target.updatedBy = actor.id;
    recordChange(project, actor, reason, `${t("correctionApproved")}: ${targetType}`, {
      ...baseDetails,
      objectType: targetType,
      objectId: target.id,
      objectText: objectLabel(targetType, target),
      fields: {
        correctedField: field,
        previousText,
        newText: target[field]
      }
    });
    return target;
  }

  if (intake.proposedObjectType === "ProjectStatus") {
    const previous = {
      currentStatus: project.currentStatus,
      currentSummary: project.currentSummary
    };
    project.currentStatus = text;
    project.currentSummary = summary || project.currentSummary || "";
    recordChange(project, actor, reason, "Intake approved: Current status updated", {
      ...baseDetails,
      objectType: "Project",
      objectId: project.id,
      objectText: project.name,
      fields: {
        previousStatus: previous.currentStatus,
        newStatus: project.currentStatus,
        previousSummary: previous.currentSummary,
        newSummary: project.currentSummary
      }
    });
    return project;
  }

  if (intake.proposedObjectType === "Decision") {
    const decision = {
      id: uid("decision"),
      projectId: project.id,
      text,
      reason: summary || `Approved from ${armTypeLabel(intake.armType)} intake.`,
      confidence: "Approved intake",
      relationType: "",
      relatedDecisionId: "",
      actorId: actor.id,
      date: timestamp
    };
    project.decisions.unshift(decision);
    recordChange(project, actor, reason, "Intake approved: Decision added", {
      ...baseDetails,
      objectType: "Decision",
      objectId: decision.id,
      objectText: decision.text,
      fields: { decision: decision.text, reason: decision.reason }
    });
    return decision;
  }

  if (intake.proposedObjectType === "Fact") {
    const fact = {
      id: uid("fact"),
      projectId: project.id,
      statement: text,
      source: intake.sourceLabel || summary,
      confidence: "Approved intake",
      actorId: actor.id,
      createdAt: timestamp,
      status: "active"
    };
    project.facts.unshift(fact);
    recordChange(project, actor, reason, "Intake approved: Fact added", {
      ...baseDetails,
      objectType: "Fact",
      objectId: fact.id,
      objectText: fact.statement,
      fields: { fact: fact.statement, source: fact.source }
    });
    return fact;
  }

  if (intake.proposedObjectType === "Conflict") {
    const conflict = {
      id: uid("conflict"),
      projectId: project.id,
      title: intake.title || text,
      description: summary || text,
      linkedItems: proposed.target || "",
      status: "unresolved",
      resolution: "",
      noticedAt: timestamp,
      noticedBy: actor.id,
      reviewState: "needs_review",
      sourceLinks: [],
      imageLinks: [],
      assignments: [],
      comments: []
    };
    project.conflicts = Array.isArray(project.conflicts) ? project.conflicts : [];
    project.conflicts.unshift(conflict);
    recordChange(project, actor, reason, "Intake approved: Conflict added", {
      ...baseDetails,
      objectType: "Conflict",
      objectId: conflict.id,
      objectText: conflict.title,
      fields: { title: conflict.title, description: conflict.description, linkedItems: conflict.linkedItems, status: conflictStatusLabel(conflict.status) }
    });
    return conflict;
  }

  if (intake.proposedObjectType === "OpenQuestion") {
    const question = {
      id: uid("question"),
      projectId: project.id,
      question: text,
      context: summary,
      status: "open",
      actorId: actor.id,
      createdAt: timestamp
    };
    project.openQuestions.unshift(question);
    recordChange(project, actor, reason, "Intake approved: Open question added", {
      ...baseDetails,
      objectType: "OpenQuestion",
      objectId: question.id,
      objectText: question.question,
      fields: { question: question.question, context: question.context }
    });
    return question;
  }

  if (intake.proposedObjectType === "NextAction") {
    const action = {
      id: uid("action"),
      projectId: project.id,
      action: text,
      owner: proposed.target || "",
      dueDate: proposed.dueDate || "",
      completedAt: "",
      status: "open",
      actorId: actor.id,
      createdAt: timestamp
    };
    project.nextActions.unshift(action);
    recordChange(project, actor, reason, "Intake approved: Next action added", {
      ...baseDetails,
      objectType: "NextAction",
      objectId: action.id,
      objectText: action.action,
      fields: { action: action.action, owner: action.owner, dueDate: action.dueDate, status: action.status }
    });
    return action;
  }

  if (intake.proposedObjectType === "Source") {
    const managedFile = intake.evidence?.managedFile || null;
    const source = {
      id: uid("source"),
      projectId: project.id,
      title: text || intake.title,
      sourceType: armTypeLabel(intake.armType),
      trustLevel: "unverified",
      lastReviewedAt: "",
      reviewDueAt: "",
      reviewedBy: "",
      dateAdded: timestamp,
      actorId: actor.id,
      location: managedFile?.managedPath || intake.sourceLabel || "",
      summary,
      tags: [],
      extracts: [],
      status: "active",
      intakeId: intake.id,
      managedPath: managedFile?.managedPath || "",
      checksum: managedFile?.sha256 || "",
      localFile: managedFile ? {
        name: managedFile.fileName || text || intake.title,
        type: managedFile.contentType || "",
        size: Number(managedFile.size || 0),
        lastModified: intake.evidence?.originalFile?.lastModified || "",
        localPath: intake.evidence?.originalFile?.localPath || ""
      } : null,
      fileVerification: managedFile ? {
        status: "verified",
        exists: true,
        checkedAt: timestamp,
        reason: "Checksum verified during File Arm intake."
      } : null
    };
    project.sources.unshift(source);
    recordChange(project, actor, reason, "Intake approved: Source added", {
      ...baseDetails,
      objectType: "Source",
      objectId: source.id,
      objectText: source.title,
      fields: { source: source.title, type: source.sourceType, trustLevel: sourceTrustLabel(source.trustLevel), location: source.location, summary: source.summary, managedFile: managedFile?.fileName || "", checksum: managedFile?.sha256 || "" }
    });
    return source;
  }

  if (intake.proposedObjectType === "Relationship") {
    const relationship = {
      id: uid("relationship"),
      projectId: project.id,
      target: proposed.target || text,
      targetProjectId: resolveProjectIdByName(proposed.target || text, project.id),
      relationshipType: text,
      notes: summary,
      actorId: actor.id,
      createdAt: timestamp,
      status: "active"
    };
    project.relationships.unshift(relationship);
    recordChange(project, actor, reason, "Intake approved: Relationship added", {
      ...baseDetails,
      objectType: "Relationship",
      objectId: relationship.id,
      objectText: relationshipTargetLabel(relationship),
      fields: { target: relationshipTargetLabel(relationship), relationshipType: relationship.relationshipType, notes: relationship.notes }
    });
    return relationship;
  }

  return null;
}

function openCreateProjectModal() {
  showModal({
    title: t("createProject"),
    submitText: t("approveProject"),
    body: `
      <div class="field">
        <label for="name">${escapeHtml(t("projectName"))}</label>
        <input id="name" name="name" required>
      </div>
      <div class="field">
        <label for="currentStatus">${escapeHtml(t("currentStatus"))}</label>
        <input id="currentStatus" name="currentStatus" required>
      </div>
      <div class="field">
        <label for="healthFlag">${escapeHtml(t("projectHealth"))}</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions("active")}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">${escapeHtml(t("currentSummary"))}</label>
        <textarea id="currentSummary" name="currentSummary"></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "create", null)) return false;
      const timestamp = nowIso();
      const project = {
        id: uid("project"),
        name: data.name.trim(),
        currentStatus: data.currentStatus.trim(),
        currentSummary: data.currentSummary.trim(),
        healthFlag: normalizeHealthFlag(data.healthFlag),
        archived: false,
        deletionStatus: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: actor.id,
        sourceLinks: [],
        imageLinks: [],
        decisions: [],
        facts: [],
        conflicts: [],
        sources: [],
        draftProjects: [],
        relationships: [],
        openQuestions: [],
        nextActions: [],
        changes: []
      };
      recordChange(project, actor, data.reason, "Project created", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          status: project.currentStatus,
          summary: project.currentSummary,
          health: healthFlagLabel(project.healthFlag)
        }
      });
      store.projects.unshift(project);
      openProjectNow(project.id);
      saveStore();
    }
  });
}

function openDeleteProjectModal(projectId) {
  activeProjectId = projectId;
  const project = getProject(projectId);
  if (!project) return;
  if (project.archived) {
    openDeleteArchivedProjectModal(projectId);
    return;
  }

  showModal({
    title: t("deleteProject"),
    submitText: t("requestDeletion"),
    body: `
      <p class="notice">${escapeHtml(t("deletionNotice"))}</p>
      ${confirmationField("confirmDelete", "I understand this will archive the project and request deletion approval.")}
      ${auditFields()}
    `,
    onSubmit(data, form) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        archived: Boolean(project.archived),
        deletionStatus: project.deletionStatus || ""
      };
      project.archived = true;
      project.archivedAt = project.archivedAt || nowIso();
      project.archivedBy = project.archivedBy || actor.id;
      project.deletionStatus = "pending deletion approval";
      project.deletionRequestedAt = nowIso();
      project.deletionRequestedBy = actor.id;
      recordChange(project, actor, data.reason, "Project deletion requested", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          previousArchived: previous.archived,
          newArchived: project.archived,
          previousDeletionStatus: previous.deletionStatus,
          newDeletionStatus: project.deletionStatus
        }
      });
      activeProjectId = null;
      activeRootView = "projects";
      saveStore();
    }
  });
}

function validateTypedConfirmation(form, data, fieldName, expectedValue) {
  const field = form.querySelector(`[name="${fieldName}"]`);
  if (String(data[fieldName] || "").trim().toUpperCase() === expectedValue.toUpperCase()) return true;
  field?.setCustomValidity(`Type ${expectedValue}. Capitalization does not matter.`);
  field?.reportValidity();
  field?.setCustomValidity("");
  return false;
}

function openDeleteArchivedProjectModal(projectId) {
  activeProjectId = projectId;
  const project = getProject(projectId);
  if (!project || !project.archived) return;

  showModal({
    title: "Delete archived project",
    submitText: "Delete archived project",
    body: `
      <p class="notice">This permanently removes the archived project record from Project State. It also removes Intake/Airlock records tied to this project. Managed source-file cleanup is separate.</p>
      <div class="meta-grid">
        <div>
          <p class="meta-label">Project</p>
          <p>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</p>
        </div>
        <div>
          <p class="meta-label">Sources</p>
          <p>${escapeHtml(String((project.sources || []).length))}</p>
        </div>
        <div>
          <p class="meta-label">History records</p>
          <p>${escapeHtml(String((project.changes || []).length))}</p>
        </div>
        <div>
          <p class="meta-label">Related intake records</p>
          <p>${escapeHtml(String((store.intakeItems || []).filter((item) => item.projectId === project.id).length))}</p>
        </div>
      </div>
      ${confirmationField("confirmPermanentArchiveDelete", "I understand this archived project record will be removed from Project State.")}
      ${typedConfirmationField("deleteArchiveConfirmation", "Confirm deletion", "DELETE ARCHIVE")}
      ${auditFields({ actorLabel: t("changedBy"), reasonLabel: t("reason") })}
    `,
    onSubmit(data, form) {
      if (!validateTypedConfirmation(form, data, "deleteArchiveConfirmation", "DELETE ARCHIVE")) return false;
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "admin", null)) return false;
      appendArchivedDeletionAudit([project], actor, data.reason);
      removeIntakeRecordsForDeletedArchives([project]);
      store.projects = store.projects.filter((item) => item.id !== project.id);
      if (activeProjectId === project.id) activeProjectId = null;
      activeRootView = "archived";
      saveStore({ allowWithoutCoreApproval: true, preserveConcurrentApiIntake: false, reason: "archived-project-delete" });
    }
  });
}

function openDeleteAllArchivedProjectsModal() {
  const projects = sortNewest(store.projects.filter((project) => project.archived), "updatedAt");
  const archivedIntakeCount = visibleIntakeItems(store.intakeItems || []).filter((item) => item.archived).length;
  const projectIds = new Set(projects.map((project) => project.id));
  const relatedIntakeCount = visibleIntakeItems(store.intakeItems || []).filter((item) => item.projectId && projectIds.has(item.projectId)).length;
  if (!projects.length && !archivedIntakeCount) return;

  showModal({
    title: "Delete all archived records",
    submitText: "Delete all archived",
    body: `
      <p class="notice">This permanently removes archived project records from Project State. It also removes archived Intake/Airlock records and Intake records tied to the removed projects. Managed source-file cleanup is separate.</p>
      <div class="meta-grid">
        <div>
          <p class="meta-label">Archived projects</p>
          <p>${escapeHtml(String(projects.length))}</p>
        </div>
        <div>
          <p class="meta-label">Archived intake records</p>
          <p>${escapeHtml(String(archivedIntakeCount))}</p>
        </div>
        <div>
          <p class="meta-label">Project-linked intake records</p>
          <p>${escapeHtml(String(relatedIntakeCount))}</p>
        </div>
      </div>
      ${projects.length ? `<div class="item">
        <p class="meta-label">Archived records to remove</p>
        <ul>
          ${projects.slice(0, 20).map((project) => `<li>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</li>`).join("")}
          ${projects.length > 20 ? `<li>…and ${escapeHtml(String(projects.length - 20))} more</li>` : ""}
        </ul>
      </div>` : ""}
      ${confirmationField("confirmPermanentAllArchiveDelete", "I understand archived Project State records will be removed.")}
      ${typedConfirmationField("deleteAllArchivesConfirmation", "Confirm deletion", "DELETE ALL ARCHIVED")}
      ${auditFields({ actorLabel: t("changedBy"), reasonLabel: t("reason") })}
    `,
    onSubmit(data, form) {
      if (!validateTypedConfirmation(form, data, "deleteAllArchivesConfirmation", "DELETE ALL ARCHIVED")) return false;
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "admin", null)) return false;
      const archivedIds = new Set(projects.map((project) => project.id));
      appendArchivedDeletionAudit(projects, actor, data.reason);
      removeIntakeRecordsForDeletedArchives(projects, { includeAllArchivedIntake: true });
      store.projects = store.projects.filter((project) => !archivedIds.has(project.id));
      if (activeProjectId && archivedIds.has(activeProjectId)) activeProjectId = null;
      activeRootView = "archived";
      saveStore({ allowWithoutCoreApproval: true, preserveConcurrentApiIntake: false, reason: "all-archived-projects-delete" });
    }
  });
}

function openUnarchiveProjectModal(projectId) {
  activeProjectId = projectId;
  const project = getProject(projectId);
  if (!project || !project.archived) return;

  showModal({
    title: t("unarchiveProject"),
    submitText: t("approveUnarchive"),
    body: `
      <p class="notice">${escapeHtml(t("unarchiveNotice"))}</p>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        archived: Boolean(project.archived),
        deletionStatus: project.deletionStatus || ""
      };
      project.archived = false;
      project.unarchivedAt = nowIso();
      project.unarchivedBy = actor.id;
      project.deletionStatus = "";
      recordChange(project, actor, data.reason, "Project unarchived", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          previousArchived: previous.archived,
          newArchived: project.archived,
          previousDeletionStatus: previous.deletionStatus,
          newDeletionStatus: project.deletionStatus
        }
      });
      activeProjectId = null;
      activeRootView = "projects";
      saveStore();
    }
  });
}

function openEditStatusModal() {
  const project = getProject();
  showModal({
    title: t("editCurrentStatus"),
    submitText: t("approveChange"),
    body: `
      <div class="field">
        <label for="currentStatus">${escapeHtml(t("currentStatus"))}</label>
        <input id="currentStatus" name="currentStatus" value="${escapeHtml(project.currentStatus)}" required>
      </div>
      <div class="field">
        <label for="healthFlag">${escapeHtml(t("projectHealth"))}</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions(project.healthFlag)}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">${escapeHtml(t("currentSummary"))}</label>
        <textarea id="currentSummary" name="currentSummary">${escapeHtml(project.currentSummary)}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        status: project.currentStatus,
        summary: project.currentSummary,
        healthFlag: project.healthFlag || "active"
      };
      project.currentStatus = data.currentStatus.trim();
      project.currentSummary = data.currentSummary.trim();
      project.healthFlag = normalizeHealthFlag(data.healthFlag);
      recordChange(project, actor, data.reason, "Current status updated", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          previousStatus: previous.status,
          newStatus: project.currentStatus,
          previousSummary: previous.summary,
          newSummary: project.currentSummary,
          previousHealth: healthFlagLabel(previous.healthFlag),
          newHealth: healthFlagLabel(project.healthFlag)
        }
      });
      saveStore();
    }
  });
}

function openEditObjectModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!object) return;

  if (objectType === "Project") {
    openEditProjectModal(project);
    return;
  }

  if (objectType === "Decision") {
    openEditDecisionModal(project, object);
    return;
  }

  if (objectType === "Fact") {
    openEditFactModal(project, object);
    return;
  }

  if (objectType === "Conflict") {
    openEditConflictModal(project, object);
    return;
  }

  if (objectType === "Source") {
    openEditSourceModal(project, object);
    return;
  }

  if (objectType === "Extract") {
    openEditExtractModal(project, object);
    return;
  }

  if (objectType === "Relationship") {
    openEditRelationshipModal(project, object);
    return;
  }

  if (objectType === "DraftProject") {
    openEditDraftProjectModal(project, object);
    return;
  }

  if (objectType === "OpenQuestion") {
    openEditQuestionModal(project, object);
    return;
  }

  if (objectType === "NextAction") {
    openEditActionModal(project, object);
  }
}

function openEditProjectModal(project) {
  showModal({
    title: t("editProject"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="name">${escapeHtml(t("projectName"))}</label>
        <input id="name" name="name" value="${escapeHtml(project.name)}" required>
      </div>
      <div class="field">
        <label for="currentStatus">${escapeHtml(t("currentStatus"))}</label>
        <input id="currentStatus" name="currentStatus" value="${escapeHtml(project.currentStatus)}" required>
      </div>
      <div class="field">
        <label for="healthFlag">${escapeHtml(t("projectHealth"))}</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions(project.healthFlag)}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">${escapeHtml(t("currentSummary"))}</label>
        <textarea id="currentSummary" name="currentSummary">${escapeHtml(project.currentSummary)}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        name: project.name,
        status: project.currentStatus,
        summary: project.currentSummary,
        healthFlag: project.healthFlag || "active"
      };
      project.name = data.name.trim();
      project.currentStatus = data.currentStatus.trim();
      project.currentSummary = data.currentSummary.trim();
      project.healthFlag = normalizeHealthFlag(data.healthFlag);
      recordChange(project, actor, data.reason, "Project edited", {
        objectType: "Project",
        objectId: project.id,
        objectText: project.name,
        fields: {
          previousName: previous.name,
          newName: project.name,
          previousStatus: previous.status,
          newStatus: project.currentStatus,
          previousSummary: previous.summary,
          newSummary: project.currentSummary,
          previousHealth: healthFlagLabel(previous.healthFlag),
          newHealth: healthFlagLabel(project.healthFlag)
        }
      });
      saveStore();
    }
  });
}

function openEditDecisionModal(project, decision) {
  showModal({
    title: t("editDecision"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="decision">${escapeHtml(t("decision"))}</label>
        <textarea id="decision" name="decision" required>${escapeHtml(decision.text)}</textarea>
      </div>
      <div class="field">
        <label for="confidence">${escapeHtml(t("confidence"))}</label>
        <select id="confidence" name="confidence">
          ${["High", "Medium", "Low", "Unknown"].map((value) => `<option ${decision.confidence === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </div>
      ${decisionRelationFields(project, decision)}
      ${auditFields()}
    `,
    onSubmit(data, form) {
      if (!validateDecisionRelation(data, form)) return false;
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        text: decision.text,
        confidence: decision.confidence,
        relationType: decision.relationType || "",
        relatedDecisionId: decision.relatedDecisionId || ""
      };
      decision.text = data.decision.trim();
      decision.confidence = data.confidence;
      decision.relationType = normalizeDecisionRelationType(data.relationType);
      decision.relatedDecisionId = decision.relationType ? data.relatedDecisionId : "";
      decision.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Decision edited", {
        objectType: "Decision",
        objectId: decision.id,
        objectText: decision.text,
        fields: {
          previousDecision: previous.text,
          newDecision: decision.text,
          previousConfidence: previous.confidence,
          newConfidence: decision.confidence,
          previousRelation: decisionRelationLabel(previous.relationType),
          newRelation: decisionRelationLabel(decision.relationType),
          previousRelatedDecisionId: previous.relatedDecisionId,
          newRelatedDecisionId: decision.relatedDecisionId,
          previousRelatedDecision: decisionById(project, previous.relatedDecisionId)?.text || "",
          newRelatedDecision: decisionById(project, decision.relatedDecisionId)?.text || ""
        }
      });
      saveStore();
    }
  });
}

function openEditFactModal(project, fact) {
  showModal({
    title: t("editFact"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="statement">${escapeHtml(t("fact"))}</label>
        <textarea id="statement" name="statement" required>${escapeHtml(fact.statement)}</textarea>
      </div>
      <div class="field">
        <label for="source">${escapeHtml(t("source"))}</label>
        <input id="source" name="source" value="${escapeHtml(fact.source || "")}">
      </div>
      <div class="field">
        <label for="confidence">${escapeHtml(t("confidence"))}</label>
        <select id="confidence" name="confidence">
          ${["High", "Medium", "Low", "Unknown"].map((value) => `<option ${fact.confidence === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        statement: fact.statement,
        source: fact.source,
        confidence: fact.confidence
      };
      fact.statement = data.statement.trim();
      fact.source = data.source.trim();
      fact.confidence = data.confidence;
      fact.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Fact edited", {
        objectType: "Fact",
        objectId: fact.id,
        objectText: fact.statement,
        fields: {
          previousFact: previous.statement,
          newFact: fact.statement,
          previousSource: previous.source,
          newSource: fact.source,
          previousConfidence: previous.confidence,
          newConfidence: fact.confidence
        }
      });
      saveStore();
    }
  });
}

function openEditConflictModal(project, conflict) {
  showModal({
    title: t("editConflict"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="title">${escapeHtml(t("conflictTitle"))}</label>
        <input id="title" name="title" value="${escapeHtml(conflict.title || "")}" required>
      </div>
      <div class="field">
        <label for="status">${escapeHtml(t("conflictStatus"))}</label>
        <select id="status" name="status">${conflictStatusOptions(conflict.status)}</select>
      </div>
      <div class="field">
        <label for="description">${escapeHtml(t("conflictDescription"))}</label>
        <textarea id="description" name="description" required>${escapeHtml(conflict.description || "")}</textarea>
      </div>
      <div class="field">
        <label for="linkedItems">${escapeHtml(t("linkedItems"))}</label>
        <textarea id="linkedItems" name="linkedItems">${escapeHtml(conflict.linkedItems || "")}</textarea>
      </div>
      <div class="field">
        <label for="resolution">${escapeHtml(t("resolution"))}</label>
        <textarea id="resolution" name="resolution">${escapeHtml(conflict.resolution || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        title: conflict.title,
        status: conflict.status,
        description: conflict.description,
        linkedItems: conflict.linkedItems,
        resolution: conflict.resolution
      };
      conflict.title = data.title.trim();
      conflict.status = normalizeConflictStatus(data.status);
      conflict.description = data.description.trim();
      conflict.linkedItems = data.linkedItems.trim();
      conflict.resolution = data.resolution.trim();
      conflict.reviewState = conflict.status === "resolved" ? "approved" : "needs_review";
      conflict.updatedAt = nowIso();
      conflict.updatedBy = actor.id;
      recordChange(project, actor, data.reason, "Conflict edited", {
        objectType: "Conflict",
        objectId: conflict.id,
        objectText: conflict.title,
        fields: {
          previousTitle: previous.title,
          newTitle: conflict.title,
          previousStatus: conflictStatusLabel(previous.status),
          newStatus: conflictStatusLabel(conflict.status),
          previousDescription: previous.description,
          newDescription: conflict.description,
          previousLinkedItems: previous.linkedItems,
          newLinkedItems: conflict.linkedItems,
          previousResolution: previous.resolution,
          newResolution: conflict.resolution
        }
      });
      saveStore();
    }
  });
}

function openEditSourceModal(project, source) {
  showModal({
    title: t("editSource"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="title">${escapeHtml(t("title"))}</label>
        <input id="title" name="title" value="${escapeHtml(source.title)}" required>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="sourceType">${escapeHtml(t("type"))}</label>
          <input id="sourceType" name="sourceType" list="source-type-suggestions" value="${escapeHtml(source.sourceType || "")}">
          ${sourceTypeDatalist()}
        </div>
        <div class="field">
          <label for="trustLevel">${escapeHtml(t("sourceTrustLevel"))}</label>
          <select id="trustLevel" name="trustLevel">${sourceTrustOptions(source.trustLevel)}</select>
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="dateAdded">${escapeHtml(t("dateAdded"))}</label>
          <input id="dateAdded" name="dateAdded" type="date" value="${escapeHtml(toDateInputValue(source.dateAdded))}" required>
        </div>
      </div>
      <div class="field">
        <label for="location">${escapeHtml(t("location"))}</label>
        <input id="location" name="location" value="${escapeHtml(source.location || "")}">
      </div>
      <div class="field">
        <label for="localFile">${escapeHtml(t("findLocalFile"))}</label>
        ${sourceFilePickerMarkup()}
      </div>
      <div class="field">
        <label>${escapeHtml(t("linkedProjectStateUsers"))}</label>
        <p class="notice">${escapeHtml(t("communicationRecordsNotice"))}</p>
        ${linkedActorCheckboxes(source.linkedActorIds)}
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary">${escapeHtml(source.summary || "")}</textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags" value="${escapeHtml(tagsToText(source.tags))}">
      </div>
      ${auditFields()}
    `,
    onSubmit(data, form) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        title: source.title,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        dateAdded: source.dateAdded,
        location: source.location,
        localFile: source.localFile ? `${source.localFile.name} (${formatBytes(source.localFile.size)})` : "",
        summary: source.summary,
        tags: tagsToText(source.tags),
        linkedUsers: linkedActorNames(source.linkedActorIds).join(", ")
      };
      const localFile = selectedSourceFileMetadata(form, data.localFile);
      const linkedActorIds = selectedLinkedActorIds(form);
      source.title = data.title.trim();
      source.sourceType = data.sourceType.trim();
      source.trustLevel = normalizeSourceTrustLevel(data.trustLevel);
      source.dateAdded = data.dateAdded || source.dateAdded;
      source.location = data.location.trim() || localFile?.name || "";
      source.localFile = localFile || source.localFile || null;
      if (localFile) source.fileVerification = null;
      source.summary = data.summary.trim();
      source.tags = tagsFromText(data.tags);
      source.linkedActorIds = linkedActorIds;
      source.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Source edited", {
        objectType: "Source",
        objectId: source.id,
        objectText: source.title,
        fields: {
          previousTitle: previous.title,
          newTitle: source.title,
          previousType: previous.sourceType,
          newType: source.sourceType,
          previousTrustLevel: sourceTrustLabel(previous.trustLevel),
          newTrustLevel: sourceTrustLabel(source.trustLevel),
          previousDateAdded: previous.dateAdded,
          newDateAdded: source.dateAdded,
          previousLocation: previous.location,
          newLocation: source.location,
          previousLocalFile: previous.localFile,
          newLocalFile: source.localFile ? `${source.localFile.name} (${formatBytes(source.localFile.size)})` : "",
          previousSummary: previous.summary,
          newSummary: source.summary,
          previousTags: previous.tags,
          newTags: tagsToText(source.tags),
          previousLinkedUsers: previous.linkedUsers,
          newLinkedUsers: linkedActorNames(source.linkedActorIds).join(", ")
        }
      });
      saveStore();
    }
  });
}

function openEditExtractModal(project, extract) {
  showModal({
    title: t("editExtract"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="text">${escapeHtml(t("extract"))}</label>
        <textarea id="text" name="text" required>${escapeHtml(extract.text)}</textarea>
      </div>
      <div class="field">
        <label for="extractMode">${escapeHtml(t("mode"))}</label>
        <select id="extractMode" name="extractMode">
          <option value="manual" ${extract.extractMode === "manual" || !extract.extractMode ? "selected" : ""}>Manual</option>
          <option value="with_approval" ${extract.extractMode === "with_approval" ? "selected" : ""}>With approval</option>
          <option value="ai_suggested" ${extract.extractMode === "ai_suggested" ? "selected" : ""}>AI suggested</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary">${escapeHtml(extract.summary || "")}</textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags" value="${escapeHtml(tagsToText(extract.tags))}">
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        text: extract.text,
        extractMode: extract.extractMode || "manual",
        suggestionStatus: extract.suggestionStatus || "",
        summary: extract.summary,
        tags: tagsToText(extract.tags)
      };
      extract.text = data.text.trim();
      extract.extractMode = data.extractMode;
      extract.suggestionStatus = extract.extractMode === "ai_suggested"
        ? (extract.suggestionStatus || "pending_approval")
        : "";
      extract.summary = data.summary.trim();
      extract.tags = tagsFromText(data.tags);
      extract.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Extract edited", {
        objectType: "Extract",
        objectId: extract.id,
        objectText: extract.text,
        sourceId: extract.sourceId,
        fields: {
          previousExtract: previous.text,
          newExtract: extract.text,
          previousMode: previous.extractMode,
          newMode: extract.extractMode,
          previousSuggestionStatus: previous.suggestionStatus,
          newSuggestionStatus: extract.suggestionStatus,
          previousSummary: previous.summary,
          newSummary: extract.summary,
          previousTags: previous.tags,
          newTags: tagsToText(extract.tags)
        }
      });
      saveStore();
    }
  });
}

function openEditRelationshipModal(project, relationship) {
  showModal({
    title: t("editRelationship"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="target">${escapeHtml(t("relatedProjectOrEntity"))}</label>
        <input id="target" name="target" list="project-suggestions" value="${escapeHtml(relationship.target)}" required>
        ${projectSuggestionDatalist()}
      </div>
      <div class="field">
        <label for="relationshipType">${escapeHtml(t("relationshipType"))}</label>
        <input id="relationshipType" name="relationshipType" list="relationship-type-suggestions" value="${escapeHtml(relationship.relationshipType || "")}">
        ${relationshipTypeDatalist()}
      </div>
      <div class="field">
        <label for="notes">${escapeHtml(t("notes"))}</label>
        <textarea id="notes" name="notes">${escapeHtml(relationship.notes || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        target: relationship.target,
        targetProjectId: relationship.targetProjectId || "",
        relationshipType: relationship.relationshipType,
        notes: relationship.notes
      };
      relationship.target = data.target.trim();
      relationship.targetProjectId = resolveProjectIdByName(relationship.target, project.id);
      relationship.relationshipType = data.relationshipType.trim();
      relationship.notes = data.notes.trim();
      relationship.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Relationship edited", {
        objectType: "Relationship",
        objectId: relationship.id,
        objectText: relationshipTargetLabel(relationship),
        fields: {
          previousTarget: previous.target,
          newTarget: relationshipTargetLabel(relationship),
          previousTargetProjectId: previous.targetProjectId,
          newTargetProjectId: relationship.targetProjectId || "",
          previousRelationshipType: previous.relationshipType,
          newRelationshipType: relationship.relationshipType,
          previousNotes: previous.notes,
          newNotes: relationship.notes
        }
      });
      saveStore();
    }
  });
}

function sourceForExtract(project, extract) {
  return project.sources.find((source) => source.id === extract.sourceId) || null;
}

function openCreateDraftProjectModal(extractId) {
  const project = getProject();
  const extract = getProjectObject(project, "Extract", extractId);
  const source = extract ? sourceForExtract(project, extract) : null;
  if (!project || !extract || !source) return;

  showModal({
    title: t("createDraftProject"),
    submitText: t("createDraft"),
    body: `
      <p class="notice">${escapeHtml(t("createDraftFromExtractNotice"))}</p>
      <div class="field">
        <label for="name">${escapeHtml(t("name"))}</label>
        <input id="name" name="name" value="${escapeHtml(source.title || t("draftProjectDefault"))}" required>
      </div>
      <div class="field">
        <label for="sourceLabel">${escapeHtml(t("source"))}</label>
        <input id="sourceLabel" name="sourceLabel" value="${escapeHtml(source.title)}" disabled>
      </div>
      <div class="field">
        <label for="draft">${escapeHtml(t("draft"))}</label>
        <textarea id="draft" name="draft" required>${escapeHtml(extract.text || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const timestamp = nowIso();
      const draftProject = {
        id: uid("draft_project"),
        projectId: project.id,
        name: data.name.trim(),
        createdAt: timestamp,
        createdDate: timestamp,
        sourceId: source.id,
        sourceTitle: source.title,
        extractId: extract.id,
        draft: data.draft.trim(),
        status: "draft",
        reviewFlags: normalizeDraftReviewFlags(),
        actorId: actor.id,
        sourceLinks: [],
        imageLinks: []
      };
      project.draftProjects.unshift(draftProject);
      recordChange(project, actor, data.reason, "Draft project created", {
        objectType: "DraftProject",
        objectId: draftProject.id,
        objectText: draftProject.name,
        sourceId: source.id,
        extractId: extract.id,
        fields: {
          name: draftProject.name,
          source: source.title,
          status: draftProject.status
        }
      });
      saveStore();
    }
  });
}

function openEditDraftProjectModal(project, draftProject) {
  const flags = normalizeDraftReviewFlags(draftProject.reviewFlags);
  showModal({
    title: t("reviewDraftProject"),
    submitText: t("saveReview"),
    body: `
      <div class="field">
        <label for="name">${escapeHtml(t("name"))}</label>
        <input id="name" name="name" value="${escapeHtml(draftProject.name)}" required>
      </div>
      <div class="field">
        <label for="draft">${escapeHtml(t("draft"))}</label>
        <textarea id="draft" name="draft" required>${escapeHtml(draftProject.draft || "")}</textarea>
      </div>
      <div class="check-list">
        ${reviewCheckbox("factsReviewed", t("factsReviewed"), flags.factsReviewed)}
        ${reviewCheckbox("decisionsReviewed", t("decisionsReviewed"), flags.decisionsReviewed)}
        ${reviewCheckbox("questionsReviewed", t("questionsReviewed"), flags.questionsReviewed)}
        ${reviewCheckbox("actionsReviewed", t("actionsReviewed"), flags.actionsReviewed)}
        ${reviewCheckbox("relationshipsReviewed", t("relationshipsReviewed"), flags.relationshipsReviewed)}
        ${reviewCheckbox("readyForApproval", t("readyForApproval"), flags.readyForApproval)}
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        name: draftProject.name,
        draft: draftProject.draft,
        reviewFlags: { ...normalizeDraftReviewFlags(draftProject.reviewFlags) }
      };
      draftProject.name = data.name.trim();
      draftProject.draft = data.draft.trim();
      draftProject.reviewFlags = reviewFlagsFromData(data);
      draftProject.reviewedAt = nowIso();
      draftProject.reviewedBy = actor.id;
      recordChange(project, actor, data.reason, "Draft project reviewed", {
        objectType: "DraftProject",
        objectId: draftProject.id,
        objectText: draftProject.name,
        fields: {
          previousName: previous.name,
          newName: draftProject.name,
          previousDraft: previous.draft,
          newDraft: draftProject.draft,
          previousReviewFlags: reviewFlagsSummary(previous.reviewFlags),
          newReviewFlags: reviewFlagsSummary(draftProject.reviewFlags)
        }
      });
      saveStore();
    }
  });
}

function reviewCheckbox(name, label, checked) {
  return `
    <label class="check-field">
      <input type="checkbox" name="${name}" ${checked ? "checked" : ""}>
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function reviewFlagsFromData(data) {
  const flags = {};
  for (const flag of DRAFT_REVIEW_FLAGS) flags[flag] = data[flag] === "on";
  return flags;
}

function reviewFlagsSummary(flags = {}) {
  const normalized = normalizeDraftReviewFlags(flags);
  return DRAFT_REVIEW_FLAGS
    .filter((flag) => normalized[flag])
    .join(", ") || "none";
}

function openApproveDraftProjectModal(draftProjectId) {
  const project = getProject();
  const draftProject = getProjectObject(project, "DraftProject", draftProjectId);
  const airlockFlags = draftAirlockChecks(draftProject || {});
  if (!project || !draftProject || draftProject.status === "approved" || !allRequiredFlagsPass(airlockFlags)) {
    window.alert(t("airlockIncompleteNotice"));
    return;
  }

  showModal({
    title: t("approveDraft"),
    submitText: t("approveToProject"),
    body: `
      <p class="notice">${escapeHtml(t("approvalCreatesProjectNotice"))}</p>
      <div class="field">
        <label>${escapeHtml(t("requiredAirlockChecks"))}</label>
        ${renderFlagPills(airlockFlags)}
      </div>
      <div class="field">
        <label for="name">${escapeHtml(t("approvedProjectName"))}</label>
        <input id="name" name="name" value="${escapeHtml(draftProject.name)}" required>
      </div>
      <div class="field">
        <label for="currentSummary">${escapeHtml(t("approvedProjectSummary"))}</label>
        <textarea id="currentSummary" name="currentSummary" required>${escapeHtml(draftProject.draft || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "approve", project)) return false;
      const timestamp = nowIso();
      const source = draftProject.sourceId ? getProjectObject(project, "Source", draftProject.sourceId) : null;
      const extract = draftProject.extractId ? getProjectObject(project, "Extract", draftProject.extractId) : null;
      const sourceLink = source ? {
        id: uid("source_link"),
        sourceProjectId: project.id,
        sourceId: source.id,
        sourceTitle: source.title,
        sourceType: source.sourceType || source.type || "",
        extractId: extract?.id || draftProject.extractId || "",
        extractTitle: extract?.title || "",
        attachedAt: timestamp,
        actorId: actor.id
      } : null;
      const approvedProject = {
        id: uid("project"),
        name: data.name.trim(),
        currentStatus: "Approved draft project",
        currentSummary: data.currentSummary.trim(),
        healthFlag: "active",
        archived: false,
        deletionStatus: "",
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedBy: actor.id,
        sourceLinks: sourceLink ? [sourceLink] : [],
        imageLinks: [],
        decisions: [],
        facts: [],
        conflicts: [],
        sources: [],
        draftProjects: [],
        relationships: [],
        openQuestions: [],
        nextActions: [],
        changes: [],
        draftSource: {
          sourceProjectId: project.id,
          draftProjectId: draftProject.id,
          sourceId: draftProject.sourceId,
          extractId: draftProject.extractId
        }
      };

      draftProject.status = "approved";
      draftProject.approvedAt = timestamp;
      draftProject.approvedBy = actor.id;
      draftProject.approvalReason = data.reason.trim();
      draftProject.approvedProjectId = approvedProject.id;

      recordChange(project, actor, data.reason, "Draft project approved", {
        objectType: "DraftProject",
        objectId: draftProject.id,
        objectText: draftProject.name,
        approvedProjectId: approvedProject.id,
        fields: {
          approvedBy: actor.name,
          approvedAt: timestamp,
          reason: draftProject.approvalReason,
          approvedProjectName: approvedProject.name,
          sourceId: source?.id || draftProject.sourceId || "",
          extractId: extract?.id || draftProject.extractId || ""
        }
      });
      recordChange(approvedProject, actor, data.reason, "Project created from approved draft", {
        objectType: "Project",
        objectId: approvedProject.id,
        objectText: approvedProject.name,
        draftProjectId: draftProject.id,
        sourceProjectId: project.id,
        sourceId: source?.id || draftProject.sourceId || "",
        extractId: extract?.id || draftProject.extractId || "",
        fields: {
          source: source?.title || draftProject.sourceTitle || "",
          extractId: extract?.id || draftProject.extractId || "",
          draftProject: draftProject.name
        }
      });
      store.projects.unshift(approvedProject);
      openProjectNow(approvedProject.id);
      saveStore();
    }
  });
}

function openEditQuestionModal(project, question) {
  showModal({
    title: t("editOpenQuestion"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="question">${escapeHtml(t("openQuestion"))}</label>
        <textarea id="question" name="question" required>${escapeHtml(question.question)}</textarea>
      </div>
      <div class="field">
        <label for="context">${escapeHtml(t("context"))}</label>
        <textarea id="context" name="context">${escapeHtml(question.context || "")}</textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        question: question.question,
        context: question.context
      };
      question.question = data.question.trim();
      question.context = data.context.trim();
      question.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Open question edited", {
        objectType: "OpenQuestion",
        objectId: question.id,
        objectText: question.question,
        fields: {
          previousQuestion: previous.question,
          newQuestion: question.question,
          previousContext: previous.context,
          newContext: question.context
        }
      });
      saveStore();
    }
  });
}

function openEditActionModal(project, action) {
  showModal({
    title: t("editNextAction"),
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="action">${escapeHtml(t("nextAction"))}</label>
        <textarea id="action" name="action" required>${escapeHtml(action.action)}</textarea>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="owner">${escapeHtml(t("ownerField"))}</label>
          <input id="owner" name="owner" list="actor-suggestions" value="${escapeHtml(action.owner || "")}">
          ${actorSuggestionDatalist()}
        </div>
        <div class="field">
          <label for="dueDate">${escapeHtml(t("dueDate"))}</label>
          <input id="dueDate" name="dueDate" type="date" value="${escapeHtml(action.dueDate || "")}">
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="status">${escapeHtml(t("status"))}</label>
          <select id="status" name="status">
            ${["open", "completed", "archived"].map((value) => `<option value="${value}" ${getActionStatus(action) === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="completedAt">${escapeHtml(t("completedDate"))}</label>
          <input id="completedAt" name="completedAt" type="date" value="${escapeHtml(toDateInputValue(action.completedAt))}">
        </div>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        action: action.action,
        owner: action.owner,
        dueDate: action.dueDate,
        status: getActionStatus(action),
        completedAt: action.completedAt || ""
      };
      action.action = data.action.trim();
      action.owner = data.owner.trim();
      action.dueDate = data.dueDate || "";
      action.status = normalizeActionStatus(data.status);
      action.completedAt = action.status === "completed" ? (data.completedAt || nowIso()) : "";
      action.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Next action edited", {
        objectType: "NextAction",
        objectId: action.id,
        objectText: action.action,
        fields: {
          previousAction: previous.action,
          newAction: action.action,
          previousOwner: previous.owner,
          newOwner: action.owner,
          previousDueDate: previous.dueDate,
          newDueDate: action.dueDate,
          previousStatus: previous.status,
          newStatus: action.status,
          previousCompletedAt: previous.completedAt,
          newCompletedAt: action.completedAt
        }
      });
      saveStore();
    }
  });
}

function openMarkCompleteModal(actionId) {
  const project = getProject();
  const action = getProjectObject(project, "NextAction", actionId);
  if (!action || getActionStatus(action) !== "open") return;

  showModal({
    title: t("markActionComplete"),
    submitText: t("approveCompletion"),
    body: `
      <div class="field">
        <label for="completedAt">${escapeHtml(t("completedDate"))}</label>
        <input id="completedAt" name="completedAt" type="date" value="${escapeHtml(toDateInputValue(nowIso()))}" required>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        status: getActionStatus(action),
        completedAt: action.completedAt || ""
      };
      action.status = "completed";
      action.completedAt = data.completedAt || nowIso();
      action.completedBy = actor.id;
      recordChange(project, actor, data.reason, "Next action completed", {
        objectType: "NextAction",
        objectId: action.id,
        objectText: action.action,
        fields: {
          previousStatus: previous.status,
          newStatus: action.status,
          previousCompletedAt: previous.completedAt,
          newCompletedAt: action.completedAt
        }
      });
      saveStore();
    }
  });
}

function openAISuggestExtractModal(sourceId) {
  const project = getProject();
  const source = getProjectObject(project, "Source", sourceId);
  if (!source) return;

  showModal({
    title: t("suggestExtract"),
    submitText: t("recordSuggestion"),
    body: `
      <div class="field">
        <label for="suggestedBy">${escapeHtml(t("suggestedBy"))}</label>
        <input id="suggestedBy" name="suggestedBy" value="AI" required>
      </div>
      <div class="field">
        <label for="text">${escapeHtml(t("suggestedExtract"))}</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const extract = {
        id: uid("extract"),
        projectId: project.id,
        sourceId: source.id,
        text: data.text.trim(),
        extractMode: "ai_suggested",
        suggestionStatus: "pending_approval",
        suggestedBy: data.suggestedBy.trim(),
        summary: data.summary.trim(),
        tags: tagsFromText(data.tags),
        dateAdded: nowIso(),
        actorId: actor.id,
        status: "active"
      };
      source.extracts.unshift(extract);
      recordChange(project, actor, data.reason, "AI extract suggested", {
        objectType: "Extract",
        objectId: extract.id,
        objectText: extract.text,
        sourceId: source.id,
        fields: {
          source: source.title,
          mode: extract.extractMode,
          suggestionStatus: extract.suggestionStatus,
          suggestedBy: extract.suggestedBy,
          recordedBy: actor.name,
          project: project.name,
          summary: extract.summary,
          tags: tagsToText(extract.tags)
        }
      });
      saveStore();
    }
  });
}

function openApproveExtractModal(extractId) {
  const project = getProject();
  const extract = getProjectObject(project, "Extract", extractId);
  if (!extract || extract.extractMode !== "ai_suggested" || extract.suggestionStatus !== "pending_approval") return;

  showModal({
    title: t("approveExtract"),
    submitText: t("approveExtract"),
    body: `
      <p class="notice">${escapeHtml(t("approvalRecordsSuggestionNotice"))}</p>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      if (!validateActorPermission(actor, "approve", project)) return false;
      const previous = extract.suggestionStatus;
      extract.suggestionStatus = "approved";
      extract.approvedAt = nowIso();
      extract.approvedBy = actor.id;
      recordChange(project, actor, data.reason, "AI suggested extract approved", {
        objectType: "Extract",
        objectId: extract.id,
        objectText: extract.text,
        sourceId: extract.sourceId,
        fields: {
          previousSuggestionStatus: previous,
          newSuggestionStatus: extract.suggestionStatus,
          approvedBy: actor.name,
          approvedAt: extract.approvedAt
        }
      });
      saveStore();
    }
  });
}

function openAttachSourceModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!project || !object || !canAttachSource(objectType)) return;

  const sources = sortNewest(project.sources.filter((source) => source.status !== "archived"));
  if (!sources.length) {
    showModal({
      title: t("attachSource"),
      submitText: t("close"),
      body: `<p class="notice">${escapeHtml(t("addSourceBeforeAttaching"))}</p>`,
      onSubmit() {}
    });
    return;
  }

  showModal({
    title: t("attachSource"),
    submitText: t("approveAttachment"),
    body: `
      <div class="field">
        <label for="sourceId">${escapeHtml(t("source"))}</label>
        <select id="sourceId" name="sourceId" required>
          ${sources.map((source) => `<option value="${source.id}">${escapeHtml(source.title)}</option>`).join("")}
        </select>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const source = getProjectObject(project, "Source", data.sourceId);
      if (!source) return;
      const actor = getOrCreateActor(data.actorName, "Human");
      object.sourceLinks = Array.isArray(object.sourceLinks) ? object.sourceLinks : [];
      const existing = object.sourceLinks.some((link) => link.sourceId === source.id);
      if (existing) return;

      const attachment = {
        id: uid("source_link"),
        sourceId: source.id,
        sourceTitle: source.title,
        sourceType: source.sourceType || "",
        attachedAt: nowIso(),
        actorId: actor.id
      };
      object.sourceLinks.unshift(attachment);
      recordChange(project, actor, data.reason, "Source attached", {
        objectType,
        objectId,
        objectText: objectLabel(objectType, object),
        attachedSourceId: source.id,
        attachedSourceTitle: source.title,
        fields: {
          source: source.title,
          targetType: objectType,
          target: objectLabel(objectType, object)
        }
      });
      saveStore();
    }
  });
}

function openAttachImageModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!project || !object || !canAttachImage(objectType)) return;

  showModal({
    title: t("attachImage"),
    submitText: t("approveImage"),
    body: `
      <div class="field">
        <label for="imageFile">${escapeHtml(t("imageFile"))}</label>
        <input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required>
      </div>
      <div class="field">
        <label for="caption">${escapeHtml(t("captionNotes"))}</label>
        <textarea id="caption" name="caption"></textarea>
      </div>
      ${auditFields()}
    `,
    async onSubmit(data, form) {
      const fileField = form.querySelector('[name="imageFile"]');
      const file = fileField?.files?.[0] || data.imageFile;
      if (!file || !isSupportedImageFile(file)) {
        fileField?.setCustomValidity(t("validationImageFileType"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      const actor = getOrCreateActor(data.actorName, "Human");
      const dataUrl = await readFileAsDataUrl(file);
      const attachment = {
        id: uid("image"),
        projectId: project.id,
        attachedToType: objectType,
        attachedToId: objectId,
        fileName: file.name,
        fileType: file.type || file.name.split(".").pop() || "",
        dateAdded: nowIso(),
        addedBy: actor.id,
        caption: String(data.caption || "").trim(),
        localPath: platformAdapter.files.localPath(file),
        dataUrl
      };

      object.imageLinks = Array.isArray(object.imageLinks) ? object.imageLinks : [];
      object.imageLinks.unshift(attachment);
      recordChange(project, actor, data.reason, "Image attached", {
        objectType,
        objectId,
        objectText: objectLabel(objectType, object),
        imageId: attachment.id,
        imageFileName: attachment.fileName,
        fields: {
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          caption: attachment.caption,
          attachedToType: attachment.attachedToType,
          attachedToId: attachment.attachedToId
        }
      });
      saveStore();
      return true;
    }
  });
}

function openImageViewer(objectType, objectId, imageId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  const image = object?.imageLinks?.find((item) => item.id === imageId);
  if (!image) return;

  showModal({
    title: image.fileName || t("attachedImage"),
    submitText: t("close"),
    body: `
      <div class="image-viewer">
        ${image.dataUrl ? `<img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.caption || image.fileName || t("attachedImageAlt"))}">` : emptyText(t("imageDataUnavailable"))}
        ${image.caption ? `<p class="item-body">${escapeDisplay(image.caption)}</p>` : ""}
        <p class="item-meta">${escapeHtml(image.fileType || t("attachedImage"))} · ${escapeHtml(t("added"))} ${escapeHtml(formatDate(image.dateAdded))} · ${escapeHtml(actorDisplay(image.addedBy))}</p>
        ${image.localPath ? `<p class="item-meta">${escapeHtml(t("localReference"))}: ${escapeDisplay(image.localPath, DISPLAY_META_LIMIT)}</p>` : ""}
      </div>
    `,
    onSubmit() {}
  });
}

function openVerifySourceFileModal(sourceId = "", options = {}) {
  const sourceRecord = sourceId ? findSourceRecord(sourceId) : null;
  const title = sourceRecord ? `${t("verifyFile")}: ${sourceRecord.source.title}` : t("verifySourceFiles");
  showModal({
    title,
    submitText: t("verifyFile"),
    body: `
      <p class="notice">${escapeHtml(t("sourceFileVerificationNotice"))}</p>
      ${auditFields({ reasonLabel: t("verificationReasonPlaceholder") })}
    `,
    async onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const reason = String(data.reason || "").trim();
      const changedCount = sourceRecord
        ? await verifySourceFileRecord(sourceRecord.project, sourceRecord.source, actor, reason)
        : await verifyAllSourceFiles(actor, reason);
      if (changedCount) saveStore();
      setSaveStatus("saved", t("sourceFileVerificationComplete"));
      return true;
    }
  });
}

function openReviewSourceFreshnessModal(sourceId = "") {
  const sourceRecord = findSourceRecord(sourceId);
  if (!sourceRecord) return;
  const { project, source } = sourceRecord;
  const today = toDateInputValue(nowIso());
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 90);

  showModal({
    title: `${t("reviewSourceFreshness")}: ${source.title}`,
    submitText: t("reviewFreshness"),
    body: `
      <p class="notice">${escapeHtml(t("freshnessReviewNotice"))}</p>
      <div class="two-col">
        <div class="field">
          <label for="lastReviewedAt">${escapeHtml(t("freshnessLastReviewed"))}</label>
          <input id="lastReviewedAt" name="lastReviewedAt" type="date" value="${escapeHtml(toDateInputValue(source.lastReviewedAt) || today)}" required>
        </div>
        <div class="field">
          <label for="reviewDueAt">${escapeHtml(t("freshnessNextReview"))}</label>
          <input id="reviewDueAt" name="reviewDueAt" type="date" value="${escapeHtml(toDateInputValue(source.reviewDueAt) || toDateInputValue(defaultDue.toISOString()))}" required>
        </div>
      </div>
      ${auditFields()}
    `,
    onSubmit(data, form) {
      if (Date.parse(data.reviewDueAt) < Date.parse(data.lastReviewedAt)) {
        const field = form.querySelector('[name="reviewDueAt"]');
        field?.setCustomValidity(t("validationReviewDueAfterReviewed"));
        field?.reportValidity();
        field?.setCustomValidity("");
        return false;
      }

      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        lastReviewedAt: source.lastReviewedAt || "",
        reviewDueAt: source.reviewDueAt || "",
        reviewedBy: source.reviewedBy || "",
        state: sourceStalenessState(source)
      };
      source.lastReviewedAt = data.lastReviewedAt;
      source.reviewDueAt = data.reviewDueAt;
      source.reviewedBy = actor.id;
      source.editedAt = nowIso();
      recordChange(project, actor, data.reason, t("freshnessReviewed"), {
        objectType: "Source",
        objectId: source.id,
        objectText: source.title,
        fields: {
          previousFreshness: sourceStalenessLabel(previous.state),
          newFreshness: sourceStalenessLabel(sourceStalenessState(source)),
          previousReviewedAt: previous.lastReviewedAt,
          newReviewedAt: source.lastReviewedAt,
          previousReviewDueAt: previous.reviewDueAt,
          newReviewDueAt: source.reviewDueAt,
          previousReviewedBy: previous.reviewedBy ? actorDisplay(previous.reviewedBy) : "",
          newReviewedBy: actorDisplay(source.reviewedBy)
        }
      });
      saveStore();
      return true;
    }
  });
}

async function verifyAllSourceFiles(actor, reason) {
  const byProject = new Map();
  let changedCount = 0;
  for (const project of store.projects || []) {
    for (const source of project.sources || []) {
      const result = await verifySourceFile(source, actor);
      source.fileVerification = result;
      changedCount += 1;
      if (!byProject.has(project.id)) byProject.set(project.id, { project, results: [] });
      byProject.get(project.id).results.push(result);
    }
  }

  for (const { project, results } of byProject.values()) {
    const counts = sourceVerificationCounts(results);
    recordChange(project, actor, reason, "Source files verified", {
      objectType: "Project",
      objectId: project.id,
      objectText: project.name,
      fields: counts
    });
  }
  return changedCount;
}

async function verifySourceFileRecord(project, source, actor, reason) {
  const result = await verifySourceFile(source, actor);
  const previous = source.fileVerification ? sourceFileStatusLabel(source.fileVerification.status) : t("notRecorded");
  source.fileVerification = result;
  recordChange(project, actor, reason, "Source file verified", {
    objectType: "Source",
    objectId: source.id,
    objectText: source.title,
    fields: {
      previousStatus: previous,
      newStatus: sourceFileStatusLabel(result.status),
      path: result.path || "",
      exists: result.exists ? "yes" : "no",
      detail: result.reason || ""
    }
  });
  return 1;
}

async function verifySourceFile(source, actor) {
  const reference = sourceFileReference(source);
  const checkedAt = nowIso();
  let result = null;
  try {
    result = await platformAdapter.files.verifyLocalFile(reference);
  } catch (error) {
    result = {
      status: "unverifiable",
      exists: false,
      checkedAt,
      reason: error?.message || "Source file could not be verified."
    };
  }
  return normalizeSourceFileVerification(result, source, actor, checkedAt);
}

function normalizeSourceFileVerification(result = {}, source, actor, fallbackCheckedAt = nowIso()) {
  return {
    status: ["verified", "changed", "missing", "unverifiable"].includes(result.status) ? result.status : "unverifiable",
    exists: Boolean(result.exists),
    path: result.path || sourceFileReference(source).localPath || "",
    checkedAt: result.checkedAt || fallbackCheckedAt,
    checkedBy: actor.id,
    reason: result.reason || "",
    actual: result.actual || null,
    expected: result.expected || sourceFileReference(source).expected
  };
}

function sourceVerificationCounts(results = []) {
  return {
    totalSources: results.length,
    verified: results.filter((result) => result.status === "verified").length,
    changed: results.filter((result) => result.status === "changed").length,
    missing: results.filter((result) => result.status === "missing").length,
    unverifiable: results.filter((result) => result.status === "unverifiable").length
  };
}

function sourceFileReference(source = {}) {
  const localFile = source.localFile || {};
  const localPath = localFile.localPath || source.localPath || (isAbsoluteLocalPath(source.location) ? source.location : "");
  return {
    localPath,
    path: localPath,
    managedPath: source.managedPath || "",
    expected: {
      name: localFile.name || source.title || "",
      type: localFile.type || source.sourceType || "",
      size: Number(localFile.size || 0),
      lastModified: localFile.lastModified || "",
      sha256: source.checksum || ""
    }
  };
}

function isAbsoluteLocalPath(value = "") {
  const text = String(value || "").trim();
  return /^[a-zA-Z]:[\\/]/.test(text) || /^\\\\/.test(text) || /^\//.test(text);
}

function findSourceRecord(sourceId = "") {
  for (const project of store.projects || []) {
    const source = (project.sources || []).find((item) => item.id === sourceId);
    if (source) return { project, source };
  }
  return null;
}

function openArchiveObjectModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!object) return;

  showModal({
    title: `${escapeHtml(t("archive"))} ${escapeHtml(objectType)}`,
    submitText: t("approveArchive"),
    body: `
      <p class="notice">${escapeHtml(t("archiveObjectNotice"))}</p>
      ${confirmationField("confirmArchive", `${t("archiveObjectNotice")} (${objectType})`)}
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const timestamp = nowIso();
      if (objectType === "Project" || objectType === "Decision") {
        object.archived = true;
      } else {
        object.status = "archived";
      }
      object.archivedAt = timestamp;
      object.archivedBy = actor.id;
      recordChange(project, actor, data.reason, `${objectType} archived`, {
        objectType,
        objectId,
        objectText: objectLabel(objectType, object),
        fields: {
          status: "archived"
        }
      });
      saveStore();
    }
  });
}

function openDecisionModal() {
  const project = getProject();
  showModal({
    title: t("addDecision"),
    submitText: t("approveDecision"),
    body: `
      <div class="field">
        <label for="decision">${escapeHtml(t("decision"))}</label>
        <textarea id="decision" name="decision" required></textarea>
      </div>
      <div class="field">
        <label for="confidence">${escapeHtml(t("confidence"))}</label>
        <select id="confidence" name="confidence">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
          <option>Unknown</option>
        </select>
      </div>
      ${decisionRelationFields(project)}
      ${auditFields()}
    `,
    onSubmit(data, form) {
      if (!validateDecisionRelation(data, form)) return false;
      const actor = getOrCreateActor(data.actorName, "Human");
      const decision = {
        id: uid("decision"),
        projectId: project.id,
        text: data.decision.trim(),
        reason: data.reason.trim(),
        actorId: actor.id,
        confidence: data.confidence,
        relationType: normalizeDecisionRelationType(data.relationType),
        relatedDecisionId: normalizeDecisionRelationType(data.relationType) ? data.relatedDecisionId : "",
        date: nowIso()
      };
      project.decisions.unshift(decision);
      recordChange(project, actor, data.reason, "Decision added", {
        objectType: "Decision",
        objectId: decision.id,
        objectText: decision.text,
        fields: {
          decision: decision.text,
          relationship: decisionRelationLabel(decision.relationType),
          relatedDecisionId: decision.relatedDecisionId,
          relatedDecision: decisionById(project, decision.relatedDecisionId)?.text || ""
        }
      });
      saveStore();
    }
  });
}

function openFactModal() {
  const project = getProject();
  showModal({
    title: t("addFact"),
    submitText: t("approveFact"),
    body: `
      <div class="field">
        <label for="statement">${escapeHtml(t("fact"))}</label>
        <textarea id="statement" name="statement" required></textarea>
      </div>
      <div class="field">
        <label for="source">${escapeHtml(t("source"))}</label>
        <input id="source" name="source">
      </div>
      <div class="field">
        <label for="confidence">${escapeHtml(t("confidence"))}</label>
        <select id="confidence" name="confidence">
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
          <option>Unknown</option>
        </select>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const fact = {
        id: uid("fact"),
        projectId: project.id,
        statement: data.statement.trim(),
        source: data.source.trim(),
        confidence: data.confidence,
        status: "active",
        actorId: actor.id,
        createdAt: nowIso()
      };
      project.facts.unshift(fact);
      recordChange(project, actor, data.reason, "Fact added", {
        objectType: "Fact",
        objectId: fact.id,
        objectText: fact.statement,
        fields: {
          source: fact.source,
          confidence: fact.confidence,
          status: fact.status
        }
      });
      saveStore();
    }
  });
}

function openConflictModal() {
  const project = getProject();
  showModal({
    title: t("addConflict"),
    submitText: t("approveChange"),
    body: `
      <div class="field">
        <label for="title">${escapeHtml(t("conflictTitle"))}</label>
        <input id="title" name="title" required>
      </div>
      <div class="field">
        <label for="status">${escapeHtml(t("conflictStatus"))}</label>
        <select id="status" name="status">${conflictStatusOptions("unresolved")}</select>
      </div>
      <div class="field">
        <label for="description">${escapeHtml(t("conflictDescription"))}</label>
        <textarea id="description" name="description" required></textarea>
      </div>
      <div class="field">
        <label for="linkedItems">${escapeHtml(t("linkedItems"))}</label>
        <textarea id="linkedItems" name="linkedItems"></textarea>
      </div>
      <div class="field">
        <label for="resolution">${escapeHtml(t("resolution"))}</label>
        <textarea id="resolution" name="resolution"></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const conflict = {
        id: uid("conflict"),
        projectId: project.id,
        title: data.title.trim(),
        description: data.description.trim(),
        linkedItems: data.linkedItems.trim(),
        status: normalizeConflictStatus(data.status),
        resolution: data.resolution.trim(),
        noticedAt: nowIso(),
        noticedBy: actor.id,
        reviewState: data.status === "resolved" ? "approved" : "needs_review",
        sourceLinks: [],
        imageLinks: [],
        assignments: [],
        comments: []
      };
      project.conflicts = Array.isArray(project.conflicts) ? project.conflicts : [];
      project.conflicts.unshift(conflict);
      recordChange(project, actor, data.reason, "Conflict added", {
        objectType: "Conflict",
        objectId: conflict.id,
        objectText: conflict.title,
        fields: {
          status: conflictStatusLabel(conflict.status),
          linkedItems: conflict.linkedItems,
          resolution: conflict.resolution
        }
      });
      saveStore();
    }
  });
}

function openSourceModal() {
  const project = getProject();
  showModal({
    title: t("addSource"),
    submitText: t("approveSource"),
    body: `
      <div class="field">
        <label for="title">${escapeHtml(t("title"))}</label>
        <input id="title" name="title" required>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="sourceType">${escapeHtml(t("type"))}</label>
          <input id="sourceType" name="sourceType" list="source-type-suggestions">
          ${sourceTypeDatalist()}
        </div>
        <div class="field">
          <label for="trustLevel">${escapeHtml(t("sourceTrustLevel"))}</label>
          <select id="trustLevel" name="trustLevel">${sourceTrustOptions("unverified")}</select>
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="dateAdded">${escapeHtml(t("dateAdded"))}</label>
          <input id="dateAdded" name="dateAdded" type="date" value="${escapeHtml(toDateInputValue(nowIso()))}" required>
        </div>
      </div>
      <div class="field">
        <label for="location">${escapeHtml(t("location"))}</label>
        <input id="location" name="location">
      </div>
      <div class="field">
        <label for="localFile">${escapeHtml(t("findLocalFile"))}</label>
        ${sourceFilePickerMarkup()}
      </div>
      <div class="field">
        <label>${escapeHtml(t("linkedProjectStateUsers"))}</label>
        <p class="notice">${escapeHtml(t("communicationRecordsNotice"))}</p>
        ${linkedActorCheckboxes()}
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    onSubmit(data, form) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const localFile = selectedSourceFileMetadata(form, data.localFile);
      const linkedActorIds = selectedLinkedActorIds(form);
      const source = {
        id: uid("source"),
        projectId: project.id,
        title: data.title.trim() || localFile?.name || t("untitledSource"),
        sourceType: data.sourceType.trim(),
        trustLevel: normalizeSourceTrustLevel(data.trustLevel),
        lastReviewedAt: "",
        reviewDueAt: "",
        reviewedBy: "",
        dateAdded: data.dateAdded || nowIso(),
        actorId: actor.id,
        location: data.location.trim() || localFile?.name || "",
        localFile,
        summary: data.summary.trim(),
        tags: tagsFromText(data.tags),
        linkedActorIds,
        extracts: [],
        status: "active"
      };
      project.sources.unshift(source);
      recordChange(project, actor, data.reason, "Source added", {
        objectType: "Source",
        objectId: source.id,
        objectText: source.title,
        fields: {
          title: source.title,
          type: source.sourceType,
          trustLevel: sourceTrustLabel(source.trustLevel),
          dateAdded: source.dateAdded,
          actor: actor.name,
          project: project.name,
          location: source.location,
          localFile: localFile ? `${localFile.name} (${formatBytes(localFile.size)})` : "",
          summary: source.summary,
          tags: tagsToText(source.tags),
          linkedUsers: linkedActorNames(source.linkedActorIds).join(", ")
        }
      });
      saveStore();
    }
  });
}

function openExtractModal(sourceId) {
  const project = getProject();
  const source = getProjectObject(project, "Source", sourceId);
  if (!source) return;

  showModal({
    title: t("addExtract"),
    submitText: t("approveExtract"),
    body: `
      <div class="field">
        <label for="text">${escapeHtml(t("extract"))}</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="extractMode">${escapeHtml(t("mode"))}</label>
        <select id="extractMode" name="extractMode">
          <option value="manual">Manual</option>
          <option value="with_approval">With approval</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const extract = {
        id: uid("extract"),
        projectId: project.id,
        sourceId: source.id,
        text: data.text.trim(),
        extractMode: data.extractMode,
        summary: data.summary.trim(),
        tags: tagsFromText(data.tags),
        dateAdded: nowIso(),
        actorId: actor.id,
        status: "active"
      };
      source.extracts.unshift(extract);
      recordChange(project, actor, data.reason, "Extract added", {
        objectType: "Extract",
        objectId: extract.id,
        objectText: extract.text,
        sourceId: source.id,
        fields: {
          source: source.title,
          dateAdded: extract.dateAdded,
          mode: extract.extractMode,
          actor: actor.name,
          project: project.name,
          summary: extract.summary,
          tags: tagsToText(extract.tags)
        }
      });
      saveStore();
    }
  });
}

function openReadFileExtractModal(sourceId) {
  const project = getProject();
  const source = getProjectObject(project, "Source", sourceId);
  if (!source) return;

  showModal({
    title: t("readFileExtract"),
    submitText: t("approveExtract"),
    body: `
      <p class="notice">${escapeHtml(t("readsFileExtractNotice"))}</p>
      <div class="field">
        <label for="extractFile">${escapeHtml(t("file"))}</label>
        <input id="extractFile" name="extractFile" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" required>
      </div>
      <div class="field">
        <label for="extractMode">${escapeHtml(t("mode"))}</label>
        <select id="extractMode" name="extractMode">
          <option value="manual">Manual</option>
          <option value="with_approval">With approval</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summary"))}</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">${escapeHtml(t("tags"))}</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    async onSubmit(data, form) {
      const fileField = form.querySelector('[name="extractFile"]');
      const file = fileField?.files?.[0] || data.extractFile;
      if (!file || !isSupportedExtractFile(file)) {
        fileField?.setCustomValidity(t("validationExtractFileType"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let extracted;
      try {
        extracted = truncateExtractedText(await extractTextFromFile(file));
      } catch (error) {
        fileField?.setCustomValidity(error.message || t("validationReadExtractFailed"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      if (!extracted.text) {
        fileField?.setCustomValidity(t("validationNoReadableText"));
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      const actor = getOrCreateActor(data.actorName, "Human");
      const extract = {
        id: uid("extract"),
        projectId: project.id,
        sourceId: source.id,
        text: extracted.text,
        extractMode: data.extractMode,
        summary: String(data.summary || "").trim(),
        tags: tagsFromText(data.tags),
        dateAdded: nowIso(),
        actorId: actor.id,
        status: "active",
        extractedFromFile: {
          fileName: file.name,
          fileType: file.type || extractFileExtension(file.name),
          localPath: platformAdapter.files.localPath(file),
          truncated: extracted.truncated
        }
      };
      source.extracts.unshift(extract);
      recordChange(project, actor, data.reason, "File extract added", {
        objectType: "Extract",
        objectId: extract.id,
        objectText: extract.text,
        sourceId: source.id,
        fields: {
          source: source.title,
          fileName: extract.extractedFromFile.fileName,
          fileType: extract.extractedFromFile.fileType,
          truncated: extracted.truncated ? "yes" : "no",
          mode: extract.extractMode,
          actor: actor.name,
          project: project.name,
          summary: extract.summary,
          tags: tagsToText(extract.tags)
        }
      });
      saveStore();
      return true;
    }
  });
}

function openRelationshipModal() {
  const project = getProject();
  showModal({
    title: t("addRelationship"),
    submitText: t("approveRelationship"),
    body: `
      <div class="field">
        <label for="target">${escapeHtml(t("relatedProjectOrEntity"))}</label>
        <input id="target" name="target" list="project-suggestions" required>
        ${projectSuggestionDatalist()}
      </div>
      <div class="field">
        <label for="relationshipType">${escapeHtml(t("relationshipType"))}</label>
          <input id="relationshipType" name="relationshipType" list="relationship-type-suggestions" placeholder="${escapeHtml(t("relationshipPlaceholder"))}">
          ${relationshipTypeDatalist()}
      </div>
      <div class="field">
        <label for="notes">${escapeHtml(t("notes"))}</label>
        <textarea id="notes" name="notes"></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const relationship = {
        id: uid("relationship"),
        projectId: project.id,
        target: data.target.trim(),
        targetProjectId: resolveProjectIdByName(data.target.trim(), project.id),
        relationshipType: data.relationshipType.trim(),
        notes: data.notes.trim(),
        status: "active",
        actorId: actor.id,
        createdAt: nowIso()
      };
      project.relationships.unshift(relationship);
      recordChange(project, actor, data.reason, "Relationship added", {
        objectType: "Relationship",
        objectId: relationship.id,
        objectText: relationshipTargetLabel(relationship),
        fields: {
          targetProjectId: relationship.targetProjectId || "",
          relationshipType: relationship.relationshipType,
          notes: relationship.notes,
          status: relationship.status
        }
      });
      saveStore();
    }
  });
}

function openQuestionModal() {
  const project = getProject();
  showModal({
    title: t("addOpenQuestion"),
    submitText: t("approveQuestion"),
    body: `
      <div class="field">
        <label for="question">${escapeHtml(t("openQuestion"))}</label>
        <textarea id="question" name="question" required></textarea>
      </div>
      <div class="field">
        <label for="context">${escapeHtml(t("context"))}</label>
        <textarea id="context" name="context"></textarea>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const question = {
        id: uid("question"),
        projectId: project.id,
        question: data.question.trim(),
        context: data.context.trim(),
        status: "open",
        actorId: actor.id,
        createdAt: nowIso()
      };
      project.openQuestions.unshift(question);
      recordChange(project, actor, data.reason, "Open question added", {
        objectType: "OpenQuestion",
        objectId: question.id,
        objectText: question.question
      });
      saveStore();
    }
  });
}

function openActionModal() {
  const project = getProject();
  showModal({
    title: t("addNextAction"),
    submitText: t("approveAction"),
    body: `
      <div class="field">
        <label for="action">${escapeHtml(t("nextAction"))}</label>
        <textarea id="action" name="action" required></textarea>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="owner">${escapeHtml(t("ownerField"))}</label>
          <input id="owner" name="owner" list="actor-suggestions">
          ${actorSuggestionDatalist()}
        </div>
        <div class="field">
          <label for="dueDate">${escapeHtml(t("dueDate"))}</label>
          <input id="dueDate" name="dueDate" type="date">
        </div>
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const action = {
        id: uid("action"),
        projectId: project.id,
        action: data.action.trim(),
        owner: data.owner.trim(),
        dueDate: data.dueDate || "",
        completedAt: "",
        status: "open",
        actorId: actor.id,
        createdAt: nowIso()
      };
      project.nextActions.unshift(action);
      recordChange(project, actor, data.reason, "Next action added", {
        objectType: "NextAction",
        objectId: action.id,
        objectText: action.action,
        fields: {
          createdAt: action.createdAt,
          dueDate: action.dueDate,
          completedAt: action.completedAt,
          status: action.status
        }
      });
      saveStore();
    }
  });
}

function stampSettingsUpdate(actorId, reason) {
  store.settings.settingsUpdatedAt = nowIso();
  store.settings.settingsUpdatedBy = actorId || store.settings.primaryActorId || "";
  store.settings.settingsUpdateReason = String(reason || "").trim();
}

function validateSettingsReason(form, data) {
  const reasonField = form.querySelector('[name="reason"]');
  if (String(data.reason || "").trim()) return true;
  reasonField?.setCustomValidity(t("validationReasonRequired"));
  reasonField?.reportValidity();
  reasonField?.setCustomValidity("");
  return false;
}

function saveSettingsCore(data, form) {
  if (!validateSettingsReason(form, data)) return;
  const primaryActor = getActor(data.primaryActorId);
  const actorField = form.querySelector('[name="primaryActorId"]');
  if (!primaryActor || normalizeActorStatus(primaryActor.status) !== "active") {
    actorField?.setCustomValidity(t("validationActiveDefaultActor"));
    actorField?.reportValidity();
    actorField?.setCustomValidity("");
    return;
  }
  store.settings.language = normalizeLanguage(data.language);
  store.settings.primaryActorId = primaryActor.id;
  store.settings.recoveryWarnings = data.recoveryWarnings === "on";
  stampSettingsUpdate(primaryActor.id, data.reason);
  saveStore({ allowWithoutCoreApproval: true, reason: "settings-core-update" });
  render();
}

function saveSettingsStorage(data, form) {
  if (!validateSettingsReason(form, data)) return;
  if (data.storageOverrideAcknowledged === "on" && !String(data.storageOverrideReason || "").trim()) {
    const field = form.querySelector('[name="storageOverrideReason"]');
    field?.setCustomValidity(t("validationStorageOverrideReason"));
    field?.reportValidity();
    field?.setCustomValidity("");
    return;
  }
  store.settings.storageSystem = "platform_storage_spine";
  store.settings.storageOverrideAcknowledged = data.storageOverrideAcknowledged === "on";
  store.settings.storageOverrideReason = String(data.storageOverrideReason || "").trim();
  stampSettingsUpdate(store.settings.primaryActorId, data.reason);
  saveStore({ allowWithoutCoreApproval: true, reason: "settings-storage-update" });
  render();
}

function saveSettingsBackup(data, form) {
  if (!validateSettingsReason(form, data)) return;
  if (data.backupOverrideAcknowledged === "on" && !String(data.backupOverrideReason || "").trim()) {
    const field = form.querySelector('[name="backupOverrideReason"]');
    field?.setCustomValidity(t("validationBackupOverrideReason"));
    field?.reportValidity();
    field?.setCustomValidity("");
    return;
  }
  store.settings.backupSystem = "user_controlled_backup";
  store.settings.backupLocationHint = String(data.backupLocationHint || "").trim();
  store.settings.backupReminder = ["manual", "weekly", "monthly"].includes(data.backupReminder) ? data.backupReminder : "manual";
  store.settings.backupOverrideAcknowledged = data.backupOverrideAcknowledged === "on";
  store.settings.backupOverrideReason = String(data.backupOverrideReason || "").trim();
  stampSettingsUpdate(store.settings.primaryActorId, data.reason);
  saveStore({ allowWithoutCoreApproval: true, reason: "settings-backup-update" });
  render();
}

function saveSettingsActor(data, form) {
  if (!validateSettingsReason(form, data)) return;
  const actor = getActor(form.dataset.actorId);
  if (!actor) return;
  const nextName = String(data.actorName || "").trim();
  const nameField = form.querySelector('[name="actorName"]');
  if (!nextName) {
    nameField?.setCustomValidity(t("validationActorNameRequired"));
    nameField?.reportValidity();
    nameField?.setCustomValidity("");
    return;
  }
  const nextStatus = normalizeActorStatus(data.status);
  if (store.settings.primaryActorId === actor.id && nextStatus === "archived") {
    const statusField = form.querySelector('[name="status"]');
    statusField?.setCustomValidity(t("validationDefaultActorArchive"));
    statusField?.reportValidity();
    statusField?.setCustomValidity("");
    return;
  }
  actor.name = nextName;
  actor.role = normalizeActorRole(data.role, actor.type);
  actor.status = nextStatus;
  actor.type = actor.role === "ai_tool" ? "AI / Tool" : "Human";
  actor.emailAddress = String(data.emailAddress || "").trim();
  actor.chatHandle = String(data.chatHandle || "").trim();
  actor.updatedAt = nowIso();
  actor.updatedReason = String(data.reason || "").trim();
  stampSettingsUpdate(store.settings.primaryActorId, data.reason);
  saveStore({ allowWithoutCoreApproval: true, reason: "settings-actor-update" });
  render();
}

function addSettingsActor(data, form) {
  if (!validateSettingsReason(form, data)) return;
  const name = String(data.actorName || "").trim();
  const nameField = form.querySelector('[name="actorName"]');
  if (!name) {
    nameField?.setCustomValidity(t("validationActorNameRequired"));
    nameField?.reportValidity();
    nameField?.setCustomValidity("");
    return;
  }
  const existing = store.actors.find((actor) => nameKey(actor.name) === nameKey(name));
  if (existing) {
    nameField?.setCustomValidity(t("validationActorExists"));
    nameField?.reportValidity();
    nameField?.setCustomValidity("");
    return;
  }
  const role = normalizeActorRole(data.role);
  store.actors.push({
    id: uid("actor"),
    name,
    type: role === "ai_tool" ? "AI / Tool" : "Human",
    role,
    status: "active",
    emailAddress: String(data.emailAddress || "").trim(),
    chatHandle: String(data.chatHandle || "").trim(),
    createdAt: nowIso(),
    createdReason: String(data.reason || "").trim()
  });
  stampSettingsUpdate(store.settings.primaryActorId, data.reason);
  saveStore({ allowWithoutCoreApproval: true, reason: "settings-actor-add" });
  render();
}

async function refreshArmTransportStatus() {
  if (!platformAdapter.armTransport?.available) {
    armTransportStatus = { ...armTransportStatus, available: false };
    return armTransportStatus;
  }
  try {
    const status = await platformAdapter.armTransport.status();
    armTransportStatus = { ...armTransportStatus, ...(status || {}), available: true };
  } catch (error) {
    armTransportStatus = { ...armTransportStatus, available: true, running: false, lastError: error?.message || "STATUS_FAILED" };
  }
  return armTransportStatus;
}

function openArmTransportActionModal(operation) {
  const definitions = {
    enable: { title: t("enableTransport"), submit: t("enableTransport"), notice: t("transportEnableNotice") },
    disable: { title: t("disableTransport"), submit: t("disableTransport"), notice: t("transportDisableNotice") },
    rotate: { title: t("rotateTransportToken"), submit: t("rotateTransportToken"), notice: t("transportRotateNotice") },
    revoke: { title: t("revokeTransport"), submit: t("revokeTransport"), notice: t("transportRevokeNotice") }
  };
  const definition = definitions[operation];
  if (!definition || !platformAdapter.armTransport?.available) return;
  showModal({
    title: definition.title,
    submitText: definition.submit,
    body: `
      <p class="notice">${escapeHtml(definition.notice)}</p>
      ${operation === "enable" ? `
        <div class="field">
          <label for="transportPort">${escapeHtml(t("transportPort"))}</label>
          <input id="transportPort" name="transportPort" type="number" min="1024" max="65535" value="${escapeHtml(armTransportStatus.configuredPort || 32145)}" required>
        </div>
      ` : ""}
      ${auditFields({ actorLabel: t("changedBy"), reasonLabel: t("reason") })}
    `,
    async onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const payload = { actorId: actor.id, reason: data.reason };
      let result = null;
      if (operation === "enable") result = await platformAdapter.armTransport.enable({ ...payload, port: Number(data.transportPort) });
      if (operation === "disable") result = await platformAdapter.armTransport.disable(payload);
      if (operation === "rotate") result = await platformAdapter.armTransport.rotateToken(payload);
      if (operation === "revoke") result = await platformAdapter.armTransport.revoke(payload);
      armTransportStatus = { ...armTransportStatus, ...(result || {}), available: true };
      if (result?.token) queuePostModalAction(() => openArmTransportTokenModal(result.token));
    }
  });
}

function openArmTransportTokenModal(token) {
  showModal({
    title: t("transportTokenTitle"),
    submitText: t("tokenSaved"),
    body: `
      <p class="notice">${escapeHtml(t("tokenOneTimeNotice"))}</p>
      <div class="field">
        <label for="transportToken">${escapeHtml(t("secureToken"))}</label>
        <textarea id="transportToken" name="transportToken" readonly>${escapeHtml(token)}</textarea>
      </div>
    `,
    onSubmit() {}
  });
}

app.addEventListener("click", (event) => {
  const openedSummary = event.target.closest("details.action-menu > summary");
  if (!openedSummary) return;
  const activeMenu = openedSummary.closest("details.action-menu");
  for (const menu of app.querySelectorAll("details.action-menu[open]")) {
    if (menu !== activeMenu) menu.open = false;
  }
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  for (const menu of app.querySelectorAll("details.action-menu[open]")) menu.open = false;
  if (button.closest(".object-detail-panel") && activeObjectDetail && action !== "close-object-detail") {
    pendingFlowReturnContext = { ...activeObjectDetail };
    activeObjectDetail = null;
  } else if (activeProjectId && button.dataset.objectType && button.dataset.objectId && !["open-object-detail", "view-object-history"].includes(action)) {
    pendingFlowReturnContext = { projectId: activeProjectId, objectType: button.dataset.objectType, objectId: button.dataset.objectId };
  }
  if (action === "export-failed-data") {
    exportFailedData();
    return;
  }
  if (action === "reset-failed-data") {
    resetFailedData();
    return;
  }
  if (loadFailure) return;

  if (browserDevRuntime() && !browserDevActionAllowed(action)) {
    setSaveStatus("unsaved", t("browserDevNoSilentStorage"));
    console.warn("Project State ignored a browser/dev action because the desktop bridge is missing.", action);
    return;
  }

  if (!actionAllowedForCurrentActor(action)) {
    window.alert(t("permissionDenied"));
    return;
  }

  if (action === "correct-project-warning") {
    const projectId = button.dataset.projectId || "";
    const correctiveAction = button.dataset.correctiveAction || "edit-status";
    const project = getProject(projectId);
    if (!project) {
      window.alert(t("missingProject"));
      return;
    }
    openProjectNow(projectId, "dashboard");
    render();
    if (!actionAllowedForCurrentActor(correctiveAction, project)) {
      window.alert(t("permissionDenied"));
      return;
    }
    setTimeout(() => runProjectCorrectiveAction(correctiveAction), 0);
    return;
  }

  if (action === "create-project") openCreateProjectModal();
  if (action === "backup-storage") exportStorageBackup();
  if (action === "restore-storage") openRestoreStorageModal();
  if (action === "export-current-raw-data") exportCurrentRawData();
  if (action === "reset-local-data") resetLocalDataFromSettings();
  if (action === "show-projects") {
    captureWorkspacePosition();
    activeRootView = "projects";
    activeProjectId = null;
    render();
  }
  if (action === "show-inbox") {
    activeRootView = "inbox";
    activeProjectId = null;
    render();
  }
  if (action === "show-work-orders") {
    activeRootView = "work-orders";
    activeProjectId = null;
    render();
  }
  if (action === "show-files") {
    activeRootView = "files";
    activeProjectId = null;
    render();
  }
  if (action === "show-archived-projects") {
    activeRootView = "archived";
    activeProjectId = null;
    render();
  }
  if (action === "show-intake") {
    activeRootView = "intake";
    activeProjectId = null;
    render();
  }
  if (action === "refresh-storage") {
    refreshFromExternalStorage().catch((error) => {
      console.error("Storage refresh failed.", error);
      window.alert(error.message || t("storageRefreshFailed"));
    });
  }
  if (action === "show-settings") {
    activeRootView = "settings";
    activeProjectId = null;
    render();
    refreshArmTransportStatus().then(() => {
      if (activeRootView === "settings") render();
    });
  }
  if (action === "import-files") {
    setFileImportFlowState("click_received", "Add files to Discovery clicked. Asking Windows for the file picker…", "files");
    if (activeRootView === "files") render();
    beginFileImport("files");
    return;
  }
  if (action === "import-folder") {
    setFileImportFlowState("click_received", "Scan folder for Discovery clicked. Asking Windows for the folder picker…", "folder");
    if (activeRootView === "files") render();
    beginFileImport("folder");
    return;
  }
  if (action === "import-project-files") {
    setFileImportFlowState("click_received", "Add files to project clicked. Asking Windows for the file picker…", "project_files");
    if (activeRootView === "files") render();
    beginFileImport("project_files");
    return;
  }
  if (action === "import-project-folder") {
    setFileImportFlowState("click_received", "Add project folder clicked. Asking Windows for the folder picker…", "project_folder");
    if (activeRootView === "files") render();
    beginFileImport("project_folder");
    return;
  }
  if (action === "reopen-pending-file-import-review") {
    if (pendingFileImportReviewSelection?.candidates?.length) {
      if (["project_files", "project_folder"].includes(pendingFileImportReviewSelection.importKind)) openProjectFileImportModal(pendingFileImportReviewSelection);
      else openFileImportReviewModal(pendingFileImportReviewSelection);
    }
    else {
      setFileImportFlowState("idle", "No pending Discovery review is available.");
      if (activeRootView === "files") render();
    }
    return;
  }
  if (action === "open-file-source") {
    openProjectNow(button.dataset.projectId, "dashboard");
    activeObjectDetail = { projectId: button.dataset.projectId, objectType: "Source", objectId: button.dataset.sourceId };
    render();
  }
  if (action === "edit-file-source") {
    const project = getProject(button.dataset.projectId);
    const source = project?.sources.find((item) => item.id === button.dataset.sourceId);
    if (project && source) {
      activeProjectId = project.id;
      openEditSourceModal(project, source);
    }
  }
  if (action === "archive-file-source") {
    activeProjectId = button.dataset.projectId;
    openArchiveObjectModal("Source", button.dataset.sourceId);
  }
  if (action === "history-file-source") {
    activeProjectId = button.dataset.projectId;
    activeRootView = "projects";
    activeHistoryFilter = { objectType: "Source", objectId: button.dataset.sourceId };
    activeView = "history";
    activeHistoryEventType = "all";
    render();
  }
  if (action === "enable-arm-transport") openArmTransportActionModal("enable");
  if (action === "disable-arm-transport") openArmTransportActionModal("disable");
  if (action === "rotate-arm-transport-token") openArmTransportActionModal("rotate");
  if (action === "revoke-arm-transport") openArmTransportActionModal("revoke");
  if (action === "approve-intake") openApproveIntakeModal(button.dataset.intakeId);
  if (action === "batch-triage") openBatchTriageModal();
  if (action === "review-intake-queue") openReviewIntakeQueueModal(button.dataset.intakeId);
  if (action === "reject-intake") openRejectIntakeModal(button.dataset.intakeId);
  if (action === "archive-intake") openArchiveIntakeModal(button.dataset.intakeId);
  if (action === "create-ai-work-order") openCreateAiWorkOrderModal();
  if (action === "comment-ai-work-order") openAiWorkOrderCommentsModal(button.dataset.workOrderId);
  if (action === "archive-ai-work-order") archiveAiWorkOrder(button.dataset.workOrderId);
  if (action === "export-project") exportProjectJson();
  if (action === "project-overview") openProjectOverviewModal();
  if (action === "export-handoff") exportProjectHandoff();
  if (action === "context-pack") openContextPackModal();
  if (action === "open-project") {
    const projectId = button.dataset.projectId || "";
    if (!getProject(projectId)) window.alert(t("missingProject"));
    else {
      openProjectNow(projectId);
      render();
      restoreWorkspacePosition();
    }
  }
  if (action === "continue-last-project") {
    openProjectNow(button.dataset.projectId);
    render();
    restoreWorkspacePosition();
  }
  if (action === "back") {
    captureWorkspacePosition();
    if (activeProjectId) rememberProjectVisit(activeProjectId, activeView);
    activeProjectId = null;
    activeRootView = "projects";
    activeView = "dashboard";
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
    activeObjectDetail = null;
    render();
  }
  if (action === "show-dashboard") {
    captureWorkspacePosition();
    activeView = "dashboard";
    rememberProjectVisit(activeProjectId, activeView);
    render();
  }
  if (action === "show-handoff") {
    captureWorkspacePosition();
    activeView = "handoff";
    rememberProjectVisit(activeProjectId, activeView);
    render();
  }
  if (action === "show-map") {
    captureWorkspacePosition();
    activeView = "map";
    rememberProjectVisit(activeProjectId, activeView);
    render();
  }
  if (action === "show-changes-since") {
    captureWorkspacePosition();
    activeView = "changes_since";
    rememberProjectVisit(activeProjectId, activeView);
    render();
  }
  if (action === "show-history" || action === "view-history") {
    activeView = "history";
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
    rememberProjectVisit(activeProjectId, activeView);
    render();
  }
  if (action === "clear-history-filter") {
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
    activeView = "history";
    render();
  }
  if (action === "clear-search") {
    searchQuery = "";
    render();
  }
  if (action === "open-search-result") {
    openProjectNow(button.dataset.projectId, "dashboard");
    if (button.dataset.objectType !== "Project") activeObjectDetail = { projectId: button.dataset.projectId, objectType: button.dataset.objectType, objectId: button.dataset.objectId };
    activeHistoryEventType = "all";
    searchQuery = "";
    render();
  }
  if (action === "open-referenced-object") {
    const projectId = button.dataset.projectId || activeProjectId;
    openProjectNow(projectId, "dashboard");
    if (button.dataset.objectType !== "Project") activeObjectDetail = { projectId, objectType: button.dataset.objectType, objectId: button.dataset.objectId };
    render();
  }
  if (action === "view-object-history") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    activeHistoryFilter = {
      objectType: button.dataset.objectType,
      objectId: button.dataset.objectId
    };
    activeView = "history";
    activeHistoryEventType = "all";
    render();
  }
  if (action === "open-object-detail") {
    activeObjectDetail = {
      projectId: activeProjectId,
      objectType: button.dataset.objectType,
      objectId: button.dataset.objectId
    };
    render();
  }
  if (action === "close-object-detail") {
    activeObjectDetail = null;
    render();
  }
  if (action === "edit-status") openEditStatusModal();
  if (action === "propose-correction") openProposeCorrectionModal(button.dataset.objectType, button.dataset.objectId);
  if (action === "edit-object") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openEditObjectModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "assign-object") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openAssignObjectModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "comment-object") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openReviewThreadModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "manage-project-roles") openManageProjectRolesModal();
  if (action === "archive-object") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openArchiveObjectModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "mark-complete") openMarkCompleteModal(button.dataset.objectId);
  if (action === "attach-source") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openAttachSourceModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "attach-image") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openAttachImageModal(button.dataset.objectType, button.dataset.objectId);
  }
  if (action === "view-image") {
    if (button.dataset.projectId) activeProjectId = button.dataset.projectId;
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openImageViewer(button.dataset.objectType, button.dataset.objectId, button.dataset.imageId);
  }
  if (action === "delete-project") openDeleteProjectModal(button.dataset.projectId);
  if (action === "delete-archived-project") openDeleteArchivedProjectModal(button.dataset.projectId);
  if (action === "delete-all-archived-projects") openDeleteAllArchivedProjectsModal();
  if (action === "unarchive-project") openUnarchiveProjectModal(button.dataset.projectId);
  if (action === "add-decision") openDecisionModal();
  if (action === "add-fact") openFactModal();
  if (action === "add-conflict") openConflictModal();
  if (action === "add-source") openSourceModal();
  if (action === "verify-source-file") openVerifySourceFileModal(button.dataset.sourceId);
  if (action === "review-source-freshness") openReviewSourceFreshnessModal(button.dataset.sourceId);
  if (action === "verify-all-source-files") openVerifySourceFileModal();
  if (action === "add-extract") openExtractModal(button.dataset.sourceId);
  if (action === "read-file-extract") openReadFileExtractModal(button.dataset.sourceId);
  if (action === "suggest-extract") openAISuggestExtractModal(button.dataset.sourceId);
  if (action === "approve-extract") openApproveExtractModal(button.dataset.objectId);
  if (action === "create-draft-project") openCreateDraftProjectModal(button.dataset.objectId);
  if (action === "approve-draft-project") openApproveDraftProjectModal(button.dataset.objectId);
  if (action === "add-relationship") openRelationshipModal();
  if (action === "add-question") openQuestionModal();
  if (action === "add-action") openActionModal();
});

function runProjectCorrectiveAction(action = "") {
  if (action === "edit-status") openEditStatusModal();
  else if (action === "add-action") openActionModal();
  else if (action === "add-decision") openDecisionModal();
  else if (action === "add-source") openSourceModal();
  else if (action === "verify-all-source-files") openVerifySourceFileModal();
  else {
    activeView = "dashboard";
    render();
  }
}

app.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-first-run-setup]");
  if (form) {
  event.preventDefault();
  const data = enforceInputLimitsOnData(Object.fromEntries(new FormData(form).entries()));
  const actorNameValue = String(data.actorName || "").trim();
  const actorField = form.querySelector('[name="actorName"]');
  if (!actorNameValue) {
    actorField?.setCustomValidity(t("validationPrimaryActorRequired"));
    actorField?.reportValidity();
    actorField?.setCustomValidity("");
    return;
  }
  const confirmField = form.querySelector('[name="confirmLocalMode"]');
  if (data.confirmLocalMode !== "on") {
    confirmField?.setCustomValidity(t("validationConfirmLocalMode"));
    confirmField?.reportValidity();
    confirmField?.setCustomValidity("");
    return;
  }
  const actor = getOrCreateActor(actorNameValue, "Human");
  actor.role = "owner";
  actor.status = "active";
  store.settings = {
    ...defaultSettings(),
    ...store.settings,
    setupCompletedAt: nowIso(),
    primaryActorId: actor.id,
    backupLocationHint: String(data.backupLocationHint || "").trim(),
    backupReminder: ["manual", "weekly", "monthly"].includes(data.backupReminder) ? data.backupReminder : "manual",
    language: normalizeLanguage(data.language),
    localMode: "single_user_local",
    recoveryWarnings: data.recoveryWarnings === "on"
  };
  saveStore({ allowWithoutCoreApproval: true, reason: "first-run-setup" });
  render();
    return;
  }

  const settingsCoreForm = event.target.closest("[data-settings-core]");
  if (settingsCoreForm) {
    event.preventDefault();
    saveSettingsCore(enforceInputLimitsOnData(Object.fromEntries(new FormData(settingsCoreForm).entries())), settingsCoreForm);
    return;
  }

  const settingsStorageForm = event.target.closest("[data-settings-storage]");
  if (settingsStorageForm) {
    event.preventDefault();
    saveSettingsStorage(enforceInputLimitsOnData(Object.fromEntries(new FormData(settingsStorageForm).entries())), settingsStorageForm);
    return;
  }

  const settingsBackupForm = event.target.closest("[data-settings-backup]");
  if (settingsBackupForm) {
    event.preventDefault();
    saveSettingsBackup(enforceInputLimitsOnData(Object.fromEntries(new FormData(settingsBackupForm).entries())), settingsBackupForm);
    return;
  }

  const settingsActorForm = event.target.closest("[data-settings-actor]");
  if (settingsActorForm) {
    event.preventDefault();
    saveSettingsActor(enforceInputLimitsOnData(Object.fromEntries(new FormData(settingsActorForm).entries())), settingsActorForm);
    return;
  }

  const settingsAddActorForm = event.target.closest("[data-settings-add-actor]");
  if (settingsAddActorForm) {
    event.preventDefault();
    addSettingsActor(enforceInputLimitsOnData(Object.fromEntries(new FormData(settingsAddActorForm).entries())), settingsAddActorForm);
  }
});

app.addEventListener("change", (event) => {
  const sinceDate = event.target.closest("[data-changes-since-date]");
  if (sinceDate) {
    activeChangesSinceDate = changesSinceDateValue(sinceDate.value);
    render();
    return;
  }
  const filter = event.target.closest("[data-history-event-filter]");
  if (!filter) return;
  activeHistoryEventType = filter.value;
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !activeObjectDetail || document.querySelector(".modal-backdrop")) return;
  activeObjectDetail = null;
  render();
});

document.addEventListener("change", (event) => {
  const presetField = event.target.closest("[data-context-preset]");
  if (!presetField) return;
  if (presetField.value === "custom") return;
  applyContextPresetToForm(presetField.closest("form"), presetField.value);
});

app.addEventListener("input", (event) => {
  const field = event.target.closest("[data-search-input]");
  if (!field) return;
  searchQuery = field.value;
  render();
  focusSearchInput();
});

async function initializeApp() {
  render();
  store = await loadStore() || emptyStore();
  await refreshArmTransportStatus();
  storageReady = true;
  render();
}

initializeApp();
