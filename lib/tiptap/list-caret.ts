import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";

const LIST_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

function getFirstTextCursorPos(node: ProseMirrorNode, nodePos: number): number | null {
  if (node.isTextblock) return nodePos + 1;

  let cursorPos: number | null = null;
  node.descendants((child, pos) => {
    if (!child.isTextblock) return true;
    cursorPos = nodePos + pos + 2;
    return false;
  });

  return cursorPos;
}

/** Returns the cursor position at the start of the block at nodePos (for any block type). */
export function getBlockCursorPos(
  doc: { nodeAt: (pos: number) => ProseMirrorNode | null; content: { size: number } },
  nodePos: number,
): number {
  const node = doc.nodeAt(nodePos);
  if (!node) return Math.min(nodePos + 1, Math.max(0, doc.content.size - 1));
  const pos = getFirstTextCursorPos(node, nodePos);
  return pos ?? Math.min(nodePos + 1, doc.content.size);
}

function getLastTextCursorPos(node: ProseMirrorNode, nodePos: number): number | null {
  if (node.isTextblock) return nodePos + node.nodeSize - 1;
  let lastPos: number | null = null;
  node.descendants((child, pos) => {
    if (!child.isTextblock) return true;
    lastPos = nodePos + pos + child.nodeSize - 1;
    return true;
  });
  return lastPos;
}

/** Returns the cursor position at the end of the block at nodePos (for any block type). */
export function getBlockEndCursorPos(
  doc: { nodeAt: (pos: number) => ProseMirrorNode | null; content: { size: number } },
  nodePos: number,
): number {
  const node = doc.nodeAt(nodePos);
  if (!node) return Math.min(nodePos + 1, doc.content.size);
  const pos = getLastTextCursorPos(node, nodePos);
  return pos ?? Math.min(nodePos + node.nodeSize - 1, doc.content.size);
}

export function focusListText(editor: Editor, listPos: number): boolean {
  const listNode = editor.state.doc.nodeAt(listPos);
  if (!listNode || !LIST_TYPES.has(listNode.type.name)) {
    return false;
  }

  const cursorPos =
    getFirstTextCursorPos(listNode, listPos) ??
    Math.min(listPos + 1, editor.state.doc.content.size);

  const tr = editor.state.tr.setSelection(
    TextSelection.near(editor.state.doc.resolve(cursorPos), 1),
  );
  editor.view.dispatch(tr);
  editor.commands.focus();
  return true;
}
