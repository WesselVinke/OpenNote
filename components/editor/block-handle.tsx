"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  DragOverlay,
  useDraggable,
  useDroppable,
  useDndMonitor,
} from "@dnd-kit/core";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  MessageSquare,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropStore } from "@/lib/store/drop-store";
import { useBlockSelectionStore } from "@/lib/store/block-selection-store";
import { usePageTree, useUpdatePage } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { TextSelection } from "@tiptap/pm/state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InlineCommentThread } from "./inline-comment-thread";
import { useCommentStore } from "@/lib/store/comment-store";
import { focusListText } from "@/lib/tiptap/list-caret";

interface BlockHandleProps {
  editor: Editor;
  currentPageId?: string;
}

interface HandlePosition {
  top: number;
  left: number;
  nodePos: number;
}

interface GapInfo {
  id: string;
  targetPos: number;
  top: number;
  height: number;
  width: number;
}

function DropGap({
  id,
  targetPos,
  top,
  height,
  width,
}: {
  id: string;
  targetPos: number;
  top: number;
  height: number;
  width: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { targetPos } });
  return (
    <div
      ref={setNodeRef}
      className="absolute left-0 z-30"
      style={{ top, height, width }}
      data-gap-pos={targetPos}
    >
      {isOver && (
        <div
          className="absolute left-0 right-0 h-1 bg-blue-400/70"
          style={{ top: "50%", transform: "translateY(-50%)" }}
        />
      )}
    </div>
  );
}

function BlockDragPreview({
  editor,
  nodePos,
  containerWidth,
}: {
  editor: Editor;
  nodePos: number;
  containerWidth: number;
}) {
  const node = editor.state.doc.nodeAt(nodePos);
  if (!node) return null;

  const text = node.textContent || "";
  const type = node.type.name;
  const level = type === "heading" ? (node.attrs?.level as number) ?? 1 : 0;

  const Tag = type === "heading" ? (`h${level}` as "h1" | "h2" | "h3") : "p";
  const isEmpty = !text.trim();

  const isBlockquote = type === "blockquote";
  const isTaskItem = type === "taskItem";

  return (
    <div
      className={cn(
        "editor-block-drag-preview pointer-events-none px-1 py-0.5",
        isBlockquote && "pl-3",
      )}
      style={{
        width: containerWidth,
        minWidth: containerWidth,
        lineHeight: 1.65,
      }}
    >
      <Tag
        className={cn(
          "editor-block-drag-preview-content m-0 whitespace-pre-wrap break-words text-foreground/90",
          isBlockquote && "text-muted-foreground",
          isTaskItem && "flex items-start gap-2",
        )}
        style={
          type === "heading"
            ? {
                fontSize:
                  level === 1 ? "2.25em" : level === 2 ? "1.75em" : "1.35em",
                fontWeight: level === 1 ? 700 : level === 2 ? 650 : 600,
              }
            : undefined
        }
      >
        {isTaskItem && (
          <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border-2 border-border" />
        )}
        {isEmpty ? " " : text}
      </Tag>
    </div>
  );
}

type BlockTypeOption = {
  title: string;
  type: string;
  attrs?: { level?: number };
  icon: React.ComponentType<{ className?: string }>;
};

function convertBlockAt(editor: Editor, nodePos: number, opt: BlockTypeOption) {
  const node = editor.state.doc.nodeAt(nodePos);
  if (!node) return;
  const nodeSize = node.nodeSize;

  let chain = editor.chain().focus().setNodeSelection(nodePos);
  if (opt.type === "paragraph") {
    chain.setNode("paragraph").run();
  } else if (opt.type === "heading" && opt.attrs) {
    chain.setNode("heading", opt.attrs).run();
  } else if (opt.type === "blockquote") {
    const { schema } = editor.state;
    const blockquote = schema.nodes.blockquote?.create(null, [node]);
    if (!blockquote) return;
    const tr = editor.state.tr.delete(nodePos, nodePos + nodeSize).insert(nodePos, blockquote);
    editor.view.dispatch(tr);
    editor.commands.focus();
  } else if (opt.type === "codeBlock") {
    chain.setCodeBlock().run();
  } else if (opt.type === "bulletList") {
    if (chain.toggleBulletList().run()) {
      focusListText(editor, nodePos);
    }
  } else if (opt.type === "orderedList") {
    if (chain.toggleOrderedList().run()) {
      focusListText(editor, nodePos);
    }
  } else if (opt.type === "taskList") {
    if (chain.toggleTaskList().run()) {
      focusListText(editor, nodePos);
    }
  }
}

