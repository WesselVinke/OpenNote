import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineComment: {
      setInlineComment: (attrs: {
        commentId: string;
        thread: string;
      }) => ReturnType;
      unsetInlineComment: () => ReturnType;
    };
  }
}

export const InlineCommentMark = Mark.create({
  name: "inlineComment",

  inclusive: false,

  addAttributes() {
    return {
      commentId: { default: null },
      thread: { default: "[]" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-inline-comment]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-inline-comment": HTMLAttributes.commentId,
        class: "inline-comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInlineComment:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetInlineComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
