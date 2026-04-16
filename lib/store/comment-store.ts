import { create } from "zustand";

export interface BlockComment {
  id: string;
  text: string;
  createdAt: number;
}

const KEY_SEP = "::";

function blockKey(pageId: string, nodePos: number): string {
  return `${pageId}${KEY_SEP}${nodePos}`;
}

function parseBlockKey(key: string): { pageId: string; nodePos: number } | null {
  const idx = key.lastIndexOf(KEY_SEP);
  if (idx === -1) return null;
  const pageId = key.slice(0, idx);
  const nodePos = parseInt(key.slice(idx + KEY_SEP.length), 10);
  if (isNaN(nodePos)) return null;
  return { pageId, nodePos };
}

interface CommentStore {
  comments: Record<string, BlockComment[]>;
  addComment: (pageId: string, nodePos: number, text: string) => void;
  getComments: (pageId: string, nodePos: number) => BlockComment[];
  getBlocksWithComments: (pageId: string) => number[];
}

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: {},
  addComment: (pageId, nodePos, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = blockKey(pageId, nodePos);
    const comment: BlockComment = {
      id: crypto.randomUUID(),
      text: trimmed,
      createdAt: Date.now(),
    };
    set((state) => ({
      comments: {
        ...state.comments,
        [key]: [...(state.comments[key] ?? []), comment],
      },
    }));
  },
  getComments: (pageId, nodePos) => {
    const key = blockKey(pageId, nodePos);
    return get().comments[key] ?? [];
  },
  getBlocksWithComments: (pageId) => {
    return Object.keys(get().comments)
      .map((k) => parseBlockKey(k))
      .filter((p): p is { pageId: string; nodePos: number } => p !== null && p.pageId === pageId)
      .map((p) => p.nodePos);
  },
}));
