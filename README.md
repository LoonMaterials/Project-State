What is Project State?

Project State is a local-first project continuity system designed to preserve the current state, history, decisions, questions, actions, and relationships of a project in a single authoritative location.

The core idea is simple:

Most projects don't fail because information is missing. They fail because information becomes fragmented.

Project State attempts to solve the problem of context fragmentation by treating the project itself—not conversations, documents, emails, or AI chats—as the source of truth.

What Problem Does It Solve?

As projects grow, information becomes scattered across:

Emails
Chat conversations
AI conversations
Documents
Meeting notes
Source control
Human memory

Over time people stop asking:

"What's the current status?"

and start asking:

"Where did we talk about that?"

Project State is designed to answer:

"What is the current state of this project, and how did it get here?"

Current Core Objects

The current prototype tracks:

Projects
Decisions
Facts
Open Questions
Next Actions
Relationships
Change History
Actors

Every significant change records:

What changed
Who changed it
When it changed
Why it changed
Design Principles

Project State is:

Local-first
Human-readable
AI-compatible
Change-tracked
Decision-centered
Context-preserving

Project State is not:

Social media
Attention software
Productivity gamification
AI-controlled project management

Humans remain the authority.

AI acts as a contributor.

Long-Term Vision

The long-term goal is a system where:

Projects retain continuity across years
New team members can rapidly understand project history
AI systems can contribute without becoming the source of truth
Context survives personnel changes, software changes, and time

Think:

"Git for project knowledge and decisions."

rather than:

"Another task manager."

Questions I'd Love Feedback On
Architecture
Should project state be directly editable or derived from change events?
JSON, SQLite, or hybrid storage?
What is the best local-first architecture?
Teams
What information do teams lose most often?
What project information is hardest to recover six months later?
What would make onboarding easier?
Project Management
Are Decisions, Facts, Questions, and Actions sufficient?
Are there missing first-class objects?
How should project relationships work?
Knowledge Management
How should large documents be handled?
Should source documents be stored directly or referenced?
How should information be extracted from documents into project state?
AI Integration
What would you trust AI to do?
What would you never trust AI to do?
How should AI suggestions be reviewed and approved?
Collaboration
What permissions and roles are actually useful?
How should multi-user editing work without losing accountability?
Current Development Status

Prototype exists and currently supports:

Project dashboards
Decisions
Facts
Questions
Actions
Relationships
Change history
Actor tracking
Stable object IDs
Local storage

Currently exploring:

Source documents
Search
Knowledge ingestion
Multi-user architecture
AI-assisted extraction

Current Architecture Note

Project State now uses an octopus-style architecture:

Core: approved Project State records
Spine: local storage and retrieval
Airlock: intake/proposed changes awaiting human review
Arms: future inputs such as AI, Codex, notes, email, meetings, calendars, and files

Arms do not write directly to the core. They create intake items. A human must approve intake before it becomes a Decision, Fact, Open Question, Next Action, Source, Relationship, or Project Status change. Rejected and archived intake remains outside the core.
