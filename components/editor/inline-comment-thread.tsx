"use client";

import { useState, useRef, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useCommentStore } from "@/lib/store/comment-store";
import { MessageSquare, Send } from "lucide-react";

interface InlineCommentThreadProps {
  pageId: string;
  nodePos: number;
  blockPreview?: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InlineCommentThread({
  pageId,
  nodePos,
  blockPreview,
  children,
  open,
  onOpenChange,
}: InlineCommentThreadProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const addComment = useCommentStore((s) => s.addComment);
  const getComments = useCommentStore((s) => s.getComments);
  const comments = getComments(pageId, nodePos);

  useEffect(() => {
    if (open) {
      setInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addComment(pageId, nodePos, input);
    setInput("");
  };

  const preview = blockPreview?.trim() || "(empty block)";
  const displayPreview = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-80 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-3 space-y-3">
          <p className="text-xs text-muted-foreground rounded bg-muted/50 px-2 py-1.5 border border-border truncate" title={preview}>
            {displayPreview}
          </p>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Write a comment…"
                className="comment-input-textarea flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 pb-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={2}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="absolute bottom-1.5 right-1.5 h-7 w-7"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
          {comments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Comments
              </p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="text-sm rounded-md bg-muted/50 px-2.5 py-2 border border-border"
                  >
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