function duplicateBlockAt(editor: Editor, nodePos: number) {
  const node = editor.state.doc.nodeAt(nodePos);
  if (!node) return;
  const insertPos = nodePos + node.nodeSize;
  const tr = editor.state.tr.insert(insertPos, node);
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  editor.view.dispatch(tr);
  editor.commands.focus();
}

function deleteBlockAt(editor: Editor, nodePos: number) {
  const node = editor.state.doc.nodeAt(nodePos);
  if (!node) return;
  const nodeSize = node.nodeSize;
  const tr = editor.state.tr.delete(nodePos, nodePos + nodeSize);
  if (tr.doc.childCount === 0) {
    const p = editor.schema.nodes.paragraph?.create();
    if (p) tr.insert(0, p);
  }
  const newPos = Math.min(nodePos, Math.max(0, tr.doc.content.size - 1));
  tr.setSelection(TextSelection.create(tr.doc, newPos + 1));
  editor.view.dispatch(tr);
  editor.commands.focus();
}

const BLOCK_TYPE_OPTIONS = [
  { title: "Text", type: "paragraph", icon: Pilcrow },
  { title: "Heading 1", type: "heading", attrs: { level: 1 }, icon: Heading1 },
  { title: "Heading 2", type: "heading", attrs: { level: 2 }, icon: Heading2 },
  { title: "Heading 3", type: "heading", attrs: { level: 3 }, icon: Heading3 },
  { title: "Bullet List", type: "bulletList", icon: List },
  { title: "Numbered List", type: "orderedList", icon: ListOrdered },
  { title: "Task List", type: "taskList", icon: ListTodo },
  { title: "Quote", type: "blockquote", icon: Quote },
  { title: "Code Block", type: "codeBlock", icon: Code2 },
] as const;

