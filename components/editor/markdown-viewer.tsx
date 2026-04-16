"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./markdown-viewer.css";

interface MarkdownViewerProps {
  content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  // Strip YAML frontmatter if present
  const stripped = content.replace(/^---\n[\s\S]*?\n---\n/, "");

  return (
    <div className="report-viewer">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripped}</ReactMarkdown>
    </div>
  );
}
