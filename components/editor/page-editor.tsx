"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Page } from "@prisma/client";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { Node } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Quote,
  MessageSquare,
  PenLine,
} from "lucide-react";
import { useUpdatePage } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useDropStore } from "@/lib/store/drop-store";
import { PageBlock } from "@/lib/tiptap/page-block";
import { TaskItemBackspace } from "@/lib/tiptap/task-item-backspace";
import { InlineCommentMark } from "@/lib/tiptap/inline-comment-mark";
import { SuggestionMark } from "@/lib/tiptap/suggestion-mark";
import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/utils/constants";
import { parsePageContent } from "@/lib/utils/blocknote-to-tiptap";
import { cn } from "@/lib/utils";
import { SlashCommand } from "./slash-command";
import { BlockHandle } from "./block-handle";
import {
  TextAnnotationPopover,
  findMarkRange,
  type AnnotationState,
} from "./text-annotation-popover";
import { useBlockSelectionStore } from "@/lib/store/block-selection-store";
import { getBlockCursorPos, getBlockEndCursorPos } from "@/lib/tiptap/list-caret";
import "./editor-styles.css";

/** Find block at coords or nearest block (for clicks in gutter, gaps, etc.). Uses probeX in content area. */
function findBlockAtCoordsOrNearest(
  editor: ReturnType<typeof useEditor>,
  coords: { left: number; top: number },
  containerRect: DOMRect,
): { nodePos: number; cursorPos: number } | null {
  if (!editor) return null;
  const { doc } = editor.state;
  if (doc.childCount === 0) return null;

  const blocks: { pos: number; node: Node }[] = [];
  doc.descendants((node, pos, parent) => {
    if (node.type.name === "taskItem" || node.type.name === "listItem") {
      blocks.push({ pos, node });
      return true;
    }
    if (node.type.name === "taskList" || node.type.name === "bulletList" || node.type.name === "orderedList") {
      return true;
    }
    if (parent && (parent.type.name === "taskItem" || parent.type.name === "listItem")) return false;
    if (node.isBlock && node.type.name !== "doc") {
      blocks.push({ pos, node });
      return false;
    }
    return true;
  });

  const probeX = containerRect.left + containerRect.width / 2;
  const probeCoords = { left: probeX, top: coords.top };

  for (const block of blocks) {
    const dom = editor.view.nodeDOM(block.pos);
    if (!(dom instanceof HTMLElement)) continue;
    const rect = dom.getBoundingClientRect();
    const padY = 4;
    const padX = 80;
    if (
      probeCoords.left >= rect.left - padX &&
      probeCoords.left <= rect.right + padX &&
      probeCoords.top >= rect.top - padY &&
      probeCoords.top <= rect.bottom + padY
    ) {
      const endPos = getBlockEndCursorPos(doc, block.pos);
      const endCoords = editor.view.coordsAtPos(endPos);
      if (coords.left > endCoords.right) {
        return { nodePos: block.pos, cursorPos: endPos };
      }
      const startPos = getBlockCursorPos(doc, block.pos);
      const startCoords = editor.view.coordsAtPos(startPos);
      const probeY = coords.top < startCoords.top
        ? (startCoords.top + startCoords.bottom) / 2
        : coords.top > endCoords.bottom
          ? (endCoords.top + endCoords.bottom) / 2
          : coords.top;
      const probe = editor.view.posAtCoords({ left: coords.left, top: probeY });
      const cursorPos = probe
        ? Math.max(startPos, Math.min(endPos, probe.pos))
        : startPos;
      return { nodePos: block.pos, cursorPos };
    }
  }

  const posAtCoords = editor.view.posAtCoords(probeCoords);
  if (posAtCoords) {
    const $pos = editor.state.doc.resolve(posAtCoords.pos);
    let topPos = $pos.before(1);
    const node = doc.nodeAt(topPos);
    if (node && ["taskList", "bulletList", "orderedList"].includes(node.type.name)) {
      for (let d = $pos.depth; d >= 2; d--) {
        const n = $pos.node(d);
        if (n.type.name === "taskItem" || n.type.name === "listItem") {
          topPos = $pos.before(d);
          break;
        }
      }
    }
    const endPos = getBlockEndCursorPos(doc, topPos);
    const endCoords = editor.view.coordsAtPos(endPos);
    if (coords.left > endCoords.right) {
      return { nodePos: topPos, cursorPos: endPos };
    }
    const startPos = getBlockCursorPos(doc, topPos);
    const startCoords = editor.view.coordsAtPos(startPos);
    const probeY = coords.top < startCoords.top
      ? (startCoords.top + startCoords.bottom) / 2
      : coords.top > endCoords.bottom
        ? (endCoords.top + endCoords.bottom) / 2
        : coords.top;
    const probe = editor.view.posAtCoords({ left: coords.left, top: probeY });
    const cursorPos = probe
      ? Math.max(startPos, Math.min(endPos, probe.pos))
      : startPos;
    return { nodePos: topPos, cursorPos };
  }

  /* Click is in gap between blocks: put cursor at END of block above (standard editor behavior) */
  let blockAbove: { pos: number; bottom: number } | null = null;
  for (const block of blocks) {
    const dom = editor.view.nodeDOM(block.pos);
    if (!(dom instanceof HTMLElement)) continue;
    const rect = dom.getBoundingClientRect();
    if (rect.bottom <= coords.top && (!blockAbove || rect.bottom > blockAbove.bottom)) {
      blockAbove = { pos: block.pos, bottom: rect.bottom };
    }
  }
  if (!blockAbove) {
    /* Click is above first block: use start of first block */
    const first = blocks[0];
    if (!first) return null;
    const cursorPos = getBlockCursorPos(doc, first.pos);
    return { nodePos: first.pos, cursorPos };
  }
  const cursorPos = getBlockEndCursorPos(doc, blockAbove.pos);
  return { nodePos: blockAbove.pos, cursorPos };
}

