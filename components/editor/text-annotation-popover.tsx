"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Button } from "@/components/ui/button";
import { Send, Check, X } from "lucide-react";

/* ── Types ────────────────────────────────────── */

export interface CommentThreadEntry {
  id: string;
  text: string;
  createdAt: number;
}

export type AnnotationState =
  | {
      mode: "create-comment";
      from: number;
      to: number;
      selectedText: string;
      coords: { top: number; left: number; bottom: number };
    }
  | {
      mode: "create-suggestion";
      from: number;
      to: number;
      selectedText: string;
      coords: { top: number; left: number; bottom: number };
    }
  | {
      mode: "view-comment";
      commentId: string;
      from: number;
      to: number;
      thread: CommentThreadEntry[];
      coords: { top: number; left: number; bottom: number };
    }
  | {
      mode: "view-suggestion";
      suggestionId: string;
      from: number;
      to: number;
      suggestedText: string;
      selectedText: string;
      coords: { top: number; left: number; bottom: number };
    };

/* ── Helpers ──────────────────────────────────── */

export function findMarkRange(
  doc: PmNode,
  markName: string,
  attrKey: string,
  attrValue: string,
): { from: number; to: number } | null {
  let from = -1;
  let to = -1;
  doc.descendants((node, pos) => {
    if (node.isText) {
      const mark = node.marks.find(
        (m) => m.type.name === markName && m.attrs[attrKey] === attrValue,
      );
      if (mark) {
        if (from === -1) from = pos;
        to = pos + node.nodeSize;
      }
    }
  });
  return from !== -1 ? { from, to } : null;
}

function truncate(s: string, max = 80) {
  return s.length > max ? s.slice(0, max) + "\u2026" : s;
}

/* ── Component ────────────────────────────────── */

interface TextAnnotationPopoverProps {
  editor: Editor;
  state: AnnotationState;
  onClose: () => void;
}

