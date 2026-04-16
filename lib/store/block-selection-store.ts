import { create } from "zustand";

interface BlockSelectionStore {
  selectedNodePos: number | null;
  setSelectedNodePos: (pos: number | null) => void;
}

export const useBlockSelectionStore = create<BlockSelectionStore>((set) => ({
  selectedNodePos: null,
  setSelectedNodePos: (pos) => set({ selectedNodePos: pos }),
}));
