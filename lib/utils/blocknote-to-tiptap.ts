interface BlockNoteInline {
  type: "text" | "link";
  text?: string;
  href?: string;
  styles?: Record<string, boolean | string>;
  content?: BlockNoteInline[];
}

interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: BlockNoteInline[];
  children?: BlockNoteBlock[];
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

const STYLE_TO_MARK: Record<string, string> = {
  bold: "bold",
  italic: "italic",
  strike: "strike",
  code: "code",
  underline: "underline",
};

function convertInlineContent(inlines: BlockNoteInline[] | undefined): TiptapNode[] {
  if (!inlines?.length) return [];

  const result: TiptapNode[] = [];
  for (const inline of inlines) {
    if (inline.type === "text" && inline.text) {
      const marks: TiptapNode["marks"] = [];
      if (inline.styles) {
        for (const [style, value] of Object.entries(inline.styles)) {
          if (!value) continue;
          const markType = STYLE_TO_MARK[style];
          if (markType) {
            marks.push({ type: markType });
          } else if (style === "textColor" && typeof value === "string") {
            marks.push({ type: "textStyle", attrs: { color: value } });
          }
        }
      }
      const node: TiptapNode = { type: "text", text: inline.text };
      if (marks.length) node.marks = marks;
      result.push(node);
    } else if (inline.type === "link") {
      const children = inline.content
        ? convertInlineContent(inline.content)
        : inline.text
          ? [{ type: "text" as const, text: inline.text }]
          : [];
      for (const child of children) {
        child.marks = [
          ...(child.marks ?? []),
          { type: "link", attrs: { href: inline.href ?? "" } },
        ];
      }
      result.push(...children);
    }
  }
  return result;
}

function wrapInListItem(
  listType: string,
  block: BlockNoteBlock,
  checked?: boolean,
): TiptapNode {
  const paragraph: TiptapNode = {
    type: "paragraph",
    content: convertInlineContent(block.content),
  };

  const itemAttrs = checked !== undefined ? { checked } : undefined;
  const itemType = checked !== undefined ? "taskItem" : "listItem";

  const item: TiptapNode = {
    type: itemType,
    content: [paragraph],
  };
  if (itemAttrs) item.attrs = itemAttrs;

  return { type: listType, content: [item] };
}

function convertBlock(block: BlockNoteBlock): TiptapNode | null {
  switch (block.type) {
    case "paragraph": {
      const content = convertInlineContent(block.content);
      return { type: "paragraph", content: content.length ? content : undefined };
    }

    case "heading": {
      const level = (block.props?.level as number) ?? 1;
      const content = convertInlineContent(block.content);
      return {
        type: "heading",
        attrs: { level },
        content: content.length ? content : undefined,
      };
    }

    case "bulletListItem":
      return wrapInListItem("bulletList", block);

    case "numberedListItem":
      return wrapInListItem("orderedList", block);

    case "checkListItem":
      return wrapInListItem(
        "taskList",
        block,
        (block.props?.checked as boolean) ?? false,
      );

    case "codeBlock": {
      const text = block.content
        ?.map((c) => c.text ?? "")
        .join("") ?? "";
      return {
        type: "codeBlock",
        attrs: { language: (block.props?.language as string) ?? null },
        content: text ? [{ type: "text", text }] : undefined,
      };
    }

    case "blockquote":
    case "quote": {
      const paragraph: TiptapNode = {
        type: "paragraph",
        content: convertInlineContent(block.content),
      };
      return { type: "blockquote", content: [paragraph] };
    }

    case "horizontalRule":
      return { type: "horizontalRule" };

    default: {
      const content = convertInlineContent(block.content);
      if (content.length) return { type: "paragraph", content };
      return null;
    }
  }
}

function mergeSiblingLists(nodes: TiptapNode[]): TiptapNode[] {
  const merged: TiptapNode[] = [];
  for (const node of nodes) {
    const prev = merged[merged.length - 1];
    const isList = ["bulletList", "orderedList", "taskList"].includes(node.type);
    if (isList && prev && prev.type === node.type && node.content) {
      prev.content = [...(prev.content ?? []), ...node.content];
    } else {
      merged.push(node);
    }
  }
  return merged;
}

export function blocknoteToTiptap(blocks: unknown): TiptapNode {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const converted: TiptapNode[] = [];
  for (const block of blocks as BlockNoteBlock[]) {
    const node = convertBlock(block);
    if (node) converted.push(node);

    if (block.children?.length) {
      for (const child of block.children) {
        const childNode = convertBlock(child);
        if (childNode) converted.push(childNode);
      }
    }
  }

  return {
    type: "doc",
    content: mergeSiblingLists(converted).length
      ? mergeSiblingLists(converted)
      : [{ type: "paragraph" }],
  };
}

export function isTiptapDoc(content: unknown): boolean {
  return (
    typeof content === "object" &&
    content !== null &&
    (content as Record<string, unknown>).type === "doc"
  );
}

export function parsePageContent(content: unknown): TiptapNode {
  if (!content) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  if (isTiptapDoc(content)) {
    return content as TiptapNode;
  }
  return blocknoteToTiptap(content);
}

/** Page block types that create subpages in the sidebar (e.g. childPage, pageBlock). */
const PAGE_BLOCK_TYPES = ["pageBlock", "childPage"] as const;

/**
 * Recursively extracts page IDs from page blocks in Tiptap/ProseMirror content.
 * A page block is a node with type "pageBlock" or "childPage" and attrs.pageId.
 * Returns empty array if no page blocks exist (e.g. before page blocks are implemented).
 */
export function getPageBlockIdsFromContent(content: unknown): string[] {
  const ids: string[] = [];
  if (!content || typeof content !== "object") return ids;

  const doc = content as { type?: string; content?: unknown[]; attrs?: Record<string, unknown> };
  const nodes = doc.type === "doc" ? doc.content ?? [] : [doc];

  function traverse(nodesToVisit: unknown[]): void {
    for (const node of nodesToVisit) {
      if (!node || typeof node !== "object") continue;
      const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };
      if (PAGE_BLOCK_TYPES.includes(n.type as (typeof PAGE_BLOCK_TYPES)[number]) && n.attrs?.pageId) {
        const id = String(n.attrs.pageId);
        if (id) ids.push(id);
      }
      if (Array.isArray(n.content)) traverse(n.content);
    }
  }
  traverse(nodes);
  return ids;
}
