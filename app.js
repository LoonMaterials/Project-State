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
const PROJECT_HEALTH_FLAGS = ["active", "blocked", "at_risk", "complete", "on_hold"];
const ARM_TYPES = ["calendar", "meeting", "api", "ai", "codex", "notes", "chat", "email", "file", "manual", "other"];
const INTAKE_STATUSES = ["pending", "approved", "rejected", "archived"];
const INTAKE_QUEUE_STATES = ["new", "needs_review", "ready", "blocked"];
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
    archivedProjects: "Archived Projects",
    intake: "Intake",
    backup: "Backup",
    restore: "Restore",
    exportJson: "Export JSON",
    addIntake: "Add Intake",
    createProject: "Create Project",
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
    localBrowserStorageSpine: "Local browser storage spine",
    desktopRuntime: "Desktop App Runtime",
    desktopRuntimeReady: "Desktop storage spine active.",
    browserDevRuntime: "Browser / Dev Runtime",
    browserRuntimeWarning: "Project State is running without the desktop bridge. Browser mode is for legacy export, migration, and development only; use the desktop app for full storage, backup, restore, intake, and API work.",
    browserDevGateTitle: "Browser/dev mode",
    browserDevGateSubtitle: "The desktop bridge is required for real Project State mode.",
    browserDevGateNotice: "This screen can inspect loaded local data and export raw data for migration. It will not silently save, migrate, back up, restore, intake, or edit Project State records.",
    browserDevGateReadOnly: "Read-only/dev access",
    browserDevGateCounts: "Loaded records",
    browserDevNoSilentStorage: "No serious storage work runs without the desktop bridge.",
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
    permissionMatrixNote: "Role permissions are policy definitions for the future multi-user model. They are visible now but not yet enforced as login permissions.",
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
    relationships: "Relationships",
    projectMap: "Project Map",
    projectMapSubtitle: "Relationships, evidence, and unresolved work around this project.",
    contextPack: "Context Pack",
    contextPackNotice: "Export a bounded local context packet for a future API or AI arm. This does not change Project State.",
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
    unknown: "Unknown",
    dateAdded: "Date Added",
    actor: "Actor",
    location: "Location",
    localFile: "Local File",
    modified: "Modified",
    findLocalFile: "Find Local File",
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
    sourceFileVerificationNotice: "Desktop mode can verify absolute local file paths. Browser/dev mode can only mark source files as not verifiable.",
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
    archivedProjects: "Projets archivés",
    intake: "Entrée",
    backup: "Sauvegarde",
    restore: "Restaurer",
    exportJson: "Exporter JSON",
    addIntake: "Ajouter une entrée",
    createProject: "Créer un projet",
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
    permissionMatrixNote: "Les permissions de rôle sont des définitions de politique pour le futur modèle multi-utilisateur. Elles sont visibles maintenant mais ne sont pas encore appliquées comme permissions de connexion.",
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
    relationships: "Relations",
    projectMap: "Carte du projet",
    projectMapSubtitle: "Relations, preuves et travail non résolu autour de ce projet.",
    contextPack: "Paquet de contexte",
    contextPackNotice: "Exporter un paquet de contexte local et borné pour un futur bras API ou IA. Cela ne modifie pas Project State.",
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
    unknown: "Inconnu",
    dateAdded: "Date ajoutée",
    actor: "Acteur",
    location: "Emplacement",
    localFile: "Fichier local",
    modified: "Modifié",
    findLocalFile: "Trouver un fichier local",
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
    archivedProjects: "Archivierte Projekte",
    intake: "Eingang",
    backup: "Sicherung",
    restore: "Wiederherstellen",
    exportJson: "JSON exportieren",
    addIntake: "Eingang hinzufügen",
    createProject: "Projekt erstellen",
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
    permissionMatrixNote: "Rollenberechtigungen sind Richtliniendefinitionen für das zukünftige Mehrbenutzermodell. Sie sind jetzt sichtbar, werden aber noch nicht als Login-Berechtigungen erzwungen.",
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
    relationships: "Beziehungen",
    projectMap: "Projektkarte",
    projectMapSubtitle: "Beziehungen, Nachweise und offene Arbeit rund um dieses Projekt.",
    contextPack: "Kontextpaket",
    contextPackNotice: "Ein begrenztes lokales Kontextpaket für einen künftigen API- oder KI-Arm exportieren. Project State wird dadurch nicht geändert.",
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
    unknown: "Unbekannt",
    dateAdded: "Hinzugefügt am",
    actor: "Akteur",
    location: "Ort",
    localFile: "Lokale Datei",
    modified: "Geändert",
    findLocalFile: "Lokale Datei finden",
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
    archivedProjects: "Proyectos archivados",
    intake: "Entrada",
    backup: "Copia de seguridad",
    restore: "Restaurar",
    exportJson: "Exportar JSON",
    addIntake: "Agregar entrada",
    createProject: "Crear proyecto",
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
    permissionMatrixNote: "Los permisos de rol son definiciones de política para el futuro modelo multiusuario. Están visibles ahora pero aún no se aplican como permisos de inicio de sesión.",
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
    relationships: "Relaciones",
    projectMap: "Mapa del proyecto",
    projectMapSubtitle: "Relaciones, evidencia y trabajo sin resolver alrededor de este proyecto.",
    contextPack: "Paquete de contexto",
    contextPackNotice: "Exporta un paquete de contexto local y acotado para un futuro brazo API o IA. Esto no cambia Project State.",
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
    unknown: "Desconocido",
    dateAdded: "Fecha agregada",
    actor: "Actor",
    location: "Ubicación",
    localFile: "Archivo local",
    modified: "Modificado",
    findLocalFile: "Buscar archivo local",
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
  historyPolicyVersion: HISTORY_POLICY_VERSION,
  mandatoryHistory: true,
  mandatoryHistoryFields: [...MANDATORY_HISTORY_FIELDS]
});

