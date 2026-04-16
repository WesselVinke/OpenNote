import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, checkWorkspaceAccess } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return badRequest("workspaceId is required");

  const member = await checkWorkspaceAccess(workspaceId, user.id!);
  if (!member) return badRequest("Not a member of this workspace");

  const deleted = searchParams.get("deleted") === "true";

  const pages = await prisma.page.findMany({
    where: {
      workspaceId,
      isDeleted: deleted,
      type: { not: "DATABASE_ROW" },
    },
    select: {
      id: true,
      title: true,
      icon: true,
      type: true,
      parentId: true,
      isFavorite: true,
      sortOrder: true,
      ...(deleted && { deletedAt: true }),
    },
    orderBy: deleted ? { deletedAt: "desc" } : { sortOrder: "asc" },
  });

  return NextResponse.json(pages);
}