export function TextAnnotationPopover({
  editor,
  state,
  onClose,
}: TextAnnotationPopoverProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Local thread copy so replies appear instantly
  const [localThread, setLocalThread] = useState<CommentThreadEntry[]>(
    state.mode === "view-comment" ? state.thread : [],
  );

  // Sync when state changes
  useEffect(() => {
    if (state.mode === "view-comment") setLocalThread(state.thread);
  }, [state]);

  // Focus input on mount
  useEffect(() => {
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [state.mode]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── Create comment ─────────────────────────── */

  const handleCreateComment = useCallback(() => {
    if (state.mode !== "create-comment" || !input.trim()) return;

    const commentId = crypto.randomUUID();
    const thread: CommentThreadEntry[] = [
      { id: crypto.randomUUID(), text: input.trim(), createdAt: Date.now() },
    ];

    editor
      .chain()
      .focus()
      .setTextSelection({ from: state.from, to: state.to })
      .setMark("inlineComment", {
        commentId,
        thread: JSON.stringify(thread),
      })
      .run();

    onClose();
  }, [editor, state, input, onClose]);

  /* ── Create suggestion ──────────────────────── */

  const handleCreateSuggestion = useCallback(() => {
    if (state.mode !== "create-suggestion" || !input.trim()) return;

    const suggestionId = crypto.randomUUID();

    editor
      .chain()
      .focus()
      .setTextSelection({ from: state.from, to: state.to })
      .setMark("suggestion", {
        suggestionId,
        suggestedText: input.trim(),
      })
      .run();

    onClose();
  }, [editor, state, input, onClose]);

  /* ── Add reply to comment thread ────────────── */

  const handleAddReply = useCallback(() => {
    if (state.mode !== "view-comment" || !input.trim()) return;

    const newEntry: CommentThreadEntry = {
      id: crypto.randomUUID(),
      text: input.trim(),
      createdAt: Date.now(),
    };
    const updatedThread = [...localThread, newEntry];

    const range = findMarkRange(
      editor.state.doc,
      "inlineComment",
      "commentId",
      state.commentId,
    );
    if (!range) return;

    const markType = editor.schema.marks.inlineComment;
    const oldMark = markType.create({
      commentId: state.commentId,
      thread: JSON.stringify(localThread),
    });
    const newMark = markType.create({
      commentId: state.commentId,
      thread: JSON.stringify(updatedThread),
    });

    const { tr } = editor.state;
    tr.removeMark(range.from, range.to, oldMark);
    tr.addMark(range.from, range.to, newMark);
    editor.view.dispatch(tr);

    setLocalThread(updatedThread);
    setInput("");
  }, [editor, state, input, localThread, onClose]);

  /* ── Resolve comment (remove mark) ──────────── */

  const handleResolveComment = useCallback(() => {
    if (state.mode !== "view-comment") return;

    const range = findMarkRange(
      editor.state.doc,
      "inlineComment",
      "commentId",
      state.commentId,
    );
    if (!range) return;

    const markType = editor.schema.marks.inlineComment;
    const { tr } = editor.state;
    tr.removeMark(range.from, range.to, markType);
    editor.view.dispatch(tr);
    onClose();
  }, [editor, state, onClose]);

  /* ── Accept suggestion (replace text) ───────── */

  const handleAcceptSuggestion = useCallback(() => {
    if (state.mode !== "view-suggestion") return;

    const range = findMarkRange(
      editor.state.doc,
      "suggestion",
      "suggestionId",
      state.suggestionId,
    );
    if (!range) return;

    const { tr } = editor.state;
    tr.replaceWith(
      range.from,
      range.to,
      editor.schema.text(state.suggestedText),
    );
    editor.view.dispatch(tr);
    onClose();
  }, [editor, state, onClose]);

  /* ── Reject suggestion (remove mark only) ───── */

  const handleRejectSuggestion = useCallback(() => {
    if (state.mode !== "view-suggestion") return;

    const range = findMarkRange(
      editor.state.doc,
      "suggestion",
      "suggestionId",
      state.suggestionId,
    );
    if (!range) return;

    const markType = editor.schema.marks.suggestion;
    const { tr } = editor.state;
    tr.removeMark(range.from, range.to, markType);
    editor.view.dispatch(tr);
    onClose();
  }, [editor, state, onClose]);

  /* ── Form submit ────────────────────────────── */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.mode === "create-comment") handleCreateComment();
    else if (state.mode === "create-suggestion") handleCreateSuggestion();
    else if (state.mode === "view-comment") handleAddReply();
  };

  /* ── Position ───────────────────────────────── */

  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    top: state.coords.bottom + 8,
    left: Math.max(8, state.coords.left - 40),
    zIndex: 50,
  };

  /* ── Render ─────────────────────────────────── */

  return createPortal(
    <div
      ref={popoverRef}
      className="w-80 rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
      style={popoverStyle}
    >
      <div className="p-3 space-y-3">
        {/* ── Create comment ──────────────────── */}
        {state.mode === "create-comment" && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comment on selection
            </p>
            <p className="text-xs text-muted-foreground rounded bg-muted/50 px-2 py-1.5 border border-border truncate">
              &ldquo;{truncate(state.selectedText)}&rdquo;
            </p>
          </>
        )}

        {/* ── Create suggestion ───────────────── */}
        {state.mode === "create-suggestion" && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Suggest an edit
            </p>
            <p className="text-xs text-muted-foreground rounded bg-muted/50 px-2 py-1.5 border border-border">
              <span className="font-medium">Original:</span>{" "}
              &ldquo;{truncate(state.selectedText)}&rdquo;
            </p>
          </>
        )}

        {/* ── View comment thread ─────────────── */}
        {state.mode === "view-comment" && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Comment thread
            </p>
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
              {localThread.map((c) => (
                <li
                  key={c.id}
                  className="text-sm rounded-md bg-muted/50 px-2.5 py-2 border border-border"
                >
                  {c.text}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* ── View suggestion ─────────────────── */}
        {state.mode === "view-suggestion" && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Suggested edit
            </p>
            <div className="space-y-1.5">
              <p className="text-xs rounded bg-red-500/10 px-2 py-1.5 border border-red-500/20 line-through text-muted-foreground">
                {state.selectedText}
              </p>
              <p className="text-xs rounded bg-green-500/10 px-2 py-1.5 border border-green-500/20 text-foreground">
                {state.suggestedText}
              </p>
            </div>
          </>
        )}

        {/* ── Text input (create / reply) ─────── */}
        {(state.mode === "create-comment" ||
          state.mode === "create-suggestion" ||
          state.mode === "view-comment") && (
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={
                  state.mode === "create-comment"
                    ? "Write a comment\u2026"
                    : state.mode === "create-suggestion"
                      ? "Type your suggested text\u2026"
                      : "Reply\u2026"
                }
                className="comment-input-textarea flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 pb-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                rows={2}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="absolute bottom-1.5 right-1.5 h-7 w-7"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* ── Resolve button for comments ─────── */}
        {state.mode === "view-comment" && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResolveComment}
              className="text-muted-foreground hover:text-foreground"
            >
              Resolve
            </Button>
          </div>
        )}

        {/* ── Accept / reject for suggestions ─── */}
        {state.mode === "view-suggestion" && (
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRejectSuggestion}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={handleAcceptSuggestion}>
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