const emptyStore = () => ({
  schemaVersion: "0.1.0",
  settings: defaultSettings(),
  actors: [],
  intakeItems: [],
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
let searchQuery = "";
let saveState = {
  status: "saved",
  message: ""
};

const app = document.querySelector("#app");

function createProjectStatePlatformAdapter() {
  const desktopBridge = typeof window !== "undefined" ? window.ProjectStateDesktop : null;
  if (desktopBridge) return createDesktopPlatformAdapter(desktopBridge);
  return createBrowserPlatformAdapter();
}

function createDesktopPlatformAdapter(bridge) {
  const browserFallback = createBrowserPlatformAdapter();
  const storage = bridge.storage || {};
  const files = bridge.files || {};
  const downloads = bridge.downloads || {};
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
        return browserFallback.storage.supportsIndexedDb();
      },
      async openDatabase(name, version, onUpgrade) {
        return browserFallback.storage.openDatabase(name, version, onUpgrade);
      },
      getLegacyItem(key) {
        return browserFallback.storage.getLegacyItem(key);
      },
      setLegacyItem(key, value) {
        return browserFallback.storage.setLegacyItem(key, value);
      },
      removeLegacyItem(key) {
        return browserFallback.storage.removeLegacyItem(key);
      }
    },
    files: {
      metadata(file) {
        if (typeof files.metadata === "function") return files.metadata(file);
        return browserFileMetadata(file);
      },
      localPath(file) {
        if (typeof files.localPath === "function") return files.localPath(file);
        return browserLocalFilePath(file);
      },
      async verifyLocalFile(reference) {
        if (typeof files.verifyLocalFile === "function") return files.verifyLocalFile(reference);
        return browserVerifyLocalFile(reference);
      },
      async readAsDataUrl(file) {
        if (typeof files.readAsDataUrl === "function") return files.readAsDataUrl(file);
        return browserReadFileAsDataUrl(file);
      },
      async readAsText(file) {
        if (typeof files.readAsText === "function") return files.readAsText(file);
        return browserReadFileAsText(file);
      },
      async readAsArrayBuffer(file) {
        if (typeof files.readAsArrayBuffer === "function") return files.readAsArrayBuffer(file);
        return browserReadFileAsArrayBuffer(file);
      },
      async extractText(file) {
        if (typeof files.extractText === "function") return files.extractText(file);
        return null;
      },
      async inflateRaw(bytes) {
        if (typeof files.inflateRaw === "function") return files.inflateRaw(bytes);
        return browserInflateRaw(bytes);
      }
    },
    downloads: {
      saveTextFile(fileName, text, type) {
        if (typeof downloads.saveTextFile === "function") return downloads.saveTextFile({ fileName, text, type });
        return browserSaveTextFile(fileName, text, type);
      }
    }
  };
}

function createBrowserPlatformAdapter() {
  return {
    id: "browser",
    label: "Browser platform adapter",
    storage: {
      externalStore: false,
      supported() {
        return typeof indexedDB !== "undefined";
      },
      supportsIndexedDb() {
        return typeof indexedDB !== "undefined";
      },
      async openDatabase(name, version, onUpgrade) {
        if (typeof indexedDB === "undefined") return null;
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.addEventListener("upgradeneeded", () => onUpgrade(request.result));
          request.addEventListener("success", () => resolve(request.result));
          request.addEventListener("error", () => reject(request.error));
        });
      },
      getLegacyItem(key) {
        if (typeof localStorage === "undefined") return "";
        return localStorage.getItem(key) || "";
      },
      setLegacyItem(key, value) {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      },
      removeLegacyItem(key) {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      }
    },
    files: {
      metadata: browserFileMetadata,
      localPath: browserLocalFilePath,
      verifyLocalFile: browserVerifyLocalFile,
      readAsDataUrl: browserReadFileAsDataUrl,
      readAsText: browserReadFileAsText,
      readAsArrayBuffer: browserReadFileAsArrayBuffer,
      async extractText() {
        return null;
      },
      inflateRaw: browserInflateRaw
    },
    downloads: {
      saveTextFile: browserSaveTextFile
    }
  };
}

function browserLocalFilePath(file) {
  return file?.webkitRelativePath || file?.name || "";
}

function browserFileMetadata(file) {
  if (!file || typeof file.name !== "string" || !file.name) return null;
  return {
    name: file.name,
    type: file.type || "",
    size: file.size || 0,
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : ""
  };
}

async function browserVerifyLocalFile() {
  return {
    status: "unverifiable",
    exists: false,
    checkedAt: nowIso(),
    reason: "Browser/dev mode cannot verify local file paths."
  };
}

function browserReadFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function browserReadFileAsText(file) {
  if (typeof file?.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result || ""));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function browserReadFileAsArrayBuffer(file) {
  if (typeof file?.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(file);
  });
}

function browserSaveTextFile(fileName, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function browserInflateRaw(compressed) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This platform cannot read compressed DOCX text locally.");
  }
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
    return this.usesExternalStore() || this.browserDbSupported();
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
  async save(nextStore) {
    const snapshot = JSON.stringify(nextStore);
    const manifest = buildStorageSpineManifest(nextStore, snapshot);
    storageSnapshotText = snapshot;
    storageSpineMeta = manifest;
    if (this.usesExternalStore()) {
      await platformAdapter.storage.saveStore({
        store: nextStore,
        manifest,
        split: splitStoreRecords(nextStore, manifest),
        snapshot
      });
      storageMode = "desktop-spine";
      return;
    }
    if (this.browserDbSupported()) {
      await this.writeSplitStore(nextStore, manifest);
      await this.verifySplitStore(nextStore, manifest);
      platformAdapter.storage.removeLegacyItem(STORAGE_KEY);
      storageMode = "browser-dev-indexeddb-split";
      return;
    }
    platformAdapter.storage.setLegacyItem(STORAGE_KEY, JSON.stringify(nextStore, null, 2));
    storageMode = "browser-dev-legacy-json";
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
  if (ProjectStateStorage.browserDbSupported()) return "browser-dev-indexeddb-split";
  return "browser-dev-legacy-json";
}

function storageModeForLoadedSource(source = "") {
  if (ProjectStateStorage.usesExternalStore()) return source || "desktop-spine";
  if (source === "legacy-json" && ProjectStateStorage.browserDbSupported()) return "browser-dev-migrated-to-indexeddb-split";
  if (source === "legacy-json") return "browser-dev-legacy-json";
  if (source === "empty") return currentStorageModeName();
  if (String(source).startsWith("indexeddb")) return `browser-dev-${source}`;
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

    const imageBearingLists = [project.decisions, project.facts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes];
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
    intakeItems: Array.isArray(parsed.intakeItems) ? parsed.intakeItems.map((item) => normalizeIntakeItem(item, context)) : [],
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
    settings.historyPolicyVersion !== normalized.historyPolicyVersion ||
    settings.mandatoryHistory !== normalized.mandatoryHistory ||
    !Array.isArray(settings.mandatoryHistoryFields)
  ) migrationNeeded = true;
  return normalized;
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
    sourceLinks: [],
    imageLinks: [],
    decisions: [],
    facts: [],
    sources: [],
    draftProjects: [],
    relationships: [],
    openQuestions: [],
    nextActions: [],
    changes: [],
    ...project,
    id: project.id,
    healthFlag: normalizeHealthFlag(project.healthFlag),
    sourceLinks: normalizeSourceLinksArray(project.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(project.imageLinks, project.id, "Project", project.id, context),
    decisions: Array.isArray(project.decisions) ? project.decisions.map((decision) => normalizeObject(decision, "decision", project.id, context)) : [],
    facts: Array.isArray(project.facts) ? project.facts.map((fact) => normalizeObject(fact, "fact", project.id, context)) : [],
    sources: Array.isArray(project.sources) ? project.sources.map((source) => normalizeSource(source, project.id, context)) : [],
    draftProjects: Array.isArray(project.draftProjects) ? project.draftProjects.map((draftProject) => normalizeDraftProject(draftProject, project.id, context)) : [],
    relationships: Array.isArray(project.relationships) ? project.relationships.map((relationship) => normalizeRelationship(relationship, project, context)) : [],
    openQuestions: Array.isArray(project.openQuestions) ? project.openQuestions.map((question) => normalizeObject(question, "question", project.id, context)) : [],
    nextActions: Array.isArray(project.nextActions) ? project.nextActions.map((action) => normalizeObject(action, "action", project.id, context)) : []
  };
  normalized.changes = Array.isArray(project.changes) ? project.changes.map((change) => normalizeChange(change, normalized, context)) : [];
  return normalized;
}

