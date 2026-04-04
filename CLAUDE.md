# CLAUDE.md — המצפן (HaMatzpen)

## Project Overview
"המצפן" (The Compass) is a military education web app for the Hashmonaim Brigade (חטיבת החשמונאים) — an Israeli identity, heritage, and resilience program. It covers learning tracks, geography quizzes, Hebrew literacy, training management, and geographic surveys. The site is hosted on GitHub Pages at **hamatzpen.io**.

## Architecture
- **Single-page HTML application**: `index.html` (~16,700 lines, ~960KB) — contains ALL HTML, CSS, and JavaScript
- **No build system** — edit `index.html` directly; changes deploy automatically via GitHub Pages
- **Backend**: Firebase/Firestore (projectId: `ruach-hashmonait`)
- **PWA**: Service worker (`sw.js` v3, stale-while-revalidate), `manifest.json`
- **Routing**: Hash-based (`#home`, `#learning`, `#training`, `#hebrew`, `#geography`, `#map-quiz`, `#reports`)
- **Maps**: Leaflet.js 1.9.4 for interactive geography and map quizzes
- **Reports page**: Separate file `reports.html` (~1,781 lines) for administrative reports

## File Structure
```
index.html          — Main application (all-in-one HTML/CSS/JS)
reports.html        — Admin reports dashboard
sw.js               — Service worker (cache: ruach-v3)
manifest.json       — PWA manifest
CNAME               — Custom domain: hamatzpen.io
logo.png            — App logo
.nojekyll           — Disable Jekyll processing
firebase/           — Local SDK fallbacks (firebase-app-compat.js, etc.)
icons/              — PWA icons (72x72 through 512x512)
maps/               — Static map image assets
sakal/              — PDF geographic survey documents
```

## Code Structure (index.html sections by line number)
The file follows this order — all within a single `<script>` block:

1. **Security** (~line 29): Anti-devtools, anti-copy protections
2. **CSS** (~line 80–1730): All styles inline in `<style>` block
3. **CONFIG** (~line 1732): Firebase config, app constants
4. **ROLES & PERMISSIONS** (~line 1751): 14+ roles with hierarchical levels, permission system
5. **LEARNING PROGRAMS** (~line 1921): Commitment board, prizes, leaderboard
6. **ROUTING** (~line 1958): Hash-based navigation, `navigate()` and `activatePage()` functions
7. **LOGIN & REGISTRATION** (~line 2081): Password hashing, Firestore user auth, session management
8. **LEARNING MODULE** (~line 2478): והגית בו — commitment tracking, daily learning
9. **TRAINING** (~line 2780): Multi-program training system (basic, NCO, officer tracks)
10. **HEBREW MODULE** (~line 3143–11377): Interactive Hebrew learning with flashcards, matching, fill-in exercises
11. **GEOGRAPHY** (~line 11378): בעקבות הנצח — interactive Leaflet maps with markers, routes, raster overlays
12. **MAP QUIZZES** (~line 11514): מפה אילמת — quiz engine with markers, routes, polygons
13. **GEOGRAPHIC SURVEYS** (~line 13904): סקירות גיאוגרפיות — PDF-based geographic survey viewer
14. **EVENTS** (~line 14325): Calendar and event management
15. **ADMIN** (~line 14576): User management, role assignment
16. **FEEDBACK** (~line 14856): Feedback collection system
17. **APP INIT** (~line 15269): DOMContentLoaded, Firebase init, routing setup

## Key Patterns

### Quiz Data Structure (MAP_QUIZZES)
Each quiz in the `MAP_QUIZZES` array has:
- `locations[]`: Array of place markers. Some use `num` property, others use `id` — both must be supported by filter code.
- `routes[]`: Array of route lines (optional). Each has an `id` string.
- `questions[]`: Each question has:
  - `showLocations: [numbers]` — which markers to display (by `num` or `id`)
  - `showRoutes: [strings]` — which routes to display (by route `id`)
  - `routeId: 'string'` — alternative to `showRoutes` for single-route quizzes
  - If both are absent, ALL markers/routes show (legacy behavior)

### Filter Logic (function mqRenderQuestion, ~line 13573)
```javascript
// Marker filter uses locKey to support both num and id:
var locKey = loc.num !== undefined ? loc.num : loc.id;
if (showLocs !== null && showLocs.indexOf(locKey) === -1) return;

// Route filter supports both showRoutes array and routeId string:
var hasRtFilter = q.hasOwnProperty('showRoutes') || q.hasOwnProperty('routeId');
```

