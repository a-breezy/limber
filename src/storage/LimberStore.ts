import type { CheckIn, SessionRecord, UserProfile } from '../domain/types';

/**
 * Every read/write in the app goes through this interface.
 * v1: LocalStore (IndexedDB on the device).
 * v2: a RemoteStore (e.g. Supabase) or a syncing wrapper can implement the
 * same contract without touching UI code.
 */
export interface LimberStore {
  getProfile(): Promise<UserProfile | undefined>;
  saveProfile(profile: UserProfile): Promise<void>;

  saveSession(session: SessionRecord): Promise<void>;
  listSessions(): Promise<SessionRecord[]>;

  addCheckIn(checkIn: CheckIn): Promise<void>;
  listCheckIns(): Promise<CheckIn[]>;

  /** Export everything (for "download my data"). */
  exportAll(): Promise<{ profile?: UserProfile; sessions: SessionRecord[]; checkIns: CheckIn[] }>;
  /** Delete everything (for "delete my data"). */
  clearAll(): Promise<void>;
}