function normalizeObject(object, prefix, projectId, context) {
  const objectId = ensureId(object, prefix, context);
  const normalized = {
    sourceLinks: [],
    imageLinks: [],
    ...object,
    id: objectId,
    projectId: object.projectId || projectId,
    sourceLinks: normalizeSourceLinksArray(object.sourceLinks, context),
    imageLinks: normalizeImageLinksArray(object.imageLinks, projectId, objectTypeFromPrefix(prefix), objectId, context)
  };
  if (!object.projectId) migrationNeeded = true;
  return normalized;
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
  if (!source.projectId || !Array.isArray(source.linkedActorIds)) migrationNeeded = true;
  return {
    extracts: [],
    status: "active",
    tags: [],
    linkedActorIds: [],
    ...source,
    id: sourceId,
    projectId: source.projectId || projectId,
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
    ...extract,
    id: extractId,
    projectId: extract.projectId || projectId,
    sourceId: extract.sourceId || sourceId,
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
    status: "draft",
    ...draftProject,
    id: draftId,
    projectId: draftProject.projectId || projectId,
    createdAt: draftProject.createdAt || draftProject.createdDate || nowIso(),
    createdDate: draftProject.createdDate || draftProject.createdAt || nowIso(),
    status: draftProject.status || (draftProject.approvedAt ? "approved" : "draft"),
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
    id,
    armType: normalizeArmType(item.armType),
    status,
    queueState,
    queueNotes: item.queueNotes || "",
    queueReviewedAt: item.queueReviewedAt || "",
    queueReviewedBy: item.queueReviewedBy || "",
    queueReviewReason: item.queueReviewReason || "",
    title: item.title || t("untitledIntake"),
    projectId: item.projectId || "",
    createdAt: item.createdAt || nowIso(),
    createdBy: item.createdBy || "",
    sourceLabel: item.sourceLabel || "",
    proposedObjectType: normalizeProposedObjectType(item.proposedObjectType),
    proposedChange: item.proposedChange || {},
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
    id: uid("intake"),
    armType: normalizeArmType(input.armType),
    status: "pending",
    queueState: "new",
    queueNotes: "",
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
    approval: null,
    archived: false
  };
  store.intakeItems = Array.isArray(store.intakeItems) ? store.intakeItems : [];
  store.intakeItems.unshift(item);
  saveStore({ allowWithoutCoreApproval: true, reason: "intake-only" });
  return item;
}

function approveIntakeItem(intakeId, actor, reason, applyApprovedChange) {
  const intake = store.intakeItems?.find((item) => item.id === intakeId);
  requireHumanApproval(actor, reason, { origin: "intake" });
  if (!intake || intake.status !== "pending" || typeof applyApprovedChange !== "function") return null;
  if (intake.queueState !== "ready") return null;
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
    return;
  }
  const hasApprovedCoreWrite = pendingApprovedCoreWrites > 0;
  if (!options.allowWithoutCoreApproval && !hasApprovedCoreWrite) {
    setSaveStatus("unsaved", t("saveBlockedApproval"));
    console.error("Project State blocked a save because no approved core change was recorded first.");
    return;
  }
  const approvedWriteCount = pendingApprovedCoreWrites;
  pendingApprovedCoreWrites = 0;
  ProjectStateStorage.save(store)
    .then(() => {
      setSaveStatus("saved", tFormat("savedAt", { time: formatDate(nowIso()) }));
      renderStorageWarning();
    })
    .catch((error) => {
      pendingApprovedCoreWrites += approvedWriteCount;
      setSaveStatus("unsaved", tFormat("saveStorageFailed", { message: error?.message || t("storageFailed") }));
      console.error("Project State could not save through the storage spine.", error);
    });
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
  const allowed = ["ProjectStatus", "Decision", "Fact", "OpenQuestion", "NextAction", "Source", "Relationship"];
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

function openProjectNow(projectId, view = "dashboard") {
  activeProjectId = projectId;
  activeRootView = "projects";
  activeView = view;
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  searchQuery = "";
}

