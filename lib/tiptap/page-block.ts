import { Node, mergeAttributes } from "@tiptap/core";

export interface PageBlockOptions {
  workspaceId: string | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBlock: {
      setPageBlock: (attrs: { pageId: string; title: string }) => ReturnType;
    };
  }
}

export const PageBlock = Node.create<PageBlockOptions>({
  name: "pageBlock",

  group: "block",

  atom: true,

  addOptions() {
    return { workspaceId: null };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "Untitled" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-block"]',
        getAttrs: (dom) => {
          const link = (dom as HTMLElement).querySelector("a");
          const pageId = link?.getAttribute("data-page-id") ?? null;
          const title = (link?.textContent ?? "Untitled").trim();
          return { pageId, title };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const workspaceId = this.options.workspaceId ?? "";
    const href = node.attrs.pageId ? `/${workspaceId}/${node.attrs.pageId}` : "#";
    return [
      "div",
      mergeAttributes({ "data-type": "page-block" }),
      [
        "a",
        {
          href,
          class: "page-block-link",
          "data-page-id": node.attrs.pageId,
        },
        ["span", { class: "page-block-icon" }, "📄"],
        ["span", { class: "page-block-title" }, node.attrs.title ?? "Untitled"],
      ],
    ];
  },

  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "page-block");
      dom.className = "page-block-wrapper";

      const link = document.createElement("a");
      const workspaceId = this.options.workspaceId ?? "";
      link.href = `/${workspaceId}/${node.attrs.pageId}`;
      link.className = "page-block-link";

      // Page icon
      const icon = document.createElement("span");
      icon.className = "page-block-icon";
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>`;

      // Title text
      const titleSpan = document.createElement("span");
      titleSpan.className = "page-block-title";
      titleSpan.textContent = node.attrs.title || "Untitled";

      link.appendChild(icon);
      link.appendChild(titleSpan);

      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = link.href;
      });
      dom.appendChild(link);

      return { dom };
    };
  },
});
