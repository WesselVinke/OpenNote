import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WorkspaceStore {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: "open-notes-workspace" }
  )
);
