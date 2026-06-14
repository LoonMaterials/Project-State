const STORAGE_KEY = "project-state.v0.1";
const STORAGE_DB_NAME = "project-state-spine";
const STORAGE_DB_VERSION = 1;
const STORAGE_OBJECT_STORE = "records";
const STORAGE_MAIN_RECORD = "main";
const STORAGE_LEGACY_BACKUP_RECORD = "legacy-json-backup";
const DISPLAY_TEXT_LIMIT = 1200;
const DISPLAY_META_LIMIT = 240;
const EXTRACT_TEXT_LIMIT = 5000;
const PROJECT_HEALTH_FLAGS = ["active", "blocked", "at_risk", "complete", "on_hold"];
const ARM_TYPES = ["calendar", "meeting", "ai", "codex", "notes", "email", "file", "manual", "other"];
const INTAKE_STATUSES = ["pending", "approved", "rejected", "archived"];
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
    backupLocationPlaceholder: "Example: iCloud Drive / Project State Backups",
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
    primaryStorage: "Primary Storage",
    localBrowserStorageSpine: "Local browser storage spine",
    currentMode: "Current Mode",
    currentSize: "Current Size",
    storageOverrideAcknowledged: "Record that a storage override or migration exception has been acknowledged.",
    storageOverrideReason: "Storage Override Reason",
    saveStorageSettings: "Save Storage Settings",
    backupSystem: "Backup System",
    backupLocationWarning: "Primary storage and backup should not be the same location unless this becomes a server-backed deployment.",
    backupOverrideAcknowledged: "Allow a backup-location override with warning recorded.",
    backupOverrideReason: "Backup Override Reason",
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
    approveAction: "Approve Action"
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
    backupLocationPlaceholder: "Exemple : iCloud Drive / Sauvegardes Project State",
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
    primaryStorage: "Stockage principal",
    localBrowserStorageSpine: "Axe de stockage local du navigateur",
    currentMode: "Mode actuel",
    currentSize: "Taille actuelle",
    storageOverrideAcknowledged: "Enregistrer qu’une exception de stockage ou de migration a été reconnue.",
    storageOverrideReason: "Raison de l’exception de stockage",
    saveStorageSettings: "Enregistrer les paramètres de stockage",
    backupSystem: "Système de sauvegarde",
    backupLocationWarning: "Le stockage principal et la sauvegarde ne doivent pas être au même emplacement, sauf dans un déploiement avec serveur.",
    backupOverrideAcknowledged: "Autoriser une exception d’emplacement de sauvegarde avec avertissement enregistré.",
    backupOverrideReason: "Raison de l’exception de sauvegarde",
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
    approveAction: "Approuver l’action"
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
    backupLocationPlaceholder: "Beispiel: iCloud Drive / Project State Sicherungen",
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
    primaryStorage: "Primärspeicher",
    localBrowserStorageSpine: "Lokaler Browser-Speicher-Spine",
    currentMode: "Aktueller Modus",
    currentSize: "Aktuelle Größe",
    storageOverrideAcknowledged: "Speicher-Override oder Migrationsausnahme als bestätigt erfassen.",
    storageOverrideReason: "Grund für Speicher-Override",
    saveStorageSettings: "Speichereinstellungen speichern",
    backupSystem: "Sicherungssystem",
    backupLocationWarning: "Primärspeicher und Sicherung sollten nicht am selben Ort liegen, außer bei einer servergestützten Bereitstellung.",
    backupOverrideAcknowledged: "Sicherungsort-Override mit aufgezeichneter Warnung erlauben.",
    backupOverrideReason: "Grund für Sicherungs-Override",
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
    approveAction: "Aktion genehmigen"
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
    backupLocationPlaceholder: "Ejemplo: iCloud Drive / Copias de Project State",
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
    primaryStorage: "Almacenamiento principal",
    localBrowserStorageSpine: "Columna de almacenamiento local del navegador",
    currentMode: "Modo actual",
    currentSize: "Tamaño actual",
    storageOverrideAcknowledged: "Registrar que se reconoció una excepción de almacenamiento o migración.",
    storageOverrideReason: "Razón de excepción de almacenamiento",
    saveStorageSettings: "Guardar configuración de almacenamiento",
    backupSystem: "Sistema de copia de seguridad",
    backupLocationWarning: "El almacenamiento principal y la copia de seguridad no deben estar en la misma ubicación salvo en una implementación con servidor.",
    backupOverrideAcknowledged: "Permitir una excepción de ubicación de copia con advertencia registrada.",
    backupOverrideReason: "Razón de excepción de copia",
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
    approveAction: "Aprobar acción"
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
  storageSystem: "local_browser_spine",
  storageOverrideAcknowledged: false,
  storageOverrideReason: "",
  backupSystem: "user_json_export",
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

const ProjectStateStorage = {
  db: null,
  supported() {
    return typeof indexedDB !== "undefined";
  },
  async open() {
    if (!this.supported()) return null;
    if (this.db) return this.db;
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_DB_NAME, STORAGE_DB_VERSION);
      request.addEventListener("upgradeneeded", () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORAGE_OBJECT_STORE)) db.createObjectStore(STORAGE_OBJECT_STORE, { keyPath: "id" });
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
    return this.db;
  },
  async getRecord(id) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORAGE_OBJECT_STORE, "readonly");
      const request = transaction.objectStore(STORAGE_OBJECT_STORE).get(id);
      request.addEventListener("success", () => resolve(request.result || null));
      request.addEventListener("error", () => reject(request.error));
    });
  },
  async putRecord(record) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORAGE_OBJECT_STORE, "readwrite");
      transaction.objectStore(STORAGE_OBJECT_STORE).put(record);
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  },
  async deleteRecord(id) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORAGE_OBJECT_STORE, "readwrite");
      transaction.objectStore(STORAGE_OBJECT_STORE).delete(id);
      transaction.addEventListener("complete", () => resolve(true));
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error));
    });
  },
  async load() {
    if (this.supported()) {
      const record = await this.getRecord(STORAGE_MAIN_RECORD);
      if (record?.store) {
        return {
          source: "indexeddb",
          store: record.store,
          raw: JSON.stringify(record.store)
        };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY) || "";
    return {
      source: raw ? "legacy-json" : "empty",
      raw,
      store: raw ? null : emptyStore()
    };
  },
  async save(nextStore) {
    const snapshot = JSON.stringify(nextStore);
    storageSnapshotText = snapshot;
    if (this.supported()) {
      await this.putRecord({
        id: STORAGE_MAIN_RECORD,
        schemaVersion: nextStore.schemaVersion,
        updatedAt: nowIso(),
        store: nextStore
      });
      localStorage.removeItem(STORAGE_KEY);
      storageMode = "indexeddb";
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore, null, 2));
    storageMode = "legacy-json-fallback";
  },
  async preserveLegacyRaw(raw) {
    if (!raw || !this.supported()) return;
    await this.putRecord({
      id: STORAGE_LEGACY_BACKUP_RECORD,
      createdAt: nowIso(),
      storageKey: STORAGE_KEY,
      raw
    });
  },
  async reset() {
    if (this.supported()) {
      await this.deleteRecord(STORAGE_MAIN_RECORD);
      await this.deleteRecord(STORAGE_LEGACY_BACKUP_RECORD);
    }
    localStorage.removeItem(STORAGE_KEY);
    storageSnapshotText = "";
  }
};

