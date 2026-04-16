"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { FileText, Database, Sparkles } from "lucide-react";
import { useCreatePage, usePageTree } from "@/lib/hooks/use-pages";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

export default function WorkspaceHomePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const createPage = useCreatePage();
  const router = useRouter();
  const { error: treeError } = usePageTree(workspaceId);

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId);
  }, [workspaceId, setActiveWorkspaceId]);

  const isNotMemberError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes("Not a member of this workspace");
  };

  const handleNewPage = async () => {
    try {
      const page = await createPage.mutateAsync({ workspaceId });
      router.push(`/${workspaceId}/${page.id}`);
    } catch (err) {
      if (isNotMemberError(err)) {
        toast.error("You don't have access to this workspace.");
      } else {
        toast.error("Failed to create page");
      }
    }
  };

  const handleNewDatabase = async () => {
    try {
      const page = await createPage.mutateAsync({
        workspaceId,
        type: "DATABASE",
        title: "Untitled Database",
        icon: "🗃️",
      });
      router.push(`/${workspaceId}/${page.id}`);
    } catch (err) {
      if (isNotMemberError(err)) {
        toast.error("You don't have access to this workspace.");
      } else {
        toast.error("Failed to create database");
      }
    }
  };

  if (treeError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-4 md:p-8">
        <h1 className="text-xl font-semibold text-foreground">Workspace not found</h1>
        <Button asChild variant="default">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-4 md:gap-8 md:p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Welcome to your workspace</h1>
        <p className="text-muted-foreground max-w-md text-center">
          Create a page or database to get started.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={handleNewPage} className="gap-2">
          <FileText className="h-4 w-4" />
          New Page
        </Button>
        <Button variant="outline" onClick={handleNewDatabase} className="gap-2">
          <Database className="h-4 w-4" />
          New Database
        </Button>
      </div>
    </div>
  );
}
