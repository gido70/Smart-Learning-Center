# Changelog

## 3.5.3 — Live Studio Final Polish
- Added explicit on/off states for microphone, system audio, screen sharing, and fast automatic slide capture.
- Reduced slide detection latency to two seconds with a short stability check and a manual immediate-capture button.
- Changed lecture and slide suggestions to readable full-width sections and fixed their save/copy/dismiss actions.
- Added a local lecture-context helper that retrieves transcript and slide evidence without an external AI API.
- Closed and cleared the live workspace after saving a draft while keeping the draft available through an explicit restore button.
- Improved end-of-session cleanup so media sources and stale assistant content do not leak into the next session.

## 3.5.2 — Improved Local Summary
- Added resumable live-session controls, automatic distinct-slide capture, real audio-status reporting, browser recording, and local crash recovery without changing the release number.
- Added a platform-wide Arabic functional audit and focused tests for live-session timing, recovery, slide deduplication, and media-track shutdown.
- Kept the entire summarization workflow inside the platform with no API or external handoff.
- Removed malformed timestamps even when glued directly to Arabic words.
- Expanded moderate Egyptian-to-MSA normalization and rejected more transcript noise.
- Preserved a concise extractive summary suitable for quick review.

## 3.5.1 — Transcript Repair
- Removed malformed speech-to-text timestamps such as `8g ثواني` and `44g دقيقة`.
- Expanded Egyptian-to-MSA normalization for the expressions found in the uploaded lecture.
- Removed isolated Latin timestamp markers left by transcript services.

## 3.5.0 — Arabic Study Summaries
- Removed spoken timestamps from pasted transcripts.
- Added educational Modern Standard Arabic normalization for common Egyptian, Sudanese, Gulf, and Levantine expressions.
- Reduced repeated ideas and blocked timestamp-heavy fragments.
- Activated course status filters and course search.
- Added deletion and regeneration of the combined course summary.
- Replaced the combined-summary browser alert with the normal in-platform notification.

## 3.4.0 — Lecture Management Consolidation
- Added lecture editing from the lecture portal, course series, and workspace.
- Added course reassignment and ordering without re-uploading a lecture.
- Improved confirmed deletion, including live-slide cleanup.
- Disabled invalid combined summaries when a course has no summarized lectures.
- Added a scoped migration that restores the experimental first lecture and attaches its saved summary.

## 3.3.0 — Course Series and Live Archive
- Added ordered multi-day course views and combined course summaries.
- Added deletion and replacement of saved lecture summaries.
- Completed the live-session transition into the lecture library.
- Added private slide storage for live-session captures.
- Preserved the full long-term product requirements inside the repository.

## 3.2.0 — Scientific Lecture Summarizer
- Added a private in-platform Arabic summarizer with no external AI key or usage charge.
- Added thematic segmentation so every part of a long lecture contributes to the result.
- Added structured outputs for the executive summary, sequential themes, concepts, examples, actions, warnings, review questions, and coverage indicator.
- Saved the source transcript and generated summary with the current lecture for later search.
- Added an optional NotebookLM preparation export while keeping local summarization as the primary workflow.

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
