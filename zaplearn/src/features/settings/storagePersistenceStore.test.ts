import { beforeEach, expect, it, vi } from "vitest";
import { useStoragePersistenceStore } from "@/features/settings/storagePersistenceStore";
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type StoragePersistenceStatus,
} from "@/lib/persistentStorage";

vi.mock("@/lib/persistentStorage", () => ({
  getPersistentStorageStatus: vi.fn(),
  requestPersistentStorage: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  useStoragePersistenceStore.setState({
    status: "checking",
    requesting: false,
  });
});

it("does not overwrite a grant with an earlier startup status check", async () => {
  let finishCheck!: (status: StoragePersistenceStatus) => void;
  vi.mocked(getPersistentStorageStatus).mockReturnValue(
    new Promise((resolve) => {
      finishCheck = resolve;
    }),
  );
  vi.mocked(requestPersistentStorage).mockResolvedValue("persistent");
  const checking = useStoragePersistenceStore.getState().check();
  await useStoragePersistenceStore.getState().request();
  finishCheck("best-effort");
  await checking;
  expect(useStoragePersistenceStore.getState().status).toBe("persistent");
});

it("coalesces concurrent permission requests", async () => {
  let finishRequest!: (status: StoragePersistenceStatus) => void;
  vi.mocked(requestPersistentStorage).mockReturnValue(
    new Promise((resolve) => {
      finishRequest = resolve;
    }),
  );
  const first = useStoragePersistenceStore.getState().request();
  await useStoragePersistenceStore.getState().request();
  expect(requestPersistentStorage).toHaveBeenCalledTimes(1);
  finishRequest("best-effort");
  await first;
  expect(useStoragePersistenceStore.getState().requesting).toBe(false);
});
