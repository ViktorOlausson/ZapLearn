import { create } from "zustand";

import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type StoragePersistenceStatus,
} from "@/lib/persistentStorage";

type StoragePersistenceState = {
  status: StoragePersistenceStatus;
  requesting: boolean;
  check: () => Promise<void>;
  request: () => Promise<void>;
};

export const useStoragePersistenceStore = create<StoragePersistenceState>(
  (set, get) => ({
    status: "checking",
    requesting: false,
    async check() {
      set({ status: await getPersistentStorageStatus() });
    },
    async request() {
      if (get().requesting || get().status === "persistent") return;
      set({ requesting: true });
      const status = await requestPersistentStorage();
      set({ status, requesting: false });
    },
  }),
);