### Quizzes Currently Defined
| Quiz ID | Name | Locations Use | Notes |
|---------|------|--------------|-------|
| avot_journeys | מסעות האבות | `num` | Has showLocations on all questions |
| four_five_kings | מלחמת 4 מול 5 מלכים | `num` | Has showLocations on all questions |
| judges_wars | מלחמות השופטים | `num` | Has showLocations on all questions |
| ancient_cities | ערים עתיקות | `id` | showLocations added March 2026 |
| david_battles | מלחמות דוד | `id` | showLocations added March 2026 |
| modern_roads | דרכי ישראל | `num` | Uses routeId per question |

### Role Hierarchy
Roles from highest to lowest: `super_admin` → `admin` → `mashak_hativa` → `mashak_gdud` → `rasar` → `mefaked_pluga` → `samal_pluga` → `mashak_pluga` → `officer` → `nco` → `nco_student` → `soldier` → `guest` → `parent`

### Firebase Collections
- `users` — User profiles, roles, permissions
- `training-content` — Training materials per program
- `hebrew-progress` — Hebrew learning progress tracking
- `commitments` — Learning commitment board entries
- `feedback` — Feedback submissions

## Critical Warnings

### ⚠️ File Size
The `index.html` file is ~960KB. GitHub's web editor may freeze when trying to commit large changes. For large edits, use incremental search-and-replace via CodeMirror API rather than replacing the entire file content.

### ⚠️ Property Inconsistency
Quiz locations use EITHER `num` or `id` for identification. Always check which property a specific quiz uses before adding `showLocations` values. The filter code handles both via `locKey`.

### ⚠️ No Build System
There is no build tool, bundler, or minifier. All changes are live immediately after committing to `main`. Test carefully before pushing.

### ⚠️ Service Worker Caching
After deploying changes, users may see stale content due to the service worker cache (`ruach-v3`). Increment the cache version in `sw.js` for breaking changes, or advise users to hard-refresh.

### ⚠️ Security Measures
The app has anti-devtools detection (debugger-based timing check). This will trigger when using browser DevTools on the live site. The detection redirects the page to a warning message.

## Deployment
1. Commit changes to `main` branch
2. GitHub Pages auto-deploys from `main`
3. Custom domain: `hamatzpen.io` (configured via `CNAME` file)
4. The `.nojekyll` file prevents Jekyll processing

## Repository
- **Organization**: ruach-hashmonaim
- **Repo**: ruach-hashmonait
- **URL**: https://github.com/ruach-hashmonaim/ruach-hashmonait
- **Live site**: https://hamatzpen.io

## Map Quiz Content Guidelines (מבחני מפה)

When creating or editing map quizzes:

### Questions
- Questions must **tell the story** of each point — NOT generic "what is the point on the map" questions
- Good: "המקום בו התקיים הקרב הראשון של שאול המלך", "מכובדי העיר הניפו דגל לבן — איזו עיר?"
- Bad: "מה הנקודה המופיעה במפה?", "מהו מוקד הקרב מספר 5?"
- Each question should include historical/narrative context from the source material
- The `expansion` field must contain the **full content** from the original PDF source — including quotes, verses, and background

### Arrows (Routes)
- Arrows must be **geographically accurate** — verify coordinates match real-world locations
- Arrow direction must show the **actual military movement direction** (e.g., IDF advancing INTO enemy territory, not starting from the target)
- Use Google Maps or known coordinates to verify lat/lng accuracy
- Each numbered point on the source PDF map must have a corresponding arrow

### Location Pins (showLocations)
- Pins must be placed on **target/destination** locations, NOT on departure points
- For battles: pin goes on the battle site or conquered location
- Departure points (like Jerusalem/Hebron for David's conquests) should be labeled as "נק' מוצא" (departure point)

### Expansion Content
- Must include the full narrative from the source PDF
- Biblical quizzes: include the full verse in Hebrew with nikud
- Modern quizzes: include unit names, commanders, tactical details from the source
- Always reference the arrow/point number: "חץ/נקודה מספר X במפה"

## Recent Changes (March 2026)
- Fixed map quiz filtering: markers and routes now show only the relevant data per question
- Fixed `loc.num` vs `loc.id` inconsistency in filter code
- Added `showLocations` to all 19 `ancient_cities` questions and 6 `david_battles` questions
- Improved road coordinates for `modern_roads` quiz
- Fixed `routeId` support in route filter logic
