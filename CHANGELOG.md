# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - Launch Candidate

### Added
- **Core Features**
  - Expanded security rules (26 rule-based checks).
  - Full Compare Mode with visual diffs and trend analysis.
  - Learning Center (`/learn`) with progress tracking and bookmarks.
  - Multi-file code patching & Fix All download.
- **Quality & Polish**
  - Comprehensive error handling (empty files, binary detection, quota limits).
  - WCAG AA Accessibility (skip nav, ARIA, minimum touch targets).
  - First-time user onboarding walkthrough.
  - Mobile responsive layouts.
- **Performance & PWA**
  - Offline mode via Service Worker.
  - Installable PWA with manifest.json.
  - Full SEO configuration (OG, Twitter cards, structured data).
- **Testing**
  - Playwright End-to-End tests configured in CI.

### Changed
- Refactored `DropZone.tsx` to handle more edge cases.
- Improved `Scanner.tsx` with timeout abort logic.

### Fixed
- Addressed potential quota exceeded errors in `lib/storage.ts`.
