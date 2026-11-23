# Limber: Game Plan

How we go from an empty folder to an app you use every day, built so it can grow past one user.

---

## 1. Guiding principles

1. **Ship something usable fast.** By the end of Phase 5 you should be stretching with the app, even if the animations are rough placeholders.
2. **Content is data, not code.** Exercises, cues, and rules live in structured data files. Adding a stretch means adding a data entry, not building a screen.
3. **Local-first, sync-ready.** Version 1 stores everything on your phone (no accounts, no server). All data access goes through one storage interface, so adding a cloud backend later only means adding a new implementation.
4. **Safety before features.** Red-flag screening, contraindications, and "this hurts → easier option" are core features, not extras.
5. **Rules first, AI later.** A transparent rule-based routine engine is predictable, testable, and safe. An LLM coach can sit on top of it later, but it doesn't replace it.
6. **Mobile ergonomics.** You'll use this on a floor mat with the phone a few feet away: big text, big buttons, audio and voice cues, screen kept awake.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     UI (React + Tailwind)                │
│  Onboarding · Today · Session Player · Progress · Settings│
└──────────────┬───────────────────────────┬───────────────┘
               │                           │
     ┌─────────▼─────────┐       ┌─────────▼──────────┐
     │  App state         │       │  Routine Engine     │
     │  (Zustand stores)  │──────▶│  (pure TS functions)│
     └─────────┬─────────┘       └─────────┬──────────┘
               │                           │ reads
     ┌─────────▼─────────┐       ┌─────────▼──────────┐
     │ Storage interface  │       │ Exercise Library    │
     │  ├ LocalStore (v1) │       │ (typed data + Zod)  │
     │  └ RemoteStore (v2)│       └─────────┬──────────┘
     └───────────────────┘                 │ refs
                                 ┌─────────▼──────────┐
                                 │ Animation assets    │
                                 │ (SVG → Lottie/Rive) │
                                 └────────────────────┘
```

### Tech choices and why

| Concern       | Choice                                                    | Why                                                                                   |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Framework     | **React + TypeScript + Vite**                             | Huge ecosystem, fast dev loop, types keep the data model honest                       |
| Styling       | **Tailwind CSS**                                          | Fast mobile-first UI and consistent design tokens                                     |
| State         | **Zustand**                                               | Small and simple; easy to persist                                                     |
| Local DB      | **IndexedDB via Dexie**                                   | Stores structured history on the device and works offline                             |
| Validation    | **Zod**                                                   | Validates exercise data and user input; shares types                                  |
| PWA           | **vite-plugin-pwa**                                       | Installable, offline, home-screen icon                                                |
| Animations    | **Joint-angle mannequin rig in SVG** (later: three.js 3D) | Poses are data, limbs can't break apart, one rig covers every exercise; see section 5 |
| Audio         | **Web Audio API beeps** (voice later)                     | No asset files, works offline, precise timing                                         |
| Testing       | **Vitest + React Testing Library** (+ Playwright later)   | The routine engine especially needs strong unit tests                                 |
| Hosting       | **Vercel / Netlify / Cloudflare Pages**                   | Free tier, HTTPS (required for PWA and wake lock), preview deploys                    |
| Scale (later) | **Supabase**                                              | Postgres + auth + row-level security; easy to adopt from local-first                  |

### Folder layout (planned)

```
src/
  app/            # routing, layout, providers
  features/
    onboarding/
    today/
    session/      # guided player
    progress/
    settings/
  engine/         # routine generator (pure functions + tests)
  content/
    exercises/    # one file per exercise or per body area
    bodyAreas.ts
  storage/        # Storage interface + Dexie implementation
  components/     # shared UI (BodyMap, Timer, Button…)
  animation/      # skeleton, forward kinematics, tweening, renderer, /poses gallery
  lib/            # utils (speech, haptics, wakeLock)
```

---

## 3. Core data model (first draft)

```ts
type BodyArea =
  | 'neck'
  | 'upperBack'
  | 'shoulders'
  | 'chest'
  | 'lowBack'
  | 'hips'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'knees'
  | 'calves'
  | 'ankles'
  | 'wrists';

interface PainPoint {
  area: BodyArea;
  side?: 'left' | 'right' | 'both';
  intensity: number; // 0–10
  duration: 'acute' | 'chronic'; // < 6 weeks vs longer
  triggers: string[]; // 'sitting', 'morning', 'after running'…
}

