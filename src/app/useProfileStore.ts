import { create } from 'zustand';
import type { UserProfile } from '../domain/types';
import { store } from '../storage';

interface ProfileState {
  status: 'idle' | 'loading' | 'ready';
  profile?: UserProfile;
  load: () => Promise<void>;
  save: (profile: UserProfile) => Promise<void>;
  reset: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  status: 'idle',
  profile: undefined,
  load: async () => {
    set({ status: 'loading' });
    const profile = await store.getProfile();
    set({ profile, status: 'ready' });
  },
  save: async (profile) => {
    const stamped = { ...profile, updatedAt: new Date().toISOString() };
    await store.saveProfile(stamped);
    set({ profile: stamped });
  },
  reset: async () => {
    await store.clearAll();
    set({ profile: undefined });
  },
}));