async function loadStore() {
  let loaded = { source: "unknown", raw: "" };
  try {
    migrationNeeded = false;
    loaded = await ProjectStateStorage.load();
    if (!loaded.raw && !loaded.store) return emptyStore();
    const parsed = loaded.store || JSON.parse(loaded.raw);
    const normalized = normalizeStore(parsed);
    storageSnapshotText = JSON.stringify(normalized);
    storageMode = loaded.source === "legacy-json" && ProjectStateStorage.supported() ? "migrated-to-indexeddb" : loaded.source;
    if (loaded.source === "legacy-json") await ProjectStateStorage.preserveLegacyRaw(loaded.raw);
    if (migrationNeeded || loaded.source !== "indexeddb") await ProjectStateStorage.save(normalized);
    return normalized;
  } catch (error) {
    loadFailure = {
      raw: loaded.raw || safeStringify(loaded.store),
      source: loaded.source || "unknown",
      message: error?.message || "Unknown load error",
      stack: error?.stack || "",
      date: nowIso()
    };
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
  const normalized = {
    ...defaults,
    ...settings,
    backupReminder: ["manual", "weekly", "monthly"].includes(settings.backupReminder) ? settings.backupReminder : defaults.backupReminder,
    language: normalizeLanguage(settings.language),
    localMode: settings.localMode || defaults.localMode,
    recoveryWarnings: settings.recoveryWarnings !== false,
    storageSystem: settings.storageSystem || defaults.storageSystem,
    storageOverrideAcknowledged: Boolean(settings.storageOverrideAcknowledged),
    storageOverrideReason: settings.storageOverrideReason || "",
    backupSystem: settings.backupSystem || defaults.backupSystem,
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
  if (actor.role !== role || actor.status !== status) migrationNeeded = true;
  return {
    type: "Human",
    ...actor,
    id: ensureId(actor, "actor", context),
    role,
    status
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
    status: "active"
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
  if (!source.projectId) migrationNeeded = true;
  return {
    extracts: [],
    status: "active",
    tags: [],
    ...source,
    id: sourceId,
    projectId: source.projectId || projectId,
    extracts: Array.isArray(source.extracts) ? source.extracts.map((extract) => normalizeExtract(extract, projectId, sourceId, context)) : [],
    tags: Array.isArray(source.tags) ? source.tags : tagsFromText(source.tags || "")
  };
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
  return {
    id,
    armType: normalizeArmType(item.armType),
    status,
    title: item.title || "Untitled intake",
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

function createIntakeItem(input = {}) {
  const item = {
    id: uid("intake"),
    armType: normalizeArmType(input.armType),
    status: "pending",
    title: input.title || "Untitled intake",
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
  const hasApprovedCoreWrite = pendingApprovedCoreWrites > 0;
  if (!options.allowWithoutCoreApproval && !hasApprovedCoreWrite) {
    setSaveStatus("unsaved", "Unsaved changes: approval gate blocked save");
    console.error("Project State blocked a save because no approved core change was recorded first.");
    return;
  }
  const approvedWriteCount = pendingApprovedCoreWrites;
  pendingApprovedCoreWrites = 0;
  ProjectStateStorage.save(store)
    .then(() => {
      setSaveStatus("saved", `Saved ${formatDate(nowIso())}`);
      renderStorageWarning();
    })
    .catch((error) => {
      pendingApprovedCoreWrites += approvedWriteCount;
      setSaveStatus("unsaved", `Unsaved changes: ${error?.message || "storage failed"}`);
      console.error("Project State could not save through the storage spine.", error);
    });
}

function storageSizeInfo(raw = storageSnapshotText || localStorage.getItem(STORAGE_KEY) || "") {
  const bytes = new Blob([raw]).size;
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

function renderStorageWarning() {
  const warning = document.querySelector("[data-storage-warning-slot]");
  if (!warning) return;
  warning.innerHTML = storageWarningHtml();
}

function storageWarningHtml(raw) {
  if (arguments.length === 0 && store.settings?.recoveryWarnings === false) return "";
  const info = storageSizeInfo(raw);
  if (info.level === "ok") return "";
  const message = info.level === "danger"
    ? "Local saved data is very large. Browser storage may fail soon, especially with images or long extracts."
    : "Local saved data is getting large. Images and long extracts can make saves slower.";
  return `
    <div class="storage-warning ${info.level}" role="status">
      <strong>Storage warning:</strong> ${escapeHtml(message)} Current size: ${escapeHtml(info.label)}.
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
  if (!value) return "Not recorded";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
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
  if (!file || typeof file.name !== "string" || !file.name) return null;
  return {
    name: file.name,
    type: file.type || "",
    size: file.size || 0,
    lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : ""
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result || ""));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(file);
  });
}

function extractFileExtension(fileName = "") {
  return String(fileName).split(".").pop()?.toLowerCase() || "";
}

function isSupportedExtractFile(file) {
  const extension = extractFileExtension(file?.name);
  return ["pdf", "docx", "txt", "md"].includes(extension);
}

async function extractTextFromFile(file) {
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
  if (entry.method !== 8 || typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read compressed DOCX text locally.");
  }
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
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
    status: "active"
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
  setSaveStatus("unsaved", "Unsaved changes");
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

  if (needsFirstRunSetup()) {
    renderFirstRunSetup();
    return;
  }

  if (searchQuery.trim()) {
    renderSearchResults();
    return;
  }

  if (!activeProjectId) {
    if (activeRootView === "intake") renderIntakeQueue();
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
    <div data-storage-warning-slot>${storageWarningHtml()}</div>
    <main class="main">${inner}</main>
  `;
}

function renderRecoveryScreen() {
  app.innerHTML = `
    <main class="main recovery-screen">
      <section class="panel strong">
        <div class="view-head">
          <div>
            <h1 class="view-title">Saved Data Needs Recovery</h1>
            <p class="view-subtitle">Project State could not safely load the saved local data. The original saved data has not been changed.</p>
          </div>
        </div>
        ${storageWarningHtml(loadFailure.raw || "")}
        <div class="stack">
          <p class="notice">Export the raw saved data before resetting. Reset should only be used after the failed data is backed up.</p>
          <div class="button-row">
            <button class="btn" data-action="export-failed-data">${escapeHtml(t("exportFailedData"))}</button>
            <button class="btn danger" data-action="reset-failed-data">${escapeHtml(t("resetLocalData"))}</button>
          </div>
          <div class="recovery-details">
            <p class="meta-label">Error Details</p>
            <pre>${escapeHtml(readableLoadError(loadFailure))}</pre>
          </div>
        </div>
      </section>
    </main>
  `;
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
  if (!failure) return "No error details recorded.";
  const lines = [
    `Date: ${failure.date || "Not recorded"}`,
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
        <h1 class="view-title">Projects</h1>
        <p class="view-subtitle">Choose a project to see its current state and history.</p>
      </div>
    </section>
    ${projects.length ? `<section class="project-grid">${projects.map(renderProjectCard).join("")}</section>` : `
      <section class="empty-state">
        <h2>No active projects</h2>
        <p>Create a project or open Archived Projects to restore one.</p>
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
        <h1 class="view-title">Archived Projects</h1>
        <p class="view-subtitle">Archived projects are kept out of the active project list. Unarchive a project to return it to current use.</p>
      </div>
    </section>
    ${projects.length ? `<section class="project-grid">${projects.map(renderProjectCard).join("")}</section>` : `
      <section class="empty-state">
        <h2>No archived projects</h2>
        <p>Archived projects will appear here.</p>
        <button class="btn secondary" data-action="show-projects">${escapeHtml(t("backToProjects"))}</button>
      </section>
    `}
  `);
}

function renderSettings() {
  const info = storageSizeInfo();
  const diagnostics = settingsDiagnostics();
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
            <span>Show storage and recovery warnings.</span>
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
          <h2 class="panel-title">Role Definitions v${escapeHtml(ROLE_DEFINITIONS_VERSION)}</h2>
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
              <p class="meta-label">${escapeHtml(t("primaryStorage"))}</p>
              <p>${escapeHtml(t("localBrowserStorageSpine"))}</p>
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
          <h2 class="panel-title">${escapeHtml(t("diagnostics"))}</h2>
        </div>
        <div class="meta-grid settings-diagnostics">
          ${Object.entries(diagnostics).map(([label, value]) => `
            <div>
              <p class="meta-label">${escapeHtml(label)}</p>
              <p>${escapeHtml(value)}</p>
            </div>
          `).join("")}
        </div>
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
          ${renderDefinitionList("Permissions", definition.permissions)}
          ${renderDefinitionList("Restrictions", definition.restrictions)}
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

function settingsDiagnostics() {
  const activeProjects = store.projects.filter((project) => !project.archived);
  const archivedProjects = store.projects.filter((project) => project.archived);
  const changes = store.projects.reduce((count, project) => count + project.changes.length, 0);
  const sources = store.projects.reduce((count, project) => count + project.sources.length, 0);
  const extracts = store.projects.reduce((count, project) => count + project.sources.reduce((inner, source) => inner + source.extracts.length, 0), 0);
  const images = store.projects.reduce((count, project) => count + countProjectImages(project), 0);
  const info = storageSizeInfo();
  return {
    "Schema Version": store.schemaVersion || "Not recorded",
    "Storage Mode": storageMode || "Not recorded",
    "Storage Size": info.label,
    "Active Projects": String(activeProjects.length),
    "Archived Projects": String(archivedProjects.length),
    "Actors": String(store.actors.length),
    "Changes": String(changes),
    "Sources": String(sources),
    "Extracts": String(extracts),
    "Images": String(images),
    "Last Settings Update": store.settings?.settingsUpdatedAt ? formatDate(store.settings.settingsUpdatedAt) : "Not recorded",
    "Last Backup Export": store.settings?.lastBackupExportedAt ? formatDate(store.settings.lastBackupExportedAt) : "Not recorded",
    "Last Restore": store.settings?.lastRestoreAt ? formatDate(store.settings.lastRestoreAt) : "Not recorded"
  };
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
        <p>${escapeDisplay(project.currentStatus || "No current status recorded.")}</p>
        ${renderAttachedSources(project)}
      </button>
      <div>
        <span class="pill health-${escapeHtml(project.healthFlag || "active")}">${escapeHtml(healthFlagLabel(project.healthFlag))}</span>
        <span class="pill">Updated ${escapeHtml(formatDate(project.updatedAt))}</span>
        ${project.archived ? '<span class="pill">Archived</span>' : ""}
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

function renderIntakeQueue() {
  const intakeItems = sortNewest(store.intakeItems || [], "createdAt");
  const pending = intakeItems.filter((item) => item.status === "pending" && !item.archived);
  const reviewed = intakeItems.filter((item) => item.status !== "pending" || item.archived);

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">Intake Airlock</h1>
        <p class="view-subtitle">Outside arms can propose changes here. Human approval is required before anything reaches Project State.</p>
      </div>
      <button class="btn" data-action="create-intake">${escapeHtml(t("addIntake"))}</button>
    </section>

    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel strong">
          <div class="panel-head">
            <h2 class="panel-title">Pending Review</h2>
          </div>
          ${pending.length ? `<div class="list">${pending.map(renderIntakeItem).join("")}</div>` : emptyText("No pending intake. Future arms should land here before touching the core.")}
        </article>
      </div>
      <aside class="stack">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Reviewed Intake</h2>
          </div>
          ${reviewed.length ? `<div class="list">${reviewed.map(renderIntakeItem).join("")}</div>` : emptyText("No reviewed intake yet.")}
        </article>
      </aside>
    </section>
  `);
}

function renderIntakeItem(item) {
  const projectName = item.projectId ? projectNameById(item.projectId) || "Missing project" : "No target project";
  const proposed = item.proposedChange || {};
  return `
    <div class="item">
      <p class="item-title">${escapeDisplay(item.title, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">${escapeHtml(armTypeLabel(item.armType))} · ${escapeHtml(proposedObjectTypeLabel(item.proposedObjectType))} · ${escapeHtml(intakeStatusLabel(item))}</p>
      <p class="item-meta">Target: ${escapeDisplay(projectName, DISPLAY_META_LIMIT)} · Created ${escapeHtml(formatDate(item.createdAt))}</p>
      ${item.sourceLabel ? `<p class="item-meta">Source: ${escapeDisplay(item.sourceLabel, DISPLAY_META_LIMIT)}</p>` : ""}
      ${proposed.text ? `<p class="item-body">${escapeDisplay(proposed.text)}</p>` : ""}
      ${proposed.summary ? `<p class="item-body">Summary: ${escapeDisplay(proposed.summary)}</p>` : ""}
      ${item.review ? `<p class="item-meta">Reviewed by ${escapeHtml(actorDisplay(item.review.actorId, item.review.actorName))} · ${escapeHtml(formatDate(item.review.reviewedAt))}</p>` : ""}
      ${item.approval ? `<p class="item-meta">Approved by ${escapeHtml(actorDisplay(item.approval.approvedBy))} · ${escapeHtml(formatDate(item.approval.approvedAt))}</p>` : ""}
      <div class="item-actions">
        ${item.status === "pending" && !item.archived ? `<button class="btn secondary compact" data-action="approve-intake" data-intake-id="${item.id}">${escapeHtml(t("approve"))}</button>` : ""}
        ${item.status === "pending" && !item.archived ? `<button class="btn secondary compact" data-action="reject-intake" data-intake-id="${item.id}">${escapeHtml(t("reject"))}</button>` : ""}
        ${!item.archived ? `<button class="btn secondary compact" data-action="archive-intake" data-intake-id="${item.id}">${escapeHtml(t("archive"))}</button>` : ""}
      </div>
    </div>
  `;
}

function armTypeLabel(type = "other") {
  const labels = {
    calendar: "Calendar",
    meeting: "Meeting",
    ai: "AI",
    codex: "Codex",
    notes: "Notes",
    email: "Email",
    file: "File",
    manual: "Manual",
    other: "Other"
  };
  return labels[type] || "Other";
}

function proposedObjectTypeLabel(type = "") {
  const labels = {
    ProjectStatus: "Project Status",
    Decision: "Decision",
    Fact: "Fact",
    OpenQuestion: "Open Question",
    NextAction: "Next Action",
    Source: "Source",
    Relationship: "Relationship"
  };
  return labels[type] || "Proposed Change";
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
    title: title || "Untitled",
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
      addSearchResult(results, project, "Source", source.id, source.title, source.summary || source.location, [source.title, source.sourceType, source.location, source.summary, tagsToText(source.tags)]);
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
      image.caption || image.fileName || "Image",
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
        <h1 class="view-title">Search</h1>
        <p class="view-subtitle">${results.length ? `${results.length} results for "${escapeDisplay(query, DISPLAY_META_LIMIT)}"` : `No results for "${escapeDisplay(query, DISPLAY_META_LIMIT)}"`}</p>
      </div>
      <button class="btn secondary" data-action="clear-search">${escapeHtml(t("clearSearch"))}</button>
    </section>
    ${results.length ? `<section class="search-results">${results.map(renderSearchResult).join("")}</section>` : emptyText("Try a project name, decision, fact, source, action, relationship, image caption, or history reason.")}
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
  const historyTitle = activeHistoryFilter ? `${activeHistoryFilter.objectType} History` : "Change History";

  const dashboard = `
    <section class="meta-grid">
      <div class="meta-card">
        <p class="meta-label">Last Updated</p>
        <p class="meta-value">${escapeHtml(formatDate(project.updatedAt))}</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">Updated By</p>
        <p class="meta-value">${escapeHtml(updatedBy)}</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">Current Objects</p>
        <p class="meta-value">${decisions.length} decisions, ${facts.length} facts, ${sources.length} sources, ${draftProjects.length} drafts, ${relationships.length} relationships, ${questions.length} questions, ${actions.length} actions</p>
      </div>
      <div class="meta-card">
        <p class="meta-label">Health</p>
        <p class="meta-value">${escapeHtml(healthFlagLabel(project.healthFlag))}</p>
      </div>
    </section>

    <section class="dashboard-grid">
      <div class="stack">
        <article class="panel strong">
          <div class="panel-head">
            <h2 class="panel-title">Current Status</h2>
            <button class="btn secondary" data-action="edit-status">${escapeHtml(t("editStatus"))}</button>
          </div>
          <p class="status-text">${escapeDisplay(project.currentStatus || "No status recorded.")}</p>
          <p class="summary-text">${escapeDisplay(project.currentSummary || "No current summary recorded.")}</p>
          ${renderAttachedSources(project)}
          ${renderAttachedImages(project)}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Next Action</h2>
            <button class="btn secondary" data-action="add-action">${escapeHtml(t("addNextAction"))}</button>
          </div>
          ${renderActionList(recent(actions, 3))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Open Questions</h2>
            <button class="btn secondary" data-action="add-question">${escapeHtml(t("addOpenQuestion"))}</button>
          </div>
          ${renderQuestionList(recent(questions, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Facts</h2>
            <button class="btn secondary" data-action="add-fact">${escapeHtml(t("addFact"))}</button>
          </div>
          ${renderFactList(recent(facts, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Sources</h2>
            <button class="btn secondary" data-action="add-source">${escapeHtml(t("addSource"))}</button>
          </div>
          ${renderSourceList(recent(sources, 5), project)}
        </article>
      </div>

      <aside class="stack">
        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Recent Decisions</h2>
            <button class="btn secondary" data-action="add-decision">${escapeHtml(t("addDecision"))}</button>
          </div>
          ${renderDecisionList(recent(decisions, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Relationships</h2>
            <button class="btn secondary" data-action="add-relationship">${escapeHtml(t("addRelationship"))}</button>
          </div>
          ${renderRelationshipList(recent(relationships, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Draft Projects</h2>
          </div>
          ${renderDraftProjectList(recent(draftProjects, 5))}
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2 class="panel-title">Recent Activity</h2>
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
          Event Type
          <select data-history-event-filter>
            <option value="all" ${activeHistoryEventType === "all" ? "selected" : ""}>All events</option>
            ${eventTypes.map((eventType) => `<option value="${escapeHtml(eventType)}" ${activeHistoryEventType === eventType ? "selected" : ""}>${escapeDisplay(eventType, DISPLAY_META_LIMIT)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${visibleChanges.length ? visibleChanges.map(renderHistoryItem).join("") : emptyText("No changes recorded for this filter.")}
    </section>
  `;

  shell(`
    <section class="view-head">
      <div>
        <h1 class="view-title">${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h1>
        <p class="view-subtitle">Current state and historical record are kept in separate views.</p>
      </div>
      <div class="button-row">
        <button class="btn secondary" data-action="edit-object" data-object-type="Project" data-object-id="${project.id}">${escapeHtml(t("edit"))}</button>
        <button class="btn secondary" data-action="archive-object" data-object-type="Project" data-object-id="${project.id}" ${project.archived ? "disabled" : ""}>${escapeHtml(t("archive"))}</button>
        ${project.archived ? `<button class="btn secondary" data-action="unarchive-project" data-project-id="${project.id}">${escapeHtml(t("unarchiveProject"))}</button>` : ""}
        <button class="btn secondary" data-action="delete-project" data-project-id="${project.id}" ${project.deletionStatus ? "disabled" : ""}>${escapeHtml(t("deleteProject"))}</button>
        <button class="btn secondary" data-action="project-overview">${escapeHtml(t("onePageOverview"))}</button>
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
      <button class="tab ${activeView === "history" ? "active" : ""}" data-action="show-history">${escapeDisplay(historyTitle, DISPLAY_META_LIMIT)}</button>
    </nav>

    ${activeView === "dashboard" ? dashboard : history}
  `);
}

function renderDecisionList(decisions) {
  if (!decisions.length) return emptyText("No decisions recorded.");
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
  if (!facts.length) return emptyText("No facts recorded.");
  return `<div class="list">${facts.map((fact) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(fact.statement)}</p>
      ${fact.source ? `<p class="item-body">Source: ${escapeDisplay(fact.source)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(fact.actorId))} · ${escapeHtml(formatDate(fact.createdAt))} · ${escapeHtml(fact.confidence || "Unknown")}</p>
      ${renderAttachedSources(fact)}
      ${renderAttachedImages(fact)}
      ${renderObjectActions("Fact", fact.id, fact.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderSourceList(sources, project) {
  if (!sources.length) return emptyText("No sources recorded.");
  return `<div class="list">${sources.map((source) => {
    const extracts = sortNewest(source.extracts.filter((extract) => extract.status !== "archived"));
    return `
      <div class="item">
        <p class="item-title">${escapeDisplay(source.title, DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">Type: ${escapeDisplay(source.sourceType || "Unknown", DISPLAY_META_LIMIT)}</p>
        <p class="item-meta">Date Added: ${escapeHtml(formatDate(source.dateAdded))}</p>
        <p class="item-meta">Actor: ${escapeHtml(actorDisplay(source.actorId))}</p>
        <p class="item-meta">Project: ${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</p>
        ${source.location ? `<p class="item-meta">Location: ${escapeDisplay(source.location, DISPLAY_META_LIMIT)}</p>` : ""}
        ${source.localFile ? `<p class="item-meta">Local File: ${escapeDisplay(source.localFile.name, DISPLAY_META_LIMIT)} · ${escapeHtml(formatBytes(source.localFile.size))}${source.localFile.lastModified ? ` · Modified ${escapeHtml(formatDate(source.localFile.lastModified))}` : ""}</p>` : ""}
        ${source.summary ? `<p class="item-body">${escapeDisplay(source.summary)}</p>` : ""}
        ${source.tags?.length ? `<p class="item-meta">Tags: ${escapeDisplay(tagsToText(source.tags), DISPLAY_META_LIMIT)}</p>` : ""}
        <div class="item-actions">
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

function renderExtractList(extracts) {
  if (!extracts.length) return "";
  return `<div class="list nested-list">${extracts.map((extract) => `
    <div class="item">
      <p class="item-title">Extract</p>
      <p class="item-meta">Mode: ${escapeHtml(extractModeLabel(extract.extractMode))}</p>
      ${extract.suggestionStatus ? `<p class="item-meta">Suggestion Status: ${escapeHtml(extract.suggestionStatus)}</p>` : ""}
      ${extract.suggestedBy ? `<p class="item-meta">Suggested By: ${escapeHtml(extract.suggestedBy)}</p>` : ""}
      ${extract.extractedFromFile ? `<p class="item-meta">File: ${escapeDisplay(extract.extractedFromFile.fileName, DISPLAY_META_LIMIT)}${extract.extractedFromFile.truncated ? " · Truncated" : ""}</p>` : ""}
      <p class="item-body">${escapeDisplay(extract.text)}</p>
      ${extract.summary ? `<p class="item-body">Summary: ${escapeDisplay(extract.summary)}</p>` : ""}
      <p class="item-meta">${escapeHtml(actorDisplay(extract.actorId))} · ${escapeHtml(formatDate(extract.dateAdded))}</p>
      ${extract.tags?.length ? `<p class="item-meta">Tags: ${escapeDisplay(tagsToText(extract.tags), DISPLAY_META_LIMIT)}</p>` : ""}
      ${renderAttachedSources(extract)}
      <div class="item-actions"><button class="btn secondary compact" data-action="create-draft-project" data-object-id="${extract.id}">${escapeHtml(t("createDraftProject"))}</button></div>
      ${extract.extractMode === "ai_suggested" && extract.suggestionStatus === "pending_approval" ? `<div class="item-actions"><button class="btn secondary compact" data-action="approve-extract" data-object-id="${extract.id}">${escapeHtml(t("approveExtract"))}</button></div>` : ""}
      ${renderObjectActions("Extract", extract.id, extract.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderRelationshipList(relationships) {
  if (!relationships.length) return emptyText("No relationships recorded.");
  return `<div class="list">${relationships.map((relationship) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(relationshipTargetLabel(relationship))}</p>
      <p class="item-meta">${escapeDisplay(relationship.relationshipType || "Related", DISPLAY_META_LIMIT)} · ${escapeHtml(actorDisplay(relationship.actorId))} · ${escapeHtml(formatDate(relationship.createdAt))}</p>
      ${relationship.notes ? `<p class="item-body">${escapeDisplay(relationship.notes)}</p>` : ""}
      ${renderAttachedSources(relationship)}
      ${renderAttachedImages(relationship)}
      ${renderObjectActions("Relationship", relationship.id, relationship.status === "archived")}
    </div>
  `).join("")}</div>`;
}

function renderDraftProjectList(draftProjects) {
  if (!draftProjects.length) return emptyText("No draft projects.");
  return `<div class="list">${draftProjects.map((draftProject) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(draftProject.name, DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">Created: ${escapeHtml(formatDate(draftProject.createdAt))} · Source: ${escapeDisplay(draftProject.sourceTitle || "Not recorded", DISPLAY_META_LIMIT)}</p>
      <p class="item-meta">Status: ${escapeHtml(draftProject.status || "draft")}${draftProject.approvedAt ? ` · Approved ${escapeHtml(formatDate(draftProject.approvedAt))}` : ""}</p>
      <p class="item-body">${escapeDisplay(draftProject.draft || "No draft text recorded.")}</p>
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
    factsReviewed: "Facts reviewed",
    decisionsReviewed: "Decisions reviewed",
    questionsReviewed: "Questions reviewed",
    actionsReviewed: "Actions reviewed",
    relationshipsReviewed: "Relationships reviewed",
    readyForApproval: "Ready for approval"
  };
  return `
    <div class="review-flags">
      ${DRAFT_REVIEW_FLAGS.map((flag) => `<span class="pill ${flags[flag] ? "review-done" : "review-open"}">${escapeHtml(labels[flag])}: ${flags[flag] ? "Yes" : "No"}</span>`).join("")}
    </div>
  `;
}

function renderQuestionList(questions) {
  if (!questions.length) return emptyText("No open questions.");
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
  if (!actions.length) return emptyText("No next actions.");
  return `<div class="list">${actions.map((action) => `
    <div class="item">
      <p class="item-title">${escapeDisplay(action.action)}</p>
      <p class="item-meta">Status: ${escapeHtml(getActionStatus(action))}</p>
      <p class="item-meta">Created: ${escapeHtml(formatDate(action.createdAt))}</p>
      <p class="item-meta">Due: ${escapeHtml(action.dueDate ? formatDate(action.dueDate, false) : "Not set")}</p>
      <p class="item-meta">Completed: ${escapeHtml(action.completedAt ? formatDate(action.completedAt) : "Not completed")}</p>
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
      <p class="item-meta">Attached Sources:</p>
      ${links.map((link) => `<p class="item-meta">${escapeDisplay(link.sourceTitle || "Source", DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(link.attachedAt))}</p>`).join("")}
    </div>
  `;
}

function renderAttachedImages(object) {
  const images = Array.isArray(object.imageLinks) ? object.imageLinks : [];
  if (!images.length) return "";
  return `
    <div class="attached-images">
      <p class="item-meta">Attached Images:</p>
      <div class="image-strip">
        ${images.map((image) => `
          <button class="image-thumb" type="button" data-action="view-image" data-object-type="${escapeHtml(image.attachedToType || "")}" data-object-id="${escapeHtml(image.attachedToId || "")}" data-image-id="${escapeHtml(image.id)}" aria-label="View ${escapeHtml(image.fileName || "image")}">
            ${image.dataUrl ? `<img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.caption || image.fileName || "Attached image")}">` : `<span>${escapeDisplay(image.fileName || "Image", DISPLAY_META_LIMIT)}</span>`}
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
  if (!changes.length) return emptyText("No recent activity.");
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
        <p class="history-detail">Reason: ${escapeDisplay(change.reason)}</p>
        <p class="history-detail">Changed: ${escapeDisplay(describeDetails(change.details))}</p>
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
    const title = details.objectTitle || details.objectText || "Untitled object";
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

function exportStorageBackup() {
  const timestamp = nowIso();
  store.settings.lastBackupExportedAt = timestamp;
  store.settings.lastBackupExportedBy = store.settings.primaryActorId || "";
  const payload = {
    exportedAt: timestamp,
    app: "Project State",
    backupType: "full-storage-spine",
    storage: {
      primary: ProjectStateStorage.supported() ? "IndexedDB" : "Legacy JSON fallback",
      backup: "User-controlled JSON file",
      storageMode
    },
    schemaVersion: store.schemaVersion,
    store
  };
  const stamp = timestamp.replace(/[:.]/g, "-");
  downloadTextFile(`project-state-backup-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
  saveStore({ allowWithoutCoreApproval: true, reason: "backup-export" });
}

function exportCurrentRawData() {
  const timestamp = nowIso();
  const payload = {
    exportedAt: timestamp,
    app: "Project State",
    exportType: "raw-current-store",
    storageKey: STORAGE_KEY,
    storageMode,
    store
  };
  const stamp = timestamp.replace(/[:.]/g, "-");
  downloadTextFile(`project-state-raw-current-${stamp}.json`, JSON.stringify(payload, null, 2), "application/json");
}

function openRestoreStorageModal() {
  showModal({
    title: "Restore Project State Backup",
    submitText: t("restoreBackup"),
    body: `
      <p class="notice">Restore replaces the local storage spine with the selected backup file. This does not use a server.</p>
      <div class="field">
        <label for="backupFile">Backup File</label>
        <input id="backupFile" name="backupFile" type="file" accept=".json,application/json" required>
      </div>
      ${confirmationField("confirmRestore", "I understand this will replace the current local Project State storage.")}
      ${auditFields({ actorLabel: t("restoredBy"), reasonLabel: t("restoreReason") })}
    `,
    async onSubmit(data, form) {
      const confirmField = form.querySelector('[name="confirmRestore"]');
      if (data.confirmRestore !== "on") {
        confirmField?.setCustomValidity("Confirm restore before continuing.");
        confirmField?.reportValidity();
        confirmField?.setCustomValidity("");
        return false;
      }
      const reasonField = form.querySelector('[name="reason"]');
      if (!String(data.reason || "").trim()) {
        reasonField?.setCustomValidity("Restore reason is required.");
        reasonField?.reportValidity();
        reasonField?.setCustomValidity("");
        return false;
      }
      const fileField = form.querySelector('[name="backupFile"]');
      const file = fileField?.files?.[0] || data.backupFile;
      if (!file) {
        fileField?.setCustomValidity("Choose a Project State backup JSON file.");
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let parsed;
      try {
        parsed = JSON.parse(await readFileAsText(file));
      } catch {
        fileField?.setCustomValidity("This backup file is not readable JSON.");
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let restoredStore;
      try {
        restoredStore = normalizeStore(extractStoreFromBackup(parsed));
      } catch (error) {
        fileField?.setCustomValidity(error.message || "This is not a valid Project State backup.");
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
  const first = confirm("Reset local Project State data? Export the failed data first. This clears only this app's local saved data.");
  if (!first) return;
  const second = confirm("Final confirmation: reset local data and start with an empty Project State store?");
  if (!second) return;
  await ProjectStateStorage.reset();
  loadFailure = null;
  migrationNeeded = false;
  store = emptyStore();
  storageReady = true;
  storageMode = ProjectStateStorage.supported() ? "indexeddb" : "legacy-json-fallback";
  activeProjectId = null;
  activeView = "dashboard";
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  searchQuery = "";
  setSaveStatus("saved", "Reset complete");
  render();
}

async function resetLocalDataFromSettings() {
  const first = confirm("Reset all local Project State data? Export a full backup first. This clears only this app's local saved data.");
  if (!first) return;
  const second = confirm("Final confirmation: reset local data and return to first-run setup?");
  if (!second) return;
  await ProjectStateStorage.reset();
  loadFailure = null;
  migrationNeeded = false;
  store = emptyStore();
  storageReady = true;
  storageMode = ProjectStateStorage.supported() ? "indexeddb" : "legacy-json-fallback";
  activeProjectId = null;
  activeRootView = "projects";
  activeView = "dashboard";
  activeHistoryFilter = null;
  activeHistoryEventType = "all";
  searchQuery = "";
  setSaveStatus("saved", "Reset complete");
  render();
}

function downloadTextFile(fileName, text, type = "text/plain") {
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

function openProjectOverviewModal() {
  const project = getProject();
  if (!project) return;
  showModal({
    title: "One Page Overview",
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
          <p class="meta-label">Project</p>
          <h3>${escapeDisplay(project.name, DISPLAY_META_LIMIT)}</h3>
        </div>
        <div>
          <p class="meta-label">Generated</p>
          <p class="item-meta">${escapeHtml(formatDate(nowIso()))}</p>
        </div>
      </div>

      <div class="overview-grid">
        <div>
          <p class="meta-label">Health</p>
          <p class="overview-value">${escapeHtml(healthFlagLabel(project.healthFlag))}</p>
        </div>
        <div>
          <p class="meta-label">Last Updated</p>
          <p class="overview-value">${escapeHtml(formatDate(project.updatedAt))}</p>
        </div>
        <div>
          <p class="meta-label">Updated By</p>
          <p class="overview-value">${escapeHtml(actorDisplay(project.updatedBy))}</p>
        </div>
      </div>

      <section>
        <h4>Current State</h4>
        <p class="overview-status">${escapeDisplay(project.currentStatus || "No current status recorded.")}</p>
        <p class="overview-body">${escapeDisplay(project.currentSummary || "No current summary recorded.")}</p>
      </section>

      <section>
        <h4>Recent Decisions</h4>
        ${renderOverviewList(decisions, (decision) => `
          <strong>${escapeDisplay(decision.text, DISPLAY_META_LIMIT)}</strong>
          <span>${escapeDisplay(decision.reason || "No reason recorded.", DISPLAY_META_LIMIT)} · ${escapeHtml(formatDate(decision.date))}</span>
        `, "No recent decisions.")}
      </section>

      <section>
        <h4>Open Questions</h4>
        ${renderOverviewList(questions, (question) => `
          <strong>${escapeDisplay(question.question, DISPLAY_META_LIMIT)}</strong>
          <span>${escapeDisplay(question.context || "No context recorded.", DISPLAY_META_LIMIT)}</span>
        `, "No open questions.")}
      </section>

      <section>
        <h4>Next Actions</h4>
        ${renderOverviewList(actions, (action) => `
          <strong>${escapeDisplay(action.action, DISPLAY_META_LIMIT)}</strong>
          <span>${action.owner ? `${escapeDisplay(action.owner, DISPLAY_META_LIMIT)} · ` : ""}${escapeHtml(action.dueDate ? `Due ${formatDate(action.dueDate, false)}` : "No due date")}</span>
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
        <button class="icon-btn" type="button" data-close-modal aria-label="Close">×</button>
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
    if (!field.placeholder) field.placeholder = `Limit ${limit} characters`;
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
    actorField.setCustomValidity("Actor is required.");
    actorField.reportValidity();
    actorField.setCustomValidity("");
    return false;
  }
  if (reasonField && !String(data.reason || "").trim()) {
    reasonField.setCustomValidity("Reason is required.");
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
      const fileLocation = file.webkitRelativePath || file.name;
      if (locationField) locationField.value = fileLocation;
      if (titleField && !titleField.value.trim()) titleField.value = file.name;
      if (typeField && !typeField.value.trim()) typeField.value = file.type || file.name.split(".").pop() || "";
    });
  }
}

function auditFields({ actorLabel = "Approved By", reasonLabel = "Reason" } = {}) {
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
    title: "Add Intake",
    submitText: t("saveToAirlock"),
    body: `
      <p class="notice">This creates a proposed change only. It will not change Project State until approved.</p>
      <div class="field">
        <label for="armType">Arm</label>
        <select id="armType" name="armType">${armTypeOptions("manual")}</select>
      </div>
      <div class="field">
        <label for="projectId">Target Project</label>
        <select id="projectId" name="projectId" required>
          ${projectOptions()}
        </select>
      </div>
      <div class="field">
        <label for="proposedObjectType">Proposed Change Type</label>
        <select id="proposedObjectType" name="proposedObjectType">${proposedObjectTypeOptions()}</select>
      </div>
      <div class="field">
        <label for="title">Intake Title</label>
        <input id="title" name="title" required>
      </div>
      <div class="field">
        <label for="text">Proposed Text</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="summary">Summary / Context</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="sourceLabel">Source / Origin Label</label>
        <input id="sourceLabel" name="sourceLabel">
      </div>
      <div class="two-col">
        <div class="field">
          <label for="target">Relationship Target / Owner</label>
          <input id="target" name="target">
        </div>
        <div class="field">
          <label for="dueDate">Due Date</label>
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
  showModal({
    title: "Approve Intake",
    submitText: t("approveToProjectState"),
    body: `
      <p class="notice">Approval applies this proposed change to the selected project and records it in history.</p>
      ${renderIntakeApprovalPreview(intake)}
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const result = approveIntakeItem(intake.id, actor, data.reason, (item, approval) => applyApprovedIntakeToCore(item, actor, data.reason, approval));
      return Boolean(result);
    }
  });
}

function openRejectIntakeModal(intakeId) {
  const intake = findIntakeItem(intakeId);
  if (!intake || intake.status !== "pending" || intake.archived) return;
  showModal({
    title: "Reject Intake",
    submitText: t("reject"),
    body: `
      <p class="notice">Rejecting keeps the intake record but prevents it from reaching Project State.</p>
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
    title: "Archive Intake",
    submitText: t("archive"),
    body: `
      <p class="notice">Archiving removes the intake from active review but keeps the record in the storage spine.</p>
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
      <p>${escapeDisplay(proposed.text || "No proposed text recorded.")}</p>
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
    title: "Create Project",
    submitText: t("approveProject"),
    body: `
      <div class="field">
        <label for="name">Project Name</label>
        <input id="name" name="name" required>
      </div>
      <div class="field">
        <label for="currentStatus">Current Status</label>
        <input id="currentStatus" name="currentStatus" required>
      </div>
      <div class="field">
        <label for="healthFlag">Project Health</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions("active")}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">Current Summary</label>
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
    title: "Delete Project",
    submitText: t("requestDeletion"),
    body: `
      <p class="notice">Deletion does not remove data in v0.1. The project will be archived and flagged as pending deletion approval. The final approval process is still to be determined.</p>
      ${confirmationField("confirmDelete", "I understand this will archive the project and request deletion approval.")}
      ${auditFields()}
    `,
    onSubmit(data) {
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
    title: "Unarchive Project",
    submitText: t("approveUnarchive"),
    body: `
      <p class="notice">Unarchiving returns the project to current use and records the approval in history.</p>
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
    title: "Edit Current Status",
    submitText: t("approveChange"),
    body: `
      <div class="field">
        <label for="currentStatus">Current Status</label>
        <input id="currentStatus" name="currentStatus" value="${escapeHtml(project.currentStatus)}" required>
      </div>
      <div class="field">
        <label for="healthFlag">Project Health</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions(project.healthFlag)}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">Current Summary</label>
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
    title: "Edit Project",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="name">Project Name</label>
        <input id="name" name="name" value="${escapeHtml(project.name)}" required>
      </div>
      <div class="field">
        <label for="currentStatus">Current Status</label>
        <input id="currentStatus" name="currentStatus" value="${escapeHtml(project.currentStatus)}" required>
      </div>
      <div class="field">
        <label for="healthFlag">Project Health</label>
        <select id="healthFlag" name="healthFlag">
          ${healthFlagOptions(project.healthFlag)}
        </select>
      </div>
      <div class="field">
        <label for="currentSummary">Current Summary</label>
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
    title: "Edit Decision",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="decision">Decision</label>
        <textarea id="decision" name="decision" required>${escapeHtml(decision.text)}</textarea>
      </div>
      <div class="field">
        <label for="confidence">Confidence</label>
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
    title: "Edit Fact",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="statement">Fact</label>
        <textarea id="statement" name="statement" required>${escapeHtml(fact.statement)}</textarea>
      </div>
      <div class="field">
        <label for="source">Source</label>
        <input id="source" name="source" value="${escapeHtml(fact.source || "")}">
      </div>
      <div class="field">
        <label for="confidence">Confidence</label>
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
    title: "Edit Source",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="title">Title</label>
        <input id="title" name="title" value="${escapeHtml(source.title)}" required>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="sourceType">Type</label>
          <input id="sourceType" name="sourceType" value="${escapeHtml(source.sourceType || "")}">
        </div>
        <div class="field">
          <label for="dateAdded">Date Added</label>
          <input id="dateAdded" name="dateAdded" type="date" value="${escapeHtml(toDateInputValue(source.dateAdded))}" required>
        </div>
      </div>
      <div class="field">
        <label for="location">Location</label>
        <input id="location" name="location" value="${escapeHtml(source.location || "")}">
      </div>
      <div class="field">
        <label for="localFile">Find Local File</label>
        <input id="localFile" name="localFile" type="file" data-local-file-picker data-location-target="location" data-title-target="title" data-type-target="sourceType">
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary">${escapeHtml(source.summary || "")}</textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
        <input id="tags" name="tags" value="${escapeHtml(tagsToText(source.tags))}">
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const previous = {
        title: source.title,
        sourceType: source.sourceType,
        dateAdded: source.dateAdded,
        location: source.location,
        localFile: source.localFile ? `${source.localFile.name} (${formatBytes(source.localFile.size)})` : "",
        summary: source.summary,
        tags: tagsToText(source.tags)
      };
      const localFile = fileMetadata(data.localFile);
      source.title = data.title.trim();
      source.sourceType = data.sourceType.trim();
      source.dateAdded = data.dateAdded || source.dateAdded;
      source.location = data.location.trim() || localFile?.name || "";
      source.localFile = localFile || source.localFile || null;
      source.summary = data.summary.trim();
      source.tags = tagsFromText(data.tags);
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
          newTags: tagsToText(source.tags)
        }
      });
      saveStore();
    }
  });
}

function openEditExtractModal(project, extract) {
  showModal({
    title: "Edit Extract",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="text">Extract</label>
        <textarea id="text" name="text" required>${escapeHtml(extract.text)}</textarea>
      </div>
      <div class="field">
        <label for="extractMode">Mode</label>
        <select id="extractMode" name="extractMode">
          <option value="manual" ${extract.extractMode === "manual" || !extract.extractMode ? "selected" : ""}>Manual</option>
          <option value="with_approval" ${extract.extractMode === "with_approval" ? "selected" : ""}>With approval</option>
          <option value="ai_suggested" ${extract.extractMode === "ai_suggested" ? "selected" : ""}>AI suggested</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary">${escapeHtml(extract.summary || "")}</textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
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
    title: "Edit Relationship",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="target">Related Project or Entity</label>
        <input id="target" name="target" value="${escapeHtml(relationship.target)}" required>
      </div>
      <div class="field">
        <label for="relationshipType">Relationship Type</label>
        <input id="relationshipType" name="relationshipType" value="${escapeHtml(relationship.relationshipType || "")}">
      </div>
      <div class="field">
        <label for="notes">Notes</label>
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
    title: "Create Draft Project",
    submitText: t("createDraft"),
    body: `
      <p class="notice">This creates a draft from the selected extract. It does not create a new project until approved.</p>
      <div class="field">
        <label for="name">Name</label>
        <input id="name" name="name" value="${escapeHtml(source.title || "Draft Project")}" required>
      </div>
      <div class="field">
        <label for="sourceLabel">Source</label>
        <input id="sourceLabel" name="sourceLabel" value="${escapeHtml(source.title)}" disabled>
      </div>
      <div class="field">
        <label for="draft">Draft</label>
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
    title: "Review Draft Project",
    submitText: t("saveReview"),
    body: `
      <div class="field">
        <label for="name">Name</label>
        <input id="name" name="name" value="${escapeHtml(draftProject.name)}" required>
      </div>
      <div class="field">
        <label for="draft">Draft</label>
        <textarea id="draft" name="draft" required>${escapeHtml(draftProject.draft || "")}</textarea>
      </div>
      <div class="check-list">
        ${reviewCheckbox("factsReviewed", "Facts reviewed", flags.factsReviewed)}
        ${reviewCheckbox("decisionsReviewed", "Decisions reviewed", flags.decisionsReviewed)}
        ${reviewCheckbox("questionsReviewed", "Questions reviewed", flags.questionsReviewed)}
        ${reviewCheckbox("actionsReviewed", "Actions reviewed", flags.actionsReviewed)}
        ${reviewCheckbox("relationshipsReviewed", "Relationships reviewed", flags.relationshipsReviewed)}
        ${reviewCheckbox("readyForApproval", "Ready for approval", flags.readyForApproval)}
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
    title: "Approve Draft Project",
    submitText: t("approveToProject"),
    body: `
      <p class="notice">Approval creates a new project from this draft and records the approval on the draft.</p>
      <div class="field">
        <label for="name">Approved Project Name</label>
        <input id="name" name="name" value="${escapeHtml(draftProject.name)}" required>
      </div>
      <div class="field">
        <label for="currentSummary">Approved Project Summary</label>
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
    title: "Edit Open Question",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="question">Open Question</label>
        <textarea id="question" name="question" required>${escapeHtml(question.question)}</textarea>
      </div>
      <div class="field">
        <label for="context">Context</label>
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
    title: "Edit Next Action",
    submitText: t("approveEdit"),
    body: `
      <div class="field">
        <label for="action">Next Action</label>
        <textarea id="action" name="action" required>${escapeHtml(action.action)}</textarea>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="owner">Owner</label>
          <input id="owner" name="owner" value="${escapeHtml(action.owner || "")}">
        </div>
        <div class="field">
          <label for="dueDate">Due Date</label>
          <input id="dueDate" name="dueDate" type="date" value="${escapeHtml(action.dueDate || "")}">
        </div>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="status">Status</label>
          <select id="status" name="status">
            ${["open", "completed", "archived"].map((value) => `<option value="${value}" ${getActionStatus(action) === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="completedAt">Completed Date</label>
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
    title: "Mark Action Complete",
    submitText: t("approveCompletion"),
    body: `
      <div class="field">
        <label for="completedAt">Completed Date</label>
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
    title: "AI Suggest Extract",
    submitText: t("recordSuggestion"),
    body: `
      <div class="field">
        <label for="suggestedBy">Suggested By</label>
        <input id="suggestedBy" name="suggestedBy" value="AI" required>
      </div>
      <div class="field">
        <label for="text">Suggested Extract</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
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
    title: "Approve Extract",
    submitText: t("approveExtract"),
    body: `
      <p class="notice">Approval records this AI suggestion as accepted by a human reviewer.</p>
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
      title: "Attach Source",
      submitText: t("close"),
      body: '<p class="notice">Add a source before attaching one to this object.</p>',
      onSubmit() {}
    });
    return;
  }

  showModal({
    title: "Attach Source",
    submitText: t("approveAttachment"),
    body: `
      <div class="field">
        <label for="sourceId">Source</label>
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
    title: "Attach Image",
    submitText: t("approveImage"),
    body: `
      <div class="field">
        <label for="imageFile">Image File</label>
        <input id="imageFile" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required>
      </div>
      <div class="field">
        <label for="caption">Caption / Notes</label>
        <textarea id="caption" name="caption"></textarea>
      </div>
      ${auditFields()}
    `,
    async onSubmit(data, form) {
      const fileField = form.querySelector('[name="imageFile"]');
      const file = fileField?.files?.[0] || data.imageFile;
      if (!file || !isSupportedImageFile(file)) {
        fileField?.setCustomValidity("Choose a PNG, JPG, WEBP, or GIF image.");
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
        localPath: file.webkitRelativePath || file.name,
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
    title: image.fileName || "Attached Image",
    submitText: t("close"),
    body: `
      <div class="image-viewer">
        ${image.dataUrl ? `<img src="${escapeHtml(image.dataUrl)}" alt="${escapeHtml(image.caption || image.fileName || "Attached image")}">` : emptyText("Image data is not available.")}
        ${image.caption ? `<p class="item-body">${escapeDisplay(image.caption)}</p>` : ""}
        <p class="item-meta">${escapeHtml(image.fileType || "Image")} · Added ${escapeHtml(formatDate(image.dateAdded))} · ${escapeHtml(actorDisplay(image.addedBy))}</p>
        ${image.localPath ? `<p class="item-meta">Local reference: ${escapeDisplay(image.localPath, DISPLAY_META_LIMIT)}</p>` : ""}
      </div>
    `,
    onSubmit() {}
  });
}

function openArchiveObjectModal(objectType, objectId) {
  const project = getProject();
  const object = getProjectObject(project, objectType, objectId);
  if (!object) return;

  showModal({
    title: `Archive ${objectType}`,
    submitText: t("approveArchive"),
    body: `
      <p class="notice">Archiving removes the object from the current dashboard but keeps its history.</p>
      ${confirmationField("confirmArchive", `I confirm this ${objectType} should be archived.`)}
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
    title: "Add Decision",
    submitText: t("approveDecision"),
    body: `
      <div class="field">
        <label for="decision">Decision</label>
        <textarea id="decision" name="decision" required></textarea>
      </div>
      <div class="field">
        <label for="confidence">Confidence</label>
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
    title: "Add Fact",
    submitText: t("approveFact"),
    body: `
      <div class="field">
        <label for="statement">Fact</label>
        <textarea id="statement" name="statement" required></textarea>
      </div>
      <div class="field">
        <label for="source">Source</label>
        <input id="source" name="source">
      </div>
      <div class="field">
        <label for="confidence">Confidence</label>
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
    title: "Add Source",
    submitText: t("approveSource"),
    body: `
      <div class="field">
        <label for="title">Title</label>
        <input id="title" name="title" required>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="sourceType">Type</label>
          <input id="sourceType" name="sourceType">
        </div>
        <div class="field">
          <label for="dateAdded">Date Added</label>
          <input id="dateAdded" name="dateAdded" type="date" value="${escapeHtml(toDateInputValue(nowIso()))}" required>
        </div>
      </div>
      <div class="field">
        <label for="location">Location</label>
        <input id="location" name="location">
      </div>
      <div class="field">
        <label for="localFile">Find Local File</label>
        <input id="localFile" name="localFile" type="file" data-local-file-picker data-location-target="location" data-title-target="title" data-type-target="sourceType">
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    onSubmit(data) {
      const actor = getOrCreateActor(data.actorName, "Human");
      const localFile = fileMetadata(data.localFile);
      const source = {
        id: uid("source"),
        projectId: project.id,
        title: data.title.trim() || localFile?.name || "Untitled Source",
        sourceType: data.sourceType.trim(),
        dateAdded: data.dateAdded || nowIso(),
        actorId: actor.id,
        location: data.location.trim() || localFile?.name || "",
        localFile,
        summary: data.summary.trim(),
        tags: tagsFromText(data.tags),
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
          tags: tagsToText(source.tags)
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
    title: "Add Extract",
    submitText: t("approveExtract"),
    body: `
      <div class="field">
        <label for="text">Extract</label>
        <textarea id="text" name="text" required></textarea>
      </div>
      <div class="field">
        <label for="extractMode">Mode</label>
        <select id="extractMode" name="extractMode">
          <option value="manual">Manual</option>
          <option value="with_approval">With approval</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
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
    title: "Read File Extract",
    submitText: t("approveExtract"),
    body: `
      <p class="notice">Reads TXT/MD directly. PDF and DOCX extraction is best-effort and stays local.</p>
      <div class="field">
        <label for="extractFile">File</label>
        <input id="extractFile" name="extractFile" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" required>
      </div>
      <div class="field">
        <label for="extractMode">Mode</label>
        <select id="extractMode" name="extractMode">
          <option value="manual">Manual</option>
          <option value="with_approval">With approval</option>
        </select>
      </div>
      <div class="field">
        <label for="summary">Summary</label>
        <textarea id="summary" name="summary"></textarea>
      </div>
      <div class="field">
        <label for="tags">Tags</label>
        <input id="tags" name="tags">
      </div>
      ${auditFields()}
    `,
    async onSubmit(data, form) {
      const fileField = form.querySelector('[name="extractFile"]');
      const file = fileField?.files?.[0] || data.extractFile;
      if (!file || !isSupportedExtractFile(file)) {
        fileField?.setCustomValidity("Choose a PDF, DOCX, TXT, or MD file.");
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      let extracted;
      try {
        extracted = truncateExtractedText(await extractTextFromFile(file));
      } catch (error) {
        fileField?.setCustomValidity(error.message || "Could not read text from this file.");
        fileField?.reportValidity();
        fileField?.setCustomValidity("");
        return false;
      }

      if (!extracted.text) {
        fileField?.setCustomValidity("No readable text was found in this file.");
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
          localPath: file.webkitRelativePath || file.name,
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
    title: "Add Relationship",
    submitText: t("approveRelationship"),
    body: `
      <div class="field">
        <label for="target">Related Project or Entity</label>
        <input id="target" name="target" required>
      </div>
      <div class="field">
        <label for="relationshipType">Relationship Type</label>
        <input id="relationshipType" name="relationshipType" placeholder="Parent, child, dependency, related">
      </div>
      <div class="field">
        <label for="notes">Notes</label>
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
    title: "Add Open Question",
    submitText: t("approveQuestion"),
    body: `
      <div class="field">
        <label for="question">Open Question</label>
        <textarea id="question" name="question" required></textarea>
      </div>
      <div class="field">
        <label for="context">Context</label>
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
    title: "Add Next Action",
    submitText: t("approveAction"),
    body: `
      <div class="field">
        <label for="action">Next Action</label>
        <textarea id="action" name="action" required></textarea>
      </div>
      <div class="two-col">
        <div class="field">
          <label for="owner">Owner</label>
          <input id="owner" name="owner">
        </div>
        <div class="field">
          <label for="dueDate">Due Date</label>
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
  reasonField?.setCustomValidity("A reason is required.");
  reasonField?.reportValidity();
  reasonField?.setCustomValidity("");
  return false;
}

function saveSettingsCore(data, form) {
  if (!validateSettingsReason(form, data)) return;
  const primaryActor = getActor(data.primaryActorId);
  const actorField = form.querySelector('[name="primaryActorId"]');
  if (!primaryActor || normalizeActorStatus(primaryActor.status) !== "active") {
    actorField?.setCustomValidity("Choose an active default actor.");
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
    field?.setCustomValidity("Record the storage override reason.");
    field?.reportValidity();
    field?.setCustomValidity("");
    return;
  }
  store.settings.storageSystem = "local_browser_spine";
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
    field?.setCustomValidity("Record the backup override reason.");
    field?.reportValidity();
    field?.setCustomValidity("");
    return;
  }
  store.settings.backupSystem = "user_json_export";
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
    nameField?.setCustomValidity("Actor name is required.");
    nameField?.reportValidity();
    nameField?.setCustomValidity("");
    return;
  }
  const nextStatus = normalizeActorStatus(data.status);
  if (store.settings.primaryActorId === actor.id && nextStatus === "archived") {
    const statusField = form.querySelector('[name="status"]');
    statusField?.setCustomValidity("Choose a different default actor before archiving this actor.");
    statusField?.reportValidity();
    statusField?.setCustomValidity("");
    return;
  }
  actor.name = nextName;
  actor.role = normalizeActorRole(data.role, actor.type);
  actor.status = nextStatus;
  actor.type = actor.role === "ai_tool" ? "AI / Tool" : "Human";
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
    nameField?.setCustomValidity("Actor name is required.");
    nameField?.reportValidity();
    nameField?.setCustomValidity("");
    return;
  }
  const existing = store.actors.find((actor) => nameKey(actor.name) === nameKey(name));
  if (existing) {
    nameField?.setCustomValidity("An actor with this name already exists.");
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
  if (action === "reject-intake") openRejectIntakeModal(button.dataset.intakeId);
  if (action === "archive-intake") openArchiveIntakeModal(button.dataset.intakeId);
  if (action === "export-project") exportProjectJson();
  if (action === "project-overview") openProjectOverviewModal();
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
    actorField?.setCustomValidity("Primary actor is required.");
    actorField?.reportValidity();
    actorField?.setCustomValidity("");
    return;
  }
  const confirmField = form.querySelector('[name="confirmLocalMode"]');
  if (data.confirmLocalMode !== "on") {
    confirmField?.setCustomValidity("Confirm local mode before continuing.");
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