export function BlockHandle({ editor, currentPageId }: BlockHandleProps) {
  const [handle, setHandle] = useState<HandlePosition | null>(null);
  const [activeNodePos, setActiveNodePos] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(0);
  const [dimOverlayRect, setDimOverlayRect] = useState<DOMRect | null>(null);
  const [openCommentNodePos, setOpenCommentNodePos] = useState<number | null>(
    null,
  );

  const selectedNodePos = useBlockSelectionStore((s) => s.selectedNodePos);
  const comments = useCommentStore((s) => s.comments);
  const getBlocksWithComments = useCommentStore(
    (s) => s.getBlocksWithComments,
  );
  const getComments = useCommentStore((s) => s.getComments);
  const setSelectedNodePos = useBlockSelectionStore((s) => s.setSelectedNodePos);
  const [selectionOverlayRect, setSelectionOverlayRect] = useState<DOMRect | null>(null);

  const editorContainerRef = useRef<HTMLElement | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const isDraggingRef = useRef(false);

  const resolveTopLevelBlock = useCallback(
    (coords: { left: number; top: number }) => {
      // Collect blocks (same granularity as gaps: taskItem, listItem, or top-level blocks)
      const blocks: { pos: number; node: { nodeSize: number } }[] = [];
      editor.state.doc.descendants((node, pos, parent) => {
        if (node.type.name === "taskItem" || node.type.name === "listItem") {
          blocks.push({ pos, node });
          return true;
        }
        if (
          node.type.name === "taskList" ||
          node.type.name === "bulletList" ||
          node.type.name === "orderedList"
        ) {
          return true;
        }
        // Skip blocks that are direct children of list items (e.g. paragraphs inside taskItems)
        if (parent && (parent.type.name === "taskItem" || parent.type.name === "listItem")) {
          return false;
        }
        if (node.isBlock && node.type.name !== "doc") {
          blocks.push({ pos, node });
          return false;
        }
        return true;
      });

      // Find block whose DOM rect contains the cursor (works for atomic nodes like horizontalRule
      // where posAtCoords cannot resolve a position "inside" the node)
      for (const block of blocks) {
        const { pos } = block;
        const dom = editor.view.nodeDOM(pos);
        if (!(dom instanceof HTMLElement)) continue;
        const rect = dom.getBoundingClientRect();
        const verticalHitSlop =
          (block.node as { type?: { name?: string } }).type?.name === "horizontalRule"
            ? 14
            : 0;
        if (
          coords.left >= rect.left &&
          coords.left <= rect.right &&
          coords.top >= rect.top - verticalHitSlop &&
          coords.top <= rect.bottom + verticalHitSlop
        ) {
          return { topPos: pos, dom };
        }
      }

      // Fallback: posAtCoords (for edge cases where rect check misses)
      const pos = editor.view.posAtCoords(coords);
      if (!pos) return null;

      const $pos = editor.state.doc.resolve(pos.pos);
      const depth = $pos.depth;
      if (depth === 0) return null;

      let topPos = $pos.before(1);
      const node = editor.state.doc.nodeAt(topPos);
      if (!node) return null;

      if (
        node.type.name === "taskList" ||
        node.type.name === "bulletList" ||
        node.type.name === "orderedList"
      ) {
        for (let d = $pos.depth; d >= 2; d--) {
          const nodeAtD = $pos.node(d);
          if (
            nodeAtD.type.name === "taskItem" ||
            nodeAtD.type.name === "listItem"
          ) {
            topPos = $pos.before(d);
            break;
          }
        }
      }

      const dom = editor.view.nodeDOM(topPos);
      if (!dom || !(dom instanceof HTMLElement)) return null;

      return { topPos, dom };
    },
    [editor],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (isDraggingRef.current) return;

      const container = editorContainerRef.current;
      if (!container) return;

      const editorRect = container.getBoundingClientRect();
      const probeX = editorRect.left + editorRect.width / 2;

      const result = resolveTopLevelBlock({ left: probeX, top: event.clientY });
      if (!result) {
        setHandle(null);
        return;
      }

      const blockRect = result.dom.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const handleHeight = 28; // h-7 = 1.75rem
      const blockHeight = blockRect.height;
      const topOffset = blockHeight < handleHeight ? (blockHeight - handleHeight) / 2 : 0;

      setHandle({
        top: blockRect.top - containerRect.top + topOffset,
        left: 0,
        nodePos: result.topPos,
      });
    },
    [resolveTopLevelBlock],
  );

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) return;
    setHandle(null);
  }, []);

  useEffect(() => {
    const el = editor.view.dom.closest(".tiptap-editor-wrapper") as HTMLElement | null;
    editorContainerRef.current = el;
    setContainerReady(!!el);
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [editor, handleMouseMove, handleMouseLeave]);

  useEffect(() => {
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (transaction.docChanged && !isDraggingRef.current) {
        setHandle(null);
        setSelectedNodePos(null);
      }
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, setSelectedNodePos]);

  // Selection overlay rect when block is selected (expanded for padding, extra on left)
  // Width is reduced when the block has a comment indicator so the overlay doesn't cover it
  useEffect(() => {
    if (selectedNodePos === null) {
      setSelectionOverlayRect(null);
      return;
    }
    const dom = editor.view.nodeDOM(selectedNodePos);
    if (dom instanceof HTMLElement) {
      const rect = dom.getBoundingClientRect();
      const padLeft = 12;
      const padRight = 6;
      const padTop = 4;
      const padBottom = 4;
      let width = rect.width + padLeft + padRight;

      // If this block has a comment indicator, shrink overlay so it doesn't cover the button
      const container = editorContainerRef.current;
      if (container) {
        const blocksWithComments = getBlocksWithComments(currentPageId ?? "");
        const hasComment = blocksWithComments.includes(selectedNodePos) || openCommentNodePos === selectedNodePos;
        if (hasComment) {
          const containerRect = container.getBoundingClientRect();
          const indicatorWidth = 28;
          const indicatorGap = 8;
          const indicatorLeft = rect.left - containerRect.left + rect.width - indicatorWidth - indicatorGap;
          const indicatorLeftViewport = containerRect.left + indicatorLeft;
          const overlayRight = rect.left - padLeft + width;
          if (indicatorLeftViewport < overlayRight) {
            width = Math.max(0, indicatorLeftViewport - (rect.left - padLeft) - 4);
          }
        }
      }

      setSelectionOverlayRect({
        top: rect.top - padTop,
        left: rect.left - padLeft,
        width,
        height: rect.height + padTop + padBottom,
        x: rect.left - padLeft,
        y: rect.top - padTop,
        bottom: rect.top - padTop + rect.height + padTop + padBottom,
        right: rect.left - padLeft + width,
        toJSON() { return this; },
      } as DOMRect);
    }
  }, [selectedNodePos, editor, currentPageId, openCommentNodePos, getBlocksWithComments]);

  // Click outside context menu to deselect (clicking in editor or elsewhere closes menu)
  useEffect(() => {
    if (selectedNodePos === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-block-context-menu]") ||
        target.closest("[data-radix-popper-content-wrapper]") ||
        target.closest("[data-block-comment-indicator]")
      )
        return;
      setSelectedNodePos(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [selectedNodePos, setSelectedNodePos]);

  const gaps = useMemo(() => {
    const container = editorContainerRef.current;
    if (!container) return [];

    const result: GapInfo[] = [];
    const doc = editor.state.doc;
    const containerRect = container.getBoundingClientRect();
    let gapIndex = 0;

    // Collect all blocks including each taskItem/listItem (not just top-level blocks)
    const blocks: { pos: number; node: { nodeSize: number } }[] = [];
    doc.descendants((node, pos, parent) => {
      if (node.type.name === "taskItem" || node.type.name === "listItem") {
        blocks.push({ pos, node });
        return true; // descend to find nested lists
      }
      if (
        node.type.name === "taskList" ||
        node.type.name === "bulletList" ||
        node.type.name === "orderedList"
      ) {
        return true; // descend to get items
      }
      // Skip blocks that are direct children of list items (e.g. paragraphs inside taskItems)
      if (parent && (parent.type.name === "taskItem" || parent.type.name === "listItem")) {
        return false;
      }
      if (node.isBlock && node.type.name !== "doc") {
        blocks.push({ pos, node });
        return false;
      }
      return true;
    });

    let targetPos = 0;
    for (let i = 0; i < blocks.length; i++) {
      const { pos, node } = blocks[i] as { pos: number; node: any };
      const prevNode = i > 0 ? (blocks[i - 1] as any).node : null;
      const isBetweenListItems =
        node.type?.name === "taskItem" ||
        node.type?.name === "listItem" ||
        (prevNode && (prevNode.type?.name === "taskItem" || prevNode.type?.name === "listItem"));
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        const rect = dom.getBoundingClientRect();
        const top = rect.top - containerRect.top;
        const height = isBetweenListItems ? 28 : 20;
        const width = containerRect.width;
        result.push({
          id: `gap-${gapIndex}`,
          targetPos,
          top: top - height / 2,
          height,
          width,
        });
        let nextTarget = pos + node.nodeSize;
        const rawNextTarget = nextTarget;
        // If this block is a list item, ensure the gap target doesn't land inside
        // the parent list wrapper (between the item's end and the list's close tag).
        // Bump it to after the list so drops resolve at the doc level.
        if (node.type.name === "taskItem" || node.type.name === "listItem") {
          try {
            const $end = doc.resolve(nextTarget);
            for (let d = $end.depth; d > 0; d--) {
              const ancestor = $end.node(d);
              if (ancestor.type.name === "taskList" || ancestor.type.name === "bulletList" || ancestor.type.name === "orderedList") {
                // Only bump past the list close tag when this is the LAST child.
                // Between siblings (e.g. between items 1 and 2) we want to keep
                // the position inside the list so the split logic can work.
                if ($end.index(d) >= ancestor.childCount) {
                  nextTarget = $end.after(d);
                }
                break;
              }
            }
          } catch (_) { /* position out of range */ }
        }
        targetPos = nextTarget;
        gapIndex++;
      }
    }

    // Gap after last block
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1] as { pos: number; node: any };
      const lastDom = editor.view.nodeDOM(last.pos);
      if (lastDom instanceof HTMLElement) {
        const lastRect = lastDom.getBoundingClientRect();
        const lastHeight = (last.node.type?.name === "taskItem" || last.node.type?.name === "listItem") ? 28 : 20;
        result.push({
          id: "gap-end",
          targetPos: last.pos + last.node.nodeSize,
          top: lastRect.bottom - containerRect.top - lastHeight / 2,
          height: lastHeight,
          width: containerRect.width,
        });
      }
    } else {
      result.push({
        id: "gap-0",
        targetPos: 0,
        top: 0,
        height: 100,
        width: containerRect.width,
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editor.state.doc is a new
    // immutable object after every document change; using childCount/content.size alone
    // misses block reorders that keep the same counts but change positions.
  }, [editor, editor.state.doc, containerReady]);

  const inlineCommentIndicators = useMemo(() => {
    const container = editorContainerRef.current;
    if (!container || !currentPageId) return [];

    const blocksWithComments = getBlocksWithComments(currentPageId);
    const nodePositions = new Set(blocksWithComments);
    if (openCommentNodePos !== null) nodePositions.add(openCommentNodePos);

    const containerRect = container.getBoundingClientRect();
    const result: { nodePos: number; top: number; left: number; count: number; blockPreview: string }[] = [];

    for (const nodePos of nodePositions) {
      const dom = editor.view.nodeDOM(nodePos);
      if (!(dom instanceof HTMLElement)) continue;

      const rect = dom.getBoundingClientRect();
      const top = rect.top - containerRect.top;
      const blockLeft = rect.left - containerRect.left;
      const indicatorWidth = 28;
      const left = blockLeft + rect.width - indicatorWidth - 8;
      const commentList = getComments(currentPageId, nodePos);
      const node = editor.state.doc.nodeAt(nodePos);
      const blockPreview = node?.textContent ?? "";

      result.push({
        nodePos,
        top,
        left,
        count: commentList.length,
        blockPreview,
      });
    }
    return result;
  }, [
    editor,
    currentPageId,
    comments,
    openCommentNodePos,
    getBlocksWithComments,
    getComments,
    containerReady,
  ]);

  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: pages } = usePageTree(workspaceId);
  const updatePage = useUpdatePage();
  const setEditorDropHandler = useDropStore((s) => s.setEditorDropHandler);
  const setDragging = useDropStore((s) => s.setDragging);

  useDndMonitor({
    onDragStart: (event) => {
      setDragging(true);
      isDraggingRef.current = true;
      const match = String(event.active.id).match(/^block-(\d+)$/);
      if (match) {
        setActiveNodePos(parseInt(match[1], 10));
        const container = editorContainerRef.current;
        setPreviewWidth(container ? container.getBoundingClientRect().width : 0);
      }
    },
    onDragEnd: () => {
      setDragging(false);
      isDraggingRef.current = false;
      setActiveNodePos(null);
      setHandle(null);
    },
  });

  const editorDropHandler = useCallback(
    (params: { activeId: string; overId: string; targetPos: number }) => {
      const { activeId, targetPos, overId } = params;
      const doc = editor.state.doc;

      const fromMatch = String(activeId).match(/^block-(\d+)$/);

      if (fromMatch) {
        // Block reorder
        const fromPos = parseInt(fromMatch[1], 10);
        const node = doc.nodeAt(fromPos);
        if (!node) return;

        const nodeSize = node.nodeSize;
        if (targetPos > fromPos && targetPos <= fromPos + nodeSize) return;

        let adjustedTarget = targetPos > fromPos ? targetPos - nodeSize : targetPos;

        // horizontalRule: split list at drop point and insert divider between the two parts
        if (node.type.name === "horizontalRule") {
          // Use targetPos (not adjustedTarget) when resolving: the list-split path replaces
          // before deleting, so the doc still has the divider. adjustedTarget shifts the
          // position into the preceding block, causing splitIndex to be wrong (e.g. 0 instead of 1).
          const $pos = doc.resolve(targetPos);
          let foundList = false;
          for (let d = $pos.depth; d > 0; d--) {
            const listNode = $pos.node(d);
            if (listNode.type.name === "taskList" || listNode.type.name === "bulletList" || listNode.type.name === "orderedList") {
              foundList = true;
              const listStart = $pos.before(d);
              const listEnd = $pos.after(d);
              const splitIndex = $pos.index(d);
              if (splitIndex <= 0 || splitIndex >= listNode.childCount) {
                // At start or end of list – resolve to doc level
                let resolvedPos = splitIndex <= 0 ? listStart : listEnd;
                if (resolvedPos >= fromPos + nodeSize) resolvedPos -= nodeSize;
                else if (resolvedPos > fromPos) resolvedPos = fromPos;
                adjustedTarget = resolvedPos;
                break;
              }
              const list1 = listNode.copy((listNode.content as any).cutByIndex(0, splitIndex));
              const list2 = listNode.copy((listNode.content as any).cutByIndex(splitIndex, listNode.childCount));
              const newContentSize = list1.nodeSize + node.nodeSize + list2.nodeSize;
              const tr = editor.state.tr;
              tr.replaceWith(listStart, listEnd, [list1, node, list2]);
              const delta = newContentSize - (listEnd - listStart);
              const deletePos = fromPos < listStart ? fromPos : fromPos + delta;
              tr.delete(deletePos, deletePos + nodeSize);
              editor.view.dispatch(tr);
              editor.commands.focus();
              return;
            }
          }
        }

        const { tr } = editor.state;
        tr.delete(fromPos, fromPos + nodeSize);

        // Safety: ensure the insertion position is at the doc level (depth 0) so
        // blocks never accidentally land inside a container like a blockquote.
        try {
          const $ins = tr.doc.resolve(adjustedTarget);
          if ($ins.depth > 0) {
            adjustedTarget = $ins.before(1);
          }
        } catch (_) { /* out of range – keep adjustedTarget as-is */ }

        tr.insert(adjustedTarget, node);
        editor.view.dispatch(tr);
        return;
      }

      // Page drop from sidebar
      const page = pages?.find((p) => p.id === activeId);
      if (!page || !editor.schema.nodes.pageBlock) return;

      const pageBlock = editor.schema.nodes.pageBlock.create({
        pageId: page.id,
        title: page.title || "Untitled",
      });

      const { tr } = editor.state;
      tr.insert(targetPos, pageBlock);
      editor.view.dispatch(tr);
      editor.commands.focus();

      if (currentPageId) {
        updatePage.mutate({ id: page.id, parentId: currentPageId });
      }
    },
    [editor, pages, currentPageId, updatePage]
  );

  useEffect(() => {
    setEditorDropHandler(editorDropHandler);
    return () => setEditorDropHandler(null);
  }, [editorDropHandler, setEditorDropHandler]);

  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
    };
  }, []);

  // Dim the original block with an overlay (ProseMirror can replace DOM nodes, wiping inline styles)
  useEffect(() => {
    if (activeNodePos === null) {
      setDimOverlayRect(null);
      return;
    }
    const dom = editor.view.nodeDOM(activeNodePos);
    if (dom instanceof HTMLElement) {
      const rect = dom.getBoundingClientRect();
      setDimOverlayRect(rect);
      return () => setDimOverlayRect(null);
    }
  }, [activeNodePos, editor]);

  return (
    <>
        {handle && (
          <BlockHandleGrip
            handle={handle}
            editor={editor}
            isSelected={selectedNodePos === handle.nodePos}
            onGripClick={() => setSelectedNodePos(handle.nodePos)}
            onPlusClick={() => {
              const node = editor.state.doc.nodeAt(handle.nodePos);
              if (!node) return;
              const insertPos = handle.nodePos + node.nodeSize;

              // When adding after a list item, insert the same type (preserve list context)
              const insertType =
                node.type.name === "taskItem"
                  ? "taskItem"
                  : node.type.name === "listItem"
                    ? "listItem"
                    : "paragraph";
              const insertContent =
                insertType === "taskItem"
                  ? { type: "taskItem", content: [{ type: "paragraph" }] }
                  : insertType === "listItem"
                    ? { type: "listItem", content: [{ type: "paragraph" }] }
                    : { type: "paragraph" };

              const cursorOffset =
                insertType === "taskItem" || insertType === "listItem" ? 2 : 1;
              editor
                .chain()
                .focus()
                .insertContentAt(insertPos, insertContent)
                .setTextSelection(insertPos + cursorOffset)
                .run();

              requestAnimationFrame(() => {
                const { state } = editor;
                const $pos = state.doc.resolve(state.selection.from);
                editor.commands.insertContent("/");
              });
            }}
          />
        )}

        {gaps
          .filter((gap) => {
            // Hide gaps immediately before/after the dragged block – dropping
            // there is a no-op and for thin blocks (like dividers) the two
            // overlapping indicators look like a bug.
            if (activeNodePos === null) return true;
            const node = editor.state.doc.nodeAt(activeNodePos);
            if (!node) return true;
            return (
              gap.targetPos !== activeNodePos &&
              gap.targetPos !== activeNodePos + node.nodeSize
            );
          })
          .map((gap) => (
          <DropGap
            key={gap.id}
            id={gap.id}
            targetPos={gap.targetPos}
            top={gap.top}
            height={gap.height}
            width={gap.width}
          />
        ))}

        <DragOverlay dropAnimation={null}>
          {activeNodePos !== null && previewWidth > 0 && (
            <BlockDragPreview
              editor={editor}
              nodePos={activeNodePos}
              containerWidth={previewWidth}
            />
          )}
        </DragOverlay>

        {/* Overlay that dims the original block (avoids ProseMirror DOM replacement wiping styles) */}
        {dimOverlayRect && (
          <div
            className="editor-block-dim-overlay"
            style={{
              position: "fixed",
              top: dimOverlayRect.top,
              left: dimOverlayRect.left,
              width: dimOverlayRect.width,
              height: dimOverlayRect.height,
            }}
          />
        )}

        {/* Inline comment indicators – visible on the page for blocks with comments */}
        {currentPageId &&
          inlineCommentIndicators.map((ind) => (
            <InlineCommentThread
              key={ind.nodePos}
              pageId={currentPageId}
              nodePos={ind.nodePos}
              blockPreview={ind.blockPreview}
              open={openCommentNodePos === ind.nodePos}
              onOpenChange={(open) =>
                setOpenCommentNodePos(open ? ind.nodePos : null)
              }
            >
              <button
                type="button"
                data-block-comment-indicator
                className="absolute z-[10001] flex items-center justify-center rounded-md h-6 min-w-[24px] px-1 bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/60"
                style={{ top: ind.top, left: ind.left }}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {ind.count > 1 && (
                  <span className="ml-0.5 text-[10px] font-medium tabular-nums">
                    {ind.count}
                  </span>
                )}
              </button>
            </InlineCommentThread>
          ))}

        {/* Bluish selection overlay when block is selected via grip */}
        {selectionOverlayRect && selectedNodePos !== null && (
          <div
            className="editor-block-selection-overlay"
            style={{
              position: "fixed",
              top: selectionOverlayRect.top,
              left: selectionOverlayRect.left,
              width: selectionOverlayRect.width,
              height: selectionOverlayRect.height,
            }}
          />
        )}

        {/* Context menu when block is selected */}
        {selectedNodePos !== null && selectionOverlayRect && (
          <DropdownMenu
            open={true}
            onOpenChange={(open) => !open && setSelectedNodePos(null)}
          >
            <DropdownMenuTrigger asChild>
              <div
                style={{
                  position: "fixed",
                  top: selectionOverlayRect.top,
                  left: selectionOverlayRect.left,
                  width: 1,
                  height: 1,
                  pointerEvents: "none",
                }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="left"
              sideOffset={4}
              className="min-w-[200px] z-[10000]"
              data-block-context-menu
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Pilcrow className="h-4 w-4" />
                  Turn into
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[180px]">
                  {BLOCK_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <DropdownMenuItem
                        key={opt.title}
                        className="gap-2"
                        onSelect={(e) => {
                          e.preventDefault();
                          convertBlockAt(editor, selectedNodePos, opt);
                          setSelectedNodePos(null);
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {opt.title}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  duplicateBlockAt(editor, selectedNodePos);
                  setSelectedNodePos(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  if (!currentPageId) return;
                  setOpenCommentNodePos(selectedNodePos);
                  setSelectedNodePos(null);
                }}
              >
                <MessageSquare className="h-4 w-4" />
                Comment
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                onSelect={() => {
                  deleteBlockAt(editor, selectedNodePos);
                  setSelectedNodePos(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

      </>
  );
}

function BlockHandleGrip({
  handle,
  isSelected,
  onGripClick,
  onPlusClick,
}: {
  handle: HandlePosition;
  editor: Editor;
  isSelected: boolean;
  onGripClick: () => void;
  onPlusClick: () => void;
}) {
  const id = `block-${handle.nodePos}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useDraggable({ id, data: { nodePos: handle.nodePos } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute z-40 flex items-center gap-0.5 opacity-0 transition-opacity duration-150",
        "group-hover/editor:opacity-100",
        (isDragging || isSelected) && "opacity-100",
      )}
      style={{ top: handle.top, left: handle.left }}
    >
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded text-neutral-400 hover:bg-accent hover:text-foreground dark:text-neutral-500"
        onClick={onPlusClick}
        aria-label="Add block"
      >
        <Plus className="h-5 w-5" />
      </button>
      <div
        ref={setActivatorNodeRef}
        data-block-handle-grip
        className="flex h-7 w-7 cursor-grab items-center justify-center rounded text-neutral-400 hover:bg-accent hover:text-foreground active:cursor-grabbing dark:text-neutral-500"
        {...attributes}
        {...listeners}
        onClick={(e) => {
          if (!isDragging) {
            e.stopPropagation();
            onGripClick();
          }
        }}
        aria-label="Drag block"
      >
        <GripVertical className="h-5 w-5" />
      </div>
    </div>
  );
}
