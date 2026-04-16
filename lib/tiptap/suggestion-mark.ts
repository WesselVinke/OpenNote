import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestion: {
      setSuggestion: (attrs: {
        suggestionId: string;
        suggestedText: string;
      }) => ReturnType;
      unsetSuggestion: () => ReturnType;
    };
  }
}

export const SuggestionMark = Mark.create({
  name: "suggestion",

  inclusive: false,

  addAttributes() {
    return {
      suggestionId: { default: null },
      suggestedText: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-suggestion]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-suggestion": HTMLAttributes.suggestionId,
        class: "suggestion-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSuggestion:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetSuggestion:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
