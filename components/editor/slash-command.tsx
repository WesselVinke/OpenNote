"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Extension } from "@tiptap/core";
import type { Editor, Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code2,
  SeparatorHorizontal,
  Pilcrow,
  FileText,
} from "lucide-react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { cn } from "@/lib/utils";
import { focusListText } from "@/lib/tiptap/list-caret";

function runSlashListCommand(
  editor: Editor,
  range: Range,
  toggleList: () => boolean,
) {
  const blockPos = editor.state.selection.$from.before(editor.state.selection.$from.depth);
  if (!toggleList()) return;
  focusListText(editor, blockPos);
  requestAnimationFrame(() => {
    focusListText(editor, blockPos);
  });
}

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ElementType;
  command: (opts: { editor: Editor; range: Range }) => void;
}

const ITEMS: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Plain text block",
    icon: Pilcrow,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("paragraph").run();
    },
  },
  {
    title: "Heading 1",
    description: "Large heading",
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium heading",
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small heading",
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: List,
    command: ({ editor, range }) => {
      runSlashListCommand(editor, range, () =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
      );
    },
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: ListOrdered,
    command: ({ editor, range }) => {
      runSlashListCommand(editor, range, () =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
      );
    },
  },
  {
    title: "Task List",
    description: "List with checkboxes",
    icon: ListTodo,
    command: ({ editor, range }) => {
      runSlashListCommand(editor, range, () =>
        editor.chain().focus().deleteRange(range).toggleTaskList().run(),
      );
    },
  },
  {
    title: "Quote",
    description: "Block quotation",
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Fenced code block",
    icon: Code2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: "Divider",
    description: "Horizontal rule",
    icon: SeparatorHorizontal,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: "Page",
    description: "Create a new subpage",
    icon: FileText,
    command: ({ editor, range }) => {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const pageId = pathParts[1];

      if (!workspaceId || !pageId) return;

      editor.chain().focus().deleteRange(range).run();

      (async () => {
        const res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, parentId: pageId }),
        });
        if (!res.ok) return;
        const newPage = await res.json();

        // Insert pageBlock node directly via the schema
        const pageBlockNode = editor.schema.nodes.pageBlock?.create({
          pageId: newPage.id,
          title: newPage.title || "Untitled",
        });
        if (pageBlockNode) {
          const { tr, selection } = editor.state;
          const $from = selection.$from;

          if ($from.depth >= 1) {
            const parentBlock = $from.node(1);
            const blockStart = $from.before(1);
            const blockEnd = $from.after(1);

            if (parentBlock.isTextblock && parentBlock.content.size === 0) {
              // Block was empty (only had the slash command) — replace it
              tr.replaceWith(blockStart, blockEnd, pageBlockNode);
            } else {
              // Block has other content — insert page block below
              tr.insert(blockEnd, pageBlockNode);
            }
          } else {
            tr.insert(selection.from, pageBlockNode);
          }

          editor.view.dispatch(tr);
        }

        // Save the parent page content so the pageBlock is persisted
        const json = editor.getJSON();
        await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: json }),
        });

        // Soft-navigate to the new subpage (avoids full-page reload)
        const event = new CustomEvent("app:navigate", {
          detail: `/${workspaceId}/${newPage.id}`,
        });
        window.dispatchEvent(event);
      })();
    },
  },
];

interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useLayoutEffect(() => {
      const el = containerRef.current?.querySelector("[data-selected='true']");
      el?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) command(item);
      },
      [items, command],
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="rounded-lg border border-border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          No results
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="z-50 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              data-selected={index === selectedIndex}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "text-popover-foreground hover:bg-accent/50",
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{item.title}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  },
);

CommandList.displayName = "CommandList";

const suggestionConfig: Omit<SuggestionOptions<SlashCommandItem>, "editor"> = {
  char: "/",
  allowSpaces: false,
  startOfLine: false,

  items: ({ query }) => {
    const q = query.toLowerCase();
    return ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  },

  command: ({ editor, range, props }) => {
    (props as unknown as SlashCommandItem).command({ editor, range });
  },

  render: () => {
    let renderer: ReactRenderer<CommandListRef>;
    let popup: HTMLDivElement | null = null;

    return {
      onStart(props: SuggestionProps<SlashCommandItem>) {
        renderer = new ReactRenderer(CommandList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });

        popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.zIndex = "50";
        document.body.appendChild(popup);
        popup.appendChild(renderer.element);

        requestAnimationFrame(() => {
          const rect = props.clientRect?.();
          if (rect && popup) {
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom + 4}px`;
          }
        });
      },

      onUpdate(props: SuggestionProps<SlashCommandItem>) {
        renderer.updateProps({ items: props.items, command: props.command });

        const rect = props.clientRect?.();
        if (rect && popup) {
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 4}px`;
        }
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          popup?.remove();
          popup = null;
          renderer.destroy();
          return true;
        }
        return renderer.ref?.onKeyDown(props.event) ?? false;
      },

      onExit() {
        popup?.remove();
        popup = null;
        renderer.destroy();
      },
    };
  },
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return { suggestion: suggestionConfig };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
