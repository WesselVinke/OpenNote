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
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member) return notFound("Workspace not found");

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  return NextResponse.json(workspace);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return notFound("Workspace not found");
  }

  const { name, icon } = await req.json();
  const workspace = await prisma.workspace.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
    },
  });

  return NextResponse.json(workspace);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member || member.role !== "OWNER") {
    return notFound("Workspace not found");
  }

  await prisma.workspace.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
