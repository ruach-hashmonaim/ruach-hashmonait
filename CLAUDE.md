# CLAUDE.md — המצפן (HaMatzpen)

## Project Overview
"המצפן" (The Compass) is a military education web app for the Hashmonaim Brigade (חטיבת החשמונאים) — an Israeli identity, heritage, and resilience program. It covers learning tracks, geography quizzes, Hebrew literacy, training management, AI-powered content generation, geographic surveys (סק"גים), morale activities (מור"קים), trivia, and a content library. The site is hosted on GitHub Pages at **hamatzpen.io**.

## Architecture
- **Single-page HTML application**: `index.html` (~23,200+ lines) — contains ALL HTML, CSS, and JavaScript
- **No build system** — edit `index.html` directly; changes deploy automatically via GitHub Pages
- **Backend**: Firebase/Firestore (projectId: `ruach-hashmonait`) + Firebase Anonymous Auth
- **AI**: Gemini 2.5 Flash API with Google Search grounding for content generation
- **PWA**: Service worker (`sw.js` v20, network-first for HTML, stale-while-revalidate for static assets), `manifest.json`
- **Routing**: Hash-based (`#home`, `#learning`, `#training`, `#hebrew`, `#geography`, `#map-quiz`, `#reports`, `#sakag-create`, etc.)
- **Maps**: Leaflet.js 1.9.4 for interactive geography and map quizzes
- **Reports page**: Separate file `reports.html` for administrative reports

## File Structure
```
index.html              — Main application (all-in-one HTML/CSS/JS, ~23,200 lines)
reports.html            — Admin reports dashboard
sw.js                   — Service worker (cache: ruach-v20)
manifest.json           — PWA manifest
CNAME                   — Custom domain: hamatzpen.io
logo.png                — App logo
.nojekyll               — Disable Jekyll processing
claude-proxy-worker.js  — Cloudflare Worker for Claude API proxy (NOT currently used)
firebase/               — Local SDK fallbacks (firebase-app-compat.js, firebase-auth-compat.js, etc.)
icons/                  — PWA icons (72x72 through 512x512)
maps/                   — Static map image assets
sakal/                  — PDF geographic survey documents
```

## Code Structure (index.html sections by approximate line number)

1. **Security** (~line 29): Anti-devtools, anti-copy protections
2. **CSS** (~line 80–2100): All styles inline in `<style>` block, including floating AI widget styles
3. **CSS Variables** (~line 95): Teal/turquoise color scheme
   ```
   --primary: #0C4A6E; --primary-light: #0E7490; --primary-lighter: #06B6D4;
   --accent: #D4A843; --accent-light: #E8C364;
   --bg: #F0F9FF; --card: #FFFFFF;
   ```
