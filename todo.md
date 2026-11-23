# Limber — To-Do

Check items off by changing `- [ ]` to `- [x]`. Phases match [gameplan.md](gameplan.md).

---

## Phase 0: Planning and decisions

- [x] Write README.md
- [x] Write todo.md
- [x] Write gameplan.md
- [x] Answer the open questions in gameplan.md (name, branding, animation style, voice)
- [x] Settle the MVP scope: low back, thighs, shoulders; 10–25 min sessions; mat, blocks, roller, band
- [x] Rework the animation strategy (joint-angle mannequin rig)
- [x] Fix the local Node.js install (upgraded Homebrew Node to 26)
- [ ] Write the safety and disclaimer copy, plus the red-flag screening questions
- [ ] Choose a hosting target (Vercel / Netlify / Cloudflare Pages)

## Phase 1: Project foundation

- [x] `git init`, .gitignore, initial commit
- [x] Scaffold Vite + React + TypeScript
- [x] Add Tailwind CSS and design tokens (colors, type, spacing, light/dark)
- [x] Add ESLint + Prettier
- [x] Add Vitest + React Testing Library
- [x] Add routing (React Router) with the app shell and bottom nav
- [x] PWA setup (vite-plugin-pwa): manifest, icons, offline caching
- [x] Storage layer interface plus IndexedDB (Dexie) implementation
- [x] State management (Zustand) wired to storage
- [ ] Deploy a preview build and test on a real phone

## Phase 2a: Animation spike (do first; this is the riskiest part)

- [x] Skeleton definition: bone hierarchy and lengths
- [x] Forward kinematics: joint angles → joint positions (pure function + tests)
- [x] Joint-limit clamping and a floor constraint
- [x] Two-bone IK for planted hands/feet and hand-holds-ankle (bend direction fixed by pole, so no backward elbows or knees)
- [x] `validateClip` guardrail: joint limits, floor penetration, reach, bone lengths (runs in tests and on the gallery)
- [x] SVG mannequin renderer: tapered, shaded capsule body parts, depth order for near and far limbs
- [x] Keyframe tweening with easing, looping, and left/right mirroring
- [x] Animate 3 test exercises: cat-cow (low back), standing quad stretch (thighs), band pull-apart (shoulders)
- [x] Dev `/poses` gallery page; screenshot-verify on a mobile viewport
- [x] **Go / no-go review with you**: is the mannequin convincing enough? (go, 2026-11-23)

## Phase 2b: Data model and exercise library

- [x] Define TypeScript types: `UserProfile`, `PainPoint`, `Exercise`, `Pose`, `Routine`, `Session`, `CheckIn` (`Routine` comes with the engine in Phase 4)
- [x] Define the body-area taxonomy (MVP: low back; thighs → quads, hamstrings, hip flexors, adductors, IT band/outer thigh; shoulders) plus secondary targets (glutes, upper back, core, chest)
- [x] Define the exercise schema (Zod): targets, phase (warm-up/mobilize/release/stretch/activate/breathe), difficulty, position, equipment, dosage, cues, mistakes, breath, contraindication tags, regressions/progressions, animation link, sources, review status
- [x] Write 33 exercises for low back, thighs and shoulders using mat, blocks, roller, band, wall
- [x] Self-review the content against cited sources, with conservative dosages (no expert reviewer yet; every exercise marked `self-reviewed`)
- [x] Content tests: schema, unique ids, valid links, area/phase coverage, linked animations pass guardrails
- [x] Dev `/dev/exercises` library browser
- [ ] Animate the remaining 30 exercises (tracked in Phase 6; needs supine, prone, side-lying poses and roller/block props)

## Phase 3: Onboarding

- [ ] Welcome screen plus disclaimer acceptance
- [ ] Tappable body map (front/back SVG) to select pain areas
- [ ] Per-area details: intensity 0–10, acute vs chronic, triggers, time of day
- [ ] Red-flag safety screen, with "see a professional" handling
- [ ] Lifestyle questions (work type, sitting hours, activity, sports, sleep)
- [ ] Mobility self-assessment (4–6 guided self-tests)
- [ ] Goals and schedule (days per week, session length, time of day, equipment)
- [ ] Profile summary screen ("Here's what we heard")
- [ ] Save the profile; allow editing it later from Settings
- [ ] Progress indicator plus back/skip on every step

## Phase 4: Routine engine

- [ ] Rule-based generator: profile + today's focus → ordered routine
- [ ] Session structure: warm-up → stretch/release → activate → cool-down/breath
- [ ] Filters: equipment, difficulty, contraindications, red-flag restrictions
- [ ] Time budgeting to fit 10 / 15 / 20 / 25 minute sessions
- [ ] Variety (avoid repeating the same routine every day)
- [ ] Quick Fix mode (one area, 5 minutes)
- [ ] Weekly plan built from the user's chosen frequency
- [ ] Unit tests for the generator (each profile type gives a safe, sensible routine)

## Phase 5: Guided session player

- [ ] Routine preview screen (list, total time, start button)
- [ ] Exercise screen: animation, name, timer/reps, cues
- [ ] Countdown, rep counter, "switch sides" transitions, rest periods
- [ ] Breathing cue overlay (inhale/exhale pacing)
- [ ] Pause / skip / back / swap ("too hard", "this hurts" → regression)
- [ ] Screen Wake Lock so the phone doesn't sleep mid-session
- [ ] Audio beeps (Web Audio API): countdown, switch sides, done; plus haptics (Vibration API)
- [ ] Session complete screen plus post-session check-in

## Phase 6: Animations

- [ ] Keyframes for every exercise in the library
- [ ] Equipment props in the renderer (mat, block, roller, band)
- [ ] Camera angles (side / front / three-quarter) per exercise
- [ ] Respect `prefers-reduced-motion` (show static key poses instead)
- [ ] Evaluate the 3D mannequin (three.js + a CC0 rigged `.glb`) driven by the same pose data
- [ ] Fallback option: pre-rendered WebM/MP4 loops if 3D is too heavy on phones

## Phase 7: Progress and habit

- [ ] Home / Today screen: today's routine, streak, quick-fix buttons
- [ ] Session history
- [ ] Pain trend chart per body area
- [ ] Adaptation: progress routines when pain drops, regress them on flare-ups
- [ ] Reminders (notifications where supported; calendar export as a fallback)
- [ ] Re-assessment prompt every 2–4 weeks

## Phase 8: Polish and quality

- [ ] Accessibility pass (contrast, focus, screen-reader labels, large tap targets)
- [ ] Test on iOS Safari and Android Chrome
- [ ] Lighthouse: performance, PWA, accessibility scores
- [ ] Empty, error, and offline states
- [ ] Export and delete my data

## Phase 9: Scale (post-MVP)

- [ ] Spoken voice guidance (Web Speech API, later higher-quality TTS)
- [ ] Expand body areas (neck, upper back, hips, knees, ankles, wrists)
- [ ] Expert review of the exercise content (PT or certified trainer)
- [ ] Portfolio polish: case-study README, screenshots/GIFs, public demo URL
- [ ] Backend (Supabase): auth, Postgres, row-level security
- [ ] Sync the local storage layer to the backend
- [ ] Move the exercise library to a CMS or database with versioning
- [ ] Privacy policy and terms; review the health-data handling
- [ ] Privacy-respecting analytics
- [ ] Optional AI coach: an LLM that explains, personalizes, and answers "is this normal?" with guardrails
- [ ] Optional camera-based form feedback (pose estimation, e.g. MediaPipe)
- [ ] Optional native wrapper (Capacitor) for app stores