interface UserProfile {
  painPoints: PainPoint[];
  redFlags: string[]; // drive restrictions / referrals
  lifestyle: {
    work: 'desk' | 'standing' | 'active' | 'mixed';
    sittingHours: number;
    activityLevel: 1 | 2 | 3 | 4 | 5;
    sports: string[];
  };
  mobility: Record<string, 'limited' | 'average' | 'good'>; // self-test results
  schedule: { daysPerWeek: number; minutesPerSession: 10 | 15 | 20 | 25; preferredTime?: string };
  equipment: ('mat' | 'blocks' | 'foamRoller' | 'band' | 'wall')[];
}

interface Exercise {
  id: string;
  name: string;
  targets: { area: BodyArea; role: 'primary' | 'secondary' }[];
  phase: 'warmup' | 'mobilize' | 'stretch' | 'activate' | 'breathe';
  discipline: 'trainer' | 'yoga' | 'mobility';
  difficulty: 1 | 2 | 3;
  equipment: string[];
  dosage: { type: 'hold' | 'reps'; seconds?: number; reps?: number; perSide: boolean };
  position: 'standing' | 'seated' | 'floor' | 'kneeling';
  steps: string[];
  cues: string[];
  mistakes: string[];
  breath?: string;
  contraindications: string[];
  regressionId?: string;
  progressionId?: string;
  animation: {
    keyframes: { pose: Pose; holdMs: number; transitionMs: number }[];
    mirrorForLeft: boolean;
    camera: 'side' | 'front' | 'threeQuarter';
  };
  sources: string[]; // where the exercise/dosage comes from
}

type Joint =
  | 'pelvisTilt'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'shoulderL'
  | 'elbowL'
  | 'shoulderR'
  | 'elbowR'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'hipR'
  | 'kneeR'
  | 'ankleR';
