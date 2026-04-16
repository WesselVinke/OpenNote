"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCommentStore } from "@/lib/store/comment-store";

interface CommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  nodePos: number;
  blockPreview?: string;
}

export function CommentDialog({
  open,
  onOpenChange,
  pageId,
  nodePos,
  blockPreview,
}: CommentDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground rounded bg-muted/50 px-3 py-2 border border-border">
            {displayPreview}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a comment…"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              rows={3}
            />
            <Button type="submit" size="sm" disabled={!input.trim()}>
              Add comment
            </Button>
          </form>
          {comments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Comments
              </p>
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="text-sm rounded-md bg-muted/50 px-3 py-2 border border-border"
                  >
                    {c.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
