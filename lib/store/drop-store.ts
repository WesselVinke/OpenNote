import { create } from "zustand";
import type { DragEndEvent } from "@dnd-kit/core";

export type EditorDropHandler = (params: {
  activeId: string;
  overId: string;
  targetPos: number;
}) => void;

export type SidebarDropHandler = (event: DragEndEvent) => void;

interface DropStore {
  editorDropHandler: EditorDropHandler | null;
  sidebarDropHandler: SidebarDropHandler | null;
  isDragging: boolean;
  setEditorDropHandler: (handler: EditorDropHandler | null) => void;
  setSidebarDropHandler: (handler: SidebarDropHandler | null) => void;
  setDragging: (dragging: boolean) => void;
}

export const useDropStore = create<DropStore>((set) => ({
  editorDropHandler: null,
  sidebarDropHandler: null,
  isDragging: false,
  setEditorDropHandler: (handler) => set({ editorDropHandler: handler }),
  setSidebarDropHandler: (handler) => set({ sidebarDropHandler: handler }),
  setDragging: (dragging) => set({ isDragging: dragging }),
}));
