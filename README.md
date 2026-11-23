# Limber _(working title)_

A mobile-first web app that builds personalized stretching and mobility routines around what hurts, and walks you through each movement step by step with simple animations.

> **Not medical advice.** Limber is a wellness tool, not a substitute for a doctor or physical therapist. The app screens for warning signs and tells people to seek care when needed.

---

## The problem

- You want to stretch and feel better, but you forget which stretches to do.
- You don't know which movements target the place that actually hurts (low back, neck, hips, shoulders…).
- You're not sure you're doing them right, so you either skip them or do them badly.

## The solution

Tell Limber where it hurts and how you live. It builds a short routine for you, then coaches you through it one movement at a time: an animation of the movement, a timer, breathing cues, form tips and common mistakes.

The coaching voice blends three disciplines:

| Discipline           | What it adds                                                                       |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Personal trainer** | Structure, progression, strength to support problem areas, accountability          |
| **Yoga instructor**  | Breath, body awareness, calm pacing, holds                                         |
| **Mobility coach**   | Joint-by-joint range of motion, controlled articular rotations, active flexibility |

---

## Core features

### 1. Onboarding: getting to know the user

A short, upbeat questionnaire (about 2–3 minutes) covering:

- **Pain and tension map**: tap areas on a body diagram, then rate intensity (0–10), say whether it's acute or chronic, and when it flares (morning, after sitting, after exercise…).
- **Safety screen**: red-flag questions (numbness, recent injury, pain at night, and so on). Answers that need professional care get a clear "see a professional" message, and the app adjusts or blocks routines.
- **Lifestyle**: desk job or on your feet, hours spent sitting, activity level, sports and hobbies, sleep.
- **Mobility self-check**: simple self-tests (touch your toes, deep squat, reach behind your back, neck rotation) to find a starting level.
- **Goals and schedule**: how often (days per week), how long per session (10–25 min), preferred time of day, available equipment (mat, blocks, foam roller, band).

### 2. Routine generator

- Builds a routine from the user's profile and the areas they pick today.
- Follows a sound session shape: **warm-up / mobilize → stretch / release → activate / strengthen → cool-down / breathe**.
- Respects time limits, equipment, mobility level, and contraindications.
- Has a "quick fix" mode: _"my neck hurts right now, give me 5 minutes."_

### 3. Guided session player

- One exercise per screen with a looping animation of the movement.
- Countdown timers, rep counters, "switch sides" prompts, breathing cues.
- Form cues ("keep your ribs down") and common mistakes ("don't arch your low back").
- Audio beeps and haptics so you don't have to look at the phone (spoken voice guidance is planned).
- Can pause, skip, or swap an exercise ("this hurts" → easier alternative).

### 4. Progress and adaptation

- After a session: quick check-in ("How does your back feel now?").
- Tracks pain trends, streaks, and consistency against the user's goal.
- Routines progress as pain drops and mobility improves, and back off when something flares.
- Reminders at the user's chosen time.

---

## Platform and tech direction

- **Mobile web first**: a Progressive Web App (PWA) you can install to your home screen, with offline support.
- **Start with one user, built to scale**: data stays on the device to begin with, behind a storage layer that can later sync to a backend with accounts.
- Proposed stack (details in [gameplan.md](gameplan.md)):
  - React + TypeScript + Vite
  - Tailwind CSS
  - IndexedDB (via Dexie) for local data
  - Exercise library as structured, versioned data (JSON/TS) rather than hard-coded screens
  - A rigged mannequin animated from joint-angle keyframes in SVG (later: a 3D mannequin in three.js)
  - Web Audio beeps for timing cues (spoken guidance later)
  - Later: Supabase (auth, Postgres, sync), push notifications, analytics

## MVP scope

- **Vibe:** energetic: bold color, upbeat coaching copy, snappy motion
- **Body areas:** low back, thighs (quads, hamstrings, hip flexors, inner and outer thigh), shoulders
- **Sessions:** 10–25 minutes, plus a 5-minute Quick Fix
- **Equipment:** mat, yoga blocks, foam roller, resistance band (plus wall and bodyweight)
- **Audience:** personal use first, built to portfolio quality for a possible public release

---

## Project docs

- [todo.md](todo.md): the full task checklist
- [gameplan.md](gameplan.md): architecture, phases, and how we'll build it

## Getting started

Requires Node 20+.

```bash
npm install
npm run dev        # dev server (also reachable from your phone on the same Wi-Fi)
```

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run build      # type-check + production build with service worker
npm run lint       # ESLint
npm run format     # Prettier
```

### Project layout

```
src/
  app/        routing, layout, app-wide state
  features/   screens (today, progress, settings; later onboarding and session)
  domain/     core types (UserProfile, SessionRecord, CheckIn…)
  storage/    LimberStore interface + IndexedDB implementation
  engine/     routine generator (Phase 4)
  content/    exercise library (Phase 2b)
  animation/  mannequin rig + renderer (Phase 2a)
```
