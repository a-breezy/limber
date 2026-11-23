import { LocalStore } from './LocalStore';
import type { LimberStore } from './LimberStore';

export type { LimberStore };

/** The app-wide store. Swap the implementation here when sync arrives. */
export const store: LimberStore = new LocalStore();
