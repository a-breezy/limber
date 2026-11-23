/**
 * Sources behind the exercise library. With no expert reviewer yet, every
 * exercise cites at least one of these for its technique or dosage, and the
 * library sticks to widely taught, conservative movements.
 *
 * `supports` says what we rely on each source for, so claims stay traceable.
 */
export const REFERENCES = {
  acsm: {
    citation:
      "American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription, 11th ed. Wolters Kluwer, 2021.",
    supports:
      'Static stretch dosage (hold about 10–30 s, repeat 2–4 times) and general flexibility training guidance.',
  },
  mcgill: {
    citation: 'McGill, S. Back Mechanic. Backfitpro Inc., 2015.',
    supports:
      'Low-back friendly movement: cat-camel as gentle motion (not a forced stretch), bird dog, bracing, and avoiding aggressive spinal flexion when sensitive.',
  },
  foamRolling: {
    citation:
      'Wiewelhove, T. et al. A Meta-Analysis of the Effects of Foam Rolling on Performance and Recovery. Frontiers in Physiology 10:376, 2019.',
    supports:
      'Foam rolling as a short-term aid for flexibility and perceived soreness, not a structural fix.',
  },
  scapular: {
    citation:
      'Cools, A. M. et al. Rehabilitation of scapular muscle balance: which exercises to prescribe? American Journal of Sports Medicine 35(10), 2007.',
    supports:
      'Scapular retraction and external-rotation exercises (e.g. side-lying external rotation, horizontal abduction) for shoulder balance.',
  },
  yoga: {
    citation: 'Common hatha and restorative yoga practice (widely taught postures).',
    supports:
      'Posture names and setups for child’s pose, sphinx, supine twist, butterfly and similar; props (blocks) for support; slow diaphragmatic (belly) breathing.',
  },
} as const;

export type ReferenceId = keyof typeof REFERENCES;
export const REFERENCE_IDS = Object.keys(REFERENCES) as ReferenceId[];
