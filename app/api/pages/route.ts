import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, checkWorkspaceAccess } from "@/lib/auth-helpers";
import type { PageType } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { workspaceId, parentId, title, type, icon, databaseId } = body;

  if (!workspaceId) return badRequest("workspaceId is required");

  const member = await checkWorkspaceAccess(workspaceId, user.id!);
  if (!member) return badRequest("Not a member of this workspace");

  const lastSibling = await prisma.page.findFirst({
    where: {
      workspaceId,
      parentId: parentId || null,
      databaseId: databaseId || null,
      isDeleted: false,
    },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const page = await prisma.page.create({
    data: {
      title: title || "Untitled",
      icon,
      type: (type as PageType) || "PAGE",
      workspaceId,
      parentId: parentId || null,
      databaseId: databaseId || null,
      sortOrder: (lastSibling?.sortOrder ?? 0) + 1,
      ...(type === "DATABASE" && {
        dbProperties: [
          { id: "title", name: "Name", type: "title" },
          { id: "status", name: "Status", type: "status", options: [
            { id: "not_started", name: "Not Started", color: "Default", group: "todo" },
            { id: "in_progress", name: "In Progress", color: "Blue", group: "in_progress" },
            { id: "done", name: "Done", color: "Green", group: "complete" },
          ]},
        ],
        dbViews: [
          { id: "default-table", name: "Table", type: "table", filters: [], sorts: [], visibleProperties: ["title", "status"] },
        ],
      }),
    },
  });

  return NextResponse.json(page, { status: 201 });
}