function workInboxCount() {
  return buildWorkInboxItems().length;
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
    actionLabel: item.actionLabel || t("openItem"),
    sortAt: item.sortAt || nowIso()
  });

  for (const intake of store.intakeItems || []) {
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
      if (draft.reviewFlags?.readyForApproval) {
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
        <h1 class="view-title">${escapeHtml(t("workInbox"))}</h1>
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
        <button class="btn secondary compact" data-action="${escapeHtml(item.action)}" ${item.projectId ? `data-project-id="${escapeHtml(item.projectId)}"` : ""}>${escapeHtml(item.actionLabel)}</button>
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
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-inbox">${escapeHtml(t("workInbox"))}${workInboxCount() ? ` (${workInboxCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-archived-projects">${escapeHtml(t("archivedProjects"))}${archivedProjectCount() ? ` (${archivedProjectCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-intake">${escapeHtml(t("intake"))}${pendingIntakeCount() ? ` (${pendingIntakeCount()})` : ""}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="show-settings">${escapeHtml(t("settings"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="backup-storage">${escapeHtml(t("backup"))}</button>` : ""}
        ${!activeProjectId ? `<button class="btn secondary" data-action="restore-storage">${escapeHtml(t("restore"))}</button>` : ""}
        ${activeProjectId ? `<button class="btn secondary" data-action="export-project">${escapeHtml(t("exportJson"))}</button>` : ""}
        <span class="save-indicator ${saveState.status}" role="status">${escapeHtml(saveState.message || t("saved"))}</span>
        ${!activeProjectId ? `<button class="btn secondary" data-action="create-intake">${escapeHtml(t("addIntake"))}</button>` : ""}
        <button class="btn" data-action="create-project">${escapeHtml(t("createProject"))}</button>
      </div>
    </header>
    <div data-storage-warning-slot>${runtimeWarningHtml()}${storageWarningHtml()}</div>
    <main class="main">${inner}</main>
  `;
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
          <div class="button-row">
            <button class="btn" data-action="export-current-raw-data">${escapeHtml(t("exportRawCurrentData"))}</button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function browserDevActionAllowed(action) {
  return ["export-current-raw-data", "export-failed-data"].includes(action);
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
        <form class="form" data-first-run-setup>
          <div class="field">
            <label for="setupActorName">${escapeHtml(t("primaryActor"))}</label>
            <input id="setupActorName" name="actorName" value="${escapeHtml(existingActor?.name || "")}" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="backupLocationHint">${escapeHtml(t("backupLocation"))}</label>
            <input id="backupLocationHint" name="backupLocationHint" value="${escapeHtml(store.settings?.backupLocationHint || "")}" placeholder="${escapeHtml(t("backupLocationPlaceholder"))}">
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

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("archivedProjects"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("archivedProjectsNotice"))}</p>
      </div>
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
  const info = storageSizeInfo();
  const diagnostics = settingsDiagnostics();
  const integrity = buildIntegrityDashboard(diagnostics, info);
  const runtimeStatus = desktopRuntimeReady() ? t("desktopRuntimeReady") : t("browserRuntimeWarning");
  const runtimeLabel = desktopRuntimeReady() ? t("desktopRuntime") : t("browserDevRuntime");
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
          <h2 class="panel-title">${escapeHtml(t("integrityDashboard"))}</h2>
        </div>
        ${renderIntegrityDashboard(integrity, diagnostics)}
      </section>
    </section>
  `);
  app.querySelectorAll("form").forEach(applyInputLimits);
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
  for (const source of project.sources || []) {
    if (!source.location && !source.summary && !source.localFile?.name) {
      groups.sourceFileReferences.push(integrityIssue("source-reference", "warning", t("missingSourceDetails"), project, "Source", source));
    }
    if (source.fileVerification && ["missing", "changed", "unverifiable"].includes(source.fileVerification.status)) {
      const level = source.fileVerification.status === "missing" ? "needs_attention" : "warning";
      groups.sourceFileReferences.push(integrityIssue("source-file-verification", level, sourceFileVerificationMessage(source.fileVerification), project, "Source", source));
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
  const objectLists = [project.decisions, project.facts, project.relationships, project.openQuestions, project.nextActions, project.draftProjects, project.changes];
  for (const list of objectLists) count += list.reduce((inner, item) => inner + (Array.isArray(item.imageLinks) ? item.imageLinks.length : 0), 0);
  for (const source of project.sources) {
    count += Array.isArray(source.imageLinks) ? source.imageLinks.length : 0;
    count += source.extracts.reduce((inner, extract) => inner + (Array.isArray(extract.imageLinks) ? extract.imageLinks.length : 0), 0);
  }
  return count;
}

function archivedProjectCount() {
  return store.projects.filter((project) => project.archived).length;
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
        <button class="btn secondary compact" data-action="delete-project" data-project-id="${project.id}" ${project.deletionStatus ? "disabled" : ""}>${escapeHtml(t("deleteProject"))}</button>
      </div>
    </div>
  `;
}

function pendingIntakeCount() {
  return (store.intakeItems || []).filter((item) => item.status === "pending" && !item.archived).length;
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
  const active = intakeItems.filter((item) => !item.archived);
  const pending = active.filter((item) => item.status === "pending");
  return {
    pending: pending.length,
    ready: pending.filter((item) => item.queueState === "ready").length,
    blocked: pending.filter((item) => item.queueState === "blocked").length,
    reviewed: intakeItems.filter((item) => item.status !== "pending" && !item.archived).length,
    archived: intakeItems.filter((item) => item.archived).length
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

function renderIntakeQueue() {
  const intakeItems = sortNewest(store.intakeItems || [], "createdAt");
  const pending = intakeItems
    .filter((item) => item.status === "pending" && !item.archived)
    .sort((a, b) => intakeQueueStateRank(a.queueState) - intakeQueueStateRank(b.queueState) || Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
  const reviewed = intakeItems.filter((item) => item.status !== "pending" || item.archived);
  const stats = approvalQueueStats(intakeItems);

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeHtml(t("intakeAirlock"))}</h1>
        <p class="view-subtitle">${escapeHtml(t("intakeAirlockSubtitle"))}</p>
      </div>
      <button class="btn" data-action="create-intake">${escapeHtml(t("addIntake"))}</button>
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
  const projectName = item.projectId ? projectNameById(item.projectId) || t("missingProject") : t("noTargetProject");
  const proposed = item.proposedChange || {};
  const isPending = item.status === "pending" && !item.archived;
  const isReady = item.queueState === "ready";
  return `
    <div class="item">
      <p class="item-title">${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
      <div class="review-flags">
        <span class="pill ${escapeHtml(intakeQueueStateClass(item.queueState))}">${escapeHtml(intakeQueueStateLabel(item.queueState))}</span>
        <span class="pill">${escapeHtml(intakeStatusLabel(item))}</span>
      </div>
      <p class="item-meta">${escapeHtml(armTypeLabel(item.armType))} · ${escapeHtml(proposedObjectTypeLabel(item.proposedObjectType))}</p>
      <p class="item-meta">${escapeHtml(t("target"))}: ${escapeDisplay(projectName, DISPLAY_META_LIMIT)} · ${escapeHtml(t("created"))} ${escapeHtml(formatDate(item.createdAt))} · ${escapeHtml(t("age"))}: ${escapeHtml(intakeQueueAgeLabel(item.createdAt))}</p>
      ${item.sourceLabel ? `<p class="item-meta">${escapeHtml(t("source"))}: ${escapeDisplay(item.sourceLabel, DISPLAY_META_LIMIT)}</p>` : ""}
      ${proposed.text ? `<p class="item-body">${escapeDisplay(proposed.text)}</p>` : ""}
      ${proposed.summary ? `<p class="item-body">${escapeHtml(t("summary"))}: ${escapeDisplay(proposed.summary)}</p>` : ""}
      ${item.queueNotes ? `<p class="item-meta">${escapeHtml(t("queueReviewNotes"))}: ${escapeDisplay(item.queueNotes, DISPLAY_META_LIMIT)}</p>` : ""}
      ${item.queueReviewedAt ? `<p class="item-meta">${escapeHtml(t("reviewedBy"))} ${escapeHtml(actorDisplay(item.queueReviewedBy))} · ${escapeHtml(formatDate(item.queueReviewedAt))}</p>` : ""}
      ${item.review ? `<p class="item-meta">${escapeHtml(t("reviewedBy"))} ${escapeHtml(actorDisplay(item.review.actorId, item.review.actorName))} · ${escapeHtml(formatDate(item.review.reviewedAt))}</p>` : ""}
      ${item.approval ? `<p class="item-meta">${escapeHtml(t("approvedBy"))} ${escapeHtml(actorDisplay(item.approval.approvedBy))} · ${escapeHtml(formatDate(item.approval.approvedAt))}</p>` : ""}
      <div class="item-actions">
        ${isPending ? `<button class="btn secondary compact" data-action="review-intake-queue" data-intake-id="${item.id}">${escapeHtml(t("reviewQueueItem"))}</button>` : ""}
        ${isPending ? `<button class="btn secondary compact" data-action="approve-intake" data-intake-id="${item.id}" ${isReady ? "" : "disabled"} title="${isReady ? "" : escapeHtml(t("approvalQueueReadyRequired"))}">${escapeHtml(t("approve"))}</button>` : ""}
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
      addSearchResult(results, project, "Decision", decision.id, decision.text, decision.reason, [decision.text, decision.reason, decision.confidence]);
      addImageSearchResults(results, project, "Decision", decision);
    }
    for (const fact of project.facts) {
      addSearchResult(results, project, "Fact", fact.id, fact.statement, fact.source, [fact.statement, fact.source, fact.confidence]);
      addImageSearchResults(results, project, "Fact", fact);
    }
    for (const source of project.sources) {
      addSearchResult(results, project, "Source", source.id, source.title, source.summary || source.location, [source.title, source.sourceType, source.location, source.summary, tagsToText(source.tags), linkedActorNames(source.linkedActorIds).join(" ")]);
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
  const sources = sortNewest(project.sources.filter((source) => source.status !== "archived"));
  const draftProjects = sortNewest(project.draftProjects.filter((draftProject) => draftProject.status !== "archived"));
  const relationships = sortNewest(project.relationships.filter((relationship) => relationship.status !== "archived"));
  const changes = sortNewest(project.changes, "timestamp");
  const objectFilteredChanges = activeHistoryFilter ? filterObjectHistory(changes, activeHistoryFilter) : changes;
  const visibleChanges = filterHistoryByEventType(objectFilteredChanges, activeHistoryEventType);
  const eventTypes = historyEventTypes(objectFilteredChanges);
  const historyTitle = activeHistoryFilter ? `${activeHistoryFilter.objectType} ${t("viewHistory")}` : t("changeHistory");

  const dashboard = `
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
        <p class="meta-value">${decisions.length} decisions, ${facts.length} facts, ${sources.length} sources, ${draftProjects.length} drafts, ${relationships.length} relationships, ${questions.length} questions, ${actions.length} actions</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">${escapeHtml(t("health"))}</p>
        <p class="meta-value">${escapeHtml(healthFlagLabel(project.healthFlag))}</p>
      </div>
    </section>

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
            <h2 class="panel-title">${escapeHtml(t("sources"))}</h2>
            <button class="btn secondary" data-action="add-source">${escapeHtml(t("addSource"))}</button>
          </div>
          ${renderSourceList(recent(sources, 5), project)}
        </article>
      </div>

      <aside class="stack">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">${escapeHtml(t("recentDecisions"))}</h2>
            <button class="btn secondary" data-action="add-decision">${escapeHtml(t("addDecision"))}</button>
          </div>
          ${renderDecisionList(recent(decisions, 5))}
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
  const map = renderProjectMap(project, {
    questions,
    actions,
    decisions,
    facts,
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
        <button class="btn secondary" data-action="edit-object" data-object-type="Project" data-object-id="${project.id}">${escapeHtml(t("edit"))}</button>
        <button class="btn secondary" data-action="archive-object" data-object-type="Project" data-object-id="${project.id}" ${project.archived ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
        ${project.archived ? `<button class="btn secondary" data-action="unarchive-project" data-project-id="${project.id}">${escapeHtml(t("unarchiveProject"))}</button>` : ""}
        <button class="btn secondary" data-action="delete-project" data-project-id="${project.id}" ${project.deletionStatus ? "disabled" : ""}>${escapeHtml(t("deleteProject"))}</button>
        <button class="btn secondary" data-action="project-overview">${escapeHtml(t("onePageOverview"))}</button>
        <button class="btn secondary" data-action="context-pack">${escapeHtml(t("contextPack"))}</button>
        <button class="btn secondary" data-action="view-object-history" data-object-type="Project" data-object-id="${project.id}">${escapeHtml(t("viewHistory"))}</button>
        <button class="btn secondary" data-action="add-decision">${escapeHtml(t("addDecision"))}</button>
        <button class="btn secondary" data-action="add-fact">${escapeHtml(t("addFact"))}</button>
        <button class="btn secondary" data-action="add-source">${escapeHtml(t("addSource"))}</button>
        <button class="btn secondary" data-action="add-relationship">${escapeHtml(t("addRelationship"))}</button>
        <button class="btn secondary" data-action="add-question">${escapeHtml(t("addOpenQuestion"))}</button>
        <button class="btn secondary" data-action="add-action">${escapeHtml(t("addNextAction"))}</button>
      </div>
    </section>

    <nav class="tabs" aria-label="Project views">
      <button class="tab ${activeView === "dashboard" ? "active" : ""}" data-action="show-dashboard">${escapeHtml(t("dashboard"))}</button>
      <button class="tab ${activeView === "map" ? "active" : ""}" data-action="show-map">${escapeHtml(t("projectMap"))}</button>
      <button class="tab ${activeView === "history" ? "active" : ""}" data-action="show-history">${escapeDisplay(historyTitle, DISPLAY_META_LIMIT)}</button>
    </nav>

    ${activeView === "dashboard" ? dashboard : activeView === "map" ? map : history}
  `);
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
          ${renderDecisionList(recent(collections.decisions, 5))}
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
            <p class="item-meta">${escapeDisplay(source.sourceType || t("unknown"), DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(source.dateAdded))} · ${extracts.length} ${escapeHtml(t("extractsLabel"))}</p>
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

function renderDecisionList(decisions) {
  if (!decisions.length) return emptyText(t("noDecisionsRecorded"));
  return `<div class="list">${decisions.map((decision) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(decision.text)}</p>
      <p class="item-body">${escapeDisplay(decision.reason)}</p>
      <p class="item-meta">${escapeHtml(actorDisplay(decision.actorId))} · ${escapeHtml(formatDate(decision.date))} · ${escapeHtml(decision.confidence)}</p>
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
      ${renderAttachedSources(fact)}
      ${renderAttachedImages(fact)}
      ${renderObjectActions("Fact", fact.id, fact.status === "archived")}
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
        <p class="item-meta">${escapeHtml(t("dateAdded"))}: ${escapeHtml(formatDate(source.dateAdded))}</p>
        <p class="item-meta">${escapeHtml(t("actor"))}: ${escapeHtml(actorDisplay(source.actorId))}</p>
        ${renderLinkedUsers(source.linkedActorIds)}
        <p class="item-meta">${escapeHtml(t("project"))}: ${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</p>
        ${source.location ? `<p class="item-meta">${escapeHtml(t("location"))}: ${escapeDisplay(source.location, DISPLAY_META_LIMIT)}</p>` : ""}
        ${source.localFile ? `<p class="item-meta">${escapeHtml(t("localFile"))}: ${escapeDisplay(source.localFile.name, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(source.localFile.size))}${source.localFile.lastModified ? ` · ${escapeHtml(t("modified"))} ${escapeHtml(formatDate(source.localFile.lastModified))}` : ""}</p>` : ""}
        ${renderSourceFileVerification(source)}
        ${source.summary ? `<p class="item-body">${escapeDisplay(source.summary)}</p>` : ""}
        ${source.tags?.length ? `<p class="item-meta">${escapeHtml(t("tags"))}: ${escapeDisplay(tagsToText(source.tags), DISPLAY_META_LIMIT)}</p>` : ""}
        <div class="item-actions">
          <button class="btn secondary compact" data-action="verify-source-file" data-source-id="${source.id}">${escapeHtml(t("verifyFile"))}</button>
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
      ${extract.suggestionStatus ? `<p class="item-meta">${escapeHtml(t("suggestionStatus"))}: ${escapeHtml(extract.suggestionStatus)}</p>` : ""}
      ${extract.suggestedBy ? `<p class="item-meta">${escapeHtml(t("suggestedBy"))}: ${escapeHtml(extract.suggestedBy)}</p>` : ""}
      ${extract.extractedFromFile ? `<p class="item-meta">${escapeHtml(t("file"))}: ${escapeDisplay(extract.extractedFromFile.fileName, DISPLAY_META_LIMIT)}${extract.extractedFromFile.truncated ? ` · ${escapeHtml(t("truncated"))}` : ""}</p>` : ""}
      <p class="item-body">${escapeDisplay(extract.text)}</p>
      ${extract.summary ? `<p class="item-body">${escapeHtml(t("summary"))}: ${escapeDisplay(extract.summary)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(extract.actorId))} · ${escapeHtml(formatDate(extract.dateAdded))}</p>
      ${extract.tags?.length ? `<p class="item-meta">${escapeHtml(t("tags"))}: ${escapeDisplay(tagsToText(extract.tags), DISPLAY_META_LIMIT)}</p>` : ""}
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
      ${relationship.notes ? `<p class="item-body">${escapeDisplay(relationship.notes)}</p>` : ""}
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
      ${renderAttachedSources(draftProject)}
      ${renderAttachedImages(draftProject)}
      <div class="item-actions">
        <button class="btn secondary compact" data-action="edit-object" data-object-type="DraftProject" data-object-id="${draftProject.id}">${escapeHtml(t("review"))}</button>
        <button class="btn secondary compact" data-action="approve-draft-project" data-object-id="${draftProject.id}" ${draftProject.status === "approved" || !draftProject.reviewFlags?.readyForApproval ? "disabled" : ""}>${escapeHtml(t("approveDraft"))}</button>
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
  return `
    <div class="item-actions">
      <button class="btn secondary compact" data-action="edit-object" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("edit"))}</button>
      ${attachSource}
      ${attachImage}
      <button class="btn secondary compact" data-action="archive-object" data-object-type="${objectType}" data-object-id="${objectId}" ${archived ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
      <button class="btn secondary compact" data-action="view-object-history" data-object-type="${objectType}" data-object-id="${objectId}">${escapeHtml(t("viewHistory"))}</button>
    </div>
  `;
}

function canAttachSource(objectType) {
  return !["Source", "Extract"].includes(objectType);
}

function canAttachImage(objectType) {
  return ["Project", "Decision", "Fact", "OpenQuestion", "NextAction", "Relationship", "DraftProject", "Change"].includes(objectType);
}

function renderAttachedSources(object) {
  const links = Array.isArray(object.sourceLinks) ? object.sourceLinks : [];
  if (!links.length) return "";
  return `
    <div class="attached-sources">
      <p class="item-meta">${escapeHtml(t("attachedSources"))}</p>
      ${links.map((link) => `<p class="item-meta">${escapeDisplay(link.sourceTitle || t("source"), DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(link.attachedAt))}</p>`).join("")}
    </div>
  `;
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

function renderHistoryItem(change) {
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
        ${renderAttachedImages(change)}
        <div class="item-actions">
          <button class="btn secondary compact" data-action="attach-image" data-object-type="Change" data-object-id="${change.id}">${escapeHtml(t("attachImage"))}</button>
        </div>
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

function openContextPackModal() {
  const project = getProject();
  if (!project) return;
  showModal({
    title: t("contextPack"),
    submitText: t("exportContextPack"),
    body: `
      <p class="notice">${escapeHtml(t("contextPackNotice"))}</p>
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
      </div>
    `,
    onSubmit(data, form) {
      const pack = buildProjectContextPack(project, {
        scope: data.contextScope,
        budget: data.contextBudget,
        includeSources: data.includeSources === "on",
        includeOpenWork: data.includeOpenWork === "on",
        includeHistory: data.includeHistory === "on"
      });
      const stamp = nowIso().replace(/[:.]/g, "-");
      downloadTextFile(`${safeFileName(project.name)}.context-pack-${stamp}.json`, JSON.stringify(pack, null, 2), "application/json");
      return true;
    }
  });
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
  const relatedProjects = scope === "related" ? relatedProjectBriefs(project, config) : [];
  return {
    app: "Project State",
    packType: "project-context-pack",
    packVersion: "0.1",
    generatedAt: nowIso(),
    generatedBy: "local-ui",
    runtimeMode: currentStorageModeName(),
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
    recentDecisions: compactDecisions(project, config),
    keyFacts: compactFacts(project, config),
    openWork: includeOpenWork ? compactOpenWork(project, config) : { questions: [], actions: [] },
    relationships: compactRelationships(project, config),
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
      confidence: decision.confidence || ""
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
        type: "Fact | Decision | OpenQuestion | NextAction | Relationship | Source | ProjectStatus",
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
        <input id="backupFile" name="backupFile" type="file" accept=".json,application/json" required>
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
      const fileField = form.querySelector('[name="backupFile"]');
      const file = fileField?.files?.[0] || data.backupFile;
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

function showModal({ title, body, submitText, onSubmit }) {
  if (document.querySelector(".modal-backdrop")) return;
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h2 class="modal-title" id="modal-title">${escapeHtml(title)}</h2>
        <button class="icon-btn" type="button" data-close-modal aria-label="${escapeHtml(t("close"))}">×</button>
      </div>
      <form class="form">
        ${body}
      </form>
      <div class="form-footer">
        <button class="btn secondary" type="button" data-close-modal>${escapeHtml(t("cancel"))}</button>
        <button class="btn" type="submit" form="modal-form">${escapeHtml(submitText)}</button>
      </div>
    </section>
  `;

  const form = modal.querySelector(".form");
  const submitButton = modal.querySelector('button[type="submit"]');
  let submitting = false;
  form.id = "modal-form";
  applyInputLimits(form);
  wireLocalFilePickers(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const formData = new FormData(form);
    const data = enforceInputLimitsOnData(Object.fromEntries(formData.entries()));
    if (!validateAuditFields(form, data)) return;
    submitting = true;
    if (submitButton) submitButton.disabled = true;
    try {
      const shouldClose = await onSubmit(data, form);
      if (shouldClose === false) {
        submitting = false;
        if (submitButton) submitButton.disabled = false;
        return;
      }
      modal.remove();
      render();
    } catch (error) {
      console.error("Project State modal action failed.", error);
      submitting = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  modal.addEventListener("click", (event) => {
    if (submitting) return;
    if (event.target === modal || event.target.closest("[data-close-modal]")) {
      modal.remove();
    }
  });

  document.body.appendChild(modal);
  modal.querySelector("input, textarea, select")?.focus();
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
}

function auditFields({ actorLabel = t("approvedBy"), reasonLabel = t("reason") } = {}) {
  return `
    <div class="field">
      <label for="actorName">${escapeHtml(actorLabel)}</label>
      <input id="actorName" name="actorName" autocomplete="name" required>
    </div>
    <div class="field">
      <label for="reason">${escapeHtml(reasonLabel)}</label>
      <textarea id="reason" name="reason" required></textarea>
    </div>
  `;
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

function armTypeOptions(selected = "manual") {
  return ARM_TYPES
    .map((type) => `<option value="${type}" ${selected === type ? "selected" : ""}>${escapeHtml(armTypeLabel(type))}</option>`)
    .join("");
}

function proposedObjectTypeOptions(selected = "Decision") {
  const types = ["ProjectStatus", "Decision", "Fact", "OpenQuestion", "NextAction", "Source", "Relationship"];
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

function openCreateIntakeModal() {
  showModal({
    title: t("addIntake"),
    submitText: t("saveToAirlock"),
    body: `
      <p class="notice">${escapeHtml(t("proposedChangeNotice"))}</p>
      <div class="field">
        <label for="armType">${escapeHtml(t("arm"))}</label>
        <select id="armType" name="armType">${armTypeOptions("manual")}</select>
      </div>
      <div class="field">
        <label for="projectId">${escapeHtml(t("targetProject"))}</label>
        <select id="projectId" name="projectId" required>
          ${projectOptions()}
        </select>
      </div>
      <div class="field">
        <label for="proposedObjectType">${escapeHtml(t("proposedChangeType"))}</label>
        <select id="proposedObjectType" name="proposedObjectType">${proposedObjectTypeOptions()}</select>
      </div>
      <div class="field">
        <label for="title">${escapeHtml(t("intakeTitle"))}</label>
        <input id="title" name="title" required>
      </div>
      <div class="field">
        <label for="text">${escapeHtml(t("proposedText"))}</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="summary">${escapeHtml(t("summaryContext"))}</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="sourceLabel">${escapeHtml(t("sourceOriginLabel"))}</label>
        <input id="sourceLabel" name="sourceLabel">
      </div>
      <div class="two-col">
        <div class="field">
          <label for="target">${escapeHtml(t("relationshipTargetOwner"))}</label>
          <input id="target" name="target">
        </div>
        <div class="field">
          <label for="dueDate">${escapeHtml(t("dueDate"))}</label>
          <input id="dueDate" name="dueDate" type="date">
        </div>
      </div>
    `,
    onSubmit(data) {
      if (!store.projects.length) return false;
      createIntakeItem({
        armType: normalizeArmType(data.armType),
        title: data.title.trim(),
        createdBy: "human",
        sourceLabel: data.sourceLabel.trim(),
        projectId: data.projectId,
        proposedObjectType: normalizeProposedObjectType(data.proposedObjectType),
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
}

function openApproveIntakeModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  if (intake.queueState !== "ready") {
    window.alert(t("approvalQueueReadyRequired"));
    return;
  }
  showModal({
    title: t("approveIntake"),
    submitText: t("approveToProjectState"),
    body: `
      <p class="notice">${escapeHtml(t("approvalAppliesChangeNotice"))}</p>
      ${renderIntakeApprovalPreview(intake)}
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
      const result = approveIntakeItem(intake.id, actor, data.reason, (item, approval) => applyApprovedIntakeToCore(item, actor, data.reason, approval));
      return Boolean(result);
    }
  });
}

function openReviewIntakeQueueModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  showModal({
    title: t("approvalQueueReview"),
    submitText: t("saveQueueReview"),
    body: `
      <p class="notice">${escapeHtml(t("approvalQueueReviewNotice"))}</p>
      ${renderIntakeApprovalPreview(intake)}
      <div class="field">
        <label for="queueState">${escapeHtml(t("queueState"))}</label>
        <select id="queueState" name="queueState" required>
          ${INTAKE_QUEUE_STATES.map((state) => `<option value="${escapeHtml(state)}" ${intake.queueState === state ? "selected" : ""}>${escapeHtml(intakeQueueStateLabel(state))}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="queueNotes">${escapeHtml(t("queueReviewNotes"))}</label>
        <textarea id="queueNotes" name="queueNotes">${escapeHtml(intake.queueNotes || "")}</textarea>
      </div>
      ${auditFields({ actorLabel: t("reviewedBy"), reasonLabel: t("reason") })}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      intake.queueState = normalizeIntakeQueueState(data.queueState);
      intake.queueNotes = String(data.queueNotes || "").trim();
      intake.queueReviewedAt = nowIso();
      intake.queueReviewedBy = actor.id;
      intake.queueReviewReason = data.reason.trim();
      saveStore({ allowWithoutCoreApproval: true, reason: "intake-queue-reviewed" });
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
      ${auditFields()}
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
      ${auditFields()}
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
  `;
}

function applyApprovedIntakeToCore(intake, actor, reason, approval) {
  const project = getProject(intake.projectId);
  if (!project) return null;
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
    const source = {
      id: uid("source"),
      projectId: project.id,
      title: text || intake.title,
      sourceType: armTypeLabel(intake.armType),
      dateAdded: timestamp,
      actorId: actor.id,
      location: intake.sourceLabel || "",
      summary,
      tags: [],
      extracts: [],
      status: "active"
    };
    project.sources.unshift(source);
    recordChange(project, actor, reason, "Intake approved: Source added", {
      ...baseDetails,
      objectType: "Source",
      objectId: source.id,
      objectText: source.title,
      fields: { source: source.title, type: source.sourceType, location: source.location, summary: source.summary }
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
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        text: decision.text,
        confidence: decision.confidence
      };
      decision.text = data.decision.trim();
      decision.confidence = data.confidence;
      decision.editedAt = nowIso();
      recordChange(project, actor, data.reason, "Decision edited", {
        objectType: "Decision",
        objectId: decision.id,
        objectText: decision.text,
        fields: {
          previousDecision: previous.text,
          newDecision: decision.text,
          previousConfidence: previous.confidence,
          newConfidence: decision.confidence
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
          <input id="sourceType" name="sourceType" value="${escapeHtml(source.sourceType || "")}">
        </div>
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
        <input id="localFile" name="localFile" type="file" data-local-file-picker data-location-target="location" data-title-target="title" data-type-target="sourceType">
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
        dateAdded: source.dateAdded,
        location: source.location,
        localFile: source.localFile ? `${source.localFile.name} (${formatBytes(source.localFile.size)})` : "",
        summary: source.summary,
        tags: tagsToText(source.tags),
        linkedUsers: linkedActorNames(source.linkedActorIds).join(", ")
      };
      const localFile = sourceLocalFileMetadata(data.localFile);
      const linkedActorIds = selectedLinkedActorIds(form);
      source.title = data.title.trim();
      source.sourceType = data.sourceType.trim();
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
        <input id="target" name="target" value="${escapeHtml(relationship.target)}" required>
      </div>
      <div class="field">
        <label for="relationshipType">${escapeHtml(t("relationshipType"))}</label>
        <input id="relationshipType" name="relationshipType" value="${escapeHtml(relationship.relationshipType || "")}">
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
  if (!project || !draftProject || draftProject.status === "approved" || !draftProject.reviewFlags?.readyForApproval) return;

  showModal({
    title: t("approveDraft"),
    submitText: t("approveToProject"),
    body: `
      <p class="notice">${escapeHtml(t("approvalCreatesProjectNotice"))}</p>
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
          <input id="owner" name="owner" value="${escapeHtml(action.owner || "")}">
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
    expected: {
      name: localFile.name || source.title || "",
      type: localFile.type || source.sourceType || "",
      size: Number(localFile.size || 0),
      lastModified: localFile.lastModified || ""
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
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const decision = {
        id: uid("decision"),
        projectId: project.id,
        text: data.decision.trim(),
        reason: data.reason.trim(),
        actorId: actor.id,
        confidence: data.confidence,
        date: nowIso()
      };
      project.decisions.unshift(decision);
      recordChange(project, actor, data.reason, "Decision added", {
        objectType: "Decision",
        objectId: decision.id,
        objectText: decision.text
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
          <input id="sourceType" name="sourceType">
        </div>
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
        <input id="localFile" name="localFile" type="file" data-local-file-picker data-location-target="location" data-title-target="title" data-type-target="sourceType">
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
      const localFile = sourceLocalFileMetadata(data.localFile);
      const linkedActorIds = selectedLinkedActorIds(form);
      const source = {
        id: uid("source"),
        projectId: project.id,
        title: data.title.trim() || localFile?.name || t("untitledSource"),
        sourceType: data.sourceType.trim(),
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
        <input id="target" name="target" required>
      </div>
      <div class="field">
        <label for="relationshipType">${escapeHtml(t("relationshipType"))}</label>
          <input id="relationshipType" name="relationshipType" placeholder="${escapeHtml(t("relationshipPlaceholder"))}">
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
          <input id="owner" name="owner">
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

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
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

  if (action === "create-project") openCreateProjectModal();
  if (action === "create-intake") openCreateIntakeModal();
  if (action === "backup-storage") exportStorageBackup();
  if (action === "restore-storage") openRestoreStorageModal();
  if (action === "export-current-raw-data") exportCurrentRawData();
  if (action === "reset-local-data") resetLocalDataFromSettings();
  if (action === "show-projects") {
    activeRootView = "projects";
    activeProjectId = null;
    render();
  }
  if (action === "show-inbox") {
    activeRootView = "inbox";
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
  if (action === "show-settings") {
    activeRootView = "settings";
    activeProjectId = null;
    render();
  }
  if (action === "approve-intake") openApproveIntakeModal(button.dataset.intakeId);
  if (action === "review-intake-queue") openReviewIntakeQueueModal(button.dataset.intakeId);
  if (action === "reject-intake") openRejectIntakeModal(button.dataset.intakeId);
  if (action === "archive-intake") openArchiveIntakeModal(button.dataset.intakeId);
  if (action === "export-project") exportProjectJson();
  if (action === "project-overview") openProjectOverviewModal();
  if (action === "context-pack") openContextPackModal();
  if (action === "open-project") {
    activeProjectId = button.dataset.projectId;
    activeRootView = "projects";
    activeView = "dashboard";
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
    render();
  }
  if (action === "back") {
    activeProjectId = null;
    activeRootView = "projects";
    activeView = "dashboard";
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
    render();
  }
  if (action === "show-dashboard") {
    activeView = "dashboard";
    render();
  }
  if (action === "show-map") {
    activeView = "map";
    render();
  }
  if (action === "show-history" || action === "view-history") {
    activeView = "history";
    activeHistoryFilter = null;
    activeHistoryEventType = "all";
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
    activeProjectId = button.dataset.projectId;
    if (button.dataset.objectType === "Project") {
      activeView = "dashboard";
      activeHistoryFilter = null;
    } else {
      activeView = "history";
      activeHistoryFilter = {
        objectType: button.dataset.objectType,
        objectId: button.dataset.objectId
      };
    }
    activeHistoryEventType = "all";
    searchQuery = "";
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
  if (action === "edit-status") openEditStatusModal();
  if (action === "edit-object") {
    if (button.dataset.objectType === "Project") activeProjectId = button.dataset.objectId;
    openEditObjectModal(button.dataset.objectType, button.dataset.objectId);
  }
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
  if (action === "unarchive-project") openUnarchiveProjectModal(button.dataset.projectId);
  if (action === "add-decision") openDecisionModal();
  if (action === "add-fact") openFactModal();
  if (action === "add-source") openSourceModal();
  if (action === "verify-source-file") openVerifySourceFileModal(button.dataset.sourceId);
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
  const filter = event.target.closest("[data-history-event-filter]");
  if (!filter) return;
  activeHistoryEventType = filter.value;
  render();
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
  storageReady = true;
  render();
}

initializeApp();
