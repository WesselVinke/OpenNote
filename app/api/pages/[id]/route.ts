import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, checkWorkspaceAccess } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      children: {
        where: { isDeleted: false },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!page) return notFound("Page not found");

  const member = await checkWorkspaceAccess(page.workspaceId, user.id!);
  if (!member) return notFound("Page not found");

  return NextResponse.json(page);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return notFound("Page not found");

  const member = await checkWorkspaceAccess(page.workspaceId, user.id!);
  if (!member) return notFound("Page not found");

  const body = await req.json();
  const {
    title,
    icon,
    coverImage,
    content,
    isFavorite,
    isDeleted,
    parentId,
    sortOrder,
    dbProperties,
    dbViews,
    rowProperties,
  } = body;

  const updated = await prisma.page.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(icon !== undefined && { icon }),
      ...(coverImage !== undefined && { coverImage }),
      ...(content !== undefined && { content }),
      ...(isFavorite !== undefined && { isFavorite }),
      ...(isDeleted !== undefined && {
        isDeleted,
        deletedAt: isDeleted ? new Date() : null,
      }),
      ...(parentId !== undefined && { parentId }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(dbProperties !== undefined && { dbProperties }),
      ...(dbViews !== undefined && { dbViews }),
      ...(rowProperties !== undefined && { rowProperties }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return notFound("Page not found");

  const member = await checkWorkspaceAccess(page.workspaceId, user.id!);
  if (!member) return notFound("Page not found");

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
