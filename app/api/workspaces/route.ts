import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { name } = await req.json();
  if (!name?.trim()) return badRequest("Workspace name is required");

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      members: {
        create: { userId: user.id!, role: "OWNER" },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });

  return NextResponse.json(workspace, { status: 201 });
}
