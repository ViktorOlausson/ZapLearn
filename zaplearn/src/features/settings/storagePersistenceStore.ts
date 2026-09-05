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

let statusRevision = 0;

export const useStoragePersistenceStore = create<StoragePersistenceState>(
  (set, get) => ({
    status: "checking",
    requesting: false,
    async check() {
      const revision = ++statusRevision;
      const status = await getPersistentStorageStatus();
      if (revision === statusRevision && !get().requesting) set({ status });
    },
    async request() {
      if (get().requesting || get().status === "persistent") return;
      ++statusRevision;
      set({ requesting: true });
      const status = await requestPersistentStorage();
      set({ status, requesting: false });
    },
  }),
);
