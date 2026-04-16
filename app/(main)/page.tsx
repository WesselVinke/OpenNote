"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";

export default function HomePage() {
  const router = useRouter();
  const { data: workspaces } = useWorkspaces();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  useEffect(() => {
    const list = workspaces as { id: string }[] | undefined;
    if (!list || list.length === 0) return;

    const ids = new Set(list.map((w) => w.id));
    // Only use persisted workspace if user still has access (fixes "Not a member"
    // after sign-in when localStorage had a workspace from another account)
    if (activeWorkspaceId && ids.has(activeWorkspaceId)) {
      router.replace(`/${activeWorkspaceId}`);
    } else {
      router.replace(`/${list[0].id}`);
    }
  }, [activeWorkspaceId, workspaces, router]);

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Opening your workspace…
    </div>
  );
}
