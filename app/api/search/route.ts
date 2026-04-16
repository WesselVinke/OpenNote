import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, checkWorkspaceAccess } from "@/lib/auth-helpers";

// Recursively extract plain text from TipTap JSON content
function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text") return (n.text as string) || "";
  const children = n.content;
  if (!Array.isArray(children)) return "";
  return children.map(extractText).join(" ");
}

function getSnippet(content: unknown, query: string): string | null {
  try {
    const plainText = extractText(content);
    const idx = plainText.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return null;
    const start = Math.max(0, idx - 40);
    const end = Math.min(plainText.length, idx + query.length + 40);
    return (
      (start > 0 ? "..." : "") +
      plainText.slice(start, end).trim() +
      (end < plainText.length ? "..." : "")
    );
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) return badRequest("workspaceId is required");

  const member = await checkWorkspaceAccess(workspaceId, user.id!);
  if (!member) return badRequest("Not a member of this workspace");

  if (!query?.trim()) {
    const recent = await prisma.page.findMany({
      where: {
        workspaceId,
        isDeleted: false,
        type: { not: "DATABASE_ROW" },
      },
      select: {
        id: true,
        title: true,
        icon: true,
        type: true,
        parentId: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return NextResponse.json(recent);
  }

  // First: find pages matching by title
  const titleMatches = await prisma.page.findMany({
    where: {
      workspaceId,
      isDeleted: false,
      title: { contains: query },
    },
    select: {
      id: true,
      title: true,
      icon: true,
      type: true,
      parentId: true,
      updatedAt: true,
      content: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  // Second: find pages with content that might match (paginated to avoid OOM)
  const titleMatchIds = new Set(titleMatches.map((p) => p.id));
  const contentMatches: typeof titleMatches = [];
  const BATCH_SIZE = 100;
  const MAX_CONTENT_MATCHES = 20 - titleMatches.length;
  let cursor: string | undefined;

  const lowerQuery = query.toLowerCase();

  while (contentMatches.length < MAX_CONTENT_MATCHES) {
    const batch = await prisma.page.findMany({
      where: {
        workspaceId,
        isDeleted: false,
        id: { notIn: [...titleMatchIds] },
      },
      select: {
        id: true,
        title: true,
        icon: true,
        type: true,
        parentId: true,
        updatedAt: true,
        content: true,
      },
      orderBy: { updatedAt: "desc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    for (const p of batch) {
      if (!p.content) continue;
      const text = extractText(p.content);
      if (text.toLowerCase().includes(lowerQuery)) {
        contentMatches.push(p);
        if (contentMatches.length >= MAX_CONTENT_MATCHES) break;
      }
    }

    if (batch.length < BATCH_SIZE) break;
  }

  const allMatches = [...titleMatches, ...contentMatches].slice(0, 20);

  const results = allMatches.map(({ content, ...page }) => ({
    ...page,
    snippet: content ? getSnippet(content, query) : null,
  }));

  return NextResponse.json(results);
}