type Pose = { root: { x: number; y: number; rotation: number } } & Partial<Record<Joint, number>>;
```

Sessions, check-ins, and history are their own records keyed by date, so trends are easy to chart and sync later.

---

## 4. Routine engine logic (v1, rule-based)

1. **Pick focus areas**: today's selection, or the user's top pain points weighted by intensity.
2. **Filter the library**: remove exercises that need missing equipment, are too hard for the user's mobility level, or match a contraindication or red flag.
3. **Score candidates**: primary target match > secondary match; boost exercises tied to lifestyle (desk worker → hip flexors, thoracic spine, neck); slight penalty for recently used exercises (variety).
4. **Fill the session template** within the time budget:
   - Warm-up / mobilize (~25%): gentle joint circles, cat-cow…
   - Stretch / release (~40%): targeted holds
   - Activate / strengthen (~25%): glute bridges, band pull-aparts, dead bugs…
   - Cool-down / breathe (~10%): child's pose, box breathing
5. **Order for flow**: minimize position changes (standing → kneeling → floor).
6. **Adapt over time**: check-in scores adjust difficulty and dosage on the next session.

This is all pure functions, which makes it straightforward to unit-test against sample profiles.

---

## 5. Animations strategy

This is the riskiest part of the project: both realistic and stick-figure animations have failed for you before. The usual cause is that each frame gets **drawn by hand** (hand-written SVG paths, or AI-generated images or frames). Limbs then detach, bend the wrong way, change length between frames, or don't match the exercise. Nothing guarantees that the body holds together.

### The fix: a rigged mannequin driven by joint angles

Instead of drawing frames, we build **one body** and pose it with numbers.

1. **Skeleton:** a fixed hierarchy of bones (pelvis → spine → chest → neck → head; shoulder → upper arm → forearm → hand; hip → thigh → shin → foot) with fixed bone lengths.
2. **Pose = joint angles.** A pose is data such as `{ hipL: 95, kneeL: 170, spine: -20, … }`. Positions come from forward kinematics (pure math), so **limbs can't detach or stretch**.
3. **Body shapes on the bones:** each body part is drawn as a tapered, shaded capsule (an artist's-mannequin look), not a line. This sits between a stick figure and realistic, and it's cheap to render.
4. **Keyframes + tweening:** each exercise has 2–4 keyframe poses with timing and easing. The renderer blends between them at 60 fps and can mirror the figure for left and right sides.
5. **Guardrails:** joint-limit clamping (no backward knees), a floor constraint (nothing goes through the floor), and a unit test that checks every exercise's poses.
6. **Visual verification:** a dev-only `/poses` gallery renders every exercise. I screenshot it in the browser to check each animation before it ships, so problems get caught before you ever see them.

### Path to "more realistic"

The pose data is **independent of the renderer**, so the same joint angles can later drive:

- **Stage 2, 3D mannequin:** three.js with an openly licensed (CC0) rigged humanoid in `.glb` format. The same keyframes map onto its bones, giving real lighting and depth.
- **Stage 3, pre-rendered video loops (fallback):** if real-time 3D struggles on phones, render each exercise to a short looping WebM/MP4 offline. Video plays reliably everywhere.
- **Stage 4, camera form feedback:** on-device pose estimation (MediaPipe) compares your joint angles to the exercise's target angles. This reuses the same data model and answers "am I doing it right?"

**Order of work:** the mannequin is built as an early **spike in Phase 2**, before onboarding. If it isn't convincing, we find out on day 2, not week 6.

---

## 6. Phases and milestones

| Phase                        | Outcome                                                                                                  | Milestone you can feel                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0. Plan                      | Docs, decisions, open questions answered                                                                 | You approve the plan                                    |
| 1. Foundation                | Scaffolded PWA deployed to a URL                                                                         | App opens on your phone and installs to the home screen |
| 2. Animation spike + content | Rigged mannequin animating 3 exercises; then a typed library (~30 moves for low back, thighs, shoulders) | You see a convincing animated cat-cow on your phone     |
| 3. Onboarding                | Full questionnaire + saved profile                                                                       | App "knows" you                                         |
| 4. Engine                    | Routine generator + tests                                                                                | App suggests a sensible routine for your pain points    |
| 5. Player                    | Guided session with timers, cues, audio                                                                  | **You do your first real session (MVP)**                |
| 6. Animations                | Keyframes for every exercise; evaluate 3D mannequin                                                      | Every movement clearly demonstrated                     |
| 7. Progress                  | History, trends, reminders, adaptation                                                                   | It becomes a habit                                      |
| 8. Polish                    | Accessibility, cross-device testing, offline                                                             | Feels like a real app                                   |
| 9. Scale                     | Accounts, sync, CMS, AI coach, pose feedback                                                             | Ready for other users                                   |

**MVP = Phases 1–5**, with mannequin animations for the exercises used in the MVP.

---

## 7. Risks and how we handle them

| Risk                                               | Mitigation                                                                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unsafe advice for real injuries                    | Red-flag screen, contraindication filters, "this hurts" swap, clear disclaimers, conservative well-established exercises with sources (no expert reviewer yet) |
| Animations don't render properly (happened before) | Joint-angle rig instead of hand-drawn frames; joint limits + floor constraint; pose tests; screenshot gallery check; spike early in Phase 2                    |
| iOS PWA limits (notifications, wake lock)          | Feature detection and fallbacks; consider a Capacitor wrapper later                                                                                            |
| Content quality                                    | Structured schema forces cues, mistakes, and contraindications for every exercise                                                                              |
| Health data privacy                                | Local-only in v1; data export and delete; proper policy before multi-user                                                                                      |

---

## 8. Decisions (answered 2026-11-22)

| Question       | Decision                                                        | What it changes                                                                                                                                          |
| -------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name and vibe  | **Limber**, **energetic**                                       | Bold, saturated color; punchy type; upbeat, motivating copy ("Let's loosen up those hips"); snappy transitions                                           |
| Starting areas | **Low back, thighs, shoulders**                                 | The first exercise batch covers only these. "Thighs" is split into quads, hamstrings, hip flexors, inner thigh (adductors) and outer thigh / IT band     |
| Session length | **10–25 min**                                                   | `minutesPerSession: 10 \| 15 \| 20 \| 25`. A 5-minute Quick Fix stays as a separate mode                                                                 |
| Equipment      | **Mat, blocks, foam roller, band**                              | Library uses these plus bodyweight and a wall. Blocks give easier versions of floor stretches; the roller adds a "release" category                      |
| Animation      | **Leaning realistic, but past attempts didn't render properly** | Animation approach reworked; see section 5                                                                                                               |
| Voice          | **Beeps now, spoken guidance later**                            | Web Audio beeps in the MVP; Web Speech voice moves to Phase 9                                                                                            |
| Expert review  | **Not available for now**                                       | Stick to well-established, conservative exercises; gentle default dosages; "stop on sharp pain" built into every session; note sources for each exercise |
| Audience       | **Personal tool, possible public portfolio release**            | Local-only to start. Keep the repo portfolio-quality: clean commits, tests, a public demo URL, and only openly licensed assets (no ripped models or art) |
