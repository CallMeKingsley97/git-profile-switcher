import { create } from "zustand";
import { api } from "@/lib/tauri";
import type { Profile } from "@/types";

interface ProfileState {
  profiles: Profile[];
  activeProfile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  create: (p: Profile) => Promise<Profile>;
  update: (id: string, p: Profile) => Promise<Profile>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Profile>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [],
  activeProfile: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const [profiles, active] = await Promise.all([
        api.listProfiles(),
        api.getActiveProfile(),
      ]);
      set({ profiles, activeProfile: active, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  create: async (p) => {
    const created = await api.createProfile(p);
    set((s) => ({ profiles: [...s.profiles, created] }));
    return created;
  },
  update: async (id, p) => {
    const updated = await api.updateProfile(id, p);
    set((s) => ({
      profiles: s.profiles.map((x) => (x.id === id ? updated : x)),
      activeProfile:
        s.activeProfile?.id === id ? updated : s.activeProfile,
    }));
    return updated;
  },
  remove: async (id) => {
    await api.deleteProfile(id);
    set((s) => ({
      profiles: s.profiles.filter((p) => p.id !== id),
      activeProfile:
        s.activeProfile?.id === id ? null : s.activeProfile,
    }));
  },
  duplicate: async (id) => {
    const copy = await api.duplicateProfile(id);
    set((s) => ({ profiles: [...s.profiles, copy] }));
    return copy;
  },
}));
