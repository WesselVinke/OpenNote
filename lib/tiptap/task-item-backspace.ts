import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const LIST_CONTAINER_TYPES = new Set(["taskList", "bulletList", "orderedList"]);

/**
 * When Backspace is pressed on an empty list item (task item, bullet, or numbered)
 * at the start, convert it to a paragraph (lift out of the list) instead of
 * merging with the previous item. This prevents the cursor from staying indented
 * and makes the empty line a separate block.
 *
 * Also handles the follow-up: when backspace is pressed on the resulting empty
 * paragraph that sits right after a list, delete the paragraph and move the
 * cursor to the end of the previous block (instead of re-joining into the list).
 */
export const TaskItemBackspace = Extension.create({
  name: "taskItemBackspace",

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { empty, $anchor } = selection;
        const parent = $anchor.parent;

        if (!empty || !parent?.type?.isTextblock || parent.content.size > 0) {
          return false;
        }

        const isAtStart = $anchor.parentOffset === 0;
        if (!isAtStart) return false;

        // Empty bullet or numbered list item: lift to paragraph so the new line
        // is a separate block (not another list item)
        const listItemDepth = $anchor.depth > 0 ? (() => {
          for (let d = 1; d <= $anchor.depth; d++) {
            if ($anchor.node(d).type.name === "listItem") return d;
          }
          return -1;
        })() : -1;

        if (listItemDepth >= 0) {
          return this.editor.commands.liftListItem("listItem");
        }

        return false;
      },
      Backspace: () => {
        const { state } = this.editor;
        const { selection } = state;
        const { empty, $anchor } = selection;
        const parent = $anchor.parent;

        if (!empty || !parent?.type?.isTextblock || parent.content.size > 0) {
          return false;
        }

        const isAtStart = $anchor.parentOffset === 0;
        if (!isAtStart) return false;

        // Empty task item: lift out to paragraph
        const taskItemDepth = $anchor.depth > 0 ? (() => {
          for (let d = 1; d <= $anchor.depth; d++) {
            if ($anchor.node(d).type.name === "taskItem") return d;
          }
          return -1;
        })() : -1;

        if (taskItemDepth >= 0) {
          return this.editor.commands.liftListItem("taskItem");
        }

        // Empty bullet or numbered list item: lift out to paragraph
        const listItemDepth = $anchor.depth > 0 ? (() => {
          for (let d = 1; d <= $anchor.depth; d++) {
            if ($anchor.node(d).type.name === "listItem") return d;
          }
          return -1;
        })() : -1;

        if (listItemDepth >= 0) {
          return this.editor.commands.liftListItem("listItem");
        }

        // Empty paragraph right after a list: delete it and move cursor
        // to end of the previous block instead of re-joining the list.
        if (parent.type.name === "paragraph" && $anchor.depth >= 1) {
          const containerNode = $anchor.node($anchor.depth - 1);
          const paraIndex = $anchor.index($anchor.depth - 1);

          if (paraIndex > 0) {
            const prevSibling = containerNode.child(paraIndex - 1);
            if (prevSibling && LIST_CONTAINER_TYPES.has(prevSibling.type.name)) {
              const from = $anchor.before();
              const to = $anchor.after();
              const tr = state.tr.delete(from, to);
              const cursorTarget = Math.min(from, tr.doc.content.size);
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(cursorTarget), -1)
              );
              this.editor.view.dispatch(tr);
              return true;
            }
          }
        }

        return false;
      },
    };
  },
});
