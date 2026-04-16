import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, badRequest, checkWorkspaceAccess } from "@/lib/auth-helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _req: Request,
  { params }: RouteParams
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member) return notFound("Workspace not found");

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(
  req: Request,
  { params }: RouteParams
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return notFound("Workspace not found");
  }

  const { email, role = "MEMBER" } = await req.json();
  if (!email) return badRequest("Email is required");

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) return badRequest("User not found");

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: invitedUser.id } },
  });
  if (existing) return badRequest("User is already a member");

  const newMember = await prisma.workspaceMember.create({
    data: { workspaceId: id, userId: invitedUser.id, role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(newMember, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: RouteParams
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    return notFound("Workspace not found");
  }

  const { userId } = await req.json();
  if (!userId) return badRequest("userId is required");

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  });
  if (!target) return notFound("Member not found");

  // Cannot remove an owner unless you are also an owner
  if (target.role === "OWNER" && member.role !== "OWNER") {
    return badRequest("Cannot remove an owner");
  }

  // Cannot remove the last owner
  if (target.role === "OWNER") {
    const ownerCount = await prisma.workspaceMember.count({
      where: { workspaceId: id, role: "OWNER" },
    });
    if (ownerCount <= 1) return badRequest("Cannot remove the only owner");
  }

  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: RouteParams
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const member = await checkWorkspaceAccess(id, user.id!);
  if (!member || member.role !== "OWNER") {
    return notFound("Workspace not found");
  }

  const { userId, role } = await req.json();
  if (!userId || !role) return badRequest("userId and role are required");
  if (!["OWNER", "ADMIN", "MEMBER", "GUEST"].includes(role)) {
    return badRequest("Invalid role");
  }

  const updated = await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: id, userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(updated);
}