function isBlockEmpty(node: Node): boolean {
  if (node.isAtom) return false;
  if (node.isTextblock) return node.content.size === 0;
  if (node.type.name === "blockquote" && node.firstChild) {
    return isBlockEmpty(node.firstChild);
  }
  if (node.type.name === "taskItem" && node.firstChild) {
    return isBlockEmpty(node.firstChild);
  }
  if ((node.type.name === "taskList" || node.type.name === "bulletList" || node.type.name === "orderedList") && node.lastChild) {
    return isBlockEmpty(node.lastChild);
  }
  return node.content.size === 0;
}

interface PageEditorProps {
  page: Page;
}

export function PageEditor({ page }: PageEditorProps) {
  const updatePage = useUpdatePage();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const isDragging = useDropStore((s) => s.isDragging);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { resolvedTheme } = useTheme();
  const [annotationState, setAnnotationState] = useState<AnnotationState | null>(null);

  const initialContent = useMemo(
    () => parsePageContent(page.content),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page.id],
  );

  const handleUpdate = useCallback(
    ({ editor }: { editor: ReturnType<typeof useEditor> }) => {
      if (!editor) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const json = editor.getJSON();
        updatePage.mutate({ id: page.id, content: json as unknown as undefined });
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [page.id, updatePage],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        gapcursor: false,
      }),
      PageBlock.configure({ workspaceId }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "taskList" || node.type.name === "bulletList" || node.type.name === "orderedList") {
            return "";
          }
          if (node.type.name === "heading") {
            const level = node.attrs.level as number;
            return `Heading ${level}`;
          }
          return "Type '/' for commands…";
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TaskItemBackspace,
      SlashCommand,
      InlineCommentMark,
      SuggestionMark,
    ],
    content: initialContent,
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: "ProseMirror focus:outline-none min-h-[max(200px,100%)]",
      },
      handleKeyDown(view, event) {
        const selectedNodePos = useBlockSelectionStore.getState().selectedNodePos;
        if (selectedNodePos !== null && (event.key === "Delete" || event.key === "Backspace")) {
          const node = view.state.doc.nodeAt(selectedNodePos);
          if (node) {
            event.preventDefault();
            const nodeSize = node.nodeSize;
            const { tr } = view.state;
            const newTr = tr.delete(selectedNodePos, selectedNodePos + nodeSize);
            if (newTr.doc.childCount === 0) {
              const p = view.state.schema.nodes.paragraph?.create();
              if (p) newTr.insert(0, p);
            }
            const newPos = Math.min(selectedNodePos, Math.max(0, newTr.doc.content.size - 1));
            newTr.setSelection(TextSelection.create(newTr.doc, newPos + 1));
            view.dispatch(newTr);
            useBlockSelectionStore.getState().setSelectedNodePos(null);
            return true;
          }
        }
        return false;
      },
      handleClick(view, pos, event) {
        const $pos = view.state.doc.resolve(pos);
        const marks = $pos.marks();

        const commentMark = marks.find((m) => m.type.name === "inlineComment");
        if (commentMark) {
          let thread: { id: string; text: string; createdAt: number }[] = [];
          try { thread = JSON.parse(commentMark.attrs.thread || "[]"); } catch { /* ignore */ }
          const range = findMarkRange(view.state.doc, "inlineComment", "commentId", commentMark.attrs.commentId);
          if (range) {
            const coords = view.coordsAtPos(pos);
            setAnnotationState({
              mode: "view-comment",
              commentId: commentMark.attrs.commentId,
              from: range.from,
              to: range.to,
              thread,
              coords,
            });
            return true;
          }
        }

        const suggestionMark = marks.find((m) => m.type.name === "suggestion");
        if (suggestionMark) {
          const range = findMarkRange(view.state.doc, "suggestion", "suggestionId", suggestionMark.attrs.suggestionId);
          if (range) {
            const selectedText = view.state.doc.textBetween(range.from, range.to);
            const coords = view.coordsAtPos(pos);
            setAnnotationState({
              mode: "view-suggestion",
              suggestionId: suggestionMark.attrs.suggestionId,
              from: range.from,
              to: range.to,
              suggestedText: suggestionMark.attrs.suggestedText,
              selectedText,
              coords,
            });
            return true;
          }
        }

        return false;
      },
      handleDOMEvents: {
        mousedown(view, event) {
          if (!editor) return false;
          const { doc, schema } = view.state;
          const coords = { left: event.clientX, top: event.clientY };

          // Check if click is below the last block first (must run before posAtCoords
          // because posAtCoords still returns a position near atom nodes like pageBlock,
          // which would prevent the paragraph-creation logic from ever running).
          if (doc.childCount > 0) {
            let lastBlockRect: DOMRect | null = null as DOMRect | null;
            let lastBlock: { node: any; pos: number } | null = null as { node: any; pos: number } | null;
            doc.forEach((node, nodeOffset) => {
              const dom = view.nodeDOM(nodeOffset);
              if (dom instanceof HTMLElement) {
                lastBlockRect = dom.getBoundingClientRect();
                lastBlock = { node, pos: nodeOffset };
              }
            });

            const threshold = 8;
            if (lastBlockRect && lastBlock && coords.top >= lastBlockRect.bottom + threshold) {
              if (isBlockEmpty(lastBlock.node)) {
                const pos = lastBlock.pos + 1;
                const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, pos));
                view.dispatch(tr);
                view.focus();
                return true;
              }
              const endPos = doc.content.size;
              const paragraph = schema.nodes.paragraph?.create();
              if (paragraph) {
                const tr = view.state.tr.insert(endPos, paragraph);
                tr.setSelection(TextSelection.create(tr.doc, endPos + 1));
                view.dispatch(tr);
                view.focus();
                return true;
              }
            }
          }

          // Click on an HR element: detect via DOM (posAtCoords resolves
          // to depth 0 for atom nodes, bypassing the textblock logic below).
          const clickTarget = event.target as HTMLElement;
          if (clickTarget.tagName === "HR") {
            const hrPos = view.posAtDOM(clickTarget, 0);
            const hrNode = doc.nodeAt(hrPos);
            if (hrNode) {
              const hrRect = clickTarget.getBoundingClientRect();
              const midY = hrRect.top + hrRect.height / 2;
              const preferUp = coords.top <= midY;

              const findTb = ($r: ReturnType<typeof doc.resolve>) => {
                for (let d = $r.depth; d >= 1; d--) {
                  if ($r.node(d).isTextblock) {
                    const s = $r.start(d);
                    return { start: s, end: s + $r.node(d).content.size };
                  }
                }
                return null;
              };
              const findAbove = () => hrPos > 0 ? findTb(doc.resolve(hrPos - 1)) : null;
              const findBelow = () => {
                const after = hrPos + hrNode.nodeSize;
                return after < doc.content.size ? findTb(doc.resolve(after + 1)) : null;
              };
              const tb = (preferUp ? findAbove() : findBelow())
                      ?? (preferUp ? findBelow() : findAbove());

              if (tb) {
                const setCursor = (pos: number) => {
                  const tr = view.state.tr.setSelection(TextSelection.create(doc, pos));
                  view.dispatch(tr);
                  view.focus();
                };
                const setRange = (from: number, to: number) => {
                  const tr = view.state.tr.setSelection(TextSelection.create(doc, from, to));
                  view.dispatch(tr);
                  view.focus();
                };

                if (tb.end > tb.start) {
                  const endCoords = view.coordsAtPos(tb.end);
                  // Find character position at click's x within the target textblock
                  const startCoords = view.coordsAtPos(tb.start);
                  const probe = view.posAtCoords({ left: coords.left, top: startCoords.top });
                  const charPos = probe
                    ? Math.max(tb.start, Math.min(tb.end, probe.pos))
                    : (coords.left > endCoords.right ? tb.end : tb.start);

                  if (event.detail >= 3) {
                    setRange(tb.start, tb.end);
                    return true;
                  }
                  if (event.detail === 2) {
                    const $p = doc.resolve(charPos);
                    const text = $p.parent.textContent;
                    const off = $p.parentOffset;
                    let wStart = off, wEnd = off;
                    while (wStart > 0 && /\w/.test(text[wStart - 1])) wStart--;
                    while (wEnd < text.length && /\w/.test(text[wEnd])) wEnd++;
                    if (wStart < wEnd) {
                      const base = charPos - off;
                      setRange(base + wStart, base + wEnd);
                    } else {
                      setCursor(charPos);
                    }
                    return true;
                  }
                  setCursor(coords.left > endCoords.right ? tb.end : charPos);
                  return true;
                }
                setCursor(tb.start);
                return true;
              }
            }
            return true;
          }

          const posAtCoords = view.posAtCoords(coords);
          if (posAtCoords) {
            // If click is to the right of actual text content, correct cursor to end after browser settles
            const $pos = doc.resolve(posAtCoords.pos);
            let textBlockDepth = -1;
            for (let d = $pos.depth; d >= 1; d--) {
              if ($pos.node(d).isTextblock) {
                textBlockDepth = d;
                break;
              }
            }

            if (textBlockDepth >= 1) {
              const textBlock = $pos.node(textBlockDepth);
              const textBlockStart = $pos.start(textBlockDepth);
              const textBlockEnd = textBlockStart + textBlock.content.size;
              if (textBlock.content.size > 0) {
                const endCoords = view.coordsAtPos(textBlockEnd);
                if (coords.left > endCoords.right) {
                  // Defer correction to after browser + ProseMirror have settled
                  requestAnimationFrame(() => {
                    const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, textBlockEnd));
                    view.dispatch(tr);
                  });
                } else {
                  // Check if click is in vertical padding (above/below actual text lines).
                  // The browser's caretRangeFromPoint incorrectly resolves to offset 0 (block start)
                  // for clicks in padding/line-height areas outside the text line bounds.
                  const startCoords = view.coordsAtPos(textBlockStart);
                  if (coords.top < startCoords.top || coords.top > endCoords.bottom) {
                    const probeY = coords.top < startCoords.top
                      ? (startCoords.top + startCoords.bottom) / 2
                      : (endCoords.top + endCoords.bottom) / 2;
                    const corrected = view.posAtCoords({ left: coords.left, top: probeY });
                    if (corrected) {
                      const clampedPos = Math.max(textBlockStart, Math.min(textBlockEnd, corrected.pos));
                      requestAnimationFrame(() => {
                        const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, clampedPos));
                        view.dispatch(tr);
                      });
                    }
                  }
                }
              }
            }
            return false;
          }

          if (doc.childCount === 0) return false;

          const container = view.dom.closest(".tiptap-editor-wrapper") as HTMLElement | null;
          if (!container) return false;

          const containerRect = container.getBoundingClientRect();
          const result = findBlockAtCoordsOrNearest(editor, coords, containerRect);
          if (!result) return false;

          const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, result.cursorPos));
          view.dispatch(tr);
          view.focus();
          return true;
        },
      },
    },
  });

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "group/editor relative min-w-0 flex-1 min-h-0 flex flex-col",
        isDark && "dark",
      )}
    >
      <div
        className="tiptap-editor-wrapper relative pl-[4.5rem] flex-1 min-h-0 flex flex-col"
        onClick={(e) => {
          if (!editor) return;
          const target = e.target as HTMLElement;
          if (target.closest(".ProseMirror")) return;
          if (
            target.closest("button") ||
            target.closest("[role='button']") ||
            target.closest("a") ||
            target.closest("[data-block-handle-grip]") ||
            target.closest("[data-block-context-menu]") ||
            target.closest("[data-block-comment-indicator]") ||
            target.closest("[data-radix-popper-content-wrapper]")
          )
            return;
          const container = target.closest(".tiptap-editor-wrapper") as HTMLElement | null;
          if (!container) return;
          const containerRect = container.getBoundingClientRect();
          const coords = { left: e.clientX, top: e.clientY };
          const { doc } = editor.state;
          if (doc.childCount === 0) {
            const p = editor.state.schema.nodes.paragraph?.create();
            if (p) {
              editor.chain().focus().insertContentAt(0, p).setTextSelection(1).run();
            }
            return;
          }
          let lastBlockRect: DOMRect | null = null as DOMRect | null;
          let lastBlock: { node: any; pos: number } | null = null as { node: any; pos: number } | null;
          doc.forEach((node, nodeOffset) => {
            const dom = editor.view.nodeDOM(nodeOffset);
            if (dom instanceof HTMLElement) {
              lastBlockRect = dom.getBoundingClientRect();
              lastBlock = { node, pos: nodeOffset };
            }
          });
          const threshold = 8;
          if (lastBlockRect && lastBlock && e.clientY >= lastBlockRect.bottom + threshold) {
            if (isBlockEmpty(lastBlock.node)) {
              editor.chain().focus().setTextSelection(getBlockCursorPos(doc, lastBlock.pos)).run();
              return;
            }
            const endPos = doc.content.size;
            editor
              .chain()
              .focus()
              .insertContentAt(endPos, { type: "paragraph" })
              .setTextSelection(endPos + 1)
              .run();
            return;
          }
          const result = findBlockAtCoordsOrNearest(editor, coords, containerRect);
          if (result) {
            editor.chain().focus().setTextSelection(result.cursorPos).run();
          }
        }}
      >
        {editor && (
          <>
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 150 }}
              className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md"
              shouldShow={({ state }) => {
                if (annotationState) return false;
                return !state.selection.empty;
              }}
            >
              <BubbleButton
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
                label="Bold"
              >
                <Bold className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                label="Italic"
              >
                <Italic className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                label="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={editor.isActive("code")}
                onClick={() => editor.chain().focus().toggleCode().run()}
                label="Code"
              >
                <Code className="h-4 w-4" />
              </BubbleButton>

              <div className="mx-0.5 h-5 w-px bg-border" />

              <BubbleButton
                active={editor.isActive("heading", { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                label="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={editor.isActive("heading", { level: 2 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                label="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={editor.isActive("blockquote")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                label="Quote"
              >
                <Quote className="h-4 w-4" />
              </BubbleButton>

              <div className="mx-0.5 h-5 w-px bg-border" />

              <BubbleButton
                active={false}
                onClick={() => {
                  const { from, to } = editor.state.selection;
                  const selectedText = editor.state.doc.textBetween(from, to);
                  const fromCoords = editor.view.coordsAtPos(from);
                  const toCoords = editor.view.coordsAtPos(to);
                  setAnnotationState({
                    mode: "create-comment",
                    from,
                    to,
                    selectedText,
                    coords: {
                      top: Math.min(fromCoords.top, toCoords.top),
                      left: fromCoords.left,
                      bottom: Math.max(fromCoords.bottom, toCoords.bottom),
                    },
                  });
                }}
                label="Comment"
              >
                <MessageSquare className="h-4 w-4" />
              </BubbleButton>
              <BubbleButton
                active={false}
                onClick={() => {
                  const { from, to } = editor.state.selection;
                  const selectedText = editor.state.doc.textBetween(from, to);
                  const fromCoords = editor.view.coordsAtPos(from);
                  const toCoords = editor.view.coordsAtPos(to);
                  setAnnotationState({
                    mode: "create-suggestion",
                    from,
                    to,
                    selectedText,
                    coords: {
                      top: Math.min(fromCoords.top, toCoords.top),
                      left: fromCoords.left,
                      bottom: Math.max(fromCoords.bottom, toCoords.bottom),
                    },
                  });
                }}
                label="Suggest Edit"
              >
                <PenLine className="h-4 w-4" />
              </BubbleButton>
            </BubbleMenu>

            <BlockHandle editor={editor} currentPageId={page.id} />
          </>
        )}

        <div
          className="min-w-0 flex-1 min-h-0 flex flex-col"
          style={{ pointerEvents: isDragging ? "none" : "auto" }}
        >
          <EditorContent editor={editor} className="min-w-0 flex-1 min-h-0 flex flex-col" />
        </div>
      </div>

      {editor && annotationState && (
        <TextAnnotationPopover
          editor={editor}
          state={annotationState}
          onClose={() => setAnnotationState(null)}
        />
      )}
    </div>
  );
}

function BubbleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