4. **CONFIG** (~line 2120): Firebase config, app constants, GEMINI_API_KEY
5. **ROLES & PERMISSIONS** (~line 2140): 14+ roles with hierarchical levels
6. **LEARNING PROGRAMS** (~line 2300): Commitment board, prizes, leaderboard
7. **ROUTING** (~line 2798): Hash-based navigation, `navigate()` and `activatePage()` functions
8. **LOGIN & REGISTRATION** (~line 2870): Password hashing, Firestore user auth, session management
9. **LEARNING MODULE** (~line 3200): והגית בו — commitment tracking, daily learning
10. **TRAINING** (~line 3500): Multi-program training system (basic, NCO, officer tracks)
11. **HEBREW MODULE** (~line 3900–11800): Interactive Hebrew learning with flashcards, matching, fill-in exercises
12. **GEOGRAPHY** (~line 11800): בעקבות הנצח — interactive Leaflet maps with markers, routes, raster overlays
13. **MAP QUIZZES** (~line 11900): מפה אילמת — quiz engine with markers, routes, polygons
14. **GEOGRAPHIC SURVEYS (סק"גים)** (~line 14300): PDF-based geographic survey viewer
15. **EVENTS** (~line 14700): Calendar and event management
16. **ADMIN** (~line 14950): User management, role assignment
17. **COMMANDER TOOLS** (~line 16500): כלים למפקד section
18. **SAKAG GENERATOR** (~line 17067): AI-powered geographic survey creation (`modalSakagGenerate`)
19. **MORAK GENERATOR** (~line 18255): AI-powered morale activity creation (`morakGenerate`)
20. **LESSON GENERATOR** (~line 18495): AI-powered lesson plan creation (`lessonGenerate`)
21. **LIBRARY** (~line 18643): Content library with cache, map view, filtering (`loadLibrary`)
22. **TRIVIA** (~line 19000): Quiz engine + AI trivia generation (`triviaGenerateAI`)
23. **FIRESTORE RECOVERY** (~line 21814): Offline detection and reconnection (`setupFirestoreRecovery`)
24. **APP INIT** (~line 21850): `initApp()` — Firebase init, Anonymous Auth, auto-login
25. **AI FLOATING WIDGET** (~line 23100): Background AI generation progress indicator

## Key Systems

### AI Content Generation
All AI content uses **Gemini 2.5 Flash** with Google Search grounding:
- **סק"ג (Sakag)**: Geographic survey for a specific location — generates structured military-style survey
- **מור"ק (Morak)**: Morale activity plan — generates activity structure with timeline
- **שיעור (Lesson)**: Lesson plan — generates structured teaching plan
- **טריוויה (Trivia)**: AI-generated quiz questions on a topic

Each generator uses the **floating AI progress widget** (`#ai-progress-float`) that allows the user to continue navigating while content generates in the background. When generation completes, the widget shows a completion message with a button to view the result.

Key functions: `runAIInBackground(opts)`, `aiFloatShow()`, `aiFloatComplete()`, `aiFloatError()`

### Library System
The library (`loadLibrary`) aggregates content from two Firestore collections:
- `user_sakag` — User-generated geographic surveys
- `commander_tools` — Morak, lesson, trivia content

Features:
- In-memory cache with 1-minute TTL (`_libCache`, `_libCacheTime`)
- Parallel Firestore queries for both collections
- Map view showing sakag items on a Leaflet map
- Filter by content type (sakag, morak, lesson, trivia)
- Loading spinner while fetching
- Cache invalidation after every save/delete (`_libCache = null`)

**Important**: `orderBy('createdAt', 'desc')` was intentionally removed because it requires a Firestore composite index. Without the index, queries silently fail and return 0 items.

### Firebase Authentication
- **No traditional auth** — the app uses custom password auth against the `users` Firestore collection
- **Firebase Anonymous Auth** is used ONLY to satisfy Firestore security rules (`request.auth != null`)
- Anonymous auth is called on app init and before every Firestore write operation
- The auth SDK is loaded from: `firebase-auth-compat.js`

### Firestore Offline Recovery
`setupFirestoreRecovery()` handles network interruptions:
- Listens for browser `online` event → calls `db.enableNetwork()`
- Periodic check (every 30s) — if navigator reports online but Firestore is stuck offline, forces `disableNetwork()` then `enableNetwork()`
- Re-authenticates anonymously after reconnection

### Service Worker (sw.js)
**CRITICAL**: The SW must NEVER intercept API calls. The fetch handler uses bare `return;` (no `event.respondWith()`) for all external domains:
- firestore, firebase, googleapis, identitytoolkit, securetoken
- google.com, gstatic.com, generativelanguage
- anthropic, cloudflare, nominatim, openstreetmap, unpkg.com, cdnjs.cloudflare.com

For local assets:
- **HTML/navigation**: Network-first with cache fallback
- **Static assets (CSS, JS, images)**: Stale-while-revalidate

After deploying changes, bump the cache version constant (currently `ruach-v20`) to invalidate old caches.

## Firebase Collections
- `users` — User profiles, roles, permissions
- `user_sakag` — Geographic surveys created by users (with lat/lng for map)
- `commander_tools` — Morak, lesson, trivia content (type field distinguishes them)
- `config/ai` — AI configuration (API keys, etc.)
- `participants` — Training participants
- `training-content` — Training materials per program
- `hebrew-progress` — Hebrew learning progress tracking
- `commitments` — Learning commitment board entries
- `feedback` — Feedback submissions

## Role Hierarchy
Roles from highest to lowest: `super_admin` → `admin` → `mashak_hativa` → `mashak_gdud` → `rasar` → `mefaked_pluga` → `samal_pluga` → `mashak_pluga` → `officer` → `nco` → `nco_student` → `soldier` → `guest` → `parent`

## Map Quiz Content Guidelines (מבחני מפה)

### Questions
- Questions must **tell the story** of each point — NOT generic "what is the point on the map" questions
- Good: "המקום בו התקיים הקרב הראשון של שאול המלך"
- Bad: "מה הנקודה המופיעה במפה?"
- The `expansion` field must contain the **full content** from the original PDF source

### Quiz Data Structure
Each quiz uses EITHER `num` or `id` for location identification — check which before editing. The filter code handles both via `locKey`:
```javascript
var locKey = loc.num !== undefined ? loc.num : loc.id;
```

### Arrows/Routes
- Must be geographically accurate — verify coordinates
- Arrow direction = actual military movement direction
- Each numbered point on source PDF should have a corresponding arrow

## Critical Warnings

### ⚠️ File Size
`index.html` is ~23,200 lines. Use search-and-replace for edits, not full-file replacement.

### ⚠️ No Build System
No bundler or minifier. All changes are live immediately after committing to `main`.

### ⚠️ Service Worker — NEVER Intercept APIs
The SW MUST use bare `return;` for all API domains. Using `event.respondWith(fetch())` for Firebase causes "client is offline" errors that break all Firestore operations.

### ⚠️ Firestore Indexes
Do NOT add `orderBy()` to Firestore queries unless the corresponding composite index exists. Queries with missing indexes fail silently in catch blocks, returning 0 results.

### ⚠️ Anonymous Auth Required
Firebase Anonymous Authentication must be enabled in Firebase Console → Authentication → Sign-in method → Anonymous. Without it, all Firestore operations fail due to security rules.

### ⚠️ Security Measures
Anti-devtools detection (debugger-based timing check) triggers when using browser DevTools on the live site.

## CSS Color Scheme
The app uses a teal/turquoise theme (NOT military green). Key variables:
- `--primary: #0C4A6E` (dark teal)
- `--primary-light: #0E7490` (medium teal)
- `--primary-lighter: #06B6D4` (bright cyan)
- `--accent: #D4A843` (gold — used for library tile and special elements)
- `--bg: #F0F9FF` (light blue background)

## Deployment
1. Commit changes to `main` branch
2. GitHub Pages auto-deploys from `main`
3. Custom domain: `hamatzpen.io` (configured via `CNAME` file)
4. Bump SW cache version in `sw.js` for breaking changes

## Repository
- **Organization**: ruach-hashmonaim
- **Repo**: ruach-hashmonait
- **URL**: https://github.com/ruach-hashmonaim/ruach-hashmonait
- **Live site**: https://hamatzpen.io
