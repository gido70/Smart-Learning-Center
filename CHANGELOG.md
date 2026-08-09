# Changelog

## 3.1.0 — Personal Lecture Portal
- Converted the product identity to عبدالرحمن's private personal learning center.
- Added a database-backed lecture portal for YouTube, external learning platforms, direct video/audio, and PDF sources.
- Added internal viewing when supported and a permanent original-source fallback.
- Expanded global search across courses, lectures, notes, modules, and saved summaries.
- Removed the active browser-side Claude API key flow.
- Added a no-API workflow that prepares lecture text for the user's existing ChatGPT subscription and saves the returned summary.
- Added `slc_lectures` SQL migration with owner-scoped RLS.
- Fixed the stale smoke-test expectation for a nonexistent architecture view.

## 3.0.1 — Live Learning Studio
- Added Audio, Presentation, and Hybrid capture modes.
- Added browser screen sharing for Zoom/PowerPoint presentations.
- Added manual slide capture, slide cards, timeline, questions, highlights, and export.
- Added finish-session workflow and local autosave.
- Preserved existing Supabase integration and all other modules.

# Changelog

## Version 2.2 — Supabase Operational Start

- Connected the interface to the existing Supabase project.
- Added email/password authentication through Supabase Auth.
- Added real course creation and storage in `slc_courses`.
- Added real Knowledge Inbox source storage in `slc_sources`.
- Added course listing and deletion under the authenticated user's RLS scope.
- Added database-backed Inbox columns.
- No existing Al-Falah tables were modified.
