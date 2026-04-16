import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SIDEBAR_DEFAULT_WIDTH } from "@/lib/utils/constants";

interface UIStore {
  sidebarOpen: boolean;
  sidebarWidth: number;
  searchOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      searchOpen: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    { name: "opennote-ui" }
  )
);
