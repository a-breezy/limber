/**
 * Conditions that mean an exercise should be skipped or swapped for an easier
 * version. Onboarding answers map onto these tags; the routine engine filters
 * on them. Tagging is deliberately conservative: when in doubt, tag it.
 *
 * This is general awareness, not medical guidance.
 */
export const CONTRAINDICATIONS = {
  flexionSensitiveBack: {
    label: 'Back pain that gets worse bending forward',
    note: 'Deep forward bending or rounding of the low back may aggravate symptoms.',
  },
  extensionSensitiveBack: {
    label: 'Back pain that gets worse arching backward',
    note: 'Backbends and arching the low back may aggravate symptoms.',
  },
  radiatingLegPain: {
    label: 'Pain, tingling or numbness running down a leg',
    note: 'Nerve-tensioning stretches can irritate symptoms; see a professional.',
  },
  kneePain: {
    label: 'Knee pain or recent knee injury',
    note: 'Deep knee bending or kneeling may be uncomfortable or unsafe.',
  },
  wristPain: {
    label: 'Wrist pain',
    note: 'Weight-bearing on the hands (all fours) may aggravate symptoms.',
  },
  shoulderInjury: {
    label: 'Shoulder injury, dislocation or recent surgery',
    note: 'Overhead and end-range shoulder positions should be avoided until cleared.',
  },
  hipReplacement: {
    label: 'Hip replacement',
    note: 'Deep hip bending, crossing the legs and inward rotation may be restricted.',
  },
  osteoporosis: {
    label: 'Osteoporosis or low bone density',
    note: 'Loaded spinal rounding and twisting should be avoided.',
  },
  pregnancy: {
    label: 'Pregnancy',
    note: 'Lying face-down, long periods flat on the back, and deep twists need modification.',
  },
} as const;

export type Contraindication = keyof typeof CONTRAINDICATIONS;
export const CONTRAINDICATION_IDS = Object.keys(CONTRAINDICATIONS) as Contraindication[];
