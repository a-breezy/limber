import Dexie, { type EntityTable } from 'dexie';
import type { CheckIn, SessionRecord, UserProfile } from '../domain/types';
import type { LimberStore } from './LimberStore';

class LimberDB extends Dexie {
  profiles!: EntityTable<UserProfile, 'id'>;
  sessions!: EntityTable<SessionRecord, 'id'>;
  checkIns!: EntityTable<CheckIn, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      profiles: 'id',
      sessions: 'id, startedAt',
      checkIns: 'id, at, area, sessionId',
    });
  }
}

/** Single-user, on-device storage backed by IndexedDB. */
export class LocalStore implements LimberStore {
  private db: LimberDB;

  constructor(dbName = 'limber') {
    this.db = new LimberDB(dbName);
  }

  async getProfile() {
    return this.db.profiles.toCollection().first();
  }

  async saveProfile(profile: UserProfile) {
    await this.db.profiles.put(profile);
  }

  async saveSession(session: SessionRecord) {
    await this.db.sessions.put(session);
  }

  async listSessions() {
    return this.db.sessions.orderBy('startedAt').reverse().toArray();
  }

  async addCheckIn(checkIn: CheckIn) {
    await this.db.checkIns.put(checkIn);
  }

  async listCheckIns() {
    return this.db.checkIns.orderBy('at').toArray();
  }

  async exportAll() {
    const [profile, sessions, checkIns] = await Promise.all([
      this.getProfile(),
      this.db.sessions.toArray(),
      this.db.checkIns.toArray(),
    ]);
    return { profile, sessions, checkIns };
  }

  async clearAll() {
    await Promise.all([
      this.db.profiles.clear(),
      this.db.sessions.clear(),
      this.db.checkIns.clear(),
    ]);
  }
}
